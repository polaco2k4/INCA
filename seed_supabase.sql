-- ============================================================
--  INCA Portal — Seed de Dados para Supabase (PostgreSQL)
--  Colar e executar no SQL Editor do Supabase Dashboard
--  (safe to run multiple times — usa WHERE NOT EXISTS)
-- ============================================================

-- ════════════════════════════════════════════════════════════
--  STORAGE BUCKETS
-- ════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'projectos',
  'projectos',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Política: leitura pública
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'projectos_public_read'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY projectos_public_read ON storage.objects
        FOR SELECT USING (bucket_id = 'projectos')
    $policy$;
  END IF;
END $$;

-- Política: upload/delete apenas por utilizadores autenticados com service_role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'projectos_auth_write'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY projectos_auth_write ON storage.objects
        FOR ALL USING (
          bucket_id = 'projectos'
          AND auth.role() = 'authenticated'
        )
    $policy$;
  END IF;
END $$;


-- ════════════════════════════════════════════════════════════
--  FILEIRAS
-- ════════════════════════════════════════════════════════════

INSERT INTO fileiras (
  nome_pt, nome_en, nome_latin, icone,
  descricao_pt, descricao_en,
  descricao_detalhada_pt, descricao_detalhada_en,
  stat1_valor, stat1_label_pt, stat1_label_en,
  stat2_valor, stat2_label_pt, stat2_label_en,
  provincias, mercados, cor_tema, ordem, activo
)
SELECT
  'Café', 'Coffee', 'Coffea robusta / arabica', '☕',
  'Angola foi o 4.º maior exportador mundial de café na década de 70. O INCA lidera a reabilitação desta fileira histórica, com foco no Uíge, Kwanza Norte e Malanje.',
  'Angola was the world''s 4th largest coffee exporter in the 1970s. INCA leads the rehabilitation of this historic chain, focused on Uíge, Kwanza Norte and Malanje.',
  'O café angolano tem uma história rica que remonta ao século XIX, quando as primeiras plantações foram estabelecidas nas terras altas do norte do país. Durante a década de 1970, Angola chegou a ser o quarto maior exportador mundial de café, produzindo principalmente as variedades Robusta e Arabica de elevada qualidade. As províncias do Uíge, Kwanza Norte e Malanje constituíam o coração desta indústria florescente, sustentando o modo de vida de centenas de milhares de famílias rurais.

O conflito armado que se prolongou por décadas destruiu grande parte das infraestruturas agrícolas e dispersou as comunidades cafeicultoras. Com o regresso da paz, o INCA assumiu o papel central na reabilitação desta fileira estratégica, implementando programas de replantação, distribuição de variedades melhoradas, capacitação técnica e construção de centros de processamento primário.

Actualmente, o INCA trabalha em estreita parceria com produtores individuais, associações e empresas agroindustriais para consolidar uma cadeia de valor sustentável, desde a produção no campo até à exportação com certificação de origem.',
  'Angolan coffee has a rich history dating back to the 19th century, when the first plantations were established in the northern highlands. During the 1970s, Angola was the world''s fourth-largest coffee exporter, producing mainly high-quality Robusta and Arabica varieties.

Decades of armed conflict destroyed much of the agricultural infrastructure and displaced coffee-growing communities. With the return of peace, INCA took on a central role in rehabilitating this strategic chain.

Today, INCA works closely with individual producers, associations, and agro-industrial companies to consolidate a sustainable value chain, from field production to export with origin certification.',
  '12k t', 'Produção Anual', 'Annual Output',
  '3',     'Regiões Principais', 'Key Regions',
  'Uíge,Kwanza Norte,Malanje', NULL, '#C49A3C', 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM fileiras WHERE nome_pt = 'Café');

INSERT INTO fileiras (
  nome_pt, nome_en, nome_latin, icone,
  descricao_pt, descricao_en,
  descricao_detalhada_pt, descricao_detalhada_en,
  stat1_valor, stat1_label_pt, stat1_label_en,
  stat2_valor, stat2_label_pt, stat2_label_en,
  provincias, mercados, cor_tema, ordem, activo
)
SELECT
  'Dendém', 'Oil Palm', 'Elaeis guineensis', '🌴',
  'A palmeira de dendém tem enorme potencial agroindustrial em Angola, com extensas áreas aptas no norte e centro do país para produção de óleo de palma.',
  'Oil palm has enormous agro-industrial potential in Angola, with extensive suitable areas in the north and centre for palm oil production.',
  'A palmeira de dendém (Elaeis guineensis) é uma das culturas de maior rendimento económico por hectare no mundo, produzindo óleo de palma utilizado na indústria alimentar, cosmética e de biocombustíveis. Angola dispõe de mais de 85 000 hectares de áreas identificadas como aptas para a sua cultura, concentradas principalmente nas províncias do Malanje, Kwanza Norte, Uíge, Cuanza Sul e Moxico.

