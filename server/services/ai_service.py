"""
AI Service - OpenRouter API calls with retry logic
"""

import re
import requests
import logging
from typing import Optional
from config.settings import OPENROUTER_API_KEY, OPENROUTER_URL, AI_MODEL, AI_MODEL_FALLBACK
from services.knowledge_base_service import get_kb_context
from services.cache_service import cache_service
from utils.json_parser import extract_json_from_response

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_TEMPLATE = """You are an expert sales call analyzer for {client_upper}.

Analyze the transcription and return a JSON object with these fields:

**Core Fields:**
- tags: Array of relevant tags from the knowledge base
- sentiment: "positive", "neutral", or "negative"
- summary: Brief 1-2 sentence summary of the call
- suggested_disposition: Appropriate disposition (New, Qualified, Unqualified, Callback Scheduled, etc.)
- suggested_notes: Key points and action items
- follow_up_required: true or false
- qualification_score: 0-100 score based on KB criteria
- recommended_department: Which department to transfer to
- call_type: One of: treatment, meeting, family, facility, competitor, talkline

**Qualification Fields (extract if mentioned):**
- detected_state: US state if mentioned
- detected_insurance: Insurance type if mentioned
- detected_sober_days: Days sober if mentioned
- caller_name: ONLY full name if completely provided

**IMPORTANT - Full Transcription:**
- full_transcription: Return the ENTIRE transcription text exactly as provided.

**IMPORTANT - Key Details for Notes:**
- mentioned_names: Array of ANY names mentioned
- mentioned_locations: Array of ANY locations/addresses mentioned
- mentioned_phones: Array of ANY phone numbers found
- other_customer_info: Any other relevant customer information

**Salesforce Notes:**
- salesforce_notes: Create a PLAIN TEXT STRING ready for Salesforce.

**Lead Scoring Breakdown:**
- scoring_breakdown: Object with sober_days, insurance, call_type scoring details

{kb_context}

Respond ONLY with valid JSON."""

ACTION_PROMPT_TEMPLATE = """You are a Salesforce automation expert. Based on the call analysis, determine the best action.

Return JSON with:
- action: "log_call" or "new_task"
- reason: Brief explanation
- task_subject: Suggested task subject
- task_due_date: YYYY-MM-DD format
- call_subject: Suggested call subject
- call_notes: Complete Salesforce notes
- transfer_department: Which department to transfer
- is_qualified: true/false
- referral_provided: Any referral resources if not qualified

Decision rules:
- Qualified (score >= 70 OR qualified_sober + private_insurance) → new_task
- Wants to schedule/needs follow-up → new_task
- Complaint/unqualified/informational → log_call
- Crisis indicators → log_call with crisis notes

{kb_context}

Respond ONLY with valid JSON."""


