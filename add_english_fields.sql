-- ════════════════════════════════════════════════════════════
--  INCA Portal — Adicionar campos de inglês para conteúdo bilíngue
--  Executar no SSMS ou sqlcmd:
--    sqlcmd -S localhost\SQLEXPRESS -E -i add_english_fields.sql
-- ════════════════════════════════════════════════════════════

USE inca_portal;
GO

-- ── Adicionar campos de inglês à tabela de artigos ────────────────────────
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('artigos') AND name = 'titulo_en')
BEGIN
    ALTER TABLE artigos ADD titulo_en NVARCHAR(300);
    ALTER TABLE artigos ADD resumo_en NVARCHAR(500);
    ALTER TABLE artigos ADD conteudo_en NVARCHAR(MAX);
    
    PRINT 'Campos em inglês adicionados à tabela artigos';
END
ELSE
BEGIN
    PRINT 'Campos em inglês já existem na tabela artigos';
END
GO

-- ── Adicionar campos de inglês à tabela de anúncios ────────────────────────
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('anuncios') AND name = 'titulo_en')
BEGIN
    ALTER TABLE anuncios ADD titulo_en NVARCHAR(200);
    ALTER TABLE anuncios ADD mensagem_en NVARCHAR(MAX);
    ALTER TABLE anuncios ADD link_texto_en NVARCHAR(100);
    
    PRINT 'Campos em inglês adicionados à tabela anuncios';
END
ELSE
BEGIN
    PRINT 'Campos em inglês já existem na tabela anuncios';
END
GO

-- ── Adicionar campos de inglês à tabela de categorias ──────────────────────
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('categorias_conteudo') AND name = 'nome_en')
BEGIN
    ALTER TABLE categorias_conteudo ADD nome_en NVARCHAR(100);
    ALTER TABLE categorias_conteudo ADD descricao_en NVARCHAR(MAX);
    
    PRINT 'Campos em inglês adicionados à tabela categorias_conteudo';
END
ELSE
BEGIN
    PRINT 'Campos em inglês já existem na tabela categorias_conteudo';
END
GO

-- ── Adicionar campos de inglês à tabela de media ───────────────────────────
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('media') AND name = 'titulo_en')
BEGIN
    ALTER TABLE media ADD titulo_en NVARCHAR(200);
    ALTER TABLE media ADD descricao_en NVARCHAR(MAX);
    
    PRINT 'Campos em inglês adicionados à tabela media';
END
ELSE
BEGIN
    PRINT 'Campos em inglês já existem na tabela media';
END
GO

PRINT 'Campos bilíngues adicionados com sucesso!';
GO
