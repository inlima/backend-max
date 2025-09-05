"""
Tests for flow engine functionality.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
import uuid

from app.services.flow_engine import (
    FlowEngine, 
    FlowStep, 
    FlowResponse, 
    ProcessedMessage,
    MessageDirection,
    get_flow_engine
)
from app.services.message_builder import MessageBuilder
from app.services.state_manager import StateManager
from app.models.conversation import UserSession, ConversationState


class TestProcessedMessage:
    """Test ProcessedMessage dataclass."""
    
    def test_processed_message_creation(self):
        """Test ProcessedMessage creation."""
        msg = ProcessedMessage(
            content="Hello",
            message_type="text",
            button_id="test_button",
            is_escape_command=False,
            is_valid_input=True
        )
        
        assert msg.content == "Hello"
        assert msg.message_type == "text"
        assert msg.button_id == "test_button"
        assert msg.is_escape_command is False
        assert msg.is_valid_input is True


class TestFlowResponse:
    """Test FlowResponse dataclass."""
    
    def test_flow_response_creation(self):
        """Test FlowResponse creation."""
        response = FlowResponse(
            messages=[{"type": "text", "content": "Hello"}],
            next_step=FlowStep.CLIENT_TYPE,
            should_handoff=False,
            collected_data={"test": "data"},
            analytics_events=[{"event_type": "test"}]
        )
        
        assert len(response.messages) == 1
        assert response.next_step == FlowStep.CLIENT_TYPE
        assert response.should_handoff is False
        assert response.collected_data["test"] == "data"
        assert len(response.analytics_events) == 1


class TestFlowEngine:
    """Test FlowEngine class functionality."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.mock_state_manager = AsyncMock(spec=StateManager)
        self.mock_message_builder = MagicMock(spec=MessageBuilder)
        self.flow_engine = FlowEngine(
            state_manager=self.mock_state_manager,
            message_builder=self.mock_message_builder
        )
        
        # Create mock session
        self.mock_session = MagicMock(spec=UserSession)
        self.mock_session.id = uuid.uuid4()
        self.mock_session.phone_number = "5511999999999"
        self.mock_session.current_step = "welcome"
        
        # Create mock conversation state
        self.mock_conversation_state = MagicMock(spec=ConversationState)
        self.mock_conversation_state.practice_area = "area_civil"
    
    def test_initialization(self):
        """Test FlowEngine initialization."""
        assert self.flow_engine.state_manager == self.mock_state_manager
        assert self.flow_engine.message_builder == self.mock_message_builder
        assert len(self.flow_engine.escape_commands) > 0
        assert len(self.flow_engine.valid_responses) > 0
    
    def test_escape_commands(self):
        """Test escape command detection."""
        escape_phrases = [
            "falar com atendente",
            "atendimento humano",
            "atendente",
            "humano",
            "pessoa",
            "operador",
            "sair",
            "parar",
            "cancelar"
        ]
        
        for phrase in escape_phrases:
            assert self.flow_engine._is_escape_command(phrase)
            assert self.flow_engine._is_escape_command(phrase.upper())
            assert self.flow_engine._is_escape_command(f"  {phrase}  ")
    
    def test_process_incoming_message_text(self):
        """Test processing text messages."""
        message = {
            "type": "text",
            "text": {"body": "Hello world"}
        }
        
        processed = self.flow_engine._process_incoming_message(message)
        
        assert processed.content == "Hello world"
        assert processed.message_type == "text"
        assert processed.button_id is None
        assert processed.is_valid_input is True
    
    def test_process_incoming_message_button(self):
        """Test processing button messages."""
        message = {
            "type": "interactive",
            "interactive": {
                "type": "button_reply",
                "button_reply": {
                    "id": "client_new",
                    "title": "Sou Cliente Novo"
                }
            }
        }
        
        processed = self.flow_engine._process_incoming_message(message)
        
        assert processed.content == "Sou Cliente Novo"
        assert processed.message_type == "button"
        assert processed.button_id == "client_new"
        assert processed.is_valid_input is True
    
    def test_process_incoming_message_escape_command(self):
        """Test processing escape command messages."""
        message = {
            "type": "text",
            "text": {"body": "falar com atendente"}
        }
        
        processed = self.flow_engine._process_incoming_message(message)
        
        assert processed.is_escape_command is True
    
    def test_get_current_step_valid(self):
        """Test getting valid current step."""
        self.mock_session.current_step = "client_type"
        
        step = self.flow_engine._get_current_step(self.mock_session)
        
        assert step == FlowStep.CLIENT_TYPE
    
    def test_get_current_step_invalid(self):
        """Test getting invalid current step defaults to welcome."""
        self.mock_session.current_step = "invalid_step"
        
        step = self.flow_engine._get_current_step(self.mock_session)
        
        assert step == FlowStep.WELCOME
    
    def test_get_current_step_none(self):
        """Test getting None current step defaults to welcome."""
        self.mock_session.current_step = None
        
        step = self.flow_engine._get_current_step(self.mock_session)
        
        assert step == FlowStep.WELCOME
    
    @pytest.mark.asyncio
    async def test_handle_welcome_step(self):
        """Test handling welcome step."""
        # Setup mock message builder
        mock_welcome_msg = MagicMock()
        mock_welcome_msg.body = "Welcome message"
        mock_welcome_msg.to_dict.return_value = {"type": "interactive"}
        self.mock_message_builder.build_welcome_message.return_value = mock_welcome_msg
        
        processed_msg = ProcessedMessage(
            content="Hello",
            message_type="text",
            is_valid_input=True
        )
        
        response = await self.flow_engine._handle_welcome_step(self.mock_session, processed_msg)
        
        assert isinstance(response, FlowResponse)
        assert len(response.messages) == 1
        assert response.next_step == FlowStep.CLIENT_TYPE
        assert response.should_handoff is False
        assert len(response.analytics_events) == 1
        assert response.analytics_events[0]["event_type"] == "flow_start"
        
        # Verify state manager was called
        self.mock_state_manager.update_session_step.assert_called_once_with(
            self.mock_session.id, 
            FlowStep.CLIENT_TYPE.value
        )
    
    @pytest.mark.asyncio
    async def test_handle_client_type_step_valid(self):
        """Test handling valid client type selection."""
        # Setup mock message builder
        mock_confirmation_msg = "Confirmation message"
        mock_practice_area_msg = MagicMock()
        mock_practice_area_msg.body = "Practice area message"
        mock_practice_area_msg.to_dict.return_value = {"type": "interactive"}
        
        self.mock_message_builder.build_client_type_confirmation.return_value = mock_confirmation_msg
        self.mock_message_builder.build_practice_area_message.return_value = mock_practice_area_msg
        
        # Mock extended message
        mock_extended_msg = MagicMock()
        mock_extended_msg.body = "Extended options"
        mock_extended_msg.buttons = [MagicMock()]
        mock_extended_msg.to_dict.return_value = {"type": "interactive"}
        self.mock_message_builder.build_practice_area_extended_message.return_value = mock_extended_msg
        
        processed_msg = ProcessedMessage(
            content="Sou Cliente Novo",
            message_type="button",
            button_id="client_new",
            is_valid_input=True
        )
        
        response = await self.flow_engine._handle_client_type_step(self.mock_session, processed_msg)
        
        assert isinstance(response, FlowResponse)
        assert len(response.messages) == 3  # confirmation + practice area + extended
        assert response.next_step == FlowStep.PRACTICE_AREA
        assert response.should_handoff is False
        assert response.collected_data["client_type"] == "client_new"
        assert len(response.analytics_events) == 1
        
        # Verify state manager calls
        self.mock_state_manager.update_conversation_data.assert_called_once_with(
            self.mock_session.id,
            {"client_type": "client_new"}
        )
        self.mock_state_manager.update_session_step.assert_called_once_with(
            self.mock_session.id,
            FlowStep.PRACTICE_AREA.value
        )
    
    @pytest.mark.asyncio
    async def test_handle_client_type_step_invalid(self):
        """Test handling invalid client type selection."""
        processed_msg = ProcessedMessage(
            content="Invalid",
            message_type="button",
            button_id="invalid_button",
            is_valid_input=True
        )
        
        # Mock error fallback message
        mock_error_msg = MagicMock()
        mock_error_msg.body = "Error message"
        mock_error_msg.to_dict.return_value = {"type": "interactive"}
        self.mock_message_builder.build_error_fallback_message.return_value = mock_error_msg
        
        response = await self.flow_engine._handle_client_type_step(self.mock_session, processed_msg)
        
        assert isinstance(response, FlowResponse)
        assert len(response.messages) == 1
        assert response.next_step == FlowStep.CLIENT_TYPE  # Stay on same step
        assert response.should_handoff is False
        assert len(response.analytics_events) == 1
        assert response.analytics_events[0]["event_type"] == "invalid_input"
    
    @pytest.mark.asyncio
    async def test_handle_practice_area_step_valid(self):
        """Test handling valid practice area selection."""
        # Setup mock message builder
        mock_scheduling_msg = MagicMock()
        mock_scheduling_msg.body = "Scheduling message"
        mock_scheduling_msg.to_dict.return_value = {"type": "interactive"}
        self.mock_message_builder.build_scheduling_offer_message.return_value = mock_scheduling_msg
        
        processed_msg = ProcessedMessage(
            content="Direito Civil",
            message_type="button",
            button_id="area_civil",
            is_valid_input=True
        )
        
        response = await self.flow_engine._handle_practice_area_step(self.mock_session, processed_msg)
        
        assert isinstance(response, FlowResponse)
        assert len(response.messages) == 1
        assert response.next_step == FlowStep.SCHEDULING_OFFER
        assert response.should_handoff is False
        assert response.collected_data["practice_area"] == "area_civil"
        
        # Verify state manager calls
        self.mock_state_manager.update_conversation_data.assert_called_once_with(
            self.mock_session.id,
            {"practice_area": "area_civil"}
        )
    
    @pytest.mark.asyncio
    async def test_handle_scheduling_offer_step_yes(self):
        """Test handling scheduling offer acceptance."""
        # Setup mock message builder
        mock_scheduling_type_msg = MagicMock()
        mock_scheduling_type_msg.body = "Scheduling type message"
        mock_scheduling_type_msg.to_dict.return_value = {"type": "interactive"}
        self.mock_message_builder.build_scheduling_type_message.return_value = mock_scheduling_type_msg
        
        processed_msg = ProcessedMessage(
            content="Sim, quero agendar",
            message_type="button",
            button_id="schedule_yes",
            is_valid_input=True
        )
        
        response = await self.flow_engine._handle_scheduling_offer_step(self.mock_session, processed_msg)
        
        assert isinstance(response, FlowResponse)
        assert len(response.messages) == 1
        assert response.next_step == FlowStep.SCHEDULING_TYPE
        assert response.should_handoff is False
        assert response.collected_data["wants_scheduling"] is True
        
        # Verify state manager calls
        self.mock_state_manager.update_conversation_data.assert_called_once_with(
            self.mock_session.id,
            {"wants_scheduling": True}
        )
    
    @pytest.mark.asyncio
    async def test_handle_scheduling_offer_step_no(self):
        """Test handling scheduling offer rejection (information only)."""
        # Setup mock for information only completion
        self.mock_state_manager.get_conversation_state.return_value = self.mock_conversation_state
        
        mock_info_msg = "Information only message"
        self.mock_message_builder.build_information_only_message.return_value = mock_info_msg
        
        processed_msg = ProcessedMessage(
            content="Não, só informações",
            message_type="button",
            button_id="schedule_no",
            is_valid_input=True
        )
        
        response = await self.flow_engine._handle_scheduling_offer_step(self.mock_session, processed_msg)
        
        assert isinstance(response, FlowResponse)
        assert len(response.messages) == 1
        assert response.next_step == FlowStep.COMPLETED
        assert response.should_handoff is True
        
        # Verify state manager calls
        self.mock_state_manager.update_conversation_data.assert_called_once_with(
            self.mock_session.id,
            {"wants_scheduling": False}
        )
        self.mock_state_manager.update_session_step.assert_called_with(
            self.mock_session.id,
            FlowStep.COMPLETED.value
        )
        self.mock_state_manager.mark_flow_completed.assert_called_once_with(self.mock_session.id)
    
    @pytest.mark.asyncio
    async def test_handle_scheduling_type_step_valid(self):
        """Test handling valid scheduling type selection."""
        mock_confirmation_msg = "Confirmation message"
        self.mock_message_builder.build_scheduling_confirmation_message.return_value = mock_confirmation_msg
        
        processed_msg = ProcessedMessage(
            content="Presencial",
            message_type="button",
            button_id="type_presencial",
            is_valid_input=True
        )
        
        response = await self.flow_engine._handle_scheduling_type_step(self.mock_session, processed_msg)
        
        assert isinstance(response, FlowResponse)
        assert len(response.messages) == 1
        assert response.next_step == FlowStep.COMPLETED
        assert response.should_handoff is True
        assert response.collected_data["scheduling_preference"] == "type_presencial"
        assert len(response.analytics_events) == 2  # step_completed + flow_completed
        
        # Verify state manager calls
        self.mock_state_manager.update_conversation_data.assert_called_once_with(
            self.mock_session.id,
            {"scheduling_preference": "type_presencial"}
        )
        self.mock_state_manager.update_session_step.assert_called_with(
            self.mock_session.id,
            FlowStep.COMPLETED.value
        )
        self.mock_state_manager.mark_flow_completed.assert_called_once_with(self.mock_session.id)
    
    @pytest.mark.asyncio
    async def test_handle_escape_command(self):
        """Test handling escape command."""
        mock_escape_msg = "Escape message"
        self.mock_message_builder.build_escape_command_message.return_value = mock_escape_msg
        
        response = await self.flow_engine._handle_escape_command(self.mock_session)
        
        assert isinstance(response, FlowResponse)
        assert len(response.messages) == 1
        assert response.next_step is None
        assert response.should_handoff is True
        assert len(response.analytics_events) == 1
        assert response.analytics_events[0]["event_type"] == "handoff_triggered"
        
        # Verify state manager call
        self.mock_state_manager.trigger_handoff.assert_called_once_with(self.mock_session.id)
    
    @pytest.mark.asyncio
    async def test_handle_reengagement(self):
        """Test handling re-engagement."""
        mock_reengagement_msg = MagicMock()
        mock_reengagement_msg.body = "Reengagement message"
        mock_reengagement_msg.to_dict.return_value = {"type": "interactive"}
        self.mock_message_builder.build_reengagement_message.return_value = mock_reengagement_msg
        
        response = await self.flow_engine.handle_reengagement(self.mock_session)
        
        assert isinstance(response, FlowResponse)
        assert len(response.messages) == 1
        assert response.next_step == FlowStep.WELCOME
        assert response.should_handoff is False
        assert len(response.analytics_events) == 1
        assert response.analytics_events[0]["event_type"] == "reengagement_sent"
    
    @pytest.mark.asyncio
    async def test_reset_flow(self):
        """Test resetting conversation flow."""
        session_id = uuid.uuid4()
        
        await self.flow_engine.reset_flow(session_id)
        
        self.mock_state_manager.reset_session.assert_called_once_with(session_id)
    
    def test_validate_input(self):
        """Test input validation."""
        # Test valid input
        assert self.flow_engine.validate_input("Hello", FlowStep.WELCOME) is True
        
        # Test empty input
        assert self.flow_engine.validate_input("", FlowStep.WELCOME) is False
        assert self.flow_engine.validate_input("   ", FlowStep.WELCOME) is False
    
    @pytest.mark.asyncio
    async def test_process_message_full_flow(self):
        """Test complete message processing flow."""
        # Setup mocks
        self.mock_state_manager.get_or_create_session.return_value = self.mock_session
        
        mock_welcome_msg = MagicMock()
        mock_welcome_msg.body = "Welcome message"
        mock_welcome_msg.to_dict.return_value = {"type": "interactive"}
        self.mock_message_builder.build_welcome_message.return_value = mock_welcome_msg
        
        message = {
            "type": "text",
            "text": {"body": "Hello"}
        }
        
        response = await self.flow_engine.process_message(
            user_id="test_user",
            phone_number="5511999999999",
            message=message
        )
        
        assert isinstance(response, FlowResponse)
        assert len(response.messages) >= 1
        
        # Verify state manager calls
        self.mock_state_manager.get_or_create_session.assert_called_once_with("5511999999999")
        self.mock_state_manager.add_message.assert_called()
        self.mock_state_manager.record_analytics_event.assert_called()
    
    @pytest.mark.asyncio
    async def test_process_message_with_escape_command(self):
        """Test processing message with escape command."""
        # Setup mocks
        self.mock_state_manager.get_or_create_session.return_value = self.mock_session
        
        mock_escape_msg = "Escape message"
        self.mock_message_builder.build_escape_command_message.return_value = mock_escape_msg
        
        message = {
            "type": "text",
            "text": {"body": "falar com atendente"}
        }
        
        response = await self.flow_engine.process_message(
            user_id="test_user",
            phone_number="5511999999999",
            message=message
        )
        
        assert isinstance(response, FlowResponse)
        assert response.should_handoff is True
        
        # Verify handoff was triggered
        self.mock_state_manager.trigger_handoff.assert_called_once_with(self.mock_session.id)
    
    @pytest.mark.asyncio
    async def test_process_message_error_handling(self):
        """Test error handling in message processing."""
        # Setup mock to raise exception
        self.mock_state_manager.get_or_create_session.side_effect = Exception("Database error")
        
        message = {
            "type": "text",
            "text": {"body": "Hello"}
        }
        
        response = await self.flow_engine.process_message(
            user_id="test_user",
            phone_number="5511999999999",
            message=message
        )
        
        assert isinstance(response, FlowResponse)
        assert len(response.messages) == 1
        assert "erro" in response.messages[0]["content"].lower()
        assert response.should_handoff is False
        assert len(response.analytics_events) == 1
        assert response.analytics_events[0]["event_type"] == "error"


