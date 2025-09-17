"""
Client and contact models.
"""

import uuid
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import Boolean, DateTime, String, Text, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Client(Base):
    """Client model for managing law firm clients."""
    
    __tablename__ = "clients"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    whatsapp_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    document_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)  # CPF/CNPJ
    document_type: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # CPF, CNPJ
    birth_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    marital_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    profession: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Address information
    address_street: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    address_complement: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    address_neighborhood: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    address_city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    address_state: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    address_zipcode: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    address_country: Mapped[str] = mapped_column(String(50), nullable=False, default="Brasil")
    
    # Client status and preferences
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")  # active, inactive, prospect
    client_type: Mapped[str] = mapped_column(String(20), nullable=False, default="individual")  # individual, company
    preferred_contact: Mapped[str] = mapped_column(String(20), nullable=False, default="whatsapp")  # whatsapp, email, phone
    preferred_language: Mapped[str] = mapped_column(String(10), nullable=False, default="pt-BR")
    
    # Legal preferences
    practice_areas_interest: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    consultation_preference: Mapped[str] = mapped_column(String(20), nullable=False, default="presencial")  # presencial, online, both
    
    # Metadata
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="whatsapp")  # whatsapp, website, referral, etc
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    custom_fields: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    
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
    legal_cases: Mapped[List["LegalCase"]] = relationship(
        "LegalCase", 
        back_populates="client",
        cascade="all, delete-orphan"
    )
    whatsapp_sessions: Mapped[List["WhatsAppSession"]] = relationship(
        "WhatsAppSession", 
        back_populates="client",
        cascade="all, delete-orphan"
    )
    contacts: Mapped[List["ClientContact"]] = relationship(
        "ClientContact", 
        cascade="all, delete-orphan"
    )
    appointments: Mapped[List["Appointment"]] = relationship(
        "Appointment", 
        back_populates="client",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<Client(id={self.id}, name={self.full_name}, phone={self.phone})>"
    
    def get_display_name(self) -> str:
        """Get display name for client."""
        return self.full_name
    
    def get_primary_phone(self) -> str:
        """Get primary phone number."""
        return self.whatsapp_phone or self.phone
    
    def is_active(self) -> bool:
        """Check if client is active."""
        return self.status == "active"


class ClientContact(Base):
    """Additional contact information for clients."""
    
    __tablename__ = "client_contacts"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    contact_type: Mapped[str] = mapped_column(String(20), nullable=False)  # emergency, reference, family, etc
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    relationship: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        nullable=False
    )
    
    def __repr__(self) -> str:
        return f"<ClientContact(id={self.id}, client_id={self.client_id}, type={self.contact_type})>"