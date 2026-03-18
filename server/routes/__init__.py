"""
Routes module exports
"""

from routes.health import router as health_router
from routes.analyze import router as analyze_router
from routes.transcribe import router as transcribe_router
from routes.webhook import router as webhook_router
from routes.results import router as results_router
from routes.remote_logs import router as remote_logs_router

__all__ = [
    "health_router",
    "analyze_router",
    "transcribe_router",
    "webhook_router",
    "results_router",
    "remote_logs_router",
]
