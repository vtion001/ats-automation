"""
Azure Functions entry point for ATS AI Server (FastAPI)
Uses the ASGI middleware to handle HTTP requests with FastAPI.

This is the main entry point that Azure Functions will use.
"""

import azure.functions as func
import sys
import os

# Add the project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import the FastAPI app
# The ai_server.py has `if __name__ == "__main__": uvicorn.run(...)`
# which prevents execution when imported as a module
from server.ai_server import app as fastapi_app

# Create ASGI middleware wrapper
from azure.functions import AsgiMiddleware

# Create the Azure Functions app
# The main function is the entry point
def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    # Use the ASGI middleware to handle the request with FastAPI
    return AsgiMiddleware(fastapi_app).handle(req, context)
