import aiosqlite
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Dict, Any

from app.core.config import settings
from app.models.job import JobRecord

logger = logging.getLogger(__name__)

class JobManager:
    @classmethod
    async def _ensure_db(cls):
        """Ensure database table exists."""
        async with aiosqlite.connect(settings.DATABASE_PATH) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY,
                    original_filename TEXT NOT NULL,
                    input_path TEXT NOT NULL,
                    output_path TEXT,
                    thumbnail_path TEXT,
                    status TEXT NOT NULL,
                    stage TEXT NOT NULL,
                    progress REAL DEFAULT 0.0,
                    current_frame INTEGER DEFAULT 0,
                    total_frames INTEGER DEFAULT 0,
                    fps REAL DEFAULT 0.0,
                    eta_seconds REAL,
                    elapsed_seconds REAL DEFAULT 0.0,
                    error_message TEXT,
                    input_metadata TEXT,
                    output_metadata TEXT,
                    settings TEXT,
                    created_at TEXT NOT NULL,
                    started_at TEXT,
                    completed_at TEXT
                )
            """)
            await db.commit()

    @classmethod
    async def init_db(cls):
        """Initialize SQLite database schema."""
        await cls._ensure_db()
        async with aiosqlite.connect(settings.DATABASE_PATH) as db:
            # Recover interrupted jobs
            await db.execute("""
                UPDATE jobs 
                SET status = 'FAILED', 
                    stage = 'Failed',
                    error_message = 'Job was interrupted by backend restart' 
                WHERE status IN ('INITIALIZING', 'PROCESSING', 'ENCODING', 'QUEUED')
            """)
            await db.commit()

    @classmethod
    async def create_job(cls, job: JobRecord) -> JobRecord:
        await cls._ensure_db()
        now_iso = datetime.now(timezone.utc).isoformat()
        job.created_at = now_iso
        async with aiosqlite.connect(settings.DATABASE_PATH) as db:
            await db.execute("""
                INSERT INTO jobs (
                    id, original_filename, input_path, output_path, thumbnail_path,
                    status, stage, progress, current_frame, total_frames,
                    fps, eta_seconds, elapsed_seconds, error_message,
                    input_metadata, output_metadata, settings,
                    created_at, started_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                job.id, job.original_filename, job.input_path, job.output_path, job.thumbnail_path,
                job.status, job.stage, job.progress, job.current_frame, job.total_frames,
                job.fps, job.eta_seconds, job.elapsed_seconds, job.error_message,
                job.input_metadata, job.output_metadata, job.settings,
                job.created_at, job.started_at, job.completed_at
            ))
            await db.commit()
        return job

    @classmethod
    async def get_job(cls, job_id: str) -> Optional[JobRecord]:
        async with aiosqlite.connect(settings.DATABASE_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
            row = await cursor.fetchone()
            if not row:
                return None
            return JobRecord(
                id=row["id"],
                original_filename=row["original_filename"],
                input_path=row["input_path"],
                output_path=row["output_path"],
                thumbnail_path=row["thumbnail_path"],
                status=row["status"],
                stage=row["stage"],
                progress=row["progress"],
                current_frame=row["current_frame"],
                total_frames=row["total_frames"],
                fps=row["fps"],
                eta_seconds=row["eta_seconds"],
                elapsed_seconds=row["elapsed_seconds"],
                error_message=row["error_message"],
                input_metadata=row["input_metadata"],
                output_metadata=row["output_metadata"],
                settings=row["settings"],
                created_at=row["created_at"],
                started_at=row["started_at"],
                completed_at=row["completed_at"]
            )

    @classmethod
    async def list_jobs(cls) -> List[JobRecord]:
        async with aiosqlite.connect(settings.DATABASE_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM jobs ORDER BY created_at DESC")
            rows = await cursor.fetchall()
            return [
                JobRecord(
                    id=row["id"],
                    original_filename=row["original_filename"],
                    input_path=row["input_path"],
                    output_path=row["output_path"],
                    thumbnail_path=row["thumbnail_path"],
                    status=row["status"],
                    stage=row["stage"],
                    progress=row["progress"],
                    current_frame=row["current_frame"],
                    total_frames=row["total_frames"],
                    fps=row["fps"],
                    eta_seconds=row["eta_seconds"],
                    elapsed_seconds=row["elapsed_seconds"],
                    error_message=row["error_message"],
                    input_metadata=row["input_metadata"],
                    output_metadata=row["output_metadata"],
                    settings=row["settings"],
                    created_at=row["created_at"],
                    started_at=row["started_at"],
                    completed_at=row["completed_at"]
                )
                for row in rows
            ]

    @classmethod
    async def update_job(cls, job_id: str, **kwargs):
        set_clauses = []
        values = []
        for key, val in kwargs.items():
            set_clauses.append(f"{key} = ?")
            values.append(val)
        values.append(job_id)

        sql = f"UPDATE jobs SET {', '.join(set_clauses)} WHERE id = ?"
        async with aiosqlite.connect(settings.DATABASE_PATH) as db:
            await db.execute(sql, values)
            await db.commit()

    @classmethod
    async def delete_job(cls, job_id: str) -> bool:
        job = await cls.get_job(job_id)
        if not job:
            return False

        # Delete associated files if within storage dir
        for p_str in [job.input_path, job.output_path, job.thumbnail_path]:
            if p_str:
                p = Path(p_str)
                try:
                    # Security check: must reside inside settings.STORAGE_DIR
                    if settings.STORAGE_DIR.resolve() in p.resolve().parents:
                        if p.exists():
                            p.unlink(missing_ok=True)
                except Exception as e:
                    logger.warning(f"Could not delete file {p}: {e}")

        async with aiosqlite.connect(settings.DATABASE_PATH) as db:
            await db.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
            await db.commit()
        return True

