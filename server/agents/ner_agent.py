"""
NER Agent (Named Entity Recognition)
Extracts entities like names, phone numbers, locations from transcription
"""

import re
from typing import Dict, Any

# Use absolute imports
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from config import AgentConfig
except ImportError:

    class AgentConfig:
        NER_MODEL = "openai/gpt-3.5-turbo"
        NER_MAX_TOKENS = 600
        NER_TEMPERATURE = 0.2


try:
    from .base import BaseAgent
except ImportError:
    from agents.base import BaseAgent


SYSTEM_PROMPT = """You are an expert named entity recognition agent for sales calls.

Extract ALL entities from the transcription:
1. names: Full names, partial names, relationships (e.g., "John", "my brother", "Trent")
2. locations: Addresses, cities, states, ZIP codes
3. phones: Any phone numbers mentioned
4. dates: Any dates mentioned (appointments, callbacks)
5. insurance: Insurance company names or types mentioned

Return ONLY valid JSON:
{
  "names": [{"value": "string", "type": "full_name|partial|relationship", "context": "how mentioned"}],
  "locations": [{"value": "string", "type": "state|city|address|zip", "context": "how mentioned"}],
  "phones": [{"value": "string", "formatted": "+1234567890"}],
  "dates": [{"value": "string", "type": "appointment|callback|other"}],
  "insurance": [{"value": "string", "type": "company|type"}],
  "confidence": 0.0-1.0
}

Extract EVERYTHING mentioned, even partial information."""


class NERAgent(BaseAgent):
    """Agent for extracting named entities from transcription"""

    def __init__(self):
        super().__init__(
            model=AgentConfig.NER_MODEL,
            max_tokens=AgentConfig.NER_MAX_TOKENS,
            temperature=AgentConfig.NER_TEMPERATURE,
            system_prompt=SYSTEM_PROMPT,
        )

    async def run(self, input_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Extract entities from transcription"""

        transcription = input_data.get("transcription", "")

        if not transcription:
            return self.get_fallback_response("No transcription provided")

        # First, extract phone numbers with regex (more reliable)
        phone_pattern = r"\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}"
        raw_phones = re.findall(phone_pattern, transcription)

        phones = []
        for p in raw_phones:
            cleaned = re.sub(r"[^\d+]", "", p)
            if not cleaned.startswith("+"):
                cleaned = "+1" + cleaned
            phones.append({"value": p, "formatted": cleaned})

        # Call AI for other entities
        user_message = f"Extract entities from this transcription:\n\n{transcription}"

        result, error = await self.call_ai(user_message)

        if error or not result:
            return {
                "names": [],
                "locations": [],
                "phones": phones,
                "dates": [],
                "insurance": [],
                "confidence": 0.5,
            }

        # Merge AI results with regex-extracted phones
        return {
            "names": result.get("names", []),
            "locations": result.get("locations", []),
            "phones": phones or result.get("phones", []),
            "dates": result.get("dates", []),
            "insurance": result.get("insurance", []),
            "confidence": result.get("confidence", 0.7),
        }
