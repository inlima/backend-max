# Advocacia Direta WhatsApp Bot - Development Commands

.PHONY: install dev test lint format clean run migrate

# Install dependencies
install:
	uv sync

# Install development dependencies
dev:
	uv sync --extra dev

# Run tests
test:
	uv run pytest -v

# Run tests with coverage
test-cov:
	uv run pytest --cov=app --cov-report=html --cov-report=term-missing

# Lint code
lint:
	uv run flake8 app tests
	uv run mypy app

# Format code
format:
	uv run black app tests
	uv run isort app tests

# Clean cache and build files
clean:
	find . -type d -name "__pycache__" -delete
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache
	rm -rf .mypy_cache
	rm -rf htmlcov
	rm -rf dist
	rm -rf build
	rm -rf .uv_cache

# Run development server
run:
	uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Database operations
db-setup:
	uv run python scripts/setup_database.py

db-seed:
	uv run python scripts/seed_database.py

# Create database migration
migrate:
	uv run alembic revision --autogenerate -m "$(msg)"

# Apply database migrations
upgrade:
	uv run alembic upgrade head

# Rollback database migration
downgrade:
	uv run alembic downgrade -1

# Reset database (drop, create, seed)
db-reset: db-setup

# Setup development environment
setup: install
	cp .env.example .env
	@echo "Please configure your .env file with appropriate values"

# Run all checks (lint, test, format check)
check: lint test
	uv run black --check app tests
	uv run isort --check-only app tests