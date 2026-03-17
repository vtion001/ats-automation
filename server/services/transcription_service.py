"""
Transcription service - audio transcription using faster-whisper
"""

import os
import re
import tempfile
import logging
from typing import Optional

logger = logging.getLogger(__name__)

WHISPER_MODEL = None
WHISPER_AVAILABLE = False

try:
    from faster_whisper import WhisperModel

    WHISPER_AVAILABLE = True
    logger.info("faster-whisper available")
except ImportError as e:
    logger.warning(f"faster-whisper not available: {e}")


def load_whisper():
    """Load Whisper model on demand"""
    global WHISPER_MODEL
    if WHISPER_MODEL is None and WHISPER_AVAILABLE:
        logger.info("Loading faster-whisper base model...")
        WHISPER_MODEL = WhisperModel("base", device="cpu", compute_type="int8")
        logger.info("Whisper model loaded")


class TranscriptionService:
    def __init__(self):
        self.available = WHISPER_AVAILABLE

    def transcribe_file(self, file_content: bytes, filename: str) -> dict:
        """Transcribe uploaded audio file"""
        if not self.available:
            return {"error": "Whisper not installed"}

        load_whisper()

        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name

        try:
            segments, info = WHISPER_MODEL.transcribe(tmp_path)
            transcription = " ".join([s.text for s in segments]).strip()

            phone = self._extract_phone(transcription)

            return {"transcription": transcription, "phone": phone, "duration": info.duration or 0}
        finally:
            os.unlink(tmp_path)

    def transcribe_base64(
        self, audio_data: bytes, audio_format: str = "webm", phone: Optional[str] = None
    ) -> dict:
        """Transcribe base64 encoded audio"""
        if not self.available:
            return {"error": "Audio transcription not available"}

        load_whisper()

        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{audio_format}") as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name

        try:
            segments, info = WHISPER_MODEL.transcribe(tmp_path)
            transcription = " ".join([s.text for s in segments]).strip()

            if not phone:
                phone = self._extract_phone(transcription)

            return {"transcription": transcription, "phone": phone, "duration": info.duration or 0}
        finally:
            os.unlink(tmp_path)

    def _extract_phone(self, text: str) -> Optional[str]:
        """Extract phone number from text"""
        phone_pattern = r"\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}"
        phones = re.findall(phone_pattern, text)
        if phones:
            phone = re.sub(r"[^\d+]", "", phones[0])
            if not phone.startswith("+"):
                phone = "+1" + phone
            return phone
        return None


transcription_service = TranscriptionService()