O INCA tem conduzido estudos de aptidão agrícola e implantado parcelas demonstrativas que comprovam a viabilidade técnica da cultura nestas regiões. O desenvolvimento da fileira do dendém representa uma oportunidade de substituição de importações de óleos vegetais e criação de emprego rural qualificado.

O modelo de desenvolvimento baseia-se na integração de pequenos e médios produtores em esquemas de agricultura de contrato com unidades industriais de extracção.',
  'Oil palm (Elaeis guineensis) is one of the highest-yielding economic crops per hectare in the world, producing palm oil used in the food, cosmetics, and biofuels industries. Angola has more than 85,000 hectares of areas identified as suitable for its cultivation.

INCA has conducted agricultural suitability studies and established demonstration plots that confirm the technical viability of the crop in these regions.

The development model is based on integrating small and medium-sized producers into contract farming schemes with industrial extraction units.',
  '85k ha', 'Área Potencial',    'Potential Area',
  '5',      'Províncias Alvo',   'Target Provinces',
  'Malanje,Kwanza Norte,Uíge,Cuanza Sul,Moxico', NULL, '#6B3520', 2, TRUE
WHERE NOT EXISTS (SELECT 1 FROM fileiras WHERE nome_pt = 'Dendém');

INSERT INTO fileiras (
  nome_pt, nome_en, nome_latin, icone,
  descricao_pt, descricao_en,
  descricao_detalhada_pt, descricao_detalhada_en,
  stat1_valor, stat1_label_pt, stat1_label_en,
  stat2_valor, stat2_label_pt, stat2_label_en,
  provincias, mercados, cor_tema, ordem, activo
)
SELECT
  'Cacau', 'Cocoa', 'Theobroma cacao', '🍫',
  'O cacau angolano apresenta características organolépticas distintas, com grande interesse no mercado de chocolate fino. Cabinda e Zaire são zonas de produção histórica.',
  'Angolan cocoa has distinct organoleptic characteristics with strong interest in the fine chocolate market. Cabinda and Zaire are historic production areas.',
  'O cacau angolano (Theobroma cacao) possui características organolépticas únicas resultantes da combinação de solos ricos em matéria orgânica, elevada pluviosidade e temperatura adequada das províncias do norte. As zonas de Cabinda, Zaire e Uíge produziram cacau reconhecido internacionalmente pela sua complexidade aromática.

Angola conta com a classificação da ICCO de "fine or flavour cocoa" para parte da sua produção. O INCA tem investido na reactivação de fazendas históricas, distribuição de clones de alta produtividade e capacitação em práticas de fermentação e secagem.

A estratégia contempla o desenvolvimento de capacidade de transformação local, com unidades de pré-processamento e produção de pasta e manteiga de cacau para exportação de valor acrescentado.',
  'Angolan cocoa (Theobroma cacao) possesses unique organoleptic characteristics. The historic areas of Cabinda, Zaire, and Uíge produced cocoa internationally recognised for its aromatic complexity.

Angola holds ICCO classification of "fine or flavour cocoa" for part of its production. INCA has invested in reactivating historic farms and training producers in fermentation and drying practices.

The strategy includes developing local transformation capacity and establishing partnerships with European and North American chocolatiers.',
  '4k t', 'Produção Anual', 'Annual Output',
  'Fine', 'Certificação ICCO', 'ICCO Certified',
  'Cabinda,Zaire,Uíge', NULL, '#2C4A2E', 3, TRUE
WHERE NOT EXISTS (SELECT 1 FROM fileiras WHERE nome_pt = 'Cacau');

INSERT INTO fileiras (
  nome_pt, nome_en, nome_latin, icone,
  descricao_pt, descricao_en,
  descricao_detalhada_pt, descricao_detalhada_en,
  stat1_valor, stat1_label_pt, stat1_label_en,
  stat2_valor, stat2_label_pt, stat2_label_en,
  provincias, mercados, cor_tema, ordem, activo
)
SELECT
  'Caju', 'Cashew', 'Anacardium occidentale', '🌿',
  'O caju é uma das culturas com maior resiliência climática e crescimento exportador em Angola, com mercados estabelecidos na Europa e Ásia.',
  'Cashew is one of the most climate-resilient crops with growing export momentum from Angola, with established markets in Europe and Asia.',
  'O cajueiro (Anacardium occidentale) é uma árvore de elevada resiliência climática, capaz de prosperar em solos de baixa fertilidade e sob regimes de precipitação irregulares. As províncias de Benguela, Namibe, Huíla e Cunene concentram as maiores extensões de cajueiros.

