"""
Conversation flow engine for managing WhatsApp bot interactions.
"""

import logging
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum

from app.services.message_builder import MessageBuilder, get_message_builder
from app.services.state_manager import StateManager
from app.services.whatsapp_client import InteractiveMessage
from app.services.scheduling_service import SchedulingService, get_scheduling_service
from app.services.error_handler import get_error_handler, ErrorContext, ErrorType
from app.services.timeout_service import get_timeout_service

logger = logging.getLogger(__name__)


class FlowStep(Enum):
    """Conversation flow steps."""
    WELCOME = "welcome"
    CLIENT_TYPE = "client_type"
    PRACTICE_AREA = "practice_area"
    SCHEDULING_OFFER = "scheduling_offer"
    SCHEDULING_TYPE = "scheduling_type"
    CONFIRMATION = "confirmation"
    HANDOFF = "handoff"
    COMPLETED = "completed"


class MessageDirection(Enum):
    """Message direction types."""
    INBOUND = "inbound"
    OUTBOUND = "outbound"


@dataclass
class FlowResponse:
    """Response from flow processing."""
    messages: List[Dict[str, Any]]
    next_step: Optional[FlowStep]
    should_handoff: bool
    collected_data: Dict[str, Any]
    analytics_events: List[Dict[str, Any]]


@dataclass
class ProcessedMessage:
    """Processed incoming message."""
    content: str
    message_type: str
    button_id: Optional[str] = None
    is_escape_command: bool = False
    is_valid_input: bool = True


