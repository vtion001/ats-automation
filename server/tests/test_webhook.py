"""
CTM Webhook Tests
Test the webhook endpoint to see what payload we can receive from CTM
"""

import pytest
from fastapi.testclient import TestClient

# Import from core.app which has the webhook router
from core.app import app

client = TestClient(app)


class TestCTMWebhook:
    """Test CTM webhook endpoint"""

    def test_ctm_webhook_incoming_call(self):
        """Test webhook with incoming call event"""
        payload = {
            "event": "call.start",
            "call_id": "test_call_123",
            "phone_number": "+15551234567",
            "caller_number": "+15559876543",
            "from_number": "+15559876543",
            "to_number": "+15551234567",
            "direction": "inbound",
            "duration": 0,
            "client": "flyland",
            "timestamp": "2024-01-15T10:30:00Z",
        }

        response = client.post("/api/ctm-webhook", json=payload)
        print(f"Response: {response.json()}")
        assert response.status_code == 200
        assert response.json()["status"] == "received"

    def test_ctm_webhook_minimal_payload(self):
        """Test webhook with minimal payload"""
        payload = {"event": "call.start", "phone_number": "+15551234567", "client": "flyland"}

        response = client.post("/api/ctm-webhook", json=payload)
        print(f"Response: {response.json()}")
        assert response.status_code == 200

    def test_ctm_webhook_all_fields_no_transcript(self):
        """Test webhook with all available fields but no transcript"""
        payload = {
            "event": "call.completed",
            "call_id": "full_test_call",
            "phone_number": "+15551234567",
            "caller_number": "+15559876543",
            "from_number": "+15559876543",
            "to_number": "+15551234567",
            "direction": "inbound",
            "duration": 420,
            "recording_url": "https://recordings.calltrackingmetrics.com/recording123.mp3",
            "client": "flyland",
            "timestamp": "2024-01-15T14:30:00Z",
        }

        response = client.post("/api/ctm-webhook", json=payload)
        print(f"Response: {response.json()}")
        assert response.status_code == 200
        assert response.json()["status"] == "received"

    def test_ctm_webhook_outbound_call(self):
        """Test webhook with outbound call"""
        payload = {
            "event": "call.completed",
            "call_id": "test_call_789",
            "phone_number": "+15551234567",
            "to_number": "+15559876543",
            "direction": "outbound",
            "duration": 300,
            "client": "flyland",
            "timestamp": "2024-01-15T11:00:00Z",
        }

        response = client.post("/api/ctm-webhook", json=payload)
        print(f"Response: {response.json()}")
        assert response.status_code == 200


class TestWebhookPayloadFields:
    """Test available payload fields from CTM"""

    def test_incoming_call_payload(self):
        """Typical incoming call from CTM"""
        payload = {
            "event": "call.start",
            "call_id": "inc_123456",
            "phone_number": "+18005551234",  # CTM tracking number
            "caller_number": "+12125551234",  # Actual caller
            "from_number": "+12125551234",
            "to_number": "+18005551234",
            "direction": "inbound",
            "duration": 0,
            "client": "flyland",
        }

        response = client.post("/api/ctm-webhook", json=payload)
        print(f"Incoming call: {response.json()}")

    def test_call_ended_with_recording(self):
        """Call ended with recording URL"""
        payload = {
            "event": "call.ended",
            "call_id": "end_789012",
            "phone_number": "+18005551234",
            "caller_number": "+12125551234",
            "direction": "inbound",
            "duration": 245,
            "recording_url": "https://recordings.calltrackingmetrics.com/calls/789012.mp3",
            "client": "flyland",
        }

        response = client.post("/api/ctm-webhook", json=payload)
        print(f"Call ended: {response.json()}")

    def test_ctm_phone_call_event(self):
        """CTM phone:startCall event format"""
        payload = {
            "event": "ctm.phone.startCall",
            "call_id": "ctm_call_001",
            "phone_number": "+18005551234",
            "caller_number": "+12125551234",
            "direction": "inbound",
            "client": "flyland",
        }

        response = client.post("/api/ctm-webhook", json=payload)
        print(f"CTM phone event: {response.json()}")

    def test_ctm_screen_pop_event(self):
        """CTM screen-pop event"""
        payload = {
            "event": "ctm:screen-pop",
            "call_id": "screen_pop_001",
            "phone_number": "+18005551234",
            "caller_number": "+12125551234",
            "direction": "inbound",
            "client": "flyland",
        }

        response = client.post("/api/ctm-webhook", json=payload)
        print(f"CTM screen-pop: {response.json()}")

    def test_outbound_call(self):
        """Test outbound call"""
        payload = {
            "event": "call.completed",
            "call_id": "outbound_001",
            "phone_number": "+12125559876",
            "to_number": "+12125559876",
            "direction": "outbound",
            "duration": 120,
            "client": "flyland",
        }

        response = client.post("/api/ctm-webhook", json=payload)
        print(f"Outbound call: {response.json()}")
        assert response.status_code == 200

    def test_call_with_duration_only(self):
        """Test call event with just duration"""
        payload = {
            "event": "call.update",
            "call_id": "update_001",
            "phone_number": "+18005551234",
            "duration": 60,
            "client": "flyland",
        }

        response = client.post("/api/ctm-webhook", json=payload)
        print(f"Duration update: {response.json()}")

    def test_different_client(self):
        """Test with different client"""
        payload = {
            "event": "call.start",
            "call_id": "banyan_call",
            "phone_number": "+18005551234",
            "client": "banyan",
        }

        response = client.post("/api/ctm-webhook", json=payload)
        print(f"Banyan client: {response.json()}")

    def test_all_phone_fields(self):
        """Test using all phone fields at once"""
        payload = {
            "event": "call.completed",
            "call_id": "full_fields",
            "phone_number": "+18005551234",  # CTM tracking number
            "caller_number": "+12125551234",  # The caller
            "from_number": "+12125551234",  # Same as caller
            "to_number": "+18005551234",  # CTM number called
            "direction": "inbound",
            "duration": 300,
            "recording_url": "https://recordings.calltrackingmetrics.com/calls/full_fields.mp3",
            "transcript": "This is a test transcript for call recording analysis.",
            "client": "flyland",
            "timestamp": "2024-01-15T15:00:00Z",
        }

        response = client.post("/api/ctm-webhook", json=payload)
        print(f"All fields test: {response.json()}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
