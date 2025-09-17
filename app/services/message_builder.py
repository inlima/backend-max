"""
Message template system for conversation flows.
"""

import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from .whatsapp_client import InteractiveMessage, Button, MediaMessage, ContactMessage, LocationMessage
from .message_utils import MessageUtils

logger = logging.getLogger(__name__)


@dataclass
class MessageTemplate:
    """Message template definition."""
    id: str
    type: str  # 'text' or 'interactive'
    content: Dict[str, Any]
    variations: Optional[List[Dict[str, Any]]] = None


class MessageBuilder:
    """Builds formatted messages for conversation flows."""
    
    def __init__(self):
        self.templates = self._load_templates()
    
    def _load_templates(self) -> Dict[str, MessageTemplate]:
        """Load predefined message templates."""
        return {
            "welcome": MessageTemplate(
                id="welcome",
                type="interactive",
                content={
                    "body": "Olá! 👋 Bem-vindo(a) à Advocacia Direta!\n\nSou seu assistente virtual e estou aqui para ajudá-lo(a) de forma rápida e eficiente.\n\nPara começar, preciso saber:",
                    "buttons": [
                        {"id": "client_new", "title": "Sou Cliente Novo"},
                        {"id": "client_existing", "title": "Já Sou Cliente"}
                    ]
                }
            ),
            
            "client_type_confirmation": MessageTemplate(
                id="client_type_confirmation",
                type="text",
                content={
                    "new": "Perfeito! Como cliente novo, vou te ajudar a encontrar o melhor atendimento para sua necessidade.",
                    "existing": "Ótimo! Como cliente já cadastrado, vou direcioná-lo(a) para o atendimento adequado."
                }
            ),
            
            "practice_areas": MessageTemplate(
                id="practice_areas",
                type="interactive",
                content={
                    "body": "Em qual área jurídica posso ajudá-lo(a) hoje?",
                    "buttons": [
                        {"id": "area_civil", "title": "Direito Civil"},
                        {"id": "area_trabalhista", "title": "Direito Trabalhista"},
                        {"id": "area_criminal", "title": "Direito Criminal"},
                        {"id": "area_familia", "title": "Direito de Família"},
                        {"id": "area_empresarial", "title": "Direito Empresarial"},
                        {"id": "area_outros", "title": "Outras Áreas"}
                    ]
                }
            ),
            
            "scheduling_offer": MessageTemplate(
                id="scheduling_offer",
                type="interactive",
                content={
                    "body": "Entendi que você precisa de atendimento em {area}.\n\nGostaria de agendar uma consulta com nossos especialistas?",
                    "buttons": [
                        {"id": "schedule_yes", "title": "Sim, quero agendar"},
                        {"id": "schedule_no", "title": "Não, só informações"}
                    ]
                }
            ),
            
            "scheduling_type": MessageTemplate(
                id="scheduling_type",
                type="interactive",
                content={
                    "body": "Perfeito! Como você prefere sua consulta?",
                    "buttons": [
                        {"id": "type_presencial", "title": "Presencial"},
                        {"id": "type_online", "title": "Online"}
                    ]
                }
            ),
            
            "scheduling_confirmation": MessageTemplate(
                id="scheduling_confirmation",
                type="text",
                content={
                    "presencial": "✅ Solicitação de agendamento PRESENCIAL registrada!\n\nNossa equipe de recepção entrará em contato em breve para confirmar data e horário disponível.\n\nObrigado por escolher a Advocacia Direta!",
                    "online": "✅ Solicitação de agendamento ONLINE registrada!\n\nNossa equipe de recepção entrará em contato em breve para confirmar data e horário disponível.\n\nObrigado por escolher a Advocacia Direta!"
                }
            ),
            
            "information_only": MessageTemplate(
                id="information_only",
                type="text",
                content={
                    "message": "Entendi! Nossa equipe especializada em {area} entrará em contato para fornecer as informações que você precisa.\n\nObrigado por escolher a Advocacia Direta!"
                }
            ),
            
            "handoff_message": MessageTemplate(
                id="handoff_message",
                type="text",
                content={
                    "message": "Obrigado pelas informações! 📋\n\nUm de nossos especialistas dará continuidade ao seu atendimento em breve.\n\nTenha um ótimo dia!"
                }
            ),
            
            "escape_command": MessageTemplate(
                id="escape_command",
                type="text",
                content={
                    "message": "Entendi que você gostaria de falar diretamente com um atendente.\n\nTransferindo você para nossa equipe humana agora... ⏳"
                }
            ),
            
            "enhanced_error_second": MessageTemplate(
                id="enhanced_error_second",
                type="interactive",
                content={
                    "body": "Parece que você está com dificuldades. 😅\n\nVamos tentar de novo? Ou prefere que eu explique melhor as opções?",
                    "buttons": [
                        {"id": "try_again", "title": "🔄 Tentar Novamente"},
                        {"id": "explain_options", "title": "💡 Explicar Opções"},
                        {"id": "human_agent", "title": "👤 Falar com Atendente"}
                    ]
                }
            ),
            
            "enhanced_error_multiple": MessageTemplate(
                id="enhanced_error_multiple",
                type="interactive",
                content={
                    "body": "Vejo que você está enfrentando dificuldades. 🤔\n\nQue tal conversarmos com um atendente humano para te ajudar melhor?",
                    "buttons": [
                        {"id": "human_agent", "title": "👤 Sim, Falar com Atendente"},
                        {"id": "restart_flow", "title": "🔄 Recomeçar do Início"},
                        {"id": "try_again", "title": "⚡ Tentar Mais Uma Vez"}
                    ]
                }
            ),
            
            "handoff_offer": MessageTemplate(
                id="handoff_offer",
                type="interactive",
                content={
                    "body": "Notei que você pode estar com dificuldades. 😊\n\nGostaria de falar diretamente com um de nossos atendentes humanos? Eles podem te ajudar de forma mais personalizada!",
                    "buttons": [
                        {"id": "accept_handoff", "title": "✅ Sim, Quero Atendente"},
                        {"id": "continue_bot", "title": "🤖 Continuar com Bot"},
                        {"id": "restart_flow", "title": "🔄 Recomeçar"}
                    ]
                }
            ),
            
            "reengagement": MessageTemplate(
                id="reengagement",
                type="interactive",
                content={
                    "body": "Olá! 👋 Notei que nossa conversa foi interrompida.\n\nGostaria de continuar de onde paramos?",
                    "buttons": [
                        {"id": "continue_flow", "title": "Sim, continuar"},
                        {"id": "restart_flow", "title": "Recomeçar"},
                        {"id": "human_agent", "title": "Falar com atendente"}
                    ]
                }
            ),
            
            "error_fallback": MessageTemplate(
                id="error_fallback",
                type="interactive",
                content={
                    "body": "Desculpe, não consegui entender sua resposta. 😅\n\nPoderia escolher uma das opções abaixo?",
                    "buttons": [
                        {"id": "restart_flow", "title": "Recomeçar"},
                        {"id": "human_agent", "title": "Falar com atendente"}
                    ]
                }
            ),
            
            "step_timeout": MessageTemplate(
                id="step_timeout",
                type="text",
                content={
                    "message": "Olá! 👋 Notei que você estava no meio de nossa conversa sobre {step}.\n\nGostaria de continuar de onde paramos ou prefere recomeçar?"
                }
            ),
            
            "session_timeout": MessageTemplate(
                id="session_timeout",
                type="text",
                content={
                    "message": "Olá novamente! 😊\n\nVejo que faz um tempo desde nossa última conversa. Posso ajudá-lo(a) com alguma questão jurídica hoje?"
                }
            ),
            
            "final_reengagement": MessageTemplate(
                id="final_reengagement",
                type="text",
                content={
                    "message": "Olá! 👋 Esta é minha última tentativa de contato.\n\nSe precisar de ajuda, pode me chamar a qualquer momento ou falar diretamente com nossa equipe digitando 'atendente'.\n\nEstou aqui quando precisar! 😊"
                }
            ),
            
            "timeout_escalation": MessageTemplate(
                id="timeout_escalation",
                type="text",
                content={
                    "message": "Olá! Como não consegui te ajudar adequadamente pelo chat automatizado, vou transferir você para um de nossos atendentes humanos.\n\nEles poderão te dar um atendimento mais personalizado! ⏳"
                }
            ),
            
            "session_reset": MessageTemplate(
                id="session_reset",
                type="text",
                content={
                    "message": "Olá! 👋 Como faz um tempo desde nossa conversa, vou reiniciar nosso atendimento para garantir que você tenha a melhor experiência.\n\nComo posso ajudá-lo(a) hoje?"
                }
            )
        }
    
    def build_welcome_message(self) -> InteractiveMessage:
        """Build welcome message with client type selection."""
        template = self.templates["welcome"]
        
        buttons = [
            Button(id=btn["id"], title=btn["title"]) 
            for btn in template.content["buttons"]
        ]
        
        return InteractiveMessage(
            type="button",
            body=template.content["body"],
            buttons=buttons
        )
    
    def build_client_type_confirmation(self, client_type: str) -> str:
        """Build confirmation message for client type selection."""
        template = self.templates["client_type_confirmation"]
        
        # Map button IDs to template keys
        if client_type == "client_new":
            return template.content["new"]
        elif client_type == "client_existing":
            return template.content["existing"]
        else:
            return template.content["new"]  # Default fallback
    
    def build_practice_area_message(self) -> InteractiveMessage:
        """Build practice area selection message."""
        template = self.templates["practice_areas"]
        
        # WhatsApp allows max 3 buttons, so we'll create multiple messages if needed
        buttons = [
            Button(id=btn["id"], title=btn["title"]) 
            for btn in template.content["buttons"][:3]
        ]
        
        return InteractiveMessage(
            type="button",
            body=template.content["body"],
            buttons=buttons
        )
    
    def build_practice_area_extended_message(self) -> InteractiveMessage:
        """Build extended practice area selection for remaining options."""
        template = self.templates["practice_areas"]
        
        # Get remaining buttons (4-6)
        buttons = [
            Button(id=btn["id"], title=btn["title"]) 
            for btn in template.content["buttons"][3:6]
        ]
        
        return InteractiveMessage(
            type="button",
            body="Ou escolha uma destas outras opções:",
            buttons=buttons
        )
    
    def build_scheduling_offer_message(self, practice_area: str) -> InteractiveMessage:
        """Build scheduling offer message with practice area context."""
        template = self.templates["scheduling_offer"]
        
        # Map area IDs to readable names
        area_names = {
            "area_civil": "Direito Civil",
            "area_trabalhista": "Direito Trabalhista", 
            "area_criminal": "Direito Criminal",
            "area_familia": "Direito de Família",
            "area_empresarial": "Direito Empresarial",
            "area_outros": "outras áreas jurídicas"
        }
        
        area_name = area_names.get(practice_area, "a área selecionada")
        body = template.content["body"].format(area=area_name)
        
        buttons = [
            Button(id=btn["id"], title=btn["title"]) 
            for btn in template.content["buttons"]
        ]
        
        return InteractiveMessage(
            type="button",
            body=body,
            buttons=buttons
        )
    
    def build_scheduling_type_message(self) -> InteractiveMessage:
        """Build scheduling type selection message."""
        template = self.templates["scheduling_type"]
        
        buttons = [
            Button(id=btn["id"], title=btn["title"]) 
            for btn in template.content["buttons"]
        ]
        
        return InteractiveMessage(
            type="button",
            body=template.content["body"],
            buttons=buttons
        )
    
    def build_scheduling_confirmation_message(self, scheduling_type: str) -> str:
        """Build scheduling confirmation message."""
        template = self.templates["scheduling_confirmation"]
        
        if scheduling_type == "type_presencial":
            return template.content["presencial"]
        elif scheduling_type == "type_online":
            return template.content["online"]
        else:
            return template.content["presencial"]  # Default fallback
    
    def build_information_only_message(self, practice_area: str) -> str:
        """Build information-only response message."""
        template = self.templates["information_only"]
        
        # Map area IDs to readable names
        area_names = {
            "area_civil": "Direito Civil",
            "area_trabalhista": "Direito Trabalhista",
            "area_criminal": "Direito Criminal", 
            "area_familia": "Direito de Família",
            "area_empresarial": "Direito Empresarial",
            "area_outros": "outras áreas jurídicas"
        }
        
        area_name = area_names.get(practice_area, "a área selecionada")
        return template.content["message"].format(area=area_name)
    
    def build_handoff_message(self, collected_data: Dict[str, Any]) -> str:
        """Build handoff message with collected conversation data."""
        template = self.templates["handoff_message"]
        return template.content["message"]
    
    def build_escape_command_message(self) -> str:
        """Build escape command response message."""
        template = self.templates["escape_command"]
        return template.content["message"]
    
    def build_enhanced_error_message(self, current_step: str, invalid_count: int) -> InteractiveMessage:
        """Build enhanced error message with more help options."""
        if invalid_count == 2:
            template = self.templates["enhanced_error_second"]
        else:
            template = self.templates["enhanced_error_multiple"]
        
        buttons = [
            Button(id=btn["id"], title=btn["title"]) 
            for btn in template.content["buttons"]
        ]
        
        return InteractiveMessage(
            body=template.content["body"],
            buttons=buttons
        )
    
    def build_handoff_offer_message(self) -> InteractiveMessage:
        """Build message offering handoff to human agent."""
        template = self.templates["handoff_offer"]
        
        buttons = [
            Button(id=btn["id"], title=btn["title"]) 
            for btn in template.content["buttons"]
        ]
        
        return InteractiveMessage(
            body=template.content["body"],
            buttons=buttons
        )
    
    def build_step_explanation_message(self, step: str) -> str:
        """Build explanation message for current step."""
        explanations = {
            "client_type": "Preciso saber se você já é nosso cliente ou se é a primeira vez que nos procura. Isso me ajuda a direcionar melhor o atendimento! 😊\n\n• Cliente Novo: Primeira vez que nos procura\n• Cliente Existente: Já foi atendido por nós antes",
            
            "practice_area": "Agora preciso saber qual área jurídica te interessa. Escolha a opção que mais se aproxima da sua necessidade:\n\n⚖️ Direito Civil: Contratos, imóveis, danos\n👥 Direito de Família: Divórcio, pensão, guarda\n💼 Direito Trabalhista: Questões de trabalho\n🚨 Direito Criminal: Defesa criminal\n🏢 Direito Empresarial: Questões de empresa\n📋 Outras Áreas: Outras questões jurídicas",
            
            "scheduling_offer": "Posso te ajudar de duas formas:\n\n📅 Agendamento: Marcar uma consulta com nossos advogados\n💬 Informações: Esclarecer dúvidas gerais sobre a área jurídica\n\nO que você prefere?",
            
            "scheduling_type": "Oferecemos consultas de duas formas:\n\n🏢 Presencial: No nosso escritório\n💻 Online: Por videochamada\n\nQual formato prefere para sua consulta?"
        }
        
        return explanations.get(step, "Desculpe, não consegui explicar esta etapa. Que tal falar com um atendente? 😅")
    
    def build_reengagement_message(self) -> InteractiveMessage:
        """Build re-engagement message for inactive users."""
        template = self.templates["reengagement"]
        
        buttons = [
            Button(id=btn["id"], title=btn["title"]) 
            for btn in template.content["buttons"]
        ]
        
        return InteractiveMessage(
            type="button",
            body=template.content["body"],
            buttons=buttons
        )
    
    def build_error_fallback_message(self) -> InteractiveMessage:
        """Build error fallback message for invalid inputs."""
        template = self.templates["error_fallback"]
        
        buttons = [
            Button(id=btn["id"], title=btn["title"]) 
            for btn in template.content["buttons"]
        ]
        
        return InteractiveMessage(
            type="button",
            body=template.content["body"],
            buttons=buttons
        )
    
    def get_template(self, template_id: str) -> Optional[MessageTemplate]:
        """Get a specific template by ID."""
        return self.templates.get(template_id)
    
    def validate_button_response(self, button_id: str, expected_buttons: List[str]) -> bool:
        """Validate if button response is expected."""
        return button_id in expected_buttons
    
    def build_step_timeout_message(self, current_step: str) -> str:
        """Build step timeout message with context."""
        template = self.templates["step_timeout"]
        
        step_names = {
            "welcome": "boas-vindas",
            "client_type": "identificação do tipo de cliente",
            "practice_area": "seleção da área jurídica",
            "scheduling_offer": "oferta de agendamento",
            "scheduling_type": "tipo de consulta"
        }
        
        step_name = step_names.get(current_step, "nossa conversa")
        return template.content["message"].format(step=step_name)
    
    def build_session_timeout_message(self) -> str:
        """Build session timeout message."""
        template = self.templates["session_timeout"]
        return template.content["message"]
    
    def build_final_reengagement_message(self) -> str:
        """Build final re-engagement attempt message."""
        template = self.templates["final_reengagement"]
        return template.content["message"]
    
    def build_timeout_escalation_message(self) -> str:
        """Build timeout escalation message."""
        template = self.templates["timeout_escalation"]
        return template.content["message"]
    
    def build_session_reset_message(self) -> str:
        """Build session reset message."""
        template = self.templates["session_reset"]
        return template.content["message"]
    
    def format_handoff_summary(self, collected_data: Dict[str, Any]) -> str:
        """Format collected data for handoff to human agents."""
        summary_parts = ["📋 RESUMO DA CONVERSA AUTOMATIZADA"]
        
        if collected_data.get("client_type"):
            client_type = "Cliente Novo" if collected_data["client_type"] == "client_new" else "Cliente Existente"
            summary_parts.append(f"👤 Tipo: {client_type}")
        
        if collected_data.get("practice_area"):
            area_names = {
                "area_civil": "Direito Civil",
                "area_trabalhista": "Direito Trabalhista",
                "area_criminal": "Direito Criminal",
                "area_familia": "Direito de Família", 
                "area_empresarial": "Direito Empresarial",
                "area_outros": "Outras Áreas"
            }
            area = area_names.get(collected_data["practice_area"], collected_data["practice_area"])
            summary_parts.append(f"⚖️ Área: {area}")
        
        if collected_data.get("wants_scheduling") is not None:
            if collected_data["wants_scheduling"]:
                summary_parts.append("📅 Solicitação: Agendamento de consulta")
                if collected_data.get("scheduling_preference"):
                    pref = "Presencial" if collected_data["scheduling_preference"] == "type_presencial" else "Online"
                    summary_parts.append(f"📍 Modalidade: {pref}")
            else:
                summary_parts.append("ℹ️ Solicitação: Apenas informações")
        
        if collected_data.get("phone_number"):
            summary_parts.append(f"📱 WhatsApp: {collected_data['phone_number']}")
        
        return "\n".join(summary_parts)
    
    # New methods for multimedia messages
    
    def build_welcome_image(self) -> MediaMessage:
        """Build welcome image message."""
        return MediaMessage(
            media_type="image",
            media_url="https://example.com/welcome-advocacia-direta.jpg",  # Replace with actual URL
            caption="🏛️ Bem-vindo à Advocacia Direta!\n\nEstamos aqui para defender seus direitos com excelência e dedicação."
        )
    
    def build_office_location(self) -> LocationMessage:
        """Build office location message."""
        return MessageUtils.create_office_location()
    
    def build_law_firm_contact(self) -> ContactMessage:
        """Build law firm contact message."""
        contact = MessageUtils.create_law_firm_contact()
        return ContactMessage(contacts=[contact])
    
    def build_lawyer_contact(self, lawyer_name: str, phone: str, specialization: str = None) -> ContactMessage:
        """Build lawyer contact message."""
        contact = MessageUtils.create_lawyer_contact(
            name=lawyer_name,
            phone=phone,
            email=f"{lawyer_name.lower().replace(' ', '.')}@advocaciadireta.com",
            specialization=specialization
        )
        return ContactMessage(contacts=[contact])
    
    def build_document_message(self, document_type: str) -> MediaMessage:
        """Build document message based on type."""
        templates = MessageUtils.create_document_templates()
        doc_info = templates.get(document_type, templates["checklist_documentos"])
        
        return MediaMessage(
            media_type="document",
            media_url=f"https://example.com/documents/{doc_info['filename']}",  # Replace with actual URL
            filename=doc_info["filename"],
            caption=doc_info["caption"]
        )
    
    def build_practice_area_info_image(self, practice_area: str) -> MediaMessage:
        """Build practice area information image."""
        area_info = MessageUtils.create_practice_area_info()
        info = area_info.get(practice_area, area_info["direito_civil"])
        
        return MediaMessage(
            media_type="image",
            media_url=f"https://example.com/areas/{practice_area}.jpg",  # Replace with actual URL
            caption=f"{info['icon']} **{info['title']}**\n\n{info['description']}\n\nNossa equipe especializada está pronta para ajudá-lo!"
        )
    
    def build_appointment_confirmation_image(self) -> MediaMessage:
        """Build appointment confirmation image."""
        return MessageUtils.create_appointment_confirmation_image()
    
    def build_welcome_video(self) -> MediaMessage:
        """Build welcome video message."""
        return MessageUtils.create_welcome_video()
    
    def build_instruction_audio(self, instruction_type: str) -> MediaMessage:
        """Build instruction audio message."""
        return MessageUtils.create_audio_instructions(instruction_type)
    
    def build_case_summary_document(self, case_data: Dict[str, Any]) -> MediaMessage:
        """Build case summary document."""
        summary = MessageUtils.format_case_summary(case_data)
        
        return MediaMessage(
            media_type="document",
            media_url="https://example.com/case-summary.pdf",  # Replace with actual URL
            filename=f"resumo_caso_{case_data.get('case_id', 'novo')}.pdf",
            caption=f"📋 Resumo do Caso\n\n{summary[:100]}..."
        )
    
    def build_enhanced_welcome_with_media(self) -> List[Dict[str, Any]]:
        """Build enhanced welcome sequence with multiple message types."""
        messages = []
        
        # 1. Welcome image
        messages.append({
            "type": "image",
            "content": self.build_welcome_image()
        })
        
        # 2. Welcome text with buttons
        messages.append({
            "type": "interactive", 
            "content": self.build_welcome_message()
        })
        
        # 3. Office location (optional)
        messages.append({
            "type": "location",
            "content": self.build_office_location()
        })
        
        return messages
    
    def build_consultation_package(self, practice_area: str) -> List[Dict[str, Any]]:
        """Build consultation information package."""
        messages = []
        
        # 1. Practice area info image
        messages.append({
            "type": "image",
            "content": self.build_practice_area_info_image(practice_area)
        })
        
        # 2. Relevant document
        doc_types = {
            "area_civil": "procuracao",
            "area_trabalhista": "checklist_documentos", 
            "area_familia": "declaracao_hipossuficiencia",
            "area_criminal": "contrato_honorarios",
            "area_empresarial": "contrato_honorarios"
        }
        doc_type = doc_types.get(practice_area, "checklist_documentos")
        
        messages.append({
            "type": "document",
            "content": self.build_document_message(doc_type)
        })
        
        # 3. Audio instructions
        messages.append({
            "type": "audio",
            "content": self.build_instruction_audio("processo_consulta")
        })
        
        return messages
    
    def build_handoff_package(self, collected_data: Dict[str, Any], lawyer_info: Dict[str, str] = None) -> List[Dict[str, Any]]:
        """Build handoff package with lawyer contact and case summary."""
        messages = []
        
        # 1. Handoff text message
        messages.append({
            "type": "text",
            "content": self.build_handoff_message(collected_data)
        })
        
        # 2. Lawyer contact (if provided)
        if lawyer_info:
            messages.append({
                "type": "contacts",
                "content": self.build_lawyer_contact(
                    lawyer_info.get("name", "Advogado Responsável"),
                    lawyer_info.get("phone", "5511999999999"),
                    lawyer_info.get("specialization")
                )
            })
        
        # 3. Case summary document
        messages.append({
            "type": "document", 
            "content": self.build_case_summary_document(collected_data)
        })
        
        return messages


# Factory function for dependency injection
def get_message_builder() -> MessageBuilder:
    """Get MessageBuilder instance."""
    return MessageBuilder()