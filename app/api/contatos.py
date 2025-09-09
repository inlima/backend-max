"""
Contatos API endpoints for frontend integration.
"""

import logging
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.core.database import get_db
from app.models.conversation import UserSession, ConversationState, MessageHistory
from app.schemas.contatos import (
    ContatoResponse, 
    ContatoCreate, 
    ContatoUpdate,
    ConversaMessageResponse,
    PaginatedContatosResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()


def session_to_contato(session: UserSession) -> ContatoResponse:
    """Convert UserSession to Contato format for frontend."""
    # Extract data from conversation state
    state = session.conversation_state
    collected_data = session.collected_data or {}
    
    # Determine contact name from collected data or use phone number
    nome = collected_data.get('contact_name') or f"Contato {session.phone_number[-4:]}"
    
    # Calculate unread messages (messages from user after our last response)
    last_outbound = None
    unread_count = 0
    
    for msg in reversed(session.messages):
        if msg.direction == 'outbound':
            last_outbound = msg.timestamp
            break
    
    if last_outbound:
        unread_count = len([
            msg for msg in session.messages 
            if msg.direction == 'inbound' and msg.timestamp > last_outbound
        ])
    else:
        unread_count = len([msg for msg in session.messages if msg.direction == 'inbound'])
    
    # Determine status based on conversation state
    status = 'novo'
    if state:
        if state.handoff_triggered:
            status = 'em_atendimento'
        elif state.flow_completed:
            status = 'finalizado'
        else:
            status = 'existente'
    
    # Get area of interest from practice area
    area_interesse = state.practice_area if state else None
    
    # Determine scheduling preference
    preferencia_atendimento = None
    if state and state.scheduling_preference:
        preferencia_atendimento = state.scheduling_preference
    
    return ContatoResponse(
        id=str(session.id),
        nome=nome,
        telefone=session.phone_number,
        email=None,  # Not collected in current flow
        status=status,
        origem='whatsapp',
        areaInteresse=area_interesse,
        tipoSolicitacao='consulta',  # Default for WhatsApp contacts
        preferenciaAtendimento=preferencia_atendimento,
        primeiroContato=session.created_at,
        ultimaInteracao=session.updated_at,
        mensagensNaoLidas=unread_count,
        dadosColetados={
            'clienteType': state.client_type if state else None,
            'practiceArea': state.practice_area if state else None,
            'schedulingPreference': state.scheduling_preference if state else None,
            'wantsScheduling': state.wants_scheduling if state else None,
            'customRequests': state.custom_requests if state else []
        },
        conversaCompleta=state.flow_completed if state else False,
        atendente=None  # Not implemented yet
    )


@router.get("", response_model=PaginatedContatosResponse)
async def get_contatos(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None),
    origem: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get paginated list of contatos with optional filtering."""
    try:
        # Base query
        query = db.query(UserSession).order_by(desc(UserSession.updated_at))
        
        # Apply filters
        if search:
            # Search in phone number or collected contact name
            query = query.filter(
                UserSession.phone_number.contains(search)
            )
        
        # Calculate pagination
        offset = (page - 1) * limit
        total = query.count()
        sessions = query.offset(offset).limit(limit).all()
        
        # Convert to contatos
        contatos = [session_to_contato(session) for session in sessions]
        
        return PaginatedContatosResponse(
            data=contatos,
            total=total,
            page=page,
            limit=limit,
            pages=(total + limit - 1) // limit
        )
        
    except Exception as e:
        logger.error(f"Error fetching contatos: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{contato_id}", response_model=ContatoResponse)
async def get_contato(contato_id: str, db: Session = Depends(get_db)):
    """Get specific contato by ID."""
    try:
        session = db.query(UserSession).filter(UserSession.id == contato_id).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Contato not found")
        
        return session_to_contato(session)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching contato {contato_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{contato_id}/messages", response_model=List[ConversaMessageResponse])
async def get_contato_messages(contato_id: str, db: Session = Depends(get_db)):
    """Get conversation messages for a specific contato."""
    try:
        session = db.query(UserSession).filter(UserSession.id == contato_id).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Contato not found")
        
        messages = db.query(MessageHistory).filter(
            MessageHistory.session_id == contato_id
        ).order_by(MessageHistory.timestamp).all()
        
        return [
            ConversaMessageResponse(
                id=str(msg.id),
                contatoId=contato_id,
                direction=msg.direction,
                content=msg.content,
                messageType=msg.message_type or 'text',
                timestamp=msg.timestamp,
                metadata=msg.message_metadata
            )
            for msg in messages
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching messages for contato {contato_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("", response_model=ContatoResponse)
async def create_contato(contato: ContatoCreate, db: Session = Depends(get_db)):
    """Create a new contato manually."""
    try:
        # Create new user session for manual contact
        session = UserSession(
            phone_number=contato.telefone,
            current_step='manual_created',
            collected_data={
                'contact_name': contato.nome,
                'manual_creation': True
            },
            is_active=True
        )
        
        db.add(session)
        db.flush()  # Get the ID
        
        # Create conversation state if area of interest is provided
        if contato.areaInteresse:
            state = ConversationState(
                session_id=session.id,
                practice_area=contato.areaInteresse,
                scheduling_preference=contato.preferenciaAtendimento,
                client_type='new',  # Default for manual creation
                flow_completed=False
            )
            db.add(state)
        
        db.commit()
        
        return session_to_contato(session)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating contato: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{contato_id}", response_model=ContatoResponse)
async def update_contato(contato_id: str, contato: ContatoUpdate, db: Session = Depends(get_db)):
    """Update an existing contato."""
    try:
        session = db.query(UserSession).filter(UserSession.id == contato_id).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Contato not found")
        
        # Update collected data
        collected_data = session.collected_data or {}
        if contato.nome:
            collected_data['contact_name'] = contato.nome
        
        session.collected_data = collected_data
        
        # Update conversation state if it exists
        if session.conversation_state:
            if contato.areaInteresse:
                session.conversation_state.practice_area = contato.areaInteresse
            if contato.preferenciaAtendimento:
                session.conversation_state.scheduling_preference = contato.preferenciaAtendimento
        
        db.commit()
        
        return session_to_contato(session)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating contato {contato_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")