-- ════════════════════════════════════════════════════════════
--  INCA Portal — 4 Novos Projectos (Carrossel Página 2)
--  Executar: sqlcmd -S localhost\SQLEXPRESS -E -i projectos_novos.sql
-- ════════════════════════════════════════════════════════════

USE inca_portal;
GO

-- ── Projecto 5: Irrigação Huambo ────────────────────────────
IF NOT EXISTS (SELECT 1 FROM projectos WHERE nome = N'Irrigação Huambo')
INSERT INTO projectos (
    nome, nome_en, descricao, descricao_en, fileira,
    investimento_usd, hectares, produtores_capacitar, capacidade_anual_t,
    ano_inicio, ano_conclusao, status,
    coordenador, telefone_coordenador, email_coordenador,
    provincias, tecnologias, mercados_exportacao,
    logo_emoji, cor_tema
) VALUES (
    N'Irrigação Huambo',
    N'Huambo Irrigation',
    N'Construção de infraestruturas de irrigação no planalto central do Huambo para suporte à produção de café premium e culturas de alto valor. O projecto inclui barragens de captação, canais de distribuição e sistemas de irrigação por gotejamento em 15.000 hectares de terras altas angolanas.',
    N'Construction of irrigation infrastructure on the central plateau of Huambo to support premium coffee production and high-value crops. The project includes catchment dams, distribution channels and drip irrigation systems across 15,000 hectares of Angolan highlands.',
    N'Café',
    28000000, 15000, 1800, 5000,
    2025, 2028, N'em_planeamento',
    N'Eng. Pedro Lemos', N'+244 923 111 222', N'p.lemos@inca.gov.ao',
    N'Huambo,Bié',
    N'Barragens de captação,Canais de distribuição,Irrigação por gotejamento,Sensores de humidade do solo,Gestão digital de água',
    N'União Europeia,Estados Unidos,Japão',
    N'💧', N'#1A6B8A'
);

-- ── Projecto 6: Viveiros Nacionais ──────────────────────────
IF NOT EXISTS (SELECT 1 FROM projectos WHERE nome = N'Viveiros Nacionais')
INSERT INTO projectos (
    nome, nome_en, descricao, descricao_en, fileira,
    investimento_usd, hectares, produtores_capacitar, capacidade_anual_t,
    ano_inicio, ano_conclusao, status,
    coordenador, telefone_coordenador, email_coordenador,
    provincias, tecnologias, mercados_exportacao,
    logo_emoji, cor_tema
) VALUES (
    N'Viveiros Nacionais',
    N'National Nurseries',
    N'Programa nacional de produção e distribuição de 50 milhões de mudas certificadas por ano das quatro fileiras estratégicas — Café, Dendém, Cacau e Caju — para renovação e expansão do parque agrícola angolano. Rede de 12 viveiros regionais com laboratórios de fitossanidade.',
    N'National programme to produce and distribute 50 million certified seedlings per year of the four strategic crops — Coffee, Oil Palm, Cocoa and Cashew — to renew and expand Angola''s agricultural stock. Network of 12 regional nurseries with phytosanitary laboratories.',
    N'Café',
    9000000, 0, 5000, 0,
    2025, 2027, N'em_planeamento',
    N'Dra. Fernanda Lopes', N'+244 912 333 444', N'f.lopes@inca.gov.ao',
    N'Uíge,Kwanza Norte,Malanje,Benguela,Huambo,Cuanza Sul',
    N'Biotecnologia vegetal,Laboratórios de fitossanidade,Propagação vegetativa,Certificação de material vegetal,Rede de frio para conservação',
    N'Distribuição Nacional',
    N'🌿', N'#2C4A2E'
);

-- ── Projecto 7: Digitalização Agrícola ──────────────────────
IF NOT EXISTS (SELECT 1 FROM projectos WHERE nome = N'Digitalização Agrícola')
INSERT INTO projectos (
    nome, nome_en, descricao, descricao_en, fileira,
    investimento_usd, hectares, produtores_capacitar, capacidade_anual_t,
    ano_inicio, ano_conclusao, status,
    coordenador, telefone_coordenador, email_coordenador,
    provincias, tecnologias, mercados_exportacao,
    logo_emoji, cor_tema
) VALUES (
    N'Digitalização Agrícola',
    N'Agricultural Digitization',
    N'Implementação de plataforma digital integrada de rastreabilidade, certificação de origem e gestão de produtores para 120.000 agricultores das quatro fileiras estratégicas. A plataforma garante acesso privilegiado a mercados internacionais premium e transparência total na cadeia de valor.',
    N'Implementation of an integrated digital platform for traceability, origin certification and producer management for 120,000 farmers across the four strategic crops. The platform ensures privileged access to premium international markets and full value chain transparency.',
    N'Café',
    6000000, 0, 120000, 0,
    2024, 2026, N'em_execucao',
    N'Dr. Carlos Mendes', N'+244 934 555 666', N'c.mendes@inca.gov.ao',
    N'Nacional (18 Províncias)',
    N'Blockchain de rastreabilidade,App móvel para produtores,QR Code de certificação,Sistema de georreferenciação,Dashboard de exportação,Integração API alfândegas',
    N'União Europeia,Estados Unidos,China,Japão,Reino Unido',
    N'📱', N'#1A0A00'
);

