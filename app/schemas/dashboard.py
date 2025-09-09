"""
Pydantic schemas for Dashboard API.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class DashboardMetricsResponse(BaseModel):
    """Schema for dashboard metrics response."""
    totalContatos: int = Field(..., ge=0)
    contatosHoje: int = Field(..., ge=0)
    processosAtivos: int = Field(..., ge=0)
    taxaResposta: float = Field(..., ge=0, le=100)
    tempoMedioResposta: str
    satisfacaoCliente: float = Field(..., ge=0, le=5)

    class Config:
        from_attributes = True


class ChartDataPoint(BaseModel):
    """Schema for chart data points."""
    date: str  # Format: YYYY-MM-DD
    contatos: int = Field(..., ge=0)
    processos: int = Field(..., ge=0)
    conversas: int = Field(..., ge=0)

    class Config:
        from_attributes = True


class ActivityItem(BaseModel):
    """Schema for recent activity items."""
    id: str
    tipo: str = Field(..., pattern="^(Contato|Processo|Mensagem)$")
    descricao: str
    contato: str
    telefone: str
    timestamp: datetime

    class Config:
        from_attributes = True