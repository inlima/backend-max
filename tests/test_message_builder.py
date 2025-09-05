"""
Tests for message builder functionality.
"""

import pytest
from app.services.message_builder import MessageBuilder, MessageTemplate, get_message_builder
from app.services.whatsapp_client import InteractiveMessage, Button


class TestMessageBuilder:
    """Test MessageBuilder class functionality."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.builder = MessageBuilder()
    
    def test_initialization(self):
        """Test MessageBuilder initialization."""
        assert self.builder is not None
        assert isinstance(self.builder.templates, dict)
        assert len(self.builder.templates) > 0
    
    def test_template_loading(self):
        """Test that all required templates are loaded."""
        required_templates = [
            "welcome",
            "client_type_confirmation", 
            "practice_areas",
            "scheduling_offer",
            "scheduling_type",
            "scheduling_confirmation",
            "information_only",
            "handoff_message",
            "escape_command",
            "reengagement",
            "error_fallback"
        ]
        
        for template_id in required_templates:
            assert template_id in self.builder.templates
            template = self.builder.templates[template_id]
            assert isinstance(template, MessageTemplate)
            assert template.id == template_id
    
    def test_build_welcome_message(self):
        """Test welcome message building."""
        message = self.builder.build_welcome_message()
        
        assert isinstance(message, InteractiveMessage)
        assert message.type == "button"
        assert "Bem-vindo(a) à Advocacia Direta" in message.body
        assert len(message.buttons) == 2
        
        button_ids = [btn.id for btn in message.buttons]
        assert "client_new" in button_ids
        assert "client_existing" in button_ids
    
    def test_build_client_type_confirmation(self):
        """Test client type confirmation messages."""
        # Test new client
        new_message = self.builder.build_client_type_confirmation("client_new")
        assert isinstance(new_message, str)
        assert "cliente novo" in new_message.lower()
        
        # Test existing client
        existing_message = self.builder.build_client_type_confirmation("client_existing")
        assert isinstance(existing_message, str)
        assert "cliente já cadastrado" in existing_message.lower()
        
        # Test fallback for invalid type
        fallback_message = self.builder.build_client_type_confirmation("invalid")
        assert isinstance(fallback_message, str)
        assert "cliente novo" in fallback_message.lower()
    
    def test_build_practice_area_message(self):
        """Test practice area selection message."""
        message = self.builder.build_practice_area_message()
        
        assert isinstance(message, InteractiveMessage)
        assert message.type == "button"
        assert "área jurídica" in message.body.lower()
        assert len(message.buttons) == 3  # WhatsApp limit
        
        # Check that buttons have correct structure
        for button in message.buttons:
            assert isinstance(button, Button)
            assert button.id.startswith("area_")
            assert len(button.title) > 0
    
    def test_build_practice_area_extended_message(self):
        """Test extended practice area selection message."""
        message = self.builder.build_practice_area_extended_message()
        
        assert isinstance(message, InteractiveMessage)
        assert message.type == "button"
        assert len(message.buttons) <= 3
        
        # Check that buttons are different from first set
        for button in message.buttons:
            assert isinstance(button, Button)
            assert button.id.startswith("area_")
    
    def test_build_scheduling_offer_message(self):
        """Test scheduling offer message with area context."""
        test_areas = [
            ("area_civil", "Direito Civil"),
            ("area_trabalhista", "Direito Trabalhista"),
            ("area_criminal", "Direito Criminal"),
            ("area_familia", "Direito de Família"),
            ("area_empresarial", "Direito Empresarial"),
            ("area_outros", "outras áreas jurídicas")
        ]
        
        for area_id, expected_name in test_areas:
            message = self.builder.build_scheduling_offer_message(area_id)
            
            assert isinstance(message, InteractiveMessage)
            assert message.type == "button"
            assert expected_name.lower() in message.body.lower()
            assert len(message.buttons) == 2
            
            button_ids = [btn.id for btn in message.buttons]
            assert "schedule_yes" in button_ids
            assert "schedule_no" in button_ids
    
    def test_build_scheduling_type_message(self):
        """Test scheduling type selection message."""
        message = self.builder.build_scheduling_type_message()
        
        assert isinstance(message, InteractiveMessage)
        assert message.type == "button"
        assert "consulta" in message.body.lower()
        assert len(message.buttons) == 2
        
        button_ids = [btn.id for btn in message.buttons]
        assert "type_presencial" in button_ids
        assert "type_online" in button_ids
    
    def test_build_scheduling_confirmation_message(self):
        """Test scheduling confirmation messages."""
        # Test presencial confirmation
        presencial_msg = self.builder.build_scheduling_confirmation_message("type_presencial")
        assert isinstance(presencial_msg, str)
        assert "PRESENCIAL" in presencial_msg
        assert "registrada" in presencial_msg.lower()
        
        # Test online confirmation
        online_msg = self.builder.build_scheduling_confirmation_message("type_online")
        assert isinstance(online_msg, str)
        assert "ONLINE" in online_msg
        assert "registrada" in online_msg.lower()
        
        # Test fallback
        fallback_msg = self.builder.build_scheduling_confirmation_message("invalid")
        assert isinstance(fallback_msg, str)
        assert "PRESENCIAL" in fallback_msg  # Should default to presencial
    
    def test_build_information_only_message(self):
        """Test information-only response message."""
        test_areas = [
            ("area_civil", "Direito Civil"),
            ("area_trabalhista", "Direito Trabalhista"),
            ("area_outros", "outras áreas jurídicas")
        ]
        
        for area_id, expected_name in test_areas:
            message = self.builder.build_information_only_message(area_id)
            
            assert isinstance(message, str)
            assert expected_name.lower() in message.lower()
            assert "informações" in message.lower()
    
    def test_build_handoff_message(self):
        """Test handoff message building."""
        collected_data = {
            "client_type": "client_new",
            "practice_area": "area_civil",
            "wants_scheduling": True,
            "scheduling_preference": "type_presencial"
        }
        
        message = self.builder.build_handoff_message(collected_data)
        
        assert isinstance(message, str)
        assert "especialistas" in message.lower() or "continuidade" in message.lower()
    
    def test_build_escape_command_message(self):
        """Test escape command response message."""
        message = self.builder.build_escape_command_message()
        
        assert isinstance(message, str)
        assert "atendente" in message.lower()
        assert "transferindo" in message.lower()
    
    def test_build_reengagement_message(self):
        """Test re-engagement message for inactive users."""
        message = self.builder.build_reengagement_message()
        
        assert isinstance(message, InteractiveMessage)
        assert message.type == "button"
        assert "conversa foi interrompida" in message.body.lower()
        assert len(message.buttons) == 3
        
        button_ids = [btn.id for btn in message.buttons]
        assert "continue_flow" in button_ids
        assert "restart_flow" in button_ids
        assert "human_agent" in button_ids
    
    def test_build_error_fallback_message(self):
        """Test error fallback message for invalid inputs."""
        message = self.builder.build_error_fallback_message()
        
        assert isinstance(message, InteractiveMessage)
        assert message.type == "button"
        assert "não consegui entender" in message.body.lower()
        assert len(message.buttons) == 2
        
        button_ids = [btn.id for btn in message.buttons]
        assert "restart_flow" in button_ids
        assert "human_agent" in button_ids
    
    def test_get_template(self):
        """Test template retrieval."""
        # Test existing template
        template = self.builder.get_template("welcome")
        assert template is not None
        assert isinstance(template, MessageTemplate)
        assert template.id == "welcome"
        
        # Test non-existing template
        template = self.builder.get_template("nonexistent")
        assert template is None
    
    def test_validate_button_response(self):
        """Test button response validation."""
        expected_buttons = ["client_new", "client_existing"]
        
        # Test valid responses
        assert self.builder.validate_button_response("client_new", expected_buttons) is True
        assert self.builder.validate_button_response("client_existing", expected_buttons) is True
        
        # Test invalid responses
        assert self.builder.validate_button_response("invalid", expected_buttons) is False
        assert self.builder.validate_button_response("", expected_buttons) is False
    
    def test_format_handoff_summary(self):
        """Test handoff summary formatting."""
        collected_data = {
            "client_type": "client_new",
            "practice_area": "area_civil",
            "wants_scheduling": True,
            "scheduling_preference": "type_presencial",
            "phone_number": "5511999999999"
        }
        
        summary = self.builder.format_handoff_summary(collected_data)
        
        assert isinstance(summary, str)
        assert "RESUMO DA CONVERSA" in summary
        assert "Cliente Novo" in summary
        assert "Direito Civil" in summary
        assert "Agendamento" in summary
        assert "Presencial" in summary
        assert "5511999999999" in summary
    
    def test_format_handoff_summary_information_only(self):
        """Test handoff summary for information-only requests."""
        collected_data = {
            "client_type": "client_existing",
            "practice_area": "area_trabalhista",
            "wants_scheduling": False,
            "phone_number": "5511888888888"
        }
        
        summary = self.builder.format_handoff_summary(collected_data)
        
        assert isinstance(summary, str)
        assert "Cliente Existente" in summary
        assert "Direito Trabalhista" in summary
        assert "Apenas informações" in summary
        assert "5511888888888" in summary
    
    def test_format_handoff_summary_minimal_data(self):
        """Test handoff summary with minimal collected data."""
        collected_data = {
            "phone_number": "5511777777777"
        }
        
        summary = self.builder.format_handoff_summary(collected_data)
        
        assert isinstance(summary, str)
        assert "RESUMO DA CONVERSA" in summary
        assert "5511777777777" in summary


class TestMessageBuilderFactory:
    """Test MessageBuilder factory function."""
    
    def test_get_message_builder(self):
        """Test factory function returns MessageBuilder instance."""
        builder = get_message_builder()
        
        assert isinstance(builder, MessageBuilder)
        assert builder.templates is not None


class TestMessageTemplate:
    """Test MessageTemplate dataclass."""
    
    def test_message_template_creation(self):
        """Test MessageTemplate creation."""
        template = MessageTemplate(
            id="test",
            type="text",
            content={"message": "Test message"}
        )
        
        assert template.id == "test"
        assert template.type == "text"
        assert template.content["message"] == "Test message"
        assert template.variations is None
    
    def test_message_template_with_variations(self):
        """Test MessageTemplate with variations."""
        variations = [
            {"message": "Variation 1"},
            {"message": "Variation 2"}
        ]
        
        template = MessageTemplate(
            id="test_var",
            type="text",
            content={"message": "Default message"},
            variations=variations
        )
        
        assert template.variations == variations
        assert len(template.variations) == 2


class TestMessageBuilderIntegration:
    """Integration tests for MessageBuilder with WhatsApp message types."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.builder = MessageBuilder()
    
    def test_interactive_message_structure(self):
        """Test that built messages have correct WhatsApp structure."""
        welcome_msg = self.builder.build_welcome_message()
        
        # Test conversion to WhatsApp format
        whatsapp_format = welcome_msg.to_dict()
        
        assert whatsapp_format["type"] == "interactive"
        assert "interactive" in whatsapp_format
        assert whatsapp_format["interactive"]["type"] == "button"
        assert "body" in whatsapp_format["interactive"]
        assert "action" in whatsapp_format["interactive"]
        assert "buttons" in whatsapp_format["interactive"]["action"]
    
    def test_button_structure(self):
        """Test that buttons have correct WhatsApp structure."""
        welcome_msg = self.builder.build_welcome_message()
        
        for button in welcome_msg.buttons:
            button_dict = button.to_dict()
            
            assert button_dict["type"] == "reply"
            assert "reply" in button_dict
            assert "id" in button_dict["reply"]
            assert "title" in button_dict["reply"]
            assert len(button_dict["reply"]["title"]) <= 20  # WhatsApp limit
    
    def test_message_length_limits(self):
        """Test that messages respect WhatsApp length limits."""
        # Test various message types
        messages_to_test = [
            self.builder.build_welcome_message().body,
            self.builder.build_client_type_confirmation("client_new"),
            self.builder.build_practice_area_message().body,
            self.builder.build_scheduling_type_message().body,
            self.builder.build_escape_command_message()
        ]
        
        for message in messages_to_test:
            # WhatsApp text message limit is 4096 characters
            assert len(message) <= 4096
            # Practical limit for good UX is much lower
            assert len(message) <= 1000
    
    def test_button_count_limits(self):
        """Test that interactive messages respect WhatsApp button limits."""
        interactive_messages = [
            self.builder.build_welcome_message(),
            self.builder.build_practice_area_message(),
            self.builder.build_practice_area_extended_message(),
            self.builder.build_scheduling_offer_message("area_civil"),
            self.builder.build_scheduling_type_message(),
            self.builder.build_reengagement_message(),
            self.builder.build_error_fallback_message()
        ]
        
        for message in interactive_messages:
            # WhatsApp allows maximum 3 buttons for button messages
            assert len(message.buttons) <= 3
            
            # Each button title should be within limits
            for button in message.buttons:
                assert len(button.title) <= 20  # WhatsApp button title limit
                assert len(button.id) <= 256  # WhatsApp button ID limit