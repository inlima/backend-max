"""
FastAPI application entry point for Advocacia Direta WhatsApp Bot.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import webhooks, health
from app.middleware.security_middleware import setup_security_middleware

app = FastAPI(
    title="Advocacia Direta WhatsApp Bot",
    description="WhatsApp chatbot for law firm client intake automation",
    version="0.1.0",
)

# Configure security middleware
setup_security_middleware(app)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_HOSTS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
app.include_router(health.router, prefix="/health", tags=["health"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Advocacia Direta WhatsApp Bot API"}


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
    )