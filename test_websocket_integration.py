#!/usr/bin/env python3
"""
Test script for WebSocket integration.
"""

import asyncio
import json
import websockets
from datetime import datetime

WEBSOCKET_URL = "ws://localhost:8000/ws"

async def test_websocket_connection():
    """Test WebSocket connection and real-time events."""
    
    print("🔌 Testing WebSocket Integration...")
    
    try:
        # Connect to WebSocket
        async with websockets.connect(WEBSOCKET_URL) as websocket:
            print("✅ WebSocket connected successfully")
            
            # Wait for initial connection message
            initial_message = await websocket.recv()
            initial_data = json.loads(initial_message)
            print(f"✅ Received initial message: {initial_data['type']}")
            
            # Send a ping message
            ping_message = {
                "type": "ping",
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send(json.dumps(ping_message))
            print("✅ Sent ping message")
            
            # Wait for pong response
            pong_message = await websocket.recv()
            pong_data = json.loads(pong_message)
            
            if pong_data.get("type") == "pong":
                print("✅ Received pong response")
            else:
                print(f"❌ Unexpected response: {pong_data}")
            
            print("✅ WebSocket communication working correctly")
            
    except websockets.exceptions.ConnectionRefused:
        print("❌ WebSocket connection refused - make sure server is running")
    except Exception as e:
        print(f"❌ WebSocket error: {e}")

if __name__ == "__main__":
    print("Starting WebSocket integration tests...")
    print("Make sure the FastAPI server is running on localhost:8000")
    print()
    
    asyncio.run(test_websocket_connection())
    
    print()
    print("🏁 WebSocket integration tests completed!")