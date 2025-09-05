"""
State management service for conversation flows.
"""

import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import (
    UserSession,
    ConversationState,
    MessageHistory,
    AnalyticsEvent,
)


class StateManager:
    """Manages conversation state and session lifecycle."""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
    
    async def create_session(self, phone_number: str) -> UserSession:
        """Create a new user session."""
        # Check if there's an existing active session
        existing_session = await self.get_active_session_by_phone(phone_number)
        if existing_session:
            # Reactivate existing session
            existing_session.is_active = True
            existing_session.current_step = "welcome"
            existing_session.update_activity()
            await self.db.commit()
            return existing_session
        
        # Create new session
        session = UserSession(
            id=uuid.uuid4(),
            phone_number=phone_number,
            current_step="welcome",
            collected_data={},
            is_active=True,
        )
        
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        
        # Create initial conversation state
        conversation_state = ConversationState(
            id=uuid.uuid4(),
            session_id=session.id,
            custom_requests=[],
        )
        
        self.db.add(conversation_state)
        await self.db.commit()
        
        return session
    
    async def get_session(self, session_id: uuid.UUID) -> Optional[UserSession]:
        """Get session by ID with related data."""
        stmt = (
            select(UserSession)
            .options(
                selectinload(UserSession.messages),
                selectinload(UserSession.analytics_events),
            )
            .where(UserSession.id == session_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_active_session_by_phone(self, phone_number: str) -> Optional[UserSession]:
        """Get active session by phone number."""
        stmt = (
            select(UserSession)
            .options(selectinload(UserSession.conversation_state))
            .where(
                UserSession.phone_number == phone_number,
                UserSession.is_active == True
            )
            .order_by(UserSession.updated_at.desc())
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def update_session_step(
        self, 
        session_id: uuid.UUID, 
        step: str,
        collected_data: Optional[Dict] = None
    ) -> bool:
        """Update session current step and collected data."""
        update_values = {
            "current_step": step,
            "updated_at": datetime.utcnow(),
        }
        
        if collected_data is not None:
            update_values["collected_data"] = collected_data
        
        stmt = (
            update(UserSession)
            .where(UserSession.id == session_id)
            .values(**update_values)
        )
        
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount > 0
    
    async def get_conversation_state(self, session_id: uuid.UUID) -> Optional[ConversationState]:
        """Get conversation state for a session."""
        stmt = (
            select(ConversationState)
            .where(ConversationState.session_id == session_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def update_conversation_state(
        self, 
        session_id: uuid.UUID, 
        **kwargs
    ) -> bool:
        """Update conversation state fields."""
        if not kwargs:
            return False
        
        kwargs["updated_at"] = datetime.utcnow()
        
        stmt = (
            update(ConversationState)
            .where(ConversationState.session_id == session_id)
            .values(**kwargs)
        )
        
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount > 0
    
    async def add_message(
        self,
        session_id: uuid.UUID,
        direction: str,
        content: str,
        message_type: Optional[str] = None,
        whatsapp_message_id: Optional[str] = None,
        metadata: Optional[Dict] = None,
    ) -> MessageHistory:
        """Add a message to the conversation history."""
        message = MessageHistory(
            id=uuid.uuid4(),
            session_id=session_id,
            direction=direction,
            content=content,
            message_type=message_type,
            whatsapp_message_id=whatsapp_message_id,
            message_metadata=metadata,
        )
        
        self.db.add(message)
        
        # Update session activity timestamp
        stmt = (
            update(UserSession)
            .where(UserSession.id == session_id)
            .values(updated_at=datetime.utcnow())
        )
        await self.db.execute(stmt)
        
        await self.db.commit()
        await self.db.refresh(message)
        return message
    
    async def get_conversation_history(
        self, 
        session_id: uuid.UUID,
        limit: Optional[int] = None
    ) -> List[MessageHistory]:
        """Get conversation history for a session."""
        stmt = (
            select(MessageHistory)
            .where(MessageHistory.session_id == session_id)
            .order_by(MessageHistory.timestamp.asc())
        )
        
        if limit:
            stmt = stmt.limit(limit)
        
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
    
    async def record_analytics_event(
        self,
        session_id: uuid.UUID,
        event_type: str,
        step_id: Optional[str] = None,
        event_data: Optional[Dict] = None,
    ) -> AnalyticsEvent:
        """Record an analytics event."""
        event = AnalyticsEvent(
            id=uuid.uuid4(),
            session_id=session_id,
            event_type=event_type,
            step_id=step_id,
            event_data=event_data or {},
        )
        
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event
    
    async def deactivate_session(self, session_id: uuid.UUID) -> bool:
        """Deactivate a session."""
        stmt = (
            update(UserSession)
            .where(UserSession.id == session_id)
            .values(is_active=False, updated_at=datetime.utcnow())
        )
        
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount > 0
    
    async def cleanup_expired_sessions(self, timeout_minutes: int = 30) -> int:
        """Clean up expired sessions."""
        cutoff_time = datetime.utcnow() - timedelta(minutes=timeout_minutes)
        
        # Get expired sessions
        stmt = (
            select(UserSession.id)
            .where(
                UserSession.is_active == True,
                UserSession.updated_at < cutoff_time
            )
        )
        result = await self.db.execute(stmt)
        expired_session_ids = [row[0] for row in result.fetchall()]
        
        if not expired_session_ids:
            return 0
        
        # Deactivate expired sessions
        stmt = (
            update(UserSession)
            .where(UserSession.id.in_(expired_session_ids))
            .values(is_active=False, updated_at=datetime.utcnow())
        )
        
        result = await self.db.execute(stmt)
        await self.db.commit()
        
        # Record cleanup events
        for session_id in expired_session_ids:
            await self.record_analytics_event(
                session_id=session_id,
                event_type="session_expired",
                event_data={"timeout_minutes": timeout_minutes}
            )
        
        return result.rowcount
    
    async def get_session_summary(self, session_id: uuid.UUID) -> Optional[Dict]:
        """Get a complete session summary for handoff."""
        session = await self.get_session(session_id)
        if not session:
            return None
        
        conversation_state = await self.get_conversation_state(session_id)
        messages = await self.get_conversation_history(session_id)
        
        return {
            "session_id": str(session.id),
            "phone_number": session.phone_number,
            "created_at": session.created_at.isoformat(),
            "current_step": session.current_step,
            "collected_data": session.collected_data,
            "conversation_state": {
                "client_type": conversation_state.client_type if conversation_state else None,
                "practice_area": conversation_state.practice_area if conversation_state else None,
                "scheduling_preference": conversation_state.scheduling_preference if conversation_state else None,
                "wants_scheduling": conversation_state.wants_scheduling if conversation_state else None,
                "custom_requests": conversation_state.custom_requests if conversation_state else [],
                "flow_completed": conversation_state.flow_completed if conversation_state else False,
            },
            "message_count": len(messages),
            "last_activity": session.updated_at.isoformat(),
        }
    
    async def trigger_handoff(self, session_id: uuid.UUID) -> bool:
        """Mark session for handoff to human agent."""
        # Update conversation state
        success = await self.update_conversation_state(
            session_id=session_id,
            handoff_triggered=True
        )
        
        if success:
            # Record handoff event
            await self.record_analytics_event(
                session_id=session_id,
                event_type="handoff_triggered",
                event_data={"trigger_time": datetime.utcnow().isoformat()}
            )
        
        return success
    
    async def get_or_create_session(self, phone_number: str) -> UserSession:
        """Get existing active session or create new one."""
        existing_session = await self.get_active_session_by_phone(phone_number)
        if existing_session:
            return existing_session
        
        return await self.create_session(phone_number)
    
    async def update_conversation_data(self, session_id: uuid.UUID, data: Dict) -> bool:
        """Update conversation state with new data."""
        return await self.update_conversation_state(session_id=session_id, **data)
    
    async def mark_flow_completed(self, session_id: uuid.UUID) -> bool:
        """Mark conversation flow as completed."""
        return await self.update_conversation_state(
            session_id=session_id,
            flow_completed=True
        )
    
    async def reset_session(self, session_id: uuid.UUID) -> bool:
        """Reset session to initial state."""
        # Reset session step
        session_success = await self.update_session_step(
            session_id=session_id,
            step="welcome",
            collected_data={}
        )
        
        # Reset conversation state
        state_success = await self.update_conversation_state(
            session_id=session_id,
            client_type=None,
            practice_area=None,
            scheduling_preference=None,
            wants_scheduling=None,
            custom_requests=[],
            flow_completed=False,
            handoff_triggered=False
        )
        
        if session_success and state_success:
            # Record reset event
            await self.record_analytics_event(
                session_id=session_id,
                event_type="session_reset",
                event_data={"reset_time": datetime.utcnow().isoformat()}
            )
        
        return session_success and state_success