Angola exporta actualmente castanha de caju bruta para mais de 12 países. O INCA tem trabalhado para melhorar as taxas de recolha, introduzir variedades de maior produtividade e instalar unidades de descasque e processamento.

Além do grão, o pedúnculo do caju (maçã de caju) representa uma oportunidade adicional para a produção de sumos e produtos fermentados.',
  'The cashew tree (Anacardium occidentale) is highly climate-resilient, thriving in low-fertility soils under irregular rainfall. The provinces of Benguela, Namibe, Huíla, and Cunene concentrate the largest cashew extensions.

Angola currently exports raw cashew nuts to more than 12 countries. INCA has been working to improve collection rates and install processing units that add value before export.

The cashew peduncle (cashew apple) represents an additional opportunity for juice and fermented product production.',
  '30k t', 'Produção Anual', 'Annual Output',
  '12+',  'Países Destino',   'Export Markets',
  'Benguela,Namibe,Huíla,Cunene', 'Europa,Ásia,China,Índia', '#5A7A5C', 4, TRUE
WHERE NOT EXISTS (SELECT 1 FROM fileiras WHERE nome_pt = 'Caju');


-- ════════════════════════════════════════════════════════════
--  KPIs HOMEPAGE
-- ════════════════════════════════════════════════════════════

INSERT INTO kpis_homepage (chave, valor_num, sufixo, label_pt, label_en, ordem)
VALUES
  ('produtores',    120000, 'k',   'Produtores Registados',      'Registered Producers',       1),
  ('provincias',        18,  NULL, 'Províncias de Actuação',     'Provinces of Operation',     2),
  ('usd_exportado', 46,     'M',   'USD Valor Exportado (2024)', 'USD Export Value (2024)',     3),
  ('cooperativas',   340,   NULL,  'Cooperativas Apoiadas',      'Cooperatives Supported',     4),
  ('fileiras',         4,   NULL,  'Fileiras Agrícolas',         'Agricultural Value Chains',  5)
ON CONFLICT (chave) DO NOTHING;


-- ════════════════════════════════════════════════════════════
--  CATEGORIAS DE CONTEÚDO
-- ════════════════════════════════════════════════════════════

INSERT INTO categorias_conteudo (nome, slug, descricao)
VALUES
  ('Notícias',      'noticias',      'Notícias e atualizações do INCA'),
  ('Eventos',       'eventos',       'Eventos, workshops e formações'),
  ('Mercado',       'mercado',       'Informações sobre mercado e preços'),
  ('Técnicas',      'tecnicas',      'Guias técnicos e boas práticas'),
  ('Institucional', 'institucional', 'Informações institucionais')
ON CONFLICT (slug) DO NOTHING;


-- ════════════════════════════════════════════════════════════
--  FAQ
-- ════════════════════════════════════════════════════════════

INSERT INTO faq (pergunta, resposta, categoria, ordem, activo)
SELECT 'Como me registo no portal?',
       'Para se registar, clique em "Registar" na página inicial e preencha o formulário com os seus dados. Após o registo, a sua conta será validada pelo INCA em 24–48 horas.',
       'Registo', 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM faq WHERE pergunta = 'Como me registo no portal?');

INSERT INTO faq (pergunta, resposta, categoria, ordem, activo)
SELECT 'O que é o NBI?',
       'O NBI (Número de Beneficiário INCA) é o seu identificador único no sistema do INCA. É atribuído após a validação do seu registo.',
       'Registo', 2, TRUE
WHERE NOT EXISTS (SELECT 1 FROM faq WHERE pergunta = 'O que é o NBI?');

INSERT INTO faq (pergunta, resposta, categoria, ordem, activo)
SELECT 'Como solicito um certificado de origem?',
       'Após fazer login, aceda à secção "Certificados" e preencha o formulário com as informações do lote a exportar. O INCA processará o seu pedido em 3–5 dias úteis.',
       'Certificados', 3, TRUE
WHERE NOT EXISTS (SELECT 1 FROM faq WHERE pergunta = 'Como solicito um certificado de origem?');

INSERT INTO faq (pergunta, resposta, categoria, ordem, activo)
SELECT 'Quanto tempo demora a aprovação de um pedido de apoio?',
       'Os pedidos de apoio são analisados pela equipa técnica do INCA. O tempo de resposta varia entre 7 a 15 dias úteis, dependendo da complexidade do pedido.',
       'Apoios', 4, TRUE
