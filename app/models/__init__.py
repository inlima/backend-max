"""Database models package."""

from .user import User, UserSession
from .client import Client, ClientContact
from .legal_case import LegalCase, CaseDocument, CaseActivity, Appointment
from .conversation import (
    WhatsAppSession,
    ConversationState,
    MessageHistory,
    AnalyticsEvent,
)

__all__ = [
    # User models
    "User",
    "UserSession",
    # Client models
    "Client",
    "ClientContact",
    # Legal case models
    "LegalCase",
    "CaseDocument",
    "CaseActivity",
    "Appointment",
    # WhatsApp conversation models
    "WhatsAppSession",
    "ConversationState", 
    "MessageHistory",
    "AnalyticsEvent",
]