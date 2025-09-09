"""
Conversation service - MVP Version.
"""

import logging
import re
import httpx
from datetime import datetime
from typing import Dict, Any, Optional
from enum import Enum

from app.services.whatsapp_client import whatsapp_client

logger = logging.getLogger(__name__)


class ConversationStep(Enum):
    """Conversation steps for MVP flow."""
    WELCOME = "welcome"
    CLIENT_TYPE = "client_type"
    SERVICE_TYPE = "service_type"  # Novo passo para tipo de serviço
    PROCESS_NUMBER_INPUT = "process_number_input"  # Captura número do processo
    LAWYER_AREA_SELECTION = "lawyer_area_selection"  # Seleção de área para falar com advogado
    PRACTICE_AREA = "practice_area"
    SCHEDULING = "scheduling"
    SCHEDULING_TYPE = "scheduling_type"
    COMPLETED = "completed"


class ConversationService:
    """Simple conversation service for MVP."""
    
    def __init__(self):
        # In-memory session storage for MVP
        self.sessions: Dict[str, Dict[str, Any]] = {}
        
        # Lawyer mapping by practice area (hard-coded for MVP)
        self.lawyers_by_area = {
            "consumidor": {
                "name": "Dr. Bruno",
                "phone": "5573982005612"
            },
            "familia": {
                "name": "Dra. Lorena Almeida", 
                "phone": "5573982005612"
            },
            "trabalhista": {
                "name": "Dr. Carlos Silva",
                "phone": "5573982005612"
            },
            "previdenciario": {
                "name": "Dra. Lorena Almeida",
                "phone": "5573982005612"
            },
            "criminal": {
                "name": "Dr. Roberto Santos",
                "phone": "5573982005612"
            }
        }
    
    async def process_message(self, phone_number: str, message: str, contact_name: str = None) -> None:
        """Process incoming message and respond accordingly."""
        try:
            # Get or create session
            session = self.get_session(phone_number)
            
            # Update session with message
            session["last_message"] = message
            session["contact_name"] = contact_name or session.get("contact_name", "Cliente")
            
            # Check for reset commands first
            if self.is_reset_command(message):
                await self.reset_conversation(phone_number, session)
                return
            
            # Check for help commands
            if self.is_help_command(message):
                await self.show_help_commands(phone_number)
                return
            
            # Check for back commands
            if self.is_back_command(message):
                await self.go_back_one_step(phone_number, session)
                return
            
            # Process based on current step
            current_step = ConversationStep(session.get("step", ConversationStep.WELCOME.value))
            
            if current_step == ConversationStep.WELCOME:
                await self.handle_welcome(phone_number, session)
            elif current_step == ConversationStep.CLIENT_TYPE:
                await self.handle_client_type(phone_number, message, session)
            elif current_step == ConversationStep.SERVICE_TYPE:
                await self.handle_service_type(phone_number, message, session)
            elif current_step == ConversationStep.PROCESS_NUMBER_INPUT:
                await self.handle_process_number_input(phone_number, message, session)
            elif current_step == ConversationStep.LAWYER_AREA_SELECTION:
                await self.handle_lawyer_area_selection(phone_number, message, session)
            elif current_step == ConversationStep.PRACTICE_AREA:
                await self.handle_practice_area(phone_number, message, session)
            elif current_step == ConversationStep.SCHEDULING:
                await self.handle_scheduling(phone_number, message, session)
            elif current_step == ConversationStep.SCHEDULING_TYPE:
                await self.handle_scheduling_type(phone_number, message, session)
            else:
                await self.handle_completed(phone_number, session)
                
        except Exception as e:
            logger.error(f"Error processing message from {phone_number}: {str(e)}")
            await whatsapp_client.send_text_message(
                phone_number, 
                "Desculpe, ocorreu um erro. Digite 'atendente' para falar com nossa equipe."
            )
    
    def get_session(self, phone_number: str) -> Dict[str, Any]:
        """Get or create session for phone number."""
        if phone_number not in self.sessions:
            self.sessions[phone_number] = {
                "step": ConversationStep.WELCOME.value,
                "data": {},
                "created_at": None
            }
        return self.sessions[phone_number]
    
    def is_reset_command(self, message: str) -> bool:
        """Check if message is a reset command."""
        message_lower = message.lower().strip()
        
        reset_commands = [
            "reiniciar", "restart", "recomeçar", "começar de novo", "voltar ao início",
            "voltar", "início", "iniciar", "novo", "reset", "limpar", "cancelar",
            "sair", "parar", "menu", "menu principal", "home", "principal",
            "começar", "start", "oi", "olá", "ola", "hello", "hi"
        ]
        
        return message_lower in reset_commands
    
    def is_help_command(self, message: str) -> bool:
        """Check if message is a help command."""
        message_lower = message.lower().strip()
        
        help_commands = [
            "ajuda", "help", "comandos", "commands", "?", "como usar",
            "o que posso fazer", "opcoes", "opções", "info", "informações"
        ]
        
        return message_lower in help_commands
    
    def is_back_command(self, message: str) -> bool:
        """Check if message is a back command."""
        message_lower = message.lower().strip()
        
        back_commands = [
            "voltar", "anterior", "back", "volta", "retornar", 
            "passo anterior", "etapa anterior", "cancelar essa etapa"
        ]
        
        return message_lower in back_commands
    
    async def go_back_one_step(self, phone_number: str, session: Dict[str, Any]) -> None:
        """Go back one step in the conversation."""
        current_step = ConversationStep(session.get("step", ConversationStep.WELCOME.value))
        
        # Define the step hierarchy for going back
        step_hierarchy = {
            ConversationStep.COMPLETED: ConversationStep.SCHEDULING_TYPE,
            ConversationStep.SCHEDULING_TYPE: ConversationStep.SCHEDULING,
            ConversationStep.SCHEDULING: ConversationStep.PRACTICE_AREA,
            ConversationStep.PRACTICE_AREA: ConversationStep.SERVICE_TYPE,
            ConversationStep.SERVICE_TYPE: ConversationStep.CLIENT_TYPE,
            ConversationStep.CLIENT_TYPE: ConversationStep.WELCOME,
            ConversationStep.WELCOME: ConversationStep.WELCOME  # Can't go back from welcome
        }
        
        previous_step = step_hierarchy.get(current_step, ConversationStep.WELCOME)
        
        if previous_step == current_step:
            # Already at the beginning
            await whatsapp_client.send_text_message(
                phone_number, 
                "Você já está no início da conversa. Digite 'reiniciar' se quiser começar novamente."
            )
            return
        
        # Update session to previous step
        session["step"] = previous_step.value
        
        # Clear some data depending on the step we're going back to
        if previous_step == ConversationStep.CLIENT_TYPE:
            session["data"] = {}  # Clear all data
        elif previous_step == ConversationStep.SERVICE_TYPE:
            # Keep client_type but clear the rest
            client_type = session["data"].get("client_type")
            session["data"] = {"client_type": client_type} if client_type else {}
        elif previous_step == ConversationStep.PRACTICE_AREA:
            # Keep client_type and service_type
            data_to_keep = {k: v for k, v in session["data"].items() 
                          if k in ["client_type", "service_type"]}
            session["data"] = data_to_keep
        
        # Send back confirmation and re-execute the previous step
        await whatsapp_client.send_text_message(phone_number, "Voltando ao passo anterior...")
        
        # Re-execute the previous step
        if previous_step == ConversationStep.WELCOME:
            await self.handle_welcome(phone_number, session)
        elif previous_step == ConversationStep.CLIENT_TYPE:
            await self.handle_welcome(phone_number, session)
        elif previous_step == ConversationStep.SERVICE_TYPE:
            # Re-ask client type to get to service type
            await self.handle_client_type(phone_number, session["data"].get("client_type", "ja_sou_cliente"), session)
        elif previous_step == ConversationStep.PRACTICE_AREA:
            # Re-ask service type to get to practice area
            await self.handle_service_type(phone_number, session["data"].get("service_type", "novo_processo"), session)
    
    async def reset_conversation(self, phone_number: str, session: Dict[str, Any]) -> None:
        """Reset conversation to the beginning."""
        # Clear session data but keep contact name
        contact_name = session.get("contact_name", "Cliente")
        
        # Reset session
        session["step"] = ConversationStep.WELCOME.value
        session["data"] = {}
        session["contact_name"] = contact_name
        
        # Start welcome flow directly (no confirmation message)
        await self.handle_welcome(phone_number, session)
    
    async def show_help_commands(self, phone_number: str) -> None:
        """Show available commands to user."""
        help_text = """Comandos disponíveis a qualquer momento:

🔄 **Reiniciar conversa:**
• "reiniciar" ou "recomeçar"
• "voltar ao início" ou "menu"
• "oi" ou "olá" (para começar de novo)

⬅️ **Voltar um passo:**
• "voltar" ou "anterior"
• "passo anterior"

👨‍� **Fa*lar com atendente:**
• "atendente" ou "atendimento"
• "falar com pessoa" ou "humano"

❓ **Ver comandos:**
• "ajuda" ou "help"
• "comandos"

💡 **Dica:** Digite qualquer um desses comandos a qualquer momento para usar essas funções!"""
        
        await whatsapp_client.send_text_message(phone_number, help_text)
    
    async def handle_welcome(self, phone_number: str, session: Dict[str, Any]) -> None:
        """Handle welcome message."""
        name = session.get("contact_name", "")
        welcome_text = f"Olá{' ' + name if name else ''}!\n\nSou o Max, assistente virtual da Lorena Almeida Advogados Associados.\n\nVou te ajudar com seu atendimento. Para começar, você é:"
        
        buttons = [
            {"id": "ja_sou_cliente", "title": "Já sou Cliente"},
            {"id": "primeira_consulta", "title": "Primeira Consulta"}
        ]
        
        await whatsapp_client.send_button_message(phone_number, welcome_text, buttons)
        session["step"] = ConversationStep.CLIENT_TYPE.value
    
    async def handle_client_type(self, phone_number: str, message: str, session: Dict[str, Any]) -> None:
        """Handle client type selection."""
        message_lower = message.lower()
        
        if "primeira" in message_lower or message_lower == "primeira_consulta":
            session["data"]["client_type"] = "primeira_consulta"
            
            # Para clientes novos (primeira consulta), ir direto para área jurídica
            area_text = "Perfeito! Como é sua primeira consulta, vou te ajudar da melhor forma.\n\nQual área jurídica você precisa de ajuda?"
            
            sections = [
                {
                    "title": "Áreas Jurídicas",
                    "rows": [
                        {"id": "consumidor", "title": "Direito do Consumidor", "description": "Problemas com produtos e serviços"},
                        {"id": "familia", "title": "Direito de Família", "description": "Divórcio, pensão, guarda"},
                        {"id": "trabalhista", "title": "Direito Trabalhista", "description": "Questões trabalhistas e CLT"},
                        {"id": "previdenciario", "title": "Direito Previdenciário", "description": "INSS, aposentadoria, benefícios"},
                        {"id": "criminal", "title": "Direito Criminal", "description": "Defesa criminal e processos"}
                    ]
                }
            ]
            
            await whatsapp_client.send_list_message(phone_number, area_text, "Selecionar Área", sections)
            session["step"] = ConversationStep.PRACTICE_AREA.value
            
        elif "ja_sou" in message_lower or "já sou" in message_lower or message_lower == "ja_sou_cliente":
            session["data"]["client_type"] = "ja_sou_cliente"
            
            # Para clientes existentes, perguntar tipo de serviço
            service_text = "Ótimo! Que bom ter você de volta!\n\nO que você precisa?"
            
            buttons = [
                {"id": "andamento_processual", "title": "Andamento Processual"},
                {"id": "novo_processo", "title": "Novo Processo"},
                {"id": "falar_advogado", "title": "Falar com Advogado"}
            ]
            
            await whatsapp_client.send_button_message(phone_number, service_text, buttons)
            session["step"] = ConversationStep.SERVICE_TYPE.value
        else:
            await whatsapp_client.send_text_message(
                phone_number, 
                "Por favor, selecione uma das opções: Já sou Cliente ou Primeira Consulta"
            )
    
    async def handle_service_type(self, phone_number: str, message: str, session: Dict[str, Any]) -> None:
        """Handle service type selection for new clients."""
        message_lower = message.lower()
        
        if "andamento" in message_lower or message_lower == "andamento_processual":
            session["data"]["service_type"] = "andamento_processual"
            
            # Pedir número do processo
            process_text = "Perfeito! Vou consultar o andamento do seu processo.\n\nPor favor, digite o número do processo:"
            
            await whatsapp_client.send_text_message(phone_number, process_text)
            session["step"] = ConversationStep.PROCESS_NUMBER_INPUT.value
            
        elif "novo" in message_lower or message_lower == "novo_processo":
            session["data"]["service_type"] = "novo_processo"
            
            # Ir para seleção de área jurídica
            area_text = "Perfeito! Vamos iniciar um novo processo.\n\nQual área jurídica você precisa de ajuda?"
            
            sections = [
                {
                    "title": "Áreas Jurídicas",
                    "rows": [
                        {"id": "consumidor", "title": "Direito do Consumidor", "description": "Problemas com produtos e serviços"},
                        {"id": "familia", "title": "Direito de Família", "description": "Divórcio, pensão, guarda"},
                        {"id": "trabalhista", "title": "Direito Trabalhista", "description": "Questões trabalhistas e CLT"},
                        {"id": "previdenciario", "title": "Direito Previdenciário", "description": "INSS, aposentadoria, benefícios"},
                        {"id": "criminal", "title": "Direito Criminal", "description": "Defesa criminal e processos"}
                    ]
                }
            ]
            
            await whatsapp_client.send_list_message(phone_number, area_text, "Selecionar Área", sections)
            session["step"] = ConversationStep.PRACTICE_AREA.value
            
        elif "falar" in message_lower or "advogado" in message_lower or message_lower == "falar_advogado":
            session["data"]["service_type"] = "falar_advogado"
            
            # Mostrar lista de áreas para selecionar o advogado específico
            area_text = "Perfeito! Vou conectar você com o advogado especialista.\n\nQual área jurídica você precisa?"
            
            sections = [
                {
                    "title": "Áreas Jurídicas",
                    "rows": [
                        {"id": "consumidor", "title": "Direito do Consumidor", "description": "Problemas com produtos e serviços"},
                        {"id": "familia", "title": "Direito de Família", "description": "Divórcio, pensão, guarda"},
                        {"id": "trabalhista", "title": "Direito Trabalhista", "description": "Questões trabalhistas e CLT"},
                        {"id": "previdenciario", "title": "Direito Previdenciário", "description": "INSS, aposentadoria, benefícios"},
                        {"id": "criminal", "title": "Direito Criminal", "description": "Defesa criminal e processos"}
                    ]
                }
            ]
            
            await whatsapp_client.send_list_message(phone_number, area_text, "Selecionar Área", sections)
            session["step"] = ConversationStep.LAWYER_AREA_SELECTION.value
            
        else:
            await whatsapp_client.send_text_message(
                phone_number, 
                "Por favor, selecione uma das opções: Andamento Processual, Novo Processo ou Falar com Advogado"
            )
    
    async def handle_process_number_input(self, phone_number: str, message: str, session: Dict[str, Any]) -> None:
        """Handle process number input and query."""
        try:
            # Format process number
            formatted_number = self.format_process_number(message.strip())
            
            if not formatted_number:
                await whatsapp_client.send_text_message(
                    phone_number,
                    "Número do processo inválido. Por favor, digite um número válido no formato: 1003793-80.2024.4.01.3311"
                )
                return
            
            # Send loading message
            await whatsapp_client.send_text_message(
                phone_number,
                "Consultando andamento do processo... Por favor, aguarde."
            )
            
            # Query process information
            process_info = await self.query_process_info(formatted_number)
            
            if process_info:
                # Format and send response
                response_message = self.format_process_response(process_info)
                await whatsapp_client.send_text_message(phone_number, response_message)
            else:
                await whatsapp_client.send_text_message(
                    phone_number,
                    "Não foi possível encontrar informações sobre este processo. Verifique o número e tente novamente ou entre em contato com nossa equipe."
                )
            
            session["step"] = ConversationStep.COMPLETED.value
            
        except Exception as e:
            logger.error(f"Error processing process number query: {str(e)}")
            await whatsapp_client.send_text_message(
                phone_number,
                "Ocorreu um erro ao consultar o processo. Nossa equipe entrará em contato em breve."
            )
            session["step"] = ConversationStep.COMPLETED.value
    
    def format_process_number(self, process_number: str) -> Optional[str]:
        """Format process number from 1003793-80.2024.4.01.3311 to 10037938020244013311."""
        try:
            # Remove all non-numeric characters except dots and dashes
            cleaned = re.sub(r'[^\d\-\.]', '', process_number)
            
            # Check if it matches the expected pattern
            pattern = r'^(\d+)-(\d+)\.(\d+)\.(\d+)\.(\d+)\.(\d+)$'
            match = re.match(pattern, cleaned)
            
            if match:
                # Concatenate all numeric parts
                formatted = ''.join(match.groups())
                return formatted
            
            # If it's already formatted (only numbers), validate length
            if cleaned.isdigit() and len(cleaned) >= 15:
                return cleaned
            
            return None
            
        except Exception as e:
            logger.error(f"Error formatting process number: {str(e)}")
            return None
    
    async def query_process_info(self, process_number: str) -> Optional[Dict[str, Any]]:
        """Query process information from API."""
        try:
            url = "http://0.0.0.0:8080/resumo-processo"
            
            payload = {
                "query": {
                    "bool": {
                        "must": [
                            {
                                "match": {
                                    "numeroProcesso": process_number
                                }
                            }
                        ]
                    }
                }
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload)
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"API returned status {response.status_code}: {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error querying process API: {str(e)}")
            return None
    
    def format_process_response(self, process_info: Dict[str, Any]) -> str:
        """Format process information for user display."""
        try:
            # Extract information
            numero_processo = process_info.get("numeroProcesso", "N/A")
            orgao_julgador = process_info.get("orgaoJulgador", "N/A")
            assuntos = process_info.get("assuntos", [])
            ultima_movimentacao = process_info.get("ultimaMovimentacao", {})
            
            # Format response
            response_parts = [
                f"📋 Processo: {numero_processo}",
                "",
                f"🏛️ Órgão Julgador: {orgao_julgador}",
                ""
            ]
            
            # Add subjects
            if assuntos:
                response_parts.append("📝 Assuntos:")
                for assunto in assuntos:
                    response_parts.append(f"• {assunto}")
                response_parts.append("")
            
            # Add last movement
            if ultima_movimentacao:
                nome_movimento = ultima_movimentacao.get("nome", "N/A")
                data_hora = ultima_movimentacao.get("dataHora", "")
                
                # Format date
                formatted_date = self.format_datetime(data_hora)
                
                response_parts.append(f"📅 Última movimentação: {nome_movimento}")
                if formatted_date:
                    response_parts.append(f"🕒 Data: {formatted_date}")
            
            return "\n".join(response_parts)
            
        except Exception as e:
            logger.error(f"Error formatting process response: {str(e)}")
            return "Erro ao formatar informações do processo."
    
    def format_datetime(self, datetime_str: str) -> str:
        """Format datetime string to readable format."""
        try:
            if not datetime_str:
                return ""
            
            # Parse ISO datetime
            dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
            
            # Format to Brazilian format
            return dt.strftime("%d/%m/%Y às %H:%M")
            
        except Exception as e:
            logger.error(f"Error formatting datetime: {str(e)}")
            return datetime_str
    
    async def handle_lawyer_area_selection(self, phone_number: str, message: str, session: Dict[str, Any]) -> None:
        """Handle area selection for lawyer contact."""
        message_lower = message.lower()
        
        area_map = {
            "consumidor": "consumidor",
            "familia": "familia",
            "família": "familia",
            "trabalhista": "trabalhista",
            "previdenciario": "previdenciario",
            "previdenciário": "previdenciario",
            "criminal": "criminal"
        }
        
        selected_area_key = None
        for key, value in area_map.items():
            if key in message_lower:
                selected_area_key = value
                break
        
        if not selected_area_key:
            await whatsapp_client.send_text_message(
                phone_number, 
                "Por favor, selecione uma das áreas disponíveis."
            )
            return
        
        # Get lawyer info for the selected area
        lawyer_info = self.lawyers_by_area.get(selected_area_key)
        if not lawyer_info:
            await whatsapp_client.send_text_message(
                phone_number, 
                "Área não encontrada. Por favor, selecione uma das áreas disponíveis."
            )
            return
        
        session["data"]["selected_lawyer_area"] = selected_area_key
        
        # Send contact to specific lawyer
        await self.forward_to_specific_lawyer(phone_number, session, lawyer_info)
    
    async def forward_to_specific_lawyer(self, phone_number: str, session: Dict[str, Any], lawyer_info: Dict[str, str]) -> None:
        """Forward user contact to specific lawyer by area."""
        try:
            lawyer_name = lawyer_info["name"]
            lawyer_phone = lawyer_info["phone"]
            contact_name = session.get("contact_name", "Cliente")
            selected_area = session["data"].get("selected_lawyer_area", "")
            
            # Mensagem para o usuário
            user_message = f"Perfeito! Seu contato foi enviado para {lawyer_name}, especialista na área selecionada.\n\nEle entrará em contato em breve!"
            await whatsapp_client.send_text_message(phone_number, user_message)
            
            # Mensagem para o advogado específico
            area_names = {
                "consumidor": "Direito do Consumidor",
                "familia": "Direito de Família", 
                "trabalhista": "Direito Trabalhista",
                "previdenciario": "Direito Previdenciário",
                "criminal": "Direito Criminal"
            }
            
            area_name = area_names.get(selected_area, selected_area)
            
            lawyer_message = f"🔔 Novo cliente solicitando contato - {area_name}:\n\n📱 Telefone: {phone_number}\n👤 Nome: {contact_name}\n⚖️ Área: {area_name}\n⏰ Horário: Agora\n\n💬 Cliente solicitou falar diretamente com advogado especialista."
            await whatsapp_client.send_text_message(lawyer_phone, lawyer_message)
            
            # Log para controle
            logger.info(f"LAWYER CONTACT - User: {phone_number} forwarded to {lawyer_name} ({lawyer_phone}) for {area_name}")
            
            session["step"] = ConversationStep.COMPLETED.value
            
        except Exception as e:
            logger.error(f"Error forwarding to specific lawyer: {str(e)}")
            await whatsapp_client.send_text_message(
                phone_number, 
                "Ocorreu um erro ao conectar com o advogado. Nossa equipe entrará em contato em breve."
            )
    
    async def forward_to_lawyer(self, phone_number: str, session: Dict[str, Any]) -> None:
        """Forward user contact to lawyer."""
        try:
            lawyer_phone = "5573982005612"  # Número do advogado
            contact_name = session.get("contact_name", "Cliente")
            
            # Mensagem para o usuário
            user_message = "Perfeito! Estou conectando você diretamente com nosso advogado.\n\nEle entrará em contato em breve!"
            await whatsapp_client.send_text_message(phone_number, user_message)
            
            # Mensagem para o advogado
            lawyer_message = f"🔔 Novo cliente solicitando contato:\n\n📱 Telefone: {phone_number}\n👤 Nome: {contact_name}\n⏰ Horário: Agora\n\n💬 Cliente solicitou falar diretamente com advogado."
            await whatsapp_client.send_text_message(lawyer_phone, lawyer_message)
            
            # Log para controle
            logger.info(f"LAWYER CONTACT - User: {phone_number} forwarded to lawyer: {lawyer_phone}")
            
            session["step"] = ConversationStep.COMPLETED.value
            
        except Exception as e:
            logger.error(f"Error forwarding to lawyer: {str(e)}")
            await whatsapp_client.send_text_message(
                phone_number, 
                "Ocorreu um erro ao conectar com o advogado. Nossa equipe entrará em contato em breve."
            )
    
    async def handle_practice_area(self, phone_number: str, message: str, session: Dict[str, Any]) -> None:
        """Handle practice area selection."""
        message_lower = message.lower()
        
        area_map = {
            "consumidor": "Consumidor",
            "familia": "Família",
            "família": "Família",
            "trabalhista": "Trabalhista",
            "previdenciario": "Previdenciário",
            "previdenciário": "Previdenciário",
            "criminal": "Criminal"
        }
        
        selected_area = None
        for key, value in area_map.items():
            if key in message_lower:
                selected_area = value
                break
        
        if not selected_area:
            await whatsapp_client.send_text_message(
                phone_number, 
                "Por favor, selecione uma das áreas disponíveis."
            )
            return
        
        session["data"]["practice_area"] = selected_area
        
        # Check flow type to determine next step
        client_type = session["data"].get("client_type")
        service_type = session["data"].get("service_type")
        
        # Both "Primeira Consulta" and "Já sou cliente + Novo processo" go directly to scheduling type
        if (client_type == "primeira_consulta" or 
            (client_type == "ja_sou_cliente" and service_type == "novo_processo")):
            
            # Skip scheduling question and go directly to scheduling type
            session["data"]["service_type"] = "agendar_consulta"
            
            type_text = f"Perfeito! Você precisa de ajuda com {selected_area}.\n\nComo você prefere a consulta?"
            
            buttons = [
                {"id": "presencial", "title": "Presencial"},
                {"id": "online", "title": "Online"}
            ]
            
            await whatsapp_client.send_button_message(phone_number, type_text, buttons)
            session["step"] = ConversationStep.SCHEDULING_TYPE.value
        else:
            # This shouldn't happen in current flow, but keeping as fallback
            scheduling_text = f"Entendi! Você precisa de ajuda com {selected_area}.\n\nGostaria de agendar uma consulta?"
            
            buttons = [
                {"id": "agendar_consulta", "title": "Agendar uma Consulta"},
                {"id": "atualizacao_processual", "title": "Atualização Processual"}
            ]
            
            await whatsapp_client.send_button_message(phone_number, scheduling_text, buttons)
            session["step"] = ConversationStep.SCHEDULING.value
    
    async def handle_scheduling(self, phone_number: str, message: str, session: Dict[str, Any]) -> None:
        """Handle scheduling preference."""
        message_lower = message.lower()
        
        if "agendar" in message_lower or message_lower == "agendar_consulta":
            session["data"]["service_type"] = "agendar_consulta"
            
            # Ask about scheduling type
            type_text = "Perfeito! Como você prefere a consulta?"
            
            buttons = [
                {"id": "presencial", "title": "Presencial"},
                {"id": "online", "title": "Online"}
            ]
            
            await whatsapp_client.send_button_message(phone_number, type_text, buttons)
            session["step"] = ConversationStep.SCHEDULING_TYPE.value
            
        elif "atualizacao" in message_lower or "atualização" in message_lower or message_lower == "andamento_processual":
            session["data"]["service_type"] = "andamento_processual"
            await self.complete_conversation(phone_number, session)
        else:
            await whatsapp_client.send_text_message(
                phone_number, 
                "Por favor, selecione uma das opções disponíveis."
            )
    
    async def handle_scheduling_type(self, phone_number: str, message: str, session: Dict[str, Any]) -> None:
        """Handle scheduling type selection."""
        message_lower = message.lower()
        
        if "presencial" in message_lower:
            session["data"]["scheduling_type"] = "presencial"
        elif "online" in message_lower:
            session["data"]["scheduling_type"] = "online"
        else:
            await whatsapp_client.send_text_message(
                phone_number, 
                "Por favor, escolha entre Presencial ou Online."
            )
            return
        
        await self.complete_conversation(phone_number, session)
    
    async def complete_conversation(self, phone_number: str, session: Dict[str, Any]) -> None:
        """Complete the conversation and handoff."""
        data = session["data"]
        
        # Create summary
        summary_parts = [
            "Informações coletadas:",
            f"• Tipo: {data.get('client_type', 'N/A')}",
            f"• Área: {data.get('practice_area', 'N/A')}"
        ]
        
        service_type = data.get('service_type', '')
        if service_type == "agendar_consulta":
            summary_parts.append(f"• Serviço: Agendamento de Consulta ({data.get('scheduling_type', 'N/A')})")
        elif service_type == "andamento_processual":
            summary_parts.append("• Serviço: Atualização Processual")
        
        summary = "\n".join(summary_parts)
        
        # Send completion message with button for new request
        completion_text = f"{summary}\n\nPerfeito! Nossa equipe de recepção entrará em contato em breve para dar continuidade ao seu atendimento.\n\nObrigado por escolher a Advocacia Direta!\n\nPrecisa de mais alguma coisa?"
        
        buttons = [
            {"id": "nova_solicitacao", "title": "Nova Solicitação"}
        ]
        
        await whatsapp_client.send_button_message(phone_number, completion_text, buttons)
        
        # Log for reception team (in a real system, this would go to CRM)
        logger.info(f"HANDOFF - Phone: {phone_number}, Data: {data}")
        
        session["step"] = ConversationStep.COMPLETED.value
    
    async def handle_completed(self, phone_number: str, session: Dict[str, Any]) -> None:
        """Handle messages after conversation is completed."""
        message_lower = session.get("last_message", "").lower()
        
        # Check if user wants a new request
        if "nova" in message_lower or message_lower == "nova_solicitacao":
            # Reset to practice area selection
            session["step"] = ConversationStep.PRACTICE_AREA.value
            session["data"] = {}  # Clear previous data but keep session
            
            # Ask about practice area again using interactive list
            area_text = "Qual área jurídica você precisa de ajuda?"
            
            sections = [
                {
                    "title": "Áreas Jurídicas",
                    "rows": [
                        {"id": "consumidor", "title": "Direito do Consumidor", "description": "Problemas com produtos e serviços"},
                        {"id": "familia", "title": "Direito de Família", "description": "Divórcio, pensão, guarda"},
                        {"id": "trabalhista", "title": "Direito Trabalhista", "description": "Questões trabalhistas e CLT"},
                        {"id": "previdenciario", "title": "Direito Previdenciário", "description": "INSS, aposentadoria, benefícios"},
                        {"id": "criminal", "title": "Direito Criminal", "description": "Defesa criminal e processos"}
                    ]
                }
            ]
            
            await whatsapp_client.send_list_message(phone_number, area_text, "Selecionar Área", sections)
        else:
            # Standard completed message with new request button
            completion_text = "Sua solicitação já foi registrada! Nossa equipe entrará em contato em breve.\n\nPrecisa de mais alguma coisa?"
            buttons = [
                {"id": "nova_solicitacao", "title": "Nova Solicitação"}
            ]
            
            await whatsapp_client.send_button_message(phone_number, completion_text, buttons)
    
    async def handle_escape_command(self, phone_number: str) -> None:
        """Handle escape commands like 'atendente'."""
        session = self.get_session(phone_number)
        data = session.get("data", {})
        
        # Log handoff request
        logger.info(f"ESCAPE HANDOFF - Phone: {phone_number}, Data: {data}")
        
        await whatsapp_client.send_text_message(
            phone_number,
            "🔄 Transferindo para atendimento humano...\n\nUm de nossos atendentes entrará em contato em breve!"
        )
        
        session["step"] = ConversationStep.COMPLETED.value


# Global instance for MVP
conversation_service = ConversationService()