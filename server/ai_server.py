"""
ATS AI Server - Transcription Analysis
Processes call transcriptions and provides AI-powered insights using OpenRouter
With Flyland-specific knowledge base integration

Version: 1.3.0 - Added retry logic, improved JSON parsing, and reliable model
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

# Add CORS middleware for Chrome extension - more explicit configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)


# Explicit OPTIONS handler for preflight requests
@app.options("/{full_path:path}")
async def handle_options(full_path: str):
    """Handle CORS preflight requests"""
    logger.info(f"OPTIONS request for: {full_path}")
    return {"status": "ok"}


API_KEY = os.getenv("ATS_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Use more reliable model
AI_MODEL = "openai/gpt-3.5-turbo"
AI_MODEL_FALLBACK = "google/gemini-pro"

# Knowledge base storage
KNOWLEDGE_BASES = {}


def get_kb_dir():
    """Get KB directory - supports both local and Docker"""
    if "KB_DIR" in os.environ:
        return os.environ["KB_DIR"]

    local_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "clients")
    if os.path.exists(local_path):
        return local_path

    if os.path.exists("/app/clients"):
        return "/app/clients"

    return local_path


KB_DIR = get_kb_dir()


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

# Response cache - simple in-memory cache for analyzed calls
# Key: phone number, Value: (timestamp, response)
ANALYSIS_CACHE = {}
CACHE_TTL_SECONDS = 300  # 5 minutes cache


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
        "version": "1.3.0",
        "model": AI_MODEL,
        "clients": list(KNOWLEDGE_BASES.keys()),
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "ai_enabled": bool(API_KEY),
        "provider": "openrouter",
        "model": AI_MODEL,
        "kb_loaded": list(KNOWLEDGE_BASES.keys()),
    }


@app.get("/api/test")
async def test_analysis():
    """Test endpoint to verify AI analysis is working"""
    test_transcription = "Hello, I'm calling to inquire about addiction treatment options. I have private insurance and I've been sober for 30 days. I'm from California."
    test_phone = "5551234567"
    test_client = "flyland"
    
    try:
        result = await analyze_with_openai(test_transcription, test_phone, test_client)
        
        if "error" in result:
            return {
                "status": "error",
                "message": result.get("error"),
                "raw": result.get("raw", "N/A")
            }
        
        return {
            "status": "success",
            "message": "AI analysis working correctly",
            "transcription": test_transcription,
            "result": {
                "tags": result.get("tags", []),
                "sentiment": result.get("sentiment"),
                "summary": result.get("summary"),
                "qualification_score": result.get("qualification_score", 0),
                "follow_up_required": result.get("follow_up_required", False)
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
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




# New endpoint for base64 audio transcription + analysis (from Chrome extension)
class TranscribeRequest(BaseModel):
    audio: str  # base64 encoded audio
    phone: Optional[str] = None
    client: str = "flyland"
    format: str = "webm"

@app.post("/api/transcribe")
async def transcribe_audio(request: TranscribeRequest):
    """Transcribe base64 audio and analyze with AI (for CTM call recording)"""
    import base64
    import io
    
    if not WHISPER_AVAILABLE:
        # If whisper not available, use AI to transcribe from description
        logger.warning("Whisper not available, using AI for transcription")
        
        # Return error - need whisper for transcription
        return {"error": "Audio transcription not available. Please install faster-whisper."}
    
    try:
        # Decode base64 audio
        audio_data = base64.b64decode(request.audio)
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{request.format}") as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name
        
        logger.info(f"Transcribing audio: {len(audio_data)} bytes, format: {request.format}")
        
        # Transcribe using faster-whisper
        segments, info = WHISPER_MODEL.transcribe(tmp_path)
        transcription = " ".join([segment.text for segment in segments]).strip()
        
        # Clean up temp file
        os.unlink(tmp_path)
        
        logger.info(f"Transcription complete: {len(transcription)} chars")
        
        # If phone not provided, extract from transcription
        phone = request.phone
        if not phone:
            phone_pattern = r"\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}"
            phones = re.findall(phone_pattern, transcription)
            if phones:
                phone = re.sub(r"[^\d+]", "", phones[0])
                if not phone.startswith('+'):
                    phone = '+1' + phone
        
        # Analyze with AI
        if transcription and len(transcription) > 10:
            analysis = await analyze_with_openai(transcription, phone, request.client)
            
            return {
                "transcription": transcription,
                "phone": phone,
                "analysis": analysis,
                "duration": info.duration or 0
            }
        else:
            return {
                "transcription": transcription,
                "phone": phone,
                "analysis": {"error": "Transcription too short for analysis"},
                "duration": info.duration or 0
            }
            
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
    """Get knowledge base context for the AI prompt - OPTIMIZED for speed"""
    if client not in KNOWLEDGE_BASES:
        return ""

    kb = KNOWLEDGE_BASES[client]
    context = f"\n\n=== {kb.get('name', client.upper())} (Quick Reference) ===\n"

    if client == "flyland":
        # Simplified context - only key qualification info
        context += "QUALIFICATION CRITERIA:\n"
        for criteria, data in kb.get("qualification_criteria", {}).items():
            context += f"- {criteria}: {data.get('keywords', [])}\n"

        # Only essential states
        states_ext = kb.get("states", {}).get("states_with_extension", [])
        if states_ext:
            context += f"\nStates with 60-day sober window: {', '.join(states_ext[:5])}\n"

        # Only top departments
        context += "\nDepartments: "
        depts = list(kb.get("departments", {}).keys())[:3]
        context += ", ".join(depts) + "\n"

        # Only accepted insurance (first 5)
        kb_ins = kb.get("knowledge_topics", {}).get("insurance_info", {})
        accepted = kb_ins.get("accepted", [])[:5]
        if accepted:
            context += f"Accepted insurance: {', '.join(accepted)}\n"

    context += "\n=== END ===\n"
    return context


def extract_json_from_response(content: str) -> Optional[dict]:
    """Extract JSON from AI response with multiple fallback strategies"""
    content = content.strip()
    logger.info(f"Extracting JSON from response: {content[:200]}...")
    
    # Strategy 1: Try direct JSON parse
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass
    
    # Strategy 2: Handle markdown code blocks
    if content.startswith("```"):
        parts = content.split("```")
        for part in parts[1:]:  # Skip first empty part
            part = part.strip()
            # Remove language identifier like "json"
            if part.startswith("json"):
                part = part[4:].strip()
            try:
                return json.loads(part)
            except json.JSONDecodeError:
                continue
    
    # Strategy 3: Find JSON object in content
    json_start = content.find("{")
    json_end = content.rfind("}")
    if json_start >= 0 and json_end > json_start:
        json_str = content[json_start:json_end + 1]
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.warning(f"JSON extraction failed: {e}")
    
    # Strategy 4: Try regex to find key-value patterns (fallback)
    logger.warning("All JSON extraction strategies failed, using fallback")
    return None


async def call_openrouter_with_retry(
    system_prompt: str,
    user_message: str,
    max_retries: int = 3
) -> tuple:
    """Call OpenRouter API with retry logic for JSON parsing failures"""
    
    models = [AI_MODEL, AI_MODEL_FALLBACK]
    
    for attempt in range(max_retries):
        for model in models:
            try:
                headers = {
                    "Authorization": f"Bearer {API_KEY}",
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
                
                response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=30)
                
                if response.status_code == 200:
                    result = response.json()
                    content = result["choices"][0]["message"]["content"]
                    
                    # Try to extract JSON
                    analysis = extract_json_from_response(content)
                    if analysis:
                        return analysis, None
                    
                    logger.warning(f"Model {model} returned non-JSON, trying next...")
                else:
                    logger.error(f"OpenRouter API error: {response.status_code}")
                    
            except Exception as e:
                logger.warning(f"Attempt failed with {model}: {e}")
                continue
        
        logger.info(f"Retry {attempt + 1}/{max_retries}...")
    
    return None, "Failed to get valid JSON response after all retries"


async def analyze_with_openai(
    transcription: str, phone: Optional[str] = None, client: str = "flyland"
) -> dict:
    """Analyze transcription using OpenRouter AI with client knowledge base"""

    # Check cache first - use phone as key if available
    if phone and phone in ANALYSIS_CACHE:
        cached_time, cached_response = ANALYSIS_CACHE[phone]
        if (datetime.now() - cached_time).total_seconds() < CACHE_TTL_SECONDS:
            logger.info(f"Returning cached analysis for {phone}")
            cached_response["from_cache"] = True
            return cached_response

    # Get KB context for this client (simplified for faster processing)
    kb_context = await get_kb_context(client)

    system_prompt = f"""You are an expert sales call analyzer for {client.upper() if client else "BPO"} clients. 

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
- caller_name: ONLY full name if completely provided (e.g., "John Smith"), NOT partial names or relationships

