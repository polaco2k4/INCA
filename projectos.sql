-- ════════════════════════════════════════════════════════════
--  INCA Portal — Tabela de Projectos
--  Executar no SSMS ou sqlcmd:
--    sqlcmd -S localhost\SQLEXPRESS -E -i projectos.sql
-- ════════════════════════════════════════════════════════════

USE inca_portal;
GO

-- ── Projectos ───────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'projectos')
CREATE TABLE projectos (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    nome                NVARCHAR(200)     NOT NULL,
    nome_en             NVARCHAR(200)     NOT NULL,
    descricao           NVARCHAR(MAX)      NOT NULL,
    descricao_en        NVARCHAR(MAX)      NOT NULL,
    fileira             NVARCHAR(50)      NOT NULL,
    investimento_usd    DECIMAL(14,2)     NOT NULL,
    hectares            DECIMAL(10,2)     NOT NULL,
    produtores_capacitar INT              NOT NULL DEFAULT 0,
    capacidade_anual_t  DECIMAL(10,2)     NOT NULL DEFAULT 0,
    ano_inicio          INT               NOT NULL,
    ano_conclusao       INT               NOT NULL,
    status              NVARCHAR(30)      NOT NULL DEFAULT 'em_planeamento'
                        CHECK (status IN ('em_planeamento','em_execucao','concluido','suspenso')),
    coordenador         NVARCHAR(150),
    telefone_coordenador NVARCHAR(30),
    email_coordenador   NVARCHAR(120),
    provincias          NVARCHAR(200),    -- Lista de províncias separadas por vírgula
    tecnologias         NVARCHAR(MAX),    -- Tecnologias implementadas (JSON ou texto)
    mercados_exportacao NVARCHAR(200),    -- Mercados de exportação
    logo_emoji          NVARCHAR(10)      DEFAULT '📋',  -- Emoji para visualização
    cor_tema            NVARCHAR(20)      DEFAULT '#C49A3C',  -- Cor do tema
    criado_em           DATETIME2         DEFAULT GETDATE(),
    actualizado_em      DATETIME2         DEFAULT GETDATE()
);
GO

-- ── Fases do Projecto ───────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'projecto_fases')
CREATE TABLE projeto_fases (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    projeto_id      INT               NOT NULL REFERENCES projectos(id) ON DELETE CASCADE,
    nome_fase       NVARCHAR(100)     NOT NULL,
    nome_fase_en    NVARCHAR(100)     NOT NULL,
    descricao       NVARCHAR(300),
    descricao_en    NVARCHAR(300),
    data_inicio     DATE,
    data_fim        DATE,
    progresso_pct  DECIMAL(5,2)      DEFAULT 0,
    status          NVARCHAR(20)      DEFAULT 'nao_iniciado'
                    CHECK (status IN ('nao_iniciado','em_execucao','concluido','atrasado')),
    criado_em       DATETIME2         DEFAULT GETDATE()
);
GO

-- ── Investimentos do Projecto ───────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'projecto_investimentos')
CREATE TABLE projeto_investimentos (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    projeto_id          INT               NOT NULL REFERENCES projectos(id) ON DELETE CASCADE,
    categoria           NVARCHAR(100)     NOT NULL,  -- 'Infraestrutura', 'Equipamento', 'Capacitação', etc.
    categoria_en        NVARCHAR(100)     NOT NULL,
    valor_usd           DECIMAL(14,2)     NOT NULL,
    moeda              NVARCHAR(10)      DEFAULT 'USD',
    fornecedor          NVARCHAR(200),
    descricao          NVARCHAR(300),
    data_investimento  DATE,
    criado_em           DATETIME2         DEFAULT GETDATE()
);
GO

-- ── Actualizações do Projecto ─────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'projecto_actualizacoes')
CREATE TABLE projeto_actualizacoes (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    projeto_id      INT               NOT NULL REFERENCES projectos(id) ON DELETE CASCADE,
    titulo          NVARCHAR(200)     NOT NULL,
    titulo_en       NVARCHAR(200)     NOT NULL,
    descricao       NVARCHAR(MAX)      NOT NULL,
    descricao_en    NVARCHAR(MAX)      NOT NULL,
    tipo_actualizacao NVARCHAR(50)   NOT NULL DEFAULT 'geral'
                    CHECK (tipo_actualizacao IN ('geral','progresso','investimento','mudanca','conclusao')),
    data_publicacao DATETIME2         NOT NULL DEFAULT GETDATE(),
    autor           NVARCHAR(150),
    criado_em       DATETIME2         DEFAULT GETDATE()
);
GO

-- ════════════════════════════════════════════════════════════
--  DADOS DE DEMO - PROJECTOS INCA
-- ════════════════════════════════════════════════════════════

