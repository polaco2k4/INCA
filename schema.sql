-- ════════════════════════════════════════════════════════════
--  INCA Portal — Schema SQL Server Express
--  Executar no SSMS ou sqlcmd:
--    sqlcmd -S localhost\SQLEXPRESS -E -i schema.sql
--    ou com utilizador:
--    sqlcmd -S localhost\SQLEXPRESS -U sa -P SUA_SENHA -i schema.sql
-- ════════════════════════════════════════════════════════════

-- Cria base de dados se não existir
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'inca_portal')
    CREATE DATABASE inca_portal;
GO

USE inca_portal;
GO

-- ── Produtores ────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'produtores')
CREATE TABLE produtores (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    nome            NVARCHAR(200)  NOT NULL,
    nbi             NVARCHAR(50)   NOT NULL,
    pin_hash        NVARCHAR(255),
    telefone        NVARCHAR(20),
    email           NVARCHAR(120),
    provincia       NVARCHAR(60),
    municipio       NVARCHAR(100),
    fileira         NVARCHAR(50),
    area_ha         DECIMAL(10,2),
    tipo_produtor   NVARCHAR(80)   DEFAULT 'Individual / Familiar',
    reset_token     NVARCHAR(255),
    reset_expires   DATETIME2,
    activo          BIT            DEFAULT 1,
    criado_em       DATETIME2      DEFAULT GETDATE(),
    actualizado_em  DATETIME2      DEFAULT GETDATE()
);
GO

-- ── Parcelas ──────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'parcelas')
CREATE TABLE parcelas (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    produtor_id INT           NOT NULL REFERENCES produtores(id) ON DELETE CASCADE,
    fileira     NVARCHAR(50),
    area_ha     DECIMAL(10,2),
    latitude    DECIMAL(10,6),
    longitude   DECIMAL(10,6),
    criado_em   DATETIME2     DEFAULT GETDATE()
);
GO

-- ── Lotes ─────────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lotes')
CREATE TABLE lotes (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    codigo        NVARCHAR(50)   NOT NULL UNIQUE,
    produtor_id   INT            REFERENCES produtores(id) ON DELETE SET NULL,
    fileira       NVARCHAR(50),
    produto       NVARCHAR(100),
    quantidade_kg DECIMAL(12,2),
    provincia     NVARCHAR(60),
    municipio     NVARCHAR(100),
    estado        NVARCHAR(30)   DEFAULT 'colhido'
                  CHECK (estado IN ('colhido','em_processamento','pronto','exportado')),
    criado_em     DATETIME2      DEFAULT GETDATE()
);
GO

-- ── Eventos dos Lotes ─────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lote_eventos')
CREATE TABLE lote_eventos (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    lote_id     INT           NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
    titulo      NVARCHAR(150) NOT NULL,
    descricao   NVARCHAR(300),
    tipo        NVARCHAR(20)  DEFAULT 'normal'
                CHECK (tipo IN ('normal','destaque')),
    data_evento DATETIME2     DEFAULT GETDATE()
);
GO

-- ── Certificados de Origem ────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'certificados')
CREATE TABLE certificados (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    produtor_id     INT            REFERENCES produtores(id) ON DELETE SET NULL,
    produto         NVARCHAR(100)  NOT NULL,
    quantidade_kg   DECIMAL(12,2)  NOT NULL,
    numero_lote     NVARCHAR(50),
    pais_destino    NVARCHAR(80)   NOT NULL,
    data_exportacao DATE           NOT NULL,
    referencia      NVARCHAR(50)   NOT NULL UNIQUE,
    estado          NVARCHAR(20)   DEFAULT 'pendente'
                    CHECK (estado IN ('pendente','emitido','rejeitado')),
    observacoes     NVARCHAR(MAX),
    criado_em       DATETIME2      DEFAULT GETDATE()
);
GO

