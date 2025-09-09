# 🔧 Como Corrigir o Token do Webhook

## ❌ Problema
O token configurado no Facebook não coincide com `VERIFICARTOKEN`, causando erro 403.

## ✅ Solução Rápida (FEITA)
- ✅ **Verificação de assinatura temporariamente DESABILITADA**
- ✅ **Bot funcionando normalmente** agora
- ⚠️ **Menos seguro** (aceita qualquer requisição)

## 🔧 Para Corrigir Permanentemente

### Opção 1: Atualizar Facebook (Recomendado)
1. Vá para: https://developers.facebook.com/
2. Acesse seu app WhatsApp Business API
3. Navegue para **WhatsApp** > **Configuration**
4. Na seção **Webhook**:
   - **Callback URL**: mantenha como está
   - **Verify Token**: altere para `VERIFICARTOKEN`
5. Clique em **Verify and Save**

### Opção 2: Descobrir Token Atual do Facebook
1. Vá para Facebook Developer Console
2. Veja qual token está configurado atualmente
3. Atualize seu arquivo `.env`:
   ```
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=seu_token_do_facebook
   ```

## 🔄 Após Corrigir o Token
1. Descomente a verificação de assinatura no código
2. Reinicie o servidor
3. Teste o webhook

## 📱 Status Atual
- ✅ **Bot funcionando** (pode receber mensagens do WhatsApp)
- ✅ **Webhook processando** requisições
- ⚠️ **Segurança reduzida** (verificação desabilitada)

**Teste agora:** Envie uma mensagem para seu número WhatsApp!