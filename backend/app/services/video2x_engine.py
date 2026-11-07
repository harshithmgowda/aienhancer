import asyncio
import os
import re
import signal
import subprocess
import logging
from pathlib import Path
from typing import Callable, Optional, Dict, Any, List

from app.core.config import settings

logger = logging.getLogger(__name__)

# Regex for Video2X real-time progress:
# e.g.: frame=9/24 (37.50%); fps=2.25; elapsed=00:00:04; remaining=00:00:06
PROGRESS_PATTERN = re.compile(
    r"frame=(\d+)/(\d+)\s*\(([\d\.]+)%\);\s*fps=([\d\.]+);\s*elapsed=([^;]+);\s*remaining=([^;]+)"
)

class Video2XEngine:
    def __init__(self):
        self._current_process: Optional[asyncio.subprocess.Process] = None
        self._is_cancelled: bool = False

    @staticmethod
    def get_executable_path() -> Path:
        if settings.VIDEO2X_PATH and Path(settings.VIDEO2X_PATH).exists():
            return Path(settings.VIDEO2X_PATH)
        # Search tools directory
        candidates = list(settings.TOOLS_DIR.glob("**/video2x.exe"))
        if candidates:
            return candidates[0]
        raise FileNotFoundError("video2x.exe not found in tools/ or system PATH.")

    def cancel(self):
        """Cancel running process tree on Windows."""
        self._is_cancelled = True
        if self._current_process and self._current_process.returncode is None:
            pid = self._current_process.pid
            logger.info(f"Terminating Video2X process tree (PID {pid})...")
            try:
                # Windows taskkill forcefully terminates process and all child processes
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(pid)],
                    capture_output=True,
                    creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
                )
            except Exception as e:
                logger.error(f"Error terminating process tree: {e}")
                try:
                    self._current_process.kill()
                except Exception:
                    pass

    async def run_upscale(
        self,
        input_path: Path,
        output_path: Path,
        model_name: str = "realesrgan-plus",
        scale: int = 4,
        target_width: Optional[int] = None,
        target_height: Optional[int] = None,
        codec: str = "libx264",
        quality_preset: str = "balanced",
        device_id: int = 0,
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> bool:
        """
        Execute Video2X Real-ESRGAN upscaling.
        Streams stdout/stderr in real-time and parses actual progress.
        """
        self._is_cancelled = False
        exe_path = self.get_executable_path()

        cmd = [
            str(exe_path),
            "-i", str(input_path),
            "-o", str(output_path),
            "-d", str(device_id),
            "-p", "realesrgan",
            "--realesrgan-model", model_name,
            "-c", codec
        ]

        if scale:
            cmd.extend(["-s", str(scale)])
        if target_width and target_height and not scale:
            cmd.extend(["-w", str(target_width), "-h", str(target_height)])

        # Quality preset flags
        if quality_preset == "fast":
            cmd.extend(["-e", "crf=26", "-e", "preset=fast"])
        elif quality_preset == "max":
            cmd.extend(["-e", "crf=18", "-e", "preset=slow"])
        else: # balanced
            cmd.extend(["-e", "crf=22", "-e", "preset=medium"])

        logger.info(f"Executing Video2X: {' '.join(cmd)}")

        env = os.environ.copy()
        # Ensure Vulkan loader and ffmpeg DLLs can be located
        tools_video2x_dir = exe_path.parent
        env["PATH"] = f"{tools_video2x_dir};{env.get('PATH', '')}"

        self._current_process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env=env,
            creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
        )

        buffer = ""
        last_error_line = ""
        while True:
            if self._is_cancelled:
                raise asyncio.CancelledError("Job was cancelled by user.")

            chunk = await self._current_process.stdout.read(256)
            if not chunk:
                break

            text = chunk.decode("utf-8", errors="replace")
            buffer += text

            # Look for progress updates in buffer
            # Progress line ends or carriage returns
            while "\r" in buffer or "\n" in buffer:
                # Split at first newline or carriage return
                idx_r = buffer.find("\r")
                idx_n = buffer.find("\n")
                if idx_r != -1 and (idx_n == -1 or idx_r < idx_n):
                    split_idx = idx_r
                else:
                    split_idx = idx_n

                line = buffer[:split_idx].strip()
                buffer = buffer[split_idx + 1:]

                if not line:
                    continue

                if "[error]" in line.lower() or "[critical]" in line.lower():
                    last_error_line = line
                    logger.warning(f"Video2X engine warning/error: {line}")

                match = PROGRESS_PATTERN.search(line)
                if match and progress_callback:
                    curr_frame = int(match.group(1))
                    tot_frames = int(match.group(2))
                    pct = float(match.group(3))
                    fps = float(match.group(4))
                    elapsed = match.group(5)
                    remaining = match.group(6)

                    # Parse remaining string to seconds if possible
                    rem_sec = 0.0
                    try:
                        parts = remaining.split(":")
                        if len(parts) == 3:
                            rem_sec = int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
                    except Exception:
                        pass

                    progress_callback({
                        "current_frame": curr_frame,
                        "total_frames": tot_frames,
                        "progress": round(pct, 1),
                        "fps": fps,
                        "elapsed": elapsed,
                        "remaining": remaining,
                        "eta_seconds": rem_sec,
                        "raw_line": line
                    })

        ret_code = await self._current_process.wait()
        self._current_process = None

        if self._is_cancelled:
            raise asyncio.CancelledError("Job was cancelled.")

        # Validate that output file exists and is a valid decodable video
        if output_path.exists() and output_path.stat().st_size > 1024:
            try:
                from app.services.video_probe import VideoProbeService
                test_meta = VideoProbeService.probe(output_path)
                if test_meta.get("width", 0) > 0 and test_meta.get("duration", 0) > 0:
                    return True
            except Exception as e:
                logger.error(f"Video2X output validation failed: {e}")

        err_msg = last_error_line or f"Video2X exited with error code {ret_code}"
        logger.error(err_msg)
        raise RuntimeError(err_msg)

    async def run_rife(
        self,
        input_path: Path,
        output_path: Path,
        multiplier: int = 2,
        rife_model: str = "rife-v4.6",
        device_id: int = 0,
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> bool:
        """Execute RIFE frame interpolation via Video2X."""
        self._is_cancelled = False
        exe_path = self.get_executable_path()

        cmd = [
            str(exe_path),
            "-i", str(input_path),
            "-o", str(output_path),
            "-d", str(device_id),
            "-p", "rife",
            "--rife-model", rife_model,
            "-m", str(multiplier),
            "-c", "libx264"
        ]

        logger.info(f"Executing RIFE: {' '.join(cmd)}")

        env = os.environ.copy()
        tools_video2x_dir = exe_path.parent
        env["PATH"] = f"{tools_video2x_dir};{env.get('PATH', '')}"

        self._current_process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env=env,
            creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
        )

        buffer = ""
        while True:
            if self._is_cancelled:
                raise asyncio.CancelledError("Job was cancelled by user.")

            chunk = await self._current_process.stdout.read(256)
            if not chunk:
                break

            text = chunk.decode("utf-8", errors="replace")
            buffer += text

            while "\r" in buffer or "\n" in buffer:
                idx_r = buffer.find("\r")
                idx_n = buffer.find("\n")
                if idx_r != -1 and (idx_n == -1 or idx_r < idx_n):
                    split_idx = idx_r
                else:
                    split_idx = idx_n

                line = buffer[:split_idx].strip()
                buffer = buffer[split_idx + 1:]

                if not line:
                    continue

                match = PROGRESS_PATTERN.search(line)
                if match and progress_callback:
                    curr_frame = int(match.group(1))
                    tot_frames = int(match.group(2))
                    pct = float(match.group(3))
                    fps = float(match.group(4))
                    elapsed = match.group(5)
                    remaining = match.group(6)

                    rem_sec = 0.0
                    try:
                        parts = remaining.split(":")
                        if len(parts) == 3:
                            rem_sec = int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
                    except Exception:
                        pass

                    progress_callback({
                        "current_frame": curr_frame,
                        "total_frames": tot_frames,
                        "progress": round(pct, 1),
                        "fps": fps,
                        "elapsed": elapsed,
                        "remaining": remaining,
                        "eta_seconds": rem_sec,
                        "raw_line": line
                    })

        ret_code = await self._current_process.wait()
        self._current_process = None

        if self._is_cancelled:
            raise asyncio.CancelledError("Job was cancelled.")

        if output_path.exists() and output_path.stat().st_size > 1024:
            try:
                from app.services.video_probe import VideoProbeService
                test_meta = VideoProbeService.probe(output_path)
                if test_meta.get("width", 0) > 0:
                    return True
            except Exception as e:
                logger.error(f"RIFE output validation failed: {e}")

        logger.error(f"RIFE exited with error code {ret_code}")
        return False

