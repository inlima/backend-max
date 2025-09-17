# 🗄️ Configuração do Banco de Dados - max_system

Este documento explica como configurar e usar o banco de dados PostgreSQL para o sistema Advocacia Direta.

## 📋 Visão Geral

O sistema utiliza **PostgreSQL** como banco principal com o nome `max_system`, incluindo:

- **Modelos completos** para gestão jurídica
- **Relacionamentos** entre entidades
- **Migrações** com Alembic
- **Dados iniciais** para desenvolvimento
- **Scripts** de automação

## 🏗️ Estrutura do Banco

### Tabelas Principais

```
📊 max_system Database
├── 👤 users (usuários do sistema)
├── 🔐 user_sessions (sessões de autenticação)
├── 👥 clients (clientes)
├── 📞 client_contacts (contatos dos clientes)
├── ⚖️ legal_cases (casos jurídicos)
├── 📄 case_documents (documentos dos casos)
├── 📝 case_activities (atividades dos casos)
├── 📅 appointments (agendamentos)
├── 💬 whatsapp_sessions (sessões WhatsApp)
├── 🔄 conversation_states (estados da conversa)
├── 📨 message_history (histórico de mensagens)
└── 📊 analytics_events (eventos de analytics)
```

### Relacionamentos

```mermaid
erDiagram
    USERS ||--o{ USER_SESSIONS : has
    CLIENTS ||--o{ CLIENT_CONTACTS : has
    CLIENTS ||--o{ LEGAL_CASES : owns
    CLIENTS ||--o{ WHATSAPP_SESSIONS : communicates
    CLIENTS ||--o{ APPOINTMENTS : schedules
    LEGAL_CASES ||--o{ CASE_DOCUMENTS : contains
    LEGAL_CASES ||--o{ CASE_ACTIVITIES : tracks
    LEGAL_CASES ||--o{ APPOINTMENTS : relates
    WHATSAPP_SESSIONS ||--|| CONVERSATION_STATES : has
    WHATSAPP_SESSIONS ||--o{ MESSAGE_HISTORY : contains
    WHATSAPP_SESSIONS ||--o{ ANALYTICS_EVENTS : generates
```

## ⚙️ Configuração

### 1. Variáveis de Ambiente

```bash
# Database Configuration
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/max_system
POSTGRES_DB=max_system
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Redis Configuration
REDIS_URL=redis://localhost:6379/0
```

### 2. Dependências

```bash
# Instalar dependências
poetry install

# Dependências principais:
# - sqlalchemy (ORM)
# - alembic (migrações)
# - asyncpg (driver PostgreSQL)
# - psycopg2-binary (backup driver)
```

## 🚀 Setup Rápido

### Opção 1: Script Automático

```bash
# Setup completo (criar tabelas + dados iniciais)
make db-setup

# Ou manualmente:
poetry run python scripts/setup_database.py
```

### Opção 2: Docker Compose

```bash
# Iniciar PostgreSQL e Redis
docker compose up -d db redis

# Aguardar inicialização (30s)
sleep 30

# Executar setup
make db-setup
```

### Opção 3: Manual

```bash
# 1. Criar banco PostgreSQL
createdb max_system

# 2. Executar migrações
poetry run alembic upgrade head

# 3. Popular com dados iniciais
poetry run python scripts/seed_database.py
```

## 🔄 Migrações com Alembic

### Comandos Principais

```bash
# Criar nova migração
poetry run alembic revision --autogenerate -m "Descrição da mudança"

# Aplicar migrações
poetry run alembic upgrade head

# Reverter última migração
poetry run alembic downgrade -1

# Ver histórico
poetry run alembic history

# Ver migração atual
poetry run alembic current
```

### Estrutura de Migrações

```
alembic/
├── versions/
│   └── 001_initial_database_schema.py
├── env.py (configuração)
└── script.py.mako (template)
```

## 📊 Dados Iniciais

### Usuários Criados

```bash
# Administrador
Email: admin@advocacia.com
Senha: admin123
Role: admin

# Advogado
Email: advogado@advocacia.com  
Senha: adv123
Role: lawyer

# Recepcionista
Email: recepcionista@advocacia.com
Senha: recep123
Role: receptionist
```

### Dados de Exemplo

- **3 Clientes** com informações completas
- **3 Casos jurídicos** em diferentes status
- **3 Sessões WhatsApp** com histórico
- **5 Mensagens** de exemplo
- **3 Agendamentos** (passado, presente, futuro)

## 🛠️ Comandos Úteis

### Makefile

```bash
# Setup completo do banco
make db-setup

# Apenas popular dados
make db-seed

# Reset completo (drop + create + seed)
make db-reset

# Criar migração
make migrate msg="Descrição da mudança"

# Aplicar migrações
make upgrade

# Reverter migração
make downgrade
```

### Scripts Diretos

```bash
# Setup do banco
poetry run python scripts/setup_database.py

# Popular dados
poetry run python scripts/seed_database.py

# Executar aplicação
poetry run uvicorn app.main:app --reload
```

## 🔍 Verificação

### Testar Conexão

```python
# Teste rápido de conexão
from app.core.database import AsyncSessionLocal

async def test_connection():
    async with AsyncSessionLocal() as db:
        result = await db.execute("SELECT 1")
        print("✅ Conexão com banco OK")

# Executar: python -c "import asyncio; asyncio.run(test_connection())"
```

### Verificar Tabelas

```sql
-- Conectar ao banco
psql -U postgres -d max_system

-- Listar tabelas
\dt

-- Ver estrutura de uma tabela
\d clients

-- Contar registros
SELECT 
    'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL  
SELECT 'legal_cases', COUNT(*) FROM legal_cases;
```

## 📈 Monitoramento

### Logs de Banco

```bash
# Ver logs do PostgreSQL (Docker)
docker compose logs -f db

# Ver logs da aplicação
poetry run uvicorn app.main:app --reload --log-level debug
```

### Performance

```sql
-- Queries mais lentas
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Tamanho das tabelas
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🔧 Troubleshooting

### Problemas Comuns

1. **Erro de conexão**
   ```bash
   # Verificar se PostgreSQL está rodando
   pg_isready -h localhost -p 5432
   
   # Verificar variáveis de ambiente
   echo $DATABASE_URL
   ```

2. **Tabelas não existem**
   ```bash
   # Executar migrações
   poetry run alembic upgrade head
   ```

3. **Dados não aparecem**
   ```bash
   # Popular banco
   poetry run python scripts/seed_database.py
   ```

4. **Erro de permissão**
   ```sql
   -- Dar permissões ao usuário
   GRANT ALL PRIVILEGES ON DATABASE max_system TO postgres;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
   ```

### Reset Completo

```bash
# Parar aplicação
# Ctrl+C

# Remover banco (cuidado!)
dropdb max_system

# Recriar tudo
createdb max_system
make db-setup
```

## 🔐 Segurança

### Configurações de Produção

```bash
# Usar senhas fortes
POSTGRES_PASSWORD=senha_super_segura_aqui

# Restringir acesso
# No pg_hba.conf:
# host max_system postgres 127.0.0.1/32 md5

# SSL em produção
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/max_system?ssl=require
```

### Backup

```bash
# Backup completo
pg_dump -U postgres -h localhost max_system > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres -h localhost max_system < backup_20241214.sql
```

## 📞 Suporte

Para problemas com o banco de dados:

1. Verificar logs da aplicação e PostgreSQL
2. Testar conexão com `psql`
3. Verificar migrações com `alembic current`
4. Consultar este guia para comandos

**Happy Database Management! 🗄️**