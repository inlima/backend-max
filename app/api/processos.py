"""
Processos API endpoints.
"""

import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.conversation import UserSession, ConversationState
from app.schemas.processos import (
    ProcessoResponse,
    ProcessoCreate,
    ProcessoUpdate,
    PaginatedProcessosResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()


def session_to_processo(session: UserSession, processo_id: str) -> ProcessoResponse:
    """Convert UserSession with legal interest to Processo format."""
    state = session.conversation_state
    collected_data = session.collected_data or {}
    
    # Generate processo title based on practice area and contact
    nome_contato = collected_data.get('contact_name') or f"Contato {session.phone_number[-4:]}"
    area_juridica = state.practice_area if state else "Consulta Geral"
    titulo = f"{area_juridica} - {nome_contato}"
    
    # Determine status based on conversation state
    status = 'novo'
    if state:
        if state.handoff_triggered:
            status = 'em_andamento'
        elif state.flow_completed:
            status = 'aguardando_cliente'
    
    # Extract custom requests as description
    descricao = None
    if state and state.custom_requests:
        descricao = "; ".join(state.custom_requests)
    
    return ProcessoResponse(
        id=processo_id,
        numero=None,  # Not generated automatically
        titulo=titulo,
        descricao=descricao,
        contatoId=str(session.id),
        contato={
            'nome': nome_contato,
            'telefone': session.phone_number
        },
        areaJuridica=area_juridica,
        status=status,
        prioridade='media',  # Default priority
        origem='whatsapp',
        advogadoResponsavel=None,  # Not assigned yet
        dataAbertura=session.created_at,
        dataUltimaAtualizacao=session.updated_at,
        prazoLimite=None,  # Not set automatically
        documentos=[],  # No documents initially
        historico=[],  # No history initially
        observacoes=None
    )


@router.get("", response_model=PaginatedProcessosResponse)
async def get_processos(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None),
    area_juridica: Optional[str] = Query(None),
    cliente: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get paginated list of processos with optional filtering."""
    try:
        # Query sessions that have legal practice areas (potential processes)
        query = db.query(UserSession).join(ConversationState).filter(
            ConversationState.practice_area.isnot(None)
        ).order_by(desc(UserSession.updated_at))
        
        # Apply filters
        if area_juridica:
            query = query.filter(ConversationState.practice_area.contains(area_juridica))
        
        if cliente:
            # Search in phone number or collected contact name
            query = query.filter(UserSession.phone_number.contains(cliente))
        
        # Calculate pagination
        offset = (page - 1) * limit
        total = query.count()
        sessions = query.offset(offset).limit(limit).all()
        
        # Convert to processos (using session ID as processo ID for now)
        processos = [
            session_to_processo(session, str(session.id)) 
            for session in sessions
        ]
        
        return PaginatedProcessosResponse(
            data=processos,
            total=total,
            page=page,
            limit=limit,
            pages=(total + limit - 1) // limit
        )
        
    except Exception as e:
        logger.error(f"Error fetching processos: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{processo_id}", response_model=ProcessoResponse)
async def get_processo(processo_id: str, db: Session = Depends(get_db)):
    """Get specific processo by ID."""
    try:
        session = db.query(UserSession).filter(UserSession.id == processo_id).first()
        
        if not session or not session.conversation_state or not session.conversation_state.practice_area:
            raise HTTPException(status_code=404, detail="Processo not found")
        
        return session_to_processo(session, processo_id)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching processo {processo_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("", response_model=ProcessoResponse)
async def create_processo(processo: ProcessoCreate, db: Session = Depends(get_db)):
    """Create a new processo manually."""
    try:
        # Check if contato exists
        contato_session = None
        if processo.contatoId:
            contato_session = db.query(UserSession).filter(
                UserSession.id == processo.contatoId
            ).first()
            
            if not contato_session:
                raise HTTPException(status_code=404, detail="Contato not found")
        
        # Create new session for the processo if no contato provided
        if not contato_session:
            # This would require additional contact information
            raise HTTPException(status_code=400, detail="ContatoId is required")
        
        # Update or create conversation state with legal information
        if not contato_session.conversation_state:
            state = ConversationState(
                session_id=contato_session.id,
                practice_area=processo.areaJuridica,
                client_type='existing',
                flow_completed=False
            )
            db.add(state)
        else:
            contato_session.conversation_state.practice_area = processo.areaJuridica
        
        # Update collected data with processo information
        collected_data = contato_session.collected_data or {}
        collected_data['manual_processo'] = True
        collected_data['processo_titulo'] = processo.titulo
        contato_session.collected_data = collected_data
        
        db.commit()
        
        return session_to_processo(contato_session, str(contato_session.id))
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating processo: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{processo_id}", response_model=ProcessoResponse)
async def update_processo(processo_id: str, processo: ProcessoUpdate, db: Session = Depends(get_db)):
    """Update an existing processo."""
    try:
        session = db.query(UserSession).filter(UserSession.id == processo_id).first()
        
        if not session or not session.conversation_state:
            raise HTTPException(status_code=404, detail="Processo not found")
        
        # Update conversation state
        if processo.areaJuridica:
            session.conversation_state.practice_area = processo.areaJuridica
        
        # Update collected data
        collected_data = session.collected_data or {}
        if processo.titulo:
            collected_data['processo_titulo'] = processo.titulo
        if processo.observacoes:
            collected_data['observacoes'] = processo.observacoes
        
        session.collected_data = collected_data
        
        db.commit()
        
        return session_to_processo(session, processo_id)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating processo {processo_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")