"""
CTM API Routes - Direct API endpoints for Chrome Extension

These endpoints provide direct access to CTM API data,
replacing the need for DOM-based call detection.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import logging

from services.ctm import create_ctm_client, CTMApiClient
from services.ai_service import ai_service, compute_transcription_qa
from utils.phone_utils import clean_phone

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ctm", tags=["CTM API"])


class CallResponse(BaseModel):
    call_id: str
    phone: Optional[str]
    caller_name: Optional[str]
    direction: str
    duration: Optional[int]
    status: str
    timestamp: Optional[str]
    recording_url: Optional[str]
    transcript: Optional[str]
    has_recording: bool


class AnalysisResponse(BaseModel):
    call_id: str
    phone: str
    analysis: dict
    qualification_score: float
    sentiment: str
    summary: str
    tags: List[str]
    suggested_disposition: str
    follow_up_required: bool


def _map_ctm_call(ctm_call: dict) -> CallResponse:
    """Map CTM call data to our response format"""
    phone = clean_phone(
        ctm_call.get("caller_number")
        or ctm_call.get("phone_number")
        or ctm_call.get("contact_number")
    )

    return CallResponse(
        call_id=str(ctm_call.get("id", ctm_call.get("sid", ""))),
        phone=phone,
        caller_name=ctm_call.get("name") or ctm_call.get("cnam"),
        direction=ctm_call.get("direction", "inbound"),
        duration=ctm_call.get("duration"),
        status=ctm_call.get("status", "completed"),
        timestamp=ctm_call.get("called_at") or ctm_call.get("timestamp"),
        recording_url=ctm_call.get("recording_url") or ctm_call.get("media_url"),
        transcript=ctm_call.get("transcript") or ctm_call.get("transcription"),
        has_recording=bool(ctm_call.get("recording_url") or ctm_call.get("media_url")),
    )


@router.get("/calls", response_model=List[CallResponse])
async def get_recent_calls(
    limit: int = Query(default=50, ge=1, le=500),
    hours: int = Query(default=24, ge=1, le=168),
    direction: Optional[str] = None,
):
    """Get recent calls from CTM API

    Args:
        limit: Max number of calls to return
        hours: Look back period in hours
        direction: Filter by 'inbound' or 'outbound'
    """
    try:
        client = create_ctm_client()
        start_date = datetime.utcnow() - timedelta(hours=hours)

        calls = client.get_calls(limit=limit, start_date=start_date, direction=direction)

        return [_map_ctm_call(call) for call in calls]
    except Exception as e:
        logger.error(f"Failed to fetch calls: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calls/{call_id}", response_model=CallResponse)
async def get_call(call_id: str):
    """Get details for a specific call"""
    try:
        client = create_ctm_client()
        call = client.get_call_details(call_id)
        return _map_ctm_call(call)
    except Exception as e:
        logger.error(f"Failed to fetch call {call_id}: {e}")
        raise HTTPException(status_code=404, detail="Call not found")


@router.get("/calls/{call_id}/recording")
async def get_call_recording(call_id: str):
    """Get recording audio for a call"""
    try:
        client = create_ctm_client()
        recording = client.get_call_recording(call_id)

        if not recording:
            raise HTTPException(status_code=404, detail="Recording not found")

        return StreamingResponse(
            content=iter([recording]),
            media_type="audio/mpeg",
            headers={"Content-Disposition": f"attachment; filename=recording_{call_id}.mp3"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calls/{call_id}/transcript")
async def get_call_transcript(call_id: str):
    """Get transcript for a call"""
    try:
        client = create_ctm_client()
        transcript = client.get_call_transcript(call_id)

        if not transcript:
            return {"call_id": call_id, "transcript": "", "available": False}

        return {"call_id": call_id, "transcript": transcript, "available": True}
    except Exception as e:
        logger.error(f"Failed to fetch transcript: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calls/{call_id}/analyze", response_model=AnalysisResponse)
async def analyze_call(call_id: str):
    """Analyze a call with AI"""
    try:
        client = create_ctm_client()
        call = client.get_call_details(call_id)

        phone = clean_phone(
            call.get("caller_number") or call.get("phone_number") or call.get("contact_number")
        )

        transcript = call.get("transcript") or call.get("transcription") or ""
        duration = call.get("duration")

        if not transcript:
            raise HTTPException(status_code=400, detail="No transcript available for this call")

        qa_result = compute_transcription_qa(transcript, duration)
        analysis = await ai_service.analyze(transcript, phone, "flyland")

        if analysis.get("core_fields"):
            analysis = {**analysis, **analysis.pop("core_fields")}
        if analysis.get("qualification_fields"):
            analysis = {**analysis, **analysis.pop("qualification_fields")}
        if not analysis.get("full_transcription"):
            analysis["full_transcription"] = transcript

        return AnalysisResponse(
            call_id=call_id,
            phone=phone,
            analysis=analysis,
            qualification_score=analysis.get("qualification_score", 0),
            sentiment=analysis.get("sentiment", "neutral"),
            summary=analysis.get("summary", ""),
            tags=analysis.get("tags", []),
            suggested_disposition=analysis.get("suggested_disposition", "New"),
            follow_up_required=analysis.get("follow_up_required", False),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to analyze call: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calls/by-phone/{phone}", response_model=Optional[CallResponse])
async def get_call_by_phone(phone: str):
    """Find most recent ended call by phone number"""
    try:
        client = create_ctm_client()
        phone_clean = clean_phone(phone)

        start_date = datetime.utcnow() - timedelta(hours=24)
        calls = client.get_calls(limit=50, start_date=start_date, direction="inbound")

        for call in calls:
            call_phone = clean_phone(
                call.get("caller_number") or call.get("phone_number") or call.get("contact_number")
            )
            if call_phone == phone_clean:
                status = call.get("status", "").lower()
                if status in ("completed", "ended", "finished"):
                    return _map_ctm_call(call)

        return None
    except Exception as e:
        logger.error(f"Failed to find call by phone {phone}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/active-calls", response_model=List[CallResponse])
async def get_active_calls():
    """Get currently active calls"""
    try:
        client = create_ctm_client()
        calls = client.get_active_calls()
        return [_map_ctm_call(call) for call in calls]
    except Exception as e:
        logger.error(f"Failed to fetch active calls: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Check CTM API connectivity"""
    try:
        client = create_ctm_client()
        account = client.get_account_info()
        return {
            "status": "ok",
            "account_id": client.account_id,
            "account_name": account.get("name", "Unknown"),
        }
    except Exception as e:
        logger.error(f"CTM health check failed: {e}")
        return {"status": "error", "message": str(e)}


from fastapi.responses import StreamingResponse