WHERE NOT EXISTS (SELECT 1 FROM faq WHERE pergunta = 'Quanto tempo demora a aprovação de um pedido de apoio?');


-- ════════════════════════════════════════════════════════════
--  PROJECTOS
-- ════════════════════════════════════════════════════════════

INSERT INTO projectos (nome, nome_en, descricao, descricao_en, fileira, investimento_usd, hectares, produtores_capacitar, capacidade_anual_t, ano_inicio, ano_conclusao, status, coordenador, telefone_coordenador, email_coordenador, provincias, tecnologias, mercados_exportacao, logo_emoji, cor_tema)
SELECT 'Reabilitação Cafeeira', 'Coffee Rehabilitation',
  'Programa estratégico para recuperação da produção cafeeira em Angola, visando restaurar a posição histórica do país como um dos principais produtores mundiais. Foco em tecnologias modernas e sustentabilidade.',
  'Strategic program to recover coffee production in Angola, aiming to restore the country''s historical position as one of the world''s main producers. Focus on modern technologies and sustainability.',
  'Café', 45000000, 50000, 3000, 12000, 2023, 2026, 'em_execucao',
  'Dr. António Silva', '+244 923 456 789', 'a.silva@inca.gov.ao',
  'Uíge,Kwanza Norte,Malanje',
  'Variedades resistentes a doenças,Sistemas de irrigação por gotejamento,Processamento pós-colheita moderno,Certificação orgânica',
  'União Europeia,Estados Unidos,China,Japão',
  '🌱', '#C49A3C'
WHERE NOT EXISTS (SELECT 1 FROM projectos WHERE nome = 'Reabilitação Cafeeira');

INSERT INTO projectos (nome, nome_en, descricao, descricao_en, fileira, investimento_usd, hectares, produtores_capacitar, capacidade_anual_t, ano_inicio, ano_conclusao, status, coordenador, telefone_coordenador, email_coordenador, provincias, tecnologias, mercados_exportacao, logo_emoji, cor_tema)
SELECT 'Expansão Dendém', 'Palm Oil Expansion',
  'Desenvolvimento de uma das maiores plantações de dendezeiros em Angola, com capacidade para produzir 15.000 toneladas anuais de óleo de palma, reduzindo a dependência de importações.',
  'Development of one of the largest oil palm plantations in Angola, with capacity to produce 15,000 annual tons of palm oil, reducing import dependency.',
  'Dendém', 32000000, 20000, 2000, 15000, 2022, 2025, 'em_execucao',
  'Eng. Maria Ferreira', '+244 912 345 678', 'm.ferreira@inca.gov.ao',
  'Cabo Ledo',
  'Plantação de dendezeiros de elite,Fábrica de processamento industrial,Centro de capacitação de produtores,Infraestrutura de logística',
  'Angola,Namíbia,República Democrática do Congo',
  '🌴', '#6B3520'
WHERE NOT EXISTS (SELECT 1 FROM projectos WHERE nome = 'Expansão Dendém');

INSERT INTO projectos (nome, nome_en, descricao, descricao_en, fileira, investimento_usd, hectares, produtores_capacitar, capacidade_anual_t, ano_inicio, ano_conclusao, status, coordenador, telefone_coordenador, email_coordenador, provincias, tecnologias, mercados_exportacao, logo_emoji, cor_tema)
SELECT 'Modernização Cacau', 'Cocoa Modernization',
  'Modernização da produção de cacau com sistemas agroflorestais sustentáveis e certificação orgânica para acesso a mercados europeus de alto valor.',
  'Modernization of cocoa production with sustainable agroforestry systems and organic certification for access to high-value European markets.',
  'Cacau', 18000000, 8000, 500, 3500, 2024, 2027, 'em_execucao',
  'Dr. João Santos', '+244 923 789 012', 'j.santos@inca.gov.ao',
  'Cuanza Sul',
  'Sistemas agroflorestais,Certificação orgânica UE,Comércio justo,Rastreabilidade completa',
  'União Europeia,Suíça,Alemanha,Países Baixos',
  '🍫', '#2C4A2E'
WHERE NOT EXISTS (SELECT 1 FROM projectos WHERE nome = 'Modernização Cacau');

