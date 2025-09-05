"""
Unit tests for HandoffService.
"""

import pytest
import uuid
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from app.services.handoff_service import (
    HandoffService,
    HandoffData,
    HandoffReason,
    ClientType,
    PracticeArea,
    SchedulingPreference,
    get_handoff_service
)
from app.models.conversation import UserSession, ConversationState


class TestHandoffData:
    """Test HandoffData dataclass functionality."""
    
    def test_handoff_data_creation(self):
        """Test HandoffData creation with all fields."""
        handoff_data = HandoffData(
            session_id="test-session-id",
            phone_number="+5511999999999",
            created_at="2024-01-01T10:00:00",
            handoff_time="2024-01-01T10:30:00",
            handoff_reason=HandoffReason.FLOW_COMPLETED.value,
            client_type=ClientType.NEW.value,
            practice_area=PracticeArea.CIVIL.value,
            wants_scheduling=True,
            scheduling_preference=SchedulingPreference.PRESENCIAL.value,
            flow_completed=True,
            current_step="completed",
            message_count=10,
            conversation_duration_minutes=30.0,
            conversation_summary="Cliente novo interessado em direito civil",
            key_interactions=[],
            custom_requests=["Urgente"],
            handoff_id="handoff-123",
            priority_level="medium",
            tags=["flow-completed", "client-new", "civil"]
        )
        
        assert handoff_data.session_id == "test-session-id"
        assert handoff_data.phone_number == "+5511999999999"
        assert handoff_data.wants_scheduling is True
        assert handoff_data.priority_level == "medium"
    
    def test_to_dict_conversion(self):
        """Test conversion to dictionary."""
        handoff_data = HandoffData(
            session_id="test-session-id",
            phone_number="+5511999999999",
            created_at="2024-01-01T10:00:00",
            handoff_time="2024-01-01T10:30:00",
            handoff_reason=HandoffReason.FLOW_COMPLETED.value,
            client_type=ClientType.NEW.value,
            practice_area=PracticeArea.CIVIL.value,
            wants_scheduling=True,
            scheduling_preference=SchedulingPreference.PRESENCIAL.value,
            flow_completed=True,
            current_step="completed",
            message_count=10,
            conversation_duration_minutes=30.0,
            conversation_summary="Test summary",
            key_interactions=[],
            custom_requests=[],
            handoff_id="handoff-123",
            priority_level="medium",
            tags=["test"]
        )
        
        result = handoff_data.to_dict()
        
        assert isinstance(result, dict)
        assert result["session_id"] == "test-session-id"
        assert result["phone_number"] == "+5511999999999"
        assert result["wants_scheduling"] is True
    
    def test_to_crm_format(self):
        """Test CRM format conversion."""
        handoff_data = HandoffData(
            session_id="test-session-id",
            phone_number="+5511999999999",
            created_at="2024-01-01T10:00:00",
            handoff_time="2024-01-01T10:30:00",
            handoff_reason=HandoffReason.FLOW_COMPLETED.value,
            client_type=ClientType.NEW.value,
            practice_area=PracticeArea.CIVIL.value,
            wants_scheduling=True,
            scheduling_preference=SchedulingPreference.PRESENCIAL.value,
            flow_completed=True,
            current_step="completed",
            message_count=10,
            conversation_duration_minutes=30.0,
            conversation_summary="Test summary",
            key_interactions=[],
            custom_requests=["Urgente"],
            handoff_id="handoff-123",
            priority_level="medium",
            tags=["test"]
        )
        
        result = handoff_data.to_crm_format()
        
        assert result["contact_id"] == "+5511999999999"
        assert result["handoff_id"] == "handoff-123"
        assert result["client_type"] == "Cliente Novo"
        assert result["practice_area"] == "Direito Civil"
        assert result["scheduling_request"]["wants_scheduling"] is True
        assert result["scheduling_request"]["preference"] == "Presencial"
        assert result["custom_requests"] == ["Urgente"]
    
    def test_translate_client_type(self):
        """Test client type translation."""
        handoff_data = HandoffData(
            session_id="test", phone_number="test", created_at="test",
            handoff_time="test", handoff_reason="test", client_type=ClientType.NEW.value,
            practice_area="test", wants_scheduling=False, scheduling_preference="test",
            flow_completed=False, current_step="test", message_count=0,
            conversation_duration_minutes=0, conversation_summary="test",
            key_interactions=[], custom_requests=[], handoff_id="test",
            priority_level="test", tags=[]
        )
        
        assert handoff_data._translate_client_type() == "Cliente Novo"
        
        handoff_data.client_type = ClientType.EXISTING.value
        assert handoff_data._translate_client_type() == "Cliente Existente"
        
        handoff_data.client_type = "invalid"
        assert handoff_data._translate_client_type() == "Não Identificado"
    
    def test_translate_practice_area(self):
        """Test practice area translation."""
        handoff_data = HandoffData(
            session_id="test", phone_number="test", created_at="test",
            handoff_time="test", handoff_reason="test", client_type="test",
            practice_area=PracticeArea.CIVIL.value, wants_scheduling=False, 
            scheduling_preference="test", flow_completed=False, current_step="test", 
            message_count=0, conversation_duration_minutes=0, conversation_summary="test",
            key_interactions=[], custom_requests=[], handoff_id="test",
            priority_level="test", tags=[]
        )
        
        assert handoff_data._translate_practice_area() == "Direito Civil"
        
        handoff_data.practice_area = PracticeArea.TRABALHISTA.value
        assert handoff_data._translate_practice_area() == "Direito Trabalhista"
        
        handoff_data.practice_area = "invalid"
        assert handoff_data._translate_practice_area() == "Área Não Especificada"


