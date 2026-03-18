"""
FastAPI app setup
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import os
import sys

# Add server dir to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


def create_app() -> FastAPI:
    app = FastAPI(title="ATS AI Server")

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS", "PUT", "DELETE", "PATCH"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=3600,
    )

    # Import and include routers
    from routes import (
        health_router,
        analyze_router,
        transcribe_router,
        webhook_router,
        results_router,
        remote_logs_router,
    )

    app.include_router(health_router)
    app.include_router(analyze_router)
    app.include_router(transcribe_router)
    app.include_router(webhook_router)
    app.include_router(results_router)
    app.include_router(remote_logs_router)

    # OPTIONS handler for CORS preflight
    @app.options("/{full_path:path}")
    async def handle_options(full_path: str):
        logger.info(f"OPTIONS request for: {full_path}")
        return {"status": "ok"}

    # Import services to trigger KB loading
    from services import knowledge_base_service

    logger.info(f"Loaded knowledge bases: {list(knowledge_base_service.KNOWLEDGE_BASES.keys())}")

    return app


app = create_app()
