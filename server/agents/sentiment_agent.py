"""
Sentiment Agent
Analyzes sentiment and emotional tone of the call
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
        SENTIMENT_MODEL = "anthropic/claude-3-haiku"
        SENTIMENT_MAX_TOKENS = 300
        SENTIMENT_TEMPERATURE = 0.2


try:
    from .base import BaseAgent
except ImportError:
    from agents.base import BaseAgent


SYSTEM_PROMPT = """You are an expert sentiment analyzer for sales calls.

Analyze the emotional tone and sentiment:
1. sentiment: positive, neutral, or negative
2. urgency: high, medium, or low
3. emotional_indicators: List of emotional cues detected
4. confidence_level: How confident you are in the analysis (0.0-1.0)

Return ONLY valid JSON:
{
  "sentiment": "positive|neutral|negative",
  "urgency": "high|medium|low",
  "emotional_indicators": ["list of emotional cues"],
  "confidence_level": 0.0-1.0,
  "key_moments": [{"text": "quote", "emotion": "emotion felt"}]
}

Consider:
- Is the caller excited, frustrated, worried, or calm?
- Are there urgent issues or time-sensitive matters?
- What's the overall emotional trajectory of the call?"""


class SentimentAgent(BaseAgent):
    """Agent for analyzing sentiment and emotion"""

    def __init__(self):
        super().__init__(
            model=AgentConfig.SENTIMENT_MODEL,
            max_tokens=AgentConfig.SENTIMENT_MAX_TOKENS,
            temperature=AgentConfig.SENTIMENT_TEMPERATURE,
            system_prompt=SYSTEM_PROMPT,
        )

    async def run(self, input_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze sentiment from transcription"""

        transcription = input_data.get("transcription", "")

        if not transcription:
            return self.get_fallback_response("No transcription provided")

        user_message = f"Analyze the sentiment of this call:\n\n{transcription}"

        result, error = await self.call_ai(user_message)

        if error or not result:
            return {
                "sentiment": "neutral",
                "urgency": "low",
                "emotional_indicators": [],
                "confidence_level": 0.0,
                "key_moments": [],
            }

        return {
            "sentiment": result.get("sentiment", "neutral"),
            "urgency": result.get("urgency", "low"),
            "emotional_indicators": result.get("emotional_indicators", []),
            "confidence_level": result.get("confidence_level", 0.5),
            "key_moments": result.get("key_moments", []),
        }
