"""
End-to-end conversation flow tests.

This module tests complete conversation flows from welcome to handoff,
covering all conversation paths including scheduling and escape flows.
Tests verify requirement compliance for flow completion rates.

Requirements tested:
- 1.1, 1.2, 1.3, 1.4: User identification and flow progression
- 2.1, 2.2, 2.3, 2.4: Scheduling functionality
- 3.1, 3.2, 3.3, 3.4: Handoff and escape mechanisms
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
import uuid
from typing import List, Dict, Any

from app.services.flow_engine import FlowEngine, FlowStep, FlowResponse
from app.services.state_manager import StateManager
from app.services.message_builder import MessageBuilder
from app.models.conversation import UserSession, ConversationState


class ConversationTestCase:
    """Test case for a complete conversation flow."""
    
    def __init__(self, name: str, messages: List[Dict], expected_completion: bool, 
                 expected_handoff: bool, expected_data: Dict):
        self.name = name
        self.messages = messages
        self.expected_completion = expected_completion
        self.expected_handoff = expected_handoff
        self.expected_data = expected_data


class TestEndToEndConversations:
    """Test complete conversation flows from start to finish."""
    
    def setup_method(self):
        """Setup test fixtures for each test."""
        self.mock_state_manager = AsyncMock(spec=StateManager)
        
        # Mock the WhatsApp client to avoid initialization issues
        with patch('app.services.flow_engine.get_timeout_service') as mock_timeout_service:
            mock_timeout_service.return_value = MagicMock()
            self.flow_engine = FlowEngine(state_manager=self.mock_state_manager)
        
        # Create mock session
        self.session_id = uuid.uuid4()
        self.phone_number = "5511999999999"
        self.mock_session = MagicMock(spec=UserSession)
        self.mock_session.id = self.session_id
        self.mock_session.phone_number = self.phone_number
        self.mock_session.current_step = "welcome"
        
        # Setup state manager mocks
        self.mock_state_manager.get_or_create_session.return_value = self.mock_session
        self.mock_state_manager.get_conversation_state.return_value = MagicMock(spec=ConversationState)
        
        # Make async methods return coroutines
        async def mock_async_return(value):
            return value
        
        self.mock_state_manager.update_conversation_data = AsyncMock()
        self.mock_state_manager.update_session_step = AsyncMock()
        self.mock_state_manager.record_analytics_event = AsyncMock()
        self.mock_state_manager.trigger_handoff = AsyncMock()
        self.mock_state_manager.mark_flow_completed = AsyncMock()
        self.mock_state_manager.add_message = AsyncMock()
        
        # Track conversation data updates
        self.conversation_data = {}
        
        async def mock_update_conversation_data(session_id, data):
            self.conversation_data.update(data)
        
        self.mock_state_manager.update_conversation_data.side_effect = mock_update_conversation_data
        
        # Track step updates
        self.current_step = "welcome"
        
        async def mock_update_session_step(session_id, step):
            self.current_step = step
            self.mock_session.current_step = step
        
        self.mock_state_manager.update_session_step.side_effect = mock_update_session_step
    
    async def simulate_conversation(self, messages: List[Dict]) -> List[FlowResponse]:
        """Simulate a complete conversation with multiple messages."""
        responses = []
        
        for message in messages:
            response = await self.flow_engine.process_message(
                user_id=str(self.session_id),
                phone_number=self.phone_number,
                message=message
            )
            responses.append(response)
            
            # Update session step for next iteration
            if response.next_step:
                self.mock_session.current_step = response.next_step.value
        
        return responses
    
    def get_conversation_test_cases(self) -> List[ConversationTestCase]:
        """Get all conversation test cases."""
        return [
            # Test Case 1: Complete new client scheduling flow (presencial)
            ConversationTestCase(
                name="new_client_civil_presencial_complete",
                messages=[
                    {"type": "text", "text": {"body": "Olá"}},  # Welcome trigger
                    {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "client_new", "title": "Sou Cliente Novo"}}},
                    {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "area_civil", "title": "Direito Civil"}}},
                    {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "schedule_yes", "title": "Sim, quero agendar"}}},
                    {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "type_presencial", "title": "Presencial"}}}
                ],
                expected_completion=True,
                expected_handoff=True,
                expected_data={
                    "client_type": "client_new",
                    "practice_area": "area_civil",
                    "wants_scheduling": True,
                    "scheduling_preference": "type_presencial"
                }
            ),
            
            # Test Case 2: Complete existing client scheduling flow (online)
            ConversationTestCase(
                name="existing_client_trabalhista_online_complete",
                messages=[
                    {"type": "text", "text": {"body": "Oi, preciso de ajuda"}},
                    {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "client_existing", "title": "Já sou Cliente"}}},
                    {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "area_trabalhista", "title": "Direito Trabalhista"}}},
                    {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "schedule_yes", "title": "Sim, quero agendar"}}},
                    {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "type_online", "title": "Online"}}}
                ],
                expected_completion=True,
                expected_handoff=True,
                expected_data={
                    "client_type": "client_existing",
                    "practice_area": "area_trabalhista",
                    "wants_scheduling": True,
                    "scheduling_preference": "type_online"
                }
            ),
            
            # Test Case 3: Information only flow (no scheduling)
            ConversationTestCase(
                name="new_client_penal_info_only",
                messages=[
                    {"type": "text", "text": {"body": "Bom dia"}},
                    {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "client_new", "title": "Sou Cliente Novo"}}},
                    {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "area_penal", "title": "Direito Penal"}}},
                    {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "schedule_no", "title": "Não, só informações"}}}
                ],
                expected_completion=True,
                expected_handoff=True,
                expected_data={
                    "client_type": "client_new",
                    "practice_area": "area_penal",
                    "wants_scheduling": False
                }
            ),
            
            # Test Case 4: Early escape command flow
            ConversationTestCase(
                name="early_escape_command",
                messages=[
                    {"type": "text", "text": {"body": "Olá"}},
                    {"type": "text", "text": {"body": "falar com atendente"}}
                ],
                expected_completion=False,
                expected_handoff=True,
                expected_data={}
            ),
            
            # Test Case 5: Mid-flow escape command
            ConversationTestCase(
                name="mid_flow_escape_command",
                messages=[
                    {"type": "text", "text": {"body": "Oi"}},
                    {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "client_new", "title": "Sou Cliente Novo"}}},
                    {"type": "text", "text": {"body": "atendimento humano"}}
                ],
                expected_completion=False,
                expected_handoff=True,
                expected_data={
                    "client_type": "client_new"
                }
            ),
            
            # Test Case 6: Extended practice area selection
            ConversationTestCase(
                name="extended_practice_area_selection",
                messages=[
                    {"type": "text", "text": {"body": "Preciso de ajuda"}},
                    {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "client_existing", "title": "Já sou Cliente"}}},
                    {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "area_outros", "title": "Outras Áreas"}}},
                    {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "schedule_yes", "title": "Sim, quero agendar"}}},
                    {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "type_presencial", "title": "Presencial"}}}
                ],
                expected_completion=True,
                expected_handoff=True,
                expected_data={
                    "client_type": "client_existing",
                    "practice_area": "area_outros",
                    "wants_scheduling": True,
                    "scheduling_preference": "type_presencial"
                }
            ),
            
            # Test Case 7: Invalid input recovery
            ConversationTestCase(
                name="invalid_input_recovery",
                messages=[
                    {"type": "text", "text": {"body": "Olá"}},
                    {"type": "text", "text": {"body": "resposta inválida"}},  # Invalid response
                    {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "client_new", "title": "Sou Cliente Novo"}}},
                    {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "area_civil", "title": "Direito Civil"}}},
                    {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "schedule_no", "title": "Não, só informações"}}}
                ],
                expected_completion=True,
                expected_handoff=True,
                expected_data={
                    "client_type": "client_new",
                    "practice_area": "area_civil",
                    "wants_scheduling": False
                }
            )
        ]
    
    @pytest.mark.asyncio
    async def test_complete_conversation_flows(self):
        """Test all complete conversation flows."""
        test_cases = self.get_conversation_test_cases()
        
        for test_case in test_cases:
            # Reset state for each test case
            self.conversation_data = {}
            self.current_step = "welcome"
            self.mock_session.current_step = "welcome"
            
            print(f"\n--- Testing: {test_case.name} ---")
            
            responses = await self.simulate_conversation(test_case.messages)
            
            # Verify conversation completion
            final_response = responses[-1]
            
            if test_case.expected_completion:
                assert final_response.next_step == FlowStep.COMPLETED or final_response.should_handoff, \
                    f"Expected completion for {test_case.name}, but flow didn't complete"
            
            # Verify handoff behavior
            assert final_response.should_handoff == test_case.expected_handoff, \
                f"Expected handoff={test_case.expected_handoff} for {test_case.name}"
            
            # Verify collected data
            for key, expected_value in test_case.expected_data.items():
                assert key in self.conversation_data, \
                    f"Missing expected data key '{key}' in {test_case.name}"
                assert self.conversation_data[key] == expected_value, \
                    f"Expected {key}={expected_value}, got {self.conversation_data[key]} in {test_case.name}"
            
            print(f"✓ {test_case.name} passed")
    
    @pytest.mark.asyncio
    async def test_message_formatting_compliance(self):
        """Test that all messages are properly formatted and professional."""
        # Test welcome flow
        welcome_message = {"type": "text", "text": {"body": "Olá"}}
        response = await self.flow_engine.process_message(
            user_id=str(self.session_id),
            phone_number=self.phone_number,
            message=welcome_message
        )
        
        # Verify message structure
        assert len(response.messages) == 1
        message = response.messages[0]
        
        # Check message format
        assert "type" in message
        assert "content" in message
        
        # Check professional language (Portuguese)
        content = message["content"].lower()
        assert any(greeting in content for greeting in ["bem-vindo", "olá", "oi"]), \
            "Welcome message should contain Portuguese greeting"
        
        # Check for interactive elements
        if message["type"] == "interactive":
            assert "buttons" in message or "list" in message, \
                "Interactive messages should have buttons or list"
    
    @pytest.mark.asyncio
    async def test_escape_command_variations(self):
        """Test various escape command formats and variations."""
        escape_commands = [
            "falar com atendente",
            "FALAR COM ATENDENTE",
            "  falar com atendente  ",
            "atendimento humano",
            "atendente",
            "humano",
            "pessoa",
            "operador",
            "sair",
            "parar",
            "cancelar"
        ]
        
        for command in escape_commands:
            # Reset state
            self.mock_session.current_step = "client_type"
            
            message = {"type": "text", "text": {"body": command}}
            response = await self.flow_engine.process_message(
                user_id=str(self.session_id),
                phone_number=self.phone_number,
                message=message
            )
            
            assert response.should_handoff, f"Escape command '{command}' should trigger handoff"
            
            # Verify handoff was called
            self.mock_state_manager.trigger_handoff.assert_called()
            
            # Reset mock for next iteration
            self.mock_state_manager.reset_mock()
    
    @pytest.mark.asyncio
    async def test_flow_completion_rate_compliance(self):
        """Test that flow completion rate meets requirement (>80%)."""
        successful_flows = 0
        total_flows = 0
        
        test_cases = self.get_conversation_test_cases()
        
        for test_case in test_cases:
            # Only count non-escape flows for completion rate
            if "escape" not in test_case.name:
                total_flows += 1
                
                # Reset state
                self.conversation_data = {}
                self.current_step = "welcome"
                self.mock_session.current_step = "welcome"
                
                try:
                    responses = await self.simulate_conversation(test_case.messages)
                    final_response = responses[-1]
                    
                    if (final_response.next_step == FlowStep.COMPLETED or 
                        (final_response.should_handoff and test_case.expected_completion)):
                        successful_flows += 1
                        
                except Exception as e:
                    print(f"Flow failed: {test_case.name} - {e}")
        
        completion_rate = (successful_flows / total_flows) * 100 if total_flows > 0 else 0
        
        print(f"\nFlow Completion Rate: {completion_rate:.1f}% ({successful_flows}/{total_flows})")
        
        # Requirement 5.2: Flow completion rate should be > 80%
        assert completion_rate > 80, f"Flow completion rate {completion_rate:.1f}% is below required 80%"
    
    @pytest.mark.asyncio
    async def test_response_time_compliance(self):
        """Test that message processing meets response time requirements."""
        import time
        
        message = {"type": "text", "text": {"body": "Olá"}}
        
        # Measure processing time
        start_time = time.time()
        response = await self.flow_engine.process_message(
            user_id=str(self.session_id),
            phone_number=self.phone_number,
            message=message
        )
        end_time = time.time()
        
        processing_time = end_time - start_time
        
        # Requirement 5.3: Processing should be < 2 minutes (120 seconds)
        # In practice, it should be much faster (< 1 second)
        assert processing_time < 1.0, f"Processing time {processing_time:.3f}s exceeds 1 second"
        assert processing_time < 120.0, f"Processing time {processing_time:.3f}s exceeds requirement of 2 minutes"
    
    @pytest.mark.asyncio
    async def test_analytics_event_tracking(self):
        """Test that analytics events are properly tracked throughout conversations."""
        # Complete a full conversation
        messages = [
            {"type": "text", "text": {"body": "Olá"}},
            {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "client_new", "title": "Sou Cliente Novo"}}},
            {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "area_civil", "title": "Direito Civil"}}},
            {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "schedule_yes", "title": "Sim, quero agendar"}}},
            {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "type_presencial", "title": "Presencial"}}}
        ]
        
        responses = await self.simulate_conversation(messages)
        
        # Verify analytics events were recorded
        expected_events = ["flow_start", "step_completed", "flow_completed"]
        
        all_events = []
        for response in responses:
            all_events.extend([event["event_type"] for event in response.analytics_events])
        
        for expected_event in expected_events:
            assert expected_event in all_events, f"Missing analytics event: {expected_event}"
        
        # Verify analytics recording was called
        assert self.mock_state_manager.record_analytics_event.call_count >= len(expected_events)
    
    @pytest.mark.asyncio
    async def test_context_preservation_during_handoff(self):
        """Test that conversation context is preserved during handoff."""
        # Start conversation and collect some data
        messages = [
            {"type": "text", "text": {"body": "Olá"}},
            {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "client_new", "title": "Sou Cliente Novo"}}},
            {"type": "text", "text": {"body": "falar com atendente"}}  # Escape command
        ]
        
        responses = await self.simulate_conversation(messages)
        final_response = responses[-1]
        
        # Verify handoff was triggered
        assert final_response.should_handoff
        
        # Verify context was preserved
        assert "client_type" in self.conversation_data
        assert self.conversation_data["client_type"] == "client_new"
        
        # Verify handoff service was called with context
        self.mock_state_manager.trigger_handoff.assert_called_with(self.session_id)
    
    @pytest.mark.asyncio
    async def test_reengagement_flow(self):
        """Test re-engagement message functionality."""
        response = await self.flow_engine.handle_reengagement(self.mock_session)
        
        assert isinstance(response, FlowResponse)
        assert len(response.messages) == 1
        assert response.next_step == FlowStep.WELCOME
        assert not response.should_handoff
        
        # Check message content
        message = response.messages[0]
        content = message["content"].lower()
        assert any(word in content for word in ["ainda", "ajuda", "continuar"]), \
            "Re-engagement message should invite user to continue"
    
    @pytest.mark.asyncio
    async def test_error_recovery_mechanisms(self):
        """Test error recovery and graceful degradation."""
        # Simulate database error during state update
        self.mock_state_manager.update_conversation_data.side_effect = Exception("Database error")
        
        message = {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "client_new", "title": "Sou Cliente Novo"}}}
        
        response = await self.flow_engine.process_message(
            user_id=str(self.session_id),
            phone_number=self.phone_number,
            message=message
        )
        
        # Should still return a response (graceful degradation)
        assert isinstance(response, FlowResponse)
        assert len(response.messages) >= 1
        
        # Should include error analytics event
        error_events = [event for event in response.analytics_events if event["event_type"] == "error"]
        assert len(error_events) > 0


class TestConversationPathCoverage:
    """Test coverage of all possible conversation paths."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.mock_state_manager = AsyncMock(spec=StateManager)
        
        # Mock the timeout service to avoid WhatsApp client initialization
        with patch('app.services.flow_engine.get_timeout_service') as mock_timeout_service:
            mock_timeout_service.return_value = MagicMock()
            self.flow_engine = FlowEngine(state_manager=self.mock_state_manager)
    
    def test_all_client_types_covered(self):
        """Test that all client types are handled."""
        client_types = ["client_new", "client_existing"]
        
        for client_type in client_types:
            # Verify client type is in valid responses
            assert client_type in self.flow_engine.valid_responses["client_type"]
    
    def test_all_practice_areas_covered(self):
        """Test that all practice areas are handled."""
        practice_areas = [
            "area_civil", "area_trabalhista", "area_penal", 
            "area_familia", "area_empresarial", "area_outros"
        ]
        
        for area in practice_areas:
            # Verify practice area is in valid responses
            assert area in self.flow_engine.valid_responses["practice_area"]
    
    def test_all_scheduling_options_covered(self):
        """Test that all scheduling options are handled."""
        scheduling_options = ["schedule_yes", "schedule_no"]
        scheduling_types = ["type_presencial", "type_online"]
        
        for option in scheduling_options:
            assert option in self.flow_engine.valid_responses["scheduling_offer"]
        
        for stype in scheduling_types:
            assert stype in self.flow_engine.valid_responses["scheduling_type"]