INSERT INTO projectos (nome, nome_en, descricao, descricao_en, fileira, investimento_usd, hectares, produtores_capacitar, capacidade_anual_t, ano_inicio, ano_conclusao, status, coordenador, telefone_coordenador, email_coordenador, provincias, tecnologias, mercados_exportacao, logo_emoji, cor_tema)
SELECT 'Desenvolvimento Caju', 'Cashew Development',
  'Expansão da produção de caju em Benguela e Namibe com unidade de processamento industrial e foco na exportação para mercados asiáticos em crescimento.',
  'Expansion of cashew production in Benguela and Namibe with industrial processing unit and focus on export to growing Asian markets.',
  'Caju', 12000000, 12000, 800, 8000, 2023, 2026, 'em_execucao',
  'Eng. Isabel Costa', '+244 934 567 890', 'i.costa@inca.gov.ao',
  'Benguela,Namibe',
  'Processamento de castanha,Extração de óleo CNSL,Armazenamento refrigerado,Logística de exportação',
  'China,Índia,Vietnam,União Europeia',
  '🥜', '#5A7A5C'
WHERE NOT EXISTS (SELECT 1 FROM projectos WHERE nome = 'Desenvolvimento Caju');

INSERT INTO projectos (nome, nome_en, descricao, descricao_en, fileira, investimento_usd, hectares, produtores_capacitar, capacidade_anual_t, ano_inicio, ano_conclusao, status, coordenador, telefone_coordenador, email_coordenador, provincias, tecnologias, mercados_exportacao, logo_emoji, cor_tema)
SELECT 'Irrigação Huambo', 'Huambo Irrigation',
  'Construção de infraestruturas de irrigação no planalto central do Huambo para suporte à produção de café premium e culturas de alto valor. O projecto inclui barragens de captação, canais de distribuição e sistemas de irrigação por gotejamento em 15.000 hectares.',
  'Construction of irrigation infrastructure on the central plateau of Huambo to support premium coffee production and high-value crops. The project includes catchment dams, distribution channels and drip irrigation systems across 15,000 hectares.',
  'Café', 28000000, 15000, 1800, 5000, 2025, 2028, 'em_planeamento',
  'Eng. Pedro Lemos', '+244 923 111 222', 'p.lemos@inca.gov.ao',
  'Huambo,Bié',
  'Barragens de captação,Canais de distribuição,Irrigação por gotejamento,Sensores de humidade do solo,Gestão digital de água',
  'União Europeia,Estados Unidos,Japão',
  '💧', '#1A6B8A'
WHERE NOT EXISTS (SELECT 1 FROM projectos WHERE nome = 'Irrigação Huambo');

INSERT INTO projectos (nome, nome_en, descricao, descricao_en, fileira, investimento_usd, hectares, produtores_capacitar, capacidade_anual_t, ano_inicio, ano_conclusao, status, coordenador, telefone_coordenador, email_coordenador, provincias, tecnologias, mercados_exportacao, logo_emoji, cor_tema)
SELECT 'Viveiros Nacionais', 'National Nurseries',
  'Programa nacional de produção e distribuição de 50 milhões de mudas certificadas por ano das quatro fileiras estratégicas — Café, Dendém, Cacau e Caju — para renovação e expansão do parque agrícola angolano. Rede de 12 viveiros regionais com laboratórios de fitossanidade.',
  'National programme to produce and distribute 50 million certified seedlings per year of the four strategic crops — Coffee, Oil Palm, Cocoa and Cashew — to renew and expand Angola''s agricultural stock. Network of 12 regional nurseries with phytosanitary laboratories.',
  'Café', 9000000, 0, 5000, 0, 2025, 2027, 'em_planeamento',
  'Dra. Fernanda Lopes', '+244 912 333 444', 'f.lopes@inca.gov.ao',
  'Uíge,Kwanza Norte,Malanje,Benguela,Huambo,Cuanza Sul',
  'Biotecnologia vegetal,Laboratórios de fitossanidade,Propagação vegetativa,Certificação de material vegetal,Rede de frio para conservação',
  'Distribuição Nacional',
  '🌿', '#2C4A2E'
WHERE NOT EXISTS (SELECT 1 FROM projectos WHERE nome = 'Viveiros Nacionais');

INSERT INTO projectos (nome, nome_en, descricao, descricao_en, fileira, investimento_usd, hectares, produtores_capacitar, capacidade_anual_t, ano_inicio, ano_conclusao, status, coordenador, telefone_coordenador, email_coordenador, provincias, tecnologias, mercados_exportacao, logo_emoji, cor_tema)
SELECT 'Digitalização Agrícola', 'Agricultural Digitization',
  'Implementação de plataforma digital integrada de rastreabilidade, certificação de origem e gestão de produtores para 120.000 agricultores das quatro fileiras estratégicas. A plataforma garante acesso privilegiado a mercados internacionais premium e transparência total na cadeia de valor.',
  'Implementation of an integrated digital platform for traceability, origin certification and producer management for 120,000 farmers across the four strategic crops. The platform ensures privileged access to premium international markets and full value chain transparency.',
  'Café', 6000000, 0, 120000, 0, 2024, 2026, 'em_execucao',
  'Dr. Carlos Mendes', '+244 934 555 666', 'c.mendes@inca.gov.ao',
  'Nacional (18 Províncias)',
  'Blockchain de rastreabilidade,App móvel para produtores,QR Code de certificação,Sistema de georreferenciação,Dashboard de exportação,Integração API alfândegas',
  'União Europeia,Estados Unidos,China,Japão,Reino Unido',
  '📱', '#1A0A00'
