-- ════════════════════════════════════════════════════════════
--  INCA Portal — Schema Administrativo
--  Adiciona tabelas e dados para o painel de administração
-- ════════════════════════════════════════════════════════════

USE inca_portal;
GO

-- ── Administradores ───────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'administradores')
CREATE TABLE administradores (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    nome            NVARCHAR(200)  NOT NULL,
    email           NVARCHAR(120)  NOT NULL UNIQUE,
    password_hash   NVARCHAR(255)  NOT NULL,
    nivel           NVARCHAR(20)   DEFAULT 'operador'
                    CHECK (nivel IN ('super_admin','admin','operador')),
    activo          BIT            DEFAULT 1,
    criado_em       DATETIME2      DEFAULT GETDATE(),
    ultimo_acesso   DATETIME2
);
GO

-- ── Logs de Ações Administrativas ─────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'admin_logs')
CREATE TABLE admin_logs (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    admin_id        INT            NOT NULL REFERENCES administradores(id),
    acao            NVARCHAR(100)  NOT NULL,
    entidade        NVARCHAR(50)   NOT NULL,
    entidade_id     INT,
    detalhes        NVARCHAR(MAX),
    ip_address      NVARCHAR(45),
    criado_em       DATETIME2      DEFAULT GETDATE()
);
GO

-- ── Índices para Performance ──────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_produtores_activo')
    CREATE INDEX idx_produtores_activo ON produtores(activo);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_certificados_estado')
    CREATE INDEX idx_certificados_estado ON certificados(estado);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_pedidos_apoio_estado')
    CREATE INDEX idx_pedidos_apoio_estado ON pedidos_apoio(estado);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_admin_logs_admin_id')
    CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id);
GO

-- ════════════════════════════════════════════════════════════
--  DADOS INICIAIS
-- ════════════════════════════════════════════════════════════

-- Admin padrão (email: admin@inca.ao, password: Admin@2026)
-- Hash bcrypt de "Admin@2026"
IF NOT EXISTS (SELECT 1 FROM administradores WHERE email = 'admin@inca.ao')
INSERT INTO administradores (nome, email, password_hash, nivel)
VALUES (
    'Administrador INCA',
    'admin@inca.ao',
    '$2a$10$2mtK9ojsqoIskzhNz6XBJOZk0txXX99oLrmC6ZVItHMTtin77vR3C',
    'super_admin'
);
GO

-- Operador demo (email: operador@inca.ao, password: Operador@2026)
IF NOT EXISTS (SELECT 1 FROM administradores WHERE email = 'operador@inca.ao')
INSERT INTO administradores (nome, email, password_hash, nivel)
VALUES (
    'Operador Demo',
    'operador@inca.ao',
    '$2a$10$zy.Qm7V0vrYYnZAuBtRCTOSALy79GHgP8CvRZI3IEpPNvhLy.txDe',
    'operador'
);
GO

PRINT '════════════════════════════════════════════════════════════';
PRINT '  ✅ Schema administrativo criado com sucesso!';
PRINT '';
PRINT '  Contas de administrador criadas:';
PRINT '  ─────────────────────────────────────────────────────────';
PRINT '  Super Admin:';
PRINT '    Email: admin@inca.ao';
PRINT '    Password: Admin@2026';
PRINT '';
PRINT '  Operador:';
PRINT '    Email: operador@inca.ao';
PRINT '    Password: Operador@2026';
PRINT '════════════════════════════════════════════════════════════';
GO
