"""
Tests for scheduling service functionality.
"""

import pytest
from datetime import datetime
from unittest.mock import MagicMock
import uuid

from app.services.scheduling_service import (
    SchedulingService,
    SchedulingRequest,
    InformationRequest,
    HandoffData,
    SchedulingType,
    PracticeArea,
    get_scheduling_service
)
from app.models.conversation import UserSession, ConversationState


class TestSchedulingRequest:
    """Test SchedulingRequest dataclass."""
    
    def test_scheduling_request_creation(self):
        """Test SchedulingRequest creation."""
        request = SchedulingRequest(
            session_id="test-session",
            phone_number="5573982005612",
            client_type="client_new",
            practice_area="area_civil",
            scheduling_type="type_presencial",
            wants_scheduling=True,
            created_at=datetime.utcnow()
        )
        
        assert request.session_id == "test-session"
        assert request.phone_number == "5573982005612"
        assert request.client_type == "client_new"
        assert request.practice_area == "area_civil"
        assert request.scheduling_type == "type_presencial"
        assert request.wants_scheduling is True
        assert isinstance(request.created_at, datetime)
    
    def test_scheduling_request_to_dict(self):
        """Test SchedulingRequest to_dict conversion."""
        created_at = datetime.utcnow()
        request = SchedulingRequest(
            session_id="test-session",
            phone_number="5573982005612",
            client_type="client_new",
            practice_area="area_civil",
            scheduling_type="type_presencial",
            wants_scheduling=True,
            created_at=created_at,
            additional_info={"test": "data"}
        )
        
        result = request.to_dict()
        
        assert result["session_id"] == "test-session"
        assert result["phone_number"] == "5573982005612"
        assert result["client_type"] == "client_new"
        assert result["practice_area"] == "area_civil"
        assert result["scheduling_type"] == "type_presencial"
        assert result["wants_scheduling"] is True
        assert result["created_at"] == created_at.isoformat()
        assert result["additional_info"]["test"] == "data"


class TestInformationRequest:
    """Test InformationRequest dataclass."""
    
    def test_information_request_creation(self):
        """Test InformationRequest creation."""
        request = InformationRequest(
            session_id="test-session",
            phone_number="5573982005612",
            client_type="client_existing",
            practice_area="area_trabalhista",
            wants_scheduling=False,
            created_at=datetime.utcnow()
        )
        
        assert request.session_id == "test-session"
        assert request.phone_number == "5573982005612"
        assert request.client_type == "client_existing"
        assert request.practice_area == "area_trabalhista"
        assert request.wants_scheduling is False
        assert isinstance(request.created_at, datetime)
    
    def test_information_request_to_dict(self):
        """Test InformationRequest to_dict conversion."""
        created_at = datetime.utcnow()
        request = InformationRequest(
            session_id="test-session",
            phone_number="5573982005612",
            client_type="client_existing",
            practice_area="area_trabalhista",
            wants_scheduling=False,
            created_at=created_at,
            additional_info={"custom": "info"}
        )
        
        result = request.to_dict()
        
        assert result["session_id"] == "test-session"
        assert result["wants_scheduling"] is False
        assert result["created_at"] == created_at.isoformat()
        assert result["additional_info"]["custom"] == "info"


class TestHandoffData:
    """Test HandoffData dataclass."""
    
    def test_handoff_data_creation(self):
        """Test HandoffData creation."""
        created_at = datetime.utcnow()
        handoff_data = HandoffData(
            session_summary={"session_id": "test"},
            request_data={"type": "scheduling"},
            conversation_history=[{"message": "test"}],
            analytics_summary={"total_messages": 5},
            handoff_reason="flow_completed",
            created_at=created_at
        )
        
        assert handoff_data.session_summary["session_id"] == "test"
        assert handoff_data.request_data["type"] == "scheduling"
        assert len(handoff_data.conversation_history) == 1
        assert handoff_data.analytics_summary["total_messages"] == 5
        assert handoff_data.handoff_reason == "flow_completed"
        assert handoff_data.created_at == created_at
    
    def test_handoff_data_to_dict(self):
        """Test HandoffData to_dict conversion."""
        created_at = datetime.utcnow()
        handoff_data = HandoffData(
            session_summary={"session_id": "test"},
            request_data={"type": "scheduling"},
            conversation_history=[{"message": "test"}],
            analytics_summary={"total_messages": 5},
            handoff_reason="flow_completed",
            created_at=created_at
        )
        
        result = handoff_data.to_dict()
        
        assert result["session_summary"]["session_id"] == "test"
        assert result["request_data"]["type"] == "scheduling"
        assert result["handoff_reason"] == "flow_completed"
        assert result["created_at"] == created_at.isoformat()


