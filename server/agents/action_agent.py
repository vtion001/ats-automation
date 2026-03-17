"""
Action Agent
Determines Salesforce action (Log a Call vs New Task)
"""

from typing import Dict, Any
from datetime import datetime, timedelta

# Use absolute imports
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from config import AgentConfig
except ImportError:

    class AgentConfig:
        ACTION_MODEL = "anthropic/claude-3-haiku"
        ACTION_MAX_TOKENS = 600
        ACTION_TEMPERATURE = 0.2


try:
    from .base import BaseAgent
except ImportError:
    from agents.base import BaseAgent


SYSTEM_PROMPT = """You are a Salesforce automation expert.

Based on the call analysis, determine the best Salesforce action:

1. action: "log_call" or "new_task"
2. reason: Brief explanation
3. task_subject: If new_task, suggested subject
4. task_due_date: YYYY-MM-DD format
5. call_subject: If log_call, suggested subject
6. call_notes: Complete notes for Salesforce
7. transfer_department: Which department to transfer to
8. is_qualified: true if caller meets qualification criteria

Return ONLY valid JSON:
{
  "action": "log_call|new_task",
  "reason": "explanation",
  "task_subject": "Follow up: ...",
  "task_due_date": "2026-03-20",
  "call_subject": "Inbound Call - ...",
  "call_notes": "Complete notes...",
  "transfer_department": "intake|family|facility",
  "is_qualified": true/false
}

Decision rules:
- Score >= 70 OR qualified_sober + private_insurance → new_task
- Wants to schedule, needs follow-up, or requests callback → new_task
- Complaint, unqualified, or informational → log_call
- Hot-lead with follow-up needed → new_task
- Crisis indicators → log_call"""


class ActionAgent(BaseAgent):
    """Agent for determining Salesforce actions"""

    def __init__(self):
        super().__init__(
            model=AgentConfig.ACTION_MODEL,
            max_tokens=AgentConfig.ACTION_MAX_TOKENS,
            temperature=AgentConfig.ACTION_TEMPERATURE,
            system_prompt=SYSTEM_PROMPT,
        )

    async def run(self, input_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Determine Salesforce action from analysis results"""

        transcription = input_data.get("transcription", "")
        analysis = input_data.get("analysis", {})
        phone = input_data.get("phone")

        if not analysis:
            return self.get_fallback_response("No analysis provided")

        tags = analysis.get("tags", [])
        qualification_score = analysis.get("qualification_score", 0)
        sentiment = analysis.get("sentiment", "neutral")
        summary = analysis.get("summary", "")

        user_message = f"""Determine the best Salesforce action:

Analysis Results:
- Tags: {", ".join(tags)}
- Qualification Score: {qualification_score}
- Sentiment: {sentiment}
- Summary: {summary}
- Phone: {phone or "Unknown"}

Transcription (first 500 chars): {transcription[:500]}

Determine the appropriate action."""

        result, error = await self.call_ai(user_message)

        if error or not result:
            return self._get_fallback_action(analysis)

        return {
            "action": result.get("action", "log_call"),
            "reason": result.get("reason", ""),
            "task_subject": result.get("task_subject", ""),
            "task_due_date": result.get("task_due_date", ""),
            "call_subject": result.get("call_subject", ""),
            "call_notes": result.get("call_notes", ""),
            "transfer_department": result.get("transfer_department", ""),
            "is_qualified": result.get("is_qualified", False),
        }

    def _get_fallback_action(self, analysis: dict) -> dict:
        """Fallback when AI fails"""
        tags = [t.lower() for t in analysis.get("tags", [])]

        if "follow-up" in tags or "scheduling" in tags:
            action = "new_task"
            reason = "Follow-up or scheduling required"
        elif "hot-lead" in tags and analysis.get("follow_up_required"):
            action = "new_task"
            reason = "Hot lead with follow-up needed"
        else:
            action = "log_call"
            reason = "General call notes"

        today = datetime.now()
        due_date = (today + timedelta(days=3)).strftime("%Y-%m-%d")

        return {
            "action": action,
            "reason": reason,
            "task_subject": f"Follow up: {analysis.get('summary', 'Inquiry call')[:50]}",
            "task_due_date": due_date,
            "call_subject": f"Inbound Call - {analysis.get('suggested_disposition', 'New')}",
            "call_notes": analysis.get("salesforce_notes", "AI analysis unavailable"),
            "transfer_department": analysis.get("recommended_department", "intake"),
            "is_qualified": analysis.get("qualification_score", 0) >= 70,
        }
