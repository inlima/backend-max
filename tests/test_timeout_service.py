"""
Integration tests for timeout handling and re-engagement.
"""

import asyncio
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch
import uuid

from app.services.timeout_service import (
    TimeoutService,
    TimeoutType,
    TimeoutConfig,
    ReengagementAttempt,
    get_timeout_service
)
from app.services.state_manager import StateManager
from app.services.message_builder import MessageBuilder
from app.services.whatsapp_client import WhatsAppClient


class MockSession:
    """Mock session for testing."""
    
    def __init__(self, session_id: str, phone_number: str, current_step: str = "welcome", 
                 updated_at: datetime = None):
        self.id = uuid.UUID(session_id) if isinstance(session_id, str) else session_id
        self.phone_number = phone_number
        self.current_step = current_step
        self.updated_at = updated_at or datetime.utcnow()
        self.is_active = True
        self.collected_data = {}


class TestTimeoutService:
    """Test cases for TimeoutService class."""
    
    @pytest.fixture
    def mock_state_manager(self):
        """Create mock state manager."""
        manager = Mock(spec=StateManager)
        manager.get_session = AsyncMock()
        manager.cleanup_expired_sessions = AsyncMock(return_value=0)
        manager.trigger_handoff = AsyncMock(return_value=True)
        manager.reset_session = AsyncMock(return_value=True)
        manager.deactivate_session = AsyncMock(return_value=True)
        manager.record_analytics_event = AsyncMock()
        return manager
    
    @pytest.fixture
    def mock_message_builder(self):
        """Create mock message builder."""
        builder = Mock(spec=MessageBuilder)
        builder.build_reengagement_message = Mock(return_value=Mock(body="Re-engagement message"))
        builder.build_step_timeout_message = Mock(return_value="Step timeout message")
        builder.build_session_timeout_message = Mock(return_value="Session timeout message")
        builder.build_final_reengagement_message = Mock(return_value="Final re-engagement message")
        builder.build_timeout_escalation_message = Mock(return_value="Timeout escalation message")
        builder.build_session_reset_message = Mock(return_value="Session reset message")
        return builder
    
    @pytest.fixture
    def mock_whatsapp_client(self):
        """Create mock WhatsApp client."""
        client = Mock(spec=WhatsAppClient)
        client.send_message = AsyncMock(return_value=True)
        return client
    
    @pytest.fixture
    def timeout_service(self, mock_state_manager, mock_message_builder, mock_whatsapp_client):
        """Create timeout service instance for testing."""
        return TimeoutService(mock_state_manager, mock_message_builder, mock_whatsapp_client)
    
    def test_timeout_config_initialization(self, timeout_service):
        """Test timeout configuration initialization."""
        assert TimeoutType.INACTIVITY in timeout_service.timeout_configs
        assert TimeoutType.STEP_TIMEOUT in timeout_service.timeout_configs
        assert TimeoutType.SESSION_TIMEOUT in timeout_service.timeout_configs
        
        inactivity_config = timeout_service.timeout_configs[TimeoutType.INACTIVITY]
        assert inactivity_config.timeout_minutes == 10
        assert inactivity_config.max_reengagement_attempts == 2
    
    def test_determine_timeout_type_inactivity(self, timeout_service):
        """Test timeout type determination for inactivity."""
        # Recent activity, in middle of flow
        session = MockSession(
            "12345678-1234-5678-9012-123456789012",
            "5511999999999",
            "practice_area",
            datetime.utcnow() - timedelta(minutes=5)
        )
        
        timeout_type = timeout_service._determine_timeout_type(session)
        assert timeout_type == TimeoutType.INACTIVITY
    
    def test_determine_timeout_type_step_timeout(self, timeout_service):
        """Test timeout type determination for step timeout."""
        # Longer inactivity, in middle of flow
        session = MockSession(
            "12345678-1234-5678-9012-123456789012",
            "5511999999999",
            "practice_area",
            datetime.utcnow() - timedelta(minutes=20)
        )
        
        timeout_type = timeout_service._determine_timeout_type(session)
        assert timeout_type == TimeoutType.STEP_TIMEOUT
    
    def test_determine_timeout_type_session_timeout(self, timeout_service):
        """Test timeout type determination for session timeout."""
        # Very long inactivity
        session = MockSession(
            "12345678-1234-5678-9012-123456789012",
            "5511999999999",
            "completed",
            datetime.utcnow() - timedelta(minutes=35)
        )
        
        timeout_type = timeout_service._determine_timeout_type(session)
        assert timeout_type == TimeoutType.SESSION_TIMEOUT
    
    def test_calculate_inactive_minutes(self, timeout_service):
        """Test inactive minutes calculation."""
        session = MockSession(
            "12345678-1234-5678-9012-123456789012",
            "5511999999999",
            updated_at=datetime.utcnow() - timedelta(minutes=15, seconds=30)
        )
        
        inactive_minutes = timeout_service._calculate_inactive_minutes(session)
        assert 15.4 < inactive_minutes < 15.6  # Should be around 15.5 minutes
    
    @pytest.mark.asyncio
    async def test_attempt_reengagement_success(self, timeout_service, mock_whatsapp_client):
        """Test successful re-engagement attempt."""
        session = MockSession("12345678-1234-5678-9012-123456789012", "5511999999999")
        
        await timeout_service._attempt_reengagement(session, TimeoutType.INACTIVITY, 1)
        
        # Verify message was sent
        mock_whatsapp_client.send_message.assert_called_once()
        
        # Verify attempt was recorded
        session_id = str(session.id)
        assert session_id in timeout_service.reengagement_attempts
        assert len(timeout_service.reengagement_attempts[session_id]) == 1
        
        attempt = timeout_service.reengagement_attempts[session_id][0]
        assert attempt.attempt_number == 1
        assert attempt.timeout_type == TimeoutType.INACTIVITY
        assert attempt.message_sent is True
    
    @pytest.mark.asyncio
    async def test_attempt_reengagement_failure(self, timeout_service, mock_whatsapp_client):
        """Test failed re-engagement attempt."""
        session = MockSession("12345678-1234-5678-9012-123456789012", "5511999999999")
        
        # Mock send_message to fail
        mock_whatsapp_client.send_message.return_value = False
        
        await timeout_service._attempt_reengagement(session, TimeoutType.INACTIVITY, 1)
        
        # Verify attempt was recorded with failure
        session_id = str(session.id)
        attempt = timeout_service.reengagement_attempts[session_id][0]
        assert attempt.message_sent is False
    
    def test_create_reengagement_message_types(self, timeout_service, mock_message_builder):
        """Test different re-engagement message types."""
        session = MockSession("12345678-1234-5678-9012-123456789012", "5511999999999", "practice_area")
        
        # Test inactivity message
        msg1 = timeout_service._create_reengagement_message(session, TimeoutType.INACTIVITY, 1)
        mock_message_builder.build_reengagement_message.assert_called()
        
        # Test step timeout message
        msg2 = timeout_service._create_reengagement_message(session, TimeoutType.STEP_TIMEOUT, 1)
        mock_message_builder.build_step_timeout_message.assert_called_with("practice_area")
        
        # Test session timeout message
        msg3 = timeout_service._create_reengagement_message(session, TimeoutType.SESSION_TIMEOUT, 1)
        mock_message_builder.build_session_timeout_message.assert_called()
        
        # Test final attempt message
        msg4 = timeout_service._create_reengagement_message(session, TimeoutType.INACTIVITY, 2)
        mock_message_builder.build_final_reengagement_message.assert_called()
    
    @pytest.mark.asyncio
    async def test_escalate_timeout_to_human(self, timeout_service, mock_state_manager, mock_whatsapp_client):
        """Test escalation to human agent."""
        session = MockSession("12345678-1234-5678-9012-123456789012", "5511999999999")
        
        await timeout_service._escalate_timeout_to_human(session, TimeoutType.INACTIVITY)
        
        # Verify handoff was triggered
        mock_state_manager.trigger_handoff.assert_called_once_with(session.id)
        
        # Verify escalation message was sent
        mock_whatsapp_client.send_message.assert_called_once()
        
        # Verify analytics event was recorded
        mock_state_manager.record_analytics_event.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_auto_reset_session(self, timeout_service, mock_state_manager, mock_whatsapp_client):
        """Test automatic session reset."""
        session = MockSession("12345678-1234-5678-9012-123456789012", "5511999999999")
        session_id = str(session.id)
        
        # Add some re-engagement attempts
        timeout_service.reengagement_attempts[session_id] = [
            ReengagementAttempt(session_id, 1, datetime.utcnow(), TimeoutType.INACTIVITY, True)
        ]
        
        await timeout_service._auto_reset_session(session, TimeoutType.SESSION_TIMEOUT)
        
        # Verify session was reset
        mock_state_manager.reset_session.assert_called_once_with(session.id)
        
        # Verify reset message was sent
        mock_whatsapp_client.send_message.assert_called_once()
        
        # Verify re-engagement attempts were cleared
        assert session_id not in timeout_service.reengagement_attempts
    
    @pytest.mark.asyncio
    async def test_deactivate_session(self, timeout_service, mock_state_manager):
        """Test session deactivation."""
        session = MockSession("12345678-1234-5678-9012-123456789012", "5511999999999")
        session_id = str(session.id)
        
        # Add some re-engagement attempts
        timeout_service.reengagement_attempts[session_id] = [
            ReengagementAttempt(session_id, 1, datetime.utcnow(), TimeoutType.INACTIVITY, True)
        ]
        
        await timeout_service._deactivate_session(session, TimeoutType.REENGAGEMENT_TIMEOUT)
        
        # Verify session was deactivated
        mock_state_manager.deactivate_session.assert_called_once_with(session.id)
        
        # Verify analytics event was recorded
        mock_state_manager.record_analytics_event.assert_called_once()
        
        # Verify re-engagement attempts were cleared
        assert session_id not in timeout_service.reengagement_attempts
    
    @pytest.mark.asyncio
    async def test_handle_user_response_after_timeout(self, timeout_service, mock_state_manager):
        """Test handling user response after timeout."""
        session_id = uuid.uuid4()
        session_id_str = str(session_id)
        
        # Add re-engagement attempt
        attempt = ReengagementAttempt(
            session_id_str, 1, datetime.utcnow() - timedelta(minutes=2), 
            TimeoutType.INACTIVITY, True
        )
        timeout_service.reengagement_attempts[session_id_str] = [attempt]
        
        # Handle user response
        result = await timeout_service.handle_user_response_after_timeout(session_id)
        
        assert result is True
        assert attempt.response_received is True
        assert session_id_str not in timeout_service.reengagement_attempts
        
        # Verify analytics event was recorded
        mock_state_manager.record_analytics_event.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_check_session_timeout_true(self, timeout_service, mock_state_manager):
        """Test session timeout check returns True for timed out session."""
        session_id = uuid.uuid4()
        
        # Mock session that has timed out
        timed_out_session = MockSession(
            session_id, "5511999999999", "practice_area",
            datetime.utcnow() - timedelta(minutes=20)
        )
        mock_state_manager.get_session.return_value = timed_out_session
        
        result = await timeout_service.check_session_timeout(session_id)
        assert result is True
    
    @pytest.mark.asyncio
    async def test_check_session_timeout_false(self, timeout_service, mock_state_manager):
        """Test session timeout check returns False for active session."""
        session_id = uuid.uuid4()
        
        # Mock active session
        active_session = MockSession(
            session_id, "5511999999999", "practice_area",
            datetime.utcnow() - timedelta(minutes=5)
        )
        mock_state_manager.get_session.return_value = active_session
        
        result = await timeout_service.check_session_timeout(session_id)
        assert result is False
    
    @pytest.mark.asyncio
    async def test_check_session_timeout_nonexistent(self, timeout_service, mock_state_manager):
        """Test session timeout check for nonexistent session."""
        session_id = uuid.uuid4()
        
        # Mock nonexistent session
        mock_state_manager.get_session.return_value = None
        
        result = await timeout_service.check_session_timeout(session_id)
        assert result is True  # Nonexistent sessions are considered timed out
    
    @pytest.mark.asyncio
    async def test_start_stop_monitoring(self, timeout_service):
        """Test starting and stopping timeout monitoring."""
        # Test starting monitoring
        await timeout_service.start_monitoring(check_interval_minutes=1)
        assert timeout_service._is_monitoring is True
        assert timeout_service._monitoring_task is not None
        
        # Test stopping monitoring
        await timeout_service.stop_monitoring()
        assert timeout_service._is_monitoring is False
    
    @pytest.mark.asyncio
    async def test_monitoring_already_running(self, timeout_service):
        """Test starting monitoring when already running."""
        await timeout_service.start_monitoring(check_interval_minutes=1)
        
        # Try to start again - should not create new task
        original_task = timeout_service._monitoring_task
        await timeout_service.start_monitoring(check_interval_minutes=1)
        
        assert timeout_service._monitoring_task is original_task
        
        await timeout_service.stop_monitoring()
    
    def test_get_timeout_stats(self, timeout_service):
        """Test timeout statistics retrieval."""
        # Add some test data
        session_id1 = "12345678-1234-5678-9012-123456789012"
        session_id2 = "87654321-4321-8765-2109-876543210987"
        
        timeout_service.reengagement_attempts[session_id1] = [
            ReengagementAttempt(session_id1, 1, datetime.utcnow(), TimeoutType.INACTIVITY, True, True)
        ]
        timeout_service.reengagement_attempts[session_id2] = [
            ReengagementAttempt(session_id2, 1, datetime.utcnow(), TimeoutType.INACTIVITY, True, False),
            ReengagementAttempt(session_id2, 2, datetime.utcnow(), TimeoutType.INACTIVITY, True, False)
        ]
        
        stats = timeout_service.get_timeout_stats()
        
        assert stats["active_reengagement_sessions"] == 2
        assert stats["total_reengagement_attempts"] == 3
        assert stats["successful_reengagements"] == 1
        assert stats["reengagement_success_rate"] == 33.33333333333333
        assert "monitoring_active" in stats
    
    def test_calculate_response_time(self, timeout_service):
        """Test response time calculation."""
        # Test with response received
        attempt_with_response = ReengagementAttempt(
            "test_session", 1, datetime.utcnow() - timedelta(minutes=5),
            TimeoutType.INACTIVITY, True, True
        )
        
        response_time = timeout_service._calculate_response_time(attempt_with_response)
        assert 4.9 < response_time < 5.1  # Should be around 5 minutes
        
        # Test without response received
        attempt_without_response = ReengagementAttempt(
            "test_session", 1, datetime.utcnow() - timedelta(minutes=5),
            TimeoutType.INACTIVITY, True, False
        )
        
        response_time = timeout_service._calculate_response_time(attempt_without_response)
        assert response_time == 0


class TestTimeoutServiceIntegration:
    """Integration tests for timeout service."""
    
    @pytest.mark.asyncio
    async def test_full_reengagement_flow(self):
        """Test complete re-engagement flow."""
        # Create mocks
        mock_state_manager = Mock(spec=StateManager)
        mock_state_manager.record_analytics_event = AsyncMock()
        mock_state_manager.trigger_handoff = AsyncMock(return_value=True)
        
        mock_message_builder = Mock(spec=MessageBuilder)
        mock_message_builder.build_reengagement_message = Mock(
            return_value=Mock(body="Please continue our conversation")
        )
        mock_message_builder.build_final_reengagement_message = Mock(
            return_value="This is our final attempt to reach you"
        )
        mock_message_builder.build_timeout_escalation_message = Mock(
            return_value="Transferring to human agent"
        )
        
        mock_whatsapp_client = Mock(spec=WhatsAppClient)
        mock_whatsapp_client.send_message = AsyncMock(return_value=True)
        
        # Create service
        service = TimeoutService(mock_state_manager, mock_message_builder, mock_whatsapp_client)
        
        # Create test session
        session = MockSession("12345678-1234-5678-9012-123456789012", "5511999999999", "practice_area")
        
        # First re-engagement attempt
        await service._attempt_reengagement(session, TimeoutType.INACTIVITY, 1)
        
        # Verify first attempt
        assert len(service.reengagement_attempts[str(session.id)]) == 1
        mock_whatsapp_client.send_message.assert_called()
        
        # Second re-engagement attempt
        await service._attempt_reengagement(session, TimeoutType.INACTIVITY, 2)
        
        # Verify second attempt
        assert len(service.reengagement_attempts[str(session.id)]) == 2
        mock_message_builder.build_final_reengagement_message.assert_called()
        
        # Escalate after max attempts
        await service._escalate_timeout_to_human(session, TimeoutType.INACTIVITY)
        
        # Verify escalation
        mock_state_manager.trigger_handoff.assert_called_once_with(session.id)
        mock_message_builder.build_timeout_escalation_message.assert_called()
    
    @pytest.mark.asyncio
    async def test_error_handling_in_reengagement(self):
        """Test error handling during re-engagement."""
        # Create mocks that will fail
        mock_state_manager = Mock(spec=StateManager)
        mock_state_manager.record_analytics_event = AsyncMock(side_effect=Exception("Database error"))
        
        mock_message_builder = Mock(spec=MessageBuilder)
        mock_message_builder.build_reengagement_message = Mock(
            return_value=Mock(body="Test message")
        )
        
        mock_whatsapp_client = Mock(spec=WhatsApp_client)
        mock_whatsapp_client.send_message = AsyncMock(side_effect=Exception("Network error"))
        
        # Create service
        service = TimeoutService(mock_state_manager, mock_message_builder, mock_whatsapp_client)
        
        # Create test session
        session = MockSession("12345678-1234-5678-9012-123456789012", "5511999999999")
        
        # Attempt re-engagement - should not raise exception
        await service._attempt_reengagement(session, TimeoutType.INACTIVITY, 1)
        
        # Verify attempt was still recorded despite errors
        session_id = str(session.id)
        assert session_id in service.reengagement_attempts
        attempt = service.reengagement_attempts[session_id][0]
        assert attempt.message_sent is False  # Should be False due to send failure


def test_get_timeout_service_singleton():
    """Test that get_timeout_service returns singleton instance."""
    mock_state_manager = Mock(spec=StateManager)
    
    service1 = get_timeout_service(mock_state_manager)
    service2 = get_timeout_service()
    
    assert service1 is service2
    assert isinstance(service1, TimeoutService)