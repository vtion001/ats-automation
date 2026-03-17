"""
Health check endpoints
"""

from fastapi import APIRouter
from config.settings import API_KEY, AI_MODEL, SERVER_VERSION
from services import KNOWLEDGE_BASES

router = APIRouter(tags=["health"])


@router.get("/")
async def root():
    return {
        "status": "ATS AI Server running",
        "version": SERVER_VERSION,
        "model": AI_MODEL,
        "clients": list(KNOWLEDGE_BASES.keys()),
    }


@router.get("/health")
async def health():
    return {
        "status": "healthy",
        "ai_enabled": bool(API_KEY),
        "provider": "openrouter",
        "model": AI_MODEL,
        "kb_loaded": list(KNOWLEDGE_BASES.keys()),
    }
