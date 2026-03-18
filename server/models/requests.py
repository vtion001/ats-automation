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
    id: Optional[int] = None
    sid: Optional[str] = None
    event: Optional[str] = None
    call_id: Optional[str] = None
    phone_number: Optional[str] = None
    caller_number: Optional[str] = None
    caller_number_bare: Optional[str] = None
    contact_number: Optional[str] = None
    tracking_number: Optional[str] = None
    alternative_number: Optional[str] = None
    from_number: Optional[str] = None
    to_number: Optional[str] = None
    direction: Optional[str] = None
    duration: Optional[int] = None
    recording_url: Optional[str] = None
    transcript: Optional[str] = None
    transcription: Optional[str] = None
    client: str = "flyland"
    name: Optional[str] = None
    cnam: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    source: Optional[str] = None
    tracking_label: Optional[str] = None
    called_at: Optional[str] = None
    status: Optional[str] = None
    dial_status: Optional[str] = None
    agent: Optional[dict] = None
    legs: Optional[list] = None
    timestamp: Optional[str] = None

    class Config:
        extra = "allow"


class AnalysisResponse(BaseModel):
    phone: Optional[str] = None
    tags: List[str] = []
    sentiment: str = "neutral"
    summary: str = ""
    suggested_disposition: str = ""
    suggested_notes: str = ""
    follow_up_required: bool = False
    timestamp: str = ""
