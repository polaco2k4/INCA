-- ════════════════════════════════════════════════════════════
--  INCA Portal — Schema de Gestão de Conteúdo
--  Adiciona tabelas para gestão de artigos, notícias e media
-- ════════════════════════════════════════════════════════════

USE inca_portal;
GO

-- ── Categorias de Conteúdo ────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'categorias_conteudo')
CREATE TABLE categorias_conteudo (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    nome            NVARCHAR(100)  NOT NULL UNIQUE,
    slug            NVARCHAR(100)  NOT NULL UNIQUE,
    descricao       NVARCHAR(MAX),
    activo          BIT            DEFAULT 1,
    criado_em       DATETIME2      DEFAULT GETDATE()
);
GO

-- ── Artigos/Notícias ──────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'artigos')
CREATE TABLE artigos (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    titulo          NVARCHAR(300)  NOT NULL,
    slug            NVARCHAR(300)  NOT NULL UNIQUE,
    resumo          NVARCHAR(500),
    conteudo        NVARCHAR(MAX)  NOT NULL,
    categoria_id    INT            REFERENCES categorias_conteudo(id) ON DELETE SET NULL,
    autor_id        INT            REFERENCES administradores(id) ON DELETE SET NULL,
    imagem_destaque NVARCHAR(500),
    tags            NVARCHAR(500),
    estado          NVARCHAR(20)   DEFAULT 'rascunho'
                    CHECK (estado IN ('rascunho','publicado','arquivado')),
    destaque        BIT            DEFAULT 0,
    visualizacoes   INT            DEFAULT 0,
    publicado_em    DATETIME2,
    criado_em       DATETIME2      DEFAULT GETDATE(),
    actualizado_em  DATETIME2      DEFAULT GETDATE()
);
GO

-- ── Anúncios/Avisos ───────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'anuncios')
CREATE TABLE anuncios (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    titulo          NVARCHAR(200)  NOT NULL,
    mensagem        NVARCHAR(MAX)  NOT NULL,
    tipo            NVARCHAR(20)   DEFAULT 'info'
                    CHECK (tipo IN ('info','aviso','urgente','sucesso')),
    link_url        NVARCHAR(500),
    link_texto      NVARCHAR(100),
    activo          BIT            DEFAULT 1,
    data_inicio     DATETIME2      DEFAULT GETDATE(),
    data_fim        DATETIME2,
    criado_por      INT            REFERENCES administradores(id) ON DELETE SET NULL,
    criado_em       DATETIME2      DEFAULT GETDATE()
);
GO

-- ── Galeria de Media ──────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'media')
CREATE TABLE media (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    titulo          NVARCHAR(200)  NOT NULL,
    descricao       NVARCHAR(MAX),
    tipo            NVARCHAR(20)   NOT NULL
                    CHECK (tipo IN ('imagem','video','documento','outro')),
    url             NVARCHAR(500)  NOT NULL,
    tamanho_kb      INT,
    mime_type       NVARCHAR(100),
    upload_por      INT            REFERENCES administradores(id) ON DELETE SET NULL,
    criado_em       DATETIME2      DEFAULT GETDATE()
);
GO

-- ── Páginas Estáticas ─────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'paginas')
CREATE TABLE paginas (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    titulo          NVARCHAR(200)  NOT NULL,
    slug            NVARCHAR(200)  NOT NULL UNIQUE,
    conteudo        NVARCHAR(MAX)  NOT NULL,
    meta_descricao  NVARCHAR(300),
    activo          BIT            DEFAULT 1,
    criado_em       DATETIME2      DEFAULT GETDATE(),
    actualizado_em  DATETIME2      DEFAULT GETDATE()
);
GO

-- ── FAQ (Perguntas Frequentes) ────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'faq')
CREATE TABLE faq (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    pergunta        NVARCHAR(300)  NOT NULL,
    resposta        NVARCHAR(MAX)  NOT NULL,
    categoria       NVARCHAR(100),
    ordem           INT            DEFAULT 0,
    activo          BIT            DEFAULT 1,
    criado_em       DATETIME2      DEFAULT GETDATE()
);
GO

-- ── Índices para Performance ──────────────────────────────────
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_artigos_estado')
    CREATE INDEX idx_artigos_estado ON artigos(estado);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_artigos_publicado')
    CREATE INDEX idx_artigos_publicado ON artigos(publicado_em DESC);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_artigos_destaque')
    CREATE INDEX idx_artigos_destaque ON artigos(destaque, publicado_em DESC);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_anuncios_activo')
    CREATE INDEX idx_anuncios_activo ON anuncios(activo, data_inicio, data_fim);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_media_tipo')
    CREATE INDEX idx_media_tipo ON media(tipo);
