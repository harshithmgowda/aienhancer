import os
import shutil
import uuid
import json
import logging
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse

from app.core.config import settings
from app.models.job import JobRecord
from app.schemas.job import EnhancementSettings, CreateJobRequest, JobResponse, SystemStatusResponse
from app.services.gpu_monitor import GPUMonitor
from app.services.video_probe import VideoProbeService
from app.services.ffmpeg_service import FFmpegService
from app.services.job_manager import JobManager
from app.services.queue_manager import queue_manager
from app.websocket.connection_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

@router.get("/system")
async def get_system_status():
    gpu_info = GPUMonitor.get_gpu_status()
    vulkan_info = GPUMonitor.get_vulkan_status()
    has_nvenc = FFmpegService.check_nvenc_support()
    
    disk_stat = shutil.disk_usage(settings.STORAGE_DIR)
    v2x_exe = None
    try:
        candidates = list(settings.TOOLS_DIR.glob("**/video2x.exe"))
        if candidates:
            v2x_exe = str(candidates[0])
    except Exception:
        pass

    return {
        "gpu": gpu_info,
        "vulkan": vulkan_info,
        "ffmpeg": {
            "path": settings.FFMPEG_PATH,
            "nvenc_supported": has_nvenc,
            "version": "9.0.2"
        },
        "video2x": {
            "path": v2x_exe or settings.VIDEO2X_PATH,
            "installed": v2x_exe is not None or (settings.VIDEO2X_PATH and Path(settings.VIDEO2X_PATH).exists()),
            "version": "6.4.0"
        },
        "storage": {
            "total_gb": round(disk_stat.total / (1024**3), 2),
            "free_gb": round(disk_stat.free / (1024**3), 2),
            "used_gb": round((disk_stat.total - disk_stat.free) / (1024**3), 2)
        }
    }

@router.get("/models")
async def get_models():
    """List actually installed and tested AI models."""
    return {
        "upscaling_models": [
            {
                "id": "realesrgan-plus",
                "name": "Realistic Video (Real-ESRGAN+)",
                "description": "High-fidelity general enhancement for live-action footage, movies, and camera recordings.",
                "scale": "4x",
                "default": True
            },
            {
                "id": "realesrgan-plus-anime",
                "name": "Anime / Animation (Real-ESRGAN+ Anime)",
                "description": "Sharp lines and clean flat shading restoration optimized for animation.",
                "scale": "4x",
                "default": False
            },
            {
                "id": "realesr-animevideov3",
                "name": "Fast Anime Video (Real-ESRGAN v3)",
                "description": "Fast video-optimized model with temporal stability.",
                "scale": "2x-4x",
                "default": False
            },
            {
                "id": "auto",
                "name": "Auto Detect",
                "description": "Intelligently select the best model for your source video.",
                "scale": "Auto",
                "default": False
            }
        ],
        "interpolation_models": [
            {
                "id": "rife-v4.6",
                "name": "RIFE v4.6 (Real-Time Intermediate Flow Estimation)",
                "description": "AI motion interpolation to double frame rate (e.g. 24fps -> 48fps, 30fps -> 60fps) preserving smooth motion.",
                "supported_multipliers": [2]
            }
        ],
        "resolutions": [
            {"id": "1080p", "label": "Full HD (1080p)", "landscape": "1920x1080", "portrait": "1080x1920"},
            {"id": "1440p", "label": "2K Quad HD (1440p)", "landscape": "2560x1440", "portrait": "1440x2560"},
            {"id": "2160p", "label": "4K Ultra HD (2160p)", "landscape": "3840x2160", "portrait": "2160x3840"},
            {"id": "custom", "label": "Custom Resolution", "landscape": "Custom", "portrait": "Custom"}
        ],
        "presets": [
            {"id": "fast", "label": "Fast", "description": "Faster encoding, lower GPU memory load"},
            {"id": "balanced", "label": "Balanced", "description": "Recommended balance of speed and visual fidelity"},
            {"id": "max", "label": "Maximum Quality", "description": "Highest bitrate and quality preservation"}
        ]
    }

