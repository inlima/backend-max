# 📚 Configuração do Swagger UI - Advocacia Direta Backend

Este documento explica como a documentação Swagger foi configurada e como utilizá-la efetivamente.

## 🎯 Visão Geral

O Swagger UI foi configurado para fornecer uma documentação interativa completa da API, incluindo:

- **Documentação detalhada** de todos os endpoints
- **Interface de teste** integrada
- **Schemas de dados** com validação
- **Autenticação JWT** funcional
- **Exemplos práticos** para cada endpoint

## ⚙️ Configuração Técnica

### FastAPI Configuration

```python
app = FastAPI(
    title="Advocacia Direta - Backend API",
    description="""
    ## Sistema Backend para Automação de Atendimento Jurídico via WhatsApp
    
    Esta API fornece todos os endpoints necessários para:
    
    ### 🤖 WhatsApp Business Integration
    - Webhook para receber mensagens do WhatsApp
    - Envio automatizado de mensagens
    - Gerenciamento de conversas em tempo real
    
    ### 👥 Gestão de Clientes
    - Cadastro e atualização de clientes
    - Histórico de conversas
    - Segmentação por área jurídica
    
    ### 📊 Analytics e Métricas
    - Métricas de atendimento
    - Relatórios de conversão
    - Dashboard em tempo real
    
    ### 🔐 Autenticação e Segurança
    - Autenticação JWT
    - Controle de acesso por roles
    - Validação de webhooks
    
    ### 🔄 Comunicação em Tempo Real
    - WebSocket para atualizações instantâneas
    - Notificações push
    - Sincronização de dados
    """,
    version="1.0.0",
    contact={
        "name": "Advocacia Direta - Suporte Técnico",
        "email": "suporte@advocaciadireta.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    servers=[
        {
            "url": "http://localhost:8000",
            "description": "Servidor de Desenvolvimento"
        },
        {
            "url": "https://api.advocaciadireta.com",
            "description": "Servidor de Produção"
        }
    ]
)
```

## 🌐 URLs de Acesso

### Desenvolvimento
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **OpenAPI JSON:** http://localhost:8000/openapi.json

### Produção
- **Swagger UI:** https://api.advocaciadireta.com/docs
- **ReDoc:** https://api.advocaciadireta.com/redoc
- **OpenAPI JSON:** https://api.advocaciadireta.com/openapi.json

## 🔐 Autenticação no Swagger

### Configurando JWT Token

1. **Faça login** usando o endpoint `/api/auth/login`
2. **Copie o token** da resposta
3. **Clique em "Authorize"** no topo da página Swagger
4. **Cole o token** no campo "Value" (sem "Bearer ")
5. **Clique "Authorize"** e depois "Close"

### Exemplo de Login

```json
POST /api/auth/login
{
  "email": "admin@advocacia.com",
  "password": "admin123"
}
```

**Resposta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "email": "admin@advocacia.com",
    "name": "Administrador",
    "role": "admin",
    "is_active": true
  }
}
```

## 📋 Grupos de Endpoints

### 🏠 Root
- `GET /` - Informações básicas da API

### 🏥 Health Check
- `GET /health/` - Status da aplicação

### 🔐 Autenticação
- `POST /api/auth/login` - Login de usuário
- `GET /api/auth/me` - Dados do usuário atual
- `POST /api/auth/refresh` - Renovar token
- `POST /api/auth/logout` - Logout

### 👥 Contatos
- `GET /api/contatos` - Listar contatos
- `POST /api/contatos` - Criar contato
- `GET /api/contatos/{id}` - Obter contato
- `PUT /api/contatos/{id}` - Atualizar contato
- `GET /api/contatos/{id}/messages` - Mensagens do contato

### ⚖️ Processos
- `GET /api/processos` - Listar processos
- `POST /api/processos` - Criar processo
- `GET /api/processos/{id}` - Obter processo
- `PUT /api/processos/{id}` - Atualizar processo

### 📊 Dashboard
- `GET /api/dashboard/metrics` - Métricas principais
- `GET /api/dashboard/chart-data` - Dados para gráficos
- `GET /api/dashboard/recent-activity` - Atividade recente

### 📱 WhatsApp Webhook
- `GET /webhook` - Verificar webhook
- `POST /webhook` - Receber mensagens

## 🎨 Funcionalidades do Swagger UI

### Interface Interativa

1. **Expandir endpoints** - Clique para ver detalhes
2. **Try it out** - Botão para testar o endpoint
3. **Execute** - Executar a requisição
4. **Response** - Ver resposta da API

### Schemas de Dados

- **Request Body** - Estrutura dos dados de entrada
- **Responses** - Possíveis respostas da API
- **Models** - Definições de tipos de dados

### Exemplos Automáticos

Cada endpoint inclui exemplos automáticos baseados nos schemas Pydantic:

```python
class ContatoCreate(BaseModel):
    nome: str = Field(..., example="João Silva")
    telefone: str = Field(..., example="5511999999999")
    areaInteresse: Optional[str] = Field(None, example="Direito Civil")
    preferenciaAtendimento: Optional[str] = Field(None, example="presencial")
