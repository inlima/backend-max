"""
Tests for StateManager service.
"""

import pytest
import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.state_manager import StateManager
from app.models.conversation import (
    UserSession,
    ConversationState,
    MessageHistory,
    AnalyticsEvent,
)


@pytest.fixture
def mock_db_session():
    """Mock database session."""
    session = AsyncMock(spec=AsyncSession)
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.add = MagicMock()
    session.execute = AsyncMock()
    return session


@pytest.fixture
def state_manager(mock_db_session):
    """StateManager instance with mocked database."""
    return StateManager(mock_db_session)


@pytest.mark.asyncio
async def test_create_session_new_user(state_manager, mock_db_session):
    """Test creating a new session for a new user."""
    phone_number = "+5511999999999"
    
    # Mock no existing session
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db_session.execute.return_value = mock_result
    
    session = await state_manager.create_session(phone_number)
    
    assert session.phone_number == phone_number
    assert session.current_step == "welcome"
    assert session.is_active is True
    assert session.collected_data == {}
    
    # Verify database operations
    assert mock_db_session.add.call_count == 2  # Session + ConversationState
    assert mock_db_session.commit.call_count == 2


@pytest.mark.asyncio
async def test_create_session_existing_user(state_manager, mock_db_session):
    """Test reactivating existing session."""
    phone_number = "+5511999999999"
    existing_session = UserSession(
        id=uuid.uuid4(),
        phone_number=phone_number,
        current_step="practice_area",
        is_active=False,
    )
    
    # Mock existing session
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing_session
    mock_db_session.execute.return_value = mock_result
    
    session = await state_manager.create_session(phone_number)
    
    assert session.phone_number == phone_number
    assert session.current_step == "welcome"  # Reset to welcome
    assert session.is_active is True
    
    # Should not add new session, just update existing
    mock_db_session.add.assert_not_called()
    mock_db_session.commit.assert_called_once()


@pytest.mark.asyncio
async def test_get_session(state_manager, mock_db_session):
    """Test getting session by ID."""
    session_id = uuid.uuid4()
    expected_session = UserSession(
        id=session_id,
        phone_number="+5511999999999",
        current_step="welcome",
    )
    
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = expected_session
    mock_db_session.execute.return_value = mock_result
    
    session = await state_manager.get_session(session_id)
    
    assert session == expected_session
    mock_db_session.execute.assert_called_once()


@pytest.mark.asyncio
async def test_update_session_step(state_manager, mock_db_session):
    """Test updating session step and collected data."""
    session_id = uuid.uuid4()
    new_step = "practice_area"
    collected_data = {"client_type": "new"}
    
    mock_result = MagicMock()
    mock_result.rowcount = 1
    mock_db_session.execute.return_value = mock_result
    
    success = await state_manager.update_session_step(
        session_id, new_step, collected_data
    )
    
    assert success is True
    mock_db_session.execute.assert_called_once()
    mock_db_session.commit.assert_called_once()


@pytest.mark.asyncio
async def test_update_conversation_state(state_manager, mock_db_session):
    """Test updating conversation state."""
    session_id = uuid.uuid4()
    
    mock_result = MagicMock()
    mock_result.rowcount = 1
    mock_db_session.execute.return_value = mock_result
    
    success = await state_manager.update_conversation_state(
        session_id=session_id,
        client_type="new",
        practice_area="civil"
    )
    
    assert success is True
    mock_db_session.execute.assert_called_once()
    mock_db_session.commit.assert_called_once()


@pytest.mark.asyncio
async def test_add_message(state_manager, mock_db_session):
    """Test adding message to conversation history."""
    session_id = uuid.uuid4()
    direction = "inbound"
    content = "Hello"
    message_type = "text"
    
    message = await state_manager.add_message(
        session_id=session_id,
        direction=direction,
        content=content,
        message_type=message_type
    )
    
    assert message.session_id == session_id
    assert message.direction == direction
    assert message.content == content
    assert message.message_type == message_type
    
    mock_db_session.add.assert_called_once()
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once()


@pytest.mark.asyncio
async def test_get_conversation_history(state_manager, mock_db_session):
    """Test getting conversation history."""
    session_id = uuid.uuid4()
    messages = [
        MessageHistory(
            id=uuid.uuid4(),
            session_id=session_id,
            direction="inbound",
            content="Hello",
        ),
        MessageHistory(
            id=uuid.uuid4(),
            session_id=session_id,
            direction="outbound",
            content="Hi there!",
        ),
    ]
    
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = messages
    mock_result.scalars.return_value = mock_scalars
    mock_db_session.execute.return_value = mock_result
    
    history = await state_manager.get_conversation_history(session_id)
    
    assert len(history) == 2
    assert history == messages
    mock_db_session.execute.assert_called_once()


@pytest.mark.asyncio
async def test_record_analytics_event(state_manager, mock_db_session):
    """Test recording analytics event."""
    session_id = uuid.uuid4()
    event_type = "flow_start"
    step_id = "welcome"
    event_data = {"user_agent": "WhatsApp"}
    
    event = await state_manager.record_analytics_event(
        session_id=session_id,
        event_type=event_type,
        step_id=step_id,
        event_data=event_data
    )
    
    assert event.session_id == session_id
    assert event.event_type == event_type
    assert event.step_id == step_id
    assert event.event_data == event_data
    
    mock_db_session.add.assert_called_once()
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once()


