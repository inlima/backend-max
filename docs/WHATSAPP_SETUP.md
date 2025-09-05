# WhatsApp Business API Setup Guide

## Overview

This guide walks you through setting up the WhatsApp Business API integration for the Advocacia Direta WhatsApp Bot.

## Prerequisites

1. **Meta Business Account**: You need a verified Meta Business account
2. **WhatsApp Business Account**: Connected to your Meta Business account
3. **Phone Number**: A business phone number for WhatsApp verification
4. **Domain**: A verified domain for webhook URLs
5. **SSL Certificate**: HTTPS is required for webhook endpoints

## Step 1: Meta Business Manager Setup

### 1.1 Create Meta Business Account

1. Go to [Meta Business Manager](https://business.facebook.com/)
2. Click "Create Account" and follow the setup process
3. Verify your business information and documents
4. Complete business verification (may take several days)

### 1.2 Add WhatsApp Business Account

1. In Meta Business Manager, go to "Business Settings"
2. Click "Accounts" → "WhatsApp Business Accounts"
3. Click "Add" → "Create a new WhatsApp Business Account"
4. Follow the setup wizard to add your business phone number
5. Verify the phone number via SMS or voice call

## Step 2: WhatsApp Business API Setup

### 2.1 Create WhatsApp Business App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Select "Business" as the app type
4. Fill in app details and create the app
5. Add "WhatsApp Business Platform" product to your app

### 2.2 Configure WhatsApp Business Platform

1. In your app dashboard, go to "WhatsApp" → "Getting Started"
2. Select your WhatsApp Business Account
3. Add a phone number to your app
4. Generate a temporary access token (for testing)

### 2.3 Get Production Access Token

1. Go to "WhatsApp" → "Configuration"
2. Create a system user in Meta Business Manager
3. Assign the system user to your WhatsApp Business Account
4. Generate a permanent access token for the system user
5. Set appropriate permissions (whatsapp_business_messaging, whatsapp_business_management)

## Step 3: Webhook Configuration

### 3.1 Configure Webhook URL

1. In your WhatsApp app dashboard, go to "WhatsApp" → "Configuration"
2. In the "Webhook" section, click "Configure"
3. Enter your webhook URL: `https://yourdomain.com/webhooks/whatsapp`
4. Enter your webhook verify token (set in environment variables)
5. Subscribe to webhook fields:
   - `messages` (required for receiving messages)
   - `message_deliveries` (optional, for delivery status)

### 3.2 Verify Webhook

1. Click "Verify and Save" in the webhook configuration
2. Meta will send a GET request to verify your webhook
3. Your application should respond with the challenge parameter
4. Check your application logs to confirm verification success

## Step 4: Environment Configuration

### 4.1 Required Environment Variables

Add these to your `.env` file:

```bash
# WhatsApp Business API Configuration
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token_here

# Optional: App Secret for signature verification
WHATSAPP_APP_SECRET=your_app_secret_here

# Webhook URL (for testing and compliance checks)
WEBHOOK_URL=https://yourdomain.com

# Test phone number (for integration testing)
TEST_PHONE_NUMBER=+5511999999999
```

### 4.2 Get Required Values

**Access Token**: From system user in Meta Business Manager
**Phone Number ID**: From WhatsApp → Configuration in your app dashboard
**Webhook Verify Token**: Create a random string (32+ characters)
**App Secret**: From App Dashboard → Settings → Basic

## Step 5: Message Templates

### 5.1 Create Message Templates

1. Go to Meta Business Manager → WhatsApp Manager
2. Click "Message Templates"
3. Create templates for business-initiated messages
4. Submit templates for approval (review process takes 24-48 hours)

### 5.2 Template Categories

- **Utility**: Account updates, order confirmations
- **Marketing**: Promotional messages, newsletters
- **Authentication**: OTP codes, verification messages

### 5.3 Template Example

```json
{
  "name": "welcome_message",
  "category": "UTILITY",
  "language": "pt_BR",
  "components": [
    {
      "type": "BODY",
      "text": "Olá {{1}}, bem-vindo ao atendimento da {{2}}! Como posso ajudá-lo hoje?"
    }
  ]
}
```

## Step 6: Testing and Validation

### 6.1 Run Integration Tests

```bash
# Test WhatsApp integration
python scripts/test_whatsapp_integration.py

# Check compliance
python scripts/check_whatsapp_compliance.py
```

### 6.2 Test Message Sending (Development Only)

```bash
# Set test phone number
export TEST_PHONE_NUMBER="+5511999999999"

# Run integration test with message sending
python scripts/test_whatsapp_integration.py
```

### 6.3 Webhook Testing

1. Use a tool like ngrok for local testing:
```bash
ngrok http 8000
```

2. Update webhook URL to ngrok URL temporarily
3. Send test messages to your WhatsApp number
4. Check application logs for incoming webhooks

## Step 7: Production Deployment

### 7.1 Domain Verification

1. Add your production domain to Meta Business Manager
2. Verify domain ownership via DNS or HTML file
3. Update webhook URL to production domain

### 7.2 Security Configuration

1. Enable webhook signature verification:
```bash
export WHATSAPP_APP_SECRET=your_app_secret
```

2. Configure rate limiting in nginx:
```nginx
location /webhooks/whatsapp {
    limit_req zone=webhook burst=20 nodelay;
    # ... other configuration
}
```

3. Set up monitoring and alerting for webhook failures

### 7.3 Go Live

1. Complete business verification in Meta Business Manager
2. Request production access for your app
3. Update to production access token
4. Test end-to-end message flow
5. Monitor for any issues

## Step 8: Compliance and Best Practices

### 8.1 WhatsApp Business Policy Compliance

- Only send messages users have opted into
- Provide clear opt-out mechanisms
- Respect user preferences and local laws
- Don't send spam or promotional content without consent
- Use approved message templates for business-initiated messages

### 8.2 Technical Best Practices

- Respond to webhooks within 20 seconds
- Implement proper error handling and retries
- Monitor API rate limits and usage
- Keep access tokens secure and rotate regularly
- Log all interactions for debugging and compliance

### 8.3 User Experience Best Practices

- Provide clear instructions and help commands
- Handle errors gracefully with helpful messages
- Implement conversation timeouts and re-engagement
- Offer multiple ways to contact support
- Respect user privacy and data protection laws

## Troubleshooting

### Common Issues

1. **Webhook Verification Fails**
   - Check webhook verify token matches environment variable
   - Ensure webhook URL is accessible from internet
   - Verify HTTPS certificate is valid

2. **Messages Not Received**
   - Check webhook subscription fields
   - Verify phone number is correctly configured
   - Check application logs for errors

3. **API Calls Fail**
   - Verify access token is valid and not expired
   - Check phone number ID is correct
   - Ensure proper permissions are granted

4. **Rate Limiting Issues**
   - Monitor API usage in Meta Business Manager
   - Implement exponential backoff for retries
   - Consider upgrading to higher rate limits

### Support Resources

- [WhatsApp Business Platform Documentation](https://developers.facebook.com/docs/whatsapp)
- [Meta Business Help Center](https://www.facebook.com/business/help)
- [WhatsApp Business Policy](https://www.whatsapp.com/legal/business-policy)
- [Meta for Developers Community](https://developers.facebook.com/community/)

## Security Considerations

### Access Token Security

- Store access tokens securely (environment variables or secrets management)
- Use system users instead of personal access tokens
- Rotate tokens regularly
- Monitor token usage for suspicious activity

### Webhook Security

- Always use HTTPS for webhook URLs
- Implement signature verification
- Validate all incoming data
- Rate limit webhook endpoints
- Log security events for monitoring

### Data Protection

- Encrypt sensitive data at rest and in transit
- Implement proper access controls
- Comply with GDPR, LGPD, and other privacy regulations
- Provide clear privacy policies to users
- Allow users to request data deletion

## Monitoring and Maintenance

### Key Metrics to Monitor

- Webhook delivery success rate
- Message delivery rates
- API response times
- Error rates and types
- User engagement metrics

### Regular Maintenance Tasks

- Review and update message templates
- Monitor compliance with WhatsApp policies
- Update API versions as needed
- Review security configurations
- Analyze user feedback and improve flows

### Alerting Setup

Configure alerts for:
- Webhook failures
- High error rates
- API rate limit approaching
- Security events
- Service downtime