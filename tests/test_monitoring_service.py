"""
Tests for MonitoringService.
"""

import pytest
import asyncio
import time
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.monitoring_service import (
    MonitoringService,
    HealthStatus,
    MetricType,
    HealthCheck,
    PerformanceMetric,
    SystemHealth,
    ResponseTimeTracker
)
from app.services.analytics_service import AnalyticsService


class TestMonitoringService:
    """Test cases for MonitoringService."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Create a mock database session."""
        session = AsyncMock(spec=AsyncSession)
        session.execute = AsyncMock()
        return session
    
    @pytest.fixture
    def mock_analytics_service(self):
        """Create a mock analytics service."""
        analytics = AsyncMock(spec=AnalyticsService)
        analytics.record_response_time = AsyncMock()
        analytics.record_error = AsyncMock()
        analytics.get_flow_completion_rate = AsyncMock(return_value=85.0)
        analytics.get_handoff_rate = AsyncMock(return_value=15.0)
        analytics.get_analytics_summary = AsyncMock()
        return analytics
    
    @pytest.fixture
    def monitoring_service(self, mock_db_session, mock_analytics_service):
        """Create MonitoringService instance with mocked dependencies."""
        return MonitoringService(mock_db_session, mock_analytics_service)
    
    async def test_track_response_time_context_manager(self, monitoring_service):
        """Test response time tracking context manager."""
        
        import uuid
        operation = "test_operation"
        session_id = str(uuid.uuid4())  # Use valid UUID
        
        # Use the context manager
        async with monitoring_service.track_response_time(operation, session_id) as tracker:
            # Simulate some work
            await asyncio.sleep(0.01)  # 10ms
        
        # Verify analytics was called
        monitoring_service.analytics.record_response_time.assert_called_once()
        call_args = monitoring_service.analytics.record_response_time.call_args
        
        # Check that response time was recorded (should be around 10ms)
        assert call_args[1]['response_time_ms'] >= 10
        assert call_args[1]['operation_type'] == operation
    
    async def test_track_response_time_with_exception(self, monitoring_service):
        """Test response time tracking when exception occurs."""
        
        operation = "failing_operation"
        
        try:
            async with monitoring_service.track_response_time(operation):
                raise ValueError("Test error")
        except ValueError:
            pass  # Expected
        
        # Verify that metrics were still recorded in cache even with exception
        assert "response_time" in monitoring_service._metrics_cache
        metrics = monitoring_service._metrics_cache["response_time"]
        assert len(metrics) == 1
        assert metrics[0].labels["operation"] == operation
        assert metrics[0].labels["success"] == "False"  # Should be False due to exception
        
        # Analytics should not be called since no session_id was provided
        monitoring_service.analytics.record_response_time.assert_not_called()
    
    async def test_record_response_time_direct(self, monitoring_service):
        """Test direct response time recording."""
        
        import uuid
        operation = "direct_test"
        response_time_ms = 150.5
        session_id = str(uuid.uuid4())  # Use valid UUID
        
        await monitoring_service.record_response_time(
            operation=operation,
            response_time_ms=response_time_ms,
            session_id=session_id,
            success=True
        )
        
        # Verify analytics was called
        monitoring_service.analytics.record_response_time.assert_called_once()
        
        # Check metrics cache
        assert "response_time" in monitoring_service._metrics_cache
        metrics = monitoring_service._metrics_cache["response_time"]
        assert len(metrics) == 1
        assert metrics[0].value == response_time_ms
        assert metrics[0].labels["operation"] == operation
        assert metrics[0].labels["success"] == "True"
    
    async def test_record_throughput(self, monitoring_service):
        """Test throughput recording."""
        
        operation = "message_processing"
        count = 120
        time_window = 60
        
        await monitoring_service.record_throughput(operation, count, time_window)
        
        # Check metrics cache
        assert "throughput" in monitoring_service._metrics_cache
        metrics = monitoring_service._metrics_cache["throughput"]
        assert len(metrics) == 1
        assert metrics[0].value == 2.0  # 120 ops / 60 seconds
        assert metrics[0].unit == "ops/sec"
        assert metrics[0].labels["operation"] == operation
    
    async def test_check_database_health_success(self, monitoring_service, mock_db_session):
        """Test successful database health check."""
        
        # Mock successful database query
        mock_result = MagicMock()
        mock_result.scalar.return_value = 42
        mock_db_session.execute.return_value = mock_result
        
        health_check = await monitoring_service.check_database_health()
        
        assert health_check.service == "database"
        assert health_check.status == HealthStatus.HEALTHY
        assert "42 sessions" in health_check.message
        assert health_check.response_time_ms is not None
        assert health_check.metadata["session_count"] == 42
    
    async def test_check_database_health_slow_response(self, monitoring_service, mock_db_session):
        """Test database health check with slow response."""
        
        # Mock slow database query
        async def slow_execute(*args, **kwargs):
            await asyncio.sleep(1.1)  # Simulate 1.1 second delay
            mock_result = MagicMock()
            mock_result.scalar.return_value = 10
            return mock_result
        
        mock_db_session.execute.side_effect = slow_execute
        
        health_check = await monitoring_service.check_database_health()
        
        assert health_check.service == "database"
        assert health_check.status == HealthStatus.WARNING
        assert "responding slowly" in health_check.message
        assert health_check.response_time_ms > 1000
    
    async def test_check_database_health_failure(self, monitoring_service, mock_db_session):
        """Test database health check failure."""
        
        # Mock database connection failure
        mock_db_session.execute.side_effect = Exception("Connection failed")
        
        health_check = await monitoring_service.check_database_health()
        
        assert health_check.service == "database"
        assert health_check.status == HealthStatus.CRITICAL
        assert "Connection failed" in health_check.message
        assert "error" in health_check.metadata
    
    async def test_check_analytics_health_success(self, monitoring_service, mock_analytics_service):
        """Test successful analytics health check."""
        
        mock_analytics_service.get_flow_completion_rate.return_value = 78.5
        
        health_check = await monitoring_service.check_analytics_health()
        
        assert health_check.service == "analytics"
        assert health_check.status == HealthStatus.HEALTHY
        assert "78.5%" in health_check.message
        assert health_check.metadata["completion_rate"] == 78.5
    
    async def test_check_analytics_health_failure(self, monitoring_service, mock_analytics_service):
        """Test analytics health check failure."""
        
        mock_analytics_service.get_flow_completion_rate.side_effect = Exception("Analytics error")
        
        health_check = await monitoring_service.check_analytics_health()
        
        assert health_check.service == "analytics"
        assert health_check.status == HealthStatus.WARNING
        assert "Analytics error" in health_check.message
    
    async def test_check_system_health_all_healthy(self, monitoring_service, mock_db_session, mock_analytics_service):
        """Test system health check when all services are healthy."""
        
        # Mock successful database query
        mock_result = MagicMock()
        mock_result.scalar.return_value = 10
        mock_db_session.execute.return_value = mock_result
        
        # Mock successful analytics
        mock_analytics_service.get_flow_completion_rate.return_value = 80.0
        
        system_health = await monitoring_service.check_system_health()
        
        assert system_health.overall_status == HealthStatus.HEALTHY
        assert len(system_health.checks) == 2
        assert system_health.uptime_seconds > 0
        assert system_health.is_healthy is True
    
    async def test_check_system_health_with_warnings(self, monitoring_service, mock_db_session, mock_analytics_service):
        """Test system health check with warnings."""
        
        # Mock slow database
        async def slow_execute(*args, **kwargs):
            await asyncio.sleep(1.1)
            mock_result = MagicMock()
            mock_result.scalar.return_value = 10
            return mock_result
        
        mock_db_session.execute.side_effect = slow_execute
        mock_analytics_service.get_flow_completion_rate.return_value = 80.0
        
        system_health = await monitoring_service.check_system_health()
        
        assert system_health.overall_status == HealthStatus.WARNING
        assert system_health.is_healthy is True  # Warning is still considered healthy
    
    async def test_check_system_health_critical(self, monitoring_service, mock_db_session, mock_analytics_service):
        """Test system health check with critical issues."""
        
        # Mock database failure
        mock_db_session.execute.side_effect = Exception("Database down")
        mock_analytics_service.get_flow_completion_rate.return_value = 80.0
        
        system_health = await monitoring_service.check_system_health()
        
        assert system_health.overall_status == HealthStatus.CRITICAL
        assert system_health.is_healthy is False
    
    async def test_get_csat_metrics(self, monitoring_service, mock_analytics_service):
        """Test CSAT metrics calculation."""
        
        mock_analytics_service.get_flow_completion_rate.return_value = 85.0
        mock_analytics_service.get_handoff_rate.return_value = 10.0
        
        csat_metrics = await monitoring_service.get_csat_metrics()
        
        assert "estimated_csat" in csat_metrics
        assert "completion_rate" in csat_metrics
        assert "handoff_rate" in csat_metrics
        assert csat_metrics["completion_rate"] == 85.0
        assert csat_metrics["handoff_rate"] == 10.0
        assert 1.0 <= csat_metrics["estimated_csat"] <= 5.0
    
    async def test_get_performance_summary(self, monitoring_service, mock_db_session, mock_analytics_service):
        """Test comprehensive performance summary."""
        
        # Mock analytics summary
        mock_summary = MagicMock()
        mock_summary.total_sessions = 100
        mock_summary.completion_rate = 85.0
        mock_summary.handoff_rate = 15.0
        mock_summary.average_response_time = 150.0
        mock_summary.error_rate = 2.0
        mock_summary.timeout_rate = 1.0
        mock_analytics_service.get_analytics_summary.return_value = mock_summary
        
        # Mock database health
        mock_result = MagicMock()
        mock_result.scalar.return_value = 100
        mock_db_session.execute.return_value = mock_result
        
        # Mock analytics health
        mock_analytics_service.get_flow_completion_rate.return_value = 85.0
        mock_analytics_service.get_handoff_rate.return_value = 15.0
        
        summary = await monitoring_service.get_performance_summary()
        
        assert "analytics" in summary
        assert "csat" in summary
        assert "system_health" in summary
        assert "performance_metrics" in summary
        assert "timestamp" in summary
        
        assert summary["analytics"]["total_sessions"] == 100
        assert summary["analytics"]["completion_rate"] == 85.0
        assert summary["system_health"]["status"] == HealthStatus.HEALTHY.value
    
    async def test_log_error_with_session(self, monitoring_service, mock_analytics_service):
        """Test error logging with session ID."""
        
        import uuid
        error = ValueError("Test error")
        context = {"operation": "test_op", "step_id": "welcome"}
        session_id = str(uuid.uuid4())  # Use valid UUID
        
        # Mock the logger on the monitoring service instance
        with patch.object(monitoring_service, 'logger') as mock_logger:
            await monitoring_service.log_error(error, context, session_id)
            
            # Verify logging was called
            mock_logger.error.assert_called_once()
            
            # Verify analytics error recording was called
            mock_analytics_service.record_error.assert_called_once()
            call_args = mock_analytics_service.record_error.call_args
            assert call_args[1]['error_type'] == 'ValueError'
            assert call_args[1]['error_message'] == 'Test error'
            assert call_args[1]['step_id'] == 'welcome'
    
    async def test_log_error_without_session(self, monitoring_service):
        """Test error logging without session ID."""
        
        error = RuntimeError("Runtime error")
        context = {"operation": "background_task"}
        
        # Mock the logger on the monitoring service instance
        with patch.object(monitoring_service, 'logger') as mock_logger:
            await monitoring_service.log_error(error, context)
            
            # Verify logging was called
            mock_logger.error.assert_called_once()
            
            # Verify analytics was not called (no session_id)
            monitoring_service.analytics.record_error.assert_not_called()
    
    def test_metrics_cache_management(self, monitoring_service):
        """Test metrics cache size management."""
        
        # Add more than 100 metrics to test cache size limit
        for i in range(150):
            metric = PerformanceMetric(
                metric_type=MetricType.RESPONSE_TIME,
                value=float(i),
                unit="ms",
                timestamp=datetime.utcnow(),
                labels={"test": str(i)}
            )
            monitoring_service._add_metric_to_cache("test_metrics", metric)
        
        # Verify cache is limited to 100 items
        assert len(monitoring_service._metrics_cache["test_metrics"]) == 100
        
        # Verify it kept the most recent metrics
        assert monitoring_service._metrics_cache["test_metrics"][-1].value == 149.0
        assert monitoring_service._metrics_cache["test_metrics"][0].value == 50.0
    
    def test_get_recent_metrics_from_cache(self, monitoring_service):
        """Test retrieving recent metrics from cache."""
        
        # Add some old and new metrics
        old_time = datetime.utcnow() - timedelta(hours=2)
        recent_time = datetime.utcnow() - timedelta(minutes=30)
        
        old_metric = PerformanceMetric(
            metric_type=MetricType.RESPONSE_TIME,
            value=100.0,
            unit="ms",
            timestamp=old_time,
            labels={"age": "old"}
        )
        
        recent_metric = PerformanceMetric(
            metric_type=MetricType.RESPONSE_TIME,
            value=200.0,
            unit="ms",
            timestamp=recent_time,
            labels={"age": "recent"}
        )
        
        monitoring_service._add_metric_to_cache("test_recent", old_metric)
        monitoring_service._add_metric_to_cache("test_recent", recent_metric)
        
        # Get recent metrics (last 60 minutes)
        recent_metrics = monitoring_service._get_recent_metrics_from_cache(60)
        
        # Should only include the recent metric
        assert "test_recent" in recent_metrics
        assert len(recent_metrics["test_recent"]) == 1
        assert recent_metrics["test_recent"][0]["value"] == 200.0
        assert recent_metrics["test_recent"][0]["labels"]["age"] == "recent"


@pytest.mark.asyncio
class TestMonitoringServiceIntegration:
    """Integration tests for MonitoringService."""
    
    async def test_end_to_end_monitoring_flow(self):
        """Test complete monitoring workflow."""
        # This would test with real database and analytics service
        pass
    
    async def test_concurrent_response_time_tracking(self):
        """Test concurrent response time tracking."""
        # This would test multiple simultaneous operations
        pass
    
    async def test_health_check_under_load(self):
        """Test health checks under system load."""
        # This would test health checks with high concurrent usage
        pass