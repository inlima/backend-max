"""
FastAPI application entry point for Advocacia Direta WhatsApp Bot - MVP Version.
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import webhooks, health, websocket, auth, whatsapp_messages
from app.api import contatos_mock as contatos, processos_mock as processos, dashboard_mock as dashboard
from logging_config import setup_logging

# Setup clean logging
setup_logging()

app = FastAPI(
    title="Advocacia Direta - Backend API",
    description="""
    ## Sistema Backend para Automação de Atendimento Jurídico via WhatsApp
    
    Esta API fornece todos os endpoints necessários para:
    
    ### 🤖 WhatsApp Business Integration
    - Webhook para receber mensagens do WhatsApp
    - Envio automatizado de mensagens
    - Gerenciamento de conversas em tempo real
    
    ### 👥 Gestão de Clientes
    - Cadastro e atualização de clientes
    - Histórico de conversas
    - Segmentação por área jurídica
    
    ### 📊 Analytics e Métricas
    - Métricas de atendimento
    - Relatórios de conversão
    - Dashboard em tempo real
    
    ### 🔐 Autenticação e Segurança
    - Autenticação JWT
    - Controle de acesso por roles
    - Validação de webhooks
    
    ### 🔄 Comunicação em Tempo Real
    - WebSocket para atualizações instantâneas
    - Notificações push
    - Sincronização de dados
    
    ---
    
    **Ambiente:** Desenvolvimento  
    **Versão:** 1.0.0  
    **Documentação:** [Swagger UI](/docs) | [ReDoc](/redoc)
    """,
    version="1.0.0",
    contact={
        "name": "Advocacia Direta - Suporte Técnico",
        "email": "suporte@advocaciadireta.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    servers=[
        {
            "url": "http://localhost:8000",
            "description": "Servidor de Desenvolvimento"
        },
        {
            "url": "https://api.advocaciadireta.com",
            "description": "Servidor de Produção"
        }
    ]
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

# API routes
app.include_router(contatos.router, prefix="/api/contatos", tags=["contatos"])
app.include_router(processos.router, prefix="/api/processos", tags=["processos"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])

# WhatsApp Messages API
app.include_router(whatsapp_messages.router, prefix="/api/whatsapp", tags=["whatsapp-messages"])

# WebSocket for real-time updates
app.include_router(websocket.router, tags=["websocket"])


@app.get("/", tags=["root"])
async def root():
    """
    ## Endpoint Raiz da API
    
    Retorna informações básicas sobre a API e links úteis para documentação.
    
    ### Resposta
    - **message**: Nome e descrição da API
    - **version**: Versão atual da API
    - **status**: Status operacional
    - **docs**: Links para documentação
    - **endpoints**: Principais grupos de endpoints
    """
    return {
        "message": "Advocacia Direta - Backend API",
        "version": "1.0.0",
        "status": "running",
        "docs": {
            "swagger": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json"
        },
        "endpoints": {
            "webhook": "/webhook/",
            "health": "/health/",
            "auth": "/api/auth/",
            "clients": "/api/contatos/",
            "processes": "/api/processos/",
            "dashboard": "/api/dashboard/",
            "websocket": "/ws/"
        }
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )