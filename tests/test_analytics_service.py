"""
Unit tests for AnalyticsService.
"""

import pytest
import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.analytics_service import (
    AnalyticsService,
    EventType,
    AnalyticsMetrics,
    FlowMetrics
)
from app.models.conversation import AnalyticsEvent, UserSession


class TestAnalyticsService:
    """Test cases for AnalyticsService."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Create a mock database session."""
        session = AsyncMock(spec=AsyncSession)
        session.add = MagicMock()
        session.commit = AsyncMock()
        session.refresh = AsyncMock()
        session.scalar = AsyncMock()
        session.execute = AsyncMock()
        return session
    
    @pytest.fixture
    def analytics_service(self, mock_db_session):
        """Create AnalyticsService instance with mocked dependencies."""
        return AnalyticsService(mock_db_session)
    
    @pytest.fixture
    def sample_session_id(self):
        """Generate a sample session ID."""
        return uuid.uuid4()
    
    async def test_record_event_basic(self, analytics_service, mock_db_session, sample_session_id):
        """Test basic event recording."""
        
        # Arrange
        event_type = EventType.FLOW_START
        step_id = "welcome"
        event_data = {"test": "data"}
        
        # Act
        result = await analytics_service.record_event(
            session_id=sample_session_id,
            event_type=event_type,
            step_id=step_id,
            event_data=event_data
        )
        
        # Assert
        mock_db_session.add.assert_called_once()
        mock_db_session.commit.assert_called_once()
        mock_db_session.refresh.assert_called_once()
        
        # Verify the event object was created correctly
        added_event = mock_db_session.add.call_args[0][0]
        assert isinstance(added_event, AnalyticsEvent)
        assert added_event.session_id == sample_session_id
        assert added_event.event_type == event_type.value
        assert added_event.step_id == step_id
        assert added_event.event_data == event_data
    
    async def test_record_flow_start(self, analytics_service, mock_db_session, sample_session_id):
        """Test recording flow start event."""
        
        # Act
        result = await analytics_service.record_flow_start(sample_session_id)
        
        # Assert
        mock_db_session.add.assert_called_once()
        added_event = mock_db_session.add.call_args[0][0]
        assert added_event.event_type == EventType.FLOW_START.value
        assert added_event.step_id == "welcome"
        assert "timestamp" in added_event.event_data
    
    async def test_record_step_completion(self, analytics_service, mock_db_session, sample_session_id):
        """Test recording step completion event."""
        
        # Arrange
        step_id = "client_type"
        user_input = "Cliente Novo"
        response_time_ms = 150.5
        
        # Act
        result = await analytics_service.record_step_completion(
            session_id=sample_session_id,
            step_id=step_id,
            user_input=user_input,
            response_time_ms=response_time_ms
        )
        
        # Assert
        added_event = mock_db_session.add.call_args[0][0]
        assert added_event.event_type == EventType.STEP_COMPLETED.value
        assert added_event.step_id == step_id
        assert added_event.event_data["user_input"] == user_input
        assert added_event.event_data["response_time_ms"] == response_time_ms
    
    async def test_record_handoff_trigger(self, analytics_service, mock_db_session, sample_session_id):
        """Test recording handoff trigger event."""
        
        # Arrange
        trigger_reason = "escape_command"
        collected_data = {"client_type": "new", "practice_area": "civil"}
        
        # Act
        result = await analytics_service.record_handoff_trigger(
            session_id=sample_session_id,
            trigger_reason=trigger_reason,
            collected_data=collected_data
        )
        
        # Assert
        added_event = mock_db_session.add.call_args[0][0]
        assert added_event.event_type == EventType.HANDOFF_TRIGGERED.value
        assert added_event.event_data["trigger_reason"] == trigger_reason
        assert added_event.event_data["collected_data"] == collected_data
    
    async def test_record_flow_completion(self, analytics_service, mock_db_session, sample_session_id):
        """Test recording flow completion event."""
        
        # Arrange
        completion_type = "scheduling_requested"
        total_duration_seconds = 120.5
        
        # Act
        result = await analytics_service.record_flow_completion(
            session_id=sample_session_id,
            completion_type=completion_type,
            total_duration_seconds=total_duration_seconds
        )
        
        # Assert
        added_event = mock_db_session.add.call_args[0][0]
        assert added_event.event_type == EventType.FLOW_COMPLETED.value
        assert added_event.event_data["completion_type"] == completion_type
        assert added_event.event_data["total_duration_seconds"] == total_duration_seconds
    
    async def test_record_error(self, analytics_service, mock_db_session, sample_session_id):
        """Test recording error event."""
        
        # Arrange
        error_type = "validation_error"
        error_message = "Invalid input format"
        step_id = "practice_area"
        
        # Act
        result = await analytics_service.record_error(
            session_id=sample_session_id,
            error_type=error_type,
            error_message=error_message,
            step_id=step_id
        )
        
        # Assert
        added_event = mock_db_session.add.call_args[0][0]
        assert added_event.event_type == EventType.ERROR_OCCURRED.value
        assert added_event.step_id == step_id
        assert added_event.event_data["error_type"] == error_type
        assert added_event.event_data["error_message"] == error_message
    
    async def test_record_response_time(self, analytics_service, mock_db_session, sample_session_id):
        """Test recording response time event."""
        
        # Arrange
        response_time_ms = 250.0
        operation_type = "message_processing"
        
        # Act
        result = await analytics_service.record_response_time(
            session_id=sample_session_id,
            response_time_ms=response_time_ms,
            operation_type=operation_type
        )
        
        # Assert
        added_event = mock_db_session.add.call_args[0][0]
        assert added_event.event_type == EventType.RESPONSE_TIME.value
        assert added_event.event_data["response_time_ms"] == response_time_ms
        assert added_event.event_data["operation_type"] == operation_type
    
    async def test_get_flow_completion_rate_with_data(self, analytics_service, mock_db_session):
        """Test flow completion rate calculation with data."""
        
        # Arrange
        mock_db_session.scalar.side_effect = [10, 8]  # 10 starts, 8 completions
        
        # Act
        completion_rate = await analytics_service.get_flow_completion_rate()
        
        # Assert
        assert completion_rate == 80.0
        assert mock_db_session.scalar.call_count == 2
    
    async def test_get_flow_completion_rate_no_starts(self, analytics_service, mock_db_session):
        """Test flow completion rate calculation with no starts."""
        
        # Arrange
        mock_db_session.scalar.side_effect = [0, 0]  # No starts, no completions
        
        # Act
        completion_rate = await analytics_service.get_flow_completion_rate()
        
        # Assert
        assert completion_rate == 0.0
    
    async def test_get_handoff_rate_with_data(self, analytics_service, mock_db_session):
        """Test handoff rate calculation with data."""
        
        # Arrange
        mock_db_session.scalar.side_effect = [20, 5]  # 20 sessions, 5 handoffs
        
        # Act
        handoff_rate = await analytics_service.get_handoff_rate()
        
        # Assert
        assert handoff_rate == 25.0
        assert mock_db_session.scalar.call_count == 2
    
    async def test_get_handoff_rate_no_sessions(self, analytics_service, mock_db_session):
        """Test handoff rate calculation with no sessions."""
        
        # Arrange
        mock_db_session.scalar.side_effect = [0, 0]  # No sessions, no handoffs
        
        # Act
        handoff_rate = await analytics_service.get_handoff_rate()
        
        # Assert
        assert handoff_rate == 0.0
    
    async def test_get_step_completion_rates(self, analytics_service, mock_db_session):
        """Test step completion rates calculation."""
        
        # Arrange
        mock_result = MagicMock()
        mock_result.__iter__ = lambda self: iter([
            MagicMock(step_id="welcome", count=10),
            MagicMock(step_id="client_type", count=8),
            MagicMock(step_id="practice_area", count=6)
        ])
        
        mock_db_session.execute.return_value = mock_result
        mock_db_session.scalar.return_value = 10  # Total starts
        
        # Act
        step_rates = await analytics_service.get_step_completion_rates()
        
        # Assert
        expected_rates = {
            "welcome": 100.0,
            "client_type": 80.0,
            "practice_area": 60.0
        }
        assert step_rates == expected_rates
    
    async def test_get_average_response_time(self, analytics_service, mock_db_session):
        """Test average response time calculation."""
        
        # Arrange
        mock_db_session.scalar.return_value = 175.5
        
        # Act
        avg_response_time = await analytics_service.get_average_response_time()
        
        # Assert
        assert avg_response_time == 175.5
    
    async def test_get_average_response_time_no_data(self, analytics_service, mock_db_session):
        """Test average response time calculation with no data."""
        
        # Arrange
        mock_db_session.scalar.return_value = None
        
        # Act
        avg_response_time = await analytics_service.get_average_response_time()
        
        # Assert
        assert avg_response_time == 0.0
    
    async def test_get_analytics_summary(self, analytics_service, mock_db_session):
        """Test comprehensive analytics summary."""
        
        # Arrange
        # Mock all the scalar calls for different metrics
        mock_db_session.scalar.side_effect = [
            50,   # total_sessions
            40,   # completed_flows
            50,   # flow_starts for completion rate
            40,   # flow_completions for completion rate
            50,   # total_sessions for handoff rate
            10,   # handoffs for handoff rate
            50,   # flow_starts for step completion rates
            175.5, # average response time
            5,    # error count
            3     # timeout count
        ]
        
        # Mock step completion rates
        mock_result = MagicMock()
        mock_result.__iter__ = lambda self: iter([
            MagicMock(step_id="welcome", count=50),
            MagicMock(step_id="client_type", count=45)
        ])
        mock_db_session.execute.return_value = mock_result
        
        # Act
        summary = await analytics_service.get_analytics_summary()
        
        # Assert
        assert isinstance(summary, AnalyticsMetrics)
        assert summary.total_sessions == 50
        assert summary.completed_flows == 40
        assert summary.completion_rate == 80.0
        assert summary.handoff_rate == 20.0
        assert summary.average_response_time == 175.5
        assert summary.error_rate == 10.0
        assert summary.timeout_rate == 6.0
        assert "welcome" in summary.step_completion_rates
        assert "client_type" in summary.step_completion_rates
    
    async def test_event_data_defaults_to_empty_dict(self, analytics_service, mock_db_session, sample_session_id):
        """Test that event_data defaults to empty dict when None is provided."""
        
        # Act
        result = await analytics_service.record_event(
            session_id=sample_session_id,
            event_type=EventType.FLOW_START,
            event_data=None
        )
        
        # Assert
        added_event = mock_db_session.add.call_args[0][0]
        assert added_event.event_data == {}
    
    async def test_date_range_filtering(self, analytics_service, mock_db_session):
        """Test that date range filtering is applied correctly."""
        
        # Arrange
        start_date = datetime(2024, 1, 1)
        end_date = datetime(2024, 1, 31)
        mock_db_session.scalar.side_effect = [10, 8]
        
        # Act
        completion_rate = await analytics_service.get_flow_completion_rate(start_date, end_date)
        
        # Assert
        # Verify that the queries were called (we can't easily verify the exact WHERE clauses
        # without more complex mocking, but we can verify the calls were made)
        assert mock_db_session.scalar.call_count == 2
        assert completion_rate == 80.0


@pytest.mark.asyncio
class TestAnalyticsServiceIntegration:
    """Integration tests for AnalyticsService with real database operations."""
    
    # These would be implemented with a real test database
    # For now, we'll keep them as placeholders
    
    async def test_end_to_end_analytics_flow(self):
        """Test complete analytics flow from event recording to metrics calculation."""
        # This would test with a real database session
        pass
    
    async def test_concurrent_event_recording(self):
        """Test that concurrent event recording works correctly."""
        # This would test database transaction handling
        pass
    
    async def test_large_dataset_performance(self):
        """Test analytics calculations with large datasets."""
        # This would test query performance with substantial data
        pass