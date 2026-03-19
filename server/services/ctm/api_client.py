"""
CTM API Client - Direct API integration for CallTrackingMetrics

This module provides direct API access to CTM without DOM/webhook dependency.
Credentials are stored securely in Azure Container App secrets.

API Documentation: https://github.com/calltracking/calltracking.github.io/blob/master/api_users_guide.md
Postman Collection: https://postman.calltrackingmetrics.com/
"""

import os
import base64
import requests
import logging
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
from dataclasses import dataclass

logger = logging.getLogger(__name__)

CTM_API_HOST = "api.calltrackingmetrics.com"


@dataclass
class CTMCredentials:
    access_key: str
    secret_key: str
    account_id: Optional[str] = None


class CTMApiClient:
    """CTM API Client with Azure Container App secrets management"""

    def __init__(
        self,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        account_id: Optional[str] = None,
    ):
        self.access_key = (
            access_key or os.getenv("CTM_ACCESS_KEY", "") or os.getenv("ctm-access-key", "")
        )
        self.secret_key = (
            secret_key or os.getenv("CTM_SECRET_KEY", "") or os.getenv("ctm-secret-key", "")
        )
        self.account_id = (
            account_id or os.getenv("CTM_ACCOUNT_ID", "") or os.getenv("ctm-account-id", "")
        )

        if not self.access_key or not self.secret_key:
            logger.warning("CTM credentials not fully configured")

    def _get_auth_header(self) -> str:
        """Generate Basic Auth header for CTM API"""
        credentials = f"{self.access_key}:{self.secret_key}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"

    def _make_request(
        self, method: str, endpoint: str, params: Optional[Dict] = None, data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make request to CTM API"""
        url = f"https://{CTM_API_HOST}{endpoint}"
        headers = {"Authorization": self._get_auth_header(), "Content-Type": "application/json"}

        try:
            response = requests.request(
                method=method, url=url, headers=headers, params=params, json=data, timeout=30
            )
            if response.status_code == 404:
                return {"status": "error", "reason": "call not found", "calls": []}
            response.raise_for_status()
            return response.json() if response.text else {}
        except requests.RequestException as e:
            logger.error(f"CTM API request failed: {e}")
            raise

    def get_calls(
        self,
        limit: int = 100,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        direction: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch calls from CTM API

        Args:
            limit: Max number of calls to return
            start_date: Filter calls from this date
            end_date: Filter calls until this date
            direction: Filter by 'inbound' or 'outbound'

        Returns:
            List of call records
        """
        if not self.account_id:
            raise ValueError("CTM_ACCOUNT_ID is required")

        params = {"limit": limit}

        if start_date:
            params["start_date"] = start_date.isoformat()
        if end_date:
            params["end_date"] = end_date.isoformat()
        if direction:
            params["direction"] = direction

        result = self._make_request(
            "GET", f"/api/v1/accounts/{self.account_id}/calls.json", params=params
        )

        return result.get("calls", [])

    def get_call_details(self, call_id: str) -> Dict[str, Any]:
        """Get detailed information about a specific call"""
        if not self.account_id:
            raise ValueError("CTM_ACCOUNT_ID is required")

        return self._make_request("GET", f"/api/v1/accounts/{self.account_id}/calls/{call_id}.json")

    def get_call_recording(self, call_id: str) -> Optional[bytes]:
        """Fetch recording audio for a call"""
        if not self.account_id:
            raise ValueError("CTM_ACCOUNT_ID is required")

        url = f"https://{CTM_API_HOST}/api/v1/accounts/{self.account_id}/calls/{call_id}/recording"
        headers = {"Authorization": self._get_auth_header()}

        try:
            response = requests.get(url, headers=headers, timeout=60)
            response.raise_for_status()
            return response.content
        except requests.RequestException as e:
            logger.error(f"Failed to fetch recording: {e}")
            return None

    def get_call_transcript(self, call_id: str) -> Optional[str]:
        """Fetch transcript for a call if available"""
        call = self.get_call_details(call_id)
        return call.get("transcript") or call.get("transcription") or ""

    def get_active_calls(self) -> List[Dict[str, Any]]:
        """Get currently active/running calls

        CTM's /calls/active.json endpoint is unreliable - it may return "call not found"
        even when there are active calls. Instead, we query recent calls and filter by
        active status (in progress, ringing, queued, new).
        """
        if not self.account_id:
            raise ValueError("CTM_ACCOUNT_ID is required")

        try:
            # Try the active endpoint first
            result = self._make_request(
                "GET", f"/api/v1/accounts/{self.account_id}/calls/active.json"
            )
            calls = result.get("calls", [])
            if calls:
                return calls
        except Exception as e:
            logger.warning(f"CTM active calls endpoint error: {e}")

        # Fallback: query recent calls and filter by active status
        active_statuses = ["in progress", "ringing", "queued", "new"]
        try:
            result = self._make_request(
                "GET", f"/api/v1/accounts/{self.account_id}/calls.json", params={"limit": 50}
            )
            all_calls = result.get("calls", [])
            active_calls = [
                call
                for call in all_calls
                if call.get("status", "").lower() in active_statuses
                or call.get("dial_status", "").lower() in active_statuses
            ]
            return active_calls
        except Exception as e:
            logger.error(f"Failed to fetch active calls via fallback: {e}")
            return []

    def get_account_info(self) -> Dict[str, Any]:
        """Get account information"""
        if not self.account_id:
            raise ValueError("CTM_ACCOUNT_ID is required")

        return self._make_request("GET", f"/api/v1/accounts/{self.account_id}.json")

    def list_tracking_numbers(self) -> List[Dict[str, Any]]:
        """List all tracking numbers in the account"""
        if not self.account_id:
            raise ValueError("CTM_ACCOUNT_ID is required")

        result = self._make_request("GET", f"/api/v1/accounts/{self.account_id}/numbers.json")

        return result.get("numbers", [])


def create_ctm_client() -> CTMApiClient:
    """Factory function to create CTM client with credentials from environment"""
    return CTMApiClient(
        access_key=os.getenv("CTM_ACCESS_KEY", "") or os.getenv("ctm-access-key", ""),
        secret_key=os.getenv("CTM_SECRET_KEY", "") or os.getenv("ctm-secret-key", ""),
        account_id=os.getenv("CTM_ACCOUNT_ID", "") or os.getenv("ctm-account-id", ""),
    )
