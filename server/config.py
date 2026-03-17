"""
ATS AI Server Configuration
Centralized configuration for all AI agents and services
"""

import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Server configuration"""

    # API Settings
    API_KEY: str = os.getenv("ATS_API_KEY", "")
    OPENROUTER_URL: str = "https://openrouter.ai/api/v1/chat/completions"

    # AI Models - Each agent can use different models
    MODEL_ANALYSIS: str = "openai/gpt-3.5-turbo"
    MODEL_ANALYSIS_FALLBACK: str = "google/gemini-pro"
    MODEL_FAST: str = "anthropic/claude-3-haiku"

    # Knowledge Base
    KB_DIR: str = os.getenv("KB_DIR", "")

    @classmethod
    def get_kb_dir(cls) -> str:
        """Get KB directory - supports both local and Docker"""
        if cls.KB_DIR:
            return cls.KB_DIR

        local_path = Path(__file__).parent.parent / "clients"
        if local_path.exists():
            return str(local_path)

        if Path("/app/clients").exists():
            return "/app/clients"

        return str(local_path)

    # Cache Settings
    CACHE_TTL_SECONDS: int = 300

    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = int(os.getenv("PORT", 8000))


class AgentConfig:
    """Configuration for individual AI agents"""

    # Intent Agent
    INTENT_MODEL = Config.MODEL_FAST
    INTENT_MAX_TOKENS = 400
    INTENT_TEMPERATURE = 0.3

    # NER Agent
    NER_MODEL = Config.MODEL_ANALYSIS
    NER_MAX_TOKENS = 600
    NER_TEMPERATURE = 0.2

    # Sentiment Agent
    SENTIMENT_MODEL = Config.MODEL_FAST
    SENTIMENT_MAX_TOKENS = 300
    SENTIMENT_TEMPERATURE = 0.2

    # Qualification Agent
    QUALIFICATION_MODEL = Config.MODEL_ANALYSIS
    QUALIFICATION_MAX_TOKENS = 800
    QUALIFICATION_TEMPERATURE = 0.3

    # Summary Agent
    SUMMARY_MODEL = Config.MODEL_ANALYSIS
    SUMMARY_MAX_TOKENS = 500
    SUMMARY_TEMPERATURE = 0.4

    # Action Agent
    ACTION_MODEL = Config.MODEL_FAST
    ACTION_MAX_TOKENS = 600
    ACTION_TEMPERATURE = 0.2


# Default request models
from pydantic import BaseModel
from typing import Optional, List


class TranscriptionRequest(BaseModel):
    transcription: str
    phone: Optional[str] = None
    client: str = "flyland"


class DetermineActionRequest(BaseModel):
    transcription: str
    analysis: dict
    phone: Optional[str] = None
    client: str = "flyland"


class TranscribeRequest(BaseModel):
    audio: str
    phone: Optional[str] = None
    client: str = "flyland"
    format: str = "webm"


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
