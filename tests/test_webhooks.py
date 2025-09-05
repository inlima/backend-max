"""
Tests for WhatsApp webhook endpoints.
"""

import json
import hashlib
import hmac
from unittest.mock import patch, AsyncMock
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.webhooks import MessageParser, verify_webhook_signature


class TestWebhookVerification:
    """Test webhook verification functionality."""
    
    def test_verify_webhook_signature_valid(self):
        """Test valid webhook signature verification."""
        payload = b'{"test": "data"}'
        verify_token = "test_token"
        
        signature = hmac.new(
            verify_token.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        full_signature = f"sha256={signature}"
        
        result = verify_webhook_signature(payload, full_signature, verify_token)
        assert result is True
    
    def test_verify_webhook_signature_invalid(self):
        """Test invalid webhook signature verification."""
        payload = b'{"test": "data"}'
        verify_token = "test_token"
        invalid_signature = "sha256=invalid_signature"
        
        result = verify_webhook_signature(payload, invalid_signature, verify_token)
        assert result is False
    
    def test_verify_webhook_signature_wrong_format(self):
        """Test webhook signature with wrong format."""
        payload = b'{"test": "data"}'
        verify_token = "test_token"
        wrong_format = "md5=somehash"
        
        result = verify_webhook_signature(payload, wrong_format, verify_token)
        assert result is False


class TestMessageParser:
    """Test message parsing functionality."""
    
    def test_extract_message_data_text_message(self):
        """Test extracting text message data."""
        webhook_data = {
            "entry": [{
                "changes": [{
                    "value": {
                        "messages": [{
                            "id": "msg_123",
                            "from": "5511999887766",
                            "timestamp": "1234567890",
                            "type": "text",
                            "text": {"body": "Hello"}
                        }],
                        "contacts": [{
                            "profile": {"name": "John Doe"}
                        }],
                        "metadata": {"phone_number_id": "123456789"}
                    }
                }]
            }]
        }
        
        result = MessageParser.extract_message_data(webhook_data)
        
        assert result is not None
        assert result["type"] == "message"
        assert result["message_id"] == "msg_123"
        assert result["from"] == "5511999887766"
        assert result["message_type"] == "text"
        assert result["text"] == "Hello"
        assert result["contact_name"] == "John Doe"
    
    def test_extract_message_data_interactive_message(self):
        """Test extracting interactive message data."""
        webhook_data = {
            "entry": [{
                "changes": [{
                    "value": {
                        "messages": [{
                            "id": "msg_124",
                            "from": "5511999887766",
                            "timestamp": "1234567890",
                            "type": "interactive",
                            "interactive": {
                                "type": "button_reply",
                                "button_reply": {
                                    "id": "btn_1",
                                    "title": "Option 1"
                                }
                            }
                        }],
                        "contacts": [{
                            "profile": {"name": "Jane Doe"}
                        }]
                    }
                }]
            }]
        }
        
        result = MessageParser.extract_message_data(webhook_data)
        
        assert result is not None
        assert result["type"] == "message"
        assert result["message_id"] == "msg_124"
        assert result["message_type"] == "interactive"
        assert result["interactive"]["type"] == "button_reply"
        assert result["text"] is None
    
    def test_extract_message_data_status_update(self):
        """Test extracting status update data."""
        webhook_data = {
            "entry": [{
                "changes": [{
                    "value": {
                        "statuses": [{
                            "id": "msg_123",
                            "status": "delivered",
                            "timestamp": "1234567890",
                            "recipient_id": "5511999887766"
                        }]
                    }
                }]
            }]
        }
        
        result = MessageParser.extract_message_data(webhook_data)
        
        assert result is not None
        assert result["type"] == "status"
        assert result["status"]["id"] == "msg_123"
        assert result["status"]["status"] == "delivered"
    
    def test_extract_message_data_empty_payload(self):
        """Test extracting data from empty payload."""
        webhook_data = {"entry": []}
        
        result = MessageParser.extract_message_data(webhook_data)
        
        assert result is None
    
    def test_extract_user_response_text(self):
        """Test extracting user response from text message."""
        message_data = {
            "type": "message",
            "message_type": "text",
            "text": "Hello there"
        }
        
        result = MessageParser.extract_user_response(message_data)
        
        assert result == "Hello there"
    
    def test_extract_user_response_button(self):
        """Test extracting user response from button interaction."""
        message_data = {
            "type": "message",
            "message_type": "interactive",
            "interactive": {
                "type": "button_reply",
                "button_reply": {
                    "id": "btn_new_client",
                    "title": "Cliente Novo"
                }
            }
        }
        
        result = MessageParser.extract_user_response(message_data)
        
        assert result == "btn_new_client"
    
    def test_extract_user_response_list(self):
        """Test extracting user response from list interaction."""
        message_data = {
            "type": "message",
            "message_type": "interactive",
            "interactive": {
                "type": "list_reply",
                "list_reply": {
                    "id": "area_civil",
                    "title": "Direito Civil"
                }
            }
        }
        
        result = MessageParser.extract_user_response(message_data)
        
        assert result == "area_civil"
    
    def test_extract_user_response_status(self):
        """Test extracting user response from status update."""
        message_data = {
            "type": "status",
            "status": {"id": "msg_123", "status": "delivered"}
        }
        
        result = MessageParser.extract_user_response(message_data)
        
        assert result is None


class TestWebhookEndpoints:
    """Test webhook HTTP endpoints."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)
    
    @patch('app.config.settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'test_verify_token')
    def test_verify_webhook_success(self, client):
        """Test successful webhook verification."""
        response = client.get(
            "/webhooks/whatsapp",
            params={
                "hub.mode": "subscribe",
                "hub.challenge": "test_challenge",
                "hub.verify_token": "test_verify_token"
            }
        )
        
        assert response.status_code == 200
        assert response.text == "test_challenge"
    
    @patch('app.config.settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'test_verify_token')
    def test_verify_webhook_invalid_token(self, client):
        """Test webhook verification with invalid token."""
        response = client.get(
            "/webhooks/whatsapp",
            params={
                "hub.mode": "subscribe",
                "hub.challenge": "test_challenge",
                "hub.verify_token": "wrong_token"
            }
        )
        
        assert response.status_code == 403
    
    @patch('app.config.settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'test_verify_token')
    def test_verify_webhook_wrong_mode(self, client):
        """Test webhook verification with wrong mode."""
        response = client.get(
            "/webhooks/whatsapp",
            params={
                "hub.mode": "unsubscribe",
                "hub.challenge": "test_challenge",
                "hub.verify_token": "test_verify_token"
            }
        )
        
        assert response.status_code == 403
    
    @patch('app.config.settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN', '')
    @patch('app.api.webhooks.handle_incoming_message')
    def test_receive_webhook_no_signature_verification(self, mock_handle, client):
        """Test receiving webhook without signature verification."""
        webhook_payload = {
            "entry": [{
                "changes": [{
                    "value": {
                        "messages": [{
                            "id": "msg_123",
                            "from": "5511999887766",
                            "type": "text",
                            "text": {"body": "Hello"}
                        }],
                        "contacts": [{"profile": {"name": "Test User"}}]
                    }
                }]
            }]
        }
        
        response = client.post(
            "/webhooks/whatsapp",
            json=webhook_payload
        )
        
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        mock_handle.assert_called_once()
    
    @patch('app.config.settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'test_token')
    @patch('app.api.webhooks.handle_incoming_message')
    def test_receive_webhook_valid_signature(self, mock_handle, client):
        """Test receiving webhook with valid signature."""
        webhook_payload = {
            "entry": [{
                "changes": [{
                    "value": {
                        "messages": [{
                            "id": "msg_123",
                            "from": "5511999887766",
                            "type": "text",
                            "text": {"body": "Hello"}
                        }],
                        "contacts": [{"profile": {"name": "Test User"}}]
                    }
                }]
            }]
        }
        
        payload_bytes = json.dumps(webhook_payload).encode('utf-8')
        signature = hmac.new(
            b'test_token',
            payload_bytes,
            hashlib.sha256
        ).hexdigest()
        
        response = client.post(
            "/webhooks/whatsapp",
            json=webhook_payload,
            headers={"X-Hub-Signature-256": f"sha256={signature}"}
        )
        
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        mock_handle.assert_called_once()
    
    @patch('app.config.settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'test_token')
    def test_receive_webhook_invalid_signature(self, client):
        """Test receiving webhook with invalid signature."""
        webhook_payload = {
            "entry": [{
                "changes": [{
                    "value": {
                        "messages": [{
                            "id": "msg_123",
                            "from": "5511999887766",
                            "type": "text",
                            "text": {"body": "Hello"}
                        }]
                    }
                }]
            }]
        }
        
        response = client.post(
            "/webhooks/whatsapp",
            json=webhook_payload,
            headers={"X-Hub-Signature-256": "sha256=invalid_signature"}
        )
        
        assert response.status_code == 403
    
    def test_receive_webhook_invalid_json(self, client):
        """Test receiving webhook with invalid JSON."""
        response = client.post(
            "/webhooks/whatsapp",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400
    
    @patch('app.api.webhooks.handle_status_update')
    def test_receive_webhook_status_update(self, mock_handle, client):
        """Test receiving webhook with status update."""
        webhook_payload = {
            "entry": [{
                "changes": [{
                    "value": {
                        "statuses": [{
                            "id": "msg_123",
                            "status": "delivered",
                            "timestamp": "1234567890"
                        }]
                    }
                }]
            }]
        }
        
        response = client.post(
            "/webhooks/whatsapp",
            json=webhook_payload
        )
        
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        mock_handle.assert_called_once()
    
    def test_receive_webhook_empty_payload(self, client):
        """Test receiving webhook with empty payload."""
        webhook_payload = {"entry": []}
        
        response = client.post(
            "/webhooks/whatsapp",
            json=webhook_payload
        )
        
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}