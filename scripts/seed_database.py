#!/usr/bin/env python3
"""
Database seeding script for initial data.
"""

import asyncio
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.models import (
    User,
    Client,
    LegalCase,
    WhatsAppSession,
    ConversationState,
    MessageHistory,
    Appointment
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def create_initial_users(db: AsyncSession):
    """Create initial system users."""
    print("Creating initial users...")
    
    users_data = [
        {
            "email": "admin@advocacia.com",
            "password": "admin123",
            "full_name": "Administrador do Sistema",
            "role": "admin",
            "department": "Administração",
            "is_verified": True
        },
        {
            "email": "advogado@advocacia.com", 
            "password": "adv123",
            "full_name": "Dr. João Silva",
            "role": "lawyer",
            "department": "Direito Civil",
            "phone": "11999999999",
            "is_verified": True
        },
        {
            "email": "recepcionista@advocacia.com",
            "password": "recep123", 
            "full_name": "Maria Santos",
            "role": "receptionist",
            "department": "Atendimento",
            "phone": "11888888888",
            "is_verified": True
        }
    ]
    
    for user_data in users_data:
        password = user_data.pop("password")
        hashed_password = pwd_context.hash(password)
        
        user = User(
            **user_data,
            hashed_password=hashed_password
        )
        db.add(user)
    
    await db.commit()
    print("✅ Initial users created successfully")


async def create_sample_clients(db: AsyncSession):
    """Create sample clients."""
    print("Creating sample clients...")
    
    clients_data = [
        {
            "full_name": "João da Silva Santos",
            "email": "joao.santos@email.com",
            "phone": "11999999999",
            "whatsapp_phone": "5511999999999",
            "document_number": "12345678901",
            "document_type": "CPF",
            "profession": "Engenheiro",
            "address_city": "São Paulo",
            "address_state": "SP",
            "practice_areas_interest": ["Direito Civil", "Direito Trabalhista"],
            "consultation_preference": "presencial",
            "source": "whatsapp"
        },
        {
            "full_name": "Maria Oliveira Costa",
            "email": "maria.costa@email.com", 
            "phone": "11888888888",
            "whatsapp_phone": "5511888888888",
            "document_number": "98765432100",
            "document_type": "CPF",
            "profession": "Professora",
            "address_city": "São Paulo",
            "address_state": "SP",
            "practice_areas_interest": ["Direito de Família"],
            "consultation_preference": "online",
            "source": "whatsapp"
        },
        {
            "full_name": "Carlos Eduardo Lima",
            "email": "carlos.lima@email.com",
            "phone": "11777777777", 
            "whatsapp_phone": "5511777777777",
            "document_number": "11122233344",
            "document_type": "CPF",
            "profession": "Comerciante",
            "address_city": "São Paulo",
            "address_state": "SP",
            "practice_areas_interest": ["Direito Empresarial"],
            "consultation_preference": "presencial",
            "source": "website"
        }
    ]
    
    created_clients = []
    for client_data in clients_data:
        client = Client(**client_data)
        db.add(client)
        created_clients.append(client)
    
    await db.commit()
    print("✅ Sample clients created successfully")
    return created_clients


async def create_sample_legal_cases(db: AsyncSession, clients):
    """Create sample legal cases."""
    print("Creating sample legal cases...")
    
    cases_data = [
        {
            "case_number": "CASE-2024-001",
            "title": "Ação de Indenização por Danos Morais",
            "description": "Cliente busca indenização por danos morais decorrentes de negativação indevida.",
            "client_id": clients[0].id,
            "practice_area": "Direito Civil",
            "case_type": "litigation",
            "priority": "medium",
            "status": "in_progress",
            "estimated_value": 15000.00,
            "billing_type": "contingency",
            "consultation_date": datetime.utcnow() - timedelta(days=5),
            "deadline": datetime.utcnow() + timedelta(days=90),
            "source": "whatsapp"
        },
        {
            "case_number": "CASE-2024-002", 
            "title": "Divórcio Consensual",
            "description": "Processo de divórcio consensual com partilha de bens.",
            "client_id": clients[1].id,
            "practice_area": "Direito de Família",
            "case_type": "consultation",
            "priority": "high",
            "status": "new",
            "fixed_fee": 3500.00,
            "billing_type": "fixed",
            "consultation_date": datetime.utcnow() + timedelta(days=2),
            "source": "whatsapp"
        },
        {
            "case_number": "CASE-2024-003",
            "title": "Constituição de Empresa",
            "description": "Abertura de empresa e elaboração de contrato social.",
            "client_id": clients[2].id,
            "practice_area": "Direito Empresarial", 
            "case_type": "contract",
            "priority": "low",
            "status": "waiting_client",
            "fixed_fee": 2500.00,
            "billing_type": "fixed",
            "consultation_date": datetime.utcnow() - timedelta(days=10),
            "source": "website"
        }
    ]
    
    created_cases = []
    for case_data in cases_data:
        legal_case = LegalCase(**case_data)
        db.add(legal_case)
        created_cases.append(legal_case)
    
    await db.commit()
    print("✅ Sample legal cases created successfully")
    return created_cases


async def create_sample_whatsapp_sessions(db: AsyncSession, clients):
    """Create sample WhatsApp sessions."""
    print("Creating sample WhatsApp sessions...")
    
    sessions_data = [
        {
            "phone_number": "5511999999999",
            "client_id": clients[0].id,
            "current_step": "completed",
            "collected_data": {
                "contact_name": "João da Silva Santos",
                "client_type": "new",
                "practice_area": "Direito Civil",
                "scheduling_preference": "presencial"
            },
            "is_active": False
        },
        {
            "phone_number": "5511888888888",
            "client_id": clients[1].id,
            "current_step": "scheduling",
            "collected_data": {
                "contact_name": "Maria Oliveira Costa",
                "client_type": "new", 
                "practice_area": "Direito de Família",
                "scheduling_preference": "online"
            },
            "is_active": True
        },
        {
            "phone_number": "5511777777777",
            "client_id": clients[2].id,
            "current_step": "practice_area",
            "collected_data": {
                "contact_name": "Carlos Eduardo Lima",
                "client_type": "new"
            },
            "is_active": True
        }
    ]
    
    created_sessions = []
    for session_data in sessions_data:
        session = WhatsAppSession(**session_data)
        db.add(session)
        created_sessions.append(session)
    
    await db.commit()
    print("✅ Sample WhatsApp sessions created successfully")
    return created_sessions


async def create_sample_conversation_states(db: AsyncSession, sessions):
    """Create sample conversation states."""
    print("Creating sample conversation states...")
    
    states_data = [
        {
            "session_id": sessions[0].id,
            "client_type": "new",
            "practice_area": "Direito Civil",
            "scheduling_preference": "presencial",
            "wants_scheduling": True,
            "custom_requests": ["Urgente", "Negativação indevida"],
            "flow_completed": True,
            "handoff_triggered": True
        },
        {
            "session_id": sessions[1].id,
            "client_type": "new",
            "practice_area": "Direito de Família", 
            "scheduling_preference": "online",
            "wants_scheduling": True,
            "custom_requests": ["Divórcio consensual"],
            "flow_completed": False,
            "handoff_triggered": False
        },
        {
            "session_id": sessions[2].id,
            "client_type": "new",
            "practice_area": "Direito Empresarial",
            "scheduling_preference": "presencial",
            "wants_scheduling": False,
            "custom_requests": [],
            "flow_completed": False,
            "handoff_triggered": False
        }
    ]
    
    for state_data in states_data:
        state = ConversationState(**state_data)
        db.add(state)
    
    await db.commit()
    print("✅ Sample conversation states created successfully")


async def create_sample_messages(db: AsyncSession, sessions):
    """Create sample message history."""
    print("Creating sample message history...")
    
    messages_data = [
        # Session 1 messages
        {
            "session_id": sessions[0].id,
            "direction": "inbound",
            "content": "Olá, preciso de ajuda jurídica",
            "message_type": "text",
            "timestamp": datetime.utcnow() - timedelta(hours=2)
        },
        {
            "session_id": sessions[0].id,
            "direction": "outbound", 
            "content": "Olá! Bem-vindo à Advocacia Direta. Sou seu assistente virtual e estou aqui para ajudá-lo.",
            "message_type": "text",
            "timestamp": datetime.utcnow() - timedelta(hours=2, minutes=-1)
        },
        {
            "session_id": sessions[0].id,
            "direction": "inbound",
            "content": "Sou cliente novo",
            "message_type": "interactive",
            "timestamp": datetime.utcnow() - timedelta(hours=1, minutes=58)
        },
        
        # Session 2 messages
        {
            "session_id": sessions[1].id,
            "direction": "inbound",
            "content": "Boa tarde, preciso de advogado para divórcio",
            "message_type": "text",
            "timestamp": datetime.utcnow() - timedelta(minutes=30)
        },
        {
            "session_id": sessions[1].id,
            "direction": "outbound",
            "content": "Boa tarde! Posso ajudá-lo com questões de divórcio. Você é cliente novo ou já foi atendido aqui?",
            "message_type": "text", 
            "timestamp": datetime.utcnow() - timedelta(minutes=29)
        }
    ]
    
    for message_data in messages_data:
        message = MessageHistory(**message_data)
        db.add(message)
    
    await db.commit()
    print("✅ Sample message history created successfully")


async def create_sample_appointments(db: AsyncSession, clients, cases):
    """Create sample appointments."""
    print("Creating sample appointments...")
    
    appointments_data = [
        {
            "legal_case_id": cases[0].id,
            "client_id": clients[0].id,
            "title": "Consulta Inicial - Danos Morais",
            "description": "Primeira consulta para análise do caso de negativação indevida",
            "appointment_type": "consultation",
            "status": "completed",
            "scheduled_date": datetime.utcnow() - timedelta(days=3),
            "duration_minutes": 60,
            "location": "Escritório - Sala 1",
            "meeting_type": "presencial"
        },
        {
            "legal_case_id": cases[1].id,
            "client_id": clients[1].id,
            "title": "Consulta - Divórcio Consensual",
            "description": "Consulta para orientação sobre processo de divórcio",
            "appointment_type": "consultation", 
            "status": "scheduled",
            "scheduled_date": datetime.utcnow() + timedelta(days=2),
            "duration_minutes": 90,
            "meeting_type": "online",
            "meeting_url": "https://meet.google.com/abc-defg-hij",
            "reminder_sent": False
        },
        {
            "client_id": clients[2].id,
            "title": "Consulta Inicial - Direito Empresarial",
            "description": "Consulta sobre abertura de empresa",
            "appointment_type": "consultation",
            "status": "scheduled", 
            "scheduled_date": datetime.utcnow() + timedelta(days=5),
            "duration_minutes": 60,
            "location": "Escritório - Sala 2",
            "meeting_type": "presencial",
            "reminder_sent": False
        }
    ]
    
    for appointment_data in appointments_data:
        appointment = Appointment(**appointment_data)
        db.add(appointment)
    
    await db.commit()
    print("✅ Sample appointments created successfully")


async def seed_database():
    """Main function to seed the database with initial data."""
    print("🌱 Starting database seeding...")
    
    async with AsyncSessionLocal() as db:
        try:
            # Create initial data
            await create_initial_users(db)
            clients = await create_sample_clients(db)
            cases = await create_sample_legal_cases(db, clients)
            sessions = await create_sample_whatsapp_sessions(db, clients)
            await create_sample_conversation_states(db, sessions)
            await create_sample_messages(db, sessions)
            await create_sample_appointments(db, clients, cases)
            
            print("\n🎉 Database seeding completed successfully!")
            print("\n📊 Summary:")
            print("- 3 Users created (admin, lawyer, receptionist)")
            print("- 3 Clients created")
            print("- 3 Legal cases created")
            print("- 3 WhatsApp sessions created")
            print("- 3 Conversation states created")
            print("- 5 Messages created")
            print("- 3 Appointments created")
            
            print("\n🔑 Login credentials:")
            print("Admin: admin@advocacia.com / admin123")
            print("Lawyer: advogado@advocacia.com / adv123")
            print("Receptionist: recepcionista@advocacia.com / recep123")
            
        except Exception as e:
            print(f"❌ Error seeding database: {str(e)}")
            await db.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(seed_database())