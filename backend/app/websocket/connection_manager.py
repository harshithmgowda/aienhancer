import json
import logging
from typing import Dict, List, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps job_id -> set of active WebSockets
        self.active_job_connections: Dict[str, Set[WebSocket]] = {}
        # Global connections listening to system updates
        self.global_connections: Set[WebSocket] = set()

    async def connect_job(self, websocket: WebSocket, job_id: str):
        await websocket.accept()
        if job_id not in self.active_job_connections:
            self.active_job_connections[job_id] = set()
        self.active_job_connections[job_id].add(websocket)

    def disconnect_job(self, websocket: WebSocket, job_id: str):
        if job_id in self.active_job_connections:
            self.active_job_connections[job_id].discard(websocket)
            if not self.active_job_connections[job_id]:
                del self.active_job_connections[job_id]

    async def connect_global(self, websocket: WebSocket):
        await websocket.accept()
        self.global_connections.add(websocket)

    def disconnect_global(self, websocket: WebSocket):
        self.global_connections.discard(websocket)

    async def broadcast_job_update(self, job_id: str, data: dict):
        if job_id in self.active_job_connections:
            dead_connections = set()
            message = json.dumps(data)
            for connection in self.active_job_connections[job_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    dead_connections.add(connection)
            for dead in dead_connections:
                self.active_job_connections[job_id].discard(dead)

    async def broadcast_global(self, data: dict):
        dead_connections = set()
        message = json.dumps(data)
        for connection in self.global_connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead_connections.add(connection)
        for dead in dead_connections:
            self.global_connections.discard(dead)

ws_manager = ConnectionManager()

