"""
CTM Webhook endpoint
"""

from fastapi import APIRouter
from models.requests import CTMWebhookRequest
from services import ai_service, webhook_storage
from utils.phone_utils import clean_phone
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["webhook"])


@router.post("/ctm-webhook")
async def ctm_webhook(request: CTMWebhookRequest):
    """Handle incoming webhook from CTM"""
    try:
        logger.info(f"CTM Webhook received: {request.event}")

        # Extract phone
        phone = (
            request.phone_number
            or request.caller_number
            or request.from_number
            or request.to_number
        )
        phone = clean_phone(phone)

        # Get transcript
        transcript = request.transcript or request.transcription or ""

        logger.info(f"CTM Webhook - Phone: {phone}, Transcript length: {len(transcript)}")

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
            }

            logger.info(f"CTM Webhook analysis complete: {analysis.get('qualification_score', 0)}")

            if phone:
                webhook_storage.store(phone, result)

            return result
        else:
            return {
                "status": "received",
                "event": request.event,
                "call_id": request.call_id,
                "phone": phone,
                "message": "Webhook received, no transcript to analyze",
            }

    except Exception as e:
        logger.error(f"CTM Webhook error: {e}")
        return {"status": "error", "message": str(e)}
