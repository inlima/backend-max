# Migração para uv

Este projeto foi migrado do Poetry para o uv como gerenciador de dependências Python.

## Instalação do uv

### macOS/Linux
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Windows
```bash
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Via pip
```bash
pip install uv
```

## Comandos Principais

### Instalação de dependências
```bash
# Instalar dependências de produção
uv sync

# Instalar com dependências de desenvolvimento
uv sync --extra dev
```

### Executar comandos
```bash
# Executar aplicação
uv run uvicorn app.main:app --reload

# Executar testes
uv run pytest

# Executar formatação
uv run black app tests
uv run isort app tests

# Executar linting
uv run flake8 app tests
uv run mypy app
```

### Gerenciar dependências
```bash
# Adicionar nova dependência
uv add fastapi

# Adicionar dependência de desenvolvimento
uv add --dev pytest

# Remover dependência
uv remove package-name

# Atualizar dependências
uv sync --upgrade
```

## Mudanças Principais

1. **pyproject.toml**: Migrado do formato Poetry para o padrão PEP 621
2. **poetry.lock** → **uv.lock**: Arquivo de lock atualizado
3. **Dockerfile**: Atualizado para usar uv em vez do Poetry
4. **Makefile**: Todos os comandos agora usam `uv run`
5. **Scripts**: Scripts de deploy e setup atualizados

## Vantagens do uv

- **Velocidade**: Até 10x mais rápido que pip/Poetry
- **Compatibilidade**: Totalmente compatível com o ecossistema Python
- **Simplicidade**: Interface mais simples e intuitiva
- **Padrões**: Segue os padrões PEP mais recentes
- **Resolução**: Melhor resolução de dependências

## Comandos Equivalentes

| Poetry | uv |
|--------|-----|
| `poetry install` | `uv sync` |
| `poetry install --with dev` | `uv sync --extra dev` |
| `poetry add package` | `uv add package` |
| `poetry remove package` | `uv remove package` |
| `poetry run command` | `uv run command` |
| `poetry shell` | `uv shell` |
| `poetry show` | `uv tree` |

## Verificação da Migração

Para verificar se tudo está funcionando:

```bash
# Instalar dependências
uv sync --extra dev

# Executar testes
make test

# Executar aplicação
make run
```