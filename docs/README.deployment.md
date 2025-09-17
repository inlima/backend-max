# Guia de Deploy - MVP Advocacia Direta WhatsApp Bot

## Visão Geral

Este guia cobre o deploy simplificado do MVP do Advocacia Direta WhatsApp Bot usando Docker.

**IMPORTANTE:** Esta é a versão MVP focada em simplicidade e validação rápida. Funcionalidades avançadas como monitoramento completo, backup automático e alta disponibilidade serão implementadas em versões futuras.

## Pré-requisitos

- Docker instalado
- Credenciais da WhatsApp Business API
- Domínio com HTTPS (para webhook em produção)

## Deploy Rápido

### 1. Preparar Ambiente

```bash
# Clonar repositório
git clone <repository-url>
cd advocacia-direta-whatsapp

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais
```

### 2. Build e Deploy

```bash
# Build da imagem
docker build -t advocacia-whatsapp-mvp .

# Executar container
docker run -d \
  --name advocacia-whatsapp \
  -p 8000:8000 \
  --env-file .env \
  --restart unless-stopped \
  advocacia-whatsapp-mvp
```

### 3. Verificar Deploy

```bash
# Verificar saúde da aplicação
curl -f http://localhost:8000/health

# Verificar logs
docker logs advocacia-whatsapp
```

## Configuração de Ambiente

### Variáveis Obrigatórias

Edite o arquivo `.env` com as seguintes variáveis:

```bash
# WhatsApp Business API (OBRIGATÓRIO)
WHATSAPP_ACCESS_TOKEN=seu_token_da_meta
WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=token_de_verificacao_personalizado

# Configuração da aplicação
ENVIRONMENT=production
LOG_LEVEL=INFO
HOST=0.0.0.0
PORT=8000

# Configuração do webhook (para produção)
WEBHOOK_URL=https://seudominio.com/webhook
```

### Como Obter Credenciais do WhatsApp

1. **Acesse o Meta for Developers:**
   - Vá para https://developers.facebook.com/
   - Crie uma conta/faça login

2. **Criar App WhatsApp Business:**
   - Crie um novo app
   - Adicione o produto "WhatsApp Business Platform"

3. **Configurar Webhook:**
   - URL do Webhook: `https://seudominio.com/webhook`
   - Verify Token: use o mesmo valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
   - Campos: `messages`

4. **Obter Credenciais:**
   - `WHATSAPP_ACCESS_TOKEN`: Token temporário (24h) ou permanente
   - `WHATSAPP_PHONE_NUMBER_ID`: ID do número de teste

## Deploy com Docker Compose (Recomendado)

Crie um arquivo `docker-compose.yml` simples:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Deploy:
```bash
docker-compose up -d
```

## Configuração de Produção

### 1. Proxy Reverso (Nginx)

Para produção, use um proxy reverso para HTTPS:

```nginx
server {
    listen 80;
    server_name seudominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name seudominio.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Configurar Webhook no Meta

1. Acesse o painel do Meta for Developers
2. Vá para WhatsApp > Configuration
3. Configure o webhook:
   - URL: `https://seudominio.com/webhook`
   - Verify Token: valor do seu `.env`
   - Subscreva aos campos: `messages`

## Monitoramento Básico

### Health Check

A aplicação fornece um endpoint básico de saúde:

```bash
# Verificar se está funcionando
curl http://localhost:8000/health

# Resposta esperada:
{"status": "healthy", "timestamp": "2024-01-01T12:00:00Z"}
```

### Logs

```bash
# Ver logs em tempo real
docker logs -f advocacia-whatsapp

# Ver logs das últimas 100 linhas
docker logs --tail 100 advocacia-whatsapp
```

## Troubleshooting

### Problemas Comuns

1. **Aplicação não inicia:**
   ```bash
   # Verificar logs
   docker logs advocacia-whatsapp
   
   # Verificar variáveis de ambiente
   docker exec advocacia-whatsapp env | grep WHATSAPP
   ```

2. **Webhook não funciona:**
   - Verificar se a URL está acessível externamente
   - Confirmar HTTPS em produção
   - Validar `WHATSAPP_WEBHOOK_VERIFY_TOKEN`

3. **Mensagens não são enviadas:**
   - Verificar `WHATSAPP_ACCESS_TOKEN` válido
   - Confirmar `WHATSAPP_PHONE_NUMBER_ID` correto
   - Verificar logs para erros da API

### Comandos Úteis

```bash
# Reiniciar aplicação
docker restart advocacia-whatsapp

# Ver uso de recursos
docker stats advocacia-whatsapp

# Executar comando dentro do container
docker exec -it advocacia-whatsapp /bin/bash

# Atualizar aplicação
docker pull advocacia-whatsapp-mvp:latest
docker stop advocacia-whatsapp
docker rm advocacia-whatsapp
# Executar novamente o comando docker run
```

## Limitações do MVP

### O que NÃO está incluído nesta versão:

- ❌ Banco de dados persistente (dados em memória)
- ❌ Backup automático
- ❌ Monitoramento avançado (Prometheus/Grafana)
- ❌ Alta disponibilidade
- ❌ Rate limiting avançado
- ❌ Logs estruturados
- ❌ Métricas detalhadas
- ❌ Alertas automáticos

### Próximas Versões

Após validar o MVP, implementaremos:

1. **v2.0:** Persistência com PostgreSQL
2. **v2.1:** Monitoramento com Prometheus
3. **v2.2:** Backup automático
4. **v2.3:** Alta disponibilidade
5. **v3.0:** Analytics avançados

## Suporte

Para problemas com o MVP:

1. **Verificar logs:** `docker logs advocacia-whatsapp`
2. **Testar health check:** `curl http://localhost:8000/health`
3. **Validar configuração:** Verificar variáveis de ambiente
4. **Consultar documentação:** WhatsApp Business Platform API

### Contato

Para suporte técnico, forneça:
- Logs da aplicação
- Configuração (sem credenciais)
- Descrição do problema
- Passos para reproduzir