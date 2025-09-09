"""
Unit tests for error handling system.
"""

import asyncio
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch
import httpx
from sqlalchemy.exc import SQLAlchemyError, OperationalError

from app.services.error_handler import (
    ErrorHandler,
    ErrorType,
    ErrorSeverity,
    ErrorContext,
    ErrorResponse,
    RetryStrategy,
    CircuitBreaker,
    get_error_handler
)


class TestErrorHandler:
    """Test cases for ErrorHandler class."""
    
    @pytest.fixture
    def error_handler(self):
        """Create error handler instance for testing."""
        return ErrorHandler()
    
    @pytest.fixture
    def sample_context(self):
        """Create sample error context."""
        return ErrorContext(
            user_id="test_user",
            session_id="test_session",
            phone_number="5573982005612",
            current_step="welcome",
            message_content="test message"
        )
    
    def test_classify_whatsapp_api_error(self, error_handler, sample_context):
        """Test classification of WhatsApp API errors."""
        # Test rate limit error
        response = Mock()
        response.status_code = 429
        rate_limit_error = httpx.HTTPStatusError("Rate limited", request=Mock(), response=response)
        
        error_type = error_handler.classify_error(rate_limit_error, sample_context)
        assert error_type == ErrorType.RATE_LIMIT
        
        # Test authentication error
        response.status_code = 401
        auth_error = httpx.HTTPStatusError("Unauthorized", request=Mock(), response=response)
        
        error_type = error_handler.classify_error(auth_error, sample_context)
        assert error_type == ErrorType.AUTHENTICATION
        
        # Test general API error
        response.status_code = 500
        api_error = httpx.HTTPStatusError("Server error", request=Mock(), response=response)
        
        error_type = error_handler.classify_error(api_error, sample_context)
        assert error_type == ErrorType.WHATSAPP_API
    
    def test_classify_network_error(self, error_handler, sample_context):
        """Test classification of network errors."""
        connect_error = httpx.ConnectError("Connection failed")
        error_type = error_handler.classify_error(connect_error, sample_context)
        assert error_type == ErrorType.NETWORK
        
        timeout_error = httpx.TimeoutException("Request timeout")
        error_type = error_handler.classify_error(timeout_error, sample_context)
        assert error_type == ErrorType.NETWORK
    
    def test_classify_database_error(self, error_handler, sample_context):
        """Test classification of database errors."""
        db_error = OperationalError("Connection lost", None, None)
        error_type = error_handler.classify_error(db_error, sample_context)
        assert error_type == ErrorType.DATABASE
    
    def test_classify_flow_logic_error(self, error_handler, sample_context):
        """Test classification of flow logic errors."""
        value_error = ValueError("Invalid step")
        error_type = error_handler.classify_error(value_error, sample_context)
        assert error_type == ErrorType.FLOW_LOGIC
    
    def test_classify_timeout_error(self, error_handler, sample_context):
        """Test classification of timeout errors."""
        timeout_error = asyncio.TimeoutError("Operation timed out")
        error_type = error_handler.classify_error(timeout_error, sample_context)
        assert error_type == ErrorType.TIMEOUT
    
    def test_get_severity_levels(self, error_handler):
        """Test error severity determination."""
        # Critical errors
        assert error_handler.get_severity(ErrorType.AUTHENTICATION, Exception()) == ErrorSeverity.CRITICAL
        
        # High severity errors
        assert error_handler.get_severity(ErrorType.DATABASE, Exception()) == ErrorSeverity.HIGH
        
        # Medium severity errors
        assert error_handler.get_severity(ErrorType.RATE_LIMIT, Exception()) == ErrorSeverity.MEDIUM
        
        # Low severity errors
        assert error_handler.get_severity(ErrorType.FLOW_LOGIC, Exception()) == ErrorSeverity.LOW
    
    @pytest.mark.asyncio
    async def test_handle_whatsapp_api_error(self, error_handler, sample_context):
        """Test handling of WhatsApp API errors."""
        # Test 400 error (bad request)
        response = Mock()
        response.status_code = 400
        response.text = "Bad request"
        error = httpx.HTTPStatusError("Bad request", request=Mock(), response=response)
        
        result = await error_handler.handle_error(error, sample_context)
        
        assert isinstance(result, ErrorResponse)
        assert not result.should_retry
        assert result.escalate_to_human
        assert "problema com sua mensagem" in result.user_message
        
        # Test 500 error (server error)
        response.status_code = 500
        error = httpx.HTTPStatusError("Server error", request=Mock(), response=response)
        
        result = await error_handler.handle_error(error, sample_context)
        
        assert result.should_retry
        assert result.retry_after is not None
        assert "dificuldades técnicas" in result.user_message
    
    @pytest.mark.asyncio
    async def test_handle_rate_limit_error(self, error_handler, sample_context):
        """Test handling of rate limit errors."""
        response = Mock()
        response.status_code = 429
        response.headers = {"Retry-After": "120"}
        error = httpx.HTTPStatusError("Rate limited", request=Mock(), response=response)
        
        result = await error_handler.handle_error(error, sample_context)
        
        assert result.should_retry
        assert result.retry_after == 120
        assert "muitas mensagens" in result.user_message
        assert result.severity == ErrorSeverity.MEDIUM
    
    @pytest.mark.asyncio
    async def test_handle_authentication_error(self, error_handler, sample_context):
        """Test handling of authentication errors."""
        response = Mock()
        response.status_code = 401
        error = httpx.HTTPStatusError("Unauthorized", request=Mock(), response=response)
        
        result = await error_handler.handle_error(error, sample_context)
        
        assert not result.should_retry
        assert result.escalate_to_human
        assert result.severity == ErrorSeverity.CRITICAL
        assert "temporariamente indisponível" in result.user_message
    
    @pytest.mark.asyncio
    async def test_handle_database_error_retryable(self, error_handler, sample_context):
        """Test handling of retryable database errors."""
        error = OperationalError("Connection timeout", None, None)
        
        result = await error_handler.handle_error(error, sample_context)
        
        assert result.should_retry
        assert result.context_preserved
        assert result.retry_after is not None
    
    @pytest.mark.asyncio
    async def test_handle_database_error_non_retryable(self, error_handler, sample_context):
        """Test handling of non-retryable database errors."""
        error = SQLAlchemyError("Constraint violation")
        
        result = await error_handler.handle_error(error, sample_context)
        
        assert not result.should_retry
        assert result.escalate_to_human
        assert result.context_preserved
    
    @pytest.mark.asyncio
    async def test_handle_flow_logic_error(self, error_handler, sample_context):
        """Test handling of flow logic errors."""
        error = ValueError("Invalid step transition")
        
        result = await error_handler.handle_error(error, sample_context)
        
        assert not result.should_retry
        assert result.fallback_action == "reset_to_welcome"
        assert not result.context_preserved
        assert result.severity == ErrorSeverity.LOW
    
    @pytest.mark.asyncio
    async def test_handle_timeout_error(self, error_handler, sample_context):
        """Test handling of timeout errors."""
        error = asyncio.TimeoutError("Operation timed out")
        
        result = await error_handler.handle_error(error, sample_context)
        
        assert result.should_retry
        assert result.context_preserved
        assert result.retry_after is not None
        assert "demorando mais que o esperado" in result.user_message
    
    def test_calculate_retry_delay_exponential(self, error_handler):
        """Test exponential backoff retry delay calculation."""
        # Test exponential backoff
        delay1 = error_handler._calculate_retry_delay(ErrorType.WHATSAPP_API, 1)
        delay2 = error_handler._calculate_retry_delay(ErrorType.WHATSAPP_API, 2)
        delay3 = error_handler._calculate_retry_delay(ErrorType.WHATSAPP_API, 3)
        
        assert delay1 == 2.0  # base_delay
        assert delay2 == 4.0  # base_delay * 2^1
        assert delay3 == 8.0  # base_delay * 2^2
    
    def test_calculate_retry_delay_linear(self, error_handler):
        """Test linear backoff retry delay calculation."""
        # Test linear backoff (rate limit uses this)
        delay1 = error_handler._calculate_retry_delay(ErrorType.RATE_LIMIT, 1)
        delay2 = error_handler._calculate_retry_delay(ErrorType.RATE_LIMIT, 2)
        delay3 = error_handler._calculate_retry_delay(ErrorType.RATE_LIMIT, 3)
        
        assert delay1 == 60.0   # base_delay * 1
        assert delay2 == 120.0  # base_delay * 2
        assert delay3 == 180.0  # base_delay * 3
    
    def test_calculate_retry_delay_max_limit(self, error_handler):
        """Test retry delay respects maximum limit."""
        # Test that delay doesn't exceed max_delay
        delay = error_handler._calculate_retry_delay(ErrorType.WHATSAPP_API, 10)
        config = error_handler.retry_configs[ErrorType.WHATSAPP_API]
        
        assert delay <= config.max_delay
    
    @pytest.mark.asyncio
    async def test_retry_with_backoff_success(self, error_handler, sample_context):
        """Test successful retry with backoff."""
        call_count = 0
        
        async def mock_func():
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise httpx.ConnectError("Connection failed")
            return "success"
        
        result = await error_handler.retry_with_backoff(
            mock_func, ErrorType.NETWORK, sample_context
        )
        
        assert result == "success"
        assert call_count == 2
    
    @pytest.mark.asyncio
    async def test_retry_with_backoff_exhausted(self, error_handler, sample_context):
        """Test retry with backoff when all attempts are exhausted."""
        call_count = 0
        
        async def mock_func():
            nonlocal call_count
            call_count += 1
            raise httpx.ConnectError("Connection failed")
        
        with pytest.raises(httpx.ConnectError):
            await error_handler.retry_with_backoff(
                mock_func, ErrorType.NETWORK, sample_context
            )
        
        config = error_handler.retry_configs[ErrorType.NETWORK]
        assert call_count == config.max_attempts
    
    @pytest.mark.asyncio
    async def test_retry_with_backoff_no_retry_on_non_retryable(self, error_handler, sample_context):
        """Test that non-retryable errors are not retried."""
        call_count = 0
        
        async def mock_func():
            nonlocal call_count
            call_count += 1
            # 400 errors should not be retried
            response = Mock()
            response.status_code = 400
            raise httpx.HTTPStatusError("Bad request", request=Mock(), response=response)
        
        with pytest.raises(httpx.HTTPStatusError):
            await error_handler.retry_with_backoff(
                mock_func, ErrorType.WHATSAPP_API, sample_context
            )
        
        assert call_count == 1  # Should not retry
    
    def test_should_retry_whatsapp_error(self, error_handler):
        """Test WhatsApp error retry logic."""
        # Should retry 5xx errors
        response = Mock()
        response.status_code = 500
        error_5xx = httpx.HTTPStatusError("Server error", request=Mock(), response=response)
        assert error_handler._should_retry_whatsapp_error(error_5xx)
        
        # Should retry rate limit (429)
        response.status_code = 429
        error_429 = httpx.HTTPStatusError("Rate limited", request=Mock(), response=response)
        assert error_handler._should_retry_whatsapp_error(error_429)
        
        # Should not retry 4xx errors (except 429)
        response.status_code = 400
        error_400 = httpx.HTTPStatusError("Bad request", request=Mock(), response=response)
        assert not error_handler._should_retry_whatsapp_error(error_400)
        
        # Should retry network errors
        connect_error = httpx.ConnectError("Connection failed")
        assert error_handler._should_retry_whatsapp_error(connect_error)
    
    def test_should_retry_database_error(self, error_handler):
        """Test database error retry logic."""
        # Should retry connection errors
        connection_error = OperationalError("connection timeout", None, None)
        assert error_handler._should_retry_database_error(connection_error)
        
        # Should not retry constraint violations
        constraint_error = SQLAlchemyError("unique constraint violation")
        assert not error_handler._should_retry_database_error(constraint_error)
    
    def test_track_error(self, error_handler, sample_context):
        """Test error tracking functionality."""
        error_handler._track_error(ErrorType.WHATSAPP_API, sample_context)
        
        key = f"whatsapp_api_{sample_context.phone_number}"
        assert key in error_handler.error_counts
        assert error_handler.error_counts[key] == 1
        assert key in error_handler.last_errors
    
    def test_is_rate_limited(self, error_handler):
        """Test rate limiting check."""
        phone_number = "5573982005612"
        
        # Initially not rate limited
        assert not error_handler.is_rate_limited(phone_number)
        
        # Set rate limit
        error_handler.rate_limit_resets[phone_number] = datetime.utcnow() + timedelta(minutes=5)
        assert error_handler.is_rate_limited(phone_number)
        
        # Rate limit expired
        error_handler.rate_limit_resets[phone_number] = datetime.utcnow() - timedelta(minutes=1)
        assert not error_handler.is_rate_limited(phone_number)
    
    def test_get_error_stats(self, error_handler, sample_context):
        """Test error statistics retrieval."""
        # Add some test data
        error_handler._track_error(ErrorType.WHATSAPP_API, sample_context)
        error_handler.rate_limit_resets["test_number"] = datetime.utcnow()
        
        stats = error_handler.get_error_stats()
        
        assert "error_counts" in stats
        assert "last_errors" in stats
        assert "circuit_breaker_states" in stats
        assert "rate_limited_numbers" in stats
        assert stats["rate_limited_numbers"] == 1


