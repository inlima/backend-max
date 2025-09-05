"""
Tests for security service including data protection and LGPD compliance.
"""

import json
import uuid
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

import pytest
from cryptography.fernet import Fernet
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import UserSession, MessageHistory, ConversationState, AnalyticsEvent
from app.services.security_service import (
    DataEncryption,
    AuditLogger,
    DataRetentionService,
    SecurityService
)


class TestDataEncryption:
    """Test data encryption functionality."""
    
    def test_encrypt_decrypt_string_data(self):
        """Test encryption and decryption of string data."""
        encryption = DataEncryption()
        original_data = "sensitive information"
        
        # Encrypt data
        encrypted_data = encryption.encrypt_data(original_data)
        assert encrypted_data != original_data
        assert isinstance(encrypted_data, str)
        
        # Decrypt data
        decrypted_data = encryption.decrypt_data(encrypted_data)
        assert decrypted_data == original_data
    
    def test_encrypt_decrypt_dict_data(self):
        """Test encryption and decryption of dictionary data."""
        encryption = DataEncryption()
        original_data = {
            "name": "João Silva",
            "phone": "+5511999999999",
            "case_type": "civil"
        }
        
        # Encrypt data
        encrypted_data = encryption.encrypt_data(original_data)
        assert encrypted_data != json.dumps(original_data)
        
        # Decrypt data
        decrypted_data = encryption.decrypt_data(encrypted_data)
        assert json.loads(decrypted_data) == original_data
    
    def test_encrypt_decrypt_list_data(self):
        """Test encryption and decryption of list data."""
        encryption = DataEncryption()
        original_data = ["item1", "item2", "sensitive_item"]
        
        # Encrypt data
        encrypted_data = encryption.encrypt_data(original_data)
        assert encrypted_data != json.dumps(original_data)
        
        # Decrypt data
        decrypted_data = encryption.decrypt_data(encrypted_data)
        assert json.loads(decrypted_data) == original_data
    
    def test_phone_number_encryption(self):
        """Test phone number specific encryption."""
        encryption = DataEncryption()
        phone_number = "+5511999999999"
        
        # Encrypt phone number
        encrypted_phone = encryption.encrypt_phone_number(phone_number)
        assert encrypted_phone != phone_number
        
        # Decrypt phone number
        decrypted_phone = encryption.decrypt_phone_number(encrypted_phone)
        assert decrypted_phone == phone_number
    
    def test_phone_number_hashing(self):
        """Test phone number hashing for indexing."""
        encryption = DataEncryption()
        phone_number = "+5511999999999"
        
        # Hash phone number
        hashed_phone = encryption.hash_phone_number(phone_number)
        assert hashed_phone != phone_number
        assert len(hashed_phone) == 64  # SHA256 hex length
        
        # Same phone number should produce same hash
        hashed_phone2 = encryption.hash_phone_number(phone_number)
        assert hashed_phone == hashed_phone2
        
        # Different phone number should produce different hash
        different_phone = "+5511888888888"
        different_hash = encryption.hash_phone_number(different_phone)
        assert different_hash != hashed_phone
    
    def test_encryption_with_custom_key(self):
        """Test encryption with custom key."""
        custom_key = Fernet.generate_key().decode()
        encryption = DataEncryption(custom_key)
        
        original_data = "test data"
        encrypted_data = encryption.encrypt_data(original_data)
        decrypted_data = encryption.decrypt_data(encrypted_data)
        
        assert decrypted_data == original_data


