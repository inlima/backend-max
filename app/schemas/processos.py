"""
Pydantic schemas for Processos API.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ProcessoBase(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=255)
    descricao: Optional[str] = Field(None, max_length=1000)
    areaJuridica: str = Field(..., min_length=1, max_length=100)
    observacoes: Optional[str] = Field(None, max_length=1000)


class ProcessoCreate(ProcessoBase):
    """Schema for creating a new processo."""
    contatoId: str = Field(..., min_length=1)
    numero: Optional[str] = Field(None, max_length=50)
    prioridade: Optional[str] = Field("media", pattern="^(baixa|media|alta|urgente)$")


class ProcessoUpdate(BaseModel):
    """Schema for updating an existing processo."""
    titulo: Optional[str] = Field(None, min_length=1, max_length=255)
    descricao: Optional[str] = Field(None, max_length=1000)
    areaJuridica: Optional[str] = Field(None, min_length=1, max_length=100)
    status: Optional[str] = Field(None, pattern="^(novo|em_andamento|aguardando_cliente|finalizado|arquivado)$")
    prioridade: Optional[str] = Field(None, pattern="^(baixa|media|alta|urgente)$")
    advogadoResponsavel: Optional[str] = Field(None, max_length=255)
    prazoLimite: Optional[datetime] = None
    observacoes: Optional[str] = Field(None, max_length=1000)


class ContatoInfo(BaseModel):
    """Schema for contato information in processo."""
    nome: str
    telefone: str


class ProcessoDocumento(BaseModel):
    """Schema for processo document."""
    id: str
    nome: str
    tipo: str
    url: str
    uploadedAt: datetime
    uploadedBy: str


class ProcessoHistorico(BaseModel):
    """Schema for processo history entry."""
    id: str
    acao: str
    descricao: str
    usuario: str
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ProcessoResponse(ProcessoBase):
    """Schema for processo response."""
    id: str
    numero: Optional[str] = None
    contatoId: str
    contato: ContatoInfo
    status: str = Field(..., pattern="^(novo|em_andamento|aguardando_cliente|finalizado|arquivado)$")
    prioridade: str = Field(..., pattern="^(baixa|media|alta|urgente)$")
    origem: str = Field(..., pattern="^(whatsapp|manual)$")
    advogadoResponsavel: Optional[str] = None
    dataAbertura: datetime
    dataUltimaAtualizacao: datetime
    prazoLimite: Optional[datetime] = None
    documentos: List[ProcessoDocumento] = Field(default_factory=list)
    historico: List[ProcessoHistorico] = Field(default_factory=list)

    class Config:
        from_attributes = True


class PaginatedProcessosResponse(BaseModel):
    """Schema for paginated processos response."""
    data: List[ProcessoResponse]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    limit: int = Field(..., ge=1)
    pages: int = Field(..., ge=0)