-- ── Pedidos de Apoio ──────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'pedidos_apoio')
CREATE TABLE pedidos_apoio (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    produtor_id     INT            REFERENCES produtores(id) ON DELETE SET NULL,
    tipo            NVARCHAR(120)  NOT NULL,
    fileira         NVARCHAR(50)   NOT NULL,
    valor_estimado  DECIMAL(14,2),
    descricao       NVARCHAR(MAX)  NOT NULL,
    referencia      NVARCHAR(50)   NOT NULL UNIQUE,
    estado          NVARCHAR(20)   DEFAULT 'em_analise'
                    CHECK (estado IN ('em_analise','aprovado','rejeitado')),
    criado_em       DATETIME2      DEFAULT GETDATE()
);
GO

-- ── Preços de Mercado ─────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'precos_mercado')
CREATE TABLE precos_mercado (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    produto        NVARCHAR(100) NOT NULL,
    preco_aoa_kg   DECIMAL(10,2),
    preco_usd_kg   DECIMAL(8,4),
    variacao_pct   DECIMAL(6,2),
    atualizado_em  DATETIME2     DEFAULT GETDATE()
);
GO

-- ════════════════════════════════════════════════════════════
--  DADOS DE DEMO
-- ════════════════════════════════════════════════════════════

-- Produtor demo (PIN: 123456  →  hash bcrypt)
IF NOT EXISTS (SELECT 1 FROM produtores WHERE nbi = 'DEMO-006-UIG-2026')
INSERT INTO produtores (nome, nbi, pin_hash, telefone, provincia, municipio, fileira, area_ha, tipo_produtor)
VALUES (
    'João António Kafuxi',
    'DEMO-006-UIG-2026',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lkii',
    '+244 923 456 789',
    'Uíge', 'Quimbele', 'Café', 12.40, 'Individual / Familiar'
);

IF NOT EXISTS (SELECT 1 FROM produtores WHERE nbi = 'NBI-002-CAB-2024')
INSERT INTO produtores (nome, nbi, pin_hash, telefone, provincia, municipio, fileira, area_ha, tipo_produtor)
VALUES (
    'Maria da Conceição Lopes',
    'NBI-002-CAB-2024',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lkii',
    '+244 912 345 678',
    'Cabinda', 'Belize', 'Cacau', 8.10, 'Cooperativa Agrícola'
);
GO

-- Parcelas
DECLARE @p1 INT = (SELECT id FROM produtores WHERE nbi = 'DEMO-006-UIG-2026');
DECLARE @p2 INT = (SELECT id FROM produtores WHERE nbi = 'NBI-002-CAB-2024');

IF NOT EXISTS (SELECT 1 FROM parcelas WHERE produtor_id = @p1)
    INSERT INTO parcelas (produtor_id, fileira, area_ha, latitude, longitude)
    VALUES (@p1, 'Café', 12.40, -6.5234, 15.7823);

IF NOT EXISTS (SELECT 1 FROM parcelas WHERE produtor_id = @p2)
    INSERT INTO parcelas (produtor_id, fileira, area_ha, latitude, longitude)
    VALUES (@p2, 'Cacau', 8.10, -4.9871, 12.1934);
GO

-- Lotes
IF NOT EXISTS (SELECT 1 FROM lotes WHERE codigo = 'CAFÉ-2026-047')
    INSERT INTO lotes (codigo, produtor_id, fileira, produto, quantidade_kg, provincia, municipio, estado)
    SELECT 'CAFÉ-2026-047', id, 'Café', 'Café Verde Arábica', 12000, 'Uíge', 'Quimbele', 'exportado'
    FROM produtores WHERE nbi = 'DEMO-006-UIG-2026';

IF NOT EXISTS (SELECT 1 FROM lotes WHERE codigo = 'INC-LT-00891')
    INSERT INTO lotes (codigo, produtor_id, fileira, produto, quantidade_kg, provincia, municipio, estado)
    SELECT 'INC-LT-00891', id, 'Cacau', 'Cacau Amêndoa', 2300, 'Cabinda', 'Belize', 'em_processamento'
    FROM produtores WHERE nbi = 'NBI-002-CAB-2024';
