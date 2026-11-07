import asyncio
import logging
from typing import Dict, Optional
from app.services.enhancement import EnhancementPipeline
from app.services.job_manager import JobManager

logger = logging.getLogger(__name__)

class QueueManager:
    def __init__(self):
        self.queue: asyncio.Queue = asyncio.Queue()
        self.active_pipeline: Optional[EnhancementPipeline] = None
        self.active_job_id: Optional[str] = None
        self._worker_task: Optional[asyncio.Task] = None
        self._running: bool = False

    def start(self):
        if not self._running:
            self._running = True
            self._worker_task = asyncio.create_task(self._worker_loop())
            logger.info("QueueManager worker loop started.")

    async def stop(self):
        self._running = False
        if self.active_pipeline:
            self.active_pipeline.cancel()
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
        logger.info("QueueManager stopped.")

    async def enqueue_job(self, job_id: str):
        """Enqueue job to be processed by background worker."""
        await self.queue.put(job_id)
        logger.info(f"Enqueued job {job_id}. Queue size: {self.queue.qsize()}")

    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a running job or remove it if queued."""
        if self.active_job_id == job_id and self.active_pipeline:
            logger.info(f"Cancelling active job {job_id}")
            self.active_pipeline.cancel()
            return True
        
        # If in queue, mark as cancelled in DB
        job = await JobManager.get_job(job_id)
        if job and job.status == "QUEUED":
            await JobManager.update_job(job_id, status="CANCELLED", stage="Cancelled")
            return True
        return False

    async def _worker_loop(self):
        while self._running:
            try:
                job_id = await self.queue.get()
                job = await JobManager.get_job(job_id)
                if not job or job.status == "CANCELLED":
                    self.queue.task_done()
                    continue

                self.active_job_id = job_id
                self.active_pipeline = EnhancementPipeline(job_id)
                logger.info(f"Starting processing for job {job_id}")

                try:
                    await self.active_pipeline.execute()
                except Exception as e:
                    logger.error(f"Error during job {job_id} execution: {e}")
                finally:
                    self.active_pipeline = None
                    self.active_job_id = None
                    self.queue.task_done()

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Unexpected error in queue worker: {e}", exc_info=True)
                await asyncio.sleep(1)

queue_manager = QueueManager()

