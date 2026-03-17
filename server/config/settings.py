"""
Server configuration and settings
"""

import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("ATS_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

AI_MODEL = "openai/gpt-3.5-turbo"
AI_MODEL_FALLBACK = "google/gemini-pro"

CACHE_TTL_SECONDS = 300
WEBHOOK_RESULTS_FILE = "/tmp/webhook_results.json"

SERVER_VERSION = "2.0.0"


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
