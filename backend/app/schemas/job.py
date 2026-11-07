from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class VideoMetadata(BaseModel):
    width: int
    height: int
    display_width: int
    display_height: int
    rotation: int = 0
    aspect_ratio: str
    fps: float
    duration: float
    total_frames: int
    video_codec: str
    audio_codec: Optional[str] = None
    has_audio: bool = False
    file_size: int
    bitrate: int

class EnhancementSettings(BaseModel):
    target_resolution: str = Field(default="1080p", description="1080p, 1440p, 2160p (4K), or custom")
    custom_width: Optional[int] = None
    custom_height: Optional[int] = None
    model: str = Field(default="realesrgan-plus", description="realesrgan-plus, realesrgan-plus-anime, etc.")
    quality_preset: str = Field(default="balanced", description="fast, balanced, max")
    codec: str = Field(default="h264", description="h264 or hevc")
    preserve_audio: bool = True
    interpolate_fps: bool = False
    target_fps_multiplier: int = 1

    # Cinematic & Visual Magic
    color_grade: str = Field(default="none", description="none, cinematic_teal_orange, cyberpunk_vivid, golden_hour, anime_radiance, film_noir")
    clarity_boost: bool = Field(default=True, description="Adaptive edge clarity and micro-contrast enhancement (CAS)")
    hdr_tone: bool = Field(default=False, description="HDR-like dynamic range and contrast pop")
    film_grain: str = Field(default="none", description="none, subtle, medium")
    vignette: bool = Field(default=False, description="Subtle cinematic optical vignette")

class CreateJobRequest(BaseModel):
    video_id: str
    settings: EnhancementSettings
    original_filename: Optional[str] = None

class JobResponse(BaseModel):
    id: str
    original_filename: str
    status: str
    stage: str
    progress: float
    current_frame: int
    total_frames: int
    fps: float
    eta_seconds: Optional[float] = None
    elapsed_seconds: float
    error_message: Optional[str] = None
    input_metadata: Optional[Dict[str, Any]] = None
    output_metadata: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None
    thumbnail_url: Optional[str] = None
    video_url: Optional[str] = None
    enhanced_video_url: Optional[str] = None
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

class SystemStatusResponse(BaseModel):
    gpu: Dict[str, Any]
    vulkan: Dict[str, Any]
    ffmpeg: Dict[str, Any]
    video2x: Dict[str, Any]
    storage: Dict[str, Any]

