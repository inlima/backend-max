#!/usr/bin/env python3
"""
Exemplos práticos de uso dos diferentes tipos de mensagem WhatsApp.
"""

import asyncio
from app.services.whatsapp_client import WhatsAppClient, MessageType
from app.services.message_utils import MessageUtils
from app.services.message_builder import MessageBuilder


async def example_welcome_sequence(phone_number: str):
    """Exemplo de sequência de boas-vindas com múltiplos tipos de mensagem."""
    client = WhatsAppClient()
    builder = MessageBuilder()
    
    print("🎬 Iniciando sequência de boas-vindas...")
    
    # 1. Imagem de boas-vindas
    print("📸 Enviando imagem de boas-vindas...")
    await client.send_image_message(
        to=phone_number,
        image_url="https://example.com/advocacia-direta-welcome.jpg",
        caption="🏛️ Bem-vindo à Advocacia Direta!\n\nEstamos aqui para defender seus direitos com excelência."
    )
    
    # 2. Mensagem interativa com botões
    print("🔘 Enviando menu interativo...")
    welcome_msg = builder.build_welcome_message()
    await client.send_interactive_message(phone_number, welcome_msg)
    
    # 3. Localização do escritório
    print("📍 Enviando localização do escritório...")
    await client.send_office_location(phone_number)
    
    print("✅ Sequência de boas-vindas concluída!")


async def example_consultation_package(phone_number: str, practice_area: str):
    """Exemplo de pacote completo de consulta."""
    client = WhatsAppClient()
    builder = MessageBuilder()
    
    print(f"📦 Preparando pacote de consulta para {practice_area}...")
    
    # 1. Informações da área jurídica (imagem)
    print("🖼️ Enviando informações da área...")
    area_image = builder.build_practice_area_info_image(practice_area)
    await client.send_media_message(phone_number, area_image)
    
    # 2. Documento relevante
    print("📄 Enviando documento...")
    doc_types = {
        "area_civil": "procuracao",
        "area_trabalhista": "checklist_documentos",
        "area_familia": "declaracao_hipossuficiencia"
    }
    doc_type = doc_types.get(practice_area, "checklist_documentos")
    document = builder.build_document_message(doc_type)
    await client.send_media_message(phone_number, document)
    
    # 3. Áudio com instruções
    print("🎵 Enviando áudio com instruções...")
    audio = builder.build_instruction_audio("processo_consulta")
    await client.send_media_message(phone_number, audio)
    
    # 4. Vídeo explicativo (opcional)
    print("🎥 Enviando vídeo explicativo...")
    video = builder.build_welcome_video()
    await client.send_media_message(phone_number, video)
    
    print("✅ Pacote de consulta enviado!")


async def example_lawyer_handoff(phone_number: str, collected_data: dict):
    """Exemplo de transferência para advogado com informações completas."""
    client = WhatsAppClient()
    builder = MessageBuilder()
    
    print("👨‍💼 Iniciando transferência para advogado...")
    
    # 1. Mensagem de transferência
    print("💬 Enviando mensagem de transferência...")
    handoff_msg = builder.build_handoff_message(collected_data)
    await client.send_text_message(phone_number, handoff_msg)
    
    # 2. Contato do advogado responsável
    print("👤 Enviando contato do advogado...")
    lawyer_info = {
        "name": "Dr. João Silva",
        "phone": "5511888888888",
        "specialization": "Direito Civil"
    }
    lawyer_contact = builder.build_lawyer_contact(
        lawyer_info["name"],
        lawyer_info["phone"], 
        lawyer_info["specialization"]
    )
    await client.send_contact_message(phone_number, lawyer_contact.contacts)
    
    # 3. Documento com resumo do caso
    print("📋 Enviando resumo do caso...")
    case_summary = builder.build_case_summary_document(collected_data)
    await client.send_media_message(phone_number, case_summary)
    
    print("✅ Transferência concluída!")


async def example_appointment_confirmation(phone_number: str, appointment_data: dict):
    """Exemplo de confirmação de agendamento com múltiplas informações."""
    client = WhatsAppClient()
    builder = MessageBuilder()
    
    print("📅 Confirmando agendamento...")
    
    # 1. Imagem de confirmação
    print("🖼️ Enviando imagem de confirmação...")
    confirmation_img = builder.build_appointment_confirmation_image()
    await client.send_media_message(phone_number, confirmation_img)
    
    # 2. Texto com detalhes
    print("📝 Enviando detalhes do agendamento...")
    details = f"""
✅ **CONSULTA CONFIRMADA**

📅 **Data:** {appointment_data.get('date', 'A definir')}
🕐 **Horário:** {appointment_data.get('time', 'A definir')}
👨‍💼 **Advogado:** {appointment_data.get('lawyer', 'Dr. João Silva')}
📍 **Local:** {appointment_data.get('location', 'Escritório')}

Você receberá um lembrete 1 dia antes da consulta.
"""
    await client.send_text_message(phone_number, details)
    
    # 3. Contato do escritório
    print("📞 Enviando contato do escritório...")
    await client.send_law_firm_contact(phone_number)
    
    # 4. Localização (se presencial)
    if appointment_data.get('type') == 'presencial':
        print("📍 Enviando localização...")
        await client.send_office_location(phone_number)
    
    # 5. Documento com instruções
    print("📄 Enviando instruções...")
    await client.send_document_message(
        to=phone_number,
        document_url="https://example.com/instrucoes-consulta.pdf",
        filename="instrucoes_consulta.pdf",
        caption="📋 Instruções para sua Consulta\n\nLeia atentamente antes do atendimento."
    )
    
    print("✅ Confirmação de agendamento concluída!")


