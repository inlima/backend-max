"""
Analytics service for tracking user interactions and system performance.
"""

import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, cast, String, Float
from sqlalchemy.orm import selectinload

from app.models.conversation import AnalyticsEvent, UserSession, ConversationState
from app.core.database import get_db


class EventType(Enum):
    """Analytics event types for tracking user interactions."""
    
    FLOW_START = "flow_start"
    STEP_COMPLETED = "step_completed"
    HANDOFF_TRIGGERED = "handoff_triggered"
    FLOW_COMPLETED = "flow_completed"
    ERROR_OCCURRED = "error_occurred"
    TIMEOUT_OCCURRED = "timeout_occurred"
    ESCAPE_COMMAND = "escape_command"
    MESSAGE_SENT = "message_sent"
    MESSAGE_RECEIVED = "message_received"
    RESPONSE_TIME = "response_time"


@dataclass
class AnalyticsMetrics:
    """Container for analytics metrics."""
    
    total_sessions: int
    completed_flows: int
    handoff_rate: float
    completion_rate: float
    average_response_time: float
    step_completion_rates: Dict[str, float]
    error_rate: float
    timeout_rate: float


@dataclass
class FlowMetrics:
    """Container for flow-specific metrics."""
    
    step_id: str
    total_entries: int
    completions: int
    completion_rate: float
    average_time_spent: float
    drop_off_rate: float


