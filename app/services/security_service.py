"""
Security service for data encryption, LGPD compliance, and audit logging.
"""

import hashlib
import hmac
import json
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union

from cryptography.fernet import Fernet
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_

from app.config import settings
from app.models.conversation import UserSession, MessageHistory, ConversationState, AnalyticsEvent


class DataEncryption:
    """Handles data encryption and decryption for sensitive information."""
    
    def __init__(self, encryption_key: Optional[str] = None):
        """Initialize encryption with key from settings or generate new one."""
        if encryption_key:
            self.fernet = Fernet(encryption_key.encode())
        else:
            # Generate key from SECRET_KEY for consistency
            key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
            # Fernet requires 32 bytes base64-encoded key
            fernet_key = Fernet.generate_key()
            self.fernet = Fernet(fernet_key)
    
    def encrypt_data(self, data: Union[str, Dict, List]) -> str:
        """Encrypt sensitive data."""
        if isinstance(data, (dict, list)):
            data = json.dumps(data, ensure_ascii=False)
        
        encrypted_data = self.fernet.encrypt(data.encode('utf-8'))
        return encrypted_data.decode('utf-8')
    
    def decrypt_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data."""
        decrypted_bytes = self.fernet.decrypt(encrypted_data.encode('utf-8'))
        return decrypted_bytes.decode('utf-8')
    
    def encrypt_phone_number(self, phone_number: str) -> str:
        """Encrypt phone number for storage."""
        return self.encrypt_data(phone_number)
    
    def decrypt_phone_number(self, encrypted_phone: str) -> str:
        """Decrypt phone number for use."""
        return self.decrypt_data(encrypted_phone)
    
    def hash_phone_number(self, phone_number: str) -> str:
        """Create a hash of phone number for indexing without storing plaintext."""
        return hashlib.sha256(
            (phone_number + settings.SECRET_KEY).encode('utf-8')
        ).hexdigest()


class AuditLogger:
    """Handles audit logging for LGPD compliance."""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
    
    async def log_data_access(
        self,
        session_id: uuid.UUID,
        action: str,
        data_type: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        additional_info: Optional[Dict] = None
    ) -> None:
        """Log data access events for audit trail."""
        audit_event = AnalyticsEvent(
            session_id=session_id,
            event_type="data_access_audit",
            step_id=None,
            event_data={
                "action": action,  # 'read', 'write', 'delete', 'export'
                "data_type": data_type,  # 'conversation', 'personal_data', 'messages'
                "timestamp": datetime.utcnow().isoformat(),
                "user_agent": user_agent,
                "ip_address": ip_address,
                "additional_info": additional_info or {}
            }
        )
        
        self.db.add(audit_event)
        await self.db.commit()
    
    async def log_data_retention_action(
        self,
        action: str,
        affected_sessions: int,
        retention_policy: str,
        additional_info: Optional[Dict] = None
    ) -> None:
        """Log data retention and deletion actions."""
        # Create a system audit event (no specific session)
        system_session_id = uuid.UUID('00000000-0000-0000-0000-000000000000')
        
        audit_event = AnalyticsEvent(
            session_id=system_session_id,
            event_type="data_retention_audit",
            step_id=None,
            event_data={
                "action": action,  # 'auto_delete', 'manual_delete', 'retention_check'
                "affected_sessions": affected_sessions,
                "retention_policy": retention_policy,
                "timestamp": datetime.utcnow().isoformat(),
                "additional_info": additional_info or {}
            }
        )
        
        self.db.add(audit_event)
        await self.db.commit()


class DataRetentionService:
    """Handles automatic data retention and deletion policies for LGPD compliance."""
    
    def __init__(self, db_session: AsyncSession, audit_logger: AuditLogger):
        self.db = db_session
        self.audit_logger = audit_logger
        self.retention_days = 90  # LGPD compliance: 90 days retention
    
    async def cleanup_expired_sessions(self) -> int:
        """Delete sessions older than retention period."""
        cutoff_date = datetime.utcnow() - timedelta(days=self.retention_days)
        
        # Find expired sessions
        expired_sessions_query = select(UserSession).where(
            and_(
                UserSession.updated_at < cutoff_date,
                UserSession.is_active == False
            )
        )
        
        result = await self.db.execute(expired_sessions_query)
        expired_sessions = result.scalars().all()
        
        deleted_count = len(expired_sessions)
        
        if deleted_count > 0:
            # Log before deletion
            await self.audit_logger.log_data_retention_action(
                action="auto_delete",
                affected_sessions=deleted_count,
                retention_policy=f"{self.retention_days}_days_inactive",
                additional_info={
                    "cutoff_date": cutoff_date.isoformat(),
                    "session_ids": [str(session.id) for session in expired_sessions]
                }
            )
            
            # Delete expired sessions (cascade will handle related records)
            for session in expired_sessions:
                await self.db.delete(session)
            
            await self.db.commit()
        
        return deleted_count
    
    async def anonymize_old_data(self) -> int:
        """Anonymize personal data in old but not expired sessions."""
        anonymization_date = datetime.utcnow() - timedelta(days=30)  # Anonymize after 30 days
        cutoff_date = datetime.utcnow() - timedelta(days=self.retention_days)
        
        # Find sessions to anonymize (older than 30 days but not expired)
        sessions_to_anonymize = select(UserSession).where(
            and_(
                UserSession.updated_at < anonymization_date,
                UserSession.updated_at >= cutoff_date,
                UserSession.phone_number.notlike('ANON_%')  # Not already anonymized
            )
        )
        
        result = await self.db.execute(sessions_to_anonymize)
        sessions = result.scalars().all()
        
        anonymized_count = len(sessions)
        
        if anonymized_count > 0:
            # Log anonymization action
            await self.audit_logger.log_data_retention_action(
                action="anonymize_data",
                affected_sessions=anonymized_count,
                retention_policy="30_days_anonymization",
                additional_info={
                    "anonymization_date": anonymization_date.isoformat(),
                    "session_ids": [str(session.id) for session in sessions]
                }
            )
            
            # Anonymize phone numbers
            for session in sessions:
                session.phone_number = f"ANON_{uuid.uuid4().hex[:8]}"
                
                # Anonymize message content that might contain personal info
                messages_query = select(MessageHistory).where(
                    MessageHistory.session_id == session.id
                )
                messages_result = await self.db.execute(messages_query)
                messages = messages_result.scalars().all()
                
                for message in messages:
                    if message.direction == 'inbound':  # Only anonymize user messages
                        message.content = "[ANONYMIZED_USER_MESSAGE]"
            
            await self.db.commit()
        
        return anonymized_count
    
    async def get_user_data_export(self, phone_number: str) -> Dict[str, Any]:
        """Export all user data for LGPD data portability rights."""
        # Find user session by phone number
        session_query = select(UserSession).where(
            UserSession.phone_number == phone_number
        )
        result = await self.db.execute(session_query)
        session = result.scalar_one_or_none()
        
        if not session:
            return {"error": "No data found for this phone number"}
        
        # Log data export
        await self.audit_logger.log_data_access(
            session_id=session.id,
            action="export",
            data_type="complete_user_data",
            additional_info={"export_timestamp": datetime.utcnow().isoformat()}
        )
        
        # Collect all user data
        export_data = {
            "session_info": {
                "id": str(session.id),
                "phone_number": session.phone_number,
                "current_step": session.current_step,
                "collected_data": session.collected_data,
                "is_active": session.is_active,
                "created_at": session.created_at.isoformat() if session.created_at else None,
                "updated_at": session.updated_at.isoformat() if session.updated_at else None
            },
            "conversation_state": None,
            "messages": [],
            "analytics_events": []
        }
        
        # Get conversation state
        if session.conversation_state:
            state = session.conversation_state
            export_data["conversation_state"] = {
                "client_type": state.client_type,
                "practice_area": state.practice_area,
                "scheduling_preference": state.scheduling_preference,
                "wants_scheduling": state.wants_scheduling,
                "custom_requests": state.custom_requests,
                "flow_completed": state.flow_completed,
                "handoff_triggered": state.handoff_triggered,
                "created_at": state.created_at.isoformat() if state.created_at else None,
                "updated_at": state.updated_at.isoformat() if state.updated_at else None
            }
        
        # Get messages
        for message in session.messages:
            export_data["messages"].append({
                "id": str(message.id),
                "direction": message.direction,
                "content": message.content,
                "message_type": message.message_type,
                "timestamp": message.timestamp.isoformat() if message.timestamp else None,
                "metadata": message.message_metadata
            })
        
        # Get analytics events (excluding audit events for privacy)
        for event in session.analytics_events:
            if event.event_type != "data_access_audit":
                export_data["analytics_events"].append({
                    "id": str(event.id),
                    "event_type": event.event_type,
                    "step_id": event.step_id,
                    "timestamp": event.timestamp.isoformat() if event.timestamp else None,
                    "event_data": event.event_data
                })
        
        return export_data
    
    async def delete_user_data(self, phone_number: str) -> bool:
        """Delete all user data for LGPD right to erasure."""
        # Find user session by phone number
        session_query = select(UserSession).where(
            UserSession.phone_number == phone_number
        )
        result = await self.db.execute(session_query)
        session = result.scalar_one_or_none()
        
        if not session:
            return False
        
        # Log data deletion
        await self.audit_logger.log_data_access(
            session_id=session.id,
            action="delete",
            data_type="complete_user_data",
            additional_info={
                "deletion_timestamp": datetime.utcnow().isoformat(),
                "deletion_reason": "user_request_lgpd_erasure"
            }
        )
        
        # Delete session (cascade will handle related records)
        await self.db.delete(session)
        await self.db.commit()
        
        return True


class SecurityService:
    """Main security service that coordinates all security-related operations."""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.encryption = DataEncryption()
        self.audit_logger = AuditLogger(db_session)
        self.retention_service = DataRetentionService(db_session, self.audit_logger)
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """Verify WhatsApp webhook signature for security."""
        expected_signature = hmac.new(
            settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Remove 'sha256=' prefix if present
        if signature.startswith('sha256='):
            signature = signature[7:]
        
        return hmac.compare_digest(expected_signature, signature)
    
    def hash_sensitive_data(self, data: str) -> str:
        """Hash sensitive data for secure storage."""
        return self.pwd_context.hash(data)
    
    def verify_sensitive_data(self, data: str, hashed_data: str) -> bool:
        """Verify sensitive data against hash."""
        return self.pwd_context.verify(data, hashed_data)
    
    async def encrypt_conversation_data(self, session: UserSession) -> UserSession:
        """Encrypt sensitive data in conversation session."""
        if session.collected_data:
            # Encrypt collected data if it contains sensitive information
            session.collected_data = json.loads(
                self.encryption.encrypt_data(session.collected_data)
            ) if isinstance(session.collected_data, dict) else session.collected_data
        
        return session
    
    async def decrypt_conversation_data(self, session: UserSession) -> UserSession:
        """Decrypt sensitive data in conversation session."""
        if session.collected_data and isinstance(session.collected_data, str):
            try:
                session.collected_data = json.loads(
                    self.encryption.decrypt_data(session.collected_data)
                )
            except (ValueError, json.JSONDecodeError):
                # Data might not be encrypted or corrupted
                pass
        
        return session
    
    async def run_data_retention_cleanup(self) -> Dict[str, int]:
        """Run automated data retention cleanup."""
        deleted_sessions = await self.retention_service.cleanup_expired_sessions()
        anonymized_sessions = await self.retention_service.anonymize_old_data()
        
        return {
            "deleted_sessions": deleted_sessions,
            "anonymized_sessions": anonymized_sessions
        }
    
    async def export_user_data(self, phone_number: str) -> Dict[str, Any]:
        """Export user data for LGPD compliance."""
        return await self.retention_service.get_user_data_export(phone_number)
    
    async def delete_user_data(self, phone_number: str) -> bool:
        """Delete user data for LGPD compliance."""
        return await self.retention_service.delete_user_data(phone_number)