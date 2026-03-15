"""
ATS AI Server - Transcription Analysis
Processes call transcriptions and provides AI-powered insights using OpenRouter
With Flyland-specific knowledge base integration
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import uvicorn
from loguru import logger
import re
import json
import os
import tempfile
from datetime import datetime, timedelta
import requests
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ATS AI Server")

# Add CORS middleware for Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("ATS_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Knowledge base storage
KNOWLEDGE_BASES = {}
KB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "clients")


def load_knowledge_bases():
    """Load knowledge bases for all clients"""
    global KNOWLEDGE_BASES

    # Try to load Flyland KB
    flyland_kb_path = os.path.join(KB_DIR, "flyland", "knowledge-base", "flyland-kb.json")
    if os.path.exists(flyland_kb_path):
        try:
            with open(flyland_kb_path, "r") as f:
                KNOWLEDGE_BASES["flyland"] = json.load(f)
                logger.info(f"Loaded Flyland knowledge base from {flyland_kb_path}")
        except Exception as e:
            logger.warning(f"Could not load Flyland KB: {e}")

    # Try to load other client KBs
    for client in ["legacy", "tbt", "banyan", "takami", "element"]:
        kb_path = os.path.join(KB_DIR, client, "knowledge-base", "qualification.json")
        if os.path.exists(kb_path):
            try:
                with open(kb_path, "r") as f:
                    KNOWLEDGE_BASES[client] = json.load(f)
                    logger.info(f"Loaded {client} knowledge base")
            except Exception as e:
                logger.warning(f"Could not load {client} KB: {e}")


# Load KBs on startup
load_knowledge_bases()


class TranscriptionRequest(BaseModel):
    transcription: str
    phone: Optional[str] = None
    client: Optional[str] = "flyland"


class DetermineActionRequest(BaseModel):
    transcription: str
    analysis: dict
    phone: Optional[str] = None
    client: Optional[str] = "flyland"


class AnalysisResponse(BaseModel):
    phone: Optional[str] = None
    tags: List[str] = []
    sentiment: str = "neutral"
    summary: str = ""
    suggested_disposition: str = ""
    suggested_notes: str = ""
    follow_up_required: bool = False
    timestamp: str = ""


@app.get("/")
async def root():
    return {
        "status": " ATS AI Server running",
        "version": "1.2.0",
        "clients": list(KNOWLEDGE_BASES.keys()),
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "ai_enabled": bool(API_KEY),
        "provider": "openrouter",
        "kb_loaded": list(KNOWLEDGE_BASES.keys()),
    }


# Transcription endpoint - try faster-whisper, fallback to error
try:
    from faster_whisper import WhisperModel

    WHISPER_MODEL = None

    def load_whisper():
        global WHISPER_MODEL
        if WHISPER_MODEL is None:
            logger.info("Loading faster-whisper base model...")
            WHISPER_MODEL = WhisperModel("base", device="cpu", compute_type="int8")
            logger.info("Whisper model loaded")

    WHISPER_AVAILABLE = True
except ImportError as e:
    WHISPER_AVAILABLE = False
    logger.warning(f"faster-whisper not available: {e}")


@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio file using faster-whisper"""
    if not WHISPER_AVAILABLE:
        return {"error": "Whisper not installed. Install with: pip install faster-whisper"}

    try:
        load_whisper()

        # Save uploaded file to temp
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        logger.info(f"Transcribing audio: {file.filename}")

        # Transcribe using faster-whisper
        segments, info = WHISPER_MODEL.transcribe(tmp_path)
        transcription = " ".join([segment.text for segment in segments]).strip()

        logger.info(
            f"Detected language: {info.language} with probability {info.language_probability:.2f}"
        )

        # Extract phone number from transcription
        phone_pattern = r"\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}"
        phones = re.findall(phone_pattern, transcription)
        phone = phones[0] if phones else None

        # Clean phone
        if phone:
            phone = re.sub(r"[^\d+]", "", phone)
            if not phone.startswith("+"):
                phone = "+1" + phone

        # Remove temp file
        os.unlink(tmp_path)

        logger.info(f"Transcription complete: {len(transcription)} chars, phone: {phone}")

        return {"transcription": transcription, "phone": phone, "duration": info.duration or 0}

    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return {"error": str(e)}


@app.get("/api/kb/{client}")
async def get_knowledge_base(client: str):
    """Get knowledge base for a specific client"""
    if client in KNOWLEDGE_BASES:
        return {"client": client, "kb_available": True}
    return {"client": client, "kb_available": False}