GO

-- Eventos
DECLARE @l1 INT = (SELECT id FROM lotes WHERE codigo = 'CAFÉ-2026-047');
DECLARE @l2 INT = (SELECT id FROM lotes WHERE codigo = 'INC-LT-00891');

IF NOT EXISTS (SELECT 1 FROM lote_eventos WHERE lote_id = @l1)
BEGIN
    INSERT INTO lote_eventos (lote_id, titulo, descricao, tipo, data_evento) VALUES
    (@l1, N'🌱 Plantação',           N'Aldeia Quimbele, Uíge',                  'normal',   '2025-04-10'),
    (@l1, N'☀️ Colheita',            N'4 820 kg colhidos',                       'normal',   '2025-11-15'),
    (@l1, N'⚙️ Processamento',       N'Estação de Despolpa Quimbele',            'destaque', '2025-12-03'),
    (@l1, N'🏭 Beneficiamento',      N'Centro INCA Carmona',                     'destaque', '2026-01-12'),
    (@l1, N'📦 Embalagem e Ensaque', N'Lote 47 / 200 sacos × 60 kg',            'destaque', '2026-02-15'),
    (@l1, N'✅ Certificado Emitido', N'CERT-2026-4789 / INCA',                   'destaque', '2026-02-22'),
    (@l1, N'🚢 Exportação',          N'Porto de Luanda → Lisboa, Portugal',      'destaque', '2026-03-05');
END

IF NOT EXISTS (SELECT 1 FROM lote_eventos WHERE lote_id = @l2)
BEGIN
    INSERT INTO lote_eventos (lote_id, titulo, descricao, tipo, data_evento) VALUES
    (@l2, N'🌱 Plantação',                 N'Belize, Cabinda',                     'normal',   '2024-03-20'),
    (@l2, N'☀️ Colheita',                  N'2 300 kg colhidos',                   'normal',   '2025-10-08'),
    (@l2, N'⚙️ Fermentação e Secagem',     N'14 dias — humidade 7,2%',             'destaque', '2025-11-01'),
    (@l2, N'🏭 Triagem e Classificação',   N'Em curso — Centro INCA Cabinda',      'destaque', '2026-03-10');
END
GO

-- Certificados
IF NOT EXISTS (SELECT 1 FROM certificados WHERE referencia = 'CERT-2026-4789')
    INSERT INTO certificados (produtor_id, produto, quantidade_kg, numero_lote, pais_destino, data_exportacao, referencia, estado)
    SELECT id, 'Café Verde Arábica', 12000, 'CAFÉ-2026-047', 'Portugal', '2026-03-05', 'CERT-2026-4789', 'emitido'
    FROM produtores WHERE nbi = 'DEMO-006-UIG-2026';

IF NOT EXISTS (SELECT 1 FROM certificados WHERE referencia = 'CERT-2026-5021')
    INSERT INTO certificados (produtor_id, produto, quantidade_kg, numero_lote, pais_destino, data_exportacao, referencia, estado)
    SELECT id, 'Café Verde Robusta', 5000, 'CAFÉ-2026-031', 'Alemanha', '2026-04-10', 'CERT-2026-5021', 'pendente'
    FROM produtores WHERE nbi = 'DEMO-006-UIG-2026';
GO

-- Preços
IF NOT EXISTS (SELECT 1 FROM precos_mercado)
INSERT INTO precos_mercado (produto, preco_aoa_kg, preco_usd_kg, variacao_pct) VALUES
    ('Café Verde Arábica', 1850, 2.05,  4.2),
    ('Café Verde Robusta', 1420, 1.57,  2.8),
    ('Cacau Amêndoa',      3200, 3.54,  6.1),
    ('Caju (Amêndoa)',     2650, 2.93, -1.2),
    ('Óleo de Dendém',      890, 0.98,  0.5);
GO
