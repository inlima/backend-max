"""
Dashboard API endpoints for frontend integration.
"""

import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.core.database import get_db
from app.models.conversation import UserSession, ConversationState, MessageHistory, AnalyticsEvent
from app.schemas.dashboard import (
    DashboardMetricsResponse,
    ChartDataPoint,
    ActivityItem
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/metrics", response_model=DashboardMetricsResponse)
async def get_dashboard_metrics(db: Session = Depends(get_db)):
    """Get dashboard metrics for the overview cards."""
    try:
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Total contacts
        total_contatos = db.query(UserSession).count()
        
        # Contacts today
        contatos_hoje = db.query(UserSession).filter(
            UserSession.created_at >= today_start
        ).count()
        
        # Active processes (sessions with practice areas)
        processos_ativos = db.query(UserSession).join(ConversationState).filter(
            ConversationState.practice_area.isnot(None),
            ConversationState.flow_completed == False
        ).count()
        
        # Response rate calculation (completed flows vs total flows)
        total_flows = db.query(ConversationState).count()
        completed_flows = db.query(ConversationState).filter(
            ConversationState.flow_completed == True
        ).count()
        
        taxa_resposta = (completed_flows / total_flows * 100) if total_flows > 0 else 0
        
        # Average response time (simplified - time between user message and bot response)
        avg_response_time = "< 1 min"  # Simplified for MVP
        
        # Customer satisfaction (simplified - based on completed flows)
        satisfacao_cliente = 4.2  # Simplified for MVP
        
        return DashboardMetricsResponse(
            totalContatos=total_contatos,
            contatosHoje=contatos_hoje,
            processosAtivos=processos_ativos,
            taxaResposta=round(taxa_resposta, 1),
            tempoMedioResposta=avg_response_time,
            satisfacaoCliente=satisfacao_cliente
        )
        
    except Exception as e:
        logger.error(f"Error fetching dashboard metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/chart-data", response_model=List[ChartDataPoint])
async def get_chart_data(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
    """Get chart data for the dashboard graphs."""
    try:
        end_date = datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=999999)
        start_date = end_date - timedelta(days=days-1)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Query daily contact counts
        daily_contacts = db.query(
            func.date(UserSession.created_at).label('date'),
            func.count(UserSession.id).label('contatos')
        ).filter(
            UserSession.created_at >= start_date,
            UserSession.created_at <= end_date
        ).group_by(func.date(UserSession.created_at)).all()
        
        # Query daily process counts
        daily_processes = db.query(
            func.date(UserSession.created_at).label('date'),
            func.count(UserSession.id).label('processos')
        ).join(ConversationState).filter(
            UserSession.created_at >= start_date,
            UserSession.created_at <= end_date,
            ConversationState.practice_area.isnot(None)
        ).group_by(func.date(UserSession.created_at)).all()
        
        # Create a complete date range
        chart_data = []
        current_date = start_date.date()
        
        # Convert query results to dictionaries for easier lookup
        contacts_dict = {row.date: row.contatos for row in daily_contacts}
        processes_dict = {row.date: row.processos for row in daily_processes}
        
        for i in range(days):
            date_key = current_date + timedelta(days=i)
            
            chart_data.append(ChartDataPoint(
                date=date_key.strftime('%Y-%m-%d'),
                contatos=contacts_dict.get(date_key, 0),
                processos=processes_dict.get(date_key, 0),
                conversas=contacts_dict.get(date_key, 0)  # Same as contacts for now
            ))
        
        return chart_data
        
    except Exception as e:
        logger.error(f"Error fetching chart data: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/recent-activity", response_model=List[ActivityItem])
async def get_recent_activity(limit: int = Query(10, ge=1, le=50), db: Session = Depends(get_db)):
    """Get recent activity for the dashboard table."""
    try:
        # Get recent sessions with their latest messages
        recent_sessions = db.query(UserSession).order_by(
            desc(UserSession.updated_at)
        ).limit(limit).all()
        
        activities = []
        
        for session in recent_sessions:
            collected_data = session.collected_data or {}
            nome_contato = collected_data.get('contact_name') or f"Contato {session.phone_number[-4:]}"
            
            # Determine activity type
            if session.conversation_state and session.conversation_state.practice_area:
                tipo = "Processo"
                descricao = f"Interesse em {session.conversation_state.practice_area}"
            else:
                tipo = "Contato"
                descricao = "Nova conversa iniciada"
            
            # Get latest message for context
            latest_message = db.query(MessageHistory).filter(
                MessageHistory.session_id == session.id
            ).order_by(desc(MessageHistory.timestamp)).first()
            
            if latest_message and latest_message.direction == 'inbound':
                descricao = f"Mensagem: {latest_message.content[:50]}..."
            
            activities.append(ActivityItem(
                id=str(session.id),
                tipo=tipo,
                descricao=descricao,
                contato=nome_contato,
                telefone=session.phone_number,
                timestamp=session.updated_at
            ))
        
        return activities
        
    except Exception as e:
        logger.error(f"Error fetching recent activity: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")