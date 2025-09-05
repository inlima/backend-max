# Advocacia Direta WhatsApp Bot

A WhatsApp chatbot for law firm client intake automation using the WhatsApp Business Platform API.

## Features

- Automated client intake and qualification
- 24/7 availability via WhatsApp
- Structured conversation flows
- Seamless handoff to human agents
- Analytics and performance tracking
- LGPD compliant data handling

## Setup

1. Install dependencies:
```bash
poetry install
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`

4. Run database migrations:
```bash
poetry run alembic upgrade head
```

5. Start the development server:
```bash
poetry run uvicorn app.main:app --reload
```

## Project Structure

```
app/
├── __init__.py
├── main.py              # FastAPI application entry point
├── config.py            # Configuration and settings
├── models/              # SQLAlchemy database models
├── services/            # Business logic services
├── api/                 # API endpoints and webhooks
├── core/                # Core utilities and dependencies
└── templates/           # Message templates
tests/                   # Test suite
alembic/                 # Database migrations
```

## Development

- Run tests: `poetry run pytest`
- Format code: `poetry run black app tests`
- Sort imports: `poetry run isort app tests`
- Type checking: `poetry run mypy app`
- Linting: `poetry run flake8 app tests`

## Environment Variables

See `.env.example` for required configuration variables.