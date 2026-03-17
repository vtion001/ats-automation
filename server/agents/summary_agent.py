"""
Summary Agent
Generates call summaries and Salesforce-ready notes
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
        SUMMARY_MODEL = "openai/gpt-3.5-turbo"
        SUMMARY_MAX_TOKENS = 500
        SUMMARY_TEMPERATURE = 0.4


try:
    from .base import BaseAgent
except ImportError:
    from agents.base import BaseAgent


SYSTEM_PROMPT = """You are an expert call summarizer.

Generate a comprehensive summary of the call:
1. summary: Brief 1-2 sentence summary of the call
2. key_points: Array of important points discussed
3. next_steps: Recommended next actions
4. salesforce_notes: Plain text string ready for Salesforce

Return ONLY valid JSON:
{
  "summary": "Brief 1-2 sentence summary",
  "key_points": ["point 1", "point 2", "point 3"],
  "next_steps": ["action 1", "action 2"],
  "salesforce_notes": "Caller Phone: +1234567890 | State: CA | Insurance: Aetna | Summary: ..."
}

Make the salesforce_notes comprehensive but concise."""


class SummaryAgent(BaseAgent):
    """Agent for generating call summaries"""

    def __init__(self):
        super().__init__(
            model=AgentConfig.SUMMARY_MODEL,
            max_tokens=AgentConfig.SUMMARY_MAX_TOKENS,
            temperature=AgentConfig.SUMMARY_TEMPERATURE,
            system_prompt=SYSTEM_PROMPT,
        )

    async def run(self, input_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate summary from transcription"""

        transcription = input_data.get("transcription", "")
        entities = input_data.get("entities", {})
        sentiment = input_data.get("sentiment", {})

        if not transcription:
            return self.get_fallback_response("No transcription provided")

        # Build context for summary
        context_parts = []

        if entities.get("names"):
            context_parts.append(
                f"Names mentioned: {', '.join([n.get('value', '') for n in entities.get('names', [])])}"
            )

        if entities.get("locations"):
            context_parts.append(
                f"Locations: {', '.join([l.get('value', '') for l in entities.get('locations', [])])}"
            )

        if entities.get("insurance"):
            context_parts.append(
                f"Insurance: {', '.join([i.get('value', '') for i in entities.get('insurance', [])])}"
            )

        entity_context = (
            "\n".join(context_parts) if context_parts else "No specific entities detected"
        )

        user_message = f"""Generate a summary of this call:

Transcription: {transcription}

Entities Detected:
{entity_context}

Sentiment: {sentiment.get("sentiment", "neutral")}

Provide a comprehensive summary."""

        result, error = await self.call_ai(user_message)

        if error or not result:
            return {
                "summary": transcription[:100] + "...",
                "key_points": [],
                "next_steps": [],
                "salesforce_notes": "AI summary unavailable",
            }

        return {
            "summary": result.get("summary", ""),
            "key_points": result.get("key_points", []),
            "next_steps": result.get("next_steps", []),
            "salesforce_notes": result.get("salesforce_notes", ""),
        }