WHERE NOT EXISTS (SELECT 1 FROM projectos WHERE nome = 'Digitalização Agrícola');

INSERT INTO projectos (nome, nome_en, descricao, descricao_en, fileira, investimento_usd, hectares, produtores_capacitar, capacidade_anual_t, ano_inicio, ano_conclusao, status, coordenador, telefone_coordenador, email_coordenador, provincias, tecnologias, mercados_exportacao, logo_emoji, cor_tema)
SELECT 'Formação Técnica', 'Technical Training',
  'Programa de capacitação de 10.000 técnicos agrícolas especializados nas quatro fileiras estratégicas, em parceria com institutos internacionais de referência. Inclui formação presencial, e-learning e intercâmbios internacionais com foco em boas práticas agrícolas e sustentabilidade.',
  'Training programme for 10,000 agricultural technicians specialised in the four strategic crops, in partnership with leading international institutes. Includes in-person training, e-learning and international exchanges focusing on good agricultural practices and sustainability.',
  'Café', 5000000, 0, 10000, 0, 2025, 2028, 'em_planeamento',
  'Prof. Ana Gonçalves', '+244 923 777 888', 'a.goncalves@inca.gov.ao',
  'Nacional (18 Províncias)',
  'E-learning agrícola,Simuladores de campo,Parcerias com universidades,Certificação internacional,Intercâmbios Brasil e Portugal',
  'Distribuição Nacional',
  '🎓', '#6B3520'
WHERE NOT EXISTS (SELECT 1 FROM projectos WHERE nome = 'Formação Técnica');


-- ════════════════════════════════════════════════════════════
--  FASES DOS PROJECTOS
-- ════════════════════════════════════════════════════════════

DO $$
DECLARE
  p_cafe  BIGINT := (SELECT id FROM projectos WHERE nome = 'Reabilitação Cafeeira' LIMIT 1);
  p_dem   BIGINT := (SELECT id FROM projectos WHERE nome = 'Expansão Dendém'       LIMIT 1);
  p_dig   BIGINT := (SELECT id FROM projectos WHERE nome = 'Digitalização Agrícola' LIMIT 1);
  p_irr   BIGINT := (SELECT id FROM projectos WHERE nome = 'Irrigação Huambo'      LIMIT 1);