class TestFlowEngineFactory:
    """Test FlowEngine factory function."""
    
    def test_get_flow_engine(self):
        """Test factory function returns FlowEngine instance."""
        mock_state_manager = MagicMock(spec=StateManager)
        
        engine = get_flow_engine(mock_state_manager)
        
        assert isinstance(engine, FlowEngine)
        assert engine.state_manager == mock_state_manager


class TestFlowEngineIntegration:
    """Integration tests for FlowEngine with real message builder."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.mock_state_manager = AsyncMock(spec=StateManager)
        # Use real message builder for integration testing
        self.flow_engine = FlowEngine(state_manager=self.mock_state_manager)
        
        # Create mock session
        self.mock_session = MagicMock(spec=UserSession)
        self.mock_session.id = uuid.uuid4()
        self.mock_session.phone_number = "5511999999999"
        self.mock_session.current_step = "welcome"
    
    @pytest.mark.asyncio
    async def test_welcome_step_with_real_messages(self):
        """Test welcome step with real message builder."""
        processed_msg = ProcessedMessage(
            content="Hello",
            message_type="text",
            is_valid_input=True
        )
        
        response = await self.flow_engine._handle_welcome_step(self.mock_session, processed_msg)
        
        assert isinstance(response, FlowResponse)
        assert len(response.messages) == 1
        assert "Bem-vindo" in response.messages[0]["content"]
        assert response.next_step == FlowStep.CLIENT_TYPE
    
    @pytest.mark.asyncio
    async def test_client_type_step_with_real_messages(self):
        """Test client type step with real message builder."""
        processed_msg = ProcessedMessage(
            content="Sou Cliente Novo",
            message_type="button",
            button_id="client_new",
            is_valid_input=True
        )
        
        response = await self.flow_engine._handle_client_type_step(self.mock_session, processed_msg)
        
        assert isinstance(response, FlowResponse)
        assert len(response.messages) >= 2  # confirmation + practice area selection
        assert "cliente novo" in response.messages[0]["content"].lower()
        assert "área jurídica" in response.messages[1]["content"].lower()
        assert response.next_step == FlowStep.PRACTICE_AREA
    
    @pytest.mark.asyncio
    async def test_complete_scheduling_flow_with_real_messages(self):
        """Test complete scheduling flow with real message builder."""
        # Mock conversation state
        mock_conversation_state = MagicMock(spec=ConversationState)
        mock_conversation_state.practice_area = "area_civil"
        self.mock_state_manager.get_conversation_state.return_value = mock_conversation_state
        
        # Test scheduling type selection
        processed_msg = ProcessedMessage(
            content="Presencial",
            message_type="button",
            button_id="type_presencial",
            is_valid_input=True
        )
        
        response = await self.flow_engine._handle_scheduling_type_step(self.mock_session, processed_msg)
        
        assert isinstance(response, FlowResponse)
        assert len(response.messages) == 1
        assert "PRESENCIAL" in response.messages[0]["content"]
        assert "registrada" in response.messages[0]["content"].lower()
        assert response.should_handoff is True
        assert response.next_step == FlowStep.COMPLETED