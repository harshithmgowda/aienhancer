import os
import time
import httpx
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"

def test_image_pipeline():
    client = httpx.Client(timeout=30.0)
    print("1. Creating test image using ffmpeg...")
    test_img = Path("storage/test_input.jpg")
    os.system(f'ffmpeg -y -f lavfi -i testsrc=size=320x240:rate=1 -frames:v 1 "{test_img}"')
    assert test_img.exists(), "Failed to create test image"

    print("2. Uploading test image to /api/videos/upload...")
    with open(test_img, "rb") as f:
        res = client.post(f"{BASE_URL}/api/videos/upload", files={"file": ("cyberpunk_portrait.jpg", f, "image/jpeg")})
    assert res.status_code == 200, f"Upload failed: {res.text}"
    upload_data = res.json()
    print("Upload response:", upload_data)
    video_id = upload_data["video_id"]
    meta = upload_data["metadata"]
    assert meta["media_type"] == "image", f"Expected media_type 'image', got {meta.get('media_type')}"
    assert meta["total_frames"] == 1, f"Expected 1 frame, got {meta.get('total_frames')}"
    print(f"Verified image metadata: {meta['display_width']}x{meta['display_height']}, media_type={meta['media_type']}")

    print("3. Creating image enhancement job on RTX 5050...")
    job_payload = {
        "video_id": video_id,
        "original_filename": "cyberpunk_portrait.jpg",
        "settings": {
            "media_type": "image",
            "model": "realesrgan-plus",
            "scale": 4,
            "target_resolution": "2160p",
            "quality_preset": "balanced",
            "codec": "h264",
            "preserve_audio": False,
            "interpolate_fps": False,
            "target_fps_multiplier": 1,
            "color_grade": "cyberpunk_vivid",
            "clarity_boost": True,
            "hdr_tone": True,
            "film_grain": "subtle",
            "vignette": True
        }
    }
    res = client.post(f"{BASE_URL}/api/jobs", json=job_payload)
    assert res.status_code == 200, f"Job creation failed: {res.text}"
    job = res.json()
    job_id = job["id"]
    print(f"Job created: {job_id}, status: {job['status']}")

    print("4. Polling job completion...")
    for _ in range(30):
        time.sleep(1)
        r = client.get(f"{BASE_URL}/api/jobs/{job_id}")
        assert r.status_code == 200
        cur = r.json()
        print(f"Status: {cur['status']}, Stage: {cur['stage']}, Progress: {cur['progress']}%")
        if cur["status"] in ["COMPLETED", "FAILED", "CANCELLED"]:
            break

    assert cur["status"] == "COMPLETED", f"Job did not complete successfully: {cur.get('error_message')}"
    print(f"Job COMPLETED successfully!")
    out_meta = cur.get("output_metadata")
    print(f"Output resolution: {out_meta['display_width']}x{out_meta['display_height']}, size: {out_meta['file_size']} bytes")
    assert out_meta["display_width"] > meta["display_width"], "Image was not upscaled!"

    print("5. Verifying download endpoints...")
    d_res = client.get(f"{BASE_URL}/api/jobs/{job_id}/download")
    assert d_res.status_code == 200
    assert d_res.headers.get("content-type") in ["image/png", "image/jpeg"]
    print(f"Enhanced image download verified: {len(d_res.content)} bytes, Content-Type: {d_res.headers.get('content-type')}")

    orig_res = client.get(f"{BASE_URL}/api/jobs/{job_id}/download/original")
    assert orig_res.status_code == 200
    print(f"Original image download verified: {len(orig_res.content)} bytes")

    print("\nALL IMAGE ENHANCEMENT TESTS PASSED 100%!")

if __name__ == "__main__":
    test_image_pipeline()
