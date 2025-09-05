"""
Unit tests for escape command and flow interruption functionality.
"""

import pytest
import uuid
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch

from app.services.flow_engine import FlowEngine, FlowStep, FlowResponse
from app.services.state_manager import StateManager
from app.services.message_builder import MessageBuilder
from app.models.conversation import UserSession, ConversationState


class TestEscapeCommands:
    """Test escape command detection and handling."""
    
    @pytest.fixture
    def mock_state_manager(self):
        """Create mock StateManager for testing."""
        manager = Mock(spec=StateManager)
        manager.get_or_create_session = AsyncMock()
        manager.add_message = AsyncMock()
        manager.record_analytics_event = AsyncMock()
        manager.trigger_handoff = AsyncMock()
        manager.get_conversation_state = AsyncMock()
        manager.update_session_step = AsyncMock()
        return manager
    
    @pytest.fixture
    def mock_message_builder(self):
        """Create mock MessageBuilder for testing."""
        builder = Mock(spec=MessageBuilder)
        builder.build_escape_command_message.return_value = "Transferindo para atendente..."
        builder.build_enhanced_error_message.return_value = Mock(body="Erro", to_dict=Mock(return_value={}))
        builder.build_handoff_offer_message.return_value = Mock(body="Oferta", to_dict=Mock(return_value={}))
        return builder
    
    @pytest.fixture
    def flow_engine(self, mock_state_manager, mock_message_builder):
        """Create FlowEngine instance for testing."""
        return FlowEngine(mock_state_manager, mock_message_builder)
    
    @pytest.fixture
    def mock_session(self):
        """Create mock UserSession for testing."""
        session = Mock(spec=UserSession)
        session.id = uuid.uuid4()
        session.phone_number = "+5511999999999"
        session.current_step = "client_type"
        session.collected_data = {}
        return session
    
    def test_escape_command_detection_basic(self, flow_engine):
        """Test basic escape command detection."""
        # Test basic escape commands
        assert flow_engine._is_escape_command("falar com atendente") is True
        assert flow_engine._is_escape_command("atendimento humano") is True
        assert flow_engine._is_escape_command("atendente") is True
        assert flow_engine._is_escape_command("humano") is True
        assert flow_engine._is_escape_command("sair") is True
        assert flow_engine._is_escape_command("cancelar") is True
    
    def test_escape_command_detection_case_insensitive(self, flow_engine):
        """Test case insensitive escape command detection."""
        assert flow_engine._is_escape_command("FALAR COM ATENDENTE") is True
        assert flow_engine._is_escape_command("Atendente") is True
        assert flow_engine._is_escape_command("HUMANO") is True
    
    def test_escape_command_detection_partial_match(self, flow_engine):
        """Test partial match escape command detection."""
        assert flow_engine._is_escape_command("quero falar com atendente por favor") is True
        assert flow_engine._is_escape_command("preciso de um humano") is True
        assert flow_engine._is_escape_command("quero sair daqui") is True
    
    def test_escape_command_detection_fallback_triggers(self, flow_engine):
        """Test fallback trigger detection."""
        assert flow_engine._is_escape_command("não entendi") is True
        assert flow_engine._is_escape_command("nao entendi") is True
        assert flow_engine._is_escape_command("estou confuso") is True
        assert flow_engine._is_escape_command("estou perdido") is True
        assert flow_engine._is_escape_command("não sei o que fazer") is True
        assert flow_engine._is_escape_command("como funciona isso") is True
    
    def test_escape_command_detection_long_confused_message(self, flow_engine):
        """Test detection of long confused messages."""
        long_message = "Olá, eu não estou entendendo nada do que está acontecendo aqui, estou muito confuso com essas opções"
        assert flow_engine._is_escape_command(long_message) is True
        
        long_message_nao = "Eu nao sei o que fazer, isso está muito complicado para mim, preciso de ajuda"
        assert flow_engine._is_escape_command(long_message_nao) is True
    
    def test_escape_command_detection_normal_messages(self, flow_engine):
        """Test that normal messages are not detected as escape commands."""
        assert flow_engine._is_escape_command("olá") is False
        assert flow_engine._is_escape_command("cliente novo") is False
        assert flow_engine._is_escape_command("direito civil") is False
        assert flow_engine._is_escape_command("sim") is False
        assert flow_engine._is_escape_command("não") is False
        assert flow_engine._is_escape_command("obrigado") is False
    
    @pytest.mark.asyncio
    async def test_handle_escape_command_basic(self, flow_engine, mock_session):
        """Test basic escape command handling."""
        # Setup mocks
        mock_conversation_state = Mock()
        mock_conversation_state.client_type = "client_new"
        mock_conversation_state.practice_area = "area_civil"
        mock_conversation_state.wants_scheduling = True
        mock_conversation_state.scheduling_preference = "type_presencial"
        mock_conversation_state.custom_requests = ["Urgente"]
        
        flow_engine.state_manager.get_conversation_state.return_value = mock_conversation_state
        
        # Execute escape command handling
        result = await flow_engine._handle_escape_command(mock_session)
        
        # Verify result
        assert isinstance(result, FlowResponse)
        assert result.should_handoff is True
        assert result.next_step is None
        assert len(result.messages) == 1
        assert result.messages[0]["type"] == "text"
        assert "handoff_context" in result.messages[0]["metadata"]
        
        # Verify context preservation
        context_data = result.collected_data
        assert context_data["current_step"] == mock_session.current_step
        assert context_data["conversation_state"]["client_type"] == "client_new"
        assert context_data["conversation_state"]["practice_area"] == "area_civil"
        
        # Verify analytics event
        assert len(result.analytics_events) == 1
        assert result.analytics_events[0]["event_type"] == "handoff_triggered"
        assert result.analytics_events[0]["event_data"]["trigger"] == "escape_command"
        assert result.analytics_events[0]["event_data"]["context_preserved"] is True
        
        # Verify state manager calls
        flow_engine.state_manager.trigger_handoff.assert_called_once_with(mock_session.id)
        flow_engine.state_manager.record_analytics_event.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_handle_escape_command_no_conversation_state(self, flow_engine, mock_session):
        """Test escape command handling without conversation state."""
        # Setup mocks
        flow_engine.state_manager.get_conversation_state.return_value = None
        
        # Execute escape command handling
        result = await flow_engine._handle_escape_command(mock_session)
        
        # Verify result
        assert isinstance(result, FlowResponse)
        assert result.should_handoff is True
        
        # Verify context data handles missing state
        context_data = result.collected_data
        assert context_data["current_step"] == mock_session.current_step
        assert context_data["conversation_state"] == {}
    
    @pytest.mark.asyncio
    async def test_handle_invalid_input_first_time(self, flow_engine, mock_session):
        """Test handling invalid input for the first time."""
        # Setup
        mock_session.collected_data = {}
        
        # Execute
        result = await flow_engine._handle_invalid_input(mock_session, FlowStep.CLIENT_TYPE)
        
        # Verify
        assert isinstance(result, FlowResponse)
        assert result.should_handoff is False
        assert result.next_step == FlowStep.CLIENT_TYPE
        assert result.collected_data["invalid_input_count"] == 1
        
        # Verify analytics
        assert len(result.analytics_events) == 1
        assert result.analytics_events[0]["event_type"] == "invalid_input"
        assert result.analytics_events[0]["event_data"]["invalid_count"] == 1
        assert result.analytics_events[0]["event_data"]["escalation_threshold"] is False
    
    @pytest.mark.asyncio
    async def test_handle_invalid_input_second_time(self, flow_engine, mock_session):
        """Test handling invalid input for the second time."""
        # Setup
        mock_session.collected_data = {"invalid_input_count": 1}
        
        # Execute
        result = await flow_engine._handle_invalid_input(mock_session, FlowStep.CLIENT_TYPE)
        
        # Verify
        assert result.collected_data["invalid_input_count"] == 2
        assert result.analytics_events[0]["event_data"]["escalation_threshold"] is True
        
        # Verify enhanced error message is used
        flow_engine.message_builder.build_enhanced_error_message.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_handle_invalid_input_third_time_triggers_handoff_offer(self, flow_engine, mock_session):
        """Test that third invalid input triggers handoff offer."""
        # Setup
        mock_session.collected_data = {"invalid_input_count": 2}
        
        # Execute
        result = await flow_engine._handle_repeated_invalid_inputs(mock_session, FlowStep.CLIENT_TYPE)
        
        # Verify
        assert isinstance(result, FlowResponse)
        assert result.should_handoff is False  # Offer, don't force
        assert result.collected_data["handoff_offered"] is True
        
        # Verify analytics
        assert len(result.analytics_events) == 1
        assert result.analytics_events[0]["event_type"] == "handoff_offered"
        assert result.analytics_events[0]["event_data"]["reason"] == "repeated_invalid_inputs"
        
        # Verify handoff offer message is built
        flow_engine.message_builder.build_handoff_offer_message.assert_called_once()
        
        # Verify user struggling event is recorded
        flow_engine.state_manager.record_analytics_event.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_universal_button_responses(self, flow_engine, mock_session):
        """Test universal button response handling."""
        # Test that universal responses are properly mapped
        assert "human_agent" in flow_engine.universal_responses
        assert "accept_handoff" in flow_engine.universal_responses
        assert "restart_flow" in flow_engine.universal_responses
        assert "try_again" in flow_engine.universal_responses
        assert "explain_options" in flow_engine.universal_responses
        assert "continue_bot" in flow_engine.universal_responses
        
        # Verify handlers are callable
        for button_id, handler in flow_engine.universal_responses.items():
            assert callable(handler)
    
    @pytest.mark.asyncio
    async def test_handle_restart_flow(self, flow_engine, mock_session):
        """Test flow restart handling."""
        # Setup
        flow_engine.message_builder.build_welcome_message.return_value = Mock(
            body="Welcome", to_dict=Mock(return_value={})
        )
        
        # Execute
        result = await flow_engine._handle_restart_flow(mock_session)
        
        # Verify
        assert isinstance(result, FlowResponse)
        assert result.next_step == FlowStep.CLIENT_TYPE
        assert result.should_handoff is False
        
        # Verify session reset
        flow_engine.state_manager.reset_session.assert_called_once_with(mock_session.id)
        
        # Verify analytics
        assert len(result.analytics_events) == 1
        assert result.analytics_events[0]["event_type"] == "flow_restarted"
    
    @pytest.mark.asyncio
    async def test_handle_try_again(self, flow_engine, mock_session):
        """Test try again handling."""
        # Setup
        mock_session.current_step = "client_type"
        mock_session.collected_data = {"invalid_input_count": 2}
        flow_engine.message_builder.build_welcome_message.return_value = Mock(
            body="Welcome", to_dict=Mock(return_value={})
        )
        
        # Execute
        result = await flow_engine._handle_try_again(mock_session)
        
        # Verify
        assert isinstance(result, FlowResponse)
        assert result.collected_data["invalid_input_count"] == 0
        
        # Verify analytics
        assert len(result.analytics_events) == 1
        assert result.analytics_events[0]["event_type"] == "try_again_requested"
    
    @pytest.mark.asyncio
    async def test_handle_explain_options(self, flow_engine, mock_session):
        """Test explain options handling."""
        # Setup
        mock_session.current_step = "client_type"
        flow_engine.message_builder.build_step_explanation_message.return_value = "Explanation text"
        
        # Execute
        result = await flow_engine._handle_explain_options(mock_session)
        
        # Verify
        assert isinstance(result, FlowResponse)
        assert result.should_handoff is False
        assert len(result.messages) == 1
        assert result.messages[0]["type"] == "text"
        
        # Verify explanation message is built
        flow_engine.message_builder.build_step_explanation_message.assert_called_once_with("client_type")
        
        # Verify analytics
        assert len(result.analytics_events) == 1
        assert result.analytics_events[0]["event_type"] == "explanation_requested"
    
    @pytest.mark.asyncio
    async def test_handle_continue_bot(self, flow_engine, mock_session):
        """Test continue bot handling."""
        # Setup
        mock_session.current_step = "client_type"
        mock_session.collected_data = {"invalid_input_count": 2, "handoff_offered": True}
        
        # Mock the try_again response
        try_again_response = FlowResponse(
            messages=[{"type": "interactive", "content": "Try again"}],
            next_step=FlowStep.CLIENT_TYPE,
            should_handoff=False,
            collected_data={},
            analytics_events=[]
        )
        
        with patch.object(flow_engine, '_handle_try_again', return_value=try_again_response):
            # Execute
            result = await flow_engine._handle_continue_bot(mock_session)
        
        # Verify
        assert isinstance(result, FlowResponse)
        assert result.should_handoff is False
        assert len(result.messages) == 2  # Continue message + try again message
        assert "Perfeito! Vamos continuar" in result.messages[0]["content"]
        
        # Verify analytics
        assert len(result.analytics_events) == 1
        assert result.analytics_events[0]["event_type"] == "continue_bot_chosen"