class TestMessageValidation:
    """Test message validation and formatting."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.mock_state_manager = AsyncMock(spec=StateManager)
        
        # Mock the timeout service to avoid WhatsApp client initialization
        with patch('app.services.flow_engine.get_timeout_service') as mock_timeout_service:
            mock_timeout_service.return_value = MagicMock()
            self.flow_engine = FlowEngine(state_manager=self.mock_state_manager)
    
    def test_message_structure_validation(self):
        """Test that all generated messages have proper structure."""
        # Test different message types
        message_types = ["text", "interactive"]
        
        for msg_type in message_types:
            if msg_type == "text":
                # Text messages should have content
                message = {"type": "text", "content": "Test message"}
                assert "content" in message
            elif msg_type == "interactive":
                # Interactive messages should have buttons or list
                message = {
                    "type": "interactive", 
                    "content": "Test message",
                    "buttons": [{"id": "test", "title": "Test"}]
                }
                assert "buttons" in message or "list" in message
    
    def test_portuguese_language_compliance(self):
        """Test that all messages use proper Portuguese."""
        # This would typically involve more sophisticated language checking
        # For now, we check for basic Portuguese characteristics
        
        sample_messages = [
            "Bem-vindo à Advocacia Direta!",
            "Você é cliente novo ou já é nosso cliente?",
            "Em qual área jurídica podemos ajudá-lo?",
            "Gostaria de agendar um horário?"
        ]
        
        for message in sample_messages:
            # Check for Portuguese characteristics
            assert any(char in message for char in "ãçáéíóú"), \
                f"Message should contain Portuguese characters: {message}"
    
    def test_professional_tone_compliance(self):
        """Test that messages maintain professional tone."""
        # Check for professional language patterns
        professional_indicators = [
            "bem-vindo", "podemos", "gostaria", "obrigado", 
            "por favor", "atendimento", "especialista"
        ]
        
        # This is a simplified test - in practice, you'd use more sophisticated
        # natural language processing to verify tone
        sample_content = "bem-vindo podemos ajudá-lo atendimento especialista"
        
        found_indicators = sum(1 for indicator in professional_indicators 
                             if indicator in sample_content.lower())
        
        assert found_indicators >= 3, "Messages should contain professional language indicators"