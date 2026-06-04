# Portal do Produtor — INCA

## Descrição

Portal completo para produtores agrícolas do Instituto Nacional do Café de Angola (INCA) com funcionalidades CRUD completas para gestão de:

- ✅ Dados pessoais do produtor
- ✅ Parcelas agrícolas
- ✅ Lotes de produção
- ✅ Certificados de origem
- ✅ Pedidos de apoio técnico e financeiro
- ✅ Rastreabilidade de lotes
- ✅ Dashboard com estatísticas

## Estrutura do Projeto

```
INCA/
├── portal-produtor.html      # Portal principal do produtor
├── login.html                # Página de login
├── reset-senha.html          # Solicitação de reset de senha
├── reset-confirmar.html      # Confirmação de reset de senha
├── instituto_cafe_angola.html # Site institucional
├── server.js                 # Backend API RESTful
├── db.js                     # Configuração da base de dados
├── schema.sql                # Schema SQL Server
├── admin.html                # Portal administrativo
├── admin-routes.js           # Rotas do admin
└── package.json              # Dependências Node.js
```

## Funcionalidades Implementadas

### 🔐 Autenticação
- Login seguro com NBI e PIN
- Sessão persistente com localStorage
- **Reset de senha via email**
- Contas de demonstração para testes

### 📊 Dashboard
- Estatísticas em tempo real
- Actividades recentes
- Próximos passos sugeridos
- Interface responsiva

### 👤 Gestão de Dados Pessoais
- Actualização de informações de contacto
- Edição de dados de produção
- Validação de formulários

### 🌾 Gestão de Parcelas
- CRUD completo para parcelas
- Coordenadas geográficas
- Cálculo automático de áreas

### 📦 Gestão de Lotes
- Registo de lotes de produção
- Acompanhamento de estados
- Histórico de eventos

### 📄 Certificados
- Solicitação de certificados de origem
- Acompanhamento do status
- Exportação de documentos

### 💰 Pedidos de Apoio
- Solicitação de apoio técnico
- Pedidos de financiamento
- Acompanhamento de análises

### 🔍 Rastreabilidade
- Consulta de histórico de lotes
- Timeline completo de eventos
- Informações de transporte

## Tecnologias Utilizadas

### Frontend
- **HTML5** semântico e acessível
- **CSS3** moderno com variáveis CSS
- **JavaScript ES6+** vanilla
- **Design responsivo** mobile-first
- **Fontes Google** (Playfair Display, Libre Baskerville, Source Sans 3)

### Backend
- **Node.js** runtime
- **Express.js** framework web
- **SQL Server** base de dados
- **bcryptjs** hashing de senhas
- **dotenv** gestão de variáveis ambiente

### Design
- **Cores temáticas** do café angolano
- **Tipografia elegante** e legível
- **Interface intuitiva** e moderna
- **Animações suaves** e micro-interações

## Instalação e Configuração

### Pré-requisitos
- Node.js 18+
- SQL Server Express
- Windows 10/11

### Passos

1. **Clonar o projeto**
```bash
git clone <repositório>
cd INCA
```

2. **Instalar dependências**
```bash
npm install
```

3. **Configurar base de dados**
```bash
# Executar no SQL Server Management Studio
sqlcmd -S localhost\SQLEXPRESS -E -i schema.sql
```

4. **Configurar ambiente**
```bash
# Copiar .env.example para .env
# Editar configurações da base de dados
```

5. **Iniciar servidor**
```bash
npm start
```

6. **URLs Disponíveis:**
- **Site Institucional**: `http://localhost:3001/instituto_cafe_angola.html`
- **Login Portal**: `http://localhost:3001/login.html`
- **Reset de Senha**: `http://localhost:3001/reset-senha.html`
- **Portal Produtor**: `http://localhost:3001/portal-produtor.html`
- **Administração**: `http://localhost:3001/admin.html`

## Contas de Demonstração

### Produtor de Café
- **NBI**: `DEMO-006-UIG-2026`
- **PIN**: `123456`
- **Nome**: João António Kafuxi
- **Localidade**: Uíge, Quimbele