class FlowEngine:
    """Manages conversation flow logic and state transitions."""
    
    def __init__(
        self, 
        state_manager: StateManager,
        message_builder: Optional[MessageBuilder] = None,
        scheduling_service: Optional[SchedulingService] = None
    ):
        self.state_manager = state_manager
        self.message_builder = message_builder or get_message_builder()
        self.scheduling_service = scheduling_service or get_scheduling_service()
        self.timeout_service = get_timeout_service(state_manager, self.message_builder)
        
        # Define escape commands that trigger immediate handoff
        self.escape_commands = [
            "falar com atendente",
            "atendimento humano", 
            "atendente",
            "humano",
            "pessoa",
            "operador",
            "sair",
            "parar",
            "cancelar",
            "help",
            "ajuda",
            "não entendi",
            "nao entendi",
            "não sei",
            "nao sei",
            "erro",
            "problema",
            "bug",
            "travou",
            "não funciona",
            "nao funciona"
        ]
        
        # Define fallback triggers for unexpected inputs
        self.fallback_triggers = [
            "não entendo",
            "nao entendo", 
            "confuso",
            "perdido",
            "não sei o que fazer",
            "nao sei o que fazer",
            "como funciona",
            "não está funcionando",
            "nao esta funcionando"
        ]
        
        # Define valid button responses for each step
        self.valid_responses = {
            FlowStep.CLIENT_TYPE: ["client_new", "client_existing"],
            FlowStep.PRACTICE_AREA: [
                "area_civil", "area_trabalhista", "area_criminal",
                "area_familia", "area_empresarial", "area_outros"
            ],
            FlowStep.SCHEDULING_OFFER: ["schedule_yes", "schedule_no"],
            FlowStep.SCHEDULING_TYPE: ["type_presencial", "type_online"],
            FlowStep.WELCOME: ["continue_flow", "restart_flow", "human_agent"]
        }
        
        # Define universal button responses that can be handled at any step
        self.universal_responses = {
            "human_agent": self._handle_escape_command,
            "accept_handoff": self._handle_escape_command,
            "restart_flow": self._handle_restart_flow,
            "try_again": self._handle_try_again,
            "explain_options": self._handle_explain_options,
            "continue_bot": self._handle_continue_bot
        }
    
    async def process_message(
        self, 
        user_id: str, 
        phone_number: str,
        message: Dict[str, Any]
    ) -> FlowResponse:
        """Process incoming message and return appropriate response with comprehensive error handling."""
        error_handler = get_error_handler()
        context = ErrorContext(
            user_id=user_id,
            phone_number=phone_number,
            message_content=str(message.get("text", {}).get("body", ""))[:100]  # Truncate for logging
        )
        
        try:
            # Get or create user session with error handling
            session = await self._safe_get_or_create_session(phone_number, context)
            if not session:
                return await self._create_system_error_response("Não foi possível iniciar a sessão")
            
            context.session_id = str(session.id)
            context.current_step = session.current_step
            
            # Handle user response after timeout if applicable
            if self.timeout_service:
                await self.timeout_service.handle_user_response_after_timeout(session.id)
            
            # Process the incoming message
            processed_msg = self._process_incoming_message(message)
            
            # Log the incoming message with error handling
            try:
                await self.state_manager.add_message(
                    session.id,
                    direction=MessageDirection.INBOUND.value,
                    content=processed_msg.content,
                    message_type=processed_msg.message_type,
                    metadata={"button_id": processed_msg.button_id}
                )
            except Exception as e:
                logger.warning(f"Failed to log incoming message: {str(e)}")
                # Continue processing even if logging fails
            
            # Check for escape commands
            if processed_msg.is_escape_command:
                return await self._handle_escape_command(session)
            
            # Check for universal button responses
            if processed_msg.button_id and processed_msg.button_id in self.universal_responses:
                handler = self.universal_responses[processed_msg.button_id]
                return await handler(session)
            
            # Get current step or start flow
            current_step = self._get_current_step(session)
            context.current_step = current_step.value
            
            # Process based on current step with error handling
            response = await self._process_step_with_error_handling(
                session, processed_msg, current_step, context
            )
            
            # Log outbound messages with error handling
            await self._safe_log_outbound_messages(session.id, response.messages)
            
            # Record analytics events with error handling
            await self._safe_record_analytics_events(session.id, response.analytics_events)
            
            return response
            
        except Exception as e:
            # Handle unexpected errors with comprehensive error handling
            error_response = await error_handler.handle_error(e, context)
            
            logger.error(
                f"Critical error processing message for user {user_id}: {str(e)}",
                extra={"error_response": error_response.__dict__, "context": context.__dict__}
            )
            
            # Return appropriate error response based on error handling result
            if error_response.escalate_to_human:
                return await self._create_escalation_response(error_response)
            else:
                return await self._create_system_error_response(
                    error_response.user_message or 
                    "Desculpe, ocorreu um erro. Por favor, tente novamente ou digite 'atendente' para falar com nossa equipe."
                )
    
    async def _safe_get_or_create_session(self, phone_number: str, context: ErrorContext):
        """Safely get or create session with error handling."""
        error_handler = get_error_handler()
        
        try:
            return await error_handler.retry_with_backoff(
                self.state_manager.get_or_create_session,
                ErrorType.DATABASE,
                context,
                phone_number
            )
        except Exception as e:
            logger.error(f"Failed to get/create session for {phone_number}: {str(e)}")
            return None
    
    async def _process_step_with_error_handling(
        self, 
        session, 
        processed_msg: ProcessedMessage, 
        current_step: FlowStep,
        context: ErrorContext
    ) -> FlowResponse:
        """Process flow step with error handling."""
        try:
            # Process based on current step
            if current_step == FlowStep.WELCOME:
                return await self._handle_welcome_step(session, processed_msg)
            elif current_step == FlowStep.CLIENT_TYPE:
                return await self._handle_client_type_step(session, processed_msg)
            elif current_step == FlowStep.PRACTICE_AREA:
                return await self._handle_practice_area_step(session, processed_msg)
            elif current_step == FlowStep.SCHEDULING_OFFER:
                return await self._handle_scheduling_offer_step(session, processed_msg)
            elif current_step == FlowStep.SCHEDULING_TYPE:
                return await self._handle_scheduling_type_step(session, processed_msg)
            else:
                # Fallback for unexpected states
                return await self._handle_error_fallback(session)
                
        except Exception as e:
            logger.error(f"Error in step {current_step.value}: {str(e)}")
            
            # Handle flow logic errors
            error_handler = get_error_handler()
            error_response = await error_handler.handle_error(e, context)
            
            if error_response.fallback_action == "reset_to_welcome":
                return await self._handle_error_fallback(session)
            elif error_response.escalate_to_human:
                return await self._handle_escape_command(session)
            else:
                # Return generic error response
                return await self._create_system_error_response(
                    error_response.user_message or 
                    "Houve um problema no processamento. Vou reiniciar nossa conversa."
                )
    
    async def _safe_log_outbound_messages(self, session_id, messages: List[Dict]):
        """Safely log outbound messages with error handling."""
        for msg in messages:
            try:
                await self.state_manager.add_message(
                    session_id,
                    direction=MessageDirection.OUTBOUND.value,
                    content=msg.get("content", ""),
                    message_type=msg.get("type", "text"),
                    metadata=msg.get("metadata", {})
                )
            except Exception as e:
                logger.warning(f"Failed to log outbound message: {str(e)}")
                # Continue with other messages even if one fails
    
    async def _safe_record_analytics_events(self, session_id, events: List[Dict]):
        """Safely record analytics events with error handling."""
        for event in events:
            try:
                await self.state_manager.record_analytics_event(
                    session_id,
                    event["event_type"],
                    event.get("step_id"),
                    event.get("event_data", {})
                )
            except Exception as e:
                logger.warning(f"Failed to record analytics event: {str(e)}")
                # Continue with other events even if one fails
    
    async def _create_system_error_response(self, message: str) -> FlowResponse:
        """Create a system error response."""
        return FlowResponse(
            messages=[{
                "type": "text",
                "content": message
            }],
            next_step=None,
            should_handoff=False,
            collected_data={},
            analytics_events=[{
                "event_type": "system_error",
                "event_data": {"error_message": message}
            }]
        )
    
    async def _create_escalation_response(self, error_response) -> FlowResponse:
        """Create an escalation response for critical errors."""
        return FlowResponse(
            messages=[{
                "type": "text",
                "content": error_response.user_message or 
                         "Nosso sistema está enfrentando dificuldades. Nossa equipe entrará em contato."
            }],
            next_step=None,
            should_handoff=True,
            collected_data={"escalation_reason": "system_error"},
            analytics_events=[{
                "event_type": "error_escalation",
                "event_data": {
                    "severity": error_response.severity.value,
                    "escalation_reason": "system_error"
                }
            }]
        )
    
    def _process_incoming_message(self, message: Dict[str, Any]) -> ProcessedMessage:
        """Process and validate incoming message."""
        content = ""
        message_type = "text"
        button_id = None
        
        # Extract content based on message type
        if message.get("type") == "text":
            content = message.get("text", {}).get("body", "").strip()
        elif message.get("type") == "interactive":
            interactive = message.get("interactive", {})
            if interactive.get("type") == "button_reply":
                button_reply = interactive.get("button_reply", {})
                button_id = button_reply.get("id", "")
                content = button_reply.get("title", "")
                message_type = "button"
        
        # Check for escape commands
        is_escape_command = self._is_escape_command(content)
        
        return ProcessedMessage(
            content=content,
            message_type=message_type,
            button_id=button_id,
            is_escape_command=is_escape_command,
            is_valid_input=len(content.strip()) > 0
        )
    
    def _is_escape_command(self, content: str) -> bool:
        """Check if message contains escape command."""
        content_lower = content.lower().strip()
        
        # Direct match for escape commands
        if any(cmd in content_lower for cmd in self.escape_commands):
            return True
        
        # Check for fallback triggers that should also trigger handoff
        if any(trigger in content_lower for trigger in self.fallback_triggers):
            return True
        
        # Check for repeated invalid inputs (user seems confused)
        if len(content_lower) > 50 and any(word in content_lower for word in ["não", "nao", "confuso", "perdido"]):
            return True
        
        return False
    
    def _get_current_step(self, session) -> FlowStep:
        """Get current flow step for session."""
        if not session.current_step:
            return FlowStep.WELCOME
        
        try:
            return FlowStep(session.current_step)
        except ValueError:
            logger.warning(f"Invalid step '{session.current_step}' for session {session.id}")
            return FlowStep.WELCOME
    
    async def _handle_welcome_step(self, session, processed_msg: ProcessedMessage) -> FlowResponse:
        """Handle welcome step - start of conversation."""
        # Send welcome message
        welcome_msg = self.message_builder.build_welcome_message()
        
        # Update session to client_type step
        await self.state_manager.update_session_step(session.id, FlowStep.CLIENT_TYPE.value)
        
        return FlowResponse(
            messages=[{
                "type": "interactive",
                "content": welcome_msg.body,
                "interactive_data": welcome_msg.to_dict(),
                "metadata": {"step": FlowStep.WELCOME.value}
            }],
            next_step=FlowStep.CLIENT_TYPE,
            should_handoff=False,
            collected_data={},
            analytics_events=[{
                "event_type": "flow_start",
                "step_id": FlowStep.WELCOME.value,
                "event_data": {"phone_number": session.phone_number}
            }]
        )
    
    async def _handle_client_type_step(self, session, processed_msg: ProcessedMessage) -> FlowResponse:
        """Handle client type selection step."""
        if not processed_msg.button_id or processed_msg.button_id not in self.valid_responses[FlowStep.CLIENT_TYPE]:
            return await self._handle_invalid_input(session, FlowStep.CLIENT_TYPE)
        
        # Update conversation state
        await self.state_manager.update_conversation_data(
            session.id, 
            {"client_type": processed_msg.button_id}
        )
        
        # Send confirmation message
        confirmation_msg = self.message_builder.build_client_type_confirmation(processed_msg.button_id)
        
        # Send practice area selection
        practice_area_msg = self.message_builder.build_practice_area_message()
        
        # Update session to practice_area step
        await self.state_manager.update_session_step(session.id, FlowStep.PRACTICE_AREA.value)
        
        messages = [
            {
                "type": "text",
                "content": confirmation_msg,
                "metadata": {"step": FlowStep.CLIENT_TYPE.value}
            },
            {
                "type": "interactive",
                "content": practice_area_msg.body,
                "interactive_data": practice_area_msg.to_dict(),
                "metadata": {"step": FlowStep.PRACTICE_AREA.value}
            }
        ]
        
        # Add extended practice area options if needed
        extended_msg = self.message_builder.build_practice_area_extended_message()
        if extended_msg.buttons:
            messages.append({
                "type": "interactive",
                "content": extended_msg.body,
                "interactive_data": extended_msg.to_dict(),
                "metadata": {"step": FlowStep.PRACTICE_AREA.value, "extended": True}
            })
        
        return FlowResponse(
            messages=messages,
            next_step=FlowStep.PRACTICE_AREA,
            should_handoff=False,
            collected_data={"client_type": processed_msg.button_id},
            analytics_events=[{
                "event_type": "step_completed",
                "step_id": FlowStep.CLIENT_TYPE.value,
                "event_data": {"client_type": processed_msg.button_id}
            }]
        )
    
    async def _handle_practice_area_step(self, session, processed_msg: ProcessedMessage) -> FlowResponse:
        """Handle practice area selection step."""
        if not processed_msg.button_id or processed_msg.button_id not in self.valid_responses[FlowStep.PRACTICE_AREA]:
            return await self._handle_invalid_input(session, FlowStep.PRACTICE_AREA)
        
        # Update conversation state
        await self.state_manager.update_conversation_data(
            session.id,
            {"practice_area": processed_msg.button_id}
        )
        
        # Send scheduling offer
        scheduling_msg = self.message_builder.build_scheduling_offer_message(processed_msg.button_id)
        
        # Update session to scheduling_offer step
        await self.state_manager.update_session_step(session.id, FlowStep.SCHEDULING_OFFER.value)
        
        return FlowResponse(
            messages=[{
                "type": "interactive",
                "content": scheduling_msg.body,
                "interactive_data": scheduling_msg.to_dict(),
                "metadata": {"step": FlowStep.SCHEDULING_OFFER.value}
            }],
            next_step=FlowStep.SCHEDULING_OFFER,
            should_handoff=False,
            collected_data={"practice_area": processed_msg.button_id},
            analytics_events=[{
                "event_type": "step_completed",
                "step_id": FlowStep.PRACTICE_AREA.value,
                "event_data": {"practice_area": processed_msg.button_id}
            }]
        )
    
    async def _handle_scheduling_offer_step(self, session, processed_msg: ProcessedMessage) -> FlowResponse:
        """Handle scheduling offer response step."""
        if not processed_msg.button_id or processed_msg.button_id not in self.valid_responses[FlowStep.SCHEDULING_OFFER]:
            return await self._handle_invalid_input(session, FlowStep.SCHEDULING_OFFER)
        
        wants_scheduling = processed_msg.button_id == "schedule_yes"
        
        # Update conversation state
        await self.state_manager.update_conversation_data(
            session.id,
            {"wants_scheduling": wants_scheduling}
        )
        
        if wants_scheduling:
            # Ask for scheduling type
            scheduling_type_msg = self.message_builder.build_scheduling_type_message()
            
            # Update session to scheduling_type step
            await self.state_manager.update_session_step(session.id, FlowStep.SCHEDULING_TYPE.value)
            
            return FlowResponse(
                messages=[{
                    "type": "interactive",
                    "content": scheduling_type_msg.body,
                    "interactive_data": scheduling_type_msg.to_dict(),
                    "metadata": {"step": FlowStep.SCHEDULING_TYPE.value}
                }],
                next_step=FlowStep.SCHEDULING_TYPE,
                should_handoff=False,
                collected_data={"wants_scheduling": wants_scheduling},
                analytics_events=[{
                    "event_type": "step_completed",
                    "step_id": FlowStep.SCHEDULING_OFFER.value,
                    "event_data": {"wants_scheduling": wants_scheduling}
                }]
            )
        else:
            # Information only - proceed to handoff
            return await self._handle_information_only_completion(session)
    
    async def _handle_scheduling_type_step(self, session, processed_msg: ProcessedMessage) -> FlowResponse:
        """Handle scheduling type selection step."""
        if not processed_msg.button_id or processed_msg.button_id not in self.valid_responses[FlowStep.SCHEDULING_TYPE]:
            return await self._handle_invalid_input(session, FlowStep.SCHEDULING_TYPE)
        
        # Update conversation state
        await self.state_manager.update_conversation_data(
            session.id,
            {"scheduling_preference": processed_msg.button_id}
        )
        
        # Get updated conversation state for validation
        conversation_state = await self.state_manager.get_conversation_state(session.id)
        
        # Validate scheduling data
        validation = self.scheduling_service.validate_scheduling_data(conversation_state)
        if not validation["is_valid"]:
            logger.warning(f"Invalid scheduling data for session {session.id}: {validation}")
            # Still proceed but log the issue
        
        # Create scheduling request for better data structure
        try:
            scheduling_request = self.scheduling_service.create_scheduling_request(session, conversation_state)
            confirmation_msg = self.scheduling_service.format_scheduling_confirmation(scheduling_request)
        except Exception as e:
            logger.error(f"Error creating scheduling request: {str(e)}")
            # Fallback to basic confirmation
            confirmation_msg = self.message_builder.build_scheduling_confirmation_message(processed_msg.button_id)
        
        # Mark flow as completed
        await self.state_manager.update_session_step(session.id, FlowStep.COMPLETED.value)
        await self.state_manager.mark_flow_completed(session.id)
        
        return FlowResponse(
            messages=[{
                "type": "text",
                "content": confirmation_msg,
                "metadata": {"step": FlowStep.CONFIRMATION.value}
            }],
            next_step=FlowStep.COMPLETED,
            should_handoff=True,
            collected_data={"scheduling_preference": processed_msg.button_id},
            analytics_events=[
                {
                    "event_type": "step_completed",
                    "step_id": FlowStep.SCHEDULING_TYPE.value,
                    "event_data": {"scheduling_preference": processed_msg.button_id}
                },
                {
                    "event_type": "flow_completed",
                    "step_id": FlowStep.COMPLETED.value,
                    "event_data": {"completion_type": "scheduling"}
                }
            ]
        )
    
    async def _handle_information_only_completion(self, session) -> FlowResponse:
        """Handle completion for information-only requests."""
        # Get collected data
        conversation_state = await self.state_manager.get_conversation_state(session.id)
        
        # Create information request for better data structure
        try:
            information_request = self.scheduling_service.create_information_request(session, conversation_state)
            info_msg = self.scheduling_service.format_information_confirmation(information_request)
        except Exception as e:
            logger.error(f"Error creating information request: {str(e)}")
            # Fallback to basic message
            practice_area = conversation_state.practice_area if conversation_state else "area_outros"
            info_msg = self.message_builder.build_information_only_message(practice_area)
        
        # Mark flow as completed
        await self.state_manager.update_session_step(session.id, FlowStep.COMPLETED.value)
        await self.state_manager.mark_flow_completed(session.id)
        
        return FlowResponse(
            messages=[{
                "type": "text",
                "content": info_msg,
                "metadata": {"step": FlowStep.CONFIRMATION.value}
            }],
            next_step=FlowStep.COMPLETED,
            should_handoff=True,
            collected_data={},
            analytics_events=[{
                "event_type": "flow_completed",
                "step_id": FlowStep.COMPLETED.value,
                "event_data": {"completion_type": "information_only"}
            }]
        )
    
    async def _handle_escape_command(self, session) -> FlowResponse:
        """Handle escape command - immediate handoff with context preservation."""
        escape_msg = self.message_builder.build_escape_command_message()
        
        # Get current conversation state for context preservation
        conversation_state = await self.state_manager.get_conversation_state(session.id)
        
        # Collect current context data
        context_data = {
            "current_step": session.current_step,
            "collected_data": session.collected_data or {},
            "conversation_state": {
                "client_type": conversation_state.client_type if conversation_state else None,
                "practice_area": conversation_state.practice_area if conversation_state else None,
                "wants_scheduling": conversation_state.wants_scheduling if conversation_state else None,
                "scheduling_preference": conversation_state.scheduling_preference if conversation_state else None,
                "custom_requests": conversation_state.custom_requests if conversation_state else []
            } if conversation_state else {}
        }
        
        # Mark handoff as triggered
        await self.state_manager.trigger_handoff(session.id)
        
        # Record detailed analytics for handoff
        await self.state_manager.record_analytics_event(
            session.id,
            "escape_command_triggered",
            session.current_step or "unknown",
            {
                "trigger": "escape_command",
                "context_preserved": True,
                "conversation_progress": context_data
            }
        )
        
        return FlowResponse(
            messages=[{
                "type": "text",
                "content": escape_msg,
                "metadata": {
                    "step": "escape_command",
                    "handoff_context": context_data
                }
            }],
            next_step=None,
            should_handoff=True,
            collected_data=context_data,
            analytics_events=[{
                "event_type": "handoff_triggered",
                "step_id": session.current_step or "unknown",
                "event_data": {
                    "trigger": "escape_command",
                    "context_preserved": True
                }
            }]
        )
    
    async def _handle_invalid_input(self, session, current_step: FlowStep) -> FlowResponse:
        """Handle invalid input with enhanced error message and fallback options."""
        # Check if user has had multiple invalid inputs (track in session data)
        collected_data = session.collected_data or {}
        invalid_count = collected_data.get("invalid_input_count", 0) + 1
        
        # Update invalid input count
        await self.state_manager.update_session_step(
            session.id, 
            current_step.value,
            {**collected_data, "invalid_input_count": invalid_count}
        )
        
        # If too many invalid inputs, offer handoff
        if invalid_count >= 3:
            return await self._handle_repeated_invalid_inputs(session, current_step)
        
        # Build appropriate error message based on step and count
        if invalid_count == 1:
            error_msg = self.message_builder.build_error_fallback_message()
        else:
            error_msg = self.message_builder.build_enhanced_error_message(current_step.value, invalid_count)
        
        return FlowResponse(
            messages=[{
                "type": "interactive",
                "content": error_msg.body,
                "interactive_data": error_msg.to_dict(),
                "metadata": {
                    "step": "error_fallback",
                    "invalid_count": invalid_count,
                    "current_step": current_step.value
                }
            }],
            next_step=current_step,  # Stay on current step
            should_handoff=False,
            collected_data={"invalid_input_count": invalid_count},
            analytics_events=[{
                "event_type": "invalid_input",
                "step_id": current_step.value,
                "event_data": {
                    "current_step": current_step.value,
                    "invalid_count": invalid_count,
                    "escalation_threshold": invalid_count >= 2
                }
            }]
        )
    
    async def _handle_repeated_invalid_inputs(self, session, current_step: FlowStep) -> FlowResponse:
        """Handle repeated invalid inputs by offering human handoff."""
        handoff_offer_msg = self.message_builder.build_handoff_offer_message()
        
        # Record that user is struggling
        await self.state_manager.record_analytics_event(
            session.id,
            "user_struggling",
            current_step.value,
            {
                "invalid_input_count": 3,
                "offered_handoff": True,
                "current_step": current_step.value
            }
        )
        
        return FlowResponse(
            messages=[{
                "type": "interactive",
                "content": handoff_offer_msg.body,
                "interactive_data": handoff_offer_msg.to_dict(),
                "metadata": {
                    "step": "handoff_offer",
                    "reason": "repeated_invalid_inputs"
                }
            }],
            next_step=current_step,
            should_handoff=False,  # Don't force handoff, let user choose
            collected_data={"handoff_offered": True},
            analytics_events=[{
                "event_type": "handoff_offered",
                "step_id": current_step.value,
                "event_data": {
                    "reason": "repeated_invalid_inputs",
                    "invalid_count": 3
                }
            }]
        )
    
    async def _handle_error_fallback(self, session) -> FlowResponse:
        """Handle unexpected errors with fallback."""
        error_msg = self.message_builder.build_error_fallback_message()
        
        # Reset to welcome step
        await self.state_manager.update_session_step(session.id, FlowStep.WELCOME.value)
        
        return FlowResponse(
            messages=[{
                "type": "interactive",
                "content": error_msg.body,
                "interactive_data": error_msg.to_dict(),
                "metadata": {"step": "error_fallback"}
            }],
            next_step=FlowStep.WELCOME,
            should_handoff=False,
            collected_data={},
            analytics_events=[{
                "event_type": "error_fallback",
                "step_id": "unknown",
                "event_data": {"action": "reset_to_welcome"}
            }]
        )
    
    async def handle_reengagement(self, session) -> FlowResponse:
        """Handle re-engagement for inactive users."""
        reengagement_msg = self.message_builder.build_reengagement_message()
        
        return FlowResponse(
            messages=[{
                "type": "interactive",
                "content": reengagement_msg.body,
                "interactive_data": reengagement_msg.to_dict(),
                "metadata": {"step": "reengagement"}
            }],
            next_step=FlowStep.WELCOME,
            should_handoff=False,
            collected_data={},
            analytics_events=[{
                "event_type": "reengagement_sent",
                "step_id": session.current_step or "unknown",
                "event_data": {"session_id": str(session.id)}
            }]
        )
    
    async def reset_flow(self, session_id: str) -> None:
        """Reset conversation flow to beginning."""
        await self.state_manager.reset_session(session_id)
    
    def validate_input(self, input_text: str, expected_step: FlowStep) -> bool:
        """Validate user input for specific step."""
        if expected_step not in self.valid_responses:
            return True  # No validation rules defined
        
        # For button responses, this would be handled in message processing
        # For text inputs, we can add validation logic here
        return len(input_text.strip()) > 0
    
    async def generate_handoff_data(self, session_id: str, handoff_reason: str = "flow_completed") -> Optional[Dict[str, Any]]:
        """Generate complete handoff data for human agents."""
        try:
            # Get session data
            session = await self.state_manager.get_session(session_id)
            if not session:
                logger.error(f"Session {session_id} not found for handoff")
                return None
            
            # Get conversation state
            conversation_state = await self.state_manager.get_conversation_state(session_id)
            if not conversation_state:
                logger.error(f"Conversation state not found for session {session_id}")
                return None
            
            # Get conversation history
            conversation_history = await self.state_manager.get_conversation_history(session_id)
            
            # Convert to dict format
            history_dicts = []
            for msg in conversation_history:
                history_dicts.append({
                    "direction": msg.direction,
                    "content": msg.content,
                    "message_type": msg.message_type,
                    "timestamp": msg.timestamp.isoformat(),
                    "metadata": msg.message_metadata or {}
                })
            
            # Create handoff data using scheduling service
            handoff_data = self.scheduling_service.create_handoff_data(
                session=session,
                conversation_state=conversation_state,
                conversation_history=history_dicts,
                handoff_reason=handoff_reason
            )
            
            return handoff_data.to_dict()
            
        except Exception as e:
            logger.error(f"Error generating handoff data for session {session_id}: {str(e)}")
            return None
    
    async def format_handoff_summary(self, session_id: str, handoff_reason: str = "flow_completed") -> Optional[str]:
        """Format handoff summary for human agents."""
        try:
            # Get session data
            session = await self.state_manager.get_session(session_id)
            if not session:
                return None
            
            # Get conversation state
            conversation_state = await self.state_manager.get_conversation_state(session_id)
            if not conversation_state:
                return None
            
            # Get conversation history
            conversation_history = await self.state_manager.get_conversation_history(session_id)
            
            # Convert to dict format
            history_dicts = []
            for msg in conversation_history:
                history_dicts.append({
                    "direction": msg.direction,
                    "content": msg.content,
                    "message_type": msg.message_type,
                    "timestamp": msg.timestamp.isoformat(),
                    "metadata": msg.message_metadata or {}
                })
            
            # Create handoff data
            handoff_data = self.scheduling_service.create_handoff_data(
                session=session,
                conversation_state=conversation_state,
                conversation_history=history_dicts,
                handoff_reason=handoff_reason
            )
            
            # Format for agents
            return self.scheduling_service.format_handoff_summary_for_agents(handoff_data)
            
        except Exception as e:
            logger.error(f"Error formatting handoff summary for session {session_id}: {str(e)}")
            return None
    
    async def _handle_restart_flow(self, session) -> FlowResponse:
        """Handle flow restart request."""
        # Reset session to beginning
        await self.state_manager.reset_session(session.id)
        
        # Send welcome message
        welcome_msg = self.message_builder.build_welcome_message()
        
        return FlowResponse(
            messages=[{
                "type": "interactive",
                "content": welcome_msg.body,
                "interactive_data": welcome_msg.to_dict(),
                "metadata": {"step": "restart"}
            }],
            next_step=FlowStep.CLIENT_TYPE,
            should_handoff=False,
            collected_data={},
            analytics_events=[{
                "event_type": "flow_restarted",
                "step_id": "restart",
                "event_data": {"trigger": "user_request"}
            }]
        )
    
    async def _handle_try_again(self, session) -> FlowResponse:
        """Handle try again request - resend current step message."""
        current_step = self._get_current_step(session)
        
        # Reset invalid input count
        collected_data = session.collected_data or {}
        collected_data.pop("invalid_input_count", None)
        await self.state_manager.update_session_step(
            session.id, 
            current_step.value,
            collected_data
        )
        
        # Resend appropriate message for current step
        if current_step == FlowStep.CLIENT_TYPE:
            msg = self.message_builder.build_welcome_message()
        elif current_step == FlowStep.PRACTICE_AREA:
            msg = self.message_builder.build_practice_area_message()
        elif current_step == FlowStep.SCHEDULING_OFFER:
            # Need to get practice area from state
            conversation_state = await self.state_manager.get_conversation_state(session.id)
            practice_area = conversation_state.practice_area if conversation_state else "area_outros"
            msg = self.message_builder.build_scheduling_offer_message(practice_area)
        elif current_step == FlowStep.SCHEDULING_TYPE:
            msg = self.message_builder.build_scheduling_type_message()
        else:
            msg = self.message_builder.build_welcome_message()
        
        return FlowResponse(
            messages=[{
                "type": "interactive",
                "content": msg.body,
                "interactive_data": msg.to_dict(),
                "metadata": {"step": "try_again", "current_step": current_step.value}
            }],
            next_step=current_step,
            should_handoff=False,
            collected_data={"invalid_input_count": 0},
            analytics_events=[{
                "event_type": "try_again_requested",
                "step_id": current_step.value,
                "event_data": {"current_step": current_step.value}
            }]
        )
    
    async def _handle_explain_options(self, session) -> FlowResponse:
        """Handle request to explain current step options."""
        current_step = self._get_current_step(session)
        
        # Build explanation message based on current step
        explanation_msg = self.message_builder.build_step_explanation_message(current_step.value)
        
        return FlowResponse(
            messages=[{
                "type": "text",
                "content": explanation_msg,
                "metadata": {"step": "explanation", "current_step": current_step.value}
            }],
            next_step=current_step,
            should_handoff=False,
            collected_data={},
            analytics_events=[{
                "event_type": "explanation_requested",
                "step_id": current_step.value,
                "event_data": {"current_step": current_step.value}
            }]
        )
    
    async def _handle_continue_bot(self, session) -> FlowResponse:
        """Handle decision to continue with bot instead of handoff."""
        current_step = self._get_current_step(session)
        
        # Reset invalid input count and continue
        collected_data = session.collected_data or {}
        collected_data.pop("invalid_input_count", None)
        collected_data.pop("handoff_offered", None)
        
        await self.state_manager.update_session_step(
            session.id, 
            current_step.value,
            collected_data
        )
        
        # Send encouraging message and current step
        continue_msg = "Perfeito! Vamos continuar. 😊"
        
        # Get current step message
        try_again_response = await self._handle_try_again(session)
        
        # Combine messages
        messages = [
            {
                "type": "text",
                "content": continue_msg,
                "metadata": {"step": "continue_bot"}
            }
        ] + try_again_response.messages
        
        return FlowResponse(
            messages=messages,
            next_step=current_step,
            should_handoff=False,
            collected_data={"invalid_input_count": 0},
            analytics_events=[{
                "event_type": "continue_bot_chosen",
                "step_id": current_step.value,
                "event_data": {"current_step": current_step.value}
            }]
        )


# Factory function for dependency injection
def get_flow_engine(state_manager: StateManager) -> FlowEngine:
    """Get FlowEngine instance."""
    return FlowEngine(state_manager)