"""
ATS AI Server - Modular Architecture
Main FastAPI application that orchestrates AI agents

Version: 2.0.0 - Refactored with modular agents
"""

import re
import asyncio
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import requests

# Use absolute imports
import sys

sys.path.insert(0, str(Path(__file__).parent))

try:
    from config import (
        Config,
        TranscriptionRequest,
        DetermineActionRequest,
        TranscribeRequest,
        CTMWebhookRequest,
    )
except ImportError:
    from server.config import (
        Config,
        TranscriptionRequest,
        DetermineActionRequest,
        TranscribeRequest,
        CTMWebhookRequest,
    )

try:
    from services import get_kb_service, get_storage_service, get_cache_service
except ImportError:
    from server.services import get_kb_service, get_storage_service, get_cache_service

try:
    from agents import (
        IntentAgent,
        NERAgent,
        SentimentAgent,
        QualificationAgent,
        SummaryAgent,
        ActionAgent,
    )
except ImportError:
    from server.agents import (
        IntentAgent,
        NERAgent,
        SentimentAgent,
        QualificationAgent,
        SummaryAgent,
        ActionAgent,
    )

# Initialize FastAPI app
app = FastAPI(title="ATS AI Server")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.options("/{full_path:path}")
async def handle_options(full_path: str):
    """Handle CORS preflight requests"""
    return {"status": "ok"}


# ============ Health & Info Endpoints ============


