"""
Webhook results polling endpoint
"""

from fastapi import APIRouter
from services import webhook_storage

router = APIRouter(prefix="/api", tags=["results"])


@router.get("/webhook-results")
async def get_webhook_results(phone: str = None, delete: bool = False):
    """Get webhook analysis results for a phone number"""
    if not phone:
        return {"results": webhook_storage.get_all()}

    result = webhook_storage.get(phone, delete=delete)

    if result:
        return result

    return {"status": "no_results"}