BEGIN

  -- Fases: Reabilitação Cafeeira
  IF p_cafe IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projeto_fases WHERE projeto_id = p_cafe) THEN
    INSERT INTO projeto_fases (projeto_id, nome_fase, nome_fase_en, descricao, descricao_en, data_inicio, data_fim, progresso_pct, status) VALUES
      (p_cafe, 'Estudo de Viabilidade',   'Feasibility Study',     'Análise detalhada das áreas potenciais e estudo de mercado',  'Detailed analysis of potential areas and market study',          '2023-01-01','2023-06-30', 100, 'concluido'),
      (p_cafe, 'Preparação do Terreno',   'Land Preparation',      'Limpeza e preparação de 20.000 hectares',                     'Clearing and preparation of 20,000 hectares',                    '2023-07-01','2024-12-31',  75, 'em_execucao'),
      (p_cafe, 'Plantio',                 'Planting',              'Plantio de variedades resistentes',                           'Planting of resistant varieties',                                '2024-01-01','2025-06-30',  25, 'nao_iniciado'),
      (p_cafe, 'Instalação de Irrigação', 'Irrigation Installation','Sistema de irrigação por gotejamento',                        'Drip irrigation system',                                         '2024-06-01','2025-12-31',  10, 'nao_iniciado'),
      (p_cafe, 'Beneficiamento',          'Processing',            'Construção de estações de processamento',                     'Construction of processing stations',                            '2025-01-01','2026-06-30',   5, 'nao_iniciado');
  END IF;

  -- Fases: Expansão Dendém
  IF p_dem IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projeto_fases WHERE projeto_id = p_dem) THEN
    INSERT INTO projeto_fases (projeto_id, nome_fase, nome_fase_en, descricao, descricao_en, data_inicio, data_fim, progresso_pct, status) VALUES
      (p_dem, 'Desenvolvimento de Sementeiras','Nursery Development','Produção de mudas de elite',                    'Elite seedling production',                   '2022-01-01','2023-12-31', 100, 'concluido'),
      (p_dem, 'Preparação do Terreno',         'Land Preparation',   'Limpeza e preparação de 20.000 hectares',       'Clearing and preparation of 20,000 hectares', '2023-01-01','2024-06-30',  90, 'em_execucao'),
      (p_dem, 'Plantio',                       'Planting',           'Plantio de dendezeiros',                        'Oil palm planting',                           '2024-01-01','2025-12-31',  60, 'em_execucao'),
      (p_dem, 'Construção da Fábrica',         'Factory Construction','Unidade de processamento industrial',          'Industrial processing unit',                  '2024-06-01','2025-12-31',  40, 'em_execucao'),
      (p_dem, 'Capacitação',                   'Training',           'Treinamento de 2.000 produtores',               'Training of 2,000 producers',                 '2024-01-01','2025-12-31',  30, 'em_execucao');
  END IF;

  -- Fases: Digitalização Agrícola
  IF p_dig IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projeto_fases WHERE projeto_id = p_dig) THEN
    INSERT INTO projeto_fases (projeto_id, nome_fase, nome_fase_en, descricao, descricao_en, data_inicio, data_fim, progresso_pct, status) VALUES
      (p_dig, 'Desenvolvimento da Plataforma','Platform Development','Arquitectura, desenvolvimento e testes da plataforma digital', 'Architecture, development and testing of the digital platform', '2024-01-01','2024-09-30', 80, 'em_execucao'),
      (p_dig, 'Piloto em 3 Províncias',       '3-Province Pilot',   'Lançamento piloto no Uíge, Cuanza Norte e Benguela',           'Pilot launch in Uíge, Cuanza Norte and Benguela',               '2024-10-01','2025-03-31', 30, 'em_execucao'),
      (p_dig, 'Expansão Nacional',            'National Rollout',   'Expansão para todas as 18 províncias e 120.000 produtores',    'Expansion to all 18 provinces and 120,000 producers',           '2025-04-01','2026-06-30',  0, 'nao_iniciado');
  END IF;

  -- Fases: Irrigação Huambo
  IF p_irr IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projeto_fases WHERE projeto_id = p_irr) THEN
    INSERT INTO projeto_fases (projeto_id, nome_fase, nome_fase_en, descricao, descricao_en, data_inicio, data_fim, progresso_pct, status) VALUES
      (p_irr, 'Estudo Hidrológico',      'Hydrological Study','Levantamento hidrológico e desenho do sistema',   'Hydrological survey and system design',      '2025-01-01','2025-06-30', 20, 'em_execucao'),
      (p_irr, 'Construção de Barragens', 'Dam Construction',  'Construção de 4 barragens de captação',           'Construction of 4 catchment dams',            '2025-07-01','2027-06-30',  0, 'nao_iniciado'),
      (p_irr, 'Rede de Distribuição',    'Distribution Grid', 'Instalação de canais e sistemas de gotejamento',  'Installation of channels and drip systems',   '2027-01-01','2028-06-30',  0, 'nao_iniciado');
  END IF;

END $$;


-- ════════════════════════════════════════════════════════════
--  INVESTIMENTOS
-- ════════════════════════════════════════════════════════════

DO $$
DECLARE
  p_cafe BIGINT := (SELECT id FROM projectos WHERE nome = 'Reabilitação Cafeeira' LIMIT 1);
BEGIN
  IF p_cafe IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projeto_investimentos WHERE projeto_id = p_cafe) THEN
    INSERT INTO projeto_investimentos (projeto_id, categoria, categoria_en, valor_usd, fornecedor, descricao, data_investimento) VALUES
      (p_cafe, 'Infraestrutura', 'Infrastructure', 15000000, 'INCA Equipamentos',   'Estações de processamento e armazenamento',    '2023-03-15'),
      (p_cafe, 'Equipamento',    'Equipment',      12000000, 'TechAgri Solutions',  'Equipamento de irrigação por gotejamento',     '2023-06-20'),
      (p_cafe, 'Capacitação',    'Training',        8000000, 'INCA Formação',       'Treinamento técnico para produtores',          '2023-09-10'),
      (p_cafe, 'Insumos',        'Inputs',         10000000, 'Global Seeds Ltd',    'Mudas e insumos agrícolas',                    '2024-01-15');
  END IF;
END $$;


-- ════════════════════════════════════════════════════════════
--  ACTUALIZAÇÕES DOS PROJECTOS
-- ════════════════════════════════════════════════════════════

DO $$
DECLARE
  p_cafe BIGINT := (SELECT id FROM projectos WHERE nome = 'Reabilitação Cafeeira' LIMIT 1);