class TestCircuitBreaker:
    """Test cases for CircuitBreaker class."""
    
    def test_circuit_breaker_closed_state(self):
        """Test circuit breaker in closed state."""
        breaker = CircuitBreaker(failure_threshold=2, recovery_timeout=60)
        
        # Should allow calls in closed state
        result = breaker.call(lambda: "success")
        assert result == "success"
        assert breaker.state == "closed"
    
    def test_circuit_breaker_open_state(self):
        """Test circuit breaker transitions to open state."""
        breaker = CircuitBreaker(failure_threshold=2, recovery_timeout=60)
        
        # Cause failures to open circuit
        for _ in range(2):
            try:
                breaker.call(lambda: (_ for _ in ()).throw(Exception("test error")))
            except Exception:
                pass
        
        assert breaker.state == "open"
        
        # Should raise exception when open
        with pytest.raises(Exception, match="Circuit breaker is open"):
            breaker.call(lambda: "success")
    
    def test_circuit_breaker_half_open_state(self):
        """Test circuit breaker half-open state and recovery."""
        breaker = CircuitBreaker(failure_threshold=1, recovery_timeout=0.1)
        
        # Cause failure to open circuit
        try:
            breaker.call(lambda: (_ for _ in ()).throw(Exception("test error")))
        except Exception:
            pass
        
        assert breaker.state == "open"
        
        # Wait for recovery timeout
        import time
        time.sleep(0.2)
        
        # Next call should transition to half-open and succeed
        result = breaker.call(lambda: "success")
        assert result == "success"
        assert breaker.state == "closed"


