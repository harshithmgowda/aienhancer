export interface VideoMetadata {
  width: number;
  height: number;
  display_width: number;
  display_height: number;
  rotation: number;
  aspect_ratio: string;
  fps: number;
  duration: number;
  total_frames: number;
  video_codec: string;
  audio_codec: string | null;
  has_audio: boolean;
  file_size: number;
  bitrate: number;
  media_type?: "video" | "image";
}

export interface UploadedVideo {
  video_id: string;
  original_filename: string;
  file_path: string;
  video_url: string;
  thumbnail_url: string | null;
  metadata: VideoMetadata;
  media_type?: "video" | "image";
}

export interface EnhancementSettings {
  media_type?: "video" | "image";
  scale?: number;
  target_resolution: "1080p" | "1440p" | "2160p" | "4320p" | "custom";
  custom_width?: number;
  custom_height?: number;
  model: string;
  quality_preset: "fast" | "balanced" | "max";
  codec: "h264" | "hevc";
  preserve_audio: boolean;
  interpolate_fps: boolean;
  target_fps_multiplier: number;

  // Cinematic & Visual Magic
  color_grade?: "none" | "cinematic_teal_orange" | "cyberpunk_vivid" | "golden_hour" | "anime_radiance" | "film_noir";
  clarity_boost?: boolean;
  hdr_tone?: boolean;
  film_grain?: "none" | "subtle" | "medium";
  vignette?: boolean;
}

export interface JobRecord {
  id: string;
  original_filename: string;
  input_path: string;
  output_path: string | null;
  thumbnail_path: string | null;
  status: "QUEUED" | "INITIALIZING" | "PROCESSING" | "ENCODING" | "COMPLETED" | "FAILED" | "CANCELLED";
  stage: string;
  progress: number;
  current_frame: number;
  total_frames: number;
  fps: number;
  eta_seconds: number | null;
  elapsed_seconds: number;
  error_message: string | null;
  media_type?: "video" | "image";
  input_metadata: VideoMetadata | null;
  output_metadata: VideoMetadata | null;
  settings: EnhancementSettings | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  enhanced_video_url?: string | null;
  created_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface GPUSystemInfo {
  available: boolean;
  name: string;
  driver_version?: string;
  memory_total_mb: number;
  memory_used_mb: number;
  memory_free_mb: number;
  memory_used_pct: number;
  gpu_utilization_pct: number;
  temperature_c: number;
  power_draw_w: number;
  error?: string;
}

export interface SystemStatus {
  gpu: GPUSystemInfo;
  vulkan: {
    available: boolean;
    discrete_gpu_supported?: boolean;
    nvidia_supported?: boolean;
    summary?: string;
    error?: string;
  };
  ffmpeg: {
    path: string | null;
    nvenc_supported: boolean;
    version: string;
  };
  video2x: {
    path: string | null;
    installed: boolean;
    version: string;
  };
  storage: {
    total_gb: number;
    free_gb: number;
    used_gb: number;
  };
}