class TestHandoffService:
    """Test HandoffService functionality."""
    
    @pytest.fixture
    def handoff_service(self):
        """Create HandoffService instance for testing."""
        return HandoffService()
    
    @pytest.fixture
    def mock_session(self):
        """Create mock UserSession for testing."""
        session = Mock(spec=UserSession)
        session.id = uuid.uuid4()
        session.phone_number = "+5511999999999"
        session.created_at = datetime.utcnow() - timedelta(minutes=30)
        session.updated_at = datetime.utcnow()
        session.current_step = "completed"
        return session
    
    @pytest.fixture
    def mock_conversation_state(self):
        """Create mock ConversationState for testing."""
        state = Mock(spec=ConversationState)
        state.client_type = ClientType.NEW.value
        state.practice_area = PracticeArea.CIVIL.value
        state.wants_scheduling = True
        state.scheduling_preference = SchedulingPreference.PRESENCIAL.value
        state.flow_completed = True
        state.custom_requests = ["Urgente", "Primeira consulta"]
        return state
    
    @pytest.fixture
    def mock_conversation_history(self):
        """Create mock conversation history for testing."""
        return [
            {
                "direction": "inbound",
                "content": "Olá",
                "message_type": "text",
                "timestamp": "2024-01-01T10:00:00",
                "metadata": {}
            },
            {
                "direction": "outbound",
                "content": "Bem-vindo!",
                "message_type": "interactive",
                "timestamp": "2024-01-01T10:01:00",
                "metadata": {"step": "welcome"}
            },
            {
                "direction": "inbound",
                "content": "Cliente Novo",
                "message_type": "button",
                "timestamp": "2024-01-01T10:02:00",
                "metadata": {"button_id": "client_new"}
            }
        ]
    
    def test_compile_conversation_data_complete_flow(
        self, handoff_service, mock_session, mock_conversation_state, mock_conversation_history
    ):
        """Test compiling conversation data for completed flow."""
        result = handoff_service.compile_conversation_data(
            session=mock_session,
            conversation_state=mock_conversation_state,
            conversation_history=mock_conversation_history,
            handoff_reason=HandoffReason.FLOW_COMPLETED.value
        )
        
        assert isinstance(result, HandoffData)
        assert result.session_id == str(mock_session.id)
        assert result.phone_number == mock_session.phone_number
        assert result.client_type == ClientType.NEW.value
        assert result.practice_area == PracticeArea.CIVIL.value
        assert result.wants_scheduling is True
        assert result.flow_completed is True
        assert result.message_count == 3
        assert result.priority_level == "medium"  # Scheduling requested
        assert "flow-completed" in result.tags
        assert "client-new" in result.tags
    
    def test_compile_conversation_data_no_state(
        self, handoff_service, mock_session, mock_conversation_history
    ):
        """Test compiling conversation data without conversation state."""
        result = handoff_service.compile_conversation_data(
            session=mock_session,
            conversation_state=None,
            conversation_history=mock_conversation_history,
            handoff_reason=HandoffReason.ESCAPE_COMMAND.value
        )
        
        assert isinstance(result, HandoffData)
        assert result.client_type == ClientType.UNKNOWN.value
        assert result.practice_area == PracticeArea.UNKNOWN.value
        assert result.wants_scheduling is False
        assert result.flow_completed is False
        assert result.priority_level == "high"  # Escape command
        assert result.custom_requests == []
    
    def test_calculate_conversation_duration(self, handoff_service, mock_session):
        """Test conversation duration calculation."""
        # Set specific times for testing
        mock_session.created_at = datetime(2024, 1, 1, 10, 0, 0)
        mock_session.updated_at = datetime(2024, 1, 1, 10, 30, 0)
        
        duration = handoff_service._calculate_conversation_duration(mock_session)
        
        assert duration == 30.0  # 30 minutes
    
    def test_calculate_conversation_duration_no_times(self, handoff_service):
        """Test conversation duration with missing timestamps."""
        mock_session = Mock()
        mock_session.created_at = None
        mock_session.updated_at = None
        
        duration = handoff_service._calculate_conversation_duration(mock_session)
        
        assert duration == 0.0
    
    def test_extract_key_interactions(self, handoff_service, mock_conversation_history):
        """Test extracting key interactions from conversation history."""
        result = handoff_service._extract_key_interactions(mock_conversation_history)
        
        # Should include button clicks and interactive messages
        assert len(result) == 2  # interactive outbound + button inbound
        
        # Check that button interaction is included
        button_interaction = next(
            (item for item in result if item["type"] == "button"), None
        )
        assert button_interaction is not None
        assert button_interaction["content"] == "Cliente Novo"
    
    def test_generate_conversation_summary_complete(
        self, handoff_service, mock_session, mock_conversation_state
    ):
        """Test generating conversation summary for complete flow."""
        result = handoff_service._generate_conversation_summary(
            session=mock_session,
            conversation_state=mock_conversation_state,
            key_interactions=[]
        )
        
        assert "Cliente novo" in result
        assert "completou o atendimento automatizado" in result
        assert "solicitou agendamento presencial" in result
    
    def test_generate_conversation_summary_no_state(self, handoff_service, mock_session):
        """Test generating conversation summary without state."""
        result = handoff_service._generate_conversation_summary(
            session=mock_session,
            conversation_state=None,
            key_interactions=[]
        )
        
        assert "não completou identificação" in result
    
    def test_determine_priority_level_escape_command(self, handoff_service):
        """Test priority determination for escape command."""
        priority = handoff_service._determine_priority_level(
            handoff_reason=HandoffReason.ESCAPE_COMMAND.value,
            conversation_state=None,
            duration_minutes=5.0
        )
        
        assert priority == "high"
    
    def test_determine_priority_level_scheduling(self, handoff_service, mock_conversation_state):
        """Test priority determination for scheduling request."""
        priority = handoff_service._determine_priority_level(
            handoff_reason=HandoffReason.FLOW_COMPLETED.value,
            conversation_state=mock_conversation_state,
            duration_minutes=5.0
        )
        
        assert priority == "medium"
    
    def test_determine_priority_level_long_conversation(self, handoff_service):
        """Test priority determination for long conversation."""
        mock_state = Mock()
        mock_state.wants_scheduling = False
        
        priority = handoff_service._determine_priority_level(
            handoff_reason=HandoffReason.FLOW_COMPLETED.value,
            conversation_state=mock_state,
            duration_minutes=15.0
        )
        
        assert priority == "medium"
    
    def test_determine_priority_level_low(self, handoff_service):
        """Test priority determination for low priority case."""
        mock_state = Mock()
        mock_state.wants_scheduling = False
        
        priority = handoff_service._determine_priority_level(
            handoff_reason=HandoffReason.FLOW_COMPLETED.value,
            conversation_state=mock_state,
            duration_minutes=5.0
        )
        
        assert priority == "low"
    
    def test_generate_tags(self, handoff_service, mock_session, mock_conversation_state):
        """Test tag generation."""
        with patch('app.services.handoff_service.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime(2024, 1, 1, 14, 0, 0)  # 2 PM
            
            tags = handoff_service._generate_tags(
                session=mock_session,
                conversation_state=mock_conversation_state,
                handoff_reason=HandoffReason.FLOW_COMPLETED.value
            )
        
        assert "flow-completed" in tags
        assert "client-new" in tags
        assert "civil" in tags
        assert "agendamento" in tags
        assert "presencial" in tags
        assert "tarde" in tags
    
    def test_format_summary_for_reception(
        self, handoff_service, mock_session, mock_conversation_state, mock_conversation_history
    ):
        """Test formatting summary for reception team."""
        handoff_data = handoff_service.compile_conversation_data(
            session=mock_session,
            conversation_state=mock_conversation_state,
            conversation_history=mock_conversation_history,
            handoff_reason=HandoffReason.FLOW_COMPLETED.value
        )
        
        result = handoff_service.format_summary_for_reception(handoff_data)
        
        assert "NOVO ATENDIMENTO WHATSAPP" in result
        assert mock_session.phone_number in result
        assert "Cliente Novo" in result
        assert "Direito Civil" in result
        assert "Solicitado - Presencial" in result
        assert handoff_data.handoff_id[:8] in result
    
    def test_format_summary_for_crm(
        self, handoff_service, mock_session, mock_conversation_state, mock_conversation_history
    ):
        """Test formatting summary for CRM."""
        handoff_data = handoff_service.compile_conversation_data(
            session=mock_session,
            conversation_state=mock_conversation_state,
            conversation_history=mock_conversation_history,
            handoff_reason=HandoffReason.FLOW_COMPLETED.value
        )
        
        result = handoff_service.format_summary_for_crm(handoff_data)
        
        assert result["contact_id"] == mock_session.phone_number
        assert result["client_type"] == "Cliente Novo"
        assert result["practice_area"] == "Direito Civil"
        assert result["scheduling_request"]["wants_scheduling"] is True
    
    def test_create_integration_payload_generic(
        self, handoff_service, mock_session, mock_conversation_state, mock_conversation_history
    ):
        """Test creating generic integration payload."""
        handoff_data = handoff_service.compile_conversation_data(
            session=mock_session,
            conversation_state=mock_conversation_state,
            conversation_history=mock_conversation_history,
            handoff_reason=HandoffReason.FLOW_COMPLETED.value
        )
        
        result = handoff_service.create_integration_payload(handoff_data, "generic")
        
        assert result["handoff_id"] == handoff_data.handoff_id
        assert result["contact"]["phone"] == mock_session.phone_number
        assert result["request"]["area"] == "Direito Civil"
        assert result["conversation"]["completed"] is True
    
    def test_create_integration_payload_zapier(
        self, handoff_service, mock_session, mock_conversation_state, mock_conversation_history
    ):
        """Test creating Zapier integration payload."""
        handoff_data = handoff_service.compile_conversation_data(
            session=mock_session,
            conversation_state=mock_conversation_state,
            conversation_history=mock_conversation_history,
            handoff_reason=HandoffReason.FLOW_COMPLETED.value
        )
        
        result = handoff_service.create_integration_payload(handoff_data, "zapier")
        
        # Zapier format should be flattened
        assert "handoff_id" in result
        assert "phone" in result
        assert "client_type" in result
        assert "practice_area" in result
        assert isinstance(result["tags"], str)  # Should be comma-separated
    
    def test_create_integration_payload_hubspot(
        self, handoff_service, mock_session, mock_conversation_state, mock_conversation_history
    ):
        """Test creating HubSpot integration payload."""
        handoff_data = handoff_service.compile_conversation_data(
            session=mock_session,
            conversation_state=mock_conversation_state,
            conversation_history=mock_conversation_history,
            handoff_reason=HandoffReason.FLOW_COMPLETED.value
        )
        
        result = handoff_service.create_integration_payload(handoff_data, "hubspot")
        
        # HubSpot format should have properties structure
        assert "properties" in result
        assert "associations" in result
        assert result["properties"]["phone"] == mock_session.phone_number
        assert result["properties"]["whatsapp_handoff_id"] == handoff_data.handoff_id
    
    def test_create_integration_payload_salesforce(
        self, handoff_service, mock_session, mock_conversation_state, mock_conversation_history
    ):
        """Test creating Salesforce integration payload."""
        handoff_data = handoff_service.compile_conversation_data(
            session=mock_session,
            conversation_state=mock_conversation_state,
            conversation_history=mock_conversation_history,
            handoff_reason=HandoffReason.FLOW_COMPLETED.value
        )
        
        result = handoff_service.create_integration_payload(handoff_data, "salesforce")
        
        # Salesforce format should have Lead structure
        assert "Lead" in result
        assert result["Lead"]["Phone"] == mock_session.phone_number
        assert result["Lead"]["LeadSource"] == "WhatsApp Bot"
        assert result["Lead"]["WhatsApp_Handoff_ID__c"] == handoff_data.handoff_id
    
    def test_translate_handoff_reason(self, handoff_service):
        """Test handoff reason translation."""
        assert handoff_service._translate_handoff_reason(
            HandoffReason.FLOW_COMPLETED.value
        ) == "Fluxo Completado"
        
        assert handoff_service._translate_handoff_reason(
            HandoffReason.ESCAPE_COMMAND.value
        ) == "Solicitação de Atendente"
        
        assert handoff_service._translate_handoff_reason(
            "unknown_reason"
        ) == "Motivo Desconhecido"


class TestHandoffServiceFactory:
    """Test HandoffService factory function."""
    
    def test_get_handoff_service(self):
        """Test factory function returns HandoffService instance."""
        service = get_handoff_service()
        
        assert isinstance(service, HandoffService)
        assert hasattr(service, 'compile_conversation_data')
        assert hasattr(service, 'format_summary_for_reception')


class TestHandoffServiceEdgeCases:
    """Test edge cases and error handling."""
    
    @pytest.fixture
    def handoff_service(self):
        return HandoffService()
    
    def test_empty_conversation_history(self, handoff_service):
        """Test handling empty conversation history."""
        result = handoff_service._extract_key_interactions([])
        
        assert result == []
    
    def test_long_conversation_history(self, handoff_service):
        """Test handling very long conversation history."""
        # Create 20 interactions
        long_history = []
        for i in range(20):
            long_history.append({
                "direction": "inbound",
                "content": f"Message {i}",
                "message_type": "button" if i % 2 == 0 else "text",
                "timestamp": f"2024-01-01T10:{i:02d}:00",
                "metadata": {}
            })
        
        result = handoff_service._extract_key_interactions(long_history)
        
        # Should limit to 10 most recent
        assert len(result) <= 10
    
    def test_missing_conversation_state_fields(self, handoff_service):
        """Test handling conversation state with missing fields."""
        mock_session = Mock()
        mock_session.id = uuid.uuid4()
        mock_session.phone_number = "+5511999999999"
        mock_session.created_at = datetime.utcnow()
        mock_session.updated_at = datetime.utcnow()
        mock_session.current_step = "welcome"
        
        # Create state with missing fields
        mock_state = Mock()
        mock_state.client_type = None
        mock_state.practice_area = None
        mock_state.wants_scheduling = None
        mock_state.scheduling_preference = None
        mock_state.flow_completed = False
        mock_state.custom_requests = None
        
        result = handoff_service.compile_conversation_data(
            session=mock_session,
            conversation_state=mock_state,
            conversation_history=[],
            handoff_reason=HandoffReason.FLOW_COMPLETED.value
        )
        
        assert result.client_type is None
        assert result.practice_area is None
        assert result.wants_scheduling is None
        assert result.custom_requests == []  # Should default to empty list
    
    def test_time_based_tags_different_hours(self, handoff_service):
        """Test time-based tag generation for different hours."""
        mock_session = Mock()
        mock_state = Mock()
        mock_state.client_type = None
        mock_state.practice_area = None
        mock_state.wants_scheduling = False
        
        # Test morning (8 AM)
        with patch('app.services.handoff_service.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime(2024, 1, 1, 8, 0, 0)
            tags = handoff_service._generate_tags(mock_session, mock_state, "test")
            assert "manha" in tags
        
        # Test afternoon (3 PM)
        with patch('app.services.handoff_service.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime(2024, 1, 1, 15, 0, 0)
            tags = handoff_service._generate_tags(mock_session, mock_state, "test")
            assert "tarde" in tags
        
        # Test night (10 PM)
        with patch('app.services.handoff_service.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime(2024, 1, 1, 22, 0, 0)
            tags = handoff_service._generate_tags(mock_session, mock_state, "test")
            assert "noite" in tags