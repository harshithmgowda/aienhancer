import json
import logging
import subprocess
from pathlib import Path
from typing import Optional, Tuple, Dict, Any

from app.core.config import settings

logger = logging.getLogger(__name__)

class FFmpegService:
    @staticmethod
    def get_ffmpeg_cmd() -> str:
        if settings.FFMPEG_PATH and Path(settings.FFMPEG_PATH).exists():
            return settings.FFMPEG_PATH
        return "ffmpeg"

    @classmethod
    def check_nvenc_support(cls) -> bool:
        """Check if h264_nvenc is available in FFmpeg."""
        try:
            cmd = [cls.get_ffmpeg_cmd(), "-hide_banner", "-encoders"]
            res = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
            )
            return "h264_nvenc" in res.stdout
        except Exception:
            return False

    @classmethod
    def generate_thumbnail(cls, video_path: Path, thumbnail_path: Path, time_offset: float = 1.0) -> bool:
        """Generate a poster frame JPEG thumbnail from video or image."""
        ffmpeg_bin = cls.get_ffmpeg_cmd()
        is_img = video_path.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]
        cmd = [ffmpeg_bin, "-y"]
        if not is_img:
            cmd.extend(["-ss", str(time_offset)])
        cmd.extend([
            "-i", str(video_path),
            "-vframes", "1",
            "-q:v", "2",
            "-vf", "scale=640:-1:flags=bicubic",
            str(thumbnail_path)
        ])
        try:
            res = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
            )
            return thumbnail_path.exists() and thumbnail_path.stat().st_size > 0
        except Exception as e:
            logger.error(f"Thumbnail generation error: {e}")
            return False

    @classmethod
    def create_synthetic_test_video(cls, output_path: Path, width: int = 640, height: int = 360, duration: int = 2, fps: int = 30) -> bool:
        """Create a synthetic MP4 video with color gradient, moving shape, text, and test audio."""
        ffmpeg_bin = cls.get_ffmpeg_cmd()
        cmd = [
            ffmpeg_bin,
            "-y",
            "-f", "lavfi",
            "-i", f"testsrc=duration={duration}:size={width}x{height}:rate={fps}",
            "-f", "lavfi",
            "-i", f"sine=frequency=440:duration={duration}",
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "128k",
            str(output_path)
        ]
        try:
            res = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
            )
            return output_path.exists()
        except Exception as e:
            logger.error(f"Synthetic video generation failed: {e}")
            return False

    @classmethod
    def mux_audio_and_finalize(
        cls,
        enhanced_video_path: Path,
        original_video_path: Path,
        output_path: Path,
        target_width: Optional[int] = None,
        target_height: Optional[int] = None,
        codec: str = "h264",
        quality_preset: str = "balanced",
        color_grade: str = "none",
        clarity_boost: bool = True,
        hdr_tone: bool = False,
        film_grain: str = "none",
        vignette: bool = False
    ) -> bool:
        """
        Merge the enhanced video with the audio from the original video.
        Optionally scales to exact target resolution if needed, applies cinematic color grading,
        micro-contrast CAS clarity, HDR tone curves, organic film grain, and encoder settings.
        """
        ffmpeg_bin = cls.get_ffmpeg_cmd()
        use_nvenc = cls.check_nvenc_support()
        
        # Determine encoder
        if codec == "hevc" or codec == "h265":
            v_encoder = "hevc_nvenc" if use_nvenc else "libx265"
        else:
            v_encoder = "h264_nvenc" if use_nvenc else "libx264"

        # Quality options
        if "nvenc" in v_encoder:
            if quality_preset == "fast":
                cq = "26"
                preset_flag = "p3"
            elif quality_preset == "max":
                cq = "18"
                preset_flag = "p7"
            else:  # balanced
                cq = "22"
                preset_flag = "p5"
            encoder_opts = ["-preset", preset_flag, "-cq", cq]
        else:
            if quality_preset == "fast":
                crf = "26"
                preset_flag = "fast"
            elif quality_preset == "max":
                crf = "18"
                preset_flag = "slow"
            else:  # balanced
                crf = "22"
                preset_flag = "medium"
            encoder_opts = ["-preset", preset_flag, "-crf", crf]

        # Construct visual enhancement filter chain
        filter_chain = []
        if target_width and target_height:
            filter_chain.append(f"scale={target_width}:{target_height}:flags=lanczos")

        # 1. Contrast Adaptive Sharpening (Micro-texture & Edge clarity)
        if clarity_boost:
            filter_chain.append("cas=0.35")

        # 2. Cinematic Color Grading Presets
        if color_grade == "cinematic_teal_orange":
            filter_chain.append("colorbalance=rs=-0.04:gs=0.02:bs=0.08:rh=0.08:gh=0.03:bh=-0.06,eq=contrast=1.06:saturation=1.12")
        elif color_grade == "cyberpunk_vivid":
            filter_chain.append("eq=contrast=1.12:saturation=1.35:brightness=0.01,colorbalance=rs=-0.03:bs=0.06:rh=0.06:bh=0.04")
        elif color_grade == "golden_hour":
            filter_chain.append("colorbalance=rh=0.10:gh=0.05:bh=-0.08:rm=0.05:gm=0.02:bm=-0.04,eq=contrast=1.04:saturation=1.10:gamma=1.02")
        elif color_grade == "anime_radiance":
            filter_chain.append("eq=contrast=1.08:saturation=1.28:brightness=0.02:gamma=1.04")
        elif color_grade == "film_noir":
            filter_chain.append("hue=s=0,eq=contrast=1.25:brightness=-0.02:gamma=0.96")

        # 3. HDR Dynamic Contrast Tone
        if hdr_tone and color_grade not in ["film_noir", "cyberpunk_vivid"]:
            filter_chain.append("eq=contrast=1.08:gamma=1.04:saturation=1.08:brightness=0.01")

        # 4. Organic 35mm Film Grain
        if film_grain == "subtle":
            filter_chain.append("noise=alls=6:allf=t+u")
        elif film_grain == "medium":
            filter_chain.append("noise=alls=12:allf=t+u")

        # 5. Cinematic Optical Vignette
        if vignette:
            filter_chain.append("vignette=PI/5")

        if filter_chain:
            filter_chain.append("format=yuv420p")
            vf_args = ["-vf", ",".join(filter_chain)]
        else:
            vf_args = []

        # Check if original has audio
        probe_cmd = [
            settings.FFPROBE_PATH or "ffprobe",
            "-v", "error",
            "-select_streams", "a",
            "-show_entries", "stream=codec_name",
            "-of", "csv=p=0",
            str(original_video_path)
        ]
        has_audio = False
        try:
            p_res = subprocess.run(
                probe_cmd,
                capture_output=True,
                text=True,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
            )
            has_audio = bool(p_res.stdout.strip())
        except Exception:
            pass

        cmd = [
            ffmpeg_bin,
            "-y",
            "-i", str(enhanced_video_path)
        ]
        
        if has_audio:
            cmd.extend([
                "-i", str(original_video_path),
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-c:a", "copy",
                "-shortest"
            ])
        else:
            cmd.extend([
                "-map", "0:v:0"
            ])

        cmd.extend([
            "-c:v", v_encoder,
            *encoder_opts,
            "-pix_fmt", "yuv420p",
            *vf_args,
            str(output_path)
        ])

        try:
            res = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
            )
            return output_path.exists() and output_path.stat().st_size > 0
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg muxing failed: {e.stderr}")
            # If nvenc failed or copy failed, attempt a safe software fallback
            if "nvenc" in v_encoder:
                logger.info("Attempting software libx264 fallback...")
                fb_cmd = [
                    ffmpeg_bin, "-y",
                    "-i", str(enhanced_video_path)
                ]
                if has_audio:
                    fb_cmd.extend([
                        "-i", str(original_video_path),
                        "-map", "0:v:0",
                        "-map", "1:a:0?",
                        "-c:a", "aac",
                        "-b:a", "192k",
                        "-shortest"
                    ])
                else:
                    fb_cmd.extend(["-map", "0:v:0"])
                fb_cmd.extend([
                    "-c:v", "libx264",
                    "-preset", "medium",
                    "-crf", "22",
                    "-pix_fmt", "yuv420p",
                    *vf_args,
                    str(output_path)
                ])
                res2 = subprocess.run(
                    fb_cmd,
                    capture_output=True,
                    text=True,
                    creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
                )
                return output_path.exists() and output_path.stat().st_size > 0
            return False

    @classmethod
    def finalize_image(
        cls,
        enhanced_image_path: Path,
        output_path: Path,
        target_width: Optional[int] = None,
        target_height: Optional[int] = None,
        color_grade: str = "none",
        clarity_boost: bool = True,
        hdr_tone: bool = False,
        film_grain: str = "none",
        vignette: bool = False
    ) -> bool:
        """
        Applies final resizing, color grading presets, CAS clarity, and film texture to enhanced images.
        """
        ffmpeg_bin = cls.get_ffmpeg_cmd()
        filter_chain = []
        if target_width and target_height:
            filter_chain.append(f"scale={target_width}:{target_height}:flags=lanczos")
        if clarity_boost:
            filter_chain.append("cas=0.35")
        if color_grade == "cinematic_teal_orange":
            filter_chain.append("colorbalance=rs=-0.04:gs=0.02:bs=0.08:rh=0.08:gh=0.03:bh=-0.06,eq=contrast=1.06:saturation=1.12")
        elif color_grade == "cyberpunk_vivid":
            filter_chain.append("eq=contrast=1.12:saturation=1.35:brightness=0.01,colorbalance=rs=-0.03:bs=0.06:rh=0.06:bh=0.04")
        elif color_grade == "golden_hour":
            filter_chain.append("colorbalance=rh=0.10:gh=0.05:bh=-0.08:rm=0.05:gm=0.02:bm=-0.04,eq=contrast=1.04:saturation=1.10:gamma=1.02")
        elif color_grade == "anime_radiance":
            filter_chain.append("eq=contrast=1.08:saturation=1.28:brightness=0.02:gamma=1.04")
        elif color_grade == "film_noir":
            filter_chain.append("hue=s=0,eq=contrast=1.25:brightness=-0.02:gamma=0.96")
        if hdr_tone and color_grade not in ["film_noir", "cyberpunk_vivid"]:
            filter_chain.append("eq=contrast=1.08:gamma=1.04:saturation=1.08:brightness=0.01")
        if film_grain == "subtle":
            filter_chain.append("noise=alls=6:allf=t+u")
        elif film_grain == "medium":
            filter_chain.append("noise=alls=12:allf=t+u")
        if vignette:
            filter_chain.append("vignette=PI/5")

        vf_args = ["-vf", ",".join(filter_chain)] if filter_chain else []
        cmd = [
            ffmpeg_bin, "-y",
            "-i", str(enhanced_image_path),
            *vf_args,
            str(output_path)
        ]
        try:
            res = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
            )
            return output_path.exists() and output_path.stat().st_size > 0
        except Exception as e:
            logger.error(f"Image finalization error: {e}")
            import shutil
            try:
                shutil.copy(enhanced_image_path, output_path)
                return output_path.exists()
            except Exception:
                return False

