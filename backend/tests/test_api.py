import pytest
import os
import shutil
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.services.ffmpeg_service import FFmpegService
from app.services.video_probe import VideoProbeService

client = TestClient(app)

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "PIXELFORGE AI"

def test_system_status():
    response = client.get("/api/system")
    assert response.status_code == 200
    data = response.json()
    assert "gpu" in data
    assert "vulkan" in data
    assert "ffmpeg" in data
    assert "video2x" in data
    assert data["gpu"]["available"] is True
    assert "RTX 5050" in data["gpu"]["name"]
    assert data["vulkan"]["available"] is True

def test_models():
    response = client.get("/api/models")
    assert response.status_code == 200
    data = response.json()
    assert len(data["upscaling_models"]) >= 3
    assert any(m["id"] == "realesrgan-plus" for m in data["upscaling_models"])

def test_upload_and_job_flow():
    # 1. Create a synthetic test clip
    test_video_path = settings.TEMP_DIR / "test_pytest.mp4"
    ok = FFmpegService.create_synthetic_test_video(test_video_path, width=320, height=180, duration=1, fps=24)
    assert ok is True
    assert test_video_path.exists()

    # 2. Upload video
    with open(test_video_path, "rb") as f:
        response = client.post("/api/videos/upload", files={"file": ("test_pytest.mp4", f, "video/mp4")})
    assert response.status_code == 200
    upload_data = response.json()
    assert "video_id" in upload_data
    video_id = upload_data["video_id"]
    assert upload_data["metadata"]["width"] == 320
    assert upload_data["metadata"]["height"] == 180

    # 3. Create Job
    job_payload = {
        "video_id": video_id,
        "settings": {
            "target_resolution": "1080p",
            "model": "realesrgan-plus",
            "quality_preset": "fast",
            "codec": "h264",
            "preserve_audio": True,
            "interpolate_fps": False
        }
    }
    job_resp = client.post("/api/jobs", json=job_payload)
    assert job_resp.status_code == 200
    job_data = job_resp.json()
    job_id = job_data["id"]
    assert job_data["status"] == "QUEUED"

    # 4. Fetch job
    get_resp = client.get(f"/api/jobs/{job_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == job_id

    # 5. List jobs
    list_resp = client.get("/api/jobs")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

