"""
CTM Webhook endpoint
"""

from fastapi import APIRouter, Request
from models.requests import CTMWebhookRequest
from services import webhook_storage
from services.ai_service import ai_service, compute_transcription_qa
from utils.phone_utils import clean_phone
import logging
import requests

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["webhook"])


def extract_ctm_event(x_ctm_webhook: str = "") -> str:
    """Extract event from CTM webhook header (e.g., '261995 end' -> 'end')"""
    if x_ctm_webhook:
        parts = x_ctm_webhook.strip().split()
        if len(parts) >= 2:
            return parts[-1]
    return "unknown"


async def fetch_ctm_transcript(recording_url: str) -> str:
    """Fetch transcript from CTM recording URL"""
    try:
        if not recording_url:
            return ""

        logger.info(f"Fetching transcript from: {recording_url}")

        response = requests.get(recording_url, timeout=30)
        if response.status_code == 200:
            data = response.json()
            transcript = (
                data.get("transcript")
                or data.get("transcription")
                or data.get("text")
                or data.get("content", {}).get("transcript")
                or data.get("call", {}).get("transcript")
            )
            if transcript:
                logger.info(f"Got transcript from recording URL, length: {len(transcript)}")
                return transcript

        logger.warning(f"Failed to fetch transcript: {response.status_code}")
        return ""
    except Exception as e:
        logger.error(f"Error fetching transcript: {e}")
        return ""


@router.post("/ctm-webhook")
async def ctm_webhook(request: Request):
    """Handle incoming webhook from CTM"""
    try:
        raw_body = await request.body()
        import json

        try:
            body = json.loads(raw_body)
        except:
            body = {}

        x_ctm_webhook = (
            request.headers.get("X-CTM-Webhook") or request.headers.get("x-ctm-webhook") or ""
        )
        event = extract_ctm_event(x_ctm_webhook)
        if event == "unknown" and body:
            status = body.get("status") or body.get("dial_status") or ""
            if status in ("completed", "finished", "done"):
                event = "end"
            elif status in ("in progress", "ringing", "answered", "in-progress"):
                event = "start"

        call_id = body.get("id") or body.get("sid") or body.get("call_id")

        phone_fields = [
            body.get("caller_number"),
            body.get("caller_number_bare"),
            body.get("contact_number"),
            body.get("phone_number"),
            body.get("alternative_number"),
        ]
        phone = None
        for pf in phone_fields:
            if pf:
                phone = clean_phone(pf)
                if phone:
                    break

        transcript = body.get("transcript") or body.get("transcription") or body.get("notes") or ""

        recording_url = body.get("recording_url") or body.get("media_url") or body.get("recording")
        duration = body.get("duration")
        direction = body.get("direction")
        client = body.get("client") or body.get("tracking_label") or "flyland"
        caller_name = body.get("name") or body.get("cnam")
        city = body.get("city")
        state = body.get("state")
        source = body.get("source")
        tracking_number = body.get("tracking_number")
        called_at = body.get("called_at")
        status = body.get("status") or body.get("dial_status")

        if not transcript and recording_url:
            logger.info(f"No transcript in payload, fetching from recording URL...")
            transcript = await fetch_ctm_transcript(recording_url)

        logger.info(f"CTM Webhook received: event={event}, call_id={call_id}, phone={phone}")

        qa_result = compute_transcription_qa(transcript, duration)
        logger.info(f"QA Score: {qa_result['overall_qa_score']} ({qa_result['quality_grade']})")

        if transcript and len(transcript) > 10:
            analysis = await ai_service.analyze(transcript, phone, client)

            if analysis.get("core_fields"):
                analysis = {**analysis, **analysis.pop("core_fields")}
            if analysis.get("qualification_fields"):
                analysis = {**analysis, **analysis.pop("qualification_fields")}
            if analysis.get("full_transcription"):
                pass
            else:
                analysis["full_transcription"] = transcript

            result = {
                "status": "success",
                "event": event,
                "call_id": str(call_id) if call_id else None,
                "phone": phone,
                "transcript": transcript,
                "analysis": analysis,
                "qualification_score": analysis.get("qualification_score", 0),
                "tags": analysis.get("tags", []),
                "sentiment": analysis.get("sentiment", "neutral"),
                "summary": analysis.get("summary", ""),
                "suggested_disposition": analysis.get("suggested_disposition", "New"),
                "follow_up_required": analysis.get("follow_up_required", False),
                "ai_analyzed": True,
                "qa": qa_result,
                "caller_name": caller_name,
                "city": city,
                "state": state,
                "source": source,
                "tracking_number": tracking_number,
                "called_at": called_at,
                "direction": direction,
                "duration": duration,
                "client": client,
                "status": status,
            }

            logger.info(f"CTM Webhook analysis complete: {analysis.get('qualification_score', 0)}")

            if phone:
                webhook_storage.store(phone, result)

            return result
        else:
            logger.info(f"No transcript available. recording_url: {recording_url}")
            return {
                "status": "received",
                "event": event,
                "call_id": str(call_id) if call_id else None,
                "phone": phone,
                "has_recording_url": bool(recording_url),
                "message": "Webhook received. Transcript will be analyzed when available.",
                "direction": direction,
                "caller_name": caller_name,
                "city": city,
                "state": state,
                "source": source,
                "tracking_number": tracking_number,
                "called_at": called_at,
                "duration": duration,
                "status": status,
            }

    except Exception as e:
        logger.error(f"CTM Webhook error: {e}")
        return {"status": "error", "message": str(e)}