def compute_transcription_qa(transcript: str, duration: int = None) -> dict:
    """Compute QA/quality scores for a transcription.

    Returns a dict with:
    - overall_qa_score: 0-100 weighted quality score
    - word_count: total words
    - speech_rate_wpm: words per minute (if duration known)
    - silence_ratio: ratio of pauses/fillers indicating poor audio
    - completeness_score: 0-100 based on expected call elements
    - clarity_issues: list of detected clarity problems
    """
    if not transcript or len(transcript.strip()) < 5:
        return {
            "overall_qa_score": 0,
            "word_count": 0,
            "speech_rate_wpm": 0,
            "silence_ratio": 1.0,
            "completeness_score": 0,
            "clarity_issues": ["No transcript available"],
            "quality_grade": "F",
        }

    words = transcript.split()
    word_count = len(words)

    silence_patterns = [r"\b(um|uh|ah|er)\b", r"\.{2,}", r"\b\?\?\?\b", r"\[\s*\]", r"\(\s*\)"]
    silence_count = sum(len(re.findall(p, transcript.lower())) for p in silence_patterns)
    silence_ratio = silence_count / max(word_count, 1)

    speech_rate_wpm = 0
    if duration and duration > 0:
        speech_rate_wpm = round(word_count / (duration / 60))

    completeness_score = 0
    has_question = "?" in transcript
    has_answer = len(words) > 20
    has_name = bool(re.search(r"\b[A-Z][a-z]+ [A-Z][a-z]+\b", transcript))
    has_phone = bool(re.search(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b", transcript))

    completeness_score += 30 if word_count >= 50 else (word_count / 50 * 30)
    completeness_score += 15 if has_question else 0
    completeness_score += 15 if has_answer else 0
    completeness_score += 20 if has_name else 0
    completeness_score += 20 if has_phone else 0
    completeness_score = min(100, completeness_score)

    clarity_issues = []
    if silence_ratio > 0.15:
        clarity_issues.append(f"High silence/filler ratio ({silence_ratio:.0%})")
    if speech_rate_wpm > 180:
        clarity_issues.append("Very fast speech detected")
    if speech_rate_wpm > 0 and speech_rate_wpm < 60:
        clarity_issues.append("Very slow or fragmented speech")
    if word_count < 20:
        clarity_issues.append("Very short transcription")
    if re.search(r"\[\s*inaudible\s*\]", transcript, re.I):
        clarity_issues.append("Inaudible segments detected")
    if re.search(r"\[\s*unintelligible\s*\]", transcript, re.I):
        clarity_issues.append("Unintelligible segments detected")
    if transcript.count("...") > 3:
        clarity_issues.append("Multiple truncated segments")

    qa_score = 100
    qa_score -= min(30, silence_ratio * 100)
    qa_score -= 20 if completeness_score < 40 else (0 if completeness_score > 70 else 10)
    qa_score -= len(clarity_issues) * 5
    qa_score = max(0, min(100, qa_score))

    if qa_score >= 85:
        grade = "A"
    elif qa_score >= 70:
        grade = "B"
    elif qa_score >= 55:
        grade = "C"
    elif qa_score >= 40:
        grade = "D"
    else:
        grade = "F"

    return {
        "overall_qa_score": qa_score,
        "word_count": word_count,
        "speech_rate_wpm": speech_rate_wpm,
        "silence_ratio": round(silence_ratio, 3),
        "completeness_score": round(completeness_score, 1),
        "clarity_issues": clarity_issues,
        "quality_grade": grade,
    }


class AIService:
    def __init__(self):
        self.api_key = OPENROUTER_API_KEY
        self.url = OPENROUTER_URL
        self.model = AI_MODEL
        self.fallback_model = AI_MODEL_FALLBACK

    def _call_openrouter(
        self, system_prompt: str, user_message: str, model: str = None
    ) -> dict | None:
        """Make a single call to OpenRouter"""
        model = model or self.model

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ats-automation.local",
            "X-Title": "ATS Automation",
        }

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "max_tokens": 800,
            "temperature": 0.3,
        }

        response = requests.post(self.url, headers=headers, json=payload, timeout=30)

        if response.status_code == 200:
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            return extract_json_from_response(content)

        logger.error(f"OpenRouter API error: {response.status_code}")
        return None

    def call_with_retry(self, system_prompt: str, user_message: str, max_retries: int = 3) -> tuple:
        """Call OpenRouter with retry logic"""
        models = [self.model, self.fallback_model]

        for attempt in range(max_retries):
            for model in models:
                try:
                    result = self._call_openrouter(system_prompt, user_message, model)
                    if result:
                        return result, None
                    logger.warning(f"Model {model} returned non-JSON, trying next...")
                except Exception as e:
                    logger.warning(f"Attempt failed with {model}: {e}")
                    continue

            logger.info(f"Retry {attempt + 1}/{max_retries}...")

        return None, "Failed to get valid JSON response"

    async def analyze(
        self, transcription: str, phone: Optional[str] = None, client: str = "flyland"
    ) -> dict:
        """Analyze transcription with AI"""
        # Check cache first
        if phone:
            cached = cache_service.get(phone)
            if cached:
                return cached

        # Get KB context
        kb_context = get_kb_context(client)

        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            client_upper=client.upper(), kb_context=kb_context
        )
        user_message = f"Analyze this call transcription{' for phone number ' + phone if phone else ''}:\n\n{transcription}"

        analysis, error = self.call_with_retry(system_prompt, user_message)

        if error:
            logger.error(f"AI analysis failed: {error}")
            return {"error": error}

        if analysis:
            if phone:
                cache_service.set(phone, analysis)
            return analysis

        return {"error": "Failed to get valid analysis"}

    async def determine_action(
        self,
        transcription: str,
        analysis: dict,
        phone: Optional[str] = None,
        client: str = "flyland",
    ) -> dict:
        """Determine Salesforce action"""
        kb_context = get_kb_context(client)

        tags = analysis.get("tags", [])
        sentiment = analysis.get("sentiment", "neutral")
        follow_up = analysis.get("follow_up_required", False)
        summary = analysis.get("summary", "")
        qualification_score = analysis.get("qualification_score", 0)
        detected_state = analysis.get("detected_state", "")
        detected_insurance = analysis.get("detected_insurance", "")
        recommended_dept = analysis.get("recommended_department", "")
        call_type = analysis.get("call_type", "treatment")

        system_prompt = ACTION_PROMPT_TEMPLATE.format(kb_context=kb_context)
        user_message = f"""Analyze this call and determine the best Salesforce action:

Call Analysis:
- Tags: {", ".join(tags)}
- Sentiment: {sentiment}
- Follow-up required: {follow_up}
- Summary: {summary}
- Qualification Score: {qualification_score}
- Detected State: {detected_state}
- Detected Insurance: {detected_insurance}
- Recommended Dept: {recommended_dept}
- Call Type: {call_type}
- Phone: {phone or "Unknown"}

Transcription (first 800 chars): {transcription[:800]}"""

        result, error = self.call_with_retry(system_prompt, user_message)

        if error:
            return self._fallback_action(analysis)

        return result

    def _fallback_action(self, analysis: dict) -> dict:
        """Fallback action when AI fails"""
        from datetime import datetime, timedelta

        tags = [t.lower() for t in analysis.get("tags", [])]
        summary = analysis.get("summary", "")
        detected_state = analysis.get("detected_state", "")
        detected_insurance = analysis.get("detected_insurance", "")

        if "follow-up" in tags or "scheduling" in tags:
            action, reason = "new_task", "Follow-up or scheduling required"
        elif "hot-lead" in tags and analysis.get("follow_up_required"):
            action, reason = "new_task", "Hot lead with follow-up needed"
        elif "complaint" in tags or "unqualified" in tags:
            action, reason = "log_call", "Call logged for record"
        else:
            action, reason = "log_call", "General call notes"

        call_notes_parts = []
        if summary:
            call_notes_parts.append(f"Summary: {summary}")
        if detected_state:
            call_notes_parts.append(f"State: {detected_state}")
        if detected_insurance:
            call_notes_parts.append(f"Insurance: {detected_insurance}")

        call_notes = (
            " | ".join(call_notes_parts) + " | [AI analysis failed]"
            if call_notes_parts
            else "AI analysis unavailable"
        )

        today = datetime.now()
        days = 1 if "hot-lead" in tags else (3 if "scheduling" in tags else 7)
        due_date = (today + timedelta(days=days)).strftime("%Y-%m-%d")

        task_subjects = {
            "scheduling": f"Follow up: {summary or 'Inquiry call'}",
            "hot-lead": f"Hot Lead Follow-up: {summary or 'Interested caller'}",
            "follow-up": f"Call Back: {summary or 'Follow-up required'}",
        }

        task_subject = next(
            (v for k, v in task_subjects.items() if k in tags),
            f"Call Note: {summary or 'General call'}",
        )

        return {
            "action": action,
            "reason": reason,
            "task_subject": task_subject,
            "task_due_date": due_date,
            "call_subject": f"Inbound Call - {analysis.get('suggested_disposition', 'New')}",
            "call_notes": call_notes,
        }


ai_service = AIService()
