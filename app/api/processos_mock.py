"""
Mock Processos API endpoints for testing without database.
"""

import logging
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query
from uuid import uuid4

from app.schemas.processos import (
    ProcessoResponse,
    ProcessoCreate,
    ProcessoUpdate,
    PaginatedProcessosResponse,
    ContatoInfo
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Mock data storage
mock_processos = []

# Initialize with some sample data
def init_mock_data():
    """Initialize mock data for testing."""
    global mock_processos
    
    if not mock_processos:
        # Sample processos
        mock_processos.extend([
            ProcessoResponse(
                id=str(uuid4()),
                numero="2024.001.001",
                titulo="Ação Trabalhista - Maria Santos",
                descricao="Processo de rescisão indevida",
                contatoId=str(uuid4()),
                contato=ContatoInfo(nome="Maria Santos", telefone="5573988776655"),
                areaJuridica="Direito Trabalhista",
                status="em_andamento",
                prioridade="alta",
                origem="whatsapp",
                advogadoResponsavel="Dr. João Advogado",
                dataAbertura=datetime.now() - timedelta(days=5),
                dataUltimaAtualizacao=datetime.now() - timedelta(hours=2),
                prazoLimite=datetime.now() + timedelta(days=30),
                documentos=[],
                historico=[],
                observacoes="Cliente relatou demissão sem justa causa"
            ),
            ProcessoResponse(
                id=str(uuid4()),
                numero="2024.001.002",
                titulo="Consultoria Civil - João Silva",
                descricao="Análise de contrato de compra e venda",
                contatoId=str(uuid4()),
                contato=ContatoInfo(nome="João Silva", telefone="5573999887766"),
                areaJuridica="Direito Civil",
                status="novo",
                prioridade="media",
                origem="whatsapp",
                dataAbertura=datetime.now() - timedelta(days=1),
                dataUltimaAtualizacao=datetime.now() - timedelta(hours=1),
                documentos=[],
                historico=[],
                observacoes="Cliente precisa de análise urgente do contrato"
            )
        ])

init_mock_data()


@router.get("", response_model=PaginatedProcessosResponse)
async def get_processos(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None),
    area_juridica: Optional[str] = Query(None),
    cliente: Optional[str] = Query(None)
):
    """Get paginated list of processos with optional filtering."""
    try:
        # Filter processos
        filtered_processos = mock_processos.copy()
        
        if status:
            filtered_processos = [p for p in filtered_processos if p.status == status]
        
        if area_juridica:
            filtered_processos = [
                p for p in filtered_processos 
                if area_juridica.lower() in p.areaJuridica.lower()
            ]
        
        if cliente:
            filtered_processos = [
                p for p in filtered_processos 
                if cliente.lower() in p.contato.nome.lower() or cliente in p.contato.telefone
            ]
        
        # Pagination
        total = len(filtered_processos)
        start = (page - 1) * limit
        end = start + limit
        paginated_processos = filtered_processos[start:end]
        
        return PaginatedProcessosResponse(
            data=paginated_processos,
            total=total,
            page=page,
            limit=limit,
            pages=(total + limit - 1) // limit if total > 0 else 0
        )
        
    except Exception as e:
        logger.error(f"Error fetching processos: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{processo_id}", response_model=ProcessoResponse)
async def get_processo(processo_id: str):
    """Get specific processo by ID."""
    try:
        processo = next((p for p in mock_processos if p.id == processo_id), None)
        
        if not processo:
            raise HTTPException(status_code=404, detail="Processo not found")
        
        return processo
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching processo {processo_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("", response_model=ProcessoResponse)
async def create_processo(processo: ProcessoCreate):
    """Create a new processo manually."""
    try:
        new_processo = ProcessoResponse(
            id=str(uuid4()),
            numero=processo.numero,
            titulo=processo.titulo,
            descricao=processo.descricao,
            contatoId=processo.contatoId,
            contato=ContatoInfo(nome="Contato Teste", telefone="5573999999999"),  # Mock contato
            areaJuridica=processo.areaJuridica,
            status="novo",
            prioridade=processo.prioridade or "media",
            origem="manual",
            dataAbertura=datetime.now(),
            dataUltimaAtualizacao=datetime.now(),
            documentos=[],
            historico=[],
            observacoes=processo.observacoes
        )
        
        mock_processos.append(new_processo)
        
        return new_processo
        
    except Exception as e:
        logger.error(f"Error creating processo: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{processo_id}", response_model=ProcessoResponse)
async def update_processo(processo_id: str, processo: ProcessoUpdate):
    """Update an existing processo."""
    try:
        # Find processo
        existing_processo = next((p for p in mock_processos if p.id == processo_id), None)
        
        if not existing_processo:
            raise HTTPException(status_code=404, detail="Processo not found")
        
        # Update fields
        if processo.titulo:
            existing_processo.titulo = processo.titulo
        if processo.descricao:
            existing_processo.descricao = processo.descricao
        if processo.areaJuridica:
            existing_processo.areaJuridica = processo.areaJuridica
        if processo.status:
            existing_processo.status = processo.status
        if processo.prioridade:
            existing_processo.prioridade = processo.prioridade
        if processo.advogadoResponsavel:
            existing_processo.advogadoResponsavel = processo.advogadoResponsavel
        if processo.prazoLimite:
            existing_processo.prazoLimite = processo.prazoLimite
        if processo.observacoes:
            existing_processo.observacoes = processo.observacoes
        
        existing_processo.dataUltimaAtualizacao = datetime.now()
        
        return existing_processo
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating processo {processo_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")