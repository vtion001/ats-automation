"""
ATS AI Server - Transcription Analysis
Processes call transcriptions and provides AI-powered insights using OpenRouter
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
from loguru import logger
import re
import json
from datetime import datetime, timedelta
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
    return {"status": " ATS AI Server running", "version": "1.1.0"}

@app.get("/health")
async def health():
    return {"status": "healthy", "ai_enabled": bool(API_KEY), "provider": "openrouter"}

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

async def determine_action_with_openai(transcription: str, analysis: dict, phone: Optional[str] = None, client: str = "flyland") -> dict:
    """Determine Salesforce action (Log a Call vs New Task) using OpenRouter AI"""
    
    tags = analysis.get('tags', [])
    sentiment = analysis.get('sentiment', 'neutral')
    follow_up = analysis.get('follow_up_required', False)
    summary = analysis.get('summary', '')
    
    system_prompt = """You are a Salesforce automation expert. Based on the call analysis, determine the best Salesforce action.

Return a JSON object with:
- action: "log_call" or "new_task"
- reason: Brief explanation for the decision
- task_subject: Suggested task subject (if new_task)
- task_due_date: Suggested due date in YYYY-MM-DD format (if new_task)
- call_subject: Suggested call subject (if log_call)
- call_notes: Structured notes for the Salesforce record

Decision rules:
- If caller wants to schedule, needs follow-up, or requests callback → new_task
- If caller has complaint, is unqualified, or just informational → log_call
- If hot-lead with follow-up needed → new_task

Respond ONLY with valid JSON."""

    user_message = f"""Analyze this call and determine the best Salesforce action:

Call Analysis:
- Tags: {', '.join(tags)}
- Sentiment: {sentiment}
- Follow-up required: {follow_up}
- Summary: {summary}
- Phone: {phone or 'Unknown'}

Transcription (first 500 chars): {transcription[:500]}"""

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
            "max_tokens": 800,
            "temperature": 0.2
        }
        
        response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            try:
                content = content.strip()
                if content.startswith('```'):
                    content = content.split('```')[1]
                    if content.startswith('json'):
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
    tags = [t.lower() for t in analysis.get('tags', [])]
    follow_up = analysis.get('follow_up_required', False)
    
    if 'follow-up' in tags or 'scheduling' in tags:
        action = 'new_task'
        reason = 'Follow-up or scheduling required'
    elif 'hot-lead' in tags and follow_up:
        action = 'new_task'
        reason = 'Hot lead with follow-up needed'
    elif 'complaint' in tags or 'unqualified' in tags:
        action = 'log_call'
        reason = 'Call logged for record'
    else:
        action = 'log_call'
        reason = 'General call notes'
    
    # Generate task subject
    if 'scheduling' in tags or 'pricing' in tags:
        task_subject = f"Follow up: {analysis.get('summary', 'Inquiry call')}"
    elif 'hot-lead' in tags:
        task_subject = f"Hot Lead Follow-up: {analysis.get('summary', 'Interested caller')}"
    elif 'follow-up' in tags:
        task_subject = f"Call Back: {analysis.get('summary', 'Follow-up required')}"
    else:
        task_subject = f"Call Note: {analysis.get('summary', 'General call')}"
    
    # Generate due date
    today = datetime.now()
    if 'hot-lead' in tags:
        days = 1
    elif 'scheduling' in tags:
        days = 3
    else:
        days = 7
    due_date = (today + timedelta(days=days)).strftime('%Y-%m-%d')
    
    return {
        "action": action,
        "reason": reason,
        "task_subject": task_subject,
        "task_due_date": due_date,
        "call_subject": f"Inbound Call - {analysis.get('suggested_disposition', 'New')}",
        "call_notes": analysis.get('suggested_notes', 'Call recorded via ATS Automation')
    }

@app.post("/api/analyze")
async def analyze_transcription(request: TranscriptionRequest):
    """Analyze transcription and return insights using OpenRouter"""
    try:
        if not API_KEY:
            return {"error": "OpenRouter API key not configured", "status": "fallback"}
        
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
                "ai_analyzed": True,
                "provider": "openrouter"
            }
        else:
            logger.warning(f"AI analysis failed: {ai_result.get('error')}")
            raise HTTPException(status_code=500, detail=ai_result.get('error'))

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
            request.transcription,
            request.analysis,
            request.phone,
            request.client or "flyland"
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
        
        # First get analysis
        analysis = await analyze_with_openai(
            request.transcription,
            request.phone,
            request.client or "flyland"
        )
        
        if "error" in analysis:
            raise HTTPException(status_code=500, detail=analysis.get('error'))
        
        # Then get action
        action = await determine_action_with_openai(
            request.transcription,
            analysis,
            request.phone,
            request.client or "flyland"
        )
        
        return {
            "phone": request.phone,
            "tags": analysis.get("tags", []),
            "sentiment": analysis.get("sentiment", "neutral"),
            "summary": analysis.get("summary", ""),
            "suggested_disposition": analysis.get("suggested_disposition", "New"),
            "suggested_notes": analysis.get("suggested_notes", ""),
            "follow_up_required": analysis.get("follow_up_required", False),
            "timestamp": datetime.now().isoformat(),
            "ai_analyzed": True,
            "provider": "openrouter",
            **action
        }
        
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