@app.get("/")
async def root():
    """Root endpoint"""
    kb_service = get_kb_service()
    return {
        "status": " ATS AI Server running",
        "version": "2.0.0",
        "model": Config.MODEL_ANALYSIS,
        "clients": kb_service.get_clients(),
        "architecture": "modular_agents",
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    kb_service = get_kb_service()
    return {
        "status": "healthy",
        "ai_enabled": bool(Config.API_KEY),
        "provider": "openrouter",
        "model": Config.MODEL_ANALYSIS,
        "kb_loaded": kb_service.get_clients(),
    }


# ============ Analysis Endpoints ============


@app.post("/api/analyze")
async def analyze_transcription(request: TranscriptionRequest):
    """
    Analyze transcription using modular agents

    This endpoint orchestrates multiple specialized agents:
    1. IntentAgent - detects call type and intent
    2. NERAgent - extracts names, locations, phones
    3. SentimentAgent - analyzes emotional tone
    4. QualificationAgent - scores and qualifies lead
    5. SummaryAgent - generates summary and notes
    """
    logger.info(f"Received analyze request - phone: {request.phone}, client: {request.client}")

    if not Config.API_KEY:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")

    # Check cache
    cache = get_cache_service()
    if request.phone:
        cached = cache.get(request.phone)
        if cached:
            return cached

    # Get KB context
    kb_service = get_kb_service()
    kb_context = kb_service.get_context(request.client or "flyland")

    transcription = request.transcription
    phone = request.phone
    client = request.client or "flyland"

    try:
        # Run parallel agents
        intent_agent = IntentAgent()
        ner_agent = NERAgent()
        sentiment_agent = SentimentAgent()

        intent_result, ner_result, sentiment_result = await asyncio.gather(
            intent_agent.run({"transcription": transcription}, {"kb_context": kb_context}),
            ner_agent.run({"transcription": transcription}, {}),
            sentiment_agent.run({"transcription": transcription}, {}),
        )

        # Run qualification (depends on intent)
        qualification_agent = QualificationAgent()
        qualification_result = await qualification_agent.run(
            {
                "transcription": transcription,
                "intent": intent_result,
                "entities": ner_result,
            },
            {"kb_context": kb_context},
        )

        # Run summary (depends on entities and sentiment)
        summary_agent = SummaryAgent()
        summary_result = await summary_agent.run(
            {
                "transcription": transcription,
                "entities": ner_result,
                "sentiment": sentiment_result,
            },
            {"kb_context": kb_context},
        )

        # Build response
        response = {
            "phone": phone,
            "client": client,
            "call_type": intent_result.get("call_type"),
            "primary_intent": intent_result.get("primary_intent"),
            "tags": qualification_result.get("tags", []),
            "sentiment": sentiment_result.get("sentiment"),
            "urgency": sentiment_result.get("urgency"),
            "summary": summary_result.get("summary"),
            "qualification_score": qualification_result.get("score", 0),
            "scoring_breakdown": qualification_result.get("breakdown", {}),
            "follow_up_required": "follow_up" in qualification_result.get("tags", []),
            "suggested_disposition": "Qualified"
            if qualification_result.get("score", 0) >= 70
            else "New",
            "recommended_department": qualification_result.get("recommended_department", "intake"),
            "mentioned_names": ner_result.get("names", []),
            "mentioned_locations": ner_result.get("locations", []),
            "mentioned_phones": ner_result.get("phones", []),
            "salesforce_notes": summary_result.get("salesforce_notes", ""),
            "timestamp": datetime.now().isoformat(),
            "ai_analyzed": True,
            "provider": "openrouter",
            "kb_client": client if client in kb_service.get_clients() else None,
        }

        # Cache result
        if phone:
            cache.set(phone, response)

        return response

    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/determine-action")
async def determine_action(request: DetermineActionRequest):
    """Determine Salesforce action based on analysis"""

    if not Config.API_KEY:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")

    try:
        action_agent = ActionAgent()
        result = await action_agent.run(
            {
                "transcription": request.transcription,
                "analysis": request.analysis,
                "phone": request.phone,
            },
            {},
        )
        return result

    except Exception as e:
        logger.error(f"Action determination error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze-full")
async def analyze_full(request: TranscriptionRequest):
    """Full analysis including action determination"""

    # First get analysis
    analysis = await analyze_transcription(request)

    # Then get action
    action_request = DetermineActionRequest(
        transcription=request.transcription,
        analysis=analysis,
        phone=request.phone,
        client=request.client,
    )
    action = await determine_action(action_request)

    # Merge results
    return {**analysis, **action}


# ============ Test Endpoint ============


@app.get("/api/test")
async def test_analysis():
    """Test endpoint to verify AI analysis is working"""

    test_transcription = "Hello, I'm calling to inquire about addiction treatment options. I have private insurance and I've been sober for 30 days. I'm from California."

    try:
        result = await analyze_transcription(
            TranscriptionRequest(
                transcription=test_transcription, phone="5551234567", client="flyland"
            )
        )

        return {
            "status": "success",
            "message": "AI analysis working correctly",
            "transcription": test_transcription,
            "result": {
                "call_type": result.get("call_type"),
                "tags": result.get("tags", []),
                "sentiment": result.get("sentiment"),
                "summary": result.get("summary"),
                "qualification_score": result.get("qualification_score", 0),
            },
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ============ Knowledge Base Endpoints ============


@app.get("/api/kb/{client}")
async def get_knowledge_base(client: str):
    """Get knowledge base for a client"""
    kb_service = get_kb_service()
    if kb_service.get_kb(client):
        return {"client": client, "kb_available": True}
    return {"client": client, "kb_available": False}


# ============ Webhook Endpoints ============


@app.post("/api/ctm-webhook")
async def ctm_webhook(request: CTMWebhookRequest):
    """Handle incoming webhook from CTM"""

    logger.info(f"CTM Webhook received: {request.event}")

    # Extract phone
    phone = (
        request.phone_number or request.caller_number or request.from_number or request.to_number
    )
    if phone:
        phone = re.sub(r"[^\d+]", "", phone)
        if not phone.startswith("+"):
            phone = "+1" + phone

    # Get transcript
    transcript = request.transcript or request.transcription or ""

    if transcript and len(transcript) > 10:
        # Analyze
        analysis = await analyze_transcription(
            TranscriptionRequest(
                transcription=transcript, phone=phone, client=request.client or "flyland"
            )
        )

        # Store result
        if phone:
            storage = get_storage_service()
            storage.save_result(phone, analysis)

        return {
            "status": "success",
            "event": request.event,
            "call_id": request.call_id,
            "phone": phone,
            "analysis": analysis,
            "ai_analyzed": True,
        }

    return {
        "status": "received",
        "event": request.event,
        "call_id": request.call_id,
        "phone": phone,
        "message": "Webhook received, no transcript to analyze",
    }


@app.get("/api/webhook-results")
async def get_webhook_results(phone: str = None):
    """Get webhook analysis results"""

    storage = get_storage_service()

    if not phone:
        return {"results": storage.get_all_results()}

    phone = re.sub(r"[^\d+]", "", phone)
    result = storage.get_result(phone)

    if result:
        return result

    return {"status": "no_results"}


# ============ Transcription Endpoints ============


# Whisper setup
WHISPER_AVAILABLE = False
WHISPER_MODEL = None

try:
    from faster_whisper import WhisperModel

    def load_whisper():
        global WHISPER_MODEL
        if WHISPER_MODEL is None:
            logger.info("Loading faster-whisper base model...")
            WHISPER_MODEL = WhisperModel("base", device="cpu", compute_type="int8")
            logger.info("Whisper model loaded")

    WHISPER_AVAILABLE = True
except ImportError as e:
    logger.warning(f"faster-whisper not available: {e}")


@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio file using faster-whisper"""

    if not WHISPER_AVAILABLE:
        return {"error": "Whisper not installed"}

    try:
        load_whisper()

        # Save to temp
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Transcribe
        segments, info = WHISPER_MODEL.transcribe(tmp_path)
        transcription = " ".join([segment.text for segment in segments]).strip()

        # Extract phone
        phone_pattern = r"\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}"
        phones = re.findall(phone_pattern, transcription)
        phone = phones[0] if phones else None

        if phone:
            phone = re.sub(r"[^\d+]", "", phone)
            if not phone.startswith("+"):
                phone = "+1" + phone

        # Clean up
        Path(tmp_path).unlink()

        return {"transcription": transcription, "phone": phone, "duration": info.duration or 0}

    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return {"error": str(e)}


# ============ Main ============


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=Config.HOST, port=Config.PORT)
