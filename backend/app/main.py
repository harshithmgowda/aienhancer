import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.endpoints import router as api_router
from app.services.job_manager import JobManager
from app.services.queue_manager import queue_manager
from app.services.gpu_monitor import GPUMonitor
from app.websocket.connection_manager import ws_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("pixelforge")

async def gpu_telemetry_loop():
    """Broadcast real GPU metrics every 1.5 seconds to connected system clients."""
    while True:
        try:
            if ws_manager.global_connections:
                gpu_data = GPUMonitor.get_gpu_status()
                await ws_manager.broadcast_global({
                    "type": "gpu_telemetry",
                    "gpu": gpu_data
                })
        except Exception as e:
            logger.debug(f"Telemetry loop error: {e}")
        await asyncio.sleep(1.5)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing PIXELFORGE AI Backend...")
    # Initialize DB & recover stale jobs
    await JobManager.init_db()
    # Start worker queue
    queue_manager.start()
    # Start GPU telemetry background worker
    telemetry_task = asyncio.create_task(gpu_telemetry_loop())

    yield

    logger.info("Shutting down PIXELFORGE AI Backend...")
    telemetry_task.cancel()
    await queue_manager.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static storage directories
app.mount("/storage/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")
app.mount("/storage/outputs", StaticFiles(directory=str(settings.OUTPUT_DIR)), name="outputs")
app.mount("/storage/thumbnails", StaticFiles(directory=str(settings.THUMBNAIL_DIR)), name="thumbnails")

# Include REST API
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.websocket("/ws/jobs/{job_id}")
async def websocket_job_endpoint(websocket: WebSocket, job_id: str):
    await ws_manager.connect_job(websocket, job_id)
    try:
        # Send current job state immediately
        job = await JobManager.get_job(job_id)
        if job:
            await websocket.send_json({
                "type": "job_initial_state",
                "job": job.to_dict()
            })
        while True:
            data = await websocket.receive_text()
            # client heartbeats or queries
    except WebSocketDisconnect:
        ws_manager.disconnect_job(websocket, job_id)
    except Exception:
        ws_manager.disconnect_job(websocket, job_id)

@app.websocket("/ws/system")
async def websocket_system_endpoint(websocket: WebSocket):
    await ws_manager.connect_global(websocket)
    try:
        # Send initial GPU state immediately
        gpu_data = GPUMonitor.get_gpu_status()
        await websocket.send_json({
            "type": "gpu_telemetry",
            "gpu": gpu_data
        })
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_global(websocket)
    except Exception:
        ws_manager.disconnect_global(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)

