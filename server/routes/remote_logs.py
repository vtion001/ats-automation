"""
Remote log aggregation endpoint - receives and serves logs from CTM monitors
"""

from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional, Any
from services import remote_log_storage

router = APIRouter(prefix="/api", tags=["remote_logs"])


class LogEntry(BaseModel):
    source: Optional[str] = "ctm"
    script: Optional[str] = None
    level: Optional[str] = "log"
    message: Optional[str] = ""
    timestamp: Optional[str] = None
    url: Optional[str] = None
    client: Optional[str] = None
    data: Optional[Any] = None

    class Config:
        extra = "allow"


from typing import Any


@router.get("/logs")
async def get_logs(
    source: str = None,
    level: str = None,
    client: str = None,
):
    """Get all remote logs with optional filtering"""
    logs = remote_log_storage.get_logs(source=source, level=level, client=client)
    return logs


@router.post("/logs/{client}")
async def add_log(client: str, request: Request):
    """Receive a log entry from a CTM monitor"""
    try:
        log_entry = await request.json()
        entry = remote_log_storage.store_log(client, log_entry)
        return {"status": "ok", "stored": True}
    except Exception as e:
        return {"status": "error", "message": str(e)}, 400


@router.post("/logs/clear")
async def clear_logs():
    """Clear all remote logs"""
    count = remote_log_storage.clear_logs()
    return {"status": "ok", "cleared": count}
