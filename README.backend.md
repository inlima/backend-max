# Advocacia Direta - Backend API

Sistema backend completo para automação de atendimento jurídico via WhatsApp.

## Características

- **API REST completa** com FastAPI
- **Integração WhatsApp Business** oficial
- **Banco PostgreSQL** com SQLAlchemy
- **Cache Redis** para performance
- **WebSocket** para comunicação em tempo real
- **Sistema de Analytics** e métricas
- **Autenticação JWT** segura
- **Containerização Docker** completa

## Arquitetura

```
Backend API (FastAPI)
├── PostgreSQL (Dados)
├── Redis (Cache/Sessões)
├── WhatsApp Business API
└── WebSocket (Tempo Real)
```

## Endpoints Principais

- `GET /health/` - Status da aplicação
- `POST /webhook/` - Webhook WhatsApp
- `GET /api/clients/` - Gestão de clientes
- `GET /api/conversations/` - Conversas
- `GET /api/analytics/` - Métricas
- `WebSocket /ws/` - Tempo real

## Setup Rápido

```bash
# Clonar e instalar
git clone <repo>
cd advocacia-direta-backend
uv sync --extra dev

# Configurar ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Executar com Docker
docker-compose up -d

# Ou executar localmente
uv run uvicorn app.main:app --reload
```

## Tecnologias

- **FastAPI** - Framework web moderno
- **PostgreSQL** - Banco relacional
- **Redis** - Cache e sessões
- **SQLAlchemy** - ORM Python
- **Alembic** - Migrações
- **uv** - Gerenciamento de dependências
- **Docker** - Containerização

## Deploy

### Desenvolvimento
```bash
docker-compose up -d
```

### Produção
```bash
docker-compose -f docker-compose.production.yml up -d
```

## Configuração

Principais variáveis de ambiente:

```bash
# Banco de Dados
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db

# WhatsApp Business
WHATSAPP_ACCESS_TOKEN=seu_token
WHATSAPP_PHONE_NUMBER_ID=seu_phone_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=seu_verify_token

# Segurança
SECRET_KEY=sua_chave_secreta
```

## Desenvolvimento

```bash
# Executar localmente
uv run uvicorn app.main:app --reload

# Migrações
uv run alembic upgrade head

# Testes
uv run pytest

# Linting
uv run black app tests
uv run flake8 app tests
```

## Monitoramento

- **Logs estruturados** com níveis configuráveis
- **Métricas Prometheus** em `/metrics`
- **Health checks** em `/health/`
- **Analytics** de conversas e clientes

## Segurança

- **Autenticação JWT** para API
- **Validação de webhook** WhatsApp
- **Rate limiting** configurável
- **Sanitização** de inputs
- **CORS** configurado

Este é um sistema backend completo, pronto para produção e integração com qualquer frontend ou aplicação cliente.