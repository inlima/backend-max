"""
Tests for WhatsApp Business API client.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx
from app.services.whatsapp_client import (
    WhatsAppBusinessClient,
    InteractiveMessage,
    Button,
    MessageType,
    get_whatsapp_client
)


class TestButton:
    """Test Button dataclass."""
    
    def test_button_to_dict(self):
        """Test button conversion to dict format."""
        button = Button(id="btn_1", title="Option 1")
        expected = {
            "type": "reply",
            "reply": {
                "id": "btn_1",
                "title": "Option 1"
            }
        }
        assert button.to_dict() == expected


class TestInteractiveMessage:
    """Test InteractiveMessage dataclass."""
    
    def test_interactive_message_basic(self):
        """Test basic interactive message conversion."""
        message = InteractiveMessage(
            type="button",
            body="Please select an option"
        )
        
        result = message.to_dict()
        expected = {
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": "Please select an option"}
            }
        }
        assert result == expected
    
    def test_interactive_message_with_buttons(self):
        """Test interactive message with buttons."""
        buttons = [
            Button(id="btn_1", title="Option 1"),
            Button(id="btn_2", title="Option 2")
        ]
        
        message = InteractiveMessage(
            type="button",
            body="Please select an option",
            header="Choose wisely",
            footer="This is a footer",
            buttons=buttons
        )
        
        result = message.to_dict()
        
        assert result["type"] == "interactive"
        assert result["interactive"]["type"] == "button"
        assert result["interactive"]["body"]["text"] == "Please select an option"
        assert result["interactive"]["header"]["text"] == "Choose wisely"
        assert result["interactive"]["footer"]["text"] == "This is a footer"
        assert len(result["interactive"]["action"]["buttons"]) == 2


class TestWhatsAppBusinessClient:
    """Test WhatsApp Business API client."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        return WhatsAppBusinessClient(
            access_token="test_token",
            phone_number_id="123456789",
            api_url="https://test.api.com"
        )
    
    def test_client_initialization(self):
        """Test client initialization."""
        client = WhatsAppBusinessClient(
            access_token="test_token",
            phone_number_id="123456789",
            api_url="https://test.api.com"
        )
        
        assert client.access_token == "test_token"
        assert client.phone_number_id == "123456789"
        assert client.api_url == "https://test.api.com"
        assert client.base_url == "https://test.api.com/123456789"
    
    def test_client_initialization_missing_credentials(self):
        """Test client initialization with missing credentials."""
        with pytest.raises(ValueError, match="WhatsApp access token and phone number ID are required"):
            WhatsAppBusinessClient(access_token="", phone_number_id="")
    
    def test_get_headers(self, client):
        """Test request headers generation."""
        headers = client._get_headers()
        expected = {
            "Authorization": "Bearer test_token",
            "Content-Type": "application/json"
        }
        assert headers == expected
    
    def test_format_phone_number(self, client):
        """Test phone number formatting."""
        # Test Brazilian number without country code
        assert client._format_phone_number("73982005612") == "5573982005612"
        
        # Test number with country code
        assert client._format_phone_number("5573982005612") == "5573982005612"
        
        # Test number with formatting characters
        assert client._format_phone_number("+55 (73) 98200-5612") == "5573982005612"
    
    @pytest.mark.asyncio
    async def test_send_message_success(self, client):
        """Test successful message sending."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = '{"messages": [{"id": "msg_123"}]}'
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response
            )
            
            result = await client.send_message("73982005612", "Test message")
            
            assert result is True
            mock_client.return_value.__aenter__.return_value.post.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_send_message_failure(self, client):
        """Test message sending failure."""
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = '{"error": {"message": "Invalid request"}}'
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response
            )
            
            result = await client.send_message("73982005612", "Test message")
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_send_message_exception(self, client):
        """Test message sending with exception."""
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                side_effect=httpx.RequestError("Connection failed")
            )
            
            result = await client.send_message("73982005612", "Test message")
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_send_interactive_message_success(self, client):
        """Test successful interactive message sending."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = '{"messages": [{"id": "msg_123"}]}'
        
        interactive_message = InteractiveMessage(
            type="button",
            body="Please select an option",
            buttons=[Button(id="btn_1", title="Option 1")]
        )
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response
            )
            
            result = await client.send_interactive_message("73982005612", interactive_message)
            
            assert result is True
            mock_client.return_value.__aenter__.return_value.post.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_send_interactive_message_failure(self, client):
        """Test interactive message sending failure."""
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = '{"error": {"message": "Invalid request"}}'
        
        interactive_message = InteractiveMessage(
            type="button",
            body="Please select an option"
        )
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response
            )
            
            result = await client.send_interactive_message("73982005612", interactive_message)
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_mark_as_read_success(self, client):
        """Test successful message read marking."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = '{"success": true}'
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response
            )
            
            result = await client.mark_as_read("msg_123")
            
            assert result is True
            mock_client.return_value.__aenter__.return_value.post.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_mark_as_read_failure(self, client):
        """Test message read marking failure."""
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = '{"error": {"message": "Invalid message ID"}}'
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response
            )
            
            result = await client.mark_as_read("invalid_msg")
            
            assert result is False


class TestWhatsAppClientFactory:
    """Test WhatsApp client factory function."""
    
    @patch('app.services.whatsapp_client.settings')
    def test_get_whatsapp_client(self, mock_settings):
        """Test factory function returns client instance."""
        mock_settings.WHATSAPP_ACCESS_TOKEN = "test_token"
        mock_settings.WHATSAPP_PHONE_NUMBER_ID = "123456789"
        mock_settings.WHATSAPP_API_URL = "https://test.api.com"
        
        client = get_whatsapp_client()
        
        assert isinstance(client, WhatsAppBusinessClient)
        assert client.access_token == "test_token"
        assert client.phone_number_id == "123456789"