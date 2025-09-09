# Advocacia Direta WhatsApp Bot - MVP

Um chatbot WhatsApp para automação de atendimento inicial em escritórios de advocacia usando a API oficial do WhatsApp Business Platform.

## Sobre o MVP

Esta é a versão MVP (Minimum Viable Product) focada nas funcionalidades essenciais para validar a proposta de valor:

### Funcionalidades Incluídas no MVP
- ✅ Atendimento automatizado básico via WhatsApp
- ✅ Identificação de cliente (novo/antigo)
- ✅ Seleção de área de atuação
- ✅ Solicitação de agendamento (presencial/online)
- ✅ Transferência simples para atendimento humano
- ✅ Gerenciamento de estado em memória
- ✅ Deploy básico com Docker

### Funcionalidades para Versões Futuras
- 📊 Analytics avançados e métricas detalhadas
- 🔒 Segurança avançada e compliance LGPD completo
- 💾 Persistência em banco de dados
- 🔄 Tratamento de erro robusto com retry
- 📈 Monitoramento de produção (Prometheus/Grafana)
- 🧪 Suite de testes abrangente
- 💬 Templates de mensagem avançados

## Setup Rápido

1. **Instalar dependências:**
```bash
pip install fastapi uvicorn python-dotenv requests
```

2. **Configurar ambiente:**
```bash
cp .env.example .env
# Edite o .env com suas credenciais do WhatsApp Business API
```

3. **Executar aplicação:**
```bash
uvicorn app.main:app --reload
```

## Estrutura do Projeto (MVP)

```
app/
├── main.py              # Aplicação FastAPI principal
├── api/
│   └── webhooks.py      # Webhook do WhatsApp
├── services/
│   ├── whatsapp.py      # Cliente WhatsApp simples
│   ├── conversation.py  # Lógica de conversa
│   └── state.py         # Gerenciamento de estado em memória
└── templates/
    └── messages.py      # Templates de mensagem
```

## Configuração Mínima

### Variáveis de Ambiente Obrigatórias

```bash
# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=seu_token_aqui
WHATSAPP_PHONE_NUMBER_ID=seu_phone_id_aqui
WHATSAPP_WEBHOOK_VERIFY_TOKEN=seu_verify_token_aqui

# Configuração básica
ENVIRONMENT=development
LOG_LEVEL=INFO
```

## Deploy Simples

1. **Build da imagem:**
```bash
docker build -t advocacia-whatsapp-mvp .
```

2. **Executar container:**
```bash
docker run -p 8000:8000 --env-file .env advocacia-whatsapp-mvp
```

3. **Verificar saúde:**
```bash
curl http://localhost:8000/health
```

## Desenvolvimento

### Executar localmente:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Testar webhook:
```bash
curl -X POST http://localhost:8000/webhook \
  -H "Content-Type: application/json" \
  -d '{"entry": [{"changes": [{"value": {"messages": [{"from": "5511999999999", "text": {"body": "oi"}}]}}]}]}'
```

## Próximos Passos

Após validar o MVP, as próximas funcionalidades a implementar são:

1. **Persistência de dados** - Migrar para PostgreSQL
2. **Analytics básicos** - Métricas de conversão
3. **Tratamento de erro** - Retry e fallbacks
4. **Testes automatizados** - Cobertura básica
5. **Monitoramento** - Logs estruturados
6. **Segurança** - Rate limiting e validação

## Suporte

Para dúvidas sobre o MVP:
1. Verifique os logs da aplicação
2. Teste o endpoint `/health`
3. Valide as credenciais do WhatsApp Business API