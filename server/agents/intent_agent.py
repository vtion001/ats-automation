"""
Intent Agent
Determines the primary intent and call type of the transcription
"""

from typing import Dict, Any

# Use absolute imports
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from config import AgentConfig
except ImportError:

    class AgentConfig:
        INTENT_MODEL = "anthropic/claude-3-haiku"
        INTENT_MAX_TOKENS = 400
        INTENT_TEMPERATURE = 0.3


try:
    from .base import BaseAgent
except ImportError:
    from agents.base import BaseAgent


SYSTEM_PROMPT = """You are an expert intent classifier for inbound sales calls.

Analyze the transcription and determine:
1. call_type: One of treatment, meeting, family, facility, competitor, talkline, billing, crisis
2. primary_intent: The main purpose of the call (e.g., "schedule_appointment", "inquire_services", "crisis_support")

Return ONLY valid JSON with these fields:
{
  "call_type": "treatment|meeting|family|facility|competitor|talkline|billing|crisis",
  "primary_intent": "string describing the main intent",
  "confidence": 0.0-1.0,
  "keywords_found": ["list", "of", "relevant", "keywords"]
}

Focus on classifying the TRUE intent, not just keywords."""


class IntentAgent(BaseAgent):
    """Agent for detecting call intent and type"""

    def __init__(self):
        super().__init__(
            model=AgentConfig.INTENT_MODEL,
            max_tokens=AgentConfig.INTENT_MAX_TOKENS,
            temperature=AgentConfig.INTENT_TEMPERATURE,
            system_prompt=SYSTEM_PROMPT,
        )

    async def run(self, input_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Determine call intent from transcription"""

        transcription = input_data.get("transcription", "")

        if not transcription:
            return self.get_fallback_response("No transcription provided")

        user_message = f"Analyze this call transcription:\n\n{transcription}"

        result, error = await self.call_ai(user_message)

        if error or not result:
            return {
                "call_type": "treatment",
                "primary_intent": "unknown",
                "confidence": 0.0,
                "keywords_found": [],
                "error": error,
            }

        return {
            "call_type": result.get("call_type", "treatment"),
            "primary_intent": result.get("primary_intent", "unknown"),
            "confidence": result.get("confidence", 0.5),
            "keywords_found": result.get("keywords_found", []),
        }
