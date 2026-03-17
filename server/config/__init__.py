"""
Config module
"""

from config.settings import (
    API_KEY,
    OPENROUTER_URL,
    AI_MODEL,
    AI_MODEL_FALLBACK,
    CACHE_TTL_SECONDS,
    WEBHOOK_RESULTS_FILE,
    SERVER_VERSION,
    KB_DIR,
    get_kb_dir,
)

__all__ = [
    "API_KEY",
    "OPENROUTER_URL",
    "AI_MODEL",
    "AI_MODEL_FALLBACK",
    "CACHE_TTL_SECONDS",
    "WEBHOOK_RESULTS_FILE",
    "SERVER_VERSION",
    "KB_DIR",
    "get_kb_dir",
]
