"""
Scheduling service for managing appointment requests and data collection.
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum

from app.models.conversation import ConversationState, UserSession

logger = logging.getLogger(__name__)


class SchedulingType(Enum):
    """Scheduling type options."""
    PRESENCIAL = "type_presencial"
    ONLINE = "type_online"


class PracticeArea(Enum):
    """Practice area options."""
    CIVIL = "area_civil"
    TRABALHISTA = "area_trabalhista"
    CRIMINAL = "area_criminal"
    FAMILIA = "area_familia"
    EMPRESARIAL = "area_empresarial"
    OUTROS = "area_outros"


@dataclass
class SchedulingRequest:
    """Structured scheduling request data."""
    session_id: str
    phone_number: str
    client_type: str  # 'client_new' or 'client_existing'
    practice_area: str
    scheduling_type: str  # 'type_presencial' or 'type_online'
    wants_scheduling: bool
    created_at: datetime
    additional_info: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "session_id": self.session_id,
            "phone_number": self.phone_number,
            "client_type": self.client_type,
            "practice_area": self.practice_area,
            "scheduling_type": self.scheduling_type,
            "wants_scheduling": self.wants_scheduling,
            "created_at": self.created_at.isoformat(),
            "additional_info": self.additional_info or {}
        }


@dataclass
class InformationRequest:
    """Structured information-only request data."""
    session_id: str
    phone_number: str
    client_type: str
    practice_area: str
    wants_scheduling: bool
    created_at: datetime
    additional_info: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "session_id": self.session_id,
            "phone_number": self.phone_number,
            "client_type": self.client_type,
            "practice_area": self.practice_area,
            "wants_scheduling": self.wants_scheduling,
            "created_at": self.created_at.isoformat(),
            "additional_info": self.additional_info or {}
        }


@dataclass
class HandoffData:
    """Complete handoff data for human agents."""
    session_summary: Dict[str, Any]
    request_data: Dict[str, Any]
    conversation_history: List[Dict[str, Any]]
    analytics_summary: Dict[str, Any]
    handoff_reason: str
    created_at: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "session_summary": self.session_summary,
            "request_data": self.request_data,
            "conversation_history": self.conversation_history,
            "analytics_summary": self.analytics_summary,
            "handoff_reason": self.handoff_reason,
            "created_at": self.created_at.isoformat()
        }


class SchedulingService:
    """Service for managing scheduling requests and data collection."""
    
    def __init__(self):
        self.practice_area_names = {
            PracticeArea.CIVIL.value: "Direito Civil",
            PracticeArea.TRABALHISTA.value: "Direito Trabalhista",
            PracticeArea.CRIMINAL.value: "Direito Criminal",
            PracticeArea.FAMILIA.value: "Direito de Família",
            PracticeArea.EMPRESARIAL.value: "Direito Empresarial",
            PracticeArea.OUTROS.value: "Outras Áreas Jurídicas"
        }
        
        self.scheduling_type_names = {
            SchedulingType.PRESENCIAL.value: "Presencial",
            SchedulingType.ONLINE.value: "Online"
        }
        
        self.client_type_names = {
            "client_new": "Cliente Novo",
            "client_existing": "Cliente Existente"
        }
    
    def validate_scheduling_data(self, conversation_state: ConversationState) -> Dict[str, Any]:
        """Validate collected scheduling data."""
        validation_result = {
            "is_valid": True,
            "missing_fields": [],
            "invalid_fields": [],
            "warnings": []
        }
        
        # Check required fields
        if not conversation_state.client_type:
            validation_result["missing_fields"].append("client_type")
            validation_result["is_valid"] = False
        
        if not conversation_state.practice_area:
            validation_result["missing_fields"].append("practice_area")
            validation_result["is_valid"] = False
        
        if conversation_state.wants_scheduling is None:
            validation_result["missing_fields"].append("wants_scheduling")
            validation_result["is_valid"] = False
        
        # If wants scheduling, check scheduling preference
        if conversation_state.wants_scheduling and not conversation_state.scheduling_preference:
            validation_result["missing_fields"].append("scheduling_preference")
            validation_result["is_valid"] = False
        
        # Validate field values
        if conversation_state.client_type and conversation_state.client_type not in self.client_type_names:
            validation_result["invalid_fields"].append("client_type")
            validation_result["is_valid"] = False
        
        if conversation_state.practice_area and conversation_state.practice_area not in self.practice_area_names:
            validation_result["invalid_fields"].append("practice_area")
            validation_result["is_valid"] = False
        
        if (conversation_state.scheduling_preference and 
            conversation_state.scheduling_preference not in self.scheduling_type_names):
            validation_result["invalid_fields"].append("scheduling_preference")
            validation_result["is_valid"] = False
        
        return validation_result
    
    def create_scheduling_request(
        self, 
        session: UserSession, 
        conversation_state: ConversationState
    ) -> SchedulingRequest:
        """Create a structured scheduling request."""
        if not conversation_state.wants_scheduling:
            raise ValueError("Cannot create scheduling request when wants_scheduling is False")
        
        validation = self.validate_scheduling_data(conversation_state)
        if not validation["is_valid"]:
            raise ValueError(f"Invalid scheduling data: {validation}")
        
        return SchedulingRequest(
            session_id=str(session.id),
            phone_number=session.phone_number,
            client_type=conversation_state.client_type,
            practice_area=conversation_state.practice_area,
            scheduling_type=conversation_state.scheduling_preference,
            wants_scheduling=conversation_state.wants_scheduling,
            created_at=datetime.utcnow(),
            additional_info={
                "custom_requests": conversation_state.custom_requests or [],
                "session_created_at": session.created_at.isoformat(),
                "flow_completed": conversation_state.flow_completed
            }
        )
    
    def create_information_request(
        self, 
        session: UserSession, 
        conversation_state: ConversationState
    ) -> InformationRequest:
        """Create a structured information-only request."""
        if conversation_state.wants_scheduling:
            raise ValueError("Cannot create information request when wants_scheduling is True")
        
        return InformationRequest(
            session_id=str(session.id),
            phone_number=session.phone_number,
            client_type=conversation_state.client_type or "unknown",
            practice_area=conversation_state.practice_area or "area_outros",
            wants_scheduling=conversation_state.wants_scheduling,
            created_at=datetime.utcnow(),
            additional_info={
                "custom_requests": conversation_state.custom_requests or [],
                "session_created_at": session.created_at.isoformat(),
                "flow_completed": conversation_state.flow_completed
            }
        )
    
    def format_scheduling_confirmation(
        self, 
        scheduling_request: SchedulingRequest
    ) -> str:
        """Format scheduling confirmation message."""
        practice_area_name = self.practice_area_names.get(
            scheduling_request.practice_area, 
            "área selecionada"
        )
        
        scheduling_type_name = self.scheduling_type_names.get(
            scheduling_request.scheduling_type,
            "modalidade selecionada"
        )
        
        return (
            f"✅ Solicitação de agendamento {scheduling_type_name.upper()} registrada!\n\n"
            f"📋 Resumo da sua solicitação:\n"
            f"• Área: {practice_area_name}\n"
            f"• Modalidade: {scheduling_type_name}\n"
            f"• WhatsApp: {scheduling_request.phone_number}\n\n"
            f"Nossa equipe de recepção entrará em contato em breve para confirmar "
            f"data e horário disponível.\n\n"
            f"Obrigado por escolher a Advocacia Direta!"
        )
    
    def format_information_confirmation(
        self, 
        information_request: InformationRequest
    ) -> str:
        """Format information-only confirmation message."""
        practice_area_name = self.practice_area_names.get(
            information_request.practice_area,
            "área selecionada"
        )
        
        return (
            f"📋 Solicitação de informações registrada!\n\n"
            f"• Área: {practice_area_name}\n"
            f"• WhatsApp: {information_request.phone_number}\n\n"
            f"Nossa equipe especializada em {practice_area_name} entrará em contato "
            f"para fornecer as informações que você precisa.\n\n"
            f"Obrigado por escolher a Advocacia Direta!"
        )
    
    def create_handoff_data(
        self,
        session: UserSession,
        conversation_state: ConversationState,
        conversation_history: List[Dict[str, Any]],
        handoff_reason: str = "flow_completed"
    ) -> HandoffData:
        """Create complete handoff data for human agents."""
        
        # Determine request type and create appropriate request object
        if conversation_state.wants_scheduling:
            request_data = self.create_scheduling_request(session, conversation_state).to_dict()
            request_type = "scheduling"
        else:
            request_data = self.create_information_request(session, conversation_state).to_dict()
            request_type = "information_only"
        
        # Create session summary
        session_summary = {
            "session_id": str(session.id),
            "phone_number": session.phone_number,
            "client_type_display": self.client_type_names.get(
                conversation_state.client_type, 
                "Não informado"
            ),
            "practice_area_display": self.practice_area_names.get(
                conversation_state.practice_area,
                "Não informado"
            ),
            "request_type": request_type,
            "flow_completed": conversation_state.flow_completed,
            "session_duration_minutes": self._calculate_session_duration(session),
            "created_at": session.created_at.isoformat(),
            "last_activity": session.updated_at.isoformat()
        }
        
        # Add scheduling details if applicable
        if conversation_state.wants_scheduling and conversation_state.scheduling_preference:
            session_summary["scheduling_type_display"] = self.scheduling_type_names.get(
                conversation_state.scheduling_preference,
                "Não informado"
            )
        
        # Create analytics summary
        analytics_summary = {
            "total_messages": len(conversation_history),
            "inbound_messages": len([m for m in conversation_history if m.get("direction") == "inbound"]),
            "outbound_messages": len([m for m in conversation_history if m.get("direction") == "outbound"]),
            "flow_completion_rate": 1.0 if conversation_state.flow_completed else 0.0,
            "handoff_reason": handoff_reason
        }
        
        return HandoffData(
            session_summary=session_summary,
            request_data=request_data,
            conversation_history=conversation_history,
            analytics_summary=analytics_summary,
            handoff_reason=handoff_reason,
            created_at=datetime.utcnow()
        )
    
    def _calculate_session_duration(self, session: UserSession) -> float:
        """Calculate session duration in minutes."""
        if not session.created_at or not session.updated_at:
            return 0.0
        
        duration = session.updated_at - session.created_at
        return duration.total_seconds() / 60.0
    
    def format_handoff_summary_for_agents(self, handoff_data: HandoffData) -> str:
        """Format handoff summary for human agents."""
        summary_parts = [
            "📋 RESUMO DA CONVERSA AUTOMATIZADA",
            "=" * 40
        ]
        
        session = handoff_data.session_summary
        request = handoff_data.request_data
        analytics = handoff_data.analytics_summary
        
        # Basic info
        summary_parts.extend([
            f"📱 WhatsApp: {session['phone_number']}",
            f"👤 Tipo: {session['client_type_display']}",
            f"⚖️ Área: {session['practice_area_display']}",
            f"📋 Solicitação: {session['request_type'].replace('_', ' ').title()}"
        ])
        
        # Scheduling details if applicable
        if session.get("scheduling_type_display"):
            summary_parts.append(f"📍 Modalidade: {session['scheduling_type_display']}")
        
        # Session metrics
        summary_parts.extend([
            "",
            "📊 MÉTRICAS DA SESSÃO",
            "-" * 20,
            f"⏱️ Duração: {session['session_duration_minutes']:.1f} minutos",
            f"💬 Total de mensagens: {analytics['total_messages']}",
            f"✅ Fluxo completo: {'Sim' if session['flow_completed'] else 'Não'}",
            f"🔄 Motivo do handoff: {analytics['handoff_reason'].replace('_', ' ').title()}"
        ])
        
        # Additional info if available
        if request.get("additional_info", {}).get("custom_requests"):
            custom_requests = request["additional_info"]["custom_requests"]
            if custom_requests:
                summary_parts.extend([
                    "",
                    "📝 SOLICITAÇÕES ADICIONAIS",
                    "-" * 25
                ])
                for i, req in enumerate(custom_requests, 1):
                    summary_parts.append(f"{i}. {req}")
        
        # Timestamps
        summary_parts.extend([
            "",
            "🕐 TIMESTAMPS",
            "-" * 12,
            f"Início: {session['created_at']}",
            f"Última atividade: {session['last_activity']}",
            f"Handoff: {handoff_data.created_at.isoformat()}"
        ])
        
        return "\n".join(summary_parts)
    
    def validate_phone_number(self, phone_number: str) -> Dict[str, Any]:
        """Validate and format phone number."""
        # Remove any non-digit characters
        clean_number = ''.join(filter(str.isdigit, phone_number))
        
        validation_result = {
            "is_valid": False,
            "formatted_number": None,
            "errors": []
        }
        
        # Check minimum length
        if len(clean_number) < 10:
            validation_result["errors"].append("Número muito curto")
            return validation_result
        
        # Check maximum length
        if len(clean_number) > 15:
            validation_result["errors"].append("Número muito longo")
            return validation_result
        
        # Format for Brazil (add country code if needed)
        if len(clean_number) == 11 and not clean_number.startswith('55'):
            clean_number = '55' + clean_number
        elif len(clean_number) == 10 and not clean_number.startswith('55'):
            clean_number = '55' + clean_number
        
        validation_result["is_valid"] = True
        validation_result["formatted_number"] = clean_number
        
        return validation_result
    
    def get_practice_area_display_name(self, practice_area_id: str) -> str:
        """Get display name for practice area."""
        return self.practice_area_names.get(practice_area_id, "Área não especificada")
    
    def get_scheduling_type_display_name(self, scheduling_type_id: str) -> str:
        """Get display name for scheduling type."""
        return self.scheduling_type_names.get(scheduling_type_id, "Modalidade não especificada")
    
    def get_client_type_display_name(self, client_type_id: str) -> str:
        """Get display name for client type."""
        return self.client_type_names.get(client_type_id, "Tipo não especificado")


# Factory function for dependency injection
def get_scheduling_service() -> SchedulingService:
    """Get SchedulingService instance."""
    return SchedulingService()