class TestMessageBuilderEscapeCommands:
    """Test message builder escape command functionality."""
    
    @pytest.fixture
    def message_builder(self):
        """Create MessageBuilder instance for testing."""
        return MessageBuilder()
    
    def test_build_step_explanation_message_client_type(self, message_builder):
        """Test step explanation for client type."""
        result = message_builder.build_step_explanation_message("client_type")
        
        assert "Cliente Novo" in result
        assert "Cliente Existente" in result
        assert "Primeira vez" in result
    
    def test_build_step_explanation_message_practice_area(self, message_builder):
        """Test step explanation for practice area."""
        result = message_builder.build_step_explanation_message("practice_area")
        
        assert "Direito Civil" in result
        assert "Direito de Família" in result
        assert "Direito Trabalhista" in result
        assert "Direito Criminal" in result
        assert "Direito Empresarial" in result
    
    def test_build_step_explanation_message_scheduling_offer(self, message_builder):
        """Test step explanation for scheduling offer."""
        result = message_builder.build_step_explanation_message("scheduling_offer")
        
        assert "Agendamento" in result
        assert "Informações" in result
        assert "consulta" in result
    
    def test_build_step_explanation_message_scheduling_type(self, message_builder):
        """Test step explanation for scheduling type."""
        result = message_builder.build_step_explanation_message("scheduling_type")
        
        assert "Presencial" in result
        assert "Online" in result
        assert "videochamada" in result
    
    def test_build_step_explanation_message_unknown_step(self, message_builder):
        """Test step explanation for unknown step."""
        result = message_builder.build_step_explanation_message("unknown_step")
        
        assert "Desculpe" in result
        assert "atendente" in result


class TestEscapeCommandIntegration:
    """Integration tests for escape command functionality."""
    
    @pytest.mark.asyncio
    async def test_escape_command_end_to_end(self):
        """Test complete escape command flow from message to handoff."""
        # This would be an integration test that tests the full flow
        # from receiving a message with escape command to triggering handoff
        # For now, we'll keep it as a placeholder for future implementation
        pass
    
    @pytest.mark.asyncio
    async def test_repeated_invalid_inputs_end_to_end(self):
        """Test complete repeated invalid inputs flow."""
        # This would test the full flow of a user making multiple invalid inputs
        # until they get offered a handoff
        pass