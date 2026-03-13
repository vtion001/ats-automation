"""
ATS AI Server - Transcription Analysis
Processes call transcriptions and provides AI-powered insights
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
from loguru import logger
import re
import json
from datetime import datetime
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ATS AI Server")

API_KEY = os.getenv("ATS_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

class TranscriptionRequest(BaseModel):
    transcription: str
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

KEYWORDS = {
    "hot_lead": ["interested", "want", "need", "looking for", "please send", "call back", "definitely", "sounds good", "great"],
    "unqualified": ["not interested", "no thank", "remove", "don't call", "wrong number", "not looking"],
    "follow_up": ["call back", "later", "maybe", "think about", "check with", "discuss", "pending"],
    "pricing": ["pricing", "cost", "price", "how much", "expensive", "discount", "deal", "quote"],
    "scheduling": ["appointment", "schedule", "book", "meeting", "time", "date", "when"],
    "information": ["information", "details", "tell me", "explain", "what is", "how does"],
    "complaint": ["problem", "issue", "terrible", "worst", "angry", "frustrated", "complaint"],
    "billing": ["bill", "invoice", "payment", "charge", "refund", "insurance", "coverage"]
}

@app.get("/")
async def root():
    return {"status": " ATS AI Server running", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy", "ai_enabled": bool(API_KEY)}

async def analyze_with_openai(transcription: str, phone: Optional[str] = None, client: str = "flyland") -> dict:
    """Analyze transcription using OpenRouter AI"""
    
    system_prompt = """You are an expert sales call analyzer. Analyze the transcription and return a JSON object with:
- tags: Array of relevant tags (hot-lead, unqualified, follow-up, pricing, scheduling, information, complaint, billing)
- sentiment: "positive", "neutral", or "negative"
- summary: Brief 1-2 sentence summary of the call
- suggested_disposition: Appropriate disposition (New, Qualified, Unqualified, Callback Scheduled, etc.)
- suggested_notes: Key points and action items
- follow_up_required: true or false

Respond ONLY with valid JSON."""

    user_message = f"Analyze this call transcription{' for phone number ' + phone if phone else ''}:\n\n{transcription}"

    try:
        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ats-automation.local",
            "X-Title": "ATS Automation"
        }
        
        payload = {
            "model": "anthropic/claude-3-haiku",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "max_tokens": 1000,
            "temperature": 0.3
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
                if content.startswith('```'):
                    content = content.split('```')[1]
                    if content.startswith('json'):
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

@app.post("/api/analyze")
async def analyze_transcription(request: TranscriptionRequest):
    """Analyze transcription and return insights"""
    try:
        # Use OpenRouter AI if API key is available
        if API_KEY:
            ai_result = await analyze_with_openai(
                request.transcription, 
                request.phone, 
                request.client or "flyland"
            )
            
            if "error" not in ai_result:
                return {
                    "phone": request.phone,
                    "tags": ai_result.get("tags", []),
                    "sentiment": ai_result.get("sentiment", "neutral"),
                    "summary": ai_result.get("summary", ""),
                    "suggested_disposition": ai_result.get("suggested_disposition", "New"),
                    "suggested_notes": ai_result.get("suggested_notes", ""),
                    "follow_up_required": ai_result.get("follow_up_required", False),
                    "timestamp": datetime.now().isoformat(),
                    "ai_analyzed": True
                }
            else:
                logger.warning(f"AI analysis failed, falling back to keyword analysis: {ai_result.get('error')}")
        
        # Fallback to keyword-based analysis
        text = request.transcription.lower() if request.transcription else ""
        
        tags = []
        sentiment = "neutral"
        summary_parts = []
        follow_up_required = False
        suggested_disposition = "New"
        suggested_notes = ""

        for tag, keywords in KEYWORDS.items():
            for keyword in keywords:
                if keyword in text:
                    tags.append(tag.replace("_", "-"))
                    break

        if "hot-lead" in tags:
            sentiment = "positive"
            suggested_disposition = "Qualified"
            summary_parts.append("Caller appears interested")
        elif "unqualified" in tags:
            sentiment = "negative"
            suggested_disposition = "Unqualified"
            summary_parts.append("Caller not interested")
        
        if "follow-up" in tags:
            follow_up_required = True
            summary_parts.append("Follow-up required")

        if "pricing" in tags:
            summary_parts.append("Inquiry about pricing")
        
        if "scheduling" in tags:
            summary_parts.append("Wants to schedule appointment")
        
        if "complaint" in tags:
            sentiment = "negative"
            summary_parts.append("Customer has concerns")

        word_count = len(text.split())
        if word_count > 300:
            tags.append("long-call")
            summary_parts.append(f"Extended call ({word_count} words)")

        summary = ". ".join(summary_parts) if summary_parts else "Call recorded"
        
        suggested_notes = generate_notes(text, tags, request.phone)

        return {
            "phone": request.phone,
            "tags": list(set(tags)),
            "sentiment": sentiment,
            "summary": summary,
            "suggested_disposition": suggested_disposition,
            "suggested_notes": suggested_notes,
            "follow_up_required": follow_up_required,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Analysis error: {e}")
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
    
    first_sentence = text.split('.')[0] if text else ""
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
