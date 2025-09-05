"""
Timeout handling and re-engagement service for inactive users.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

from app.services.state_manager import StateManager
from app.services.message_builder import MessageBuilder, get_message_builder
from app.services.whatsapp_client import WhatsAppClient, get_whatsapp_client
from app.services.error_handler import get_error_handler, ErrorContext, ErrorType

logger = logging.getLogger(__name__)


class TimeoutType(Enum):
    """Types of timeouts that can occur."""
    INACTIVITY = "inactivity"
    STEP_TIMEOUT = "step_timeout"
    SESSION_TIMEOUT = "session_timeout"
    REENGAGEMENT_TIMEOUT = "reengagement_timeout"


@dataclass
class TimeoutConfig:
    """Configuration for different timeout scenarios."""
    timeout_minutes: int
    max_reengagement_attempts: int = 2
    reengagement_interval_minutes: int = 10
    auto_reset_after_timeout: bool = True
    escalate_after_max_attempts: bool = True


@dataclass
class ReengagementAttempt:
    """Record of a re-engagement attempt."""
    session_id: str
    attempt_number: int
    timestamp: datetime
    timeout_type: TimeoutType
    message_sent: bool
    response_received: bool = False


class TimeoutService:
    """Service for handling user timeouts and re-engagement."""
    
    def __init__(
        self,
        state_manager: StateManager,
        message_builder: Optional[MessageBuilder] = None,
        whatsapp_client: Optional[WhatsAppClient] = None
    ):
        self.state_manager = state_manager
        self.message_builder = message_builder or get_message_builder()
        self.whatsapp_client = whatsapp_client or get_whatsapp_client()
        self.error_handler = get_error_handler()
        
        # Timeout configurations for different scenarios
        self.timeout_configs = {
            TimeoutType.INACTIVITY: TimeoutConfig(
                timeout_minutes=10,
                max_reengagement_attempts=2,
                reengagement_interval_minutes=5,
                auto_reset_after_timeout=False,
                escalate_after_max_attempts=True
            ),
            TimeoutType.STEP_TIMEOUT: TimeoutConfig(
                timeout_minutes=15,
                max_reengagement_attempts=1,
                reengagement_interval_minutes=10,
                auto_reset_after_timeout=True,
                escalate_after_max_attempts=False
            ),
            TimeoutType.SESSION_TIMEOUT: TimeoutConfig(
                timeout_minutes=30,
                max_reengagement_attempts=1,
                reengagement_interval_minutes=15,
                auto_reset_after_timeout=True,
                escalate_after_max_attempts=False
            ),
            TimeoutType.REENGAGEMENT_TIMEOUT: TimeoutConfig(
                timeout_minutes=60,
                max_reengagement_attempts=0,
                auto_reset_after_timeout=True,
                escalate_after_max_attempts=False
            )
        }
        
        # Track re-engagement attempts
        self.reengagement_attempts: Dict[str, List[ReengagementAttempt]] = {}
        
        # Background task for monitoring timeouts
        self._monitoring_task = None
        self._is_monitoring = False
    
    async def start_monitoring(self, check_interval_minutes: int = 5):
        """Start background monitoring for timeouts."""
        if self._is_monitoring:
            logger.warning("Timeout monitoring is already running")
            return
        
        self._is_monitoring = True
        self._monitoring_task = asyncio.create_task(
            self._monitor_timeouts(check_interval_minutes)
        )
        logger.info(f"Started timeout monitoring with {check_interval_minutes}min intervals")
    
    async def stop_monitoring(self):
        """Stop background monitoring."""
        self._is_monitoring = False
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass
        logger.info("Stopped timeout monitoring")
    
    async def _monitor_timeouts(self, check_interval_minutes: int):
        """Background task to monitor and handle timeouts."""
        while self._is_monitoring:
            try:
                await self._check_and_handle_timeouts()
                await asyncio.sleep(check_interval_minutes * 60)  # Convert to seconds
            
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in timeout monitoring: {str(e)}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying
    
    async def _check_and_handle_timeouts(self):
        """Check for timed out sessions and handle them."""
        try:
            # Get sessions that might be timed out
            timed_out_sessions = await self._get_timed_out_sessions()
            
            logger.info(f"Found {len(timed_out_sessions)} potentially timed out sessions")
            
            for session in timed_out_sessions:
                await self._handle_session_timeout(session)
        
        except Exception as e:
            context = ErrorContext(current_step="timeout_monitoring")
            error_response = await self.error_handler.handle_error(e, context)
            logger.error(f"Failed to check timeouts: {str(e)}", extra={"error_response": error_response.__dict__})
    
    async def _get_timed_out_sessions(self) -> List[Any]:
        """Get sessions that have timed out."""
        # This would typically query the database for sessions
        # that haven't had activity within the timeout period
        try:
            # Get sessions that are active but haven't been updated recently
            cutoff_time = datetime.utcnow() - timedelta(minutes=10)  # Inactivity timeout
            
            # This is a simplified implementation - in practice, you'd query the database
            # For now, we'll use the state manager's cleanup method as a proxy
            expired_count = await self.state_manager.cleanup_expired_sessions(timeout_minutes=10)
            
            if expired_count > 0:
                logger.info(f"Cleaned up {expired_count} expired sessions")
            
            return []  # Return empty list for now - would return actual sessions in real implementation
        
        except Exception as e:
            logger.error(f"Error getting timed out sessions: {str(e)}")
            return []
    
    async def _handle_session_timeout(self, session):
        """Handle a specific session timeout."""
        session_id = str(session.id)
        phone_number = session.phone_number
        
        try:
            # Determine timeout type based on session state
            timeout_type = self._determine_timeout_type(session)
            config = self.timeout_configs[timeout_type]
            
            # Check if we've already attempted re-engagement
            attempts = self.reengagement_attempts.get(session_id, [])
            
            if len(attempts) < config.max_reengagement_attempts:
                # Attempt re-engagement
                await self._attempt_reengagement(session, timeout_type, len(attempts) + 1)
            
            elif config.escalate_after_max_attempts:
                # Escalate to human after max attempts
                await self._escalate_timeout_to_human(session, timeout_type)
            
            elif config.auto_reset_after_timeout:
                # Auto-reset session
                await self._auto_reset_session(session, timeout_type)
            
            else:
                # Just deactivate the session
                await self._deactivate_session(session, timeout_type)
        
        except Exception as e:
            context = ErrorContext(
                session_id=session_id,
                phone_number=phone_number,
                current_step="timeout_handling"
            )
            error_response = await self.error_handler.handle_error(e, context)
            logger.error(f"Failed to handle timeout for session {session_id}: {str(e)}")
    
    def _determine_timeout_type(self, session) -> TimeoutType:
        """Determine the type of timeout based on session state."""
        now = datetime.utcnow()
        last_activity = session.updated_at
        
        # Calculate time since last activity
        inactive_minutes = (now - last_activity).total_seconds() / 60
        
        # Check if user is in middle of a flow step
        if session.current_step and session.current_step != "completed":
            if inactive_minutes >= 15:
                return TimeoutType.STEP_TIMEOUT
            else:
                return TimeoutType.INACTIVITY
        
        # Check for session timeout
        if inactive_minutes >= 30:
            return TimeoutType.SESSION_TIMEOUT
        
        # Check for re-engagement timeout
        if inactive_minutes >= 60:
            return TimeoutType.REENGAGEMENT_TIMEOUT
        
        return TimeoutType.INACTIVITY
    
    async def _attempt_reengagement(self, session, timeout_type: TimeoutType, attempt_number: int):
        """Attempt to re-engage an inactive user."""
        session_id = str(session.id)
        phone_number = session.phone_number
        
        try:
            # Create re-engagement message based on timeout type and attempt number
            message = self._create_reengagement_message(session, timeout_type, attempt_number)
            
            # Send re-engagement message
            success = await self._send_reengagement_message(phone_number, message)
            
            # Record the attempt
            attempt = ReengagementAttempt(
                session_id=session_id,
                attempt_number=attempt_number,
                timestamp=datetime.utcnow(),
                timeout_type=timeout_type,
                message_sent=success
            )
            
            if session_id not in self.reengagement_attempts:
                self.reengagement_attempts[session_id] = []
            
            self.reengagement_attempts[session_id].append(attempt)
            
            # Record analytics event
            await self.state_manager.record_analytics_event(
                session.id,
                "reengagement_attempted",
                session.current_step,
                {
                    "timeout_type": timeout_type.value,
                    "attempt_number": attempt_number,
                    "message_sent": success,
                    "inactive_minutes": self._calculate_inactive_minutes(session)
                }
            )
            
            logger.info(f"Re-engagement attempt {attempt_number} for session {session_id}: {'sent' if success else 'failed'}")
        
        except Exception as e:
            logger.error(f"Failed re-engagement attempt for session {session_id}: {str(e)}")
    
    def _create_reengagement_message(self, session, timeout_type: TimeoutType, attempt_number: int) -> str:
        """Create appropriate re-engagement message."""
        if timeout_type == TimeoutType.INACTIVITY and attempt_number == 1:
            return self.message_builder.build_reengagement_message()
        
        elif timeout_type == TimeoutType.STEP_TIMEOUT:
            return self.message_builder.build_step_timeout_message(session.current_step)
        
        elif timeout_type == TimeoutType.SESSION_TIMEOUT:
            return self.message_builder.build_session_timeout_message()
        
        elif attempt_number == 2:
            return self.message_builder.build_final_reengagement_message()
        
        else:
            return self.message_builder.build_reengagement_message()
    
    async def _send_reengagement_message(self, phone_number: str, message: str) -> bool:
        """Send re-engagement message with error handling."""
        context = ErrorContext(
            phone_number=phone_number,
            current_step="reengagement"
        )
        
        try:
            return await self.error_handler.retry_with_backoff(
                self.whatsapp_client.send_message,
                ErrorType.WHATSAPP_API,
                context,
                phone_number,
                message
            )
        
        except Exception as e:
            logger.error(f"Failed to send re-engagement message to {phone_number}: {str(e)}")
            return False
    
    async def _escalate_timeout_to_human(self, session, timeout_type: TimeoutType):
        """Escalate timed out session to human agent."""
        try:
            # Mark session for handoff
            await self.state_manager.trigger_handoff(session.id)
            
            # Send escalation message
            escalation_msg = self.message_builder.build_timeout_escalation_message()
            await self._send_reengagement_message(session.phone_number, escalation_msg)
            
            # Record analytics event
            await self.state_manager.record_analytics_event(
                session.id,
                "timeout_escalated",
                session.current_step,
                {
                    "timeout_type": timeout_type.value,
                    "escalation_reason": "max_reengagement_attempts_reached",
                    "inactive_minutes": self._calculate_inactive_minutes(session)
                }
            )
            
            logger.info(f"Escalated timed out session {session.id} to human agent")
        
        except Exception as e:
            logger.error(f"Failed to escalate timeout for session {session.id}: {str(e)}")
    
    async def _auto_reset_session(self, session, timeout_type: TimeoutType):
        """Automatically reset session after timeout."""
        try:
            # Reset session to initial state
            await self.state_manager.reset_session(session.id)
            
            # Send reset notification
            reset_msg = self.message_builder.build_session_reset_message()
            await self._send_reengagement_message(session.phone_number, reset_msg)
            
            # Record analytics event
            await self.state_manager.record_analytics_event(
                session.id,
                "session_auto_reset",
                session.current_step,
                {
                    "timeout_type": timeout_type.value,
                    "reset_reason": "timeout",
                    "inactive_minutes": self._calculate_inactive_minutes(session)
                }
            )
            
            # Clear re-engagement attempts
            session_id = str(session.id)
            if session_id in self.reengagement_attempts:
                del self.reengagement_attempts[session_id]
            
            logger.info(f"Auto-reset session {session.id} after timeout")
        
        except Exception as e:
            logger.error(f"Failed to auto-reset session {session.id}: {str(e)}")
    
    async def _deactivate_session(self, session, timeout_type: TimeoutType):
        """Deactivate session after timeout."""
        try:
            # Deactivate session
            await self.state_manager.deactivate_session(session.id)
            
            # Record analytics event
            await self.state_manager.record_analytics_event(
                session.id,
                "session_deactivated",
                session.current_step,
                {
                    "timeout_type": timeout_type.value,
                    "deactivation_reason": "timeout",
                    "inactive_minutes": self._calculate_inactive_minutes(session)
                }
            )
            
            # Clear re-engagement attempts
            session_id = str(session.id)
            if session_id in self.reengagement_attempts:
                del self.reengagement_attempts[session_id]
            
            logger.info(f"Deactivated session {session.id} after timeout")
        
        except Exception as e:
            logger.error(f"Failed to deactivate session {session.id}: {str(e)}")
    
    def _calculate_inactive_minutes(self, session) -> float:
        """Calculate minutes since last activity."""
        now = datetime.utcnow()
        last_activity = session.updated_at
        return (now - last_activity).total_seconds() / 60
    
    async def handle_user_response_after_timeout(self, session_id: str) -> bool:
        """Handle user response after a timeout/re-engagement."""
        session_id_str = str(session_id)
        
        if session_id_str in self.reengagement_attempts:
            # Mark latest attempt as having received response
            attempts = self.reengagement_attempts[session_id_str]
            if attempts:
                attempts[-1].response_received = True
            
            # Record successful re-engagement
            await self.state_manager.record_analytics_event(
                session_id,
                "reengagement_successful",
                None,
                {
                    "total_attempts": len(attempts),
                    "response_time_minutes": self._calculate_response_time(attempts[-1]) if attempts else 0
                }
            )
            
            # Clear re-engagement attempts since user is active again
            del self.reengagement_attempts[session_id_str]
            
            logger.info(f"User re-engaged successfully for session {session_id}")
            return True
        
        return False
    
    def _calculate_response_time(self, attempt: ReengagementAttempt) -> float:
        """Calculate response time in minutes."""
        if attempt.response_received:
            return (datetime.utcnow() - attempt.timestamp).total_seconds() / 60
        return 0
    
    async def check_session_timeout(self, session_id: str) -> bool:
        """Check if a specific session has timed out."""
        try:
            session = await self.state_manager.get_session(session_id)
            if not session:
                return True  # Session doesn't exist, consider it timed out
            
            inactive_minutes = self._calculate_inactive_minutes(session)
            timeout_type = self._determine_timeout_type(session)
            config = self.timeout_configs[timeout_type]
            
            return inactive_minutes >= config.timeout_minutes
        
        except Exception as e:
            logger.error(f"Error checking timeout for session {session_id}: {str(e)}")
            return False
    
    def get_timeout_stats(self) -> Dict[str, Any]:
        """Get timeout and re-engagement statistics."""
        total_attempts = sum(len(attempts) for attempts in self.reengagement_attempts.values())
        successful_reengagements = sum(
            1 for attempts in self.reengagement_attempts.values()
            for attempt in attempts if attempt.response_received
        )
        
        return {
            "active_reengagement_sessions": len(self.reengagement_attempts),
            "total_reengagement_attempts": total_attempts,
            "successful_reengagements": successful_reengagements,
            "reengagement_success_rate": (
                successful_reengagements / total_attempts * 100 
                if total_attempts > 0 else 0
            ),
            "monitoring_active": self._is_monitoring
        }


# Global timeout service instance
_timeout_service = None


def get_timeout_service(
    state_manager: Optional[StateManager] = None,
    message_builder: Optional[MessageBuilder] = None,
    whatsapp_client: Optional[WhatsAppClient] = None
) -> TimeoutService:
    """Get global timeout service instance."""
    global _timeout_service
    if _timeout_service is None and state_manager is not None:
        _timeout_service = TimeoutService(state_manager, message_builder, whatsapp_client)
    return _timeout_service