async def get_kb_context(client: str) -> str:
    """Get knowledge base context for the AI prompt"""
    if client not in KNOWLEDGE_BASES:
        return ""

    kb = KNOWLEDGE_BASES[client]
    context = f"\n\n=== {kb.get('name', client.upper())} KNOWLEDGE BASE ===\n"

    if client == "flyland":
        # Add Flyland-specific context
        context += "QUALIFICATION CRITERIA:\n"
        for criteria, data in kb.get("qualification_criteria", {}).items():
            context += f"- {criteria}: keywords={data.get('keywords', [])}, weight={data.get('score_weight', 0)}\n"

        context += "\nSTATES WITH EXTENDED SOBER WINDOW (60 days):\n"
        context += f"  {kb.get('states', {}).get('states_with_extension', [])}\n"

        context += "\nDEPARTMENTS:\n"
        for dept, data in kb.get("departments", {}).items():
            context += f"- {dept}: {data.get('name', '')} -> {data.get('salesforce_action', '')}\n"

        context += "\nINSURANCE INFO:\n"
        kb_ins = kb.get("knowledge_topics", {}).get("insurance_info", {})
        context += f"  Accepted: {kb_ins.get('accepted', [])}\n"
        context += f"  Not Accepted: {kb_ins.get('not_accepted', [])}\n"

        context += "\nSCRIPTS:\n"
        for script_name, script_text in kb.get("scripts", {}).items():
            context += f"  {script_name}: {script_text}\n"

    context += "\n=== END KNOWLEDGE BASE ===\n"
    return context


async def analyze_with_openai(
    transcription: str, phone: Optional[str] = None, client: str = "flyland"
) -> dict:
    """Analyze transcription using OpenRouter AI with client knowledge base"""

    # Get KB context for this client
    kb_context = await get_kb_context(client)

    system_prompt = f"""You are an expert sales call analyzer for {client.upper() if client else "BPO"} clients. 

Analyze the transcription and return a JSON object with these fields:
- tags: Array of relevant tags from the knowledge base
- sentiment: "positive", "neutral", or "negative"
- summary: Brief 1-2 sentence summary of the call
- suggested_disposition: Appropriate disposition (New, Qualified, Unqualified, Callback Scheduled, etc.)
- suggested_notes: Key points and action items
- follow_up_required: true or false
- qualification_score: 0-100 score based on KB criteria
- detected_state: US state if mentioned (confidence 0.0-1.0)
- detected_insurance: Type of insurance if mentioned (confidence 0.0-1.0)
- detected_sober_days: Days sober if mentioned (confidence 0.0-1.0)
- caller_name: Caller name if mentioned (confidence 0.0-1.0)
- recommended_department: Which department to transfer to
- call_type: One of: treatment, meeting, family, facility, competitor, talkline

Return confidence scores for each extracted field (0.0 = not confident, 1.0 = very confident).
If a field is not mentioned in the transcription, set it to null with confidence 0.

IMPORTANT: Use the knowledge base provided to determine:
1. Qualification based on sober time and insurance
2. Proper department transfer
3. Salesforce notes format
4. Disqualification reasons

{kb_context}

Respond ONLY with valid JSON."""

    user_message = f"Analyze this call transcription{' for phone number ' + phone if phone else ''}:\n\n{transcription}"

    try:
        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ats-automation.local",
            "X-Title": "ATS Automation",
        }

        payload = {
            "model": "anthropic/claude-3-haiku",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "max_tokens": 1000,
            "temperature": 0.3,
        }

        response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=30)

        if response.status_code == 200:
            result = response.json()
            content = result["choices"][0]["message"]["content"]

            # Parse JSON from response
            try:
                # Clean the content to extract valid JSON
                content = content.strip()
                # Handle potential markdown code blocks
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                analysis = json.loads(content.strip())
                return analysis
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse AI response as JSON: {e}")
                return {"error": "Failed to parse AI response", "raw": content}
        else:
            logger.error(f"OpenRouter API error: {response.status_code} - {response.text}")
            return {"error": f"API error: {response.status_code}"}

    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        return {"error": str(e)}


