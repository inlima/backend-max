"""
WebSocket endpoints for real-time updates.
"""

import json
import logging
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState

logger = logging.getLogger(__name__)

router = APIRouter()

# Store active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        
    async def connect(self, websocket: WebSocket):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
        
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
        
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a message to a specific WebSocket."""
        if websocket.client_state == WebSocketState.CONNECTED:
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"Error sending personal message: {e}")
                self.disconnect(websocket)
                
    async def broadcast(self, message: str):
        """Broadcast a message to all connected WebSockets."""
        disconnected = set()
        
        for connection in self.active_connections:
            if connection.client_state == WebSocketState.CONNECTED:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to connection: {e}")
                    disconnected.add(connection)
            else:
                disconnected.add(connection)
        
        # Remove disconnected connections
        for connection in disconnected:
            self.disconnect(connection)
            
    async def broadcast_json(self, data: Dict):
        """Broadcast JSON data to all connected WebSockets."""
        message = json.dumps(data)
        await self.broadcast(message)


# Global connection manager instance
manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await manager.connect(websocket)
    
    try:
        # Send initial connection confirmation
        await manager.send_personal_message(
            json.dumps({
                "type": "connection",
                "status": "connected",
                "message": "WebSocket connection established"
            }),
            websocket
        )
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for messages from client (ping/pong, etc.)
                data = await websocket.receive_text()
                
                # Handle client messages
                try:
                    message = json.loads(data)
                    message_type = message.get("type")
                    
                    if message_type == "ping":
                        # Respond to ping with pong
                        await manager.send_personal_message(
                            json.dumps({"type": "pong", "timestamp": message.get("timestamp")}),
                            websocket
                        )
                    else:
                        logger.debug(f"Received WebSocket message: {message}")
                        
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON received: {data}")
                    
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error in WebSocket loop: {e}")
                break
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        manager.disconnect(websocket)


# Functions to emit events from other parts of the application
async def emit_novo_contato(contato_data: Dict):
    """Emit new contact event to all connected clients."""
    await manager.broadcast_json({
        "type": "novo_contato",
        "data": contato_data
    })


async def emit_contato_atualizado(contato_data: Dict):
    """Emit contact updated event to all connected clients."""
    await manager.broadcast_json({
        "type": "contato_atualizado", 
        "data": contato_data
    })


async def emit_processo_atualizado(processo_data: Dict):
    """Emit process updated event to all connected clients."""
    await manager.broadcast_json({
        "type": "processo_atualizado",
        "data": processo_data
    })


async def emit_nova_mensagem(message_data: Dict):
    """Emit new message event to all connected clients."""
    await manager.broadcast_json({
        "type": "nova_mensagem",
        "data": message_data
    })


async def emit_metrics_updated(metrics_data: Dict):
    """Emit metrics updated event to all connected clients."""
    await manager.broadcast_json({
        "type": "metrics_updated",
        "data": metrics_data
    })


# Export the manager and emit functions for use in other modules
__all__ = [
    "router",
    "manager", 
    "emit_novo_contato",
    "emit_contato_atualizado", 
    "emit_processo_atualizado",
    "emit_nova_mensagem",
    "emit_metrics_updated"
]