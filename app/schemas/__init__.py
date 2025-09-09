"""
Pydantic schemas for API endpoints.
"""

from .contatos import *
from .processos import *
from .dashboard import *

__all__ = [
    # Contatos schemas
    'ContatoBase',
    'ContatoCreate', 
    'ContatoUpdate',
    'ContatoResponse',
    'ConversaMessageResponse',
    'PaginatedContatosResponse',
    
    # Processos schemas
    'ProcessoBase',
    'ProcessoCreate',
    'ProcessoUpdate', 
    'ProcessoResponse',
    'ContatoInfo',
    'ProcessoDocumento',
    'ProcessoHistorico',
    'PaginatedProcessosResponse',
    
    # Dashboard schemas
    'DashboardMetricsResponse',
    'ChartDataPoint',
    'ActivityItem'
]