"""
CTM Webhook endpoint
"""

from fastapi import APIRouter
from models.requests import CTMWebhookRequest
from services import webhook_storage
from services.ai_service import ai_service, compute_transcription_qa
from utils.phone_utils import clean_phone
import logging
import requests

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["webhook"])


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
async def ctm_webhook(request: CTMWebhookRequest):
    """Handle incoming webhook from CTM"""
    try:
        logger.info(f"CTM Webhook received: event={request.event}, call_id={request.call_id}")

        # Extract phone
        phone = (
            request.phone_number
            or request.caller_number
            or request.from_number
            or request.to_number
        )
        phone = clean_phone(phone)

        # Get transcript - from payload or fetch from recording URL
        transcript = request.transcript or request.transcription or ""

        if not transcript and request.recording_url:
            logger.info(f"No transcript in payload, fetching from recording URL...")
            transcript = await fetch_ctm_transcript(request.recording_url)

        logger.info(f"CTM Webhook - Phone: {phone}, Transcript length: {len(transcript)}")

        qa_result = compute_transcription_qa(transcript, request.duration)
        logger.info(f"QA Score: {qa_result['overall_qa_score']} ({qa_result['quality_grade']})")

        if transcript and len(transcript) > 10:
            analysis = await ai_service.analyze(transcript, phone, request.client)

            result = {
                "status": "success",
                "event": request.event,
                "call_id": request.call_id,
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
            }

            logger.info(f"CTM Webhook analysis complete: {analysis.get('qualification_score', 0)}")

            if phone:
                webhook_storage.store(phone, result)

            return result
        else:
            logger.info(f"No transcript available. recording_url: {request.recording_url}")
            return {
                "status": "received",
                "event": request.event,
                "call_id": request.call_id,
                "phone": phone,
                "has_recording_url": bool(request.recording_url),
                "message": "Webhook received. Transcript will be analyzed when available.",
            }

    except Exception as e:
        logger.error(f"CTM Webhook error: {e}")
        return {"status": "error", "message": str(e)}