async def determine_action_with_openai(
    transcription: str, analysis: dict, phone: Optional[str] = None, client: str = "flyland"
) -> dict:
    """Determine Salesforce action (Log a Call vs New Task) using OpenRouter AI with KB"""

    tags = analysis.get("tags", [])
    sentiment = analysis.get("sentiment", "neutral")
    follow_up = analysis.get("follow_up_required", False)
    summary = analysis.get("summary", "")
    qualification_score = analysis.get("qualification_score", 0)
    detected_state = analysis.get("detected_state", "")
    detected_insurance = analysis.get("detected_insurance", "")
    recommended_dept = analysis.get("recommended_department", "")
    call_type = analysis.get("call_type", "treatment")

    # Get KB context for this client
    kb_context = await get_kb_context(client)

    # Get notes template if available
    notes_template = ""
    if client == "flyland" and client in KNOWLEDGE_BASES:
        kb = KNOWLEDGE_BASES[client]
        notes_templates = kb.get("salesforce_notes", {}).get("templates", {})

        # Select appropriate template
        if "crisis" in tags:
            notes_template = notes_templates.get("crisis", "")
        elif "family" in [t.lower() for t in tags] or "family_member" in [t.lower() for t in tags]:
            notes_template = notes_templates.get("family_member", "")
        elif qualification_score >= 60:
            notes_template = notes_templates.get("qualified_transfer", "")
        else:
            notes_template = notes_templates.get("not_qualified", "")

    system_prompt = f"""You are a Salesforce automation expert. Based on the call analysis and knowledge base, determine the best Salesforce action.

Return a JSON object with:
- action: "log_call" or "new_task"
- reason: Brief explanation for the decision
- task_subject: Suggested task subject (if new_task)
- task_due_date: Suggested due date in YYYY-MM-DD format (if new_task)
- call_subject: Suggested call subject (if log_call)
- call_notes: Complete Salesforce notes using the template format - include ALL details from the call
- transfer_department: Which department to transfer to (from KB)
- is_qualified: true if caller meets qualification criteria
- referral_provided: Any referral resources provided if not qualified

{kb_context}

Use the Salesforce notes templates from the KB to format the call_notes properly.

Decision rules:
- If caller is qualified (score >= 70 OR has qualified_sober + private_insurance) → new_task for follow-up
- If caller wants to schedule, needs follow-up, or requests callback → new_task
- If caller has complaint, is unqualified, or just informational → log_call
- If hot-lead with follow-up needed → new_task
- If crisis indicators → log_call with crisis notes

Respond ONLY with valid JSON."""

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

    try:
        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ats-automation.local",
            "X-Title": "ATS Automation",
        }

        payload = {
            "model": "anthropic/claude-3-haiku",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "max_tokens": 800,
            "temperature": 0.2,
        }

        response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=30)

        if response.status_code == 200:
            result = response.json()
            content = result["choices"][0]["message"]["content"]

            try:
                content = content.strip()
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                action_data = json.loads(content.strip())
                return action_data
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse action response: {e}")
                return get_fallback_action(analysis)
        else:
            logger.error(f"OpenRouter API error: {response.status_code}")
            return get_fallback_action(analysis)

    except Exception as e:
        logger.error(f"Action determination error: {e}")
        return get_fallback_action(analysis)


def get_fallback_action(analysis: dict) -> dict:
    """Fallback logic when AI fails"""
    tags = [t.lower() for t in analysis.get("tags", [])]
    follow_up = analysis.get("follow_up_required", False)

    if "follow-up" in tags or "scheduling" in tags:
        action = "new_task"
        reason = "Follow-up or scheduling required"
    elif "hot-lead" in tags and follow_up:
        action = "new_task"
        reason = "Hot lead with follow-up needed"
    elif "complaint" in tags or "unqualified" in tags:
        action = "log_call"
        reason = "Call logged for record"
    else:
        action = "log_call"
        reason = "General call notes"

    # Generate task subject
    if "scheduling" in tags or "pricing" in tags:
        task_subject = f"Follow up: {analysis.get('summary', 'Inquiry call')}"
    elif "hot-lead" in tags:
        task_subject = f"Hot Lead Follow-up: {analysis.get('summary', 'Interested caller')}"
    elif "follow-up" in tags:
        task_subject = f"Call Back: {analysis.get('summary', 'Follow-up required')}"
    else:
        task_subject = f"Call Note: {analysis.get('summary', 'General call')}"

    # Generate due date
    today = datetime.now()
    if "hot-lead" in tags:
        days = 1
    elif "scheduling" in tags:
        days = 3
    else:
        days = 7
    due_date = (today + timedelta(days=days)).strftime("%Y-%m-%d")

    return {
        "action": action,
        "reason": reason,
        "task_subject": task_subject,
        "task_due_date": due_date,
        "call_subject": f"Inbound Call - {analysis.get('suggested_disposition', 'New')}",
        "call_notes": analysis.get("suggested_notes", "Call recorded via ATS Automation"),
    }