-- Projecto 1: Reabilitação Cafeeira
IF NOT EXISTS (SELECT 1 FROM projectos WHERE nome = 'Reabilitação Cafeeira')
INSERT INTO projectos (
    nome, nome_en, descricao, descricao_en, fileira, investimento_usd, hectares, 
    produtores_capacitar, capacidade_anual_t, ano_inicio, ano_conclusao, status,
    coordenador, telefone_coordenador, email_coordenador, provincias, tecnologias,
    mercados_exportacao, logo_emoji, cor_tema
) VALUES (
    N'Reabilitação Cafeeira',
    N'Coffee Rehabilitation',
    N'Programa estratégico para recuperação da produção cafeeira em Angola, visando restaurar a posição histórica do país como um dos principais produtores mundiais. Foco em tecnologias modernas e sustentabilidade.',
    N'Strategic program to recover coffee production in Angola, aiming to restore the country''s historical position as one of the world''s main producers. Focus on modern technologies and sustainability.',
    N'Café', 45000000, 50000, 3000, 12000, 2023, 2026, 'em_execucao',
    N'Dr. António Silva', N'+244 923 456 789', N'a.silva@inca.gov.ao',
    N'Uíge,Kwanza Norte,Malanje',
    N'Variedades resistentes a doenças,Sistemas de irrigação por gotejamento,Processamento pós-colheita moderno,Certificação orgânica',
    N'União Europeia,Estados Unidos,China,Japão',
    N'🌱', N'#C49A3C'
);

-- Projecto 2: Expansão Dendém
IF NOT EXISTS (SELECT 1 FROM projectos WHERE nome = 'Expansão Dendém')
INSERT INTO projectos (
    nome, nome_en, descricao, descricao_en, fileira, investimento_usd, hectares, 
    produtores_capacitar, capacidade_anual_t, ano_inicio, ano_conclusao, status,
    coordenador, telefone_coordenador, email_coordenador, provincias, tecnologias,
    mercados_exportacao, logo_emoji, cor_tema
) VALUES (
    N'Expansão Dendém',
    N'Palm Oil Expansion',
    N'Desenvolvimento de uma das maiores plantações de dendezeiros em Angola, com capacidade para produzir 15.000 toneladas anuais de óleo de palma, reduzindo a dependência de importações.',
    N'Development of one of the largest oil palm plantations in Angola, with capacity to produce 15,000 annual tons of palm oil, reducing import dependency.',
    N'Dendém', 32000000, 20000, 2000, 15000, 2022, 2025, 'em_execucao',
    N'Eng. Maria Ferreira', N'+244 912 345 678', N'm.ferreira@inca.gov.ao',
    N'Cabo Ledo',
    N'Plantação de dendezeiros de elite,Fábrica de processamento industrial,Centro de capacitação de produtores,Infraestrutura de logística',
    N'Angola,Namíbia,República Democrática do Congo',
    N'🌴', N'#6B3520'
);

-- Projecto 3: Modernização Cacau
IF NOT EXISTS (SELECT 1 FROM projectos WHERE nome = 'Modernização Cacau')
INSERT INTO projectos (
    nome, nome_en, descricao, descricao_en, fileira, investimento_usd, hectares, 
    produtores_capacitar, capacidade_anual_t, ano_inicio, ano_conclusao, status,
    coordenador, telefone_coordenador, email_coordenador, provincias, tecnologias,
    mercados_exportacao, logo_emoji, cor_tema
) VALUES (
    N'Modernização Cacau',
    N'Cocoa Modernization',
    N'Modernização da produção de cacau com sistemas agroflorestais sustentáveis e certificação orgânica para acesso a mercados europeus de alto valor.',
    N'Modernization of cocoa production with sustainable agroforestry systems and organic certification for access to high-value European markets.',
    N'Cacau', 18000000, 8000, 500, 3500, 2024, 2027, 'em_execucao',
    N'Dr. João Santos', N'+244 923 789 012', N'j.santos@inca.gov.ao',
    N'Cuanza Sul',
    N'Sistemas agroflorestais,Certificação orgânica UE,Comércio justo,Rastreabilidade completa',
    N'União Europeia,Suíça,Alemanha,Países Baixos',
    N'🍫', N'#2C4A2E'
);

-- Projecto 4: Desenvolvimento Caju
IF NOT EXISTS (SELECT 1 FROM projectos WHERE nome = 'Desenvolvimento Caju')
INSERT INTO projectos (
    nome, nome_en, descricao, descricao_en, fileira, investimento_usd, hectares, 
    produtores_capacitar, capacidade_anual_t, ano_inicio, ano_conclusao, status,
    coordenador, telefone_coordenador, email_coordenador, provincias, tecnologias,
    mercados_exportacao, logo_emoji, cor_tema
) VALUES (
    N'Desenvolvimento Caju',
    N'Cashew Development',
    N'Expansão da produção de caju em Benguela e Namibe com unidade de processamento industrial e foco na exportação para mercados asiáticos em crescimento.',
    N'Expansion of cashew production in Benguela and Namibe with industrial processing unit and focus on export to growing Asian markets.',
    N'Caju', 12000000, 12000, 800, 8000, 2023, 2026, 'em_execucao',
    N'Eng. Isabel Costa', N'+244 934 567 890', N'i.costa@inca.gov.ao',
    N'Benguela,Namibe',
    N'Processamento de castanha,Extração de óleo CNSL,Armazenamento refrigerado,Logística de exportação',
    N'China,Índia,Vietnam,União Europeia',
    N'🥜', N'#5A7A5C'
);
GO