**IMPORTANT - Full Transcription:**
- full_transcription: Return the ENTIRE transcription text exactly as provided. Do not summarize or modify it.

**IMPORTANT - Key Details for Notes:**
Extract ALL mentioned details for Salesforce notes:
- mentioned_names: Array of ANY names mentioned (even partial like "Trent", "Reese's uncle", "my brother")
- mentioned_locations: Array of ANY locations/addresses mentioned (street, city, state)
- mentioned_phones: Array of ANY phone numbers found in the conversation
- other_customer_info: Any other relevant customer information mentioned

**Salesforce Notes:**
- salesforce_notes: Create a PLAIN TEXT STRING (NOT an object/JSON) ready for Salesforce. Include all key details in this format:
  "Caller Phone: [phone] | State: [state] | Insurance: [insurance] | Sober Days: [days] | Summary: [summary] | [Other details...]"

IMPORTANT: Return salesforce_notes as a plain string, NOT as an object or JSON.

**IMPORTANT - Lead Scoring Breakdown:**
You MUST provide a detailed scoring breakdown explaining HOW the qualification_score was calculated:
- scoring_breakdown: Object containing:
  - sober_days: {{"value": <days>, "meets_criteria": true/false, "points_awarded": <points>, "max_points": <max>}}
  - insurance: {{"value": "<insurance>", "meets_criteria": true/false, "points_awarded": <points>, "max_points": <max>}}
  - call_type: {{"value": "<type>", "meets_criteria": true/false, "points_awarded": <points>, "max_points": <max>}}
  - keywords_found: Array of relevant keywords found in the call
  - keywords_points: Points awarded for keywords found
  - total_possible: Total possible points (100)
  - disqualifiers: Array of reasons if lead was disqualified
  - explanation: Plain text explanation of why lead qualified or disqualified