@app.post("/api/analyze")
async def analyze_transcription(request: TranscriptionRequest):
    """Analyze transcription and return insights using OpenRouter"""
    try:
        if not API_KEY:
            return {"error": "OpenRouter API key not configured", "status": "fallback"}

        client = request.client or "flyland"

        ai_result = await analyze_with_openai(request.transcription, request.phone, client)

        if "error" not in ai_result:
            response_data = {
                "phone": request.phone,
                "client": client,
                "tags": ai_result.get("tags", []),
                "sentiment": ai_result.get("sentiment", "neutral"),
                "summary": ai_result.get("summary", ""),
                "suggested_disposition": ai_result.get("suggested_disposition", "New"),
                "suggested_notes": ai_result.get("suggested_notes", ""),
                "follow_up_required": ai_result.get("follow_up_required", False),
                "timestamp": datetime.now().isoformat(),
                "ai_analyzed": True,
                "provider": "openrouter",
                "kb_client": client if client in KNOWLEDGE_BASES else None,
            }

            # Add Flyland-specific fields
            if client == "flyland":
                response_data["qualification_score"] = ai_result.get("qualification_score", 0)
                response_data["detected_state"] = ai_result.get("detected_state", "")
                response_data["detected_insurance"] = ai_result.get("detected_insurance", "")
                response_data["detected_sober_days"] = ai_result.get("detected_sober_days", 0)
                response_data["recommended_department"] = ai_result.get(
                    "recommended_department", ""
                )
                response_data["call_type"] = ai_result.get("call_type", "treatment")

            return response_data
        else:
            logger.warning(f"AI analysis failed: {ai_result.get('error')}")
            raise HTTPException(status_code=500, detail=ai_result.get("error"))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/determine-action")
async def determine_action(request: DetermineActionRequest):
    """Determine Salesforce action using OpenRouter AI"""
    try:
        if not API_KEY:
            return get_fallback_action(request.analysis)

        result = await determine_action_with_openai(
            request.transcription, request.analysis, request.phone, request.client or "flyland"
        )

        return result

    except Exception as e:
        logger.error(f"Action determination error: {e}")
        return get_fallback_action(request.analysis)


@app.post("/api/analyze-full")
async def analyze_full(request: TranscriptionRequest):
    """Full analysis including action determination (single call to AI)"""
    try:
        if not API_KEY:
            return {"error": "OpenRouter API key not configured"}

        client = request.client or "flyland"

        # First get analysis
        analysis = await analyze_with_openai(request.transcription, request.phone, client)

        if "error" in analysis:
            raise HTTPException(status_code=500, detail=analysis.get("error"))

        # Then get action
        action = await determine_action_with_openai(
            request.transcription, analysis, request.phone, client
        )

        response_data = {
            "phone": request.phone,
            "client": client,
            "tags": analysis.get("tags", []),
            "sentiment": analysis.get("sentiment", "neutral"),
            "summary": analysis.get("summary", ""),
            "suggested_disposition": analysis.get("suggested_disposition", "New"),
            "suggested_notes": analysis.get("suggested_notes", ""),
            "follow_up_required": analysis.get("follow_up_required", False),
            "timestamp": datetime.now().isoformat(),
            "ai_analyzed": True,
            "provider": "openrouter",
            "kb_client": client if client in KNOWLEDGE_BASES else None,
            **action,
        }

        # Add Flyland-specific fields
        if client == "flyland":
            response_data["qualification_score"] = analysis.get("qualification_score", 0)
            response_data["detected_state"] = analysis.get("detected_state", "")
            response_data["detected_insurance"] = analysis.get("detected_insurance", "")
            response_data["detected_sober_days"] = analysis.get("detected_sober_days", 0)
            response_data["recommended_department"] = analysis.get("recommended_department", "")
            response_data["call_type"] = analysis.get("call_type", "treatment")
            response_data["is_qualified"] = action.get("is_qualified", False)
            response_data["transfer_department"] = action.get("transfer_department", "")
            response_data["referral_provided"] = action.get("referral_provided", "")

        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Full analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def generate_notes(text: str, tags: List[str], phone: Optional[str]) -> str:
    """Generate structured notes from transcription"""
    lines = []

    if phone:
        lines.append(f"Caller Phone: {phone}")

    if "hot-lead" in tags:
        lines.append("- Caller expressed interest in services")
    if "pricing" in tags:
        lines.append("- Requested pricing information")
    if "scheduling" in tags:
        lines.append("- Interested in scheduling appointment")
    if "follow-up" in tags:
        lines.append("- Requires follow-up call")
    if "complaint" in tags:
        lines.append("- Has concerns that need attention")

    first_sentence = text.split(".")[0] if text else ""
    if first_sentence:
        lines.append(f"- Initial inquiry: {first_sentence[:100]}")

    return "\n".join(lines) if lines else "Standard call - no special notes"


@app.post("/api/tag-salesforce")
async def tag_salesforce(request: dict):
    """Placeholder for Salesforce tagging"""
    logger.info(f"Would tag Salesforce: {request}")
    return {"status": "success", "message": "Salesforce tagging not configured"}


if __name__ == "__main__":
    logger.info("Starting ATS AI Server on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
