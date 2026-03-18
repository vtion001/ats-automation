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