class TestSchedulingService:
    """Test SchedulingService class functionality."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.service = SchedulingService()
        
        # Create mock session
        self.mock_session = MagicMock(spec=UserSession)
        self.mock_session.id = uuid.uuid4()
        self.mock_session.phone_number = "5573982005612"
        self.mock_session.created_at = datetime.utcnow()
        self.mock_session.updated_at = datetime.utcnow()
        
        # Create mock conversation state
        self.mock_conversation_state = MagicMock(spec=ConversationState)
        self.mock_conversation_state.client_type = "client_new"
        self.mock_conversation_state.practice_area = "area_civil"
        self.mock_conversation_state.wants_scheduling = True
        self.mock_conversation_state.scheduling_preference = "type_presencial"
        self.mock_conversation_state.custom_requests = []
        self.mock_conversation_state.flow_completed = True
    
    def test_initialization(self):
        """Test SchedulingService initialization."""
        assert self.service is not None
        assert len(self.service.practice_area_names) > 0
        assert len(self.service.scheduling_type_names) > 0
        assert len(self.service.client_type_names) > 0
    
    def test_practice_area_names(self):
        """Test practice area name mappings."""
        expected_areas = {
            PracticeArea.CIVIL.value: "Direito Civil",
            PracticeArea.TRABALHISTA.value: "Direito Trabalhista",
            PracticeArea.CRIMINAL.value: "Direito Criminal",
            PracticeArea.FAMILIA.value: "Direito de Família",
            PracticeArea.EMPRESARIAL.value: "Direito Empresarial",
            PracticeArea.OUTROS.value: "Outras Áreas Jurídicas"
        }
        
        for area_id, expected_name in expected_areas.items():
            assert self.service.practice_area_names[area_id] == expected_name
    
    def test_scheduling_type_names(self):
        """Test scheduling type name mappings."""
        expected_types = {
            SchedulingType.PRESENCIAL.value: "Presencial",
            SchedulingType.ONLINE.value: "Online"
        }
        
        for type_id, expected_name in expected_types.items():
            assert self.service.scheduling_type_names[type_id] == expected_name
    
    def test_validate_scheduling_data_valid(self):
        """Test validation with valid scheduling data."""
        result = self.service.validate_scheduling_data(self.mock_conversation_state)
        
        assert result["is_valid"] is True
        assert len(result["missing_fields"]) == 0
        assert len(result["invalid_fields"]) == 0
    
    def test_validate_scheduling_data_missing_fields(self):
        """Test validation with missing required fields."""
        # Test missing client_type
        self.mock_conversation_state.client_type = None
        result = self.service.validate_scheduling_data(self.mock_conversation_state)
        
        assert result["is_valid"] is False
        assert "client_type" in result["missing_fields"]
        
        # Test missing practice_area
        self.mock_conversation_state.client_type = "client_new"
        self.mock_conversation_state.practice_area = None
        result = self.service.validate_scheduling_data(self.mock_conversation_state)
        
        assert result["is_valid"] is False
        assert "practice_area" in result["missing_fields"]
        
        # Test missing wants_scheduling
        self.mock_conversation_state.practice_area = "area_civil"
        self.mock_conversation_state.wants_scheduling = None
        result = self.service.validate_scheduling_data(self.mock_conversation_state)
        
        assert result["is_valid"] is False
        assert "wants_scheduling" in result["missing_fields"]
        
        # Test missing scheduling_preference when wants_scheduling is True
        self.mock_conversation_state.wants_scheduling = True
        self.mock_conversation_state.scheduling_preference = None
        result = self.service.validate_scheduling_data(self.mock_conversation_state)
        
        assert result["is_valid"] is False
        assert "scheduling_preference" in result["missing_fields"]
    
    def test_validate_scheduling_data_invalid_values(self):
        """Test validation with invalid field values."""
        # Test invalid client_type
        self.mock_conversation_state.client_type = "invalid_type"
        result = self.service.validate_scheduling_data(self.mock_conversation_state)
        
        assert result["is_valid"] is False
        assert "client_type" in result["invalid_fields"]
        
        # Test invalid practice_area
        self.mock_conversation_state.client_type = "client_new"
        self.mock_conversation_state.practice_area = "invalid_area"
        result = self.service.validate_scheduling_data(self.mock_conversation_state)
        
        assert result["is_valid"] is False
        assert "practice_area" in result["invalid_fields"]
        
        # Test invalid scheduling_preference
        self.mock_conversation_state.practice_area = "area_civil"
        self.mock_conversation_state.scheduling_preference = "invalid_type"
        result = self.service.validate_scheduling_data(self.mock_conversation_state)
        
        assert result["is_valid"] is False
        assert "scheduling_preference" in result["invalid_fields"]
    
    def test_create_scheduling_request_valid(self):
        """Test creating valid scheduling request."""
        request = self.service.create_scheduling_request(self.mock_session, self.mock_conversation_state)
        
        assert isinstance(request, SchedulingRequest)
        assert request.session_id == str(self.mock_session.id)
        assert request.phone_number == self.mock_session.phone_number
        assert request.client_type == self.mock_conversation_state.client_type
        assert request.practice_area == self.mock_conversation_state.practice_area
        assert request.scheduling_type == self.mock_conversation_state.scheduling_preference
        assert request.wants_scheduling is True
        assert isinstance(request.created_at, datetime)
        assert request.additional_info is not None
    
    def test_create_scheduling_request_not_wanting_scheduling(self):
        """Test creating scheduling request when wants_scheduling is False."""
        self.mock_conversation_state.wants_scheduling = False
        
        with pytest.raises(ValueError, match="Cannot create scheduling request when wants_scheduling is False"):
            self.service.create_scheduling_request(self.mock_session, self.mock_conversation_state)
    
    def test_create_scheduling_request_invalid_data(self):
        """Test creating scheduling request with invalid data."""
        self.mock_conversation_state.client_type = None
        
        with pytest.raises(ValueError, match="Invalid scheduling data"):
            self.service.create_scheduling_request(self.mock_session, self.mock_conversation_state)
    
    def test_create_information_request_valid(self):
        """Test creating valid information request."""
        self.mock_conversation_state.wants_scheduling = False
        
        request = self.service.create_information_request(self.mock_session, self.mock_conversation_state)
        
        assert isinstance(request, InformationRequest)
        assert request.session_id == str(self.mock_session.id)
        assert request.phone_number == self.mock_session.phone_number
        assert request.client_type == self.mock_conversation_state.client_type
        assert request.practice_area == self.mock_conversation_state.practice_area
        assert request.wants_scheduling is False
        assert isinstance(request.created_at, datetime)
    
    def test_create_information_request_wanting_scheduling(self):
        """Test creating information request when wants_scheduling is True."""
        self.mock_conversation_state.wants_scheduling = True
        
        with pytest.raises(ValueError, match="Cannot create information request when wants_scheduling is True"):
            self.service.create_information_request(self.mock_session, self.mock_conversation_state)
    
    def test_create_information_request_missing_data(self):
        """Test creating information request with missing data uses defaults."""
        self.mock_conversation_state.wants_scheduling = False
        self.mock_conversation_state.client_type = None
        self.mock_conversation_state.practice_area = None
        
        request = self.service.create_information_request(self.mock_session, self.mock_conversation_state)
        
        assert request.client_type == "unknown"
        assert request.practice_area == "area_outros"
    
    def test_format_scheduling_confirmation(self):
        """Test formatting scheduling confirmation message."""
        request = self.service.create_scheduling_request(self.mock_session, self.mock_conversation_state)
        
        confirmation = self.service.format_scheduling_confirmation(request)
        
        assert isinstance(confirmation, str)
        assert "PRESENCIAL" in confirmation
        assert "Direito Civil" in confirmation
        assert self.mock_session.phone_number in confirmation
        assert "registrada" in confirmation.lower()
        assert "Advocacia Direta" in confirmation
    
    def test_format_information_confirmation(self):
        """Test formatting information confirmation message."""
        self.mock_conversation_state.wants_scheduling = False
        request = self.service.create_information_request(self.mock_session, self.mock_conversation_state)
        
        confirmation = self.service.format_information_confirmation(request)
        
        assert isinstance(confirmation, str)
        assert "Direito Civil" in confirmation
        assert self.mock_session.phone_number in confirmation
        assert "informações" in confirmation.lower()
        assert "Advocacia Direta" in confirmation
    
    def test_create_handoff_data_scheduling(self):
        """Test creating handoff data for scheduling request."""
        conversation_history = [
            {"direction": "inbound", "content": "Hello", "timestamp": datetime.utcnow().isoformat()},
            {"direction": "outbound", "content": "Welcome", "timestamp": datetime.utcnow().isoformat()}
        ]
        
        handoff_data = self.service.create_handoff_data(
            session=self.mock_session,
            conversation_state=self.mock_conversation_state,
            conversation_history=conversation_history,
            handoff_reason="flow_completed"
        )
        
        assert isinstance(handoff_data, HandoffData)
        assert handoff_data.session_summary["session_id"] == str(self.mock_session.id)
        assert handoff_data.session_summary["request_type"] == "scheduling"
        assert handoff_data.request_data["wants_scheduling"] is True
        assert len(handoff_data.conversation_history) == 2
        assert handoff_data.analytics_summary["total_messages"] == 2
        assert handoff_data.handoff_reason == "flow_completed"
    
    def test_create_handoff_data_information_only(self):
        """Test creating handoff data for information-only request."""
        self.mock_conversation_state.wants_scheduling = False
        conversation_history = [
            {"direction": "inbound", "content": "Hello", "timestamp": datetime.utcnow().isoformat()}
        ]
        
        handoff_data = self.service.create_handoff_data(
            session=self.mock_session,
            conversation_state=self.mock_conversation_state,
            conversation_history=conversation_history,
            handoff_reason="flow_completed"
        )
        
        assert handoff_data.session_summary["request_type"] == "information_only"
        assert handoff_data.request_data["wants_scheduling"] is False
        assert handoff_data.analytics_summary["total_messages"] == 1
    
    def test_format_handoff_summary_for_agents(self):
        """Test formatting handoff summary for human agents."""
        conversation_history = [
            {"direction": "inbound", "content": "Hello", "timestamp": datetime.utcnow().isoformat()},
            {"direction": "outbound", "content": "Welcome", "timestamp": datetime.utcnow().isoformat()}
        ]
        
        handoff_data = self.service.create_handoff_data(
            session=self.mock_session,
            conversation_state=self.mock_conversation_state,
            conversation_history=conversation_history,
            handoff_reason="flow_completed"
        )
        
        summary = self.service.format_handoff_summary_for_agents(handoff_data)
        
        assert isinstance(summary, str)
        assert "RESUMO DA CONVERSA" in summary
        assert self.mock_session.phone_number in summary
        assert "Cliente Novo" in summary
        assert "Direito Civil" in summary
        assert "Presencial" in summary
        assert "MÉTRICAS DA SESSÃO" in summary
        assert "TIMESTAMPS" in summary
    
    def test_validate_phone_number_valid(self):
        """Test phone number validation with valid numbers."""
        valid_numbers = [
            "5573982005612",
            "11999999999",
            "(11) 99999-9999",
            "+55 11 99999-9999"
        ]
        
        for number in valid_numbers:
            result = self.service.validate_phone_number(number)
            assert result["is_valid"] is True
            assert result["formatted_number"] is not None
            assert len(result["errors"]) == 0
    
    def test_validate_phone_number_invalid(self):
        """Test phone number validation with invalid numbers."""
        invalid_numbers = [
            "123",  # Too short
            "123456789012345678",  # Too long
            "",  # Empty
            "abc"  # Non-numeric
        ]
        
        for number in invalid_numbers:
            result = self.service.validate_phone_number(number)
            assert result["is_valid"] is False
            assert result["formatted_number"] is None
            assert len(result["errors"]) > 0
    
    def test_get_display_names(self):
        """Test getting display names for various IDs."""
        # Test practice area display names
        assert self.service.get_practice_area_display_name("area_civil") == "Direito Civil"
        assert self.service.get_practice_area_display_name("invalid") == "Área não especificada"
        
        # Test scheduling type display names
        assert self.service.get_scheduling_type_display_name("type_presencial") == "Presencial"
        assert self.service.get_scheduling_type_display_name("invalid") == "Modalidade não especificada"
        
        # Test client type display names
        assert self.service.get_client_type_display_name("client_new") == "Cliente Novo"
        assert self.service.get_client_type_display_name("invalid") == "Tipo não especificado"
    
    def test_calculate_session_duration(self):
        """Test session duration calculation."""
        # Test with valid timestamps
        duration = self.service._calculate_session_duration(self.mock_session)
        assert isinstance(duration, float)
        assert duration >= 0.0
        
        # Test with None timestamps
        self.mock_session.created_at = None
        duration = self.service._calculate_session_duration(self.mock_session)
        assert duration == 0.0


class TestSchedulingServiceFactory:
    """Test SchedulingService factory function."""
    
    def test_get_scheduling_service(self):
        """Test factory function returns SchedulingService instance."""
        service = get_scheduling_service()
        
        assert isinstance(service, SchedulingService)
        assert service.practice_area_names is not None


class TestSchedulingServiceIntegration:
    """Integration tests for SchedulingService."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.service = SchedulingService()
        
        # Create realistic session and conversation state
        self.session = MagicMock(spec=UserSession)
        self.session.id = uuid.uuid4()
        self.session.phone_number = "5511987654321"
        self.session.created_at = datetime(2024, 1, 1, 10, 0, 0)
        self.session.updated_at = datetime(2024, 1, 1, 10, 15, 0)  # 15 minutes later
        
        self.conversation_state = MagicMock(spec=ConversationState)
        self.conversation_state.client_type = "client_new"
        self.conversation_state.practice_area = "area_trabalhista"
        self.conversation_state.wants_scheduling = True
        self.conversation_state.scheduling_preference = "type_online"
        self.conversation_state.custom_requests = ["Urgente", "Horário flexível"]
        self.conversation_state.flow_completed = True
    
    def test_complete_scheduling_flow(self):
        """Test complete scheduling flow from validation to handoff."""
        # 1. Validate data
        validation = self.service.validate_scheduling_data(self.conversation_state)
        assert validation["is_valid"] is True
        
        # 2. Create scheduling request
        request = self.service.create_scheduling_request(self.session, self.conversation_state)
        assert request.practice_area == "area_trabalhista"
        assert request.scheduling_type == "type_online"
        
        # 3. Format confirmation
        confirmation = self.service.format_scheduling_confirmation(request)
        assert "ONLINE" in confirmation
        assert "Direito Trabalhista" in confirmation
        
        # 4. Create handoff data
        conversation_history = [
            {"direction": "inbound", "content": "Olá", "timestamp": "2024-01-01T10:00:00"},
            {"direction": "outbound", "content": "Bem-vindo", "timestamp": "2024-01-01T10:00:30"},
            {"direction": "inbound", "content": "Sou cliente novo", "timestamp": "2024-01-01T10:01:00"},
            {"direction": "outbound", "content": "Área jurídica?", "timestamp": "2024-01-01T10:01:30"},
            {"direction": "inbound", "content": "Trabalhista", "timestamp": "2024-01-01T10:02:00"}
        ]
        
        handoff_data = self.service.create_handoff_data(
            session=self.session,
            conversation_state=self.conversation_state,
            conversation_history=conversation_history,
            handoff_reason="flow_completed"
        )
        
        assert handoff_data.session_summary["request_type"] == "scheduling"
        assert handoff_data.analytics_summary["total_messages"] == 5
        assert handoff_data.analytics_summary["inbound_messages"] == 3
        assert handoff_data.analytics_summary["outbound_messages"] == 2
        
        # 5. Format summary for agents
        summary = self.service.format_handoff_summary_for_agents(handoff_data)
        assert "Cliente Novo" in summary
        assert "Direito Trabalhista" in summary
        assert "Online" in summary
        assert "15.0 minutos" in summary
        assert "Urgente" in summary
        assert "Horário flexível" in summary
    
    def test_complete_information_only_flow(self):
        """Test complete information-only flow."""
        # Change to information-only request
        self.conversation_state.wants_scheduling = False
        self.conversation_state.scheduling_preference = None
        
        # 1. Validate data (should still be valid for information-only)
        validation = self.service.validate_scheduling_data(self.conversation_state)
        assert validation["is_valid"] is True
        
        # 2. Create information request
        request = self.service.create_information_request(self.session, self.conversation_state)
        assert request.wants_scheduling is False
        assert request.practice_area == "area_trabalhista"
        
        # 3. Format confirmation
        confirmation = self.service.format_information_confirmation(request)
        assert "informações" in confirmation.lower()
        assert "Direito Trabalhista" in confirmation
        
        # 4. Create handoff data
        conversation_history = [
            {"direction": "inbound", "content": "Preciso de informações", "timestamp": "2024-01-01T10:00:00"},
            {"direction": "outbound", "content": "Claro, qual área?", "timestamp": "2024-01-01T10:00:30"}
        ]
        
        handoff_data = self.service.create_handoff_data(
            session=self.session,
            conversation_state=self.conversation_state,
            conversation_history=conversation_history,
            handoff_reason="flow_completed"
        )
        
        assert handoff_data.session_summary["request_type"] == "information_only"
        assert handoff_data.request_data["wants_scheduling"] is False
        
        # 5. Format summary
        summary = self.service.format_handoff_summary_for_agents(handoff_data)
        assert "Apenas informações" in summary or "Information Only" in summary