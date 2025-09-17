"""
Utility functions for creating WhatsApp messages.
"""

from typing import Dict, List, Any, Optional
from .whatsapp_client import (
    MediaMessage, 
    ContactMessage, 
    LocationMessage, 
    InteractiveMessage, 
    Button
)


class MessageUtils:
    """Utility class for creating WhatsApp messages."""
    
    @staticmethod
    def create_contact(
        name: str,
        phone: str,
        email: str = None,
        organization: str = None,
        address: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """Create a contact object for contact messages."""
        contact = {
            "name": {
                "formatted_name": name,
                "first_name": name.split()[0] if name else "",
                "last_name": " ".join(name.split()[1:]) if len(name.split()) > 1 else ""
            }
        }
        
        if phone:
            contact["phones"] = [{
                "phone": phone,
                "type": "WORK",
                "wa_id": phone
            }]
        
        if email:
            contact["emails"] = [{
                "email": email,
                "type": "WORK"
            }]
        
        if organization:
            contact["org"] = {
                "company": organization
            }
        
        if address:
            contact["addresses"] = [{
                "street": address.get("street", ""),
                "city": address.get("city", ""),
                "state": address.get("state", ""),
                "zip": address.get("zip", ""),
                "country": address.get("country", "Brasil"),
                "type": "WORK"
            }]
        
        return contact
    
    @staticmethod
    def create_law_firm_contact() -> Dict[str, Any]:
        """Create contact for the law firm."""
        return MessageUtils.create_contact(
            name="Advocacia Direta",
            phone="5511999999999",
            email="contato@advocaciadireta.com",
            organization="Advocacia Direta - Escritório de Advocacia",
            address={
                "street": "Rua dos Advogados, 123",
                "city": "São Paulo",
                "state": "SP",
                "zip": "01234-567",
                "country": "Brasil"
            }
        )
    
    @staticmethod
    def create_lawyer_contact(
        name: str,
        phone: str,
        email: str = None,
        specialization: str = None
    ) -> Dict[str, Any]:
        """Create contact for a lawyer."""
        organization = "Advocacia Direta"
        if specialization:
            organization += f" - {specialization}"
        
        return MessageUtils.create_contact(
            name=name,
            phone=phone,
            email=email,
            organization=organization
        )
    
    @staticmethod
    def create_office_location() -> LocationMessage:
        """Create location message for the law firm office."""
        return LocationMessage(
            latitude=-23.5505,  # São Paulo coordinates (example)
            longitude=-46.6333,
            name="Advocacia Direta - Escritório Principal",
            address="Rua dos Advogados, 123 - Centro, São Paulo - SP, 01234-567"
        )
    
    @staticmethod
    def create_document_templates() -> Dict[str, Dict[str, str]]:
        """Create common document templates for legal services."""
        return {
            "procuracao": {
                "filename": "modelo_procuracao.pdf",
                "caption": "📄 Modelo de Procuração\n\nBaixe, preencha e assine este documento para nos representar legalmente."
            },
            "contrato_honorarios": {
                "filename": "contrato_honorarios.pdf", 
                "caption": "📋 Contrato de Honorários\n\nContrato padrão para prestação de serviços advocatícios."
            },
            "declaracao_hipossuficiencia": {
                "filename": "declaracao_hipossuficiencia.pdf",
                "caption": "📝 Declaração de Hipossuficiência\n\nDocumento para solicitar assistência judiciária gratuita."
            },
            "checklist_documentos": {
                "filename": "checklist_documentos.pdf",
                "caption": "✅ Checklist de Documentos\n\nLista dos documentos necessários para seu caso."
            }
        }
    
    @staticmethod
    def create_practice_area_info() -> Dict[str, Dict[str, str]]:
        """Create information about practice areas."""
        return {
            "direito_civil": {
                "title": "Direito Civil",
                "description": "Contratos, responsabilidade civil, direitos reais, família e sucessões.",
                "icon": "⚖️"
            },
            "direito_trabalhista": {
                "title": "Direito Trabalhista", 
                "description": "Rescisões, horas extras, assédio, acidentes de trabalho.",
                "icon": "👷"
            },
            "direito_criminal": {
                "title": "Direito Criminal",
                "description": "Defesa criminal, inquéritos, processos penais.",
                "icon": "🚨"
            },
            "direito_familia": {
                "title": "Direito de Família",
                "description": "Divórcio, pensão alimentícia, guarda de filhos, união estável.",
                "icon": "👨‍👩‍👧‍👦"
            },
            "direito_empresarial": {
                "title": "Direito Empresarial",
                "description": "Constituição de empresas, contratos comerciais, recuperação judicial.",
                "icon": "🏢"
            }
        }
    
    @staticmethod
    def create_appointment_confirmation_image() -> MediaMessage:
        """Create image message for appointment confirmation."""
        return MediaMessage(
            media_type="image",
            media_url="https://example.com/appointment-confirmed.jpg",  # Replace with actual URL
            caption="✅ Consulta Agendada!\n\nSua consulta foi confirmada. Você receberá mais detalhes em breve."
        )
    
    @staticmethod
    def create_welcome_video() -> MediaMessage:
        """Create welcome video message."""
        return MediaMessage(
            media_type="video",
            media_url="https://example.com/welcome-video.mp4",  # Replace with actual URL
            caption="🎥 Bem-vindo à Advocacia Direta!\n\nAssista este vídeo para conhecer nossos serviços."
        )
    
    @staticmethod
    def create_audio_instructions(instruction_type: str) -> MediaMessage:
        """Create audio message with instructions."""
        audio_urls = {
            "como_agendar": "https://example.com/audio/como-agendar.mp3",
            "documentos_necessarios": "https://example.com/audio/documentos-necessarios.mp3",
            "processo_consulta": "https://example.com/audio/processo-consulta.mp3"
        }
        
        return MediaMessage(
            media_type="audio",
            media_url=audio_urls.get(instruction_type, audio_urls["como_agendar"])
        )
    
    @staticmethod
    def create_interactive_menu() -> InteractiveMessage:
        """Create main interactive menu."""
        return InteractiveMessage(
            type="button",
            body="🏛️ Advocacia Direta - Menu Principal\n\nComo posso ajudá-lo hoje?",
            buttons=[
                Button(id="nova_consulta", title="📅 Nova Consulta"),
                Button(id="acompanhar_caso", title="📋 Acompanhar Caso"),
                Button(id="falar_advogado", title="👨‍💼 Falar com Advogado")
            ],
            header="Menu de Serviços",
            footer="Advocacia Direta - Sempre ao seu lado"
        )
    
    @staticmethod
    def create_practice_area_menu() -> InteractiveMessage:
        """Create practice area selection menu."""
        return InteractiveMessage(
            type="button",
            body="⚖️ Selecione a área jurídica:\n\nEm qual área você precisa de ajuda?",
            buttons=[
                Button(id="area_civil", title="⚖️ Direito Civil"),
                Button(id="area_trabalhista", title="👷 Direito Trabalhista"),
                Button(id="area_familia", title="👨‍👩‍👧‍👦 Direito de Família")
            ]
        )
    
    @staticmethod
    def create_scheduling_menu() -> InteractiveMessage:
        """Create scheduling options menu."""
        return InteractiveMessage(
            type="button",
            body="📅 Como você prefere sua consulta?",
            buttons=[
                Button(id="presencial", title="🏢 Presencial"),
                Button(id="online", title="💻 Online"),
                Button(id="telefone", title="📞 Por Telefone")
            ]
        )
    
    @staticmethod
    def create_urgency_menu() -> InteractiveMessage:
        """Create urgency level menu."""
        return InteractiveMessage(
            type="button",
            body="⏰ Qual a urgência do seu caso?",
            buttons=[
                Button(id="urgente", title="🚨 Urgente"),
                Button(id="normal", title="📅 Normal"),
                Button(id="flexivel", title="⏳ Flexível")
            ]
        )
    
    @staticmethod
    def format_case_summary(case_data: Dict[str, Any]) -> str:
        """Format case summary for handoff."""
        summary = "📋 **RESUMO DO CASO**\n\n"
        
        if case_data.get("client_name"):
            summary += f"👤 **Cliente:** {case_data['client_name']}\n"
        
        if case_data.get("phone"):
            summary += f"📱 **Telefone:** {case_data['phone']}\n"
        
        if case_data.get("practice_area"):
            summary += f"⚖️ **Área:** {case_data['practice_area']}\n"
        
        if case_data.get("urgency"):
            urgency_icons = {"urgente": "🚨", "normal": "📅", "flexivel": "⏳"}
            icon = urgency_icons.get(case_data['urgency'], "📅")
            summary += f"{icon} **Urgência:** {case_data['urgency'].title()}\n"
        
        if case_data.get("consultation_type"):
            type_icons = {"presencial": "🏢", "online": "💻", "telefone": "📞"}
            icon = type_icons.get(case_data['consultation_type'], "📅")
            summary += f"{icon} **Consulta:** {case_data['consultation_type'].title()}\n"
        
        if case_data.get("description"):
            summary += f"\n📝 **Descrição:**\n{case_data['description']}\n"
        
        summary += f"\n🕐 **Data/Hora:** {case_data.get('timestamp', 'Agora')}"
        
        return summary
    
    @staticmethod
    def create_feedback_menu() -> InteractiveMessage:
        """Create feedback collection menu."""
        return InteractiveMessage(
            type="button",
            body="⭐ Como foi seu atendimento?\n\nSua opinião é muito importante para nós!",
            buttons=[
                Button(id="excelente", title="⭐⭐⭐ Excelente"),
                Button(id="bom", title="⭐⭐ Bom"),
                Button(id="regular", title="⭐ Regular")
            ]
        )
    
    @staticmethod
    def create_satisfaction_survey() -> InteractiveMessage:
        """Create satisfaction survey."""
        return InteractiveMessage(
            type="button",
            body="📊 Pesquisa de Satisfação\n\nVocê recomendaria nossos serviços?",
            buttons=[
                Button(id="sim_recomendo", title="✅ Sim, recomendo"),
                Button(id="talvez", title="🤔 Talvez"),
                Button(id="nao_recomendo", title="❌ Não recomendo")
            ]
        )


# Factory function
def get_message_utils() -> MessageUtils:
    """Get MessageUtils instance."""
    return MessageUtils()