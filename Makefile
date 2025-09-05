# Advocacia Direta WhatsApp Bot - Development Commands

.PHONY: install dev test lint format clean run migrate

# Install dependencies
install:
	poetry install

# Install development dependencies
dev:
	poetry install --with dev

# Run tests
test:
	poetry run pytest -v

# Run tests with coverage
test-cov:
	poetry run pytest --cov=app --cov-report=html --cov-report=term-missing

# Lint code
lint:
	poetry run flake8 app tests
	poetry run mypy app

# Format code
format:
	poetry run black app tests
	poetry run isort app tests

# Clean cache and build files
clean:
	find . -type d -name "__pycache__" -delete
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache
	rm -rf .mypy_cache
	rm -rf htmlcov
	rm -rf dist
	rm -rf build

# Run development server
run:
	poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Create database migration
migrate:
	poetry run alembic revision --autogenerate -m "$(msg)"

# Apply database migrations
upgrade:
	poetry run alembic upgrade head

# Rollback database migration
downgrade:
	poetry run alembic downgrade -1

# Setup development environment
setup: install
	cp .env.example .env
	@echo "Please configure your .env file with appropriate values"

# Run all checks (lint, test, format check)
check: lint test
	poetry run black --check app tests
	poetry run isort --check-only app tests