class TestAuditLogger:
    """Test audit logging functionality."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        session = Mock(spec=AsyncSession)
        session.add = Mock()
        session.commit = Mock()
        return session
    
    @pytest.fixture
    def audit_logger(self, mock_db_session):
        """Create audit logger instance."""
        return AuditLogger(mock_db_session)
    
    @pytest.mark.asyncio
    async def test_log_data_access(self, audit_logger, mock_db_session):
        """Test logging data access events."""
        session_id = uuid.uuid4()
        
        await audit_logger.log_data_access(
            session_id=session_id,
            action="read",
            data_type="conversation",
            user_agent="test-agent",
            ip_address="127.0.0.1",
            additional_info={"test": "info"}
        )
        
        # Verify audit event was created and added to session
        mock_db_session.add.assert_called_once()
        mock_db_session.commit.assert_called_once()
        
        # Check the audit event details
        added_event = mock_db_session.add.call_args[0][0]
        assert isinstance(added_event, AnalyticsEvent)
        assert added_event.session_id == session_id
        assert added_event.event_type == "data_access_audit"
        assert added_event.event_data["action"] == "read"
        assert added_event.event_data["data_type"] == "conversation"
        assert added_event.event_data["user_agent"] == "test-agent"
        assert added_event.event_data["ip_address"] == "127.0.0.1"
    
    @pytest.mark.asyncio
    async def test_log_data_retention_action(self, audit_logger, mock_db_session):
        """Test logging data retention actions."""
        await audit_logger.log_data_retention_action(
            action="auto_delete",
            affected_sessions=5,
            retention_policy="90_days",
            additional_info={"cleanup_type": "scheduled"}
        )
        
        # Verify audit event was created
        mock_db_session.add.assert_called_once()
        mock_db_session.commit.assert_called_once()
        
        # Check the audit event details
        added_event = mock_db_session.add.call_args[0][0]
        assert isinstance(added_event, AnalyticsEvent)
        assert added_event.event_type == "data_retention_audit"
        assert added_event.event_data["action"] == "auto_delete"
        assert added_event.event_data["affected_sessions"] == 5
        assert added_event.event_data["retention_policy"] == "90_days"


class TestDataRetentionService:
    """Test data retention service functionality."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        session = Mock(spec=AsyncSession)
        session.execute = Mock()
        session.delete = Mock()
        session.commit = Mock()
        return session
    
    @pytest.fixture
    def mock_audit_logger(self):
        """Mock audit logger."""
        logger = Mock(spec=AuditLogger)
        logger.log_data_retention_action = Mock()
        logger.log_data_access = Mock()
        return logger
    
    @pytest.fixture
    def retention_service(self, mock_db_session, mock_audit_logger):
        """Create data retention service instance."""
        return DataRetentionService(mock_db_session, mock_audit_logger)
    
    @pytest.mark.asyncio
    async def test_cleanup_expired_sessions(self, retention_service, mock_db_session, mock_audit_logger):
        """Test cleanup of expired sessions."""
        # Mock expired sessions
        expired_session1 = Mock(spec=UserSession)
        expired_session1.id = uuid.uuid4()
        expired_session2 = Mock(spec=UserSession)
        expired_session2.id = uuid.uuid4()
        
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = [expired_session1, expired_session2]
        mock_db_session.execute.return_value = mock_result
        
        # Run cleanup
        deleted_count = await retention_service.cleanup_expired_sessions()
        
        # Verify results
        assert deleted_count == 2
        mock_audit_logger.log_data_retention_action.assert_called_once()
        assert mock_db_session.delete.call_count == 2
        mock_db_session.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_cleanup_no_expired_sessions(self, retention_service, mock_db_session, mock_audit_logger):
        """Test cleanup when no expired sessions exist."""
        # Mock no expired sessions
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db_session.execute.return_value = mock_result
        
        # Run cleanup
        deleted_count = await retention_service.cleanup_expired_sessions()
        
        # Verify results
        assert deleted_count == 0
        mock_audit_logger.log_data_retention_action.assert_not_called()
        mock_db_session.delete.assert_not_called()
        mock_db_session.commit.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_anonymize_old_data(self, retention_service, mock_db_session, mock_audit_logger):
        """Test anonymization of old data."""
        # Mock sessions to anonymize
        session1 = Mock(spec=UserSession)
        session1.id = uuid.uuid4()
        session1.phone_number = "+5511999999999"
        
        session2 = Mock(spec=UserSession)
        session2.id = uuid.uuid4()
        session2.phone_number = "+5511888888888"
        
        # Mock messages for anonymization
        message1 = Mock(spec=MessageHistory)
        message1.direction = "inbound"
        message1.content = "Sensitive user message"
        
        message2 = Mock(spec=MessageHistory)
        message2.direction = "outbound"
        message2.content = "Bot response"
        
        # Setup mock returns
        sessions_result = Mock()
        sessions_result.scalars.return_value.all.return_value = [session1, session2]
        
        messages_result = Mock()
        messages_result.scalars.return_value.all.return_value = [message1, message2]
        
        mock_db_session.execute.side_effect = [sessions_result, messages_result, messages_result]
        
        # Run anonymization
        anonymized_count = await retention_service.anonymize_old_data()
        
        # Verify results
        assert anonymized_count == 2
        assert session1.phone_number.startswith("ANON_")
        assert session2.phone_number.startswith("ANON_")
        assert message1.content == "[ANONYMIZED_USER_MESSAGE]"
        assert message2.content == "Bot response"  # Outbound messages not anonymized
        mock_audit_logger.log_data_retention_action.assert_called_once()
        mock_db_session.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_user_data_export(self, retention_service, mock_db_session, mock_audit_logger):
        """Test user data export for LGPD compliance."""
        phone_number = "+5511999999999"
        session_id = uuid.uuid4()
        
        # Mock user session
        mock_session = Mock(spec=UserSession)
        mock_session.id = session_id
        mock_session.phone_number = phone_number
        mock_session.current_step = "contact_info"
        mock_session.collected_data = {"name": "João"}
        mock_session.is_active = True
        mock_session.created_at = datetime.utcnow()
        mock_session.updated_at = datetime.utcnow()
        
        # Mock conversation state
        mock_state = Mock(spec=ConversationState)
        mock_state.client_type = "new"
        mock_state.practice_area = "civil"
        mock_state.scheduling_preference = "online"
        mock_state.wants_scheduling = True
        mock_state.custom_requests = ["urgent"]
        mock_state.flow_completed = False
        mock_state.handoff_triggered = False
        mock_state.created_at = datetime.utcnow()
        mock_state.updated_at = datetime.utcnow()
        
        mock_session.conversation_state = mock_state
        mock_session.messages = []
        mock_session.analytics_events = []
        
        # Setup mock return
        session_result = Mock()
        session_result.scalar_one_or_none.return_value = mock_session
        mock_db_session.execute.return_value = session_result
        
        # Run export
        export_data = await retention_service.get_user_data_export(phone_number)
        
        # Verify results
        assert "session_info" in export_data
        assert export_data["session_info"]["phone_number"] == phone_number
        assert "conversation_state" in export_data
        assert export_data["conversation_state"]["client_type"] == "new"
        assert "messages" in export_data
        assert "analytics_events" in export_data
        mock_audit_logger.log_data_access.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_user_data_export_not_found(self, retention_service, mock_db_session):
        """Test user data export when user not found."""
        phone_number = "+5511999999999"
        
        # Setup mock return for no user found
        session_result = Mock()
        session_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = session_result
        
        # Run export
        export_data = await retention_service.get_user_data_export(phone_number)
        
        # Verify results
        assert "error" in export_data
        assert export_data["error"] == "No data found for this phone number"
    
    @pytest.mark.asyncio
    async def test_delete_user_data(self, retention_service, mock_db_session, mock_audit_logger):
        """Test user data deletion for LGPD compliance."""
        phone_number = "+5511999999999"
        
        # Mock user session
        mock_session = Mock(spec=UserSession)
        mock_session.id = uuid.uuid4()
        mock_session.phone_number = phone_number
        
        # Setup mock return
        session_result = Mock()
        session_result.scalar_one_or_none.return_value = mock_session
        mock_db_session.execute.return_value = session_result
        
        # Run deletion
        result = await retention_service.delete_user_data(phone_number)
        
        # Verify results
        assert result is True
        mock_audit_logger.log_data_access.assert_called_once()
        mock_db_session.delete.assert_called_once_with(mock_session)
        mock_db_session.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_delete_user_data_not_found(self, retention_service, mock_db_session):
        """Test user data deletion when user not found."""
        phone_number = "+5511999999999"
        
        # Setup mock return for no user found
        session_result = Mock()
        session_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = session_result
        
        # Run deletion
        result = await retention_service.delete_user_data(phone_number)
        
        # Verify results
        assert result is False
        mock_db_session.delete.assert_not_called()


