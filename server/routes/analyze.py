"""
Analysis endpoints
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
from models.requests import TranscriptionRequest, DetermineActionRequest
from services import ai_service, KNOWLEDGE_BASES
from config.settings import OPENROUTER_API_KEY

router = APIRouter(prefix="/api", tags=["analysis"])


@router.post("/analyze")
async def analyze_transcription(request: TranscriptionRequest):
    """Analyze transcription and return insights"""
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")

    client = request.client or "flyland"

    ai_result = await ai_service.analyze(request.transcription, request.phone, client)

    if "error" in ai_result:
        raise HTTPException(status_code=500, detail=ai_result.get("error"))

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
        "full_transcription": ai_result.get("full_transcription", request.transcription),
        "mentioned_names": ai_result.get("mentioned_names", []),
        "mentioned_locations": ai_result.get("mentioned_locations", []),
        "mentioned_phones": ai_result.get("mentioned_phones", []),
        "other_customer_info": ai_result.get("other_customer_info", ""),
        "salesforce_notes": ai_result.get("salesforce_notes", ""),
    }

    if client == "flyland":
        response_data["qualification_score"] = ai_result.get("qualification_score", 0)
        response_data["detected_state"] = ai_result.get("detected_state", "")
        response_data["detected_insurance"] = ai_result.get("detected_insurance", "")
        response_data["detected_sober_days"] = ai_result.get("detected_sober_days", 0)
        response_data["recommended_department"] = ai_result.get("recommended_department", "")
        response_data["call_type"] = ai_result.get("call_type", "treatment")
        response_data["scoring_breakdown"] = ai_result.get("scoring_breakdown", {})
        response_data["scoring_explanation"] = ai_result.get("scoring_breakdown", {}).get(
            "explanation", ""
        )

    return response_data


@router.post("/determine-action")
async def determine_action(request: DetermineActionRequest):
    """Determine Salesforce action"""
    result = await ai_service.determine_action(
        request.transcription, request.analysis, request.phone, request.client or "flyland"
    )
    return result


@router.post("/analyze-full")
async def analyze_full(request: TranscriptionRequest):
    """Full analysis including action determination"""
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")

    client = request.client or "flyland"

    # Get analysis
    analysis = await ai_service.analyze(request.transcription, request.phone, client)

    if "error" in analysis:
        raise HTTPException(status_code=500, detail=analysis.get("error"))

    # Get action
    action = await ai_service.determine_action(
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
        response_data["scoring_breakdown"] = analysis.get("scoring_breakdown", {})
        response_data["scoring_explanation"] = analysis.get("scoring_breakdown", {}).get(
            "explanation", ""
        )

    return response_data


@router.get("/kb/{client}")
async def get_knowledge_base(client: str):
    """Get knowledge base status for a client"""
    if client in KNOWLEDGE_BASES:
        return {"client": client, "kb_available": True}
    return {"client": client, "kb_available": False}