class AnalyticsService:
    """Service for recording and analyzing user interactions."""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
    
    async def record_event(
        self,
        session_id: uuid.UUID,
        event_type: EventType,
        step_id: Optional[str] = None,
        event_data: Optional[Dict[str, Any]] = None
    ) -> AnalyticsEvent:
        """Record an analytics event."""
        
        event = AnalyticsEvent(
            session_id=session_id,
            event_type=event_type.value,
            step_id=step_id,
            event_data=event_data or {},
            timestamp=datetime.utcnow()
        )
        
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        
        return event
    
    async def record_flow_start(self, session_id: uuid.UUID) -> AnalyticsEvent:
        """Record the start of a conversation flow."""
        
        return await self.record_event(
            session_id=session_id,
            event_type=EventType.FLOW_START,
            step_id="welcome",
            event_data={"timestamp": datetime.utcnow().isoformat()}
        )
    
    async def record_step_completion(
        self,
        session_id: uuid.UUID,
        step_id: str,
        user_input: Optional[str] = None,
        response_time_ms: Optional[float] = None
    ) -> AnalyticsEvent:
        """Record completion of a conversation step."""
        
        event_data = {
            "step_id": step_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if user_input:
            event_data["user_input"] = user_input
        
        if response_time_ms:
            event_data["response_time_ms"] = response_time_ms
        
        return await self.record_event(
            session_id=session_id,
            event_type=EventType.STEP_COMPLETED,
            step_id=step_id,
            event_data=event_data
        )
    
    async def record_handoff_trigger(
        self,
        session_id: uuid.UUID,
        trigger_reason: str,
        collected_data: Optional[Dict] = None
    ) -> AnalyticsEvent:
        """Record when a handoff to human agent is triggered."""
        
        event_data = {
            "trigger_reason": trigger_reason,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if collected_data:
            event_data["collected_data"] = collected_data
        
        return await self.record_event(
            session_id=session_id,
            event_type=EventType.HANDOFF_TRIGGERED,
            event_data=event_data
        )
    
    async def record_flow_completion(
        self,
        session_id: uuid.UUID,
        completion_type: str,
        total_duration_seconds: Optional[float] = None
    ) -> AnalyticsEvent:
        """Record successful completion of the conversation flow."""
        
        event_data = {
            "completion_type": completion_type,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if total_duration_seconds:
            event_data["total_duration_seconds"] = total_duration_seconds
        
        return await self.record_event(
            session_id=session_id,
            event_type=EventType.FLOW_COMPLETED,
            event_data=event_data
        )
    
    async def record_error(
        self,
        session_id: uuid.UUID,
        error_type: str,
        error_message: str,
        step_id: Optional[str] = None
    ) -> AnalyticsEvent:
        """Record an error occurrence."""
        
        event_data = {
            "error_type": error_type,
            "error_message": error_message,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return await self.record_event(
            session_id=session_id,
            event_type=EventType.ERROR_OCCURRED,
            step_id=step_id,
            event_data=event_data
        )
    
    async def record_response_time(
        self,
        session_id: uuid.UUID,
        response_time_ms: float,
        operation_type: str
    ) -> AnalyticsEvent:
        """Record response time for performance monitoring."""
        
        event_data = {
            "response_time_ms": response_time_ms,
            "operation_type": operation_type,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return await self.record_event(
            session_id=session_id,
            event_type=EventType.RESPONSE_TIME,
            event_data=event_data
        )
    
    async def get_flow_completion_rate(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> float:
        """Calculate the flow completion rate."""
        
        # Default to last 30 days if no dates provided
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Count total flows started
        flow_starts_query = select(func.count(AnalyticsEvent.id)).where(
            and_(
                AnalyticsEvent.event_type == EventType.FLOW_START.value,
                AnalyticsEvent.timestamp >= start_date,
                AnalyticsEvent.timestamp <= end_date
            )
        )
        
        # Count flows completed
        flow_completions_query = select(func.count(AnalyticsEvent.id)).where(
            and_(
                AnalyticsEvent.event_type == EventType.FLOW_COMPLETED.value,
                AnalyticsEvent.timestamp >= start_date,
                AnalyticsEvent.timestamp <= end_date
            )
        )
        
        total_starts = await self.db.scalar(flow_starts_query) or 0
        total_completions = await self.db.scalar(flow_completions_query) or 0
        
        if total_starts == 0:
            return 0.0
        
        return (total_completions / total_starts) * 100.0
    
    async def get_handoff_rate(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> float:
        """Calculate the handoff rate."""
        
        # Default to last 30 days if no dates provided
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Count total sessions
        total_sessions_query = select(func.count(UserSession.id)).where(
            and_(
                UserSession.created_at >= start_date,
                UserSession.created_at <= end_date
            )
        )
        
        # Count handoffs triggered
        handoffs_query = select(func.count(AnalyticsEvent.id)).where(
            and_(
                AnalyticsEvent.event_type == EventType.HANDOFF_TRIGGERED.value,
                AnalyticsEvent.timestamp >= start_date,
                AnalyticsEvent.timestamp <= end_date
            )
        )
        
        total_sessions = await self.db.scalar(total_sessions_query) or 0
        total_handoffs = await self.db.scalar(handoffs_query) or 0
        
        if total_sessions == 0:
            return 0.0
        
        return (total_handoffs / total_sessions) * 100.0
    
    async def get_step_completion_rates(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, float]:
        """Get completion rates for each conversation step."""
        
        # Default to last 30 days if no dates provided
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Get step completion counts
        step_completions_query = select(
            AnalyticsEvent.step_id,
            func.count(AnalyticsEvent.id).label('count')
        ).where(
            and_(
                AnalyticsEvent.event_type == EventType.STEP_COMPLETED.value,
                AnalyticsEvent.timestamp >= start_date,
                AnalyticsEvent.timestamp <= end_date,
                AnalyticsEvent.step_id.isnot(None)
            )
        ).group_by(AnalyticsEvent.step_id)
        
        result = await self.db.execute(step_completions_query)
        step_counts = {row.step_id: row.count for row in result}
        
        # Calculate rates based on flow starts
        total_starts_query = select(func.count(AnalyticsEvent.id)).where(
            and_(
                AnalyticsEvent.event_type == EventType.FLOW_START.value,
                AnalyticsEvent.timestamp >= start_date,
                AnalyticsEvent.timestamp <= end_date
            )
        )
        
        total_starts = await self.db.scalar(total_starts_query) or 0
        
        if total_starts == 0:
            return {}
        
        return {
            step_id: (count / total_starts) * 100.0
            for step_id, count in step_counts.items()
        }
    
    async def get_average_response_time(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> float:
        """Calculate average response time in milliseconds."""
        
        # Default to last 30 days if no dates provided
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Query for response time events
        response_time_query = select(
            func.avg(
                cast(
                    AnalyticsEvent.event_data['response_time_ms'].as_string(),
                    Float
                )
            )
        ).where(
            and_(
                AnalyticsEvent.event_type == EventType.RESPONSE_TIME.value,
                AnalyticsEvent.timestamp >= start_date,
                AnalyticsEvent.timestamp <= end_date,
                AnalyticsEvent.event_data['response_time_ms'].isnot(None)
            )
        )
        
        avg_response_time = await self.db.scalar(response_time_query)
        return float(avg_response_time) if avg_response_time else 0.0
    
    async def get_analytics_summary(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> AnalyticsMetrics:
        """Get comprehensive analytics summary."""
        
        # Default to last 30 days if no dates provided
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Get total sessions
        total_sessions_query = select(func.count(UserSession.id)).where(
            and_(
                UserSession.created_at >= start_date,
                UserSession.created_at <= end_date
            )
        )
        total_sessions = await self.db.scalar(total_sessions_query) or 0
        
        # Get completed flows
        completed_flows_query = select(func.count(AnalyticsEvent.id)).where(
            and_(
                AnalyticsEvent.event_type == EventType.FLOW_COMPLETED.value,
                AnalyticsEvent.timestamp >= start_date,
                AnalyticsEvent.timestamp <= end_date
            )
        )
        completed_flows = await self.db.scalar(completed_flows_query) or 0
        
        # Calculate rates
        completion_rate = await self.get_flow_completion_rate(start_date, end_date)
        handoff_rate = await self.get_handoff_rate(start_date, end_date)
        step_completion_rates = await self.get_step_completion_rates(start_date, end_date)
        avg_response_time = await self.get_average_response_time(start_date, end_date)
        
        # Calculate error rate
        error_count_query = select(func.count(AnalyticsEvent.id)).where(
            and_(
                AnalyticsEvent.event_type == EventType.ERROR_OCCURRED.value,
                AnalyticsEvent.timestamp >= start_date,
                AnalyticsEvent.timestamp <= end_date
            )
        )
        error_count = await self.db.scalar(error_count_query) or 0
        error_rate = (error_count / total_sessions * 100.0) if total_sessions > 0 else 0.0
        
        # Calculate timeout rate
        timeout_count_query = select(func.count(AnalyticsEvent.id)).where(
            and_(
                AnalyticsEvent.event_type == EventType.TIMEOUT_OCCURRED.value,
                AnalyticsEvent.timestamp >= start_date,
                AnalyticsEvent.timestamp <= end_date
            )
        )
        timeout_count = await self.db.scalar(timeout_count_query) or 0
        timeout_rate = (timeout_count / total_sessions * 100.0) if total_sessions > 0 else 0.0
        
        return AnalyticsMetrics(
            total_sessions=total_sessions,
            completed_flows=completed_flows,
            handoff_rate=handoff_rate,
            completion_rate=completion_rate,
            average_response_time=avg_response_time,
            step_completion_rates=step_completion_rates,
            error_rate=error_rate,
            timeout_rate=timeout_rate
        )


async def get_analytics_service() -> AnalyticsService:
    """Dependency injection for AnalyticsService."""
    
    async for db in get_db():
        return AnalyticsService(db)