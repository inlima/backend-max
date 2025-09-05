"""
Conversation-related database models.
"""

import uuid
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import Boolean, DateTime, String, Text, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class UserSession(Base):
    """User session model for tracking WhatsApp conversations."""
    
    __tablename__ = "user_sessions"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    current_step: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    collected_data: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # Relationships
    messages: Mapped[List["MessageHistory"]] = relationship(
        "MessageHistory", 
        back_populates="session",
        cascade="all, delete-orphan"
    )
    analytics_events: Mapped[List["AnalyticsEvent"]] = relationship(
        "AnalyticsEvent", 
        back_populates="session",
        cascade="all, delete-orphan"
    )
    conversation_state: Mapped[Optional["ConversationState"]] = relationship(
        "ConversationState",
        back_populates="session",
        uselist=False,
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<UserSession(id={self.id}, phone={self.phone_number}, step={self.current_step})>"
    
    def is_expired(self, timeout_minutes: int = 30) -> bool:
        """Check if session is expired based on last activity."""
        if not self.updated_at:
            return True
        
        time_diff = datetime.utcnow() - self.updated_at.replace(tzinfo=None)
        return time_diff.total_seconds() > (timeout_minutes * 60)
    
    def update_activity(self) -> None:
        """Update the last activity timestamp."""
        self.updated_at = datetime.utcnow()


class ConversationState(Base):
    """Detailed conversation state for complex flow management."""
    
    __tablename__ = "conversation_states"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("user_sessions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )
    client_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # 'new' or 'existing'
    practice_area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    scheduling_preference: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # 'presencial' or 'online'
    wants_scheduling: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    custom_requests: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    flow_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    handoff_triggered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # Relationship back to session
    session: Mapped["UserSession"] = relationship("UserSession", back_populates="conversation_state")
    
    def __repr__(self) -> str:
        return f"<ConversationState(session_id={self.session_id}, client_type={self.client_type})>"


class MessageHistory(Base):
    """Message history for tracking conversation flow."""
    
    __tablename__ = "message_history"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("user_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    direction: Mapped[str] = mapped_column(String(10), nullable=False)  # 'inbound' or 'outbound'
    content: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    whatsapp_message_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    message_metadata: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        nullable=False,
        index=True
    )
    
    # Relationship
    session: Mapped["UserSession"] = relationship("UserSession", back_populates="messages")
    
    def __repr__(self) -> str:
        return f"<MessageHistory(id={self.id}, direction={self.direction}, type={self.message_type})>"


class AnalyticsEvent(Base):
    """Analytics events for tracking user interactions and system performance."""
    
    __tablename__ = "analytics_events"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("user_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    step_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    event_data: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        nullable=False,
        index=True
    )
    
    # Relationship
    session: Mapped["UserSession"] = relationship("UserSession", back_populates="analytics_events")
    
    def __repr__(self) -> str:
        return f"<AnalyticsEvent(id={self.id}, type={self.event_type}, step={self.step_id})>"