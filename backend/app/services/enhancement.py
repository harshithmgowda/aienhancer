import asyncio
import json
import logging
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

from app.core.config import settings
from app.models.job import JobRecord
from app.schemas.job import EnhancementSettings
from app.services.video_probe import VideoProbeService
from app.services.video2x_engine import Video2XEngine
from app.services.ffmpeg_service import FFmpegService
from app.services.job_manager import JobManager
from app.websocket.connection_manager import ws_manager

logger = logging.getLogger(__name__)

class EnhancementPipeline:
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.engine = Video2XEngine()
        self.start_time = 0.0

    @staticmethod
    def calculate_target_dimensions(
        in_width: int,
        in_height: int,
        target_res: str,
        custom_w: Optional[int] = None,
        custom_h: Optional[int] = None
    ) -> Tuple[int, int]:
        """
        Calculate target dimensions preserving aspect ratio.
        Ensures dimensions are even (divisible by 2) for H.264/H.265.
        """
        is_portrait = in_height > in_width
        aspect = in_width / in_height if in_height > 0 else 16/9

        if target_res == "custom" and custom_w and custom_h:
            w = (custom_w // 2) * 2
            h = (custom_h // 2) * 2
            return max(w, 2), max(h, 2)

        if target_res == "1080p":
            base_long = 1920
            base_short = 1080
        elif target_res == "1440p" or target_res == "2k":
            base_long = 2560
            base_short = 1440
        elif target_res == "2160p" or target_res == "4k":
            base_long = 3840
            base_short = 2160
        else:
            base_long = 1920
            base_short = 1080

        if is_portrait:
            # 9:16 target: short = width, long = height
            # Scale preserving aspect
            target_h = base_long
            target_w = int(round(target_h * aspect))
            # Bound short side if needed
            if target_w > base_short:
                target_w = base_short
                target_h = int(round(target_w / aspect))
        else:
            # 16:9 target: long = width, short = height
            target_w = base_long
            target_h = int(round(target_w / aspect))
            if target_h > base_short:
                target_h = base_short
                target_w = int(round(target_h * aspect))

        # Ensure divisible by 2
        target_w = (target_w // 2) * 2
        target_h = (target_h // 2) * 2
        return target_w, target_h

    async def _emit_progress(self, stage: str, pct: float, extra: Optional[Dict[str, Any]] = None):
        """Update job in DB and broadcast via WebSockets."""
        elapsed = time.time() - self.start_time if self.start_time > 0 else 0.0
        update_data = {
            "stage": stage,
            "progress": round(pct, 1),
            "elapsed_seconds": round(elapsed, 1)
        }
        if extra:
            update_data.update(extra)

        await JobManager.update_job(self.job_id, **update_data)
        
        # Broadcast via WebSocket
        ws_payload = {
            "type": "job_progress",
            "job_id": self.job_id,
            "stage": stage,
            "progress": round(pct, 1),
            "elapsed_seconds": round(elapsed, 1),
            **(extra or {})
        }
        await ws_manager.broadcast_job_update(self.job_id, ws_payload)
        await ws_manager.broadcast_global(ws_payload)

    def cancel(self):
        """Cancel underlying engine."""
        self.engine.cancel()

    async def execute(self):
        """Run the complete enhancement pipeline."""
        job = await JobManager.get_job(self.job_id)
        if not job:
            logger.error(f"Job {self.job_id} not found in database.")
            return

        self.start_time = time.time()
        now_iso = datetime.now(timezone.utc).isoformat()
        await JobManager.update_job(self.job_id, status="INITIALIZING", started_at=now_iso)

        try:
            # 1. Validation & Disk Check
            await self._emit_progress("Validating input & environment", 5.0)
            
            # Check free disk space
            stat = shutil.disk_usage(settings.STORAGE_DIR)
            if stat.free < settings.MIN_DISK_FREE_BYTES:
                raise RuntimeError(f"Insufficient disk space. Free: {stat.free // (1024*1024)} MB, Required: {settings.MIN_DISK_FREE_BYTES // (1024*1024)} MB")

            input_path = Path(job.input_path)
            if not input_path.exists():
                raise FileNotFoundError(f"Input video file missing: {input_path}")

            # Parse settings
            user_settings = json.loads(job.settings) if job.settings else {}
            target_res = user_settings.get("target_resolution", "1080p").lower()
            model_opt = user_settings.get("model", "realesrgan-plus")
            preset = user_settings.get("quality_preset", "balanced")
            codec = user_settings.get("codec", "h264")
            interpolate = user_settings.get("interpolate_fps", False)

            # Probe input
            meta = VideoProbeService.probe(input_path)
            in_w = meta["display_width"]
            in_h = meta["display_height"]
            total_input_frames = meta["total_frames"]

            # Calculate target resolution
            custom_w = user_settings.get("custom_width")
            custom_h = user_settings.get("custom_height")
            target_w, target_h = self.calculate_target_dimensions(in_w, in_h, target_res, custom_w, custom_h)

            logger.info(f"Enhancement plan: {in_w}x{in_h} -> {target_w}x{target_h} ({target_res}), Model: {model_opt}")

            # Map model selection
            if model_opt == "auto":
                model_name = "realesrgan-plus"
            elif model_opt in ["realesrgan-plus", "realesrgan-plus-anime", "realesr-animevideov3"]:
                model_name = model_opt
            else:
                model_name = "realesrgan-plus"

            # Determine AI scale factor (2x, 3x, 4x)
            # Note: realesrgan-plus and realesrgan-plus-anime are native x4 models
            if model_name in ["realesrgan-plus", "realesrgan-plus-anime"]:
                ai_scale = 4
            elif model_name == "realesr-animevideov3":
                scale_ratio = max(target_w / in_w, target_h / in_h)
                if scale_ratio <= 2.2:
                    ai_scale = 2
                elif scale_ratio <= 3.2:
                    ai_scale = 3
                else:
                    ai_scale = 4
            else:
                ai_scale = 4

            # Prepare intermediate paths
            temp_ai_out = settings.TEMP_DIR / f"{self.job_id}_ai_upscaled.mp4"
            final_out = settings.OUTPUT_DIR / f"{self.job_id}_enhanced.mp4"

            # 2. Start AI Super Resolution
            await JobManager.update_job(self.job_id, status="PROCESSING")
            await self._emit_progress("Initializing AI model on GPU", 10.0, {
                "total_frames": total_input_frames
            })

            loop = asyncio.get_running_loop()

            def on_ai_progress(data: Dict[str, Any]):
                # Map AI upscaling progress from 10% to 75%
                raw_pct = data.get("progress", 0.0)
                mapped_pct = 10.0 + (raw_pct * 0.65)
                asyncio.run_coroutine_threadsafe(
                    self._emit_progress(
                        f"Enhancing with {model_name} (frame {data.get('current_frame')}/{data.get('total_frames')})",
                        mapped_pct,
                        {
                            "current_frame": data.get("current_frame", 0),
                            "total_frames": data.get("total_frames", total_input_frames),
                            "fps": data.get("fps", 0.0),
                            "eta_seconds": data.get("eta_seconds")
                        }
                    ),
                    loop
                )

            success = await self.engine.run_upscale(
                input_path=input_path,
                output_path=temp_ai_out,
                model_name=model_name,
                scale=ai_scale,
                codec="libx264",
                quality_preset=preset,
                device_id=settings.GPU_TARGET_INDEX,
                progress_callback=on_ai_progress
            )

            if not success or not temp_ai_out.exists():
                raise RuntimeError("Video2X upscaling process failed or produced no output.")

            intermediate_video = temp_ai_out

            # 3. Optional RIFE frame interpolation
            if interpolate:
                await self._emit_progress("Interpolating frames (RIFE 2x FPS)", 76.0)
                temp_rife_out = settings.TEMP_DIR / f"{self.job_id}_rife.mp4"

                def on_rife_progress(data: Dict[str, Any]):
                    raw_pct = data.get("progress", 0.0)
                    mapped_pct = 76.0 + (raw_pct * 0.12)
                    asyncio.run_coroutine_threadsafe(
                        self._emit_progress(
                            f"RIFE frame interpolation ({round(raw_pct, 1)}%)",
                            mapped_pct,
                            {
                                "current_frame": data.get("current_frame", 0),
                                "total_frames": data.get("total_frames", 0),
                                "fps": data.get("fps", 0.0),
                                "eta_seconds": data.get("eta_seconds")
                            }
                        ),
                        loop
                    )

                rife_ok = await self.engine.run_rife(
                    input_path=intermediate_video,
                    output_path=temp_rife_out,
                    multiplier=2,
                    device_id=settings.GPU_TARGET_INDEX,
                    progress_callback=on_rife_progress
                )
                if rife_ok and temp_rife_out.exists():
                    intermediate_video = temp_rife_out

            # 4. Encoding & Finalizing (Muxing Audio and Final Resizing)
            await JobManager.update_job(self.job_id, status="ENCODING")
            await self._emit_progress("Finalizing video & preserving audio", 90.0)

            mux_ok = FFmpegService.mux_audio_and_finalize(
                enhanced_video_path=intermediate_video,
                original_video_path=input_path,
                output_path=final_out,
                target_width=target_w,
                target_height=target_h,
                codec=codec,
                quality_preset=preset
            )

            if not mux_ok or not final_out.exists():
                raise RuntimeError("FFmpeg encoding/muxing stage failed.")

            # 5. Output Verification
            await self._emit_progress("Verifying output stream integrity", 96.0)
            out_meta = VideoProbeService.probe(final_out)
            if out_meta["display_width"] != target_w or out_meta["display_height"] != target_h:
                logger.warning(f"Final resolution {out_meta['display_width']}x{out_meta['display_height']} differs from target {target_w}x{target_h}")

            # Clean up intermediate files
            if temp_ai_out.exists():
                temp_ai_out.unlink(missing_ok=True)
            rife_path = settings.TEMP_DIR / f"{self.job_id}_rife.mp4"
            if rife_path.exists():
                rife_path.unlink(missing_ok=True)

            # Generate enhanced thumbnail
            enhanced_thumb = settings.THUMBNAIL_DIR / f"{self.job_id}_enhanced_thumb.jpg"
            FFmpegService.generate_thumbnail(final_out, enhanced_thumb, time_offset=min(1.0, out_meta["duration"] / 2))

            # 6. Completed
            comp_iso = datetime.now(timezone.utc).isoformat()
            tot_elapsed = time.time() - self.start_time

            await JobManager.update_job(
                self.job_id,
                status="COMPLETED",
                stage="Completed",
                progress=100.0,
                output_path=str(final_out),
                output_metadata=json.dumps(out_meta),
                completed_at=comp_iso,
                elapsed_seconds=round(tot_elapsed, 1)
            )

            finish_payload = {
                "type": "job_completed",
                "job_id": self.job_id,
                "status": "COMPLETED",
                "stage": "Completed",
                "progress": 100.0,
                "elapsed_seconds": round(tot_elapsed, 1),
                "output_metadata": out_meta,
                "output_path": str(final_out),
                "enhanced_video_url": f"/storage/outputs/{final_out.name}",
                "thumbnail_url": f"/storage/thumbnails/{enhanced_thumb.name}" if enhanced_thumb.exists() else None
            }
            await ws_manager.broadcast_job_update(self.job_id, finish_payload)
            await ws_manager.broadcast_global(finish_payload)

        except asyncio.CancelledError:
            logger.info(f"Job {self.job_id} cancelled.")
            await JobManager.update_job(
                self.job_id,
                status="CANCELLED",
                stage="Cancelled",
                error_message="Job was cancelled by user."
            )
            await ws_manager.broadcast_job_update(self.job_id, {
                "type": "job_cancelled",
                "job_id": self.job_id,
                "status": "CANCELLED",
                "stage": "Cancelled"
            })
        except Exception as e:
            logger.error(f"Job {self.job_id} failed: {e}", exc_info=True)
            await JobManager.update_job(
                self.job_id,
                status="FAILED",
                stage="Failed",
                error_message=str(e)
            )
            await ws_manager.broadcast_job_update(self.job_id, {
                "type": "job_failed",
                "job_id": self.job_id,
                "status": "FAILED",
                "stage": "Failed",
                "error_message": str(e)
            })