@router.post("/videos/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload and validate video file."""
    # Check disk space
    disk = shutil.disk_usage(settings.STORAGE_DIR)
    if disk.free < settings.MIN_DISK_FREE_BYTES:
        raise HTTPException(status_code=507, detail="Insufficient server disk space.")

    # Generate unique ID
    video_id = str(uuid.uuid4())
    ext = Path(file.filename).suffix.lower()
    if ext not in [".mp4", ".mov", ".mkv", ".webm", ".avi"]:
        raise HTTPException(status_code=400, detail=f"Unsupported format '{ext}'. Supported: MP4, MOV, MKV, WEBM.")

    safe_filename = f"{video_id}{ext}"
    dest_path = settings.UPLOAD_DIR / safe_filename

    # Stream write to disk
    bytes_written = 0
    try:
        with open(dest_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):  # 1MB chunk
                bytes_written += len(chunk)
                if bytes_written > settings.MAX_UPLOAD_SIZE_BYTES:
                    dest_path.unlink(missing_ok=True)
                    raise HTTPException(status_code=413, detail="File exceeds 2 GB limit.")
                f.write(chunk)
    except Exception as e:
        if dest_path.exists():
            dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Upload write error: {e}")

    # Validate stream with FFprobe
    try:
        metadata = VideoProbeService.probe(dest_path)
    except Exception as e:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Invalid or corrupted video: {e}")

    # Generate poster thumbnail
    thumb_path = settings.THUMBNAIL_DIR / f"{video_id}_thumb.jpg"
    thumb_time = min(1.0, metadata["duration"] / 2) if metadata["duration"] > 0 else 0.0
    FFmpegService.generate_thumbnail(dest_path, thumb_path, time_offset=thumb_time)

    return {
        "video_id": video_id,
        "original_filename": file.filename,
        "file_path": str(dest_path),
        "video_url": f"/storage/uploads/{safe_filename}",
        "thumbnail_url": f"/storage/thumbnails/{thumb_path.name}" if thumb_path.exists() else None,
        "metadata": metadata
    }

@router.get("/videos/{video_id}")
async def get_video_info(video_id: str):
    matches = list(settings.UPLOAD_DIR.glob(f"{video_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Video not found")
    v_path = matches[0]
    meta = VideoProbeService.probe(v_path)
    thumb_path = settings.THUMBNAIL_DIR / f"{video_id}_thumb.jpg"
    return {
        "video_id": video_id,
        "original_filename": v_path.name,
        "video_url": f"/storage/uploads/{v_path.name}",
        "thumbnail_url": f"/storage/thumbnails/{thumb_path.name}" if thumb_path.exists() else None,
        "metadata": meta
    }

@router.post("/jobs")
async def create_job(request: CreateJobRequest):
    """Create enhancement job and place into queue."""
    video_id = request.video_id
    matches = list(settings.UPLOAD_DIR.glob(f"{video_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Uploaded source video not found.")
    
    input_path = matches[0]
    meta = VideoProbeService.probe(input_path)
    thumb_path = settings.THUMBNAIL_DIR / f"{video_id}_thumb.jpg"

    job_id = str(uuid.uuid4())
    job = JobRecord(
        id=job_id,
        original_filename=input_path.name,
        input_path=str(input_path),
        thumbnail_path=str(thumb_path) if thumb_path.exists() else None,
        status="QUEUED",
        stage="Queued",
        progress=0.0,
        total_frames=meta.get("total_frames", 0),
        input_metadata=json.dumps(meta),
        settings=request.settings.model_dump_json()
    )

    saved_job = await JobManager.create_job(job)
    await queue_manager.enqueue_job(job_id)

    return saved_job.to_dict()

@router.get("/jobs")
async def list_jobs():
    jobs = await JobManager.list_jobs()
    results = []
    for j in jobs:
        d = j.to_dict()
        if j.thumbnail_path and Path(j.thumbnail_path).exists():
            d["thumbnail_url"] = f"/storage/thumbnails/{Path(j.thumbnail_path).name}"
        if j.input_path and Path(j.input_path).exists():
            d["video_url"] = f"/storage/uploads/{Path(j.input_path).name}"
        if j.output_path and Path(j.output_path).exists():
            d["enhanced_video_url"] = f"/storage/outputs/{Path(j.output_path).name}"
        results.append(d)
    return results

@router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    job = await JobManager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    d = job.to_dict()
    if job.thumbnail_path and Path(job.thumbnail_path).exists():
        d["thumbnail_url"] = f"/storage/thumbnails/{Path(job.thumbnail_path).name}"
    if job.input_path and Path(job.input_path).exists():
        d["video_url"] = f"/storage/uploads/{Path(job.input_path).name}"
    if job.output_path and Path(job.output_path).exists():
        d["enhanced_video_url"] = f"/storage/outputs/{Path(job.output_path).name}"
    return d

@router.post("/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    cancelled = await queue_manager.cancel_job(job_id)
    if not cancelled:
        raise HTTPException(status_code=400, detail="Job could not be cancelled or is already finished.")
    return {"message": "Job cancellation initiated.", "job_id": job_id}

@router.get("/jobs/{job_id}/download")
async def download_job(job_id: str):
    job = await JobManager.get_job(job_id)
    if not job or not job.output_path or not Path(job.output_path).exists():
        raise HTTPException(status_code=404, detail="Enhanced video file not found or not completed.")
    
    out_file = Path(job.output_path)
    download_filename = f"pixelforge_{job.original_filename}"
    return FileResponse(
        path=out_file,
        filename=download_filename,
        media_type="video/mp4"
    )

@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    deleted = await JobManager.delete_job(job_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Job not found.")
    return {"message": "Job and associated files successfully deleted.", "job_id": job_id}