### Produtora de Cacau
- **NBI**: `NBI-002-CAB-2024`
- **PIN**: `123456`
- **Nome**: Maria da Conceição Lopes
- **Localidade**: Cabinda, Belize

## API Endpoints

### Autenticação
- `POST /api/login` - Login do produtor
- `POST /api/registar` - Registo de novo produtor
- `POST /api/reset-solicitar` - Solicitar reset de senha
- `GET /api/reset-verificar` - Verificar token de reset
- `POST /api/reset-confirmar` - Confirmar reset de senha

### Produtores
- `GET /api/produtores/:nbi` - Obter dados do produtor
- `PUT /api/produtores/:id` - Actualizar dados do produtor

### Parcelas
- `GET /api/produtores/:id/parcelas` - Listar parcelas
- `POST /api/produtores/:id/parcelas` - Adicionar parcela
- `PUT /api/produtores/:id/parcelas/:parcelaId` - Actualizar parcela
- `DELETE /api/produtores/:id/parcelas/:parcelaId` - Remover parcela

### Lotes
- `GET /api/lotes` - Listar lotes
- `POST /api/lotes` - Criar lote
- `PUT /api/lotes/:id` - Actualizar lote

### Certificados
- `GET /api/certificados` - Listar certificados
- `POST /api/certificados` - Solicitar certificado
- `GET /api/certificados/:referencia` - Detalhes do certificado

### Apoios
- `GET /api/apoios` - Listar pedidos de apoio
- `POST /api/apoios` - Criar pedido de apoio
- `GET /api/apoios/:referencia` - Detalhes do pedido

### Rastreio
- `GET /api/rastreio/:codigo` - Consultar histórico de lote

## 🔐 Reset de Senha

O portal inclui um sistema completo de reset de senha:

### Fluxo do Usuário
1. **Solicitação**: Usuário informa NBI e email
2. **Token**: Sistema gera token único (32 caracteres)
3. **Validação**: Token válido por 24 horas
4. **Confirmação**: Usuário define novo PIN
5. **Acesso**: Login imediato com novo PIN

### Segurança
- ✅ Tokens únicos e aleatórios
- ✅ Expiração automática (24h)
- ✅ Validação de NBI e email
- ✅ Hash seguro do novo PIN
- ✅ Limpeza automática de tokens usados

### Demonstração
Para测试 rápido, use as contas demo:
- **João Kafuxi**: `DEMO-006-UIG-2026` / email: `joao@example.com`
- **Maria Lopes**: `NBI-002-CAB-2024` / email: `maria@example.com`

O sistema exibirá o token e link direto para teste em modo demonstração.

## Estrutura da Base de Dados

### Tabelas Principais
- **produtores** - Informações dos produtores (com campos reset_token e reset_expires)
- **parcelas** - Parcelas agrícolas
- **lotes** - Lotes de produção
- **lote_eventos** - Eventos de rastreabilidade
- **certificados** - Certificados de origem
- **pedidos_apoio** - Pedidos de apoio
- **precos_mercado** - Preços de mercado

## Segurança

- ✅ Hashing de senhas com bcrypt
- ✅ Validação de inputs do lado do servidor
- ✅ Protecção contra SQL injection
- ✅ CORS configurado
- ✅ Ambiente segregado com variáveis .env

## Funcionalidades Futuras

- 📱 Aplicação móvel React Native
- 🔄 Integração com sistemas de pagamento
- 📊 Relatórios avançados e analytics
- 🌐 Internacionalização (EN/PT)
- 📧 Sistema de notificações por email
- 🔄 Integração com blockchain para rastreabilidade

## Suporte e Contacto

- **Email**: portal@inca.gov.ao
- **Telefone**: +244 222 123 456
- **Website**: www.inca.gov.ao

## Licença

© 2026 Instituto Nacional do Café de Angola - Todos os direitos reservados

---

**Desenvolvido com ❤️ para os produtores angolanos**
