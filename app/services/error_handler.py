"""
Comprehensive error handling system for WhatsApp bot.
"""

import asyncio
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Callable, Union
import httpx
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)


class ErrorType(Enum):
    """Types of errors that can occur in the system."""
    WHATSAPP_API = "whatsapp_api"
    RATE_LIMIT = "rate_limit"
    AUTHENTICATION = "authentication"
    NETWORK = "network"
    DATABASE = "database"
    FLOW_LOGIC = "flow_logic"
    VALIDATION = "validation"
    SYSTEM = "system"
    TIMEOUT = "timeout"
    UNKNOWN = "unknown"


class ErrorSeverity(Enum):
    """Error severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RetryStrategy(Enum):
    """Retry strategies for different error types."""
    EXPONENTIAL_BACKOFF = "exponential_backoff"
    LINEAR_BACKOFF = "linear_backoff"
    IMMEDIATE = "immediate"
    NO_RETRY = "no_retry"


@dataclass
class ErrorContext:
    """Context information for error handling."""
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    phone_number: Optional[str] = None
    current_step: Optional[str] = None
    message_content: Optional[str] = None
    api_endpoint: Optional[str] = None
    request_data: Optional[Dict] = None
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()


@dataclass
class RetryConfig:
    """Configuration for retry logic."""
    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    backoff_multiplier: float = 2.0
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
    should_retry_func: Optional[Callable[[Exception], bool]] = None


@dataclass
class ErrorResponse:
    """Response from error handling."""
    user_message: Optional[str]
    should_retry: bool
    fallback_action: Optional[str]
    severity: ErrorSeverity
    retry_after: Optional[float] = None
    context_preserved: bool = True
    escalate_to_human: bool = False
    log_data: Optional[Dict] = None


class CircuitBreaker:
    """Circuit breaker pattern implementation for external services."""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "closed"  # closed, open, half_open
    
    def call(self, func: Callable, *args, **kwargs):
        """Execute function with circuit breaker protection."""
        if self.state == "open":
            if self._should_attempt_reset():
                self.state = "half_open"
            else:
                raise Exception("Circuit breaker is open")
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as e:
            self._on_failure()
            raise e
    
    def _should_attempt_reset(self) -> bool:
        """Check if circuit breaker should attempt reset."""
        return (
            self.last_failure_time and
            time.time() - self.last_failure_time >= self.recovery_timeout
        )
    
    def _on_success(self):
        """Handle successful call."""
        self.failure_count = 0
        self.state = "closed"
    
    def _on_failure(self):
        """Handle failed call."""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "open"


class ErrorHandler:
    """Comprehensive error handling system."""
    
    def __init__(self):
        self.retry_configs = self._setup_retry_configs()
        self.circuit_breakers = {}
        self.error_counts = {}
        self.last_errors = {}
        
        # Rate limiting tracking
        self.rate_limit_resets = {}
        self.rate_limit_remaining = {}
    
    def _setup_retry_configs(self) -> Dict[ErrorType, RetryConfig]:
        """Setup retry configurations for different error types."""
        return {
            ErrorType.WHATSAPP_API: RetryConfig(
                max_attempts=3,
                base_delay=2.0,
                max_delay=30.0,
                strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
                should_retry_func=self._should_retry_whatsapp_error
            ),
            ErrorType.RATE_LIMIT: RetryConfig(
                max_attempts=5,
                base_delay=60.0,
                max_delay=300.0,
                strategy=RetryStrategy.LINEAR_BACKOFF,
                should_retry_func=lambda e: True
            ),
            ErrorType.NETWORK: RetryConfig(
                max_attempts=3,
                base_delay=1.0,
                max_delay=10.0,
                strategy=RetryStrategy.EXPONENTIAL_BACKOFF
            ),
            ErrorType.DATABASE: RetryConfig(
                max_attempts=2,
                base_delay=0.5,
                max_delay=5.0,
                strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
                should_retry_func=self._should_retry_database_error
            ),
            ErrorType.AUTHENTICATION: RetryConfig(
                max_attempts=1,
                strategy=RetryStrategy.NO_RETRY
            ),
            ErrorType.VALIDATION: RetryConfig(
                max_attempts=1,
                strategy=RetryStrategy.NO_RETRY
            ),
            ErrorType.SYSTEM: RetryConfig(
                max_attempts=2,
                base_delay=1.0,
                max_delay=5.0,
                strategy=RetryStrategy.EXPONENTIAL_BACKOFF
            )
        }
    
    def _should_retry_whatsapp_error(self, error: Exception) -> bool:
        """Determine if WhatsApp API error should be retried."""
        if isinstance(error, httpx.HTTPStatusError):
            # Don't retry client errors (4xx) except rate limiting
            if 400 <= error.response.status_code < 500:
                return error.response.status_code == 429  # Rate limit
            # Retry server errors (5xx)
            return error.response.status_code >= 500
        
        # Retry network-related errors
        return isinstance(error, (httpx.ConnectError, httpx.TimeoutException))
    
    def _should_retry_database_error(self, error: Exception) -> bool:
        """Determine if database error should be retried."""
        if isinstance(error, SQLAlchemyError):
            # Retry connection errors, not constraint violations
            error_str = str(error).lower()
            return any(keyword in error_str for keyword in [
                "connection", "timeout", "network", "temporary"
            ])
        return False
    
    def classify_error(self, error: Exception, context: ErrorContext) -> ErrorType:
        """Classify error type based on exception and context."""
        if isinstance(error, httpx.HTTPStatusError):
            if error.response.status_code == 429:
                return ErrorType.RATE_LIMIT
            elif error.response.status_code == 401:
                return ErrorType.AUTHENTICATION
            else:
                return ErrorType.WHATSAPP_API
        
        elif isinstance(error, (httpx.ConnectError, httpx.TimeoutException)):
            return ErrorType.NETWORK
        
        elif isinstance(error, SQLAlchemyError):
            return ErrorType.DATABASE
        
        elif isinstance(error, (ValueError, TypeError)) and context.current_step:
            return ErrorType.FLOW_LOGIC
        
        elif isinstance(error, asyncio.TimeoutError):
            return ErrorType.TIMEOUT
        
        else:
            return ErrorType.UNKNOWN
    
    def get_severity(self, error_type: ErrorType, error: Exception) -> ErrorSeverity:
        """Determine error severity."""
        if error_type == ErrorType.AUTHENTICATION:
            return ErrorSeverity.CRITICAL
        
        elif error_type == ErrorType.DATABASE:
            return ErrorSeverity.HIGH
        
        elif error_type == ErrorType.RATE_LIMIT:
            return ErrorSeverity.MEDIUM
        
        elif error_type in [ErrorType.WHATSAPP_API, ErrorType.NETWORK]:
            if isinstance(error, httpx.HTTPStatusError):
                if error.response.status_code >= 500:
                    return ErrorSeverity.HIGH
                else:
                    return ErrorSeverity.MEDIUM
            return ErrorSeverity.MEDIUM
        
        elif error_type == ErrorType.FLOW_LOGIC:
            return ErrorSeverity.LOW
        
        else:
            return ErrorSeverity.MEDIUM
    
    async def handle_error(
        self, 
        error: Exception, 
        context: ErrorContext
    ) -> ErrorResponse:
        """Main error handling method."""
        error_type = self.classify_error(error, context)
        severity = self.get_severity(error_type, error)
        
        # Track error occurrence
        self._track_error(error_type, context)
        
        # Log error with context
        self._log_error(error, error_type, severity, context)
        
        # Handle specific error types
        if error_type == ErrorType.WHATSAPP_API:
            return await self._handle_whatsapp_error(error, context, severity)
        
        elif error_type == ErrorType.RATE_LIMIT:
            return await self._handle_rate_limit_error(error, context)
        
        elif error_type == ErrorType.AUTHENTICATION:
            return await self._handle_authentication_error(error, context)
        
        elif error_type == ErrorType.DATABASE:
            return await self._handle_database_error(error, context, severity)
        
        elif error_type == ErrorType.NETWORK:
            return await self._handle_network_error(error, context, severity)
        
        elif error_type == ErrorType.FLOW_LOGIC:
            return await self._handle_flow_error(error, context)
        
        elif error_type == ErrorType.TIMEOUT:
            return await self._handle_timeout_error(error, context)
        
        else:
            return await self._handle_unknown_error(error, context, severity)
    
    async def _handle_whatsapp_error(
        self, 
        error: Exception, 
        context: ErrorContext,
        severity: ErrorSeverity
    ) -> ErrorResponse:
        """Handle WhatsApp API errors."""
        if isinstance(error, httpx.HTTPStatusError):
            status_code = error.response.status_code
            
            if status_code == 400:
                return ErrorResponse(
                    user_message="Desculpe, houve um problema com sua mensagem. Tente novamente.",
                    should_retry=False,
                    fallback_action="reset_to_welcome",
                    severity=severity,
                    escalate_to_human=True,
                    log_data={"status_code": status_code, "response": error.response.text}
                )
            
            elif status_code == 403:
                return ErrorResponse(
                    user_message="Nosso sistema está temporariamente indisponível. Tente novamente em alguns minutos.",
                    should_retry=False,
                    fallback_action="escalate_to_human",
                    severity=severity,
                    escalate_to_human=True,
                    log_data={"status_code": status_code}
                )
            
            elif status_code >= 500:
                return ErrorResponse(
                    user_message="Estamos enfrentando dificuldades técnicas. Tentando novamente...",
                    should_retry=True,
                    fallback_action="retry_with_backoff",
                    severity=severity,
                    retry_after=self._calculate_retry_delay(ErrorType.WHATSAPP_API, 1),
                    log_data={"status_code": status_code}
                )
        
        return ErrorResponse(
            user_message="Houve um problema de comunicação. Tentando novamente...",
            should_retry=True,
            fallback_action="retry_with_backoff",
            severity=severity,
            retry_after=self._calculate_retry_delay(ErrorType.WHATSAPP_API, 1)
        )
    
    async def _handle_rate_limit_error(
        self, 
        error: Exception, 
        context: ErrorContext
    ) -> ErrorResponse:
        """Handle rate limiting errors."""
        # Extract rate limit info from headers if available
        retry_after = 60  # Default to 1 minute
        
        if isinstance(error, httpx.HTTPStatusError):
            retry_after_header = error.response.headers.get("Retry-After")
            if retry_after_header:
                try:
                    retry_after = int(retry_after_header)
                except ValueError:
                    pass
        
        # Store rate limit reset time
        if context.phone_number:
            self.rate_limit_resets[context.phone_number] = datetime.utcnow() + timedelta(seconds=retry_after)
        
        return ErrorResponse(
            user_message="Estamos processando muitas mensagens no momento. Aguarde um momento e tente novamente.",
            should_retry=True,
            fallback_action="wait_and_retry",
            severity=ErrorSeverity.MEDIUM,
            retry_after=retry_after,
            log_data={"retry_after": retry_after}
        )
    
    async def _handle_authentication_error(
        self, 
        error: Exception, 
        context: ErrorContext
    ) -> ErrorResponse:
        """Handle authentication errors."""
        return ErrorResponse(
            user_message="Nosso sistema está temporariamente indisponível. Nossa equipe foi notificada.",
            should_retry=False,
            fallback_action="escalate_to_human",
            severity=ErrorSeverity.CRITICAL,
            escalate_to_human=True,
            log_data={"requires_token_refresh": True}
        )
    
    async def _handle_database_error(
        self, 
        error: Exception, 
        context: ErrorContext,
        severity: ErrorSeverity
    ) -> ErrorResponse:
        """Handle database errors."""
        if self._should_retry_database_error(error):
            return ErrorResponse(
                user_message="Processando sua solicitação...",
                should_retry=True,
                fallback_action="retry_with_backoff",
                severity=severity,
                retry_after=self._calculate_retry_delay(ErrorType.DATABASE, 1),
                context_preserved=True
            )
        
        return ErrorResponse(
            user_message="Houve um problema ao salvar suas informações. Vou transferir você para nossa equipe.",
            should_retry=False,
            fallback_action="escalate_to_human",
            severity=severity,
            escalate_to_human=True,
            context_preserved=True,
            log_data={"error_type": type(error).__name__, "error_message": str(error)}
        )
    
    async def _handle_network_error(
        self, 
        error: Exception, 
        context: ErrorContext,
        severity: ErrorSeverity
    ) -> ErrorResponse:
        """Handle network connectivity errors."""
        return ErrorResponse(
            user_message="Problema de conectividade detectado. Tentando reconectar...",
            should_retry=True,
            fallback_action="retry_with_backoff",
            severity=severity,
            retry_after=self._calculate_retry_delay(ErrorType.NETWORK, 1),
            context_preserved=True
        )
    
    async def _handle_flow_error(
        self, 
        error: Exception, 
        context: ErrorContext
    ) -> ErrorResponse:
        """Handle conversation flow logic errors."""
        return ErrorResponse(
            user_message="Houve um problema no processamento. Vou reiniciar nossa conversa.",
            should_retry=False,
            fallback_action="reset_to_welcome",
            severity=ErrorSeverity.LOW,
            context_preserved=False,
            log_data={"current_step": context.current_step, "error": str(error)}
        )
    
    async def _handle_timeout_error(
        self, 
        error: Exception, 
        context: ErrorContext
    ) -> ErrorResponse:
        """Handle timeout errors."""
        return ErrorResponse(
            user_message="A operação está demorando mais que o esperado. Tentando novamente...",
            should_retry=True,
            fallback_action="retry_with_shorter_timeout",
            severity=ErrorSeverity.MEDIUM,
            retry_after=self._calculate_retry_delay(ErrorType.TIMEOUT, 1),
            context_preserved=True
        )
    
    async def _handle_unknown_error(
        self, 
        error: Exception, 
        context: ErrorContext,
        severity: ErrorSeverity
    ) -> ErrorResponse:
        """Handle unknown/unexpected errors."""
        return ErrorResponse(
            user_message="Ocorreu um erro inesperado. Nossa equipe foi notificada e entrará em contato.",
            should_retry=False,
            fallback_action="escalate_to_human",
            severity=severity,
            escalate_to_human=True,
            context_preserved=True,
            log_data={
                "error_type": type(error).__name__,
                "error_message": str(error),
                "context": context.__dict__
            }
        )
    
    def _calculate_retry_delay(self, error_type: ErrorType, attempt: int) -> float:
        """Calculate retry delay based on error type and attempt number."""
        config = self.retry_configs.get(error_type)
        if not config:
            return 1.0
        
        if config.strategy == RetryStrategy.EXPONENTIAL_BACKOFF:
            delay = config.base_delay * (config.backoff_multiplier ** (attempt - 1))
            return min(delay, config.max_delay)
        
        elif config.strategy == RetryStrategy.LINEAR_BACKOFF:
            delay = config.base_delay * attempt
            return min(delay, config.max_delay)
        
        elif config.strategy == RetryStrategy.IMMEDIATE:
            return 0.0
        
        else:  # NO_RETRY
            return 0.0
    
    def _track_error(self, error_type: ErrorType, context: ErrorContext):
        """Track error occurrence for monitoring."""
        key = f"{error_type.value}_{context.phone_number or 'unknown'}"
        
        if key not in self.error_counts:
            self.error_counts[key] = 0
        
        self.error_counts[key] += 1
        self.last_errors[key] = datetime.utcnow()
    
    def _log_error(
        self, 
        error: Exception, 
        error_type: ErrorType, 
        severity: ErrorSeverity,
        context: ErrorContext
    ):
        """Log error with appropriate level and context."""
        log_data = {
            "error_type": error_type.value,
            "severity": severity.value,
            "error_class": type(error).__name__,
            "error_message": str(error),
            "context": {
                "user_id": context.user_id,
                "session_id": context.session_id,
                "phone_number": context.phone_number,
                "current_step": context.current_step,
                "timestamp": context.timestamp.isoformat()
            }
        }
        
        if severity == ErrorSeverity.CRITICAL:
            logger.critical(f"Critical error occurred: {error}", extra=log_data)
        elif severity == ErrorSeverity.HIGH:
            logger.error(f"High severity error: {error}", extra=log_data)
        elif severity == ErrorSeverity.MEDIUM:
            logger.warning(f"Medium severity error: {error}", extra=log_data)
        else:
            logger.info(f"Low severity error: {error}", extra=log_data)
    
    async def retry_with_backoff(
        self,
        func: Callable,
        error_type: ErrorType,
        context: ErrorContext,
        *args,
        **kwargs
    ) -> Any:
        """Execute function with retry logic and backoff."""
        config = self.retry_configs.get(error_type)
        if not config or config.strategy == RetryStrategy.NO_RETRY:
            return await func(*args, **kwargs)
        
        last_exception = None
        
        for attempt in range(1, config.max_attempts + 1):
            try:
                return await func(*args, **kwargs)
            
            except Exception as e:
                last_exception = e
                
                # Check if we should retry this specific error
                if config.should_retry_func and not config.should_retry_func(e):
                    raise e
                
                # Don't retry on last attempt
                if attempt == config.max_attempts:
                    break
                
                # Calculate and wait for retry delay
                delay = self._calculate_retry_delay(error_type, attempt)
                if delay > 0:
                    logger.info(f"Retrying in {delay}s (attempt {attempt}/{config.max_attempts})")
                    await asyncio.sleep(delay)
        
        # All retries exhausted
        raise last_exception
    
    def get_circuit_breaker(self, service_name: str) -> CircuitBreaker:
        """Get or create circuit breaker for service."""
        if service_name not in self.circuit_breakers:
            self.circuit_breakers[service_name] = CircuitBreaker()
        
        return self.circuit_breakers[service_name]
    
    def is_rate_limited(self, phone_number: str) -> bool:
        """Check if phone number is currently rate limited."""
        if phone_number not in self.rate_limit_resets:
            return False
        
        return datetime.utcnow() < self.rate_limit_resets[phone_number]
    
    def get_error_stats(self) -> Dict[str, Any]:
        """Get error statistics for monitoring."""
        return {
            "error_counts": dict(self.error_counts),
            "last_errors": {k: v.isoformat() for k, v in self.last_errors.items()},
            "circuit_breaker_states": {
                name: breaker.state 
                for name, breaker in self.circuit_breakers.items()
            },
            "rate_limited_numbers": len(self.rate_limit_resets)
        }


# Global error handler instance
_error_handler = None


def get_error_handler() -> ErrorHandler:
    """Get global error handler instance."""
    global _error_handler
    if _error_handler is None:
        _error_handler = ErrorHandler()
    return _error_handler