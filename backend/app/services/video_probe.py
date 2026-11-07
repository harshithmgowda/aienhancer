import json
import logging
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

class VideoProbeService:
    @staticmethod
    def get_ffprobe_cmd() -> str:
        if settings.FFPROBE_PATH and Path(settings.FFPROBE_PATH).exists():
            return settings.FFPROBE_PATH
        return "ffprobe"

    @classmethod
    def probe(cls, file_path: Path) -> Dict[str, Any]:
        """Inspect media file using ffprobe and return parsed metadata."""
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        ffprobe_bin = cls.get_ffprobe_cmd()
        cmd = [
            ffprobe_bin,
            "-v", "error",
            "-show_format",
            "-show_streams",
            "-print_format", "json",
            str(file_path)
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
            )
            data = json.loads(result.stdout)
        except subprocess.CalledProcessError as e:
            logger.error(f"FFprobe failed on {file_path}: {e.stderr}")
            raise ValueError(f"Failed to probe video file: {e.stderr or 'Invalid format'}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse ffprobe output: {e}")

        streams = data.get("streams", [])
        fmt = data.get("format", {})

        video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
        if not video_stream:
            raise ValueError("No video stream found in uploaded file.")

        audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)

        # Parse resolution
        width = int(video_stream.get("width", 0))
        height = int(video_stream.get("height", 0))

        # Check for side data / rotation
        rotation = 0
        for side_data in video_stream.get("side_data_list", []):
            if "rotation" in side_data:
                rotation = int(side_data["rotation"])
                break
        if "tags" in video_stream and "rotate" in video_stream["tags"]:
            try:
                rotation = int(video_stream["tags"]["rotate"])
            except ValueError:
                pass

        # If rotated 90 or 270, swap effective display dimensions
        display_width = width
        display_height = height
        if abs(rotation) in (90, 270):
            display_width, display_height = height, width

        # Frame rate calculation
        r_frame_rate = video_stream.get("r_frame_rate", "0/1")
        fps = 0.0
        try:
            num, den = map(float, r_frame_rate.split("/"))
            if den > 0:
                fps = round(num / den, 2)
        except Exception:
            fps = 0.0

        # Duration
        duration = float(video_stream.get("duration") or fmt.get("duration") or 0.0)
        
        # Frame count
        nb_frames = video_stream.get("nb_frames")
        if nb_frames and nb_frames.isdigit():
            total_frames = int(nb_frames)
        elif duration > 0 and fps > 0:
            total_frames = int(round(duration * fps))
        else:
            total_frames = 0

        # Aspect ratio
        aspect_ratio = "16:9"
        if display_height > 0:
            ratio = display_width / display_height
            if abs(ratio - 16 / 9) < 0.05:
                aspect_ratio = "16:9"
            elif abs(ratio - 9 / 16) < 0.05:
                aspect_ratio = "9:16"
            elif abs(ratio - 4 / 3) < 0.05:
                aspect_ratio = "4:3"
            elif abs(ratio - 1 / 1) < 0.05:
                aspect_ratio = "1:1"
            elif abs(ratio - 21 / 9) < 0.05:
                aspect_ratio = "21:9"
            else:
                aspect_ratio = f"{round(ratio, 2)}:1"

        file_size = int(fmt.get("size") or file_path.stat().st_size)
        bitrate = int(fmt.get("bit_rate") or video_stream.get("bit_rate") or 0)

        return {
            "width": width,
            "height": height,
            "display_width": display_width,
            "display_height": display_height,
            "rotation": rotation,
            "aspect_ratio": aspect_ratio,
            "fps": fps,
            "duration": round(duration, 3),
            "total_frames": total_frames,
            "video_codec": video_stream.get("codec_name", "unknown"),
            "audio_codec": audio_stream.get("codec_name") if audio_stream else None,
            "has_audio": audio_stream is not None,
            "file_size": file_size,
            "bitrate": bitrate
        }

