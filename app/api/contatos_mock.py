"""
Mock Contatos API endpoints for testing without database.
"""

import logging
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query
from uuid import uuid4

from app.schemas.contatos import (
    ContatoResponse, 
    ContatoCreate, 
    ContatoUpdate,
    ConversaMessageResponse,
    PaginatedContatosResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Mock data storage
mock_contatos = []
mock_messages = []

# Initialize with some sample data
def init_mock_data():
    """Initialize mock data for testing."""
    global mock_contatos, mock_messages
    
    if not mock_contatos:
        # Sample contatos
        mock_contatos.extend([
            ContatoResponse(
                id=str(uuid4()),
                nome="João Silva",
                telefone="5573999887766",
                status="novo",
                origem="whatsapp",
                areaInteresse="Direito Civil",
                tipoSolicitacao="consulta",
                preferenciaAtendimento="presencial",
                primeiroContato=datetime.now() - timedelta(hours=2),
                ultimaInteracao=datetime.now() - timedelta(minutes=30),
                mensagensNaoLidas=2,
                dadosColetados={
                    "clienteType": "novo",
                    "practiceArea": "Direito Civil",
                    "schedulingPreference": "presencial",
                    "wantsScheduling": True,
                    "customRequests": ["Preciso de ajuda com contrato"]
                },
                conversaCompleta=False
            ),
            ContatoResponse(
                id=str(uuid4()),
                nome="Maria Santos",
                telefone="5573988776655",
                status="finalizado",
                origem="whatsapp",
                areaInteresse="Direito Trabalhista",
                tipoSolicitacao="agendamento",
                preferenciaAtendimento="online",
                primeiroContato=datetime.now() - timedelta(days=1),
                ultimaInteracao=datetime.now() - timedelta(hours=1),
                mensagensNaoLidas=0,
                dadosColetados={
                    "clienteType": "existente",
                    "practiceArea": "Direito Trabalhista",
                    "schedulingPreference": "online",
                    "wantsScheduling": True,
                    "customRequests": []
                },
                conversaCompleta=True
            )
        ])

init_mock_data()


@router.get("", response_model=PaginatedContatosResponse)
async def get_contatos(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None),
    origem: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """Get paginated list of contatos with optional filtering."""
    try:
        # Filter contatos
        filtered_contatos = mock_contatos.copy()
        
        if status:
            filtered_contatos = [c for c in filtered_contatos if c.status == status]
        
        if origem:
            filtered_contatos = [c for c in filtered_contatos if c.origem == origem]
        
        if search:
            filtered_contatos = [
                c for c in filtered_contatos 
                if search.lower() in c.nome.lower() or search in c.telefone
            ]
        
        # Pagination
        total = len(filtered_contatos)
        start = (page - 1) * limit
        end = start + limit
        paginated_contatos = filtered_contatos[start:end]
        
        return PaginatedContatosResponse(
            data=paginated_contatos,
            total=total,
            page=page,
            limit=limit,
            pages=(total + limit - 1) // limit if total > 0 else 0
        )
        
    except Exception as e:
        logger.error(f"Error fetching contatos: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{contato_id}", response_model=ContatoResponse)
async def get_contato(contato_id: str):
    """Get specific contato by ID."""
    try:
        contato = next((c for c in mock_contatos if c.id == contato_id), None)
        
        if not contato:
            raise HTTPException(status_code=404, detail="Contato not found")
        
        return contato
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching contato {contato_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{contato_id}/messages", response_model=List[ConversaMessageResponse])
async def get_contato_messages(contato_id: str):
    """Get conversation messages for a specific contato."""
    try:
        # Check if contato exists
        contato = next((c for c in mock_contatos if c.id == contato_id), None)
        if not contato:
            raise HTTPException(status_code=404, detail="Contato not found")
        
        # Return sample messages
        sample_messages = [
            ConversaMessageResponse(
                id=str(uuid4()),
                contatoId=contato_id,
                direction="inbound",
                content="Olá, preciso de ajuda jurídica",
                messageType="text",
                timestamp=datetime.now() - timedelta(hours=1),
                metadata={}
            ),
            ConversaMessageResponse(
                id=str(uuid4()),
                contatoId=contato_id,
                direction="outbound",
                content="Olá! Sou o assistente virtual da Advocacia Direta. Como posso ajudá-lo?",
                messageType="text",
                timestamp=datetime.now() - timedelta(minutes=59),
                metadata={}
            )
        ]
        
        return sample_messages
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching messages for contato {contato_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("", response_model=ContatoResponse)
async def create_contato(contato: ContatoCreate):
    """Create a new contato manually."""
    try:
        new_contato = ContatoResponse(
            id=str(uuid4()),
            nome=contato.nome,
            telefone=contato.telefone,
            email=contato.email,
            status="novo",
            origem="manual",
            areaInteresse=contato.areaInteresse,
            tipoSolicitacao="consulta",
            preferenciaAtendimento=contato.preferenciaAtendimento,
            primeiroContato=datetime.now(),
            ultimaInteracao=datetime.now(),
            mensagensNaoLidas=0,
            dadosColetados={
                "clienteType": "novo",
                "practiceArea": contato.areaInteresse,
                "schedulingPreference": contato.preferenciaAtendimento,
                "wantsScheduling": False,
                "customRequests": []
            },
            conversaCompleta=False
        )
        
        mock_contatos.append(new_contato)
        
        return new_contato
        
    except Exception as e:
        logger.error(f"Error creating contato: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{contato_id}", response_model=ContatoResponse)
async def update_contato(contato_id: str, contato: ContatoUpdate):
    """Update an existing contato."""
    try:
        # Find contato
        existing_contato = next((c for c in mock_contatos if c.id == contato_id), None)
        
        if not existing_contato:
            raise HTTPException(status_code=404, detail="Contato not found")
        
        # Update fields
        if contato.nome:
            existing_contato.nome = contato.nome
        if contato.telefone:
            existing_contato.telefone = contato.telefone
        if contato.email:
            existing_contato.email = contato.email
        if contato.areaInteresse:
            existing_contato.areaInteresse = contato.areaInteresse
        if contato.preferenciaAtendimento:
            existing_contato.preferenciaAtendimento = contato.preferenciaAtendimento
        
        existing_contato.ultimaInteracao = datetime.now()
        
        return existing_contato
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating contato {contato_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")