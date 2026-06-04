# Painel Administrativo INCA

Sistema de administração completo para o Portal do Produtor INCA.

## 🚀 Instalação

### 1. Executar Schema Administrativo

Abra o **SQL Server Management Studio (SSMS)** e execute o ficheiro `schema_admin.sql`:

```sql
-- No SSMS, conecte a localhost\SQLEXPRESS e execute:
-- File → Open → schema_admin.sql → Execute (F5)
```

Isto irá criar:
- Tabela `administradores` (utilizadores admin)
- Tabela `admin_logs` (logs de atividade)
- Índices para performance
- 2 contas de administrador demo

### 2. Reiniciar o Servidor

```bash
# Parar o servidor atual (Ctrl+C)
# Iniciar novamente
npm start
```

O servidor irá carregar as novas rotas administrativas automaticamente.

---

## 🔐 Acesso ao Painel

### URL
```
http://localhost:3001/admin.html
```

### Credenciais Demo

**Super Admin:**
- Email: `admin@inca.ao`
- Password: `Admin@2026`
- Permissões: Acesso total

**Operador:**
- Email: `operador@inca.ao`
- Password: `Operador@2026`
- Permissões: Operações básicas

---

## 📋 Funcionalidades

### Dashboard
- Estatísticas em tempo real
- Contadores de pendências
- Visão geral do sistema

### Gestão de Produtores
- Listar produtores pendentes de validação
- Aprovar cadastros
- Rejeitar cadastros (com motivo)
- Desactivar produtores

### Gestão de Certificados
- Listar certificados pendentes
- Emitir certificados de origem
- Rejeitar certificados (com observações)
- Histórico de certificados

### Gestão de Pedidos de Apoio
- Listar pedidos em análise
- Aprovar pedidos
- Rejeitar pedidos
- Acompanhamento de apoios

### Logs de Atividade
- Histórico completo de ações administrativas
- Rastreabilidade de operações
- Auditoria de sistema

---

## 🔧 API Endpoints

### Autenticação
```
POST   /api/admin/login          - Login administrativo
GET    /api/admin/me             - Dados do admin logado
```

### Produtores
```
GET    /api/admin/produtores/pendentes    - Listar pendentes
GET    /api/admin/produtores              - Listar todos (filtros)
PUT    /api/admin/produtores/:id/aprovar  - Aprovar
PUT    /api/admin/produtores/:id/rejeitar - Rejeitar
PUT    /api/admin/produtores/:id/desactivar - Desactivar
```

### Certificados
```
GET    /api/admin/certificados/pendentes  - Listar pendentes
GET    /api/admin/certificados            - Listar todos (filtros)
PUT    /api/admin/certificados/:id/emitir - Emitir
PUT    /api/admin/certificados/:id/rejeitar - Rejeitar
```

### Pedidos de Apoio
```
GET    /api/admin/apoios/pendentes        - Listar pendentes
GET    /api/admin/apoios                  - Listar todos (filtros)
PUT    /api/admin/apoios/:id/aprovar      - Aprovar
PUT    /api/admin/apoios/:id/rejeitar     - Rejeitar
```

### Dashboard & Logs
```
GET    /api/admin/dashboard               - Estatísticas gerais
GET    /api/admin/logs                    - Logs de atividade
```

---

## 🔒 Segurança

### Autenticação JWT
- Tokens válidos por 8 horas
- Renovação automática necessária após expiração
- Armazenamento seguro em localStorage

### Níveis de Acesso
1. **super_admin** - Acesso total ao sistema
2. **admin** - Gestão de produtores, certificados e apoios
3. **operador** - Visualização e operações básicas

### Logs de Auditoria
Todas as ações administrativas são registadas com:
- ID do administrador
- Tipo de ação
- Entidade afetada
- Detalhes da operação
- IP do utilizador
- Data/hora

---

## 📊 Estrutura de Base de Dados

### Tabela: administradores
```sql
id              INT PRIMARY KEY
nome            NVARCHAR(200)
email           NVARCHAR(120) UNIQUE
password_hash   NVARCHAR(255)
nivel           NVARCHAR(20)  -- super_admin, admin, operador
activo          BIT
criado_em       DATETIME2
ultimo_acesso   DATETIME2
```

### Tabela: admin_logs
```sql
id              INT PRIMARY KEY
admin_id        INT FOREIGN KEY
acao            NVARCHAR(100)  -- APROVAR, REJEITAR, EMITIR, etc.
entidade        NVARCHAR(50)   -- produtor, certificado, pedido_apoio
entidade_id     INT
detalhes        NVARCHAR(MAX)
ip_address      NVARCHAR(45)
criado_em       DATETIME2
```

---

## 🎯 Fluxo de Validação

### Produtores
1. Produtor regista-se no portal (`activo = 0`)
2. Admin recebe notificação no dashboard
3. Admin revê dados do produtor
4. Admin aprova → `activo = 1` (produtor pode fazer login)
5. Admin rejeita → registo removido da BD

### Certificados
1. Produtor solicita certificado (`estado = 'pendente'`)
2. Admin recebe notificação
3. Admin revê dados do certificado
4. Admin emite → `estado = 'emitido'`
5. Admin rejeita → `estado = 'rejeitado'` (com observações)

### Pedidos de Apoio
1. Produtor submete pedido (`estado = 'em_analise'`)
2. Admin recebe notificação
3. Admin analisa pedido
4. Admin aprova → `estado = 'aprovado'`
5. Admin rejeita → `estado = 'rejeitado'`

---

## 🛠️ Desenvolvimento

### Adicionar Novo Administrador

Via SQL:
```sql
-- Gerar hash da password primeiro (use generate_admin_hashes.js)
INSERT INTO administradores (nome, email, password_hash, nivel)
VALUES ('Nome', 'email@inca.ao', '$2a$10$...', 'admin');
```

Via Script:
```bash
node generate_admin_hashes.js
# Copie o hash gerado e insira no SQL acima
```

### Modificar Permissões

```sql
-- Promover a super_admin
UPDATE administradores SET nivel = 'super_admin' WHERE email = 'email@inca.ao';

-- Desactivar conta
UPDATE administradores SET activo = 0 WHERE email = 'email@inca.ao';
```

---

## 📝 Notas Importantes

1. **Primeira Execução**: Execute `schema_admin.sql` antes de aceder ao painel
2. **Segurança**: Altere as passwords demo em produção
3. **JWT_SECRET**: Use uma chave forte em produção (`.env`)
4. **Backup**: Faça backup regular da tabela `admin_logs`
5. **HTTPS**: Use HTTPS em produção para proteger tokens

---

## 🐛 Troubleshooting

### Erro: "Token inválido ou expirado"
- Faça logout e login novamente
- Verifique se JWT_SECRET está configurado no `.env`

### Erro: "Permissão insuficiente"
- Verifique o nível do seu utilizador na BD
- Apenas `admin` e `super_admin` podem aprovar/rejeitar

### Tabelas não existem
- Execute `schema_admin.sql` no SSMS
- Verifique se está conectado à BD `inca_portal`

### Não consigo fazer login
- Verifique se o servidor está a correr
- Confirme que executou o schema administrativo
- Teste com as credenciais demo fornecidas

---

## 📞 Suporte

Para questões ou problemas, contacte a equipa de desenvolvimento INCA.

**Versão**: 1.0.0  
**Data**: Março 2026