async def example_document_delivery(phone_number: str, case_type: str):
    """Exemplo de entrega de documentos por área jurídica."""
    client = WhatsAppClient()
    
    print(f"📄 Enviando documentos para {case_type}...")
    
    documents = {
        "direito_civil": [
            {
                "url": "https://example.com/procuracao-civil.pdf",
                "filename": "procuracao_civil.pdf",
                "caption": "📄 Procuração para Direito Civil\n\nAssine e reconheça firma."
            },
            {
                "url": "https://example.com/contrato-honorarios-civil.pdf", 
                "filename": "contrato_honorarios.pdf",
                "caption": "📋 Contrato de Honorários\n\nLeia e assine se concordar."
            }
        ],
        "direito_trabalhista": [
            {
                "url": "https://example.com/checklist-trabalhista.pdf",
                "filename": "checklist_documentos.pdf", 
                "caption": "✅ Checklist de Documentos Trabalhistas\n\nReúna todos os documentos listados."
            },
            {
                "url": "https://example.com/declaracao-hipossuficiencia.pdf",
                "filename": "declaracao_hipossuficiencia.pdf",
                "caption": "📝 Declaração de Hipossuficiência\n\nPara assistência judiciária gratuita."
            }
        ]
    }
    
    docs = documents.get(case_type, documents["direito_civil"])
    
    for doc in docs:
        print(f"📤 Enviando {doc['filename']}...")
        await client.send_document_message(
            to=phone_number,
            document_url=doc["url"],
            filename=doc["filename"],
            caption=doc["caption"]
        )
        
        # Aguardar um pouco entre documentos
        await asyncio.sleep(2)
    
    print("✅ Todos os documentos enviados!")


async def example_emergency_contact(phone_number: str):
    """Exemplo de contato de emergência com informações completas."""
    client = WhatsAppClient()
    
    print("🚨 Enviando informações de emergência...")
    
    # 1. Texto de emergência
    await client.send_text_message(
        to=phone_number,
        text="🚨 **ATENDIMENTO DE EMERGÊNCIA**\n\nIdentificamos que você precisa de atendimento urgente. Nossa equipe está sendo notificada."
    )
    
    # 2. Contato de emergência 24h
    emergency_contact = MessageUtils.create_contact(
        name="Advocacia Direta - Emergência 24h",
        phone="5511999999999",
        email="emergencia@advocaciadireta.com",
        organization="Advocacia Direta - Plantão Jurídico"
    )
    
    await client.send_contact_message(phone_number, [emergency_contact])
    
    # 3. Localização do escritório
    await client.send_office_location(phone_number)
    
    # 4. Áudio com instruções de emergência
    await client.send_audio_message(
        to=phone_number,
        audio_url="https://example.com/audio/emergencia-instrucoes.mp3"
    )
    
    print("✅ Informações de emergência enviadas!")


async def example_feedback_collection(phone_number: str):
    """Exemplo de coleta de feedback com diferentes tipos de mensagem."""
    client = WhatsAppClient()
    builder = MessageBuilder()
    
    print("⭐ Coletando feedback do cliente...")
    
    # 1. Imagem de agradecimento
    await client.send_image_message(
        to=phone_number,
        image_url="https://example.com/obrigado.jpg",
        caption="🙏 Obrigado por escolher a Advocacia Direta!"
    )
    
    # 2. Menu de satisfação
    feedback_menu = builder.create_feedback_menu()
    await client.send_interactive_message(phone_number, feedback_menu)
    
    # 3. Pesquisa de recomendação
    survey = builder.create_satisfaction_survey()
    await client.send_interactive_message(phone_number, survey)
    
    print("✅ Feedback solicitado!")


async def example_complete_flow():
    """Exemplo de fluxo completo usando todos os tipos de mensagem."""
    phone_number = "5511999999999"  # Substitua pelo número real
    
    print("🚀 Iniciando fluxo completo de demonstração...")
    
    try:
        # 1. Boas-vindas
        await example_welcome_sequence(phone_number)
        await asyncio.sleep(3)
        
        # 2. Pacote de consulta
        await example_consultation_package(phone_number, "area_civil")
        await asyncio.sleep(3)
        
        # 3. Confirmação de agendamento
        appointment_data = {
            "date": "15/12/2024",
            "time": "14:00",
            "lawyer": "Dr. João Silva",
            "location": "Escritório",
            "type": "presencial"
        }
        await example_appointment_confirmation(phone_number, appointment_data)
        await asyncio.sleep(3)
        
        # 4. Entrega de documentos
        await example_document_delivery(phone_number, "direito_civil")
        await asyncio.sleep(3)
        
        # 5. Transferência para advogado
        collected_data = {
            "client_type": "client_new",
            "practice_area": "area_civil", 
            "wants_scheduling": True,
            "scheduling_preference": "type_presencial",
            "phone_number": phone_number,
            "case_id": "CASE-2024-001"
        }
        await example_lawyer_handoff(phone_number, collected_data)
        await asyncio.sleep(3)
        
        # 6. Coleta de feedback
        await example_feedback_collection(phone_number)
        
        print("🎉 Fluxo completo concluído com sucesso!")
        
    except Exception as e:
        print(f"❌ Erro durante o fluxo: {str(e)}")


if __name__ == "__main__":
    print("📱 Exemplos de Mensagens WhatsApp - Advocacia Direta")
    print("=" * 50)
    
    # Executar exemplo específico
    # asyncio.run(example_welcome_sequence("5511999999999"))
    # asyncio.run(example_consultation_package("5511999999999", "area_civil"))
    # asyncio.run(example_emergency_contact("5511999999999"))
    
    # Ou executar fluxo completo
    asyncio.run(example_complete_flow())