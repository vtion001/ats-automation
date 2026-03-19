"""
Transcription endpoints
"""

import base64
from fastapi import APIRouter, UploadFile, File
from models.requests import TranscribeRequest
from services.transcription_service import transcription_service, TranscriptionService
from services import ai_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["transcription"])


@router.post("/transcribe")
async def transcribe_base64(request: TranscribeRequest):
    """Transcribe base64 audio and analyze"""
    if not transcription_service.available:
        return {"error": "Audio transcription not available"}

    try:
        if not request.audio:
            return {"error": "No audio data provided"}

        audio_data = base64.b64decode(request.audio)
        result = transcription_service.transcribe_base64(audio_data, request.format, request.phone)

        if "error" in result:
            return result

        transcription = result.get("transcription", "")
        phone = result.get("phone") or request.phone

        if transcription and len(transcription) > 10:
            analysis = await ai_service.analyze(transcription, phone, request.client)
            result["analysis"] = analysis

        return result

    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return {"error": str(e)}


@router.post("/transcribe/file")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe uploaded audio file (multipart/form-data)"""
    if not transcription_service.available:
        return {"error": "Whisper not installed"}

    try:
        content = await file.read()
        result = transcription_service.transcribe_file(content, file.filename)
        return result
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return {"error": str(e)}


@router.post("/transcribe")
async def transcribe_audio_with_analysis(
    file: UploadFile = File(...), phone: str = "", client: str = "flyland", partial: bool = False
):
    """Transcribe uploaded audio file and return with analysis

    Args:
        file: Audio file (webm, mp3, wav)
        phone: Phone number associated with the call
        client: Client name for knowledge base context
        partial: If True, this is a partial transcription (live mode)
    """
    if not transcription_service.available:
        return {"error": "Whisper not installed", "available": False}

    try:
        content = await file.read()
        result = transcription_service.transcribe_file(content, file.filename)

        if "error" in result:
            return result

        transcription = result.get("transcription", "")
        extracted_phone = result.get("phone") or phone

        # Clean phone number
        if extracted_phone:
            extracted_phone = clean_phone(extracted_phone)

        result["phone"] = extracted_phone
        result["partial"] = partial

        # Run analysis if we have meaningful transcription
        if transcription and len(transcription) > 10:
            analysis = await ai_service.analyze(transcription, extracted_phone, client)
            result["analysis"] = {
                "qualification_score": analysis.get("qualification_score", 0),
                "sentiment": analysis.get("sentiment", "neutral"),
                "summary": analysis.get("summary", ""),
                "tags": analysis.get("tags", []),
                "suggested_disposition": analysis.get("suggested_disposition", "New"),
                "follow_up_required": analysis.get("follow_up_required", False),
                "call_type": analysis.get("call_type"),
                "intent": analysis.get("primary_intent"),
                "full_transcription": analysis.get("full_transcription", transcription),
            }
        else:
            result["analysis"] = None

        return result

    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return {"error": str(e)}


from utils.phone_utils import clean_phone
