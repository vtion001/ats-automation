"""
Qualification Agent
Scores and qualifies leads based on knowledge base criteria
"""

from typing import Dict, Any

# Use absolute imports
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from config import AgentConfig, Config
except ImportError:

    class AgentConfig:
        QUALIFICATION_MODEL = "openai/gpt-3.5-turbo"
        QUALIFICATION_MAX_TOKENS = 800
        QUALIFICATION_TEMPERATURE = 0.3

    class Config:
        pass


try:
    from .base import BaseAgent
except ImportError:
    from agents.base import BaseAgent


SYSTEM_PROMPT = """You are an expert lead qualification agent.

Score the lead based on the knowledge base criteria and return:
1. score: 0-100 qualification score
2. tags: Array of relevant tags (hot_lead, pricing, scheduling, follow_up, etc.)
3. breakdown: Detailed scoring breakdown
4. recommended_department: Which department to transfer to
5. disqualifiers: List of reasons if lead doesn't qualify

Return ONLY valid JSON:
{
  "score": 0-100,
  "tags": ["relevant", "tags"],
  "breakdown": {
    "sober_days": {"value": days, "meets_criteria": true/false, "points": 0-10},
    "insurance": {"value": "insurance type", "meets_criteria": true/false, "points": 0-10},
    "call_type": {"value": "type", "meets_criteria": true/false, "points": 0-10},
    "keywords": {"found": [], "points": 0-10},
    "total_possible": 100
  },
  "recommended_department": "intake|family|facility|billing",
  "disqualifiers": ["list of disqualifying factors"],
  "explanation": "Why the lead qualified or didn't qualify"
}

Use the provided KB context to determine qualification criteria."""


class QualificationAgent(BaseAgent):
    """Agent for lead qualification and scoring"""

    def __init__(self):
        super().__init__(
            model=AgentConfig.QUALIFICATION_MODEL,
            max_tokens=AgentConfig.QUALIFICATION_MAX_TOKENS,
            temperature=AgentConfig.QUALIFICATION_TEMPERATURE,
            system_prompt=SYSTEM_PROMPT,
        )

    async def run(self, input_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Qualify and score the lead"""

        transcription = input_data.get("transcription", "")
        call_type = input_data.get("intent", {}).get("call_type", "treatment")
        entities = input_data.get("entities", {})
        kb_context = context.get("kb_context", "")

        if not transcription:
            return self.get_fallback_response("No transcription provided")

        # Build user message with context
        user_message = f"""Analyze this call for lead qualification:

Transcription: {transcription}

Call Type: {call_type}

Detected Entities:
- Insurance: {entities.get("insurance", [])}
- State: {[loc for loc in entities.get("locations", []) if loc.get("type") == "state"]}

{kb_context}

Provide qualification score and tags."""

        result, error = await self.call_ai(user_message)

        if error or not result:
            return {
                "score": 0,
                "tags": [],
                "breakdown": {},
                "recommended_department": "intake",
                "disqualifiers": ["AI analysis failed"],
                "explanation": "Could not analyze",
            }

        return {
            "score": result.get("score", 0),
            "tags": result.get("tags", []),
            "breakdown": result.get("breakdown", {}),
            "recommended_department": result.get("recommended_department", "intake"),
            "disqualifiers": result.get("disqualifiers", []),
            "explanation": result.get("explanation", ""),
        }