Return confidence scores for each extracted field (0.0 = not confident, 1.0 = very confident).
If a field is not mentioned in the transcription, set it to null or empty array.

IMPORTANT: 
1. Always include the full_transcription field with the complete text
2. Extract ALL names mentioned, even if partial or relationships
3. Extract ALL locations, addresses mentioned
4. Create comprehensive salesforce_notes
5. ALWAYS include the scoring_breakdown with detailed explanation

{kb_context}

Respond ONLY with valid JSON."""

    user_message = f"Analyze this call transcription{' for phone number ' + phone if phone else ''}:\n\n{transcription}"

    # Use retry logic for reliable JSON parsing
    analysis, error = await call_openrouter_with_retry(system_prompt, user_message, max_retries=3)
    
    if error:
        logger.error(f"AI analysis failed: {error}")
        return {"error": error}
    
    if analysis:
        # Cache the result if phone is available
        if phone:
            ANALYSIS_CACHE[phone] = (datetime.now(), analysis)
            logger.info(f"Cached analysis for {phone}")
        
        return analysis
    
    return {"error": "Failed to get valid analysis"}


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
    """Fallback logic when AI fails - use available analysis data or mark as AI unavailable"""
    tags = [t.lower() for t in analysis.get("tags", [])]
    follow_up = analysis.get("follow_up_required", False)
    summary = analysis.get("summary", "")
    detected_state = analysis.get("detected_state", "")
    detected_insurance = analysis.get("detected_insurance", "")

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

    # Build dynamic call notes from available analysis data
    call_notes_parts = []
    if summary:
        call_notes_parts.append(f"Summary: {summary}")
    if detected_state:
        call_notes_parts.append(f"State: {detected_state}")
    if detected_insurance:
        call_notes_parts.append(f"Insurance: {detected_insurance}")
    
    # If no analysis data available, mark as AI unavailable
    if not call_notes_parts:
        call_notes = "AI analysis unavailable - manual review required"
    else:
        call_notes = " | ".join(call_notes_parts) + " | [AI analysis failed - verify details manually]"

    # Generate task subject
    if "scheduling" in tags or "pricing" in tags:
        task_subject = f"Follow up: {summary or 'Inquiry call'}"
    elif "hot-lead" in tags:
        task_subject = f"Hot Lead Follow-up: {summary or 'Interested caller'}"
    elif "follow-up" in tags:
        task_subject = f"Call Back: {summary or 'Follow-up required'}"
    else:
        task_subject = f"Call Note: {summary or 'General call'}"

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
        "call_notes": call_notes,
    }


@app.post("/api/analyze")
async def analyze_transcription(request: TranscriptionRequest):
    """Analyze transcription and return insights using OpenRouter"""
    logger.info(f"Received analyze request - phone: {request.phone}, client: {request.client}")
    logger.info(f"Transcription: {request.transcription[:100]}...")

    try:
        if not API_KEY:
            logger.error("OpenRouter API key not configured")
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
                # NEW: Full transcription and key details
                "full_transcription": ai_result.get("full_transcription", request.transcription),
                "mentioned_names": ai_result.get("mentioned_names", []),
                "mentioned_locations": ai_result.get("mentioned_locations", []),
                "mentioned_phones": ai_result.get("mentioned_phones", []),
                "other_customer_info": ai_result.get("other_customer_info", ""),
                "salesforce_notes": ai_result.get("salesforce_notes", ""),
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
                # Add scoring breakdown
                response_data["scoring_breakdown"] = ai_result.get("scoring_breakdown", {})
                response_data["scoring_explanation"] = ai_result.get("scoring_breakdown", {}).get(
                    "explanation", ""
                )

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
            # Add scoring breakdown
            response_data["scoring_breakdown"] = analysis.get("scoring_breakdown", {})
            response_data["scoring_explanation"] = analysis.get("scoring_breakdown", {}).get(
                "explanation", ""
            )

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
