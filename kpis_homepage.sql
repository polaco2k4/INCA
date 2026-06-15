-- ============================================================
--  INCA — Tabela KPIs Homepage
-- ============================================================

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'kpis_homepage'
)
BEGIN
  CREATE TABLE kpis_homepage (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    chave        NVARCHAR(50)   NOT NULL UNIQUE,
    valor_num    DECIMAL(18,2)  NOT NULL DEFAULT 0,
    sufixo       NVARCHAR(10)   NULL,
    label_pt     NVARCHAR(150)  NOT NULL,
    label_en     NVARCHAR(150)  NOT NULL,
    ordem        INT            NOT NULL DEFAULT 0,
    actualizado_em DATETIME2   NOT NULL DEFAULT GETDATE()
  );
  PRINT 'Tabela kpis_homepage criada.';

  INSERT INTO kpis_homepage (chave, valor_num, sufixo, label_pt, label_en, ordem) VALUES
    (N'produtores',    120000, N'k',   N'Produtores Registados',    N'Registered Producers',          1),
    (N'provincias',        18, NULL,   N'Províncias de Actuação',   N'Provinces of Operation',        2),
    (N'usd_exportado', 46000000, N'M', N'USD Valor Exportado (2024)', N'USD Export Value (2024)',     3),
    (N'cooperativas',     340, NULL,   N'Cooperativas Apoiadas',    N'Cooperatives Supported',        4),
    (N'fileiras',           4, NULL,   N'Fileiras Agrícolas',       N'Agricultural Value Chains',     5);

  PRINT 'KPIs inseridos.';
END
ELSE
  PRINT 'Tabela kpis_homepage já existe.';
GO

PRINT 'Script kpis_homepage.sql concluído.';
