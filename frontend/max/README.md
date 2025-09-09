# Advocacia Direta - Dashboard Frontend

Sistema de gestão de atendimento jurídico via WhatsApp construído com Next.js 15, React 19 e shadcn/ui.

## 🚀 Tecnologias

- **Next.js 15** - Framework React com App Router
- **React 19** - Biblioteca de interface de usuário
- **TypeScript** - Tipagem estática
- **Tailwind CSS v4** - Framework de CSS utilitário
- **shadcn/ui** - Componentes de UI baseados em Radix UI
- **Socket.IO Client** - Comunicação em tempo real via WebSocket
- **SWR** - Fetching de dados com cache
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de esquemas
- **date-fns** - Manipulação de datas
- **Recharts** - Gráficos e visualizações

## 📁 Estrutura do Projeto

```
frontend/max/
├── app/                    # App Router do Next.js
│   ├── dashboard/         # Página do dashboard
│   ├── contatos/          # Página de contatos
│   ├── processos/         # Página de processos
│   ├── layout.tsx         # Layout raiz
│   └── globals.css        # Estilos globais
├── components/            # Componentes React
│   ├── ui/               # Componentes base do shadcn/ui
│   └── ...               # Componentes específicos
├── hooks/                # Custom hooks
├── lib/                  # Utilitários e configurações
│   ├── api-client.ts     # Cliente da API
│   ├── validations.ts    # Esquemas de validação
│   ├── constants.ts      # Constantes da aplicação
│   ├── date-utils.ts     # Utilitários de data
│   └── utils.ts          # Utilitários gerais
├── providers/            # Context providers
│   ├── websocket-provider.tsx
│   └── theme-provider.tsx
├── types/                # Definições de tipos TypeScript
└── public/               # Assets estáticos
```

## 🛠️ Configuração

### Pré-requisitos

- Node.js 18+ 
- npm ou yarn

### Instalação

1. Clone o repositório e navegue para o diretório do frontend:
```bash
cd frontend/max
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```

4. Edite o arquivo `.env.local` com suas configurações:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8000
NEXT_PUBLIC_APP_NAME="Advocacia Direta Dashboard"
NEXT_PUBLIC_APP_VERSION="1.0.0"
NODE_ENV=development
```

### Desenvolvimento

Execute o servidor de desenvolvimento:
```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

### Build para Produção

```bash
npm run build
npm start
```

## 📋 Funcionalidades

### Dashboard
- Métricas em tempo real de contatos e processos
- Gráficos interativos de performance
- Atividades recentes
- Indicadores de satisfação do cliente

### Contatos
- Lista de contatos do WhatsApp em tempo real
- Filtros por status, origem e data
- Histórico completo de conversas
- Cadastro manual de contatos
- Notificações de novas mensagens

### Processos
- Gestão de processos jurídicos
- Vinculação com contatos
- Filtros por área jurídica, status e prioridade
- Acompanhamento de prazos
- Histórico de atividades

### Recursos Técnicos
- Atualizações em tempo real via WebSocket
- Interface responsiva para desktop e mobile
- Tema claro/escuro
- Tratamento de erros com Error Boundaries
- Cache inteligente com SWR
- Validação de formulários com Zod
- Componentes acessíveis com Radix UI

## 🔌 Integração com Backend

O frontend se conecta com o backend Python/FastAPI através de:

- **REST API**: Para operações CRUD (GET, POST, PUT, DELETE)
- **WebSocket**: Para atualizações em tempo real
- **Webhooks**: Para eventos do WhatsApp (processados pelo backend)

### Endpoints da API

```typescript
// Dashboard
GET /api/dashboard/metrics
GET /api/dashboard/chart-data
GET /api/dashboard/recent-activity

// Contatos
GET /api/contatos
GET /api/contatos/:id
POST /api/contatos
PUT /api/contatos/:id
DELETE /api/contatos/:id
GET /api/contatos/:id/messages

// Processos
GET /api/processos
GET /api/processos/:id
POST /api/processos
PUT /api/processos/:id
DELETE /api/processos/:id
```

### Eventos WebSocket

```typescript
// Eventos recebidos
'novo_contato' - Novo contato via WhatsApp
'contato_atualizado' - Contato modificado
'processo_atualizado' - Processo modificado
'nova_mensagem' - Nova mensagem no WhatsApp
'metrics_updated' - Métricas atualizadas
```

## 🧪 Testes

```bash
# Executar testes unitários
npm run test

# Executar testes com coverage
npm run test:coverage

# Executar testes E2E
npm run test:e2e
```

## 📦 Deploy

### Vercel (Recomendado)

1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### Docker

```bash
# Build da imagem
docker build -t advocacia-frontend .

# Executar container
docker run -p 3000:3000 advocacia-frontend
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o projeto, entre em contato através dos issues do GitHub ou email: suporte@advocaciadireta.com.br