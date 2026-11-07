# PIXELFORGE AI

> **Transform ordinary footage into extraordinary clarity.**  
> Production-quality, 100% local AI video super-resolution and frame interpolation application powered by **Real-ESRGAN**, **RIFE**, and **Vulkan GPU Acceleration** on NVIDIA GeForce RTX GPUs.

---

## 🚀 Key Highlights

- **100% Local Inference**: Zero cloud API dependencies, zero external subscriptions. No frames or videos leave your machine.
- **Hardware-Accelerated Super-Resolution**: Built with Video2X and Real-ESRGAN NCNN Vulkan, executing directly on your discrete GPU (tested and verified on **NVIDIA GeForce RTX 5050 Laptop GPU**).
- **Proportional Resolution Scaling**: Supports **1080p Full HD**, **1440p Quad HD / 2K**, and **2160p 4K UHD** in both landscape (16:9) and portrait (9:16) without stretching or distortion.
- **Audio & Stream Preservation**: Preserves original audio streams (`-c:a copy` or high-bitrate AAC fallback) and frame timing.
- **RIFE Frame Interpolation**: Optional 2× AI frame interpolation (e.g., 24 FPS → 48 FPS, 30 FPS → 60 FPS) for buttery smooth motion.
- **NVENC Hardware Finalization**: Utilizes NVIDIA NVENC (`h264_nvenc` / `hevc_nvenc`) for ultra-fast finalization and Lanczos scaling.
- **Interactive Split Comparison**: Side-by-side or draggable split-screen before/after video comparison with synchronized scrubbing.
- **Real-Time Machine Progress**: Real progress percentages parsed directly from frame counters (`frame=X/Y`), inference FPS, and live GPU/VRAM telemetry via WebSockets.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Canvas Confetti |
| **Backend** | Python 3.13, FastAPI, Uvicorn, Pydantic v2, SQLite (`aiosqlite`), WebSockets |
| **AI Inference** | Video2X 6.4.0 + Real-ESRGAN (NCNN / Vulkan) + RIFE v4.6 |
| **Media Pipeline** | FFmpeg 9.0.2 with NVENC, FFprobe stream probe & validation |
| **GPU Target** | NVIDIA GeForce RTX 5050 Laptop GPU (8 GB VRAM, Vulkan device index 0) |

---

## 🖥️ System Requirements

- **Operating System**: Windows 11 (64-bit)
- **GPU**: NVIDIA GeForce RTX GPU with Vulkan support (e.g., RTX 5050, 4060, 3060, etc.)
- **VRAM**: 6 GB – 8 GB VRAM recommended
- **System Memory**: 16 GB+ RAM
- **Software Dependencies**:
  - Python 3.10+ (tested on Python 3.13)
  - Node.js 18+ (tested on Node.js v24)
  - FFmpeg & FFprobe with NVENC enabled

---

## ⚡ Quick Start

### 1. Launch with One Click
Double-click `start.bat` in the project root:
```cmd
start.bat
```
This automatically verifies dependencies, starts the FastAPI backend on `http://127.0.0.1:8000`, launches the Next.js frontend on `http://localhost:3000`, and opens your default browser.

### 2. Manual / Scripted Setup (PowerShell)
To set up dependencies manually:
```powershell
# 1. Run automated setup
powershell -ExecutionPolicy Bypass -File "scripts\setup.ps1"

# 2. Audit GPU & Vulkan capabilities
powershell -ExecutionPolicy Bypass -File "scripts\check_gpu.ps1"

# 3. Run automated end-to-end smoke test
powershell -ExecutionPolicy Bypass -File "scripts\smoke_test.ps1"
```

---

## 📖 How to Process Your First Video

1. Open **[http://localhost:3000](http://localhost:3000)** in your browser.
2. Drag and drop a video (MP4, MOV, MKV, or WEBM) into the dropzone.
3. Review the technical metadata extracted by FFprobe (resolution, aspect ratio, frame rate, audio codec).
4. Select your desired enhancement parameters:
   - **Target Output**: `2160p (4K UHD)`
   - **AI Model**: `Realistic Video (Real-ESRGAN+)` or `Anime / Animation`
   - **Quality Preset**: `Balanced` or `Max Quality`
   - **Codec**: `H.264 (NVENC)`
   - **RIFE Interpolation**: Toggle on if you want 2× FPS motion smoothing.
5. Click **Enhance Video on RTX 5050 GPU**.
6. Monitor real-time inference speed, elapsed time, ETA, and live GPU VRAM usage.
7. Once completed, drag the comparison slider to view the before/after results and click **Download 4K Video**.

---

## 🧪 Verified Benchmark & Test Results

Tested on **NVIDIA GeForce RTX 5050 Laptop GPU** (8 GB VRAM, Driver 616.92):

| Test Stage | Input | Target Output | Model | Processing Time | Average FPS | Result |
|---|---|---|---|---|---|---|
| **Real-ESRGAN Image** | 300 × 300 JPG | 1200 × 1200 PNG | `realesrgan-x4plus` | 1.8 s | -- | Verified |
| **Real-ESRGAN Video** | 320 × 180 (24 FPS) | 640 × 360 (24 FPS) | `realesr-animevideov3` | 1.0 s | **22.0 FPS** | Verified |
| **RIFE Interpolation** | 320 × 180 (24 FPS) | 320 × 180 (48 FPS) | `rife-v4.6` | 4.8 s | **8.6 FPS** | Verified |
| **Audio Preservation**| AAC 44.1 kHz Mono | AAC 44.1 kHz Mono | Stream copy | Instant | -- | Synchronized |

---

## 🔒 Security & Safe Operation

- **Filesystem Isolation**: File uploads and output artifacts are strictly restricted to the `storage/` directory; path traversal attacks are rejected.
- **Resource Limits**: Configurable 2 GB upload limit and 5 GB free disk space safeguard.
- **Clean Subprocess Termination**: Windows `taskkill /F /T` process tree management ensures no orphaned background inference processes on cancellation.
- **State Recovery**: If the server restarts unexpectedly, stale jobs in progress are cleanly flagged as interrupted instead of hanging indefinitely.

---

## 📂 Project Architecture

```text
pixelforge-ai/
├── frontend/                     # Next.js App Router & React Components
│   ├── app/                      # Page routes & layout
│   ├── components/               # UI components (Uploader, Settings, Monitor, Comparison, Library)
│   ├── lib/                      # API client & helpers
│   └── types/                    # TypeScript interfaces
├── backend/                      # FastAPI Python Application
│   ├── app/
│   │   ├── api/endpoints.py      # REST & WebSocket API endpoints
│   │   ├── core/config.py        # Settings & dynamic binary discovery
│   │   ├── models/job.py         # SQLite job records
│   │   ├── schemas/job.py        # Pydantic request & response models
│   │   ├── services/             # GPU monitor, VideoProbe, Video2X, FFmpeg, Queue
│   │   └── websocket/            # Real-time WebSocket broadcasting
│   └── tests/test_api.py         # Pytest test suite
├── tools/                        # Pretrained AI inference binaries & models
│   └── video2x/                  # Video2X 6.4.0 executable, Real-ESRGAN & RIFE weights
├── storage/                      # Local isolated persistent storage
│   ├── uploads/                  # Uploaded original videos
│   ├── outputs/                  # Finished 4K enhanced videos
│   └── thumbnails/               # Generated poster frames
├── scripts/                      # Setup, check_gpu, and smoke_test scripts
├── start.bat                     # Windows one-click startup script
└── README.md
```

