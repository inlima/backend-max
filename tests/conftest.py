"""
Pytest configuration and fixtures.
"""

import pytest
import asyncio
import uuid
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime

from app.main import app
from app.core.database import get_db, Base
from app.services.flow_engine import FlowEngine
from app.services.state_manager import StateManager
from app.services.message_builder import MessageBuilder
from app.models.conversation import UserSession, ConversationState

# Test database URL (in-memory SQLite for testing)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Create test session factory
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_test_db():
    """Override database dependency for testing."""
    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


@pytest.fixture
async def db_session():
    """Create test database session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestSessionLocal() as session:
        yield session
    
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
def client():
    """Create test client."""
    app.dependency_overrides[get_db] = get_test_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# E2E Test Fixtures

@pytest.fixture
def mock_state_manager():
    """Create mock state manager for testing."""
    mock = AsyncMock(spec=StateManager)
    
    # Setup default return values
    mock.get_or_create_session.return_value = MagicMock(spec=UserSession)
    mock.get_conversation_state.return_value = MagicMock(spec=ConversationState)
    mock.update_conversation_data.return_value = None
    mock.update_session_step.return_value = None
    mock.record_analytics_event.return_value = None
    mock.trigger_handoff.return_value = None
    mock.mark_flow_completed.return_value = None
    
    return mock


@pytest.fixture
def mock_user_session():
    """Create mock user session for testing."""
    session = MagicMock(spec=UserSession)
    session.id = uuid.uuid4()
    session.phone_number = "5511999999999"
    session.current_step = "welcome"
    session.created_at = datetime.now()
    session.updated_at = datetime.now()
    return session


@pytest.fixture
def mock_conversation_state():
    """Create mock conversation state for testing."""
    state = MagicMock(spec=ConversationState)
    state.client_type = None
    state.practice_area = None
    state.wants_scheduling = None
    state.scheduling_preference = None
    return state


@pytest.fixture
def flow_engine_with_mocks(mock_state_manager):
    """Create flow engine with mocked dependencies."""
    return FlowEngine(state_manager=mock_state_manager)


@pytest.fixture
def real_message_builder():
    """Create real message builder for integration testing."""
    return MessageBuilder()


@pytest.fixture
def sample_messages():
    """Provide sample message structures for testing."""
    return {
        "text_hello": {
            "type": "text",
            "text": {"body": "Olá"}
        },
        "button_new_client": {
            "type": "interactive",
            "interactive": {
                "type": "button_reply",
                "button_reply": {
                    "id": "client_new",
                    "title": "Sou Cliente Novo"
                }
            }
        },
        "button_existing_client": {
            "type": "interactive",
            "interactive": {
                "type": "button_reply",
                "button_reply": {
                    "id": "client_existing",
                    "title": "Já sou Cliente"
                }
            }
        },
        "button_civil_law": {
            "type": "interactive",
            "interactive": {
                "type": "button_reply",
                "button_reply": {
                    "id": "area_civil",
                    "title": "Direito Civil"
                }
            }
        },
        "button_schedule_yes": {
            "type": "interactive",
            "interactive": {
                "type": "button_reply",
                "button_reply": {
                    "id": "schedule_yes",
                    "title": "Sim, quero agendar"
                }
            }
        },
        "button_schedule_no": {
            "type": "interactive",
            "interactive": {
                "type": "button_reply",
                "button_reply": {
                    "id": "schedule_no",
                    "title": "Não, só informações"
                }
            }
        },
        "button_presencial": {
            "type": "interactive",
            "interactive": {
                "type": "button_reply",
                "button_reply": {
                    "id": "type_presencial",
                    "title": "Presencial"
                }
            }
        },
        "button_online": {
            "type": "interactive",
            "interactive": {
                "type": "button_reply",
                "button_reply": {
                    "id": "type_online",
                    "title": "Online"
                }
            }
        },
        "text_escape": {
            "type": "text",
            "text": {"body": "falar com atendente"}
        },
        "empty_text": {
            "type": "text",
            "text": {"body": ""}
        },
        "malformed": {
            "type": "text"
            # Missing text body
        }
    }


@pytest.fixture
def conversation_test_data():
    """Provide test data for conversation flows."""
    return {
        "complete_new_client_flow": [
            "text_hello",
            "button_new_client", 
            "button_civil_law",
            "button_schedule_yes",
            "button_presencial"
        ],
        "complete_existing_client_flow": [
            "text_hello",
            "button_existing_client",
            "button_civil_law", 
            "button_schedule_yes",
            "button_online"
        ],
        "info_only_flow": [
            "text_hello",
            "button_new_client",
            "button_civil_law",
            "button_schedule_no"
        ],
        "early_escape_flow": [
            "text_hello",
            "text_escape"
        ],
        "mid_flow_escape": [
            "text_hello",
            "button_new_client",
            "text_escape"
        ]
    }


# Async test configuration
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# Performance testing fixtures
@pytest.fixture
def performance_thresholds():
    """Define performance thresholds for testing."""
    return {
        "max_response_time": 1.0,  # 1 second
        "max_processing_time": 120.0,  # 2 minutes (requirement)
        "min_completion_rate": 80.0,  # 80% (requirement)
        "target_csat": 4.5  # 4.5/5 (requirement)
    }


# Test data validation fixtures
@pytest.fixture
def requirement_mappings():
    """Map test scenarios to requirements."""
    return {
        "welcome_response": ["1.1"],
        "client_type_selection": ["1.2", "1.3"],
        "practice_area_selection": ["1.4"],
        "scheduling_offer": ["2.1"],
        "scheduling_type": ["2.2"],
        "scheduling_confirmation": ["2.3", "2.4"],
        "handoff_completion": ["3.1", "3.2", "3.3"],
        "escape_commands": ["3.4"],
        "portuguese_language": ["4.4"],
        "flow_completion_rate": ["5.2"],
        "response_time": ["5.3"]
    }