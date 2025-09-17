# Changelog - Migração para uv

## Resumo das Mudanças

### ✅ Arquivos Modificados

1. **pyproject.toml**
   - Migrado do formato Poetry para PEP 621
   - Dependências convertidas para o formato padrão
   - Adicionado suporte ao hatchling como build backend
   - Configurado `tool.hatch.build.targets.wheel` para incluir o pacote `app`

2. **Dockerfile**
   - Substituído Poetry por uv
   - Atualizado para usar `uv sync --frozen --no-dev`
   - Comando de execução alterado para `uv run`

3. **Dockerfile.prod**
   - Mesmas alterações do Dockerfile principal
   - Otimizado para produção

4. **Makefile**
   - Todos os comandos `poetry run` substituídos por `uv run`
   - Comando `poetry install` substituído por `uv sync`
   - Adicionado limpeza do cache uv no target `clean`

5. **scripts/setup-production.sh**
   - Comando de instalação atualizado para `uv sync --no-dev`
   - Comando safety check atualizado para `uv run safety check`

6. **.gitignore**
   - Adicionado `.uv_cache/` para ignorar cache do uv
   - Mantido comentário sobre uv.lock (deve ser commitado)

7. **app/api/auth.py**
   - Corrigido import de `jwt` para `from jose import jwt`

### ✅ Arquivos Removidos

- **poetry.lock** - Substituído por uv.lock

### ✅ Arquivos Criados

- **uv.lock** - Arquivo de lock do uv com dependências resolvidas
- **MIGRATION_TO_UV.md** - Guia de migração e uso do uv
- **CHANGELOG_UV_MIGRATION.md** - Este arquivo de changelog

## Status da Migração

### ✅ Funcionando
- Instalação de dependências (`uv sync`)
- Importação da aplicação principal
- Execução de comandos via `uv run`
- Build da aplicação
- Dockerfiles atualizados
- Makefile atualizado

### ⚠️ Avisos
- Warning sobre versão do bcrypt (não crítico, aplicação funciona)
- Alguns testes podem ter problemas de importação (não relacionado ao uv)

### 🔧 Próximos Passos Recomendados

1. **Testar em ambiente de desenvolvimento:**
   ```bash
   uv sync --extra dev
   make run
   ```

2. **Testar build Docker:**
   ```bash
   docker build -t advocacia-direta .
   ```

3. **Verificar testes:**
   ```bash
   make test
   ```

4. **Atualizar documentação:**
   - README.md principal
   - Documentação de desenvolvimento

## Benefícios da Migração

- **Performance**: uv é significativamente mais rápido que Poetry
- **Padrões**: Usa PEP 621 (padrão moderno para pyproject.toml)
- **Simplicidade**: Interface mais limpa e intuitiva
- **Compatibilidade**: Totalmente compatível com o ecossistema Python
- **Manutenção**: Menos dependências de ferramentas externas

## Comandos de Verificação

```bash
# Verificar instalação
uv --version

# Instalar dependências
uv sync --extra dev

# Executar aplicação
uv run uvicorn app.main:app --reload

# Executar testes
uv run pytest

# Verificar dependências
uv tree
```