BEGIN
  IF p_cafe IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projeto_actualizacoes WHERE projeto_id = p_cafe) THEN
    INSERT INTO projeto_actualizacoes (projeto_id, titulo, titulo_en, descricao, descricao_en, tipo_actualizacao, autor) VALUES
      (p_cafe,
       'Primeira Colheita Experimental', 'First Experimental Harvest',
       'Primeira colheita nas áreas piloto do Uíge com resultados promissores. A qualidade do grão superou as expectativas iniciais, com uma classificação de especialidade pela SCAA.',
       'First harvest in pilot areas of Uíge with promising results. Grain quality exceeded initial expectations, receiving a specialty classification from the SCAA.',
       'progresso', 'Dr. António Silva'),
      (p_cafe,
       'Novo Investimento Europeu', 'New European Investment',
       'Parceria com a União Europeia aprovada para expansão do projecto em mais 10.000 hectares nas províncias do Kwanza Norte e Malanje.',
       'Partnership with the European Union approved for project expansion by an additional 10,000 hectares in the provinces of Kwanza Norte and Malanje.',
       'investimento', 'INCA Comunicação');
  END IF;
END $$;


-- ════════════════════════════════════════════════════════════
--  ARTIGO DE BOAS-VINDAS
-- ════════════════════════════════════════════════════════════

INSERT INTO artigos (titulo, titulo_en, slug, resumo, resumo_en, conteudo, conteudo_en, categoria_id, autor_id, estado, destaque, publicado_em)
SELECT
  'Bem-vindo ao Portal INCA',
  'Welcome to the INCA Portal',
  'bem-vindo-ao-portal-inca',
  'O Instituto Nacional do Café de Angola apresenta o novo portal digital para produtores.',
  'The National Coffee Institute of Angola presents the new digital portal for producers.',
  '<h2>Portal Digital do INCA</h2><p>O Instituto Nacional do Café de Angola (INCA) tem o prazer de apresentar o seu novo portal digital, desenvolvido para servir melhor os produtores de café, cacau e outras fileiras agrícolas de Angola.</p><h3>Funcionalidades Principais</h3><ul><li>Cadastro e gestão de produtores</li><li>Certificação de origem</li><li>Rastreabilidade de lotes</li><li>Pedidos de apoio técnico e financeiro</li><li>Informações de mercado em tempo real</li></ul><p>Junte-se a nós nesta jornada de transformação digital do sector agrícola angolano.</p>',
  '<h2>INCA Digital Portal</h2><p>The National Coffee Institute of Angola (INCA) is pleased to present its new digital portal, developed to better serve coffee, cocoa and other agricultural chain producers in Angola.</p><h3>Key Features</h3><ul><li>Producer registration and management</li><li>Origin certification</li><li>Lot traceability</li><li>Technical and financial support requests</li><li>Real-time market information</li></ul><p>Join us on this digital transformation journey of the Angolan agricultural sector.</p>',
  (SELECT id FROM categorias_conteudo WHERE slug = 'institucional'),
  (SELECT id FROM administradores WHERE nivel = 'super_admin' LIMIT 1),
  'publicado', TRUE, NOW()
WHERE NOT EXISTS (SELECT 1 FROM artigos WHERE slug = 'bem-vindo-ao-portal-inca');


-- ════════════════════════════════════════════════════════════
--  ANÚNCIO INICIAL
-- ════════════════════════════════════════════════════════════

INSERT INTO anuncios (titulo, titulo_en, mensagem, mensagem_en, tipo, activo, data_inicio, criado_por)
SELECT
  'Portal em Funcionamento',
  'Portal is Live',
  'O Portal INCA está agora disponível para todos os produtores registados. Faça login com o seu NBI e PIN.',
  'The INCA Portal is now available to all registered producers. Log in with your NBI and PIN.',
  'sucesso', TRUE, NOW(),
  (SELECT id FROM administradores WHERE nivel = 'super_admin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM anuncios WHERE titulo = 'Portal em Funcionamento');


-- ════════════════════════════════════════════════════════════
--  PREÇOS DE MERCADO (referência)
-- ════════════════════════════════════════════════════════════

INSERT INTO precos_mercado (produto, preco_aoa_kg, preco_usd_kg, variacao_pct)
VALUES
  ('Café Robusta',  1200, 0.65,  2.3),
  ('Café Arábica',  1800, 0.98,  1.8),
  ('Cacau',         2100, 1.14, -0.5),
  ('Caju (Bruto)',   450, 0.24,  3.1),
  ('Dendém (Óleo)', 1650, 0.90,  0.0)
ON CONFLICT DO NOTHING;
