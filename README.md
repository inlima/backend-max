# Advocacia Direta WhatsApp Bot - Backend API

Sistema backend para automação de atendimento inicial em escritórios de advocacia usando a API oficial do WhatsApp Business Platform.

## Sobre o Sistema

Este é um sistema backend completo com as seguintes funcionalidades:

### Funcionalidades Implementadas
- ✅ API REST completa com FastAPI
- ✅ Atendimento automatizado via WhatsApp
- ✅ **8 tipos de mensagem WhatsApp** (texto, imagem, áudio, vídeo, documento, contato, localização, interativa)
- ✅ Identificação e gestão de clientes
- ✅ Seleção de área de atuação jurídica
- ✅ Sistema de agendamento (presencial/online)
- ✅ Transferência para atendimento humano
- ✅ Persistência em PostgreSQL
- ✅ Cache com Redis
- ✅ WebSocket para comunicação em tempo real
- ✅ Sistema de analytics e métricas
- ✅ Monitoramento e logs estruturados
- ✅ Deploy com Docker

## Setup Rápido

> **Nota**: Este projeto agora usa `uv` como gerenciador de dependências Python. Para migração do Poetry, veja [MIGRATION_TO_UV.md](MIGRATION_TO_UV.md).

1. **Instalar uv:**
```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Via pip
pip install uv
```

2. **Instalar dependências:**
```bash
uv sync --extra dev
```

3. **Configurar ambiente:**
```bash
cp .env.example .env
# Edite o .env com suas credenciais
```

4. **Executar com Docker:**
```bash
docker-compose up -d
```

5. **Ou executar localmente:**
```bash
uv run uvicorn app.main:app --reload
```

## Estrutura do Projeto

```
app/
├── main.py              # Aplicação FastAPI principal
├── api/                 # Endpoints da API
│   ├── webhooks.py      # Webhook do WhatsApp
│   ├── clients.py       # Gestão de clientes
│   ├── conversations.py # Conversas e mensagens
│   └── analytics.py     # Métricas e analytics
├── core/                # Configurações centrais
│   ├── config.py        # Configurações da aplicação
│   ├── database.py      # Conexão com banco
│   └── security.py      # Autenticação e segurança
├── models/              # Modelos do banco de dados
│   ├── client.py        # Modelo de cliente
│   ├── conversation.py  # Modelo de conversa
│   └── message.py       # Modelo de mensagem
├── services/            # Lógica de negócio
│   ├── whatsapp.py      # Cliente WhatsApp
│   ├── conversation.py  # Lógica de conversa
│   ├── analytics.py     # Processamento de métricas
│   └── notification.py  # Sistema de notificações
└── utils/               # Utilitários
    ├── templates.py     # Templates de mensagem
    └── validators.py    # Validações
```

## Configuração

### Variáveis de Ambiente

```bash
# Banco de Dados
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/advocacia_direta

# Redis
REDIS_URL=redis://localhost:6379/0

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=seu_token_aqui
WHATSAPP_PHONE_NUMBER_ID=seu_phone_id_aqui
WHATSAPP_WEBHOOK_VERIFY_TOKEN=seu_verify_token_aqui

# Segurança
SECRET_KEY=sua_chave_secreta_aqui

# Configuração
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=INFO
```

## Deploy

### Desenvolvimento
```bash
docker-compose up -d
```

### Produção
```bash
docker-compose -f docker-compose.production.yml up -d
```

### Verificar saúde:
```bash
curl http://localhost:8000/health/
```

## API Endpoints

### Principais Endpoints

- `GET /health/` - Status da aplicação
- `POST /webhook/` - Webhook do WhatsApp
- `GET /api/clients/` - Listar clientes
- `GET /api/conversations/` - Listar conversas
- `GET /api/analytics/` - Métricas do sistema
- `POST /api/whatsapp/send-*` - **Envio de mensagens multimídia**
- `WebSocket /ws/` - Comunicação em tempo real

### Testar webhook:
```bash
curl -X POST http://localhost:8000/webhook/ \
  -H "Content-Type: application/json" \
  -d '{"entry": [{"changes": [{"value": {"messages": [{"from": "5511999999999", "text": {"body": "oi"}}]}}]}]}'
```

## 💬 Tipos de Mensagem WhatsApp

O sistema suporta **8 tipos diferentes** de mensagem:

| Tipo | Descrição | Casos de Uso |
|------|-----------|--------------|
| 📝 **Text** | Mensagens de texto simples | Confirmações, instruções |
| 🖼️ **Image** | Imagens com legenda | Logo, confirmações visuais |
| 🎵 **Audio** | Mensagens de áudio/voz | Instruções detalhadas |
| 🎥 **Video** | Vídeos com legenda | Apresentações, tutoriais |
| 📄 **Document** | Documentos (PDF, DOC) | Contratos, procurações |
| 👤 **Contacts** | Informações de contato | Advogados, escritório |
| 📍 **Location** | Localização com coordenadas | Escritório, fóruns |
| 🔘 **Interactive** | Botões e menus | Navegação, seleções |

### Exemplos de Uso

```python
# Enviar documento jurídico
await whatsapp_client.send_document_message(
    to="5511999999999",
    document_url="https://example.com/procuracao.pdf",
    filename="procuracao.pdf",
    caption="📄 Modelo de Procuração"
)

# Enviar contato do advogado
contact = MessageUtils.create_lawyer_contact(
    name="Dr. João Silva",
    phone="5511888888888",
    specialization="Direito Civil"
)
await whatsapp_client.send_contact_message(
    to="5511999999999",
    contacts=[contact]
)

# Enviar localização do escritório
await whatsapp_client.send_location_message(
    to="5511999999999",
    latitude=-23.5505,
    longitude=-46.6333,
    name="Advocacia Direta",
    address="Rua dos Advogados, 123"
)
```

📚 **Documentação completa:** [docs/WHATSAPP_MESSAGE_TYPES.md](docs/WHATSAPP_MESSAGE_TYPES.md)

## Desenvolvimento

### Executar localmente:
```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Executar migrações:
```bash
uv run alembic upgrade head
```

### Executar testes:
```bash
uv run pytest
```

## Tecnologias

- **FastAPI** - Framework web moderno e rápido
- **PostgreSQL** - Banco de dados relacional
- **Redis** - Cache e sessões
- **SQLAlchemy** - ORM para Python
- **Alembic** - Migrações de banco
- **uv** - Gerenciamento de dependências Python (moderno e rápido)
- **Docker** - Containerização
- **WhatsApp Business API** - **Todos os tipos de mensagem suportados**

## Suporte

Para dúvidas sobre o sistema:
1. Verifique os logs da aplicação
2. Teste o endpoint `/health/`
3. Valide as credenciais do WhatsApp Business API
4. Verifique a conectividade com PostgreSQL e Redis