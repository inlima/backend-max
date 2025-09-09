"""
Mock Dashboard API endpoints for testing without database.
"""

import logging
from typing import List
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query
from uuid import uuid4

from app.schemas.dashboard import (
    DashboardMetricsResponse,
    ChartDataPoint,
    ActivityItem
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/metrics", response_model=DashboardMetricsResponse)
async def get_dashboard_metrics():
    """Get dashboard metrics for the overview cards."""
    try:
        # Mock metrics data
        return DashboardMetricsResponse(
            totalContatos=47,
            contatosHoje=8,
            processosAtivos=12,
            taxaResposta=85.2,
            tempoMedioResposta="< 2 min",
            satisfacaoCliente=4.3
        )
        
    except Exception as e:
        logger.error(f"Error fetching dashboard metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/chart-data", response_model=List[ChartDataPoint])
async def get_chart_data(days: int = Query(30, ge=1, le=365)):
    """Get chart data for the dashboard graphs."""
    try:
        # Generate mock chart data for the specified number of days
        chart_data = []
        base_date = datetime.now().date()
        
        for i in range(days):
            date = base_date - timedelta(days=days-1-i)
            
            # Generate realistic mock data with some variation
            day_of_week = date.weekday()
            is_weekend = day_of_week >= 5
            
            # Lower activity on weekends
            base_contatos = 3 if is_weekend else 8
            base_processos = 1 if is_weekend else 3
            
            # Add some randomness
            import random
            contatos = max(0, base_contatos + random.randint(-2, 4))
            processos = max(0, base_processos + random.randint(-1, 2))
            
            chart_data.append(ChartDataPoint(
                date=date.strftime('%Y-%m-%d'),
                contatos=contatos,
                processos=processos,
                conversas=contatos  # Same as contatos for simplicity
            ))
        
        return chart_data
        
    except Exception as e:
        logger.error(f"Error fetching chart data: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/recent-activity", response_model=List[ActivityItem])
async def get_recent_activity(limit: int = Query(10, ge=1, le=50)):
    """Get recent activity for the dashboard table."""
    try:
        # Mock recent activity data
        activities = [
            ActivityItem(
                id=str(uuid4()),
                tipo="Contato",
                descricao="Nova conversa iniciada via WhatsApp",
                contato="João Silva",
                telefone="5573999887766",
                timestamp=datetime.now() - timedelta(minutes=15)
            ),
            ActivityItem(
                id=str(uuid4()),
                tipo="Processo",
                descricao="Interesse em Direito Trabalhista",
                contato="Maria Santos",
                telefone="5573988776655",
                timestamp=datetime.now() - timedelta(minutes=32)
            ),
            ActivityItem(
                id=str(uuid4()),
                tipo="Contato",
                descricao="Mensagem: Preciso de ajuda com contrato...",
                contato="Pedro Costa",
                telefone="5573977665544",
                timestamp=datetime.now() - timedelta(hours=1, minutes=5)
            ),
            ActivityItem(
                id=str(uuid4()),
                tipo="Processo",
                descricao="Interesse em Direito Civil",
                contato="Ana Oliveira",
                telefone="5573966554433",
                timestamp=datetime.now() - timedelta(hours=2, minutes=20)
            ),
            ActivityItem(
                id=str(uuid4()),
                tipo="Contato",
                descricao="Conversa finalizada com sucesso",
                contato="Carlos Lima",
                telefone="5573955443322",
                timestamp=datetime.now() - timedelta(hours=3, minutes=45)
            )
        ]
        
        # Return only the requested number of activities
        return activities[:limit]
        
    except Exception as e:
        logger.error(f"Error fetching recent activity: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")