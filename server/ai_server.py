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
from datetime import datetime

app = FastAPI(title="ATS AI Server")

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
    return {"status": "healthy"}

@app.post("/api/analyze")
async def analyze_transcription(request: TranscriptionRequest):
    """Analyze transcription and return insights"""
    try:
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