@pytest.mark.asyncio
async def test_deactivate_session(state_manager, mock_db_session):
    """Test deactivating a session."""
    session_id = uuid.uuid4()
    
    mock_result = MagicMock()
    mock_result.rowcount = 1
    mock_db_session.execute.return_value = mock_result
    
    success = await state_manager.deactivate_session(session_id)
    
    assert success is True
    mock_db_session.execute.assert_called_once()
    mock_db_session.commit.assert_called_once()


@pytest.mark.asyncio
async def test_cleanup_expired_sessions(state_manager, mock_db_session):
    """Test cleaning up expired sessions."""
    expired_session_ids = [uuid.uuid4(), uuid.uuid4()]
    
    # Mock finding expired sessions
    mock_result_find = MagicMock()
    mock_result_find.fetchall.return_value = [(sid,) for sid in expired_session_ids]
    
    # Mock update result
    mock_result_update = MagicMock()
    mock_result_update.rowcount = len(expired_session_ids)
    
    mock_db_session.execute.side_effect = [mock_result_find, mock_result_update]
    
    count = await state_manager.cleanup_expired_sessions(timeout_minutes=30)
    
    assert count == len(expired_session_ids)
    assert mock_db_session.execute.call_count == 2  # Find + Update
    assert mock_db_session.commit.call_count == 1 + len(expired_session_ids)  # Update + events


@pytest.mark.asyncio
async def test_get_session_summary(state_manager, mock_db_session):
    """Test getting session summary for handoff."""
    session_id = uuid.uuid4()
    phone_number = "+5511999999999"
    
    session = UserSession(
        id=session_id,
        phone_number=phone_number,
        current_step="scheduling",
        collected_data={"client_type": "new"},
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    conversation_state = ConversationState(
        session_id=session_id,
        client_type="new",
        practice_area="civil",
        wants_scheduling=True,
        flow_completed=False,
    )
    
    messages = [
        MessageHistory(id=uuid.uuid4(), session_id=session_id, direction="inbound", content="Hello"),
        MessageHistory(id=uuid.uuid4(), session_id=session_id, direction="outbound", content="Hi!"),
    ]
    
    # Mock the method calls
    state_manager.get_session = AsyncMock(return_value=session)
    state_manager.get_conversation_state = AsyncMock(return_value=conversation_state)
    state_manager.get_conversation_history = AsyncMock(return_value=messages)
    
    summary = await state_manager.get_session_summary(session_id)
    
    assert summary is not None
    assert summary["session_id"] == str(session_id)
    assert summary["phone_number"] == phone_number
    assert summary["current_step"] == "scheduling"
    assert summary["collected_data"]["client_type"] == "new"
    assert summary["conversation_state"]["client_type"] == "new"
    assert summary["conversation_state"]["practice_area"] == "civil"
    assert summary["message_count"] == 2


@pytest.mark.asyncio
async def test_trigger_handoff(state_manager, mock_db_session):
    """Test triggering handoff to human agent."""
    session_id = uuid.uuid4()
    
    # Mock successful update
    state_manager.update_conversation_state = AsyncMock(return_value=True)
    state_manager.record_analytics_event = AsyncMock()
    
    success = await state_manager.trigger_handoff(session_id)
    
    assert success is True
    state_manager.update_conversation_state.assert_called_once_with(
        session_id=session_id,
        handoff_triggered=True
    )
    state_manager.record_analytics_event.assert_called_once()


@pytest.mark.asyncio
async def test_get_active_session_by_phone(state_manager, mock_db_session):
    """Test getting active session by phone number."""
    phone_number = "+5511999999999"
    expected_session = UserSession(
        id=uuid.uuid4(),
        phone_number=phone_number,
        is_active=True,
    )
    
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = expected_session
    mock_db_session.execute.return_value = mock_result
    
    session = await state_manager.get_active_session_by_phone(phone_number)
    
    assert session == expected_session
    mock_db_session.execute.assert_called_once()


@pytest.mark.asyncio
async def test_update_session_step_no_data(state_manager, mock_db_session):
    """Test updating session step without collected data."""
    session_id = uuid.uuid4()
    new_step = "practice_area"
    
    mock_result = MagicMock()
    mock_result.rowcount = 1
    mock_db_session.execute.return_value = mock_result
    
    success = await state_manager.update_session_step(session_id, new_step)
    
    assert success is True
    mock_db_session.execute.assert_called_once()
    mock_db_session.commit.assert_called_once()


@pytest.mark.asyncio
async def test_update_conversation_state_empty_kwargs(state_manager, mock_db_session):
    """Test updating conversation state with empty kwargs."""
    session_id = uuid.uuid4()
    
    success = await state_manager.update_conversation_state(session_id=session_id)
    
    assert success is False
    mock_db_session.execute.assert_not_called()
    mock_db_session.commit.assert_not_called()