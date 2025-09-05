"""
Handoff service for managing human transfer and data compilation.
"""

import logging
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum

from app.models.conversation import UserSession, ConversationState, MessageHistory

logger = logging.getLogger(__name__)


class HandoffReason(Enum):
    """Reasons for handoff to human agents."""
    FLOW_COMPLETED = "flow_completed"
    ESCAPE_COMMAND = "escape_command"
    ERROR_FALLBACK = "error_fallback"
    TIMEOUT = "timeout"
    SYSTEM_ERROR = "system_error"


class ClientType(Enum):
    """Client type classifications."""
    NEW = "client_new"
    EXISTING = "client_existing"
    UNKNOWN = "unknown"


class PracticeArea(Enum):
    """Practice area classifications."""
    CIVIL = "area_civil"
    TRABALHISTA = "area_trabalhista"
    CRIMINAL = "area_criminal"
    FAMILIA = "area_familia"
    EMPRESARIAL = "area_empresarial"
    OUTROS = "area_outros"
    UNKNOWN = "unknown"


class SchedulingPreference(Enum):
    """Scheduling preference types."""
    PRESENCIAL = "type_presencial"
    ONLINE = "type_online"
    NONE = "none"


@dataclass
class HandoffData:
    """Complete handoff data structure for human agents."""
    
    # Session information
    session_id: str
    phone_number: str
    created_at: str
    handoff_time: str
    handoff_reason: str
    
    # Client information
    client_type: str
    practice_area: str
    wants_scheduling: bool
    scheduling_preference: str
    
    # Conversation metadata
    flow_completed: bool
    current_step: str
    message_count: int
    conversation_duration_minutes: float
    
    # Conversation history
    conversation_summary: str
    key_interactions: List[Dict[str, Any]]
    custom_requests: List[str]
    
    # System metadata
    handoff_id: str
    priority_level: str
    tags: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format."""
        return asdict(self)
    
    def to_crm_format(self) -> Dict[str, Any]:
        """Convert to CRM-compatible format."""
        return {
            "contact_id": self.phone_number,
            "handoff_id": self.handoff_id,
            "client_type": self._translate_client_type(),
            "practice_area": self._translate_practice_area(),
            "scheduling_request": {
                "wants_scheduling": self.wants_scheduling,
                "preference": self._translate_scheduling_preference(),
                "priority": self.priority_level
            },
            "conversation_data": {
                "summary": self.conversation_summary,
                "duration_minutes": self.conversation_duration_minutes,
                "message_count": self.message_count,
                "completed": self.flow_completed
            },
            "handoff_metadata": {
                "reason": self.handoff_reason,
                "timestamp": self.handoff_time,
                "tags": self.tags
            },
            "custom_requests": self.custom_requests
        }
    
    def _translate_client_type(self) -> str:
        """Translate client type to human-readable format."""
        translations = {
            ClientType.NEW.value: "Cliente Novo",
            ClientType.EXISTING.value: "Cliente Existente",
            ClientType.UNKNOWN.value: "Não Identificado"
        }
        return translations.get(self.client_type, "Não Identificado")
    
    def _translate_practice_area(self) -> str:
        """Translate practice area to human-readable format."""
        translations = {
            PracticeArea.CIVIL.value: "Direito Civil",
            PracticeArea.TRABALHISTA.value: "Direito Trabalhista",
            PracticeArea.CRIMINAL.value: "Direito Criminal",
            PracticeArea.FAMILIA.value: "Direito de Família",
            PracticeArea.EMPRESARIAL.value: "Direito Empresarial",
            PracticeArea.OUTROS.value: "Outras Áreas",
            PracticeArea.UNKNOWN.value: "Área Não Especificada"
        }
        return translations.get(self.practice_area, "Área Não Especificada")
    
    def _translate_scheduling_preference(self) -> str:
        """Translate scheduling preference to human-readable format."""
        translations = {
            SchedulingPreference.PRESENCIAL.value: "Presencial",
            SchedulingPreference.ONLINE.value: "Online",
            SchedulingPreference.NONE.value: "Não Solicitado"
        }
        return translations.get(self.scheduling_preference, "Não Especificado")


class HandoffService:
    """Service for managing handoff to human agents."""
    
    def __init__(self):
        self.handoff_templates = self._load_handoff_templates()
    
    def compile_conversation_data(
        self,
        session: UserSession,
        conversation_state: Optional[ConversationState],
        conversation_history: List[Dict[str, Any]],
        handoff_reason: str = HandoffReason.FLOW_COMPLETED.value
    ) -> HandoffData:
        """Compile complete conversation data for handoff."""
        
        # Calculate conversation duration
        duration_minutes = self._calculate_conversation_duration(session)
        
        # Extract key interactions
        key_interactions = self._extract_key_interactions(conversation_history)
        
        # Generate conversation summary
        conversation_summary = self._generate_conversation_summary(
            session, conversation_state, key_interactions
        )
        
        # Determine priority level
        priority_level = self._determine_priority_level(
            handoff_reason, conversation_state, duration_minutes
        )
        
        # Generate tags
        tags = self._generate_tags(session, conversation_state, handoff_reason)
        
        # Create handoff data
        handoff_data = HandoffData(
            session_id=str(session.id),
            phone_number=session.phone_number,
            created_at=session.created_at.isoformat(),
            handoff_time=datetime.utcnow().isoformat(),
            handoff_reason=handoff_reason,
            client_type=conversation_state.client_type if conversation_state else ClientType.UNKNOWN.value,
            practice_area=conversation_state.practice_area if conversation_state else PracticeArea.UNKNOWN.value,
            wants_scheduling=conversation_state.wants_scheduling if conversation_state else False,
            scheduling_preference=conversation_state.scheduling_preference if conversation_state else SchedulingPreference.NONE.value,
            flow_completed=conversation_state.flow_completed if conversation_state else False,
            current_step=session.current_step or "unknown",
            message_count=len(conversation_history),
            conversation_duration_minutes=duration_minutes,
            conversation_summary=conversation_summary,
            key_interactions=key_interactions,
            custom_requests=conversation_state.custom_requests if conversation_state and conversation_state.custom_requests else [],
            handoff_id=str(uuid.uuid4()),
            priority_level=priority_level,
            tags=tags
        )
        
        return handoff_data
    
    def format_summary_for_reception(self, handoff_data: HandoffData) -> str:
        """Format handoff summary for reception team."""
        
        template = self.handoff_templates["reception_summary"]
        
        # Format scheduling info
        scheduling_info = "Não solicitado"
        if handoff_data.wants_scheduling:
            pref = handoff_data._translate_scheduling_preference()
            scheduling_info = f"Solicitado - {pref}"
        
        # Format custom requests
        custom_requests_text = "Nenhuma"
        if handoff_data.custom_requests:
            custom_requests_text = "; ".join(handoff_data.custom_requests)
        
        # Format priority indicator
        priority_indicator = "🔴" if handoff_data.priority_level == "high" else "🟡" if handoff_data.priority_level == "medium" else "🟢"
        
        summary = template.format(
            priority_indicator=priority_indicator,
            phone_number=handoff_data.phone_number,
            client_type=handoff_data._translate_client_type(),
            practice_area=handoff_data._translate_practice_area(),
            scheduling_info=scheduling_info,
            conversation_summary=handoff_data.conversation_summary,
            duration_minutes=int(handoff_data.conversation_duration_minutes),
            message_count=handoff_data.message_count,
            handoff_reason=self._translate_handoff_reason(handoff_data.handoff_reason),
            custom_requests=custom_requests_text,
            handoff_id=handoff_data.handoff_id[:8],  # Short ID for display
            tags=" ".join([f"#{tag}" for tag in handoff_data.tags])
        )
        
        return summary
    
    def format_summary_for_crm(self, handoff_data: HandoffData) -> Dict[str, Any]:
        """Format handoff data for CRM integration."""
        return handoff_data.to_crm_format()
    
    def create_integration_payload(
        self, 
        handoff_data: HandoffData,
        platform: str = "generic"
    ) -> Dict[str, Any]:
        """Create integration payload for external platforms."""
        
        base_payload = {
            "handoff_id": handoff_data.handoff_id,
            "timestamp": handoff_data.handoff_time,
            "contact": {
                "phone": handoff_data.phone_number,
                "type": handoff_data._translate_client_type()
            },
            "request": {
                "area": handoff_data._translate_practice_area(),
                "scheduling": {
                    "requested": handoff_data.wants_scheduling,
                    "preference": handoff_data._translate_scheduling_preference()
                }
            },
            "conversation": {
                "summary": handoff_data.conversation_summary,
                "completed": handoff_data.flow_completed,
                "duration_minutes": handoff_data.conversation_duration_minutes,
                "message_count": handoff_data.message_count
            },
            "metadata": {
                "reason": handoff_data.handoff_reason,
                "priority": handoff_data.priority_level,
                "tags": handoff_data.tags
            }
        }
        
        # Platform-specific formatting
        if platform == "zapier":
            return self._format_for_zapier(base_payload)
        elif platform == "hubspot":
            return self._format_for_hubspot(base_payload)
        elif platform == "salesforce":
            return self._format_for_salesforce(base_payload)
        else:
            return base_payload
    
    def _calculate_conversation_duration(self, session: UserSession) -> float:
        """Calculate conversation duration in minutes."""
        if not session.updated_at or not session.created_at:
            return 0.0
        
        duration = session.updated_at - session.created_at
        return duration.total_seconds() / 60.0
    
    def _extract_key_interactions(self, conversation_history: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract key interactions from conversation history."""
        key_interactions = []
        
        for msg in conversation_history:
            # Include button clicks and important responses
            is_button = msg.get("message_type") == "button"
            is_interactive_outbound = (msg.get("direction") == "outbound" and 
                                     ("interactive" in msg.get("metadata", {}) or 
                                      msg.get("message_type") == "interactive"))
            
            if is_button or is_interactive_outbound:
                key_interactions.append({
                    "timestamp": msg.get("timestamp"),
                    "type": msg.get("message_type", "text"),
                    "content": msg.get("content", "")[:100],  # Truncate long messages
                    "direction": msg.get("direction"),
                    "metadata": msg.get("metadata", {})
                })
        
        # Limit to most recent 10 interactions
        return key_interactions[-10:]
    
    def _generate_conversation_summary(
        self,
        session: UserSession,
        conversation_state: Optional[ConversationState],
        key_interactions: List[Dict[str, Any]]
    ) -> str:
        """Generate human-readable conversation summary."""
        
        if not conversation_state:
            return "Cliente iniciou conversa mas não completou identificação."
        
        summary_parts = []
        
        # Client type
        if conversation_state.client_type:
            client_type_text = "Cliente novo" if conversation_state.client_type == ClientType.NEW.value else "Cliente existente"
            summary_parts.append(client_type_text)
        
        # Practice area
        if conversation_state.practice_area:
            area_text = conversation_state._translate_practice_area() if hasattr(conversation_state, '_translate_practice_area') else conversation_state.practice_area
            summary_parts.append(f"interessado em {area_text}")
        
        # Scheduling
        if conversation_state.wants_scheduling is not None:
            if conversation_state.wants_scheduling:
                pref_text = "presencial" if conversation_state.scheduling_preference == SchedulingPreference.PRESENCIAL.value else "online"
                summary_parts.append(f"solicitou agendamento {pref_text}")
            else:
                summary_parts.append("solicitou apenas informações")
        
        # Flow completion
        if conversation_state.flow_completed:
            summary_parts.append("completou o atendimento automatizado")
        else:
            summary_parts.append("não completou o fluxo")
        
        if summary_parts:
            return ". ".join(summary_parts).capitalize() + "."
        else:
            return "Cliente iniciou conversa mas não forneceu informações completas."
    
    def _determine_priority_level(
        self,
        handoff_reason: str,
        conversation_state: Optional[ConversationState],
        duration_minutes: float
    ) -> str:
        """Determine priority level for handoff."""
        
        # High priority conditions
        if handoff_reason == HandoffReason.ESCAPE_COMMAND.value:
            return "high"
        
        if handoff_reason == HandoffReason.SYSTEM_ERROR.value:
            return "high"
        
        if conversation_state and conversation_state.wants_scheduling:
            return "medium"
        
        # Long conversations get medium priority
        if duration_minutes > 10:
            return "medium"
        
        return "low"
    
    def _generate_tags(
        self,
        session: UserSession,
        conversation_state: Optional[ConversationState],
        handoff_reason: str
    ) -> List[str]:
        """Generate tags for categorization."""
        tags = []
        
        # Add reason tag
        tags.append(handoff_reason.replace("_", "-"))
        
        if conversation_state:
            # Add client type tag
            if conversation_state.client_type:
                tags.append(conversation_state.client_type.replace("_", "-"))
            
            # Add practice area tag
            if conversation_state.practice_area:
                area_tag = conversation_state.practice_area.replace("area_", "").replace("_", "-")
                tags.append(area_tag)
            
            # Add scheduling tag
            if conversation_state.wants_scheduling:
                tags.append("agendamento")
                if conversation_state.scheduling_preference:
                    pref_tag = conversation_state.scheduling_preference.replace("type_", "")
                    tags.append(pref_tag)
            else:
                tags.append("informacao")
        
        # Add time-based tags
        hour = datetime.utcnow().hour
        if 6 <= hour < 12:
            tags.append("manha")
        elif 12 <= hour < 18:
            tags.append("tarde")
        else:
            tags.append("noite")
        
        return tags
    
    def _translate_handoff_reason(self, reason: str) -> str:
        """Translate handoff reason to Portuguese."""
        translations = {
            HandoffReason.FLOW_COMPLETED.value: "Fluxo Completado",
            HandoffReason.ESCAPE_COMMAND.value: "Solicitação de Atendente",
            HandoffReason.ERROR_FALLBACK.value: "Erro no Sistema",
            HandoffReason.TIMEOUT.value: "Timeout de Sessão",
            HandoffReason.SYSTEM_ERROR.value: "Erro do Sistema"
        }
        return translations.get(reason, "Motivo Desconhecido")
    
    def _format_for_zapier(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Format payload for Zapier integration."""
        # Flatten structure for Zapier
        return {
            "handoff_id": payload["handoff_id"],
            "timestamp": payload["timestamp"],
            "phone": payload["contact"]["phone"],
            "client_type": payload["contact"]["type"],
            "practice_area": payload["request"]["area"],
            "wants_scheduling": payload["request"]["scheduling"]["requested"],
            "scheduling_preference": payload["request"]["scheduling"]["preference"],
            "conversation_summary": payload["conversation"]["summary"],
            "flow_completed": payload["conversation"]["completed"],
            "duration_minutes": payload["conversation"]["duration_minutes"],
            "message_count": payload["conversation"]["message_count"],
            "handoff_reason": payload["metadata"]["reason"],
            "priority": payload["metadata"]["priority"],
            "tags": ",".join(payload["metadata"]["tags"])
        }
    
    def _format_for_hubspot(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Format payload for HubSpot integration."""
        return {
            "properties": {
                "phone": payload["contact"]["phone"],
                "client_type": payload["contact"]["type"],
                "practice_area": payload["request"]["area"],
                "wants_scheduling": payload["request"]["scheduling"]["requested"],
                "scheduling_preference": payload["request"]["scheduling"]["preference"],
                "conversation_summary": payload["conversation"]["summary"],
                "handoff_reason": payload["metadata"]["reason"],
                "priority": payload["metadata"]["priority"],
                "whatsapp_handoff_id": payload["handoff_id"]
            },
            "associations": []
        }
    
    def _format_for_salesforce(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Format payload for Salesforce integration."""
        return {
            "Lead": {
                "Phone": payload["contact"]["phone"],
                "LeadSource": "WhatsApp Bot",
                "Status": "New",
                "Client_Type__c": payload["contact"]["type"],
                "Practice_Area__c": payload["request"]["area"],
                "Wants_Scheduling__c": payload["request"]["scheduling"]["requested"],
                "Scheduling_Preference__c": payload["request"]["scheduling"]["preference"],
                "Conversation_Summary__c": payload["conversation"]["summary"],
                "Handoff_Reason__c": payload["metadata"]["reason"],
                "Priority__c": payload["metadata"]["priority"],
                "WhatsApp_Handoff_ID__c": payload["handoff_id"]
            }
        }
    
    def _load_handoff_templates(self) -> Dict[str, str]:
        """Load handoff message templates."""
        return {
            "reception_summary": """
{priority_indicator} NOVO ATENDIMENTO WHATSAPP

📱 Telefone: {phone_number}
👤 Tipo: {client_type}
⚖️ Área: {practice_area}
📅 Agendamento: {scheduling_info}

📋 RESUMO:
{conversation_summary}

⏱️ Duração: {duration_minutes} min | 💬 Mensagens: {message_count}
🔄 Motivo: {handoff_reason}

📝 Solicitações Especiais: {custom_requests}

🏷️ Tags: {tags}
🆔 ID: {handoff_id}
""".strip(),
            
            "crm_note": """
Atendimento WhatsApp automatizado concluído.

Cliente: {client_type}
Área de interesse: {practice_area}
Agendamento: {scheduling_info}

Resumo da conversa: {conversation_summary}

Duração: {duration_minutes} minutos
Total de mensagens: {message_count}
""".strip()
        }


# Factory function for dependency injection
def get_handoff_service() -> HandoffService:
    """Get HandoffService instance."""
    return HandoffService()