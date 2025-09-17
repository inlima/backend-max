# 🧪 Guia de Testes da API - Advocacia Direta Backend

Este guia fornece instruções completas para testar todos os endpoints da API usando Swagger UI e Insomnia.

## 📋 Índice

- [Swagger UI - Documentação Interativa](#swagger-ui)
- [Collection do Insomnia](#insomnia-collection)
- [Endpoints Principais](#endpoints-principais)
- [Fluxo de Testes](#fluxo-de-testes)
- [Exemplos de Payloads](#exemplos-de-payloads)

## 🌐 Swagger UI

### Acessando a Documentação

1. **Inicie a aplicação:**
   ```bash
   docker-compose up -d
   # ou
   poetry run uvicorn app.main:app --reload
   ```

2. **Acesse o Swagger UI:**
   - **URL:** http://localhost:8000/docs
   - **ReDoc:** http://localhost:8000/redoc
   - **OpenAPI JSON:** http://localhost:8000/openapi.json

### Funcionalidades do Swagger

- ✅ **Documentação completa** de todos os endpoints
- ✅ **Interface interativa** para testar requests
- ✅ **Schemas de dados** com validação
- ✅ **Exemplos de payloads** para cada endpoint
- ✅ **Autenticação JWT** integrada
- ✅ **Códigos de resposta** detalhados

## 📦 Collection do Insomnia

### Importando a Collection

1. **Baixe o arquivo:** `insomnia_collection.json`
2. **Abra o Insomnia**
3. **Import Data** → **From File**
4. **Selecione** o arquivo `insomnia_collection.json`

### Estrutura da Collection

```
📁 Advocacia Direta - Backend API
├── 🏠 API Root
├── 🏥 Health Check
│   └── Health Check
├── 🔐 Autenticação
│   ├── Login (Admin)
│   ├── Login (Recepcionista)
│   ├── Get Current User
│   ├── Refresh Token
│   └── Logout
├── 👥 Contatos
│   ├── Listar Contatos
│   ├── Obter Contato
│   ├── Mensagens do Contato
│   ├── Criar Contato
│   └── Atualizar Contato
├── ⚖️ Processos
│   ├── Listar Processos
│   ├── Obter Processo
│   ├── Criar Processo
│   └── Atualizar Processo
├── 📊 Dashboard
│   ├── Métricas Dashboard
│   ├── Dados do Gráfico
│   └── Atividade Recente
└── 📱 WhatsApp Webhook
    ├── Verificar Webhook
    └── Receber Webhook
```

### Variáveis de Ambiente

A collection inclui variáveis configuráveis:

```json
{
  "base_url": "http://localhost:8000",
  "auth_token": "",
  "contato_id": "",
  "processo_id": ""
}
```

## 🎯 Endpoints Principais

### 1. Autenticação

#### Login Admin
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@advocacia.com",
  "password": "admin123"
}
```

#### Login Recepcionista
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "recepcionista@advocacia.com",
  "password": "recep123"
}
```

### 2. Contatos

#### Listar Contatos
```http
GET /api/contatos?page=1&limit=10
Authorization: Bearer {token}
```

#### Criar Contato
```http
POST /api/contatos
Authorization: Bearer {token}
Content-Type: application/json

{
  "nome": "João Silva",
  "telefone": "5511999999999",
  "areaInteresse": "Direito Civil",
  "preferenciaAtendimento": "presencial"
}
```

### 3. Processos

#### Listar Processos
```http
GET /api/processos?page=1&limit=10
Authorization: Bearer {token}
```

#### Criar Processo
```http
POST /api/processos
Authorization: Bearer {token}
Content-Type: application/json

{
  "titulo": "Ação Trabalhista - João Silva",
  "contatoId": "{contato_id}",
  "areaJuridica": "Direito Trabalhista",
  "descricao": "Processo de rescisão indevida"
}
```

### 4. Dashboard

#### Métricas
```http
GET /api/dashboard/metrics
Authorization: Bearer {token}
```

#### Dados do Gráfico
```http
GET /api/dashboard/chart-data?days=30
Authorization: Bearer {token}
```

### 5. WhatsApp Webhook

#### Verificar Webhook
```http
GET /webhook?hub.mode=subscribe&hub.challenge=test&hub.verify_token=seu_token
```

#### Receber Mensagem
```http
POST /webhook
Content-Type: application/json

{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "id": "wamid.test123",
          "from": "5511999999999",
          "timestamp": "1702550400",
          "type": "text",
          "text": {
            "body": "Olá, preciso de ajuda jurídica"
          }
        }],
        "contacts": [{
          "profile": {
            "name": "João Silva"
          }
        }]
      }
    }]
  }]
}
```

## 🔄 Fluxo de Testes

### 1. Teste Básico de Funcionamento

```bash
# 1. Verificar saúde da API
curl http://localhost:8000/health/

# 2. Verificar endpoint raiz
curl http://localhost:8000/

# 3. Acessar documentação
open http://localhost:8000/docs
```

### 2. Fluxo de Autenticação

1. **Login** com credenciais válidas
2. **Copiar token** da resposta
3. **Configurar** token nas próximas requisições
4. **Testar** endpoint protegido (`/api/auth/me`)
5. **Refresh** token quando necessário

### 3. Fluxo de Contatos

1. **Listar** contatos existentes
2. **Criar** novo contato
3. **Obter** detalhes do contato criado
4. **Atualizar** informações do contato
5. **Visualizar** mensagens do contato

### 4. Fluxo de Processos

1. **Criar** contato primeiro
2. **Criar** processo vinculado ao contato
3. **Listar** processos
4. **Atualizar** processo
5. **Verificar** vinculação com contato

### 5. Fluxo de Dashboard

1. **Obter** métricas gerais
2. **Visualizar** dados do gráfico
3. **Verificar** atividade recente
4. **Testar** filtros por período

## 📝 Exemplos de Payloads

### Criar Contato Completo
```json
{
  "nome": "Maria Santos",
  "telefone": "5511888888888",
  "email": "maria@email.com",
  "areaInteresse": "Direito de Família",
  "tipoSolicitacao": "consulta",
  "preferenciaAtendimento": "online",
  "observacoes": "Cliente preferencial"
}
```

### Criar Processo Completo
```json
{
  "titulo": "Divórcio Consensual - Maria Santos",
  "contatoId": "uuid-do-contato",
  "areaJuridica": "Direito de Família",
  "descricao": "Processo de divórcio consensual com partilha de bens",
  "prioridade": "alta",
  "prazoLimite": "2024-12-31T23:59:59Z",
  "observacoes": "Cliente tem urgência na resolução"
}
```

### Webhook WhatsApp Completo
```json
{
  "entry": [{
    "id": "entry_id",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "15551234567",
          "phone_number_id": "123456789"
        },
        "contacts": [{
          "profile": {
            "name": "João Silva"
          },
          "wa_id": "5511999999999"
        }],
        "messages": [{
          "id": "wamid.HBgLNTUxMTk5OTk5OTk5ORUCABIYFjNBMDJCMDlBNjBCMzU3NDgyRkE3",
          "from": "5511999999999",
          "timestamp": "1702550400",
          "type": "text",
          "text": {
            "body": "Olá, preciso de ajuda com um processo trabalhista"
          }
        }]
      },
      "field": "messages"
    }]
  }]
}
```

## 🚀 Dicas de Teste

### Swagger UI
- Use o botão **"Authorize"** para configurar o token JWT
- Teste diferentes cenários de erro (401, 404, 422)
- Verifique os schemas de resposta
- Use os exemplos fornecidos como base

### Insomnia
- Configure as variáveis de ambiente corretamente
- Use **Tests** para automatizar validações
- Organize requests em **folders** por funcionalidade
- Salve **responses** importantes para referência

### Testes Automatizados
```bash
# Executar testes da API
poetry run pytest tests/test_api_integration.py -v

# Executar com coverage
poetry run pytest --cov=app tests/ --cov-report=html
```

## 🔧 Troubleshooting

### Problemas Comuns

1. **401 Unauthorized**
   - Verificar se o token JWT está válido
   - Fazer login novamente se necessário

2. **404 Not Found**
   - Verificar se o endpoint existe
   - Confirmar se a aplicação está rodando

3. **422 Validation Error**
   - Verificar formato dos dados enviados
   - Consultar schema no Swagger

4. **500 Internal Server Error**
   - Verificar logs da aplicação
   - Confirmar conexão com banco de dados

### Logs e Debug
```bash
# Ver logs da aplicação
docker-compose logs -f app

# Executar em modo debug
poetry run uvicorn app.main:app --reload --log-level debug
```

---

## 📞 Suporte

Para dúvidas sobre os testes da API:

1. Consulte a documentação no Swagger UI
2. Verifique os logs da aplicação
3. Execute os testes automatizados
4. Consulte este guia para exemplos

**Happy Testing! 🎉**