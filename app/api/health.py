"""
Health check endpoints - MVP Version.
"""

from datetime import datetime
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy", 
        "service": "advocacia-direta-whatsapp-mvp",
        "timestamp": datetime.utcnow().isoformat()
    }