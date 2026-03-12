"""
ATS Automation - Central Server API

Handles:
- Client configuration management
- Log aggregation
- Version management
- API key authentication
"""

import os
import json
import hashlib
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel
from uvicorn import run

# Configuration
SERVER_DIR = Path(__file__).parent
CONFIG_DIR = SERVER_DIR / "config_store"
LOGS_DIR = SERVER_DIR / "logs"
VERSIONS_DIR = SERVER_DIR / "versions"

# Create directories
CONFIG_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)
VERSIONS_DIR.mkdir(exist_ok=True)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ATS Automation Server")

# In-memory API key store (use database in production)
API_KEYS = {
    "flyland": "flyland_api_key_here",
    "legacy": "legacy_api_key_here",
    "tbt": "tbt_api_key_here",
    "banyan": "banyan_api_key_here",
    "takami": "takami_api_key_here",
    "element": "element_api_key_here",
    "admin": "admin_master_key_here",
}


def verify_api_key(authorization: Optional[str] = Header(None)) -> str:
    """Verify API key from Authorization header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")

    token = authorization[7:]  # Remove "Bearer "

    # Check against known keys
    for client, key in API_KEYS.items():
        if hashlib.sha256(key.encode()).hexdigest() == token or key == token:
            return client

    raise HTTPException(status_code=401, detail="Invalid API key")


class ConfigModel(BaseModel):
    """Configuration model."""

    client_name: str
    automations: dict
    systems: dict
    logging: dict


@app.get("/")
def root():
    """Server health check."""
    return {
        "status": "ok",
        "server": "ATS Automation Server",
        "version": "1.0.0",
        "clients": list(API_KEYS.keys()),
    }


@app.get("/api/config/{client}")
def get_config(client: str, api_key: str = Depends(verify_api_key)):
    """Get configuration for a client."""
    config_file = CONFIG_DIR / f"{client}.json"

    if not config_file.exists():
        # Create default config
        default_config = {
            "client_name": client,
            "automations": {},
            "systems": {},
            "logging": {"level": "INFO"},
        }
        return default_config

    with open(config_file, "r") as f:
        return json.load(f)


@app.post("/api/config/{client}")
def update_config(client: str, config: ConfigModel, api_key: str = Depends(verify_api_key)):
    """Update configuration for a client."""
    config_file = CONFIG_DIR / f"{client}.json"

    config_data = config.dict()
    with open(config_file, "w") as f:
        json.dump(config_data, f, indent=2)

    logger.info(f"Updated config for {client}")
    return {"status": "ok", "client": client}


@app.post("/api/logs/{client}")
def receive_logs(client: str, logs: dict, api_key: str = Depends(verify_api_key)):
    """Receive logs from agent machines."""
    log_file = LOGS_DIR / f"{client}_{datetime.now().strftime('%Y%m%d')}.json"

    # Append to daily log file
    existing_logs = []
    if log_file.exists():
        with open(log_file, "r") as f:
            existing_logs = json.load(f)

    existing_logs.append({**logs, "timestamp": datetime.now().isoformat()})

    with open(log_file, "w") as f:
        json.dump(existing_logs, f, indent=2)

    return {"status": "ok"}


@app.get("/api/versions/latest")
def get_latest_version(api_key: str = Depends(verify_api_key)):
    """Get latest version information."""
    versions_file = VERSIONS_DIR / "versions.json"

    if versions_file.exists():
        with open(versions_file, "r") as f:
            return json.load(f)

    return {"version": "1.0.0", "min_required": "1.0.0", "release_notes": "Initial release"}


@app.post("/api/logs/call")
def log_call_event(call_data: dict, api_key: str = Depends(verify_api_key)):
    """Log a call event."""
    log_file = LOGS_DIR / f"calls_{datetime.now().strftime('%Y%m%d')}.json"

    existing = []
    if log_file.exists():
        with open(log_file, "r") as f:
            existing = json.load(f)

    existing.append({**call_data, "logged_at": datetime.now().isoformat()})

    with open(log_file, "w") as f:
        json.dump(existing, f, indent=2)

    return {"status": "ok"}


def generate_api_key(client: str) -> str:
    """Generate a new API key for a client."""
    import secrets

    key = secrets.token_urlsafe(32)
    API_KEYS[client] = key
    return key


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    run(app, host="0.0.0.0", port=port)
