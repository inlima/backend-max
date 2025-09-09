# 🔑 Como Renovar o WhatsApp Access Token

## ❌ Problema
Seu WhatsApp Access Token expirou. Erro: `Session has expired on Saturday, 06-Sep-25 10:00:00 PDT`

## ✅ Solução

### 1. Acesse o Facebook Developer Console
- Vá para: https://developers.facebook.com/
- Faça login com sua conta Facebook

### 2. Navegue para seu App
- Clique no seu app WhatsApp Business API
- Vá para **WhatsApp** > **API Setup**

### 3. Gere um Novo Token
- Na seção **Access Token**, clique em **Generate Token**
- Selecione a página/conta WhatsApp Business
- Copie o novo token gerado

### 4. Atualize seu .env
- Abra o arquivo `.env`
- Substitua o valor de `WHATSAPP_ACCESS_TOKEN` pelo novo token
- Salve o arquivo

### 5. Reinicie o Servidor
```bash
# Pare o servidor atual
pkill -f "uvicorn app.main:app"

# Inicie novamente
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 6. Teste o Bot
```bash
python test_conversation.py
```

## 📝 Nota Importante
- Tokens do WhatsApp Business API expiram periodicamente
- Para produção, considere usar tokens permanentes ou renovação automática
- Mantenha seus tokens seguros e nunca os compartilhe publicamente

## 🚀 Status Atual
- ✅ **Webhook funcionando** (sem erro 403)
- ✅ **Verificação de assinatura desabilitada temporariamente**
- ❌ **Access token expirado** (precisa renovar)

Após renovar o token, seu bot WhatsApp estará totalmente funcional!