-- ── Projecto 8: Formação Técnica ────────────────────────────
IF NOT EXISTS (SELECT 1 FROM projectos WHERE nome = N'Formação Técnica')
INSERT INTO projectos (
    nome, nome_en, descricao, descricao_en, fileira,
    investimento_usd, hectares, produtores_capacitar, capacidade_anual_t,
    ano_inicio, ano_conclusao, status,
    coordenador, telefone_coordenador, email_coordenador,
    provincias, tecnologias, mercados_exportacao,
    logo_emoji, cor_tema
) VALUES (
    N'Formação Técnica',
    N'Technical Training',
    N'Programa de capacitação de 10.000 técnicos agrícolas especializados nas quatro fileiras estratégicas, em parceria com institutos internacionais de referência. Inclui formação presencial, e-learning e intercâmbios internacionais com foco em boas práticas agrícolas e sustentabilidade.',
    N'Training programme for 10,000 agricultural technicians specialised in the four strategic crops, in partnership with leading international institutes. Includes in-person training, e-learning and international exchanges focusing on good agricultural practices and sustainability.',
    N'Café',
    5000000, 0, 10000, 0,
    2025, 2028, N'em_planeamento',
    N'Prof. Ana Gonçalves', N'+244 923 777 888', N'a.goncalves@inca.gov.ao',
    N'Nacional (18 Províncias)',
    N'E-learning agrícola,Simuladores de campo,Parcerias com universidades,Certificação internacional,Intercâmbios Brasil e Portugal',
    N'Distribuição Nacional',
    N'🎓', N'#6B3520'
);
GO

-- ── Fases: Digitalização Agrícola ───────────────────────────
DECLARE @dig INT = (SELECT id FROM projectos WHERE nome = N'Digitalização Agrícola');
IF @dig IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projeto_fases WHERE projeto_id = @dig)
BEGIN
    INSERT INTO projeto_fases (projeto_id, nome_fase, nome_fase_en, descricao, descricao_en, data_inicio, data_fim, progresso_pct, status) VALUES
    (@dig, N'Desenvolvimento da Plataforma', N'Platform Development', N'Arquitectura, desenvolvimento e testes da plataforma digital', N'Architecture, development and testing of the digital platform', '2024-01-01', '2024-09-30', 80, N'em_execucao'),
    (@dig, N'Piloto em 3 Províncias',        N'3-Province Pilot',       N'Lançamento piloto no Uíge, Cuanza Norte e Benguela',             N'Pilot launch in Uíge, Cuanza Norte and Benguela',             '2024-10-01', '2025-03-31', 30, N'em_execucao'),
    (@dig, N'Expansão Nacional',             N'National Rollout',        N'Expansão para todas as 18 províncias e 120.000 produtores',      N'Expansion to all 18 provinces and 120,000 producers',        '2025-04-01', '2026-06-30', 0,  N'nao_iniciado');
END
GO

-- ── Fases: Irrigação Huambo ─────────────────────────────────
DECLARE @irr INT = (SELECT id FROM projectos WHERE nome = N'Irrigação Huambo');
IF @irr IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projeto_fases WHERE projeto_id = @irr)
BEGIN
    INSERT INTO projeto_fases (projeto_id, nome_fase, nome_fase_en, descricao, descricao_en, data_inicio, data_fim, progresso_pct, status) VALUES
    (@irr, N'Estudo Hidrológico',     N'Hydrological Study', N'Levantamento hidrológico e desenho do sistema', N'Hydrological survey and system design', '2025-01-01', '2025-06-30', 20, N'em_execucao'),
    (@irr, N'Construção de Barragens',N'Dam Construction',   N'Construção de 4 barragens de captação',         N'Construction of 4 catchment dams',         '2025-07-01', '2027-06-30', 0,  N'nao_iniciado'),
    (@irr, N'Rede de Distribuição',   N'Distribution Grid',  N'Instalação de canais e sistemas de gotejamento','Installation of channels and drip systems',  '2027-01-01', '2028-06-30', 0,  N'nao_iniciado');
END
GO

PRINT '4 novos projectos inseridos com sucesso!';
