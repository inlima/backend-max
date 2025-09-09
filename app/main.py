"""
FastAPI application entry point for Advocacia Direta WhatsApp Bot - MVP Version.
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import webhooks, health, websocket, auth
from app.api import contatos_mock as contatos, processos_mock as processos, dashboard_mock as dashboard
from logging_config import setup_logging

# Setup clean logging
setup_logging()

app = FastAPI(
    title="Advocacia Direta WhatsApp Bot - MVP",
    description="WhatsApp chatbot for law firm client intake automation - MVP Version",
    version="0.1.0-mvp",
)

# Configure CORS (simplified for MVP)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Simplified for MVP
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
app.include_router(health.router, prefix="/health", tags=["health"])

# Authentication routes
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

# API routes for frontend integration
app.include_router(contatos.router, prefix="/api/contatos", tags=["contatos"])
app.include_router(processos.router, prefix="/api/processos", tags=["processos"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])

# WebSocket for real-time updates
app.include_router(websocket.router, tags=["websocket"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Advocacia Direta WhatsApp Bot API - MVP",
        "version": "0.1.0-mvp",
        "status": "running"
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )