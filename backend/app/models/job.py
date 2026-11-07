import json
from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any

@dataclass
class JobRecord:
    id: str
    original_filename: str
    input_path: str
    output_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    status: str = "QUEUED"  # QUEUED, INITIALIZING, PROCESSING, ENCODING, COMPLETED, FAILED, CANCELLED
    stage: str = "Queued"
    progress: float = 0.0
    current_frame: int = 0
    total_frames: int = 0
    fps: float = 0.0
    eta_seconds: Optional[float] = None
    elapsed_seconds: float = 0.0
    error_message: Optional[str] = None
    input_metadata: Optional[str] = None   # JSON string
    output_metadata: Optional[str] = None  # JSON string
    settings: Optional[str] = None         # JSON string
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        if self.input_metadata:
            try:
                d["input_metadata"] = json.loads(self.input_metadata)
            except Exception:
                pass
        if self.output_metadata:
            try:
                d["output_metadata"] = json.loads(self.output_metadata)
            except Exception:
                pass
        if self.settings:
            try:
                d["settings"] = json.loads(self.settings)
            except Exception:
                pass
        return d

