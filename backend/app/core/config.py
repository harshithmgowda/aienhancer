import os
import shutil
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "PIXELFORGE AI"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    
    # Base directories
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent
    STORAGE_DIR: Path = BASE_DIR / "storage"
    UPLOAD_DIR: Path = STORAGE_DIR / "uploads"
    OUTPUT_DIR: Path = STORAGE_DIR / "outputs"
    THUMBNAIL_DIR: Path = STORAGE_DIR / "thumbnails"
    TEMP_DIR: Path = STORAGE_DIR / "temp"
    LOGS_DIR: Path = STORAGE_DIR / "logs"
    TOOLS_DIR: Path = BASE_DIR / "tools"
    
    # Database
    DATABASE_PATH: Path = STORAGE_DIR / "pixelforge.db"
    
    # Binary paths (configurable or auto-detected)
    FFMPEG_PATH: Optional[str] = None
    FFPROBE_PATH: Optional[str] = None
    VIDEO2X_PATH: Optional[str] = None
    
    # Limits
    MAX_UPLOAD_SIZE_BYTES: int = 2 * 1024 * 1024 * 1024  # 2 GB
    MIN_DISK_FREE_BYTES: int = 5 * 1024 * 1024 * 1024     # 5 GB
    GPU_TARGET_INDEX: int = 0  # Discrete NVIDIA GPU
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    def resolve_binaries(self):
        """Auto-detect ffmpeg, ffprobe, and video2x if not explicitly provided."""
        # Detect FFmpeg
        if not self.FFMPEG_PATH:
            found = shutil.which("ffmpeg")
            if not found:
                # Check common WinGet location
                winget_pkg = Path(os.path.expanduser("~")) / "AppData/Local/Microsoft/WinGet/Packages"
                matches = list(winget_pkg.glob("**/ffmpeg.exe"))
                if matches:
                    found = str(matches[0])
            if found:
                self.FFMPEG_PATH = str(Path(found).resolve())

        # Detect FFprobe
        if not self.FFPROBE_PATH:
            found = shutil.which("ffprobe")
            if not found:
                winget_pkg = Path(os.path.expanduser("~")) / "AppData/Local/Microsoft/WinGet/Packages"
                matches = list(winget_pkg.glob("**/ffprobe.exe"))
                if matches:
                    found = str(matches[0])
            if found:
                self.FFPROBE_PATH = str(Path(found).resolve())

        # Detect Video2X
        if not self.VIDEO2X_PATH:
            found = shutil.which("video2x")
            if not found:
                # Check tools directory
                matches = list(self.TOOLS_DIR.glob("**/video2x.exe"))
                if matches:
                    found = str(matches[0])
            if found:
                self.VIDEO2X_PATH = str(Path(found).resolve())

settings = Settings()
# Ensure all storage directories exist
for d in [settings.STORAGE_DIR, settings.UPLOAD_DIR, settings.OUTPUT_DIR, settings.THUMBNAIL_DIR, settings.TEMP_DIR, settings.LOGS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

settings.resolve_binaries()

