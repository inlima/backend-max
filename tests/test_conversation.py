#!/usr/bin/env python3
"""
Test conversation flow locally.
"""

import asyncio
import json
from app.services.conversation_service import conversation_service

async def test_conversation_flow():
    """Test the complete conversation flow."""
    phone = "5573982005612"
    
    print("=== Testing Conversation Flow ===\n")
    
    # Test messages in sequence
    messages = [
        ("Olá", "Initial greeting"),
        ("Cliente Novo", "Select client type"),
        ("Direito Civil", "Select practice area"),
        ("Sim, agendar", "Request scheduling"),
        ("Presencial", "Select scheduling type")
    ]
    
    for message, description in messages:
        print(f"📱 User: {message} ({description})")
        await conversation_service.process_message(phone, message, "Test User")
        print("---")
        await asyncio.sleep(1)  # Small delay to see the flow
    
    print("\n=== Testing Escape Command ===")
    print("📱 User: falar com atendente")
    await conversation_service.handle_escape_command(phone)
    
    print("\n✅ Test completed! Check the logs above for the conversation flow.")

if __name__ == "__main__":
    asyncio.run(test_conversation_flow())