GO

-- ════════════════════════════════════════════════════════════
--  DADOS INICIAIS
-- ════════════════════════════════════════════════════════════

-- Categorias padrão
IF NOT EXISTS (SELECT 1 FROM categorias_conteudo WHERE slug = 'noticias')
INSERT INTO categorias_conteudo (nome, slug, descricao) VALUES
    ('Notícias', 'noticias', 'Notícias e atualizações do INCA'),
    ('Eventos', 'eventos', 'Eventos, workshops e formações'),
    ('Mercado', 'mercado', 'Informações sobre mercado e preços'),
    ('Técnicas', 'tecnicas', 'Guias técnicos e boas práticas'),
    ('Institucional', 'institucional', 'Informações institucionais');
GO

-- Artigo de exemplo
DECLARE @admin_id INT = (SELECT TOP 1 id FROM administradores WHERE nivel = 'super_admin');

IF NOT EXISTS (SELECT 1 FROM artigos WHERE slug = 'bem-vindo-ao-portal-inca')
INSERT INTO artigos (titulo, slug, resumo, conteudo, categoria_id, autor_id, estado, destaque, publicado_em)
SELECT 
    'Bem-vindo ao Portal INCA',
    'bem-vindo-ao-portal-inca',
    'O Instituto Nacional do Café de Angola apresenta o novo portal digital para produtores.',
    '<h2>Portal Digital do INCA</h2><p>O Instituto Nacional do Café de Angola (INCA) tem o prazer de apresentar o seu novo portal digital, desenvolvido para servir melhor os produtores de café, cacau e outras fileiras agrícolas de Angola.</p><h3>Funcionalidades Principais</h3><ul><li>Cadastro e gestão de produtores</li><li>Certificação de origem</li><li>Rastreabilidade de lotes</li><li>Pedidos de apoio técnico e financeiro</li><li>Informações de mercado em tempo real</li></ul><p>Junte-se a nós nesta jornada de transformação digital do sector agrícola angolano.</p>',
    (SELECT id FROM categorias_conteudo WHERE slug = 'institucional'),
    @admin_id,
    'publicado',
    1,
    GETDATE();
GO

-- Anúncio de exemplo
IF NOT EXISTS (SELECT 1 FROM anuncios WHERE titulo LIKE '%Portal em Funcionamento%')
INSERT INTO anuncios (titulo, mensagem, tipo, activo, criado_por)
SELECT 
    'Portal em Funcionamento',
    'O Portal INCA está agora disponível para todos os produtores registados. Faça login com o seu NBI e PIN.',
    'sucesso',
    1,
    (SELECT TOP 1 id FROM administradores WHERE nivel = 'super_admin');
GO

-- FAQ de exemplo
IF NOT EXISTS (SELECT 1 FROM faq)
INSERT INTO faq (pergunta, resposta, categoria, ordem, activo) VALUES
    ('Como me registo no portal?', 'Para se registar, clique em "Registar" na página inicial e preencha o formulário com os seus dados. Após o registo, a sua conta será validada pelo INCA em 24-48 horas.', 'Registo', 1, 1),
    ('O que é o NBI?', 'O NBI (Número de Beneficiário INCA) é o seu identificador único no sistema do INCA. É atribuído após a validação do seu registo.', 'Registo', 2, 1),
    ('Como solicito um certificado de origem?', 'Após fazer login, aceda à secção "Certificados" e preencha o formulário com as informações do lote a exportar. O INCA processará o seu pedido em 3-5 dias úteis.', 'Certificados', 3, 1),
    ('Quanto tempo demora a aprovação de um pedido de apoio?', 'Os pedidos de apoio são analisados pela equipa técnica do INCA. O tempo de resposta varia entre 7 a 15 dias úteis, dependendo da complexidade do pedido.', 'Apoios', 4, 1);
GO

PRINT '════════════════════════════════════════════════════════════';
PRINT '  ✅ Schema de gestão de conteúdo criado com sucesso!';
PRINT '';
PRINT '  Tabelas criadas:';
PRINT '  ─────────────────────────────────────────────────────────';
PRINT '  • categorias_conteudo';
PRINT '  • artigos';
PRINT '  • anuncios';
PRINT '  • media';
PRINT '  • paginas';
PRINT '  • faq';
PRINT '';
PRINT '  Dados iniciais inseridos:';
PRINT '  • 5 categorias de conteúdo';
PRINT '  • 1 artigo de boas-vindas';
PRINT '  • 1 anúncio de exemplo';
PRINT '  • 4 perguntas frequentes';
PRINT '════════════════════════════════════════════════════════════';
GO
