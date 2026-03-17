"""
Pydantic request/response models
"""

from pydantic import BaseModel
from typing import Optional, List


class TranscriptionRequest(BaseModel):
    transcription: str
    phone: Optional[str] = None
    client: Optional[str] = "flyland"


class TranscribeRequest(BaseModel):
    audio: str
    phone: Optional[str] = None
    client: str = "flyland"
    format: str = "webm"


class DetermineActionRequest(BaseModel):
    transcription: str
    analysis: dict
    phone: Optional[str] = None
    client: Optional[str] = "flyland"


class CTMWebhookRequest(BaseModel):
    event: str
    call_id: Optional[str] = None
    phone_number: Optional[str] = None
    caller_number: Optional[str] = None
    from_number: Optional[str] = None
    to_number: Optional[str] = None
    direction: Optional[str] = None
    duration: Optional[int] = None
    recording_url: Optional[str] = None
    transcript: Optional[str] = None
    transcription: Optional[str] = None
    client: str = "flyland"
    timestamp: Optional[str] = None


class AnalysisResponse(BaseModel):
    phone: Optional[str] = None
    tags: List[str] = []
    sentiment: str = "neutral"
    summary: str = ""
    suggested_disposition: str = ""
    suggested_notes: str = ""
    follow_up_required: bool = False
    timestamp: str = ""
