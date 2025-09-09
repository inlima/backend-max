"""
Pydantic schemas for Contatos API.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ContatoBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=255)
    telefone: str = Field(..., min_length=10, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    areaInteresse: Optional[str] = Field(None, max_length=100)
    preferenciaAtendimento: Optional[str] = Field(None, pattern="^(presencial|online)$")


class ContatoCreate(ContatoBase):
    """Schema for creating a new contato."""
    pass


class ContatoUpdate(BaseModel):
    """Schema for updating an existing contato."""
    nome: Optional[str] = Field(None, min_length=1, max_length=255)
    telefone: Optional[str] = Field(None, min_length=10, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    areaInteresse: Optional[str] = Field(None, max_length=100)
    preferenciaAtendimento: Optional[str] = Field(None, pattern="^(presencial|online)$")


class ContatoResponse(ContatoBase):
    """Schema for contato response."""
    id: str
    status: str = Field(..., pattern="^(novo|existente|em_atendimento|finalizado)$")
    origem: str = Field(..., pattern="^(whatsapp|manual)$")
    tipoSolicitacao: Optional[str] = Field(None, pattern="^(agendamento|consulta|informacao)$")
    primeiroContato: datetime
    ultimaInteracao: datetime
    mensagensNaoLidas: int = Field(0, ge=0)
    dadosColetados: Dict[str, Any] = Field(default_factory=dict)
    conversaCompleta: bool = Field(False)
    atendente: Optional[str] = Field(None, max_length=255)

    class Config:
        from_attributes = True


class ConversaMessageResponse(BaseModel):
    """Schema for conversation message response."""
    id: str
    contatoId: str
    direction: str = Field(..., pattern="^(inbound|outbound)$")
    content: str
    messageType: str = Field("text", pattern="^(text|interactive|template)$")
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

    class Config:
        from_attributes = True


class PaginatedContatosResponse(BaseModel):
    """Schema for paginated contatos response."""
    data: List[ContatoResponse]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    limit: int = Field(..., ge=1)
    pages: int = Field(..., ge=0)