class TestSecurityService:
    """Test main security service functionality."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        return Mock(spec=AsyncSession)
    
    @pytest.fixture
    def security_service(self, mock_db_session):
        """Create security service instance."""
        return SecurityService(mock_db_session)
    
    def test_verify_webhook_signature_valid(self, security_service):
        """Test webhook signature verification with valid signature."""
        payload = '{"test": "data"}'
        
        with patch('app.services.security_service.settings') as mock_settings:
            mock_settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "test_token"
            
            # Calculate expected signature
            import hmac
            import hashlib
            expected_signature = hmac.new(
                "test_token".encode('utf-8'),
                payload.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            # Test verification
            result = security_service.verify_webhook_signature(payload, f"sha256={expected_signature}")
            assert result is True
    
    def test_verify_webhook_signature_invalid(self, security_service):
        """Test webhook signature verification with invalid signature."""
        payload = '{"test": "data"}'
        invalid_signature = "sha256=invalid_signature"
        
        with patch('app.services.security_service.settings') as mock_settings:
            mock_settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "test_token"
            
            result = security_service.verify_webhook_signature(payload, invalid_signature)
            assert result is False
    
    def test_hash_and_verify_sensitive_data(self, security_service):
        """Test hashing and verification of sensitive data."""
        sensitive_data = "sensitive_information"
        
        # Hash data
        hashed_data = security_service.hash_sensitive_data(sensitive_data)
        assert hashed_data != sensitive_data
        
        # Verify data
        is_valid = security_service.verify_sensitive_data(sensitive_data, hashed_data)
        assert is_valid is True
        
        # Verify with wrong data
        is_invalid = security_service.verify_sensitive_data("wrong_data", hashed_data)
        assert is_invalid is False
    
    @pytest.mark.asyncio
    async def test_encrypt_conversation_data(self, security_service):
        """Test encryption of conversation data."""
        session = Mock(spec=UserSession)
        session.collected_data = {"name": "João", "phone": "+5511999999999"}
        
        # Encrypt conversation data
        encrypted_session = await security_service.encrypt_conversation_data(session)
        
        # Verify data was encrypted (should be different from original)
        assert encrypted_session.collected_data != {"name": "João", "phone": "+5511999999999"}
    
    @pytest.mark.asyncio
    async def test_run_data_retention_cleanup(self, security_service):
        """Test running data retention cleanup."""
        with patch.object(security_service.retention_service, 'cleanup_expired_sessions') as mock_cleanup, \
             patch.object(security_service.retention_service, 'anonymize_old_data') as mock_anonymize:
            
            mock_cleanup.return_value = 5
            mock_anonymize.return_value = 3
            
            # Run cleanup
            results = await security_service.run_data_retention_cleanup()
            
            # Verify results
            assert results["deleted_sessions"] == 5
            assert results["anonymized_sessions"] == 3
            mock_cleanup.assert_called_once()
            mock_anonymize.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_export_user_data(self, security_service):
        """Test user data export."""
        phone_number = "+5511999999999"
        expected_data = {"session_info": {"phone_number": phone_number}}
        
        with patch.object(security_service.retention_service, 'get_user_data_export') as mock_export:
            mock_export.return_value = expected_data
            
            # Export data
            result = await security_service.export_user_data(phone_number)
            
            # Verify results
            assert result == expected_data
            mock_export.assert_called_once_with(phone_number)
    
    @pytest.mark.asyncio
    async def test_delete_user_data(self, security_service):
        """Test user data deletion."""
        phone_number = "+5511999999999"
        
        with patch.object(security_service.retention_service, 'delete_user_data') as mock_delete:
            mock_delete.return_value = True
            
            # Delete data
            result = await security_service.delete_user_data(phone_number)
            
            # Verify results
            assert result is True
            mock_delete.assert_called_once_with(phone_number)


@pytest.mark.integration
class TestSecurityServiceIntegration:
    """Integration tests for security service with real database."""
    
    @pytest.mark.asyncio
    async def test_full_encryption_cycle(self, db_session):
        """Test full encryption and decryption cycle with database."""
        security_service = SecurityService(db_session)
        
        # Create test session with sensitive data
        session = UserSession(
            phone_number="+5511999999999",
            current_step="contact_info",
            collected_data={"name": "João Silva", "email": "joao@example.com"},
            is_active=True
        )
        
        # Encrypt and save
        encrypted_session = await security_service.encrypt_conversation_data(session)
        db_session.add(encrypted_session)
        await db_session.commit()
        
        # Retrieve and decrypt
        from sqlalchemy import select
        result = await db_session.execute(
            select(UserSession).where(UserSession.phone_number == "+5511999999999")
        )
        retrieved_session = result.scalar_one()
        
        decrypted_session = await security_service.decrypt_conversation_data(retrieved_session)
        
        # Verify data integrity
        assert decrypted_session.collected_data["name"] == "João Silva"
        assert decrypted_session.collected_data["email"] == "joao@example.com"
    
    @pytest.mark.asyncio
    async def test_audit_logging_integration(self, db_session):
        """Test audit logging with real database."""
        security_service = SecurityService(db_session)
        
        # Create test session
        session = UserSession(
            phone_number="+5511999999999",
            current_step="contact_info",
            is_active=True
        )
        db_session.add(session)
        await db_session.commit()
        
        # Log audit event
        await security_service.audit_logger.log_data_access(
            session_id=session.id,
            action="read",
            data_type="conversation",
            user_agent="test-agent"
        )
        
        # Verify audit event was created
        from sqlalchemy import select
        result = await db_session.execute(
            select(AnalyticsEvent).where(
                AnalyticsEvent.session_id == session.id,
                AnalyticsEvent.event_type == "data_access_audit"
            )
        )
        audit_event = result.scalar_one()
        
        assert audit_event.event_data["action"] == "read"
        assert audit_event.event_data["data_type"] == "conversation"
        assert audit_event.event_data["user_agent"] == "test-agent"