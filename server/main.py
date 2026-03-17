"""
ATS AI Server - Main Entry Point

Modular version 2.0.0
"""

import uvicorn
import os
from core.app import app


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
