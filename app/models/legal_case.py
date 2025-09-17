"""
Legal case and process models.
"""

import uuid
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import Boolean, DateTime, String, Text, JSON, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class LegalCase(Base):
    """Legal case model for managing law firm cases."""
    
    __tablename__ = "legal_cases"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    case_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Client relationship
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Lawyer assignment
    assigned_lawyer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        nullable=True,
        index=True
    )
    
    # Case details
    practice_area: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    case_type: Mapped[str] = mapped_column(String(50), nullable=False)  # consultation, litigation, contract, etc
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")  # low, medium, high, urgent
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="new")  # new, in_progress, waiting_client, waiting_court, closed, archived
    
    # Financial information
    estimated_value: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    hourly_rate: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    fixed_fee: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    billing_type: Mapped[str] = mapped_column(String(20), nullable=False, default="hourly")  # hourly, fixed, contingency
    
    # Important dates
    consultation_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    court_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Court information
    court_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    judge_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    case_number_court: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Metadata
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="whatsapp")
    tags: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    custom_fields: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Timestamps
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
    client: Mapped["Client"] = relationship("Client", back_populates="legal_cases")
    documents: Mapped[List["CaseDocument"]] = relationship(
        "CaseDocument", 
        back_populates="legal_case",
        cascade="all, delete-orphan"
    )
    activities: Mapped[List["CaseActivity"]] = relationship(
        "CaseActivity", 
        back_populates="legal_case",
        cascade="all, delete-orphan"
    )
    appointments: Mapped[List["Appointment"]] = relationship(
        "Appointment", 
        back_populates="legal_case",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<LegalCase(id={self.id}, number={self.case_number}, title={self.title})>"
    
    def get_display_number(self) -> str:
        """Get display case number."""
        return self.case_number or f"CASE-{str(self.id)[:8]}"
    
    def is_active(self) -> bool:
        """Check if case is active."""
        return self.status not in ["closed", "archived"]
    
    def is_overdue(self) -> bool:
        """Check if case is overdue."""
        if not self.deadline:
            return False
        return datetime.utcnow() > self.deadline.replace(tzinfo=None)


class CaseDocument(Base):
    """Document model for legal cases."""
    
    __tablename__ = "case_documents"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    legal_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("legal_cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)  # contract, evidence, petition, etc
    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    file_size: Mapped[Optional[int]] = mapped_column(nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_confidential: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    uploaded_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        nullable=False
    )
    
    # Relationship
    legal_case: Mapped["LegalCase"] = relationship("LegalCase", back_populates="documents")
    
    def __repr__(self) -> str:
        return f"<CaseDocument(id={self.id}, name={self.name}, type={self.document_type})>"


class CaseActivity(Base):
    """Activity log for legal cases."""
    
    __tablename__ = "case_activities"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    legal_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("legal_cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    activity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # call, meeting, document, court, etc
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[Optional[int]] = mapped_column(nullable=True)
    billable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    billable_amount: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    performed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    activity_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        nullable=False
    )
    
    # Relationship
    legal_case: Mapped["LegalCase"] = relationship("LegalCase", back_populates="activities")
    
    def __repr__(self) -> str:
        return f"<CaseActivity(id={self.id}, type={self.activity_type}, title={self.title})>"


class Appointment(Base):
    """Appointment model for scheduling meetings and consultations."""
    
    __tablename__ = "appointments"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    legal_case_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("legal_cases.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    appointment_type: Mapped[str] = mapped_column(String(50), nullable=False)  # consultation, meeting, court, etc
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="scheduled")  # scheduled, confirmed, completed, cancelled, no_show
    
    # Scheduling details
    scheduled_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes: Mapped[int] = mapped_column(nullable=False, default=60)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    meeting_type: Mapped[str] = mapped_column(String(20), nullable=False, default="presencial")  # presencial, online, phone
    meeting_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Reminders
    reminder_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reminder_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
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
    legal_case: Mapped[Optional["LegalCase"]] = relationship("LegalCase", back_populates="appointments")
    client: Mapped["Client"] = relationship("Client", back_populates="appointments")
    
    def __repr__(self) -> str:
        return f"<Appointment(id={self.id}, title={self.title}, date={self.scheduled_date})>"
    
    def is_upcoming(self) -> bool:
        """Check if appointment is upcoming."""
        return self.scheduled_date > datetime.utcnow() and self.status == "scheduled"
    
    def is_overdue(self) -> bool:
        """Check if appointment is overdue."""
        return self.scheduled_date < datetime.utcnow() and self.status == "scheduled"