class TestErrorContext:
    """Test cases for ErrorContext class."""
    
    def test_error_context_creation(self):
        """Test ErrorContext creation and defaults."""
        context = ErrorContext(
            user_id="test_user",
            phone_number="5573982005612"
        )
        
        assert context.user_id == "test_user"
        assert context.phone_number == "5573982005612"
        assert context.timestamp is not None
        assert isinstance(context.timestamp, datetime)
    
    def test_error_context_with_timestamp(self):
        """Test ErrorContext with explicit timestamp."""
        test_time = datetime(2023, 1, 1, 12, 0, 0)
        context = ErrorContext(
            user_id="test_user",
            timestamp=test_time
        )
        
        assert context.timestamp == test_time


def test_get_error_handler_singleton():
    """Test that get_error_handler returns singleton instance."""
    handler1 = get_error_handler()
    handler2 = get_error_handler()
    
    assert handler1 is handler2
    assert isinstance(handler1, ErrorHandler)


@pytest.mark.asyncio
async def test_error_handler_integration():
    """Integration test for error handler with realistic scenarios."""
    error_handler = ErrorHandler()
    context = ErrorContext(
        user_id="integration_test",
        session_id="test_session",
        phone_number="5573982005612",
        current_step="practice_area"
    )
    
    # Test WhatsApp API failure scenario
    response = Mock()
    response.status_code = 503
    response.text = "Service unavailable"
    api_error = httpx.HTTPStatusError("Service unavailable", request=Mock(), response=response)
    
    result = await error_handler.handle_error(api_error, context)
    
    assert result.should_retry
    assert result.retry_after > 0
    assert result.severity == ErrorSeverity.HIGH
    assert "dificuldades técnicas" in result.user_message
    
    # Test that error was tracked
    stats = error_handler.get_error_stats()
    assert len(stats["error_counts"]) > 0