-- Fases dos Projectos (amostra)
DECLARE @proj1 INT = (SELECT id FROM projectos WHERE nome = 'Reabilitação Cafeeira');
DECLARE @proj2 INT = (SELECT id FROM projectos WHERE nome = 'Expansão Dendém');

-- Fases Projecto Café
IF @proj1 IS NOT NULL
BEGIN
    INSERT INTO projeto_fases (projeto_id, nome_fase, nome_fase_en, descricao, descricao_en, data_inicio, data_fim, progresso_pct, status) VALUES
    (@proj1, N'Estudo de Viabilidade', N'Feasibility Study', N'Análise detalhada das áreas potenciais e estudo de mercado', N'Detailed analysis of potential areas and market study', '2023-01-01', '2023-06-30', 100, 'concluido'),
    (@proj1, N'Preparação do Terreno', N'Land Preparation', N'Limpeza e preparação de 20.000 hectares', N'Clearing and preparation of 20,000 hectares', '2023-07-01', '2024-12-31', 75, 'em_execucao'),
    (@proj1, N'Plantio', N'Planting', N'Plantio de variedades resistentes', N'Planting of resistant varieties', '2024-01-01', '2025-06-30', 25, 'nao_iniciado'),
    (@proj1, N'Instalação de Irrigação', N'Irrigation Installation', N'Sistema de irrigação por gotejamento', N'Drip irrigation system', '2024-06-01', '2025-12-31', 10, 'nao_iniciado'),
    (@proj1, N'Beneficiamento', N'Processing', N'Construção de estações de processamento', N'Construction of processing stations', '2025-01-01', '2026-06-30', 5, 'nao_iniciado');
END

-- Fases Projecto Dendém
IF @proj2 IS NOT NULL
BEGIN
    INSERT INTO projeto_fases (projeto_id, nome_fase, nome_fase_en, descricao, descricao_en, data_inicio, data_fim, progresso_pct, status) VALUES
    (@proj2, N'Desenvolvimento de Sementeiras', N'Nursery Development', N'Produção de mudas de elite', N'Elite seedling production', '2022-01-01', '2023-12-31', 100, 'concluido'),
    (@proj2, N'Preparação do Terreno', N'Land Preparation', N'Limpeza e preparação de 20.000 hectares', N'Clearing and preparation of 20,000 hectares', '2023-01-01', '2024-06-30', 90, 'em_execucao'),
    (@proj2, N'Plantio', N'Planting', N'Plantio de dendezeiros', N'Oil palm planting', '2024-01-01', '2025-12-31', 60, 'em_execucao'),
    (@proj2, N'Construção da Fábrica', N'Factory Construction', N'Unidade de processamento industrial', N'Industrial processing unit', '2024-06-01', '2025-12-31', 40, 'em_execucao'),
    (@proj2, N'Capacitação', N'Training', N'Treinamento de 2.000 produtores', N'Training of 2,000 producers', '2024-01-01', '2025-12-31', 30, 'em_execucao');
END
GO

-- Investimentos (amostra)
IF @proj1 IS NOT NULL
BEGIN
    INSERT INTO projeto_investimentos (projeto_id, categoria, categoria_en, valor_usd, fornecedor, descricao, data_investimento) VALUES
    (@proj1, N'Infraestrutura', N'Infrastructure', 15000000, N'INCA Equipamentos', N'Estações de processamento e armazenamento', '2023-03-15'),
    (@proj1, N'Equipamento', N'Equipment', 12000000, N'TechAgri Solutions', N'Equipamento de irrigação por gotejamento', '2023-06-20'),
    (@proj1, N'Capacitação', N'Training', 8000000, N'INCA Formação', N'Treinamento técnico para produtores', '2023-09-10'),
    (@proj1, N'Insumos', N'Inputs', 10000000, N'Global Seeds Ltd', N'Mudas e insumos agrícolas', '2024-01-15');
END
GO

-- Actualizações (amostra)
IF @proj1 IS NOT NULL
BEGIN
    INSERT INTO projeto_actualizacoes (projeto_id, titulo, titulo_en, descricao, descricao_en, tipo_actualizacao, autor) VALUES
    (@proj1, N'Primeira Colheita Experimental', N'First Experimental Harvest', N'Primeira colheita nas áreas piloto do Uíge com resultados promissores', N'First harvest in pilot areas of Uíge with promising results', 'progresso', N'Dr. António Silva'),
    (@proj1, N'Novo Investimento Europeu', N'New European Investment', N'Parceria com União Europeia para expansão do projecto', N'Partnership with European Union for project expansion', 'investimento', N'INCA Comunicação');
END
GO

PRINT 'Tabela de projectos criada com sucesso!';