```

## 🧪 Testando Endpoints

### Fluxo Básico de Teste

1. **Autenticar** - Use `/api/auth/login`
2. **Configurar token** - Botão "Authorize"
3. **Testar endpoint** - "Try it out" → "Execute"
4. **Verificar resposta** - Status code e dados

### Exemplo: Criar Contato

1. **Expandir** `POST /api/contatos`
2. **Try it out**
3. **Modificar** o JSON de exemplo:
   ```json
   {
     "nome": "Maria Santos",
     "telefone": "5511888888888",
     "areaInteresse": "Direito de Família",
     "preferenciaAtendimento": "online"
   }
   ```
4. **Execute**
5. **Verificar** resposta 201 Created

### Códigos de Resposta

- **200** - Sucesso
- **201** - Criado com sucesso
- **400** - Erro de validação
- **401** - Não autorizado
- **404** - Não encontrado
- **422** - Erro de validação de dados
- **500** - Erro interno do servidor

## 📊 Schemas e Validação

### Modelos Pydantic

Todos os endpoints usam modelos Pydantic para validação:

```python
class ContatoResponse(BaseModel):
    id: str
    nome: str
    telefone: str
    email: Optional[str] = None
    status: str
    origem: str
    areaInteresse: Optional[str] = None
    primeiroContato: datetime
    ultimaInteracao: datetime
    mensagensNaoLidas: int = 0
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
```

### Validação Automática

- **Tipos de dados** - Validação automática
- **Campos obrigatórios** - Marcados com `*`
- **Formatos** - Email, telefone, etc.
- **Limites** - Min/max values

## 🔧 Personalização

### Adicionando Documentação

```python
@router.post("/contatos", response_model=ContatoResponse)
async def create_contato(
    contato: ContatoCreate,
    db: Session = Depends(get_db)
):
    """
    ## Criar Novo Contato
    
    Cria um novo contato no sistema com as informações fornecidas.
    
    ### Parâmetros
    - **nome**: Nome completo do contato
    - **telefone**: Número de telefone (formato: 5511999999999)
    - **areaInteresse**: Área jurídica de interesse (opcional)
    - **preferenciaAtendimento**: presencial ou online (opcional)
    
    ### Retorna
    - **ContatoResponse**: Dados completos do contato criado
    
    ### Códigos de Erro
    - **400**: Dados inválidos
    - **401**: Token de autenticação inválido
    - **422**: Erro de validação dos campos
    """
    # Implementação...
```

### Tags Personalizadas

```python
@router.get("/contatos", tags=["contatos", "gestão"])
async def get_contatos():
    # Implementação...
```

## 📱 Responsividade

O Swagger UI é totalmente responsivo e funciona em:

- **Desktop** - Interface completa
- **Tablet** - Layout adaptado
- **Mobile** - Interface otimizada

## 🚀 Dicas de Uso

### Para Desenvolvedores

1. **Use exemplos** - Modifique os exemplos fornecidos
2. **Teste cenários** - Teste casos de sucesso e erro
3. **Verifique schemas** - Entenda a estrutura dos dados
4. **Documente** - Adicione descrições aos endpoints

### Para QA/Testers

1. **Teste fluxos** - Siga fluxos completos de uso
2. **Valide dados** - Teste com dados inválidos
3. **Verifique códigos** - Confirme códigos de resposta
4. **Documente bugs** - Use exemplos do Swagger

### Para Integração

1. **Copie exemplos** - Use como base para integração
2. **Entenda schemas** - Implemente validação no cliente
3. **Teste autenticação** - Configure JWT corretamente
4. **Monitore erros** - Implemente tratamento de erros

## 🔍 Troubleshooting

### Problemas Comuns

1. **Swagger não carrega**
   - Verificar se a aplicação está rodando
   - Confirmar URL correta

2. **Autenticação não funciona**
   - Verificar formato do token
   - Confirmar se token não expirou

3. **Endpoints não aparecem**
   - Verificar se routers estão incluídos
   - Confirmar tags dos endpoints

4. **Exemplos não funcionam**
   - Verificar schemas Pydantic
   - Confirmar validação de dados

### Debug

```python
# Habilitar logs detalhados
import logging
logging.getLogger("uvicorn").setLevel(logging.DEBUG)

# Executar com reload
uvicorn app.main:app --reload --log-level debug
```

---

## 📞 Suporte

Para dúvidas sobre o Swagger UI:

1. Acesse http://localhost:8000/docs
2. Use os exemplos fornecidos
3. Consulte a documentação do FastAPI
4. Verifique os logs da aplicação

**Happy Documentation! 📚**