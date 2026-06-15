-- ============================================================
--  INCA — Tabela FILEIRAS
--  SQL Server (MSSQL)
-- ============================================================

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'fileiras'
)
BEGIN
  CREATE TABLE fileiras (
    id                    INT IDENTITY(1,1) PRIMARY KEY,
    nome_pt               NVARCHAR(100)  NOT NULL,
    nome_en               NVARCHAR(100)  NOT NULL,
    nome_latin            NVARCHAR(100)  NULL,
    icone                 NVARCHAR(10)   NOT NULL DEFAULT N'🌿',
    descricao_pt          NVARCHAR(MAX)  NULL,
    descricao_en          NVARCHAR(MAX)  NULL,
    descricao_detalhada_pt NVARCHAR(MAX) NULL,
    descricao_detalhada_en NVARCHAR(MAX) NULL,
    stat1_valor           NVARCHAR(30)   NULL,
    stat1_label_pt        NVARCHAR(50)   NULL,
    stat1_label_en        NVARCHAR(50)   NULL,
    stat2_valor           NVARCHAR(30)   NULL,
    stat2_label_pt        NVARCHAR(50)   NULL,
    stat2_label_en        NVARCHAR(50)   NULL,
    provincias            NVARCHAR(300)  NULL,
    mercados              NVARCHAR(300)  NULL,
    cor_tema              NVARCHAR(20)   NOT NULL DEFAULT N'#C49A3C',
    ordem                 INT            NOT NULL DEFAULT 0,
    activo                BIT            NOT NULL DEFAULT 1,
    criado_em             DATETIME2      NOT NULL DEFAULT GETDATE(),
    actualizado_em        DATETIME2      NOT NULL DEFAULT GETDATE()
  );
  PRINT 'Tabela fileiras criada.';
END
ELSE
BEGIN
  PRINT 'Tabela fileiras já existe — a verificar colunas em falta...';

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='fileiras' AND COLUMN_NAME='descricao_detalhada_pt')
    ALTER TABLE fileiras ADD descricao_detalhada_pt NVARCHAR(MAX) NULL;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='fileiras' AND COLUMN_NAME='descricao_detalhada_en')
    ALTER TABLE fileiras ADD descricao_detalhada_en NVARCHAR(MAX) NULL;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='fileiras' AND COLUMN_NAME='provincias')
    ALTER TABLE fileiras ADD provincias NVARCHAR(300) NULL;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='fileiras' AND COLUMN_NAME='mercados')
    ALTER TABLE fileiras ADD mercados NVARCHAR(300) NULL;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='fileiras' AND COLUMN_NAME='cor_tema')
    ALTER TABLE fileiras ADD cor_tema NVARCHAR(20) NOT NULL DEFAULT N'#C49A3C';
END
GO

-- ── Inserir fileira: CAFÉ ──────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM fileiras WHERE nome_pt = N'Café')
BEGIN
  INSERT INTO fileiras (
    nome_pt, nome_en, nome_latin, icone,
    descricao_pt, descricao_en,
    descricao_detalhada_pt, descricao_detalhada_en,
    stat1_valor, stat1_label_pt, stat1_label_en,
    stat2_valor, stat2_label_pt, stat2_label_en,
    provincias, mercados, cor_tema, ordem, activo
  ) VALUES (
    N'Café', N'Coffee', N'Coffea robusta / arabica', N'☕',
    N'Angola foi o 4.º maior exportador mundial de café na década de 70. O INCA lidera a reabilitação desta fileira histórica, com foco no Uíge, Kwanza Norte e Malanje.',
    N'Angola was the world''s 4th largest coffee exporter in the 1970s. INCA leads the rehabilitation of this historic chain, focused on Uíge, Kwanza Norte and Malanje.',
    N'O café angolano tem uma história rica que remonta ao século XIX, quando as primeiras plantações foram estabelecidas nas terras altas do norte do país. Durante a década de 1970, Angola chegou a ser o quarto maior exportador mundial de café, produzindo principalmente as variedades Robusta e Arabica de elevada qualidade. As províncias do Uíge, Kwanza Norte e Malanje constituíam o coração desta indústria florescente, sustentando o modo de vida de centenas de milhares de famílias rurais.

O conflito armado que se prolongou por décadas destruiu grande parte das infraestruturas agrícolas e dispersou as comunidades cafeicultoras. Com o regresso da paz, o INCA assumiu o papel central na reabilitação desta fileira estratégica, implementando programas de replantação, distribuição de variedades melhoradas, capacitação técnica e construção de centros de processamento primário. Os esforços têm permitido recuperar gradualmente áreas de produção antes abandonadas.

Actualmente, o INCA trabalha em estreita parceria com produtores individuais, associações e empresas agroindustriais para consolidar uma cadeia de valor sustentável, desde a produção no campo até à exportação com certificação de origem. A meta é reposicionar Angola como um produtor de café de especialidade reconhecido nos mercados europeus, norte-americanos e asiáticos, aproveitando as únicas condições edafoclimáticas das terras altas angolanas.',
    N'Angolan coffee has a rich history dating back to the 19th century, when the first plantations were established in the northern highlands. During the 1970s, Angola was the world''s fourth-largest coffee exporter, producing mainly high-quality Robusta and Arabica varieties. The provinces of Uíge, Kwanza Norte, and Malanje formed the heart of this thriving industry, sustaining the livelihoods of hundreds of thousands of rural families.

Decades of armed conflict destroyed much of the agricultural infrastructure and displaced coffee-growing communities. With the return of peace, INCA took on a central role in rehabilitating this strategic chain, implementing replanting programmes, distributing improved varieties, providing technical training, and building primary processing centres. These efforts have gradually allowed previously abandoned production areas to be recovered.

Today, INCA works closely with individual producers, associations, and agro-industrial companies to consolidate a sustainable value chain, from field production to export with origin certification. The goal is to reposition Angola as a recognised specialty coffee producer in European, North American, and Asian markets, taking advantage of the unique edaphoclimatic conditions of the Angolan highlands.',
    N'12k t', N'Produção Anual', N'Annual Output',
    N'3', N'Regiões Principais', N'Key Regions',
    N'Uíge,Kwanza Norte,Malanje', NULL, N'#C49A3C', 1, 1
  );
  PRINT 'Fileira Café inserida.';
END
ELSE
  PRINT 'Fileira Café já existe — ignorado.';
GO

-- ── Inserir fileira: DENDÉM ────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM fileiras WHERE nome_pt = N'Dendém')
BEGIN
  INSERT INTO fileiras (
    nome_pt, nome_en, nome_latin, icone,
    descricao_pt, descricao_en,
    descricao_detalhada_pt, descricao_detalhada_en,
    stat1_valor, stat1_label_pt, stat1_label_en,
    stat2_valor, stat2_label_pt, stat2_label_en,
    provincias, mercados, cor_tema, ordem, activo
  ) VALUES (
    N'Dendém', N'Oil Palm', N'Elaeis guineensis', N'🌴',
    N'A palmeira de dendém tem enorme potencial agroindustrial em Angola, com extensas áreas aptas no norte e centro do país para produção de óleo de palma.',
    N'Oil palm has enormous agro-industrial potential in Angola, with extensive suitable areas in the north and centre for palm oil production.',
    N'A palmeira de dendém (Elaeis guineensis) é uma das culturas de maior rendimento económico por hectare no mundo, produzindo óleo de palma utilizado na indústria alimentar, cosmética e de biocombustíveis. Angola dispõe de mais de 85 000 hectares de áreas identificadas como aptas para a sua cultura, concentradas principalmente nas províncias do Malanje, Kwanza Norte, Uíge, Cuanza Sul e Moxico — regiões com pluviosidade, temperatura e tipos de solo ideais para o crescimento desta palmeira tropical.

O INCA tem conduzido estudos de aptidão agrícola e implantado parcelas demonstrativas que comprovam a viabilidade técnica da cultura nestas regiões. O desenvolvimento da fileira do dendém representa não só uma oportunidade de substituição de importações de óleos vegetais, que actualmente pesam significativamente na balança comercial angolana, como também a criação de emprego rural qualificado e o estabelecimento de unidades de transformação agroindustrial ao longo de toda a cadeia.

O modelo de desenvolvimento preconizado pelo INCA baseia-se na integração de pequenos e médios produtores em esquemas de agricultura de contrato com unidades industriais de extracção, garantindo escoamento garantido da produção e acesso a insumos, tecnologia e assistência técnica. A expansão sustentável da fileira do dendém é considerada uma das apostas estratégicas de maior impacto para a diversificação agrícola e a segurança alimentar de Angola.',
    N'Oil palm (Elaeis guineensis) is one of the highest-yielding economic crops per hectare in the world, producing palm oil used in the food, cosmetics, and biofuels industries. Angola has more than 85,000 hectares of areas identified as suitable for its cultivation, concentrated mainly in the provinces of Malanje, Kwanza Norte, Uíge, Cuanza Sul, and Moxico — regions with ideal rainfall, temperature, and soil types for growing this tropical palm tree.

INCA has conducted agricultural suitability studies and established demonstration plots that confirm the technical viability of the crop in these regions. The development of the oil palm chain represents not only an opportunity to substitute imports of vegetable oils — which currently weigh significantly on Angola''s trade balance — but also the creation of qualified rural employment and the establishment of agro-industrial processing units throughout the value chain.

The development model advocated by INCA is based on integrating small and medium-sized producers into contract farming schemes with industrial extraction units, ensuring guaranteed offtake of production and access to inputs, technology, and technical assistance. The sustainable expansion of the oil palm chain is considered one of the highest-impact strategic bets for Angola''s agricultural diversification and food security.',
    N'85k ha', N'Área Potencial', N'Potential Area',
    N'5', N'Províncias Alvo', N'Target Provinces',
    N'Malanje,Kwanza Norte,Uíge,Cuanza Sul,Moxico', NULL, N'#6B3520', 2, 1
  );
  PRINT 'Fileira Dendém inserida.';
END
ELSE
  PRINT 'Fileira Dendém já existe — ignorado.';
GO

-- ── Inserir fileira: CACAU ─────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM fileiras WHERE nome_pt = N'Cacau')
BEGIN
  INSERT INTO fileiras (
    nome_pt, nome_en, nome_latin, icone,
    descricao_pt, descricao_en,
    descricao_detalhada_pt, descricao_detalhada_en,
    stat1_valor, stat1_label_pt, stat1_label_en,
    stat2_valor, stat2_label_pt, stat2_label_en,
    provincias, mercados, cor_tema, ordem, activo
  ) VALUES (
    N'Cacau', N'Cocoa', N'Theobroma cacao', N'🍫',
    N'O cacau angolano apresenta características organolépticas distintas, com grande interesse no mercado de chocolate fino. Cabinda e Zaire são zonas de produção histórica.',
    N'Angolan cocoa has distinct organoleptic characteristics with strong interest in the fine chocolate market. Cabinda and Zaire are historic production areas.',
    N'O cacau angolano (Theobroma cacao) possui características organolépticas únicas resultantes da combinação de solos ricos em matéria orgânica, elevada pluviosidade e temperatura adequada das províncias do norte. As zonas históricas de Cabinda, Zaire e Uíge produziram cacau reconhecido internacionalmente pela sua complexidade aromática e teor de gordura, atributos que o qualificam para o segmento de chocolate fino — um mercado de nicho em forte crescimento a nível global.

Angola conta com a classificação da ICCO (International Cocoa Organization) de "fine or flavour cocoa" para parte da sua produção, o que representa uma vantagem competitiva considerável. O INCA tem investido na reactivação de fazendas históricas, na distribuição de clones de alta produtividade resistentes às principais doenças, bem como na capacitação de técnicos e produtores em práticas de fermentação e secagem que determinam a qualidade final do grão comercializado.

A estratégia da fileira do cacau contempla ainda o desenvolvimento de capacidade de transformação local, com unidades de pré-processamento e, a médio prazo, de produção de pasta e manteiga de cacau para exportação de valor acrescentado. O estabelecimento de parcerias com chocolateiros europeus e norte-americanos dispostos a pagar prémios por cacau de origem certificada constitui um dos eixos prioritários da acção do INCA nesta fileira.',
    N'Angolan cocoa (Theobroma cacao) possesses unique organoleptic characteristics resulting from the combination of organic-rich soils, high rainfall, and appropriate temperatures in the northern provinces. The historic areas of Cabinda, Zaire, and Uíge produced cocoa internationally recognised for its aromatic complexity and fat content — attributes that qualify it for the fine chocolate segment, a niche market experiencing strong global growth.

Angola holds ICCO (International Cocoa Organization) classification of "fine or flavour cocoa" for part of its production, which represents a considerable competitive advantage. INCA has invested in reactivating historic farms, distributing high-yielding disease-resistant clones, and training technicians and producers in fermentation and drying practices that determine the final quality of the commercialised bean.

The cocoa chain strategy also includes the development of local transformation capacity, with primary processing units and, in the medium term, production of cocoa paste and butter for value-added export. Establishing partnerships with European and North American chocolatiers willing to pay premiums for certified-origin cocoa is one of INCA''s priority action areas in this chain.',
    N'4k t', N'Produção Anual', N'Annual Output',
    N'Fine', N'Certificação ICCO', N'ICCO Certified',
    N'Cabinda,Zaire,Uíge', NULL, N'#2C4A2E', 3, 1
  );
  PRINT 'Fileira Cacau inserida.';
END
ELSE
  PRINT 'Fileira Cacau já existe — ignorado.';
GO

-- ── Inserir fileira: CAJU ──────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM fileiras WHERE nome_pt = N'Caju')
BEGIN
  INSERT INTO fileiras (
    nome_pt, nome_en, nome_latin, icone,
    descricao_pt, descricao_en,
    descricao_detalhada_pt, descricao_detalhada_en,
    stat1_valor, stat1_label_pt, stat1_label_en,
    stat2_valor, stat2_label_pt, stat2_label_en,
    provincias, mercados, cor_tema, ordem, activo
  ) VALUES (
    N'Caju', N'Cashew', N'Anacardium occidentale', N'🌿',
    N'O caju é uma das culturas com maior resiliência climática e crescimento exportador em Angola, com mercados estabelecidos na Europa e Ásia.',
    N'Cashew is one of the most climate-resilient crops with growing export momentum from Angola, with established markets in Europe and Asia.',
    N'O cajueiro (Anacardium occidentale) é uma árvore de elevada resiliência climática, capaz de prosperar em solos de baixa fertilidade e sob regimes de precipitação irregulares, características que a tornam particularmente adequada para as regiões semi-áridas do sul e litoral de Angola. As províncias de Benguela, Namibe, Huíla e Cunene concentram as maiores extensões de cajueiros, tanto em plantações comerciais como em pomares familiares dispersos.

Angola exporta actualmente castanha de caju bruta para mais de 12 países, com destinos principais na Europa (principalmente Índia via reexportação), Ásia e China. O INCA tem trabalhado para melhorar as taxas de recolha, introduzir variedades de maior produtividade e calibre de amêndoa, e instalar unidades de descasque e processamento que permitam agregar valor antes da exportação. A promoção do processamento local é uma prioridade, pois a castanha processada e a amêndoa beneficiada atingem preços significativamente superiores no mercado internacional face à castanha bruta.

Além do grão, o pedúnculo do caju (maçã de caju) é actualmente subutilizado em Angola, representando uma oportunidade adicional para a produção de sumos, vinho de caju e produtos fermentados. O INCA apoia iniciativas de aproveitamento integral desta cultura, contribuindo para aumentar o rendimento por produtor e reduzir o desperdício pós-colheita, enquanto estimula a criação de pequenas e médias empresas agroalimentares nas regiões produtoras.',
    N'The cashew tree (Anacardium occidentale) is a highly climate-resilient tree, capable of thriving in low-fertility soils and under irregular rainfall regimes — characteristics that make it particularly suitable for the semi-arid regions of southern and coastal Angola. The provinces of Benguela, Namibe, Huíla, and Cunene concentrate the largest extensions of cashew trees, both in commercial plantations and dispersed family orchards.

Angola currently exports raw cashew nuts to more than 12 countries, with main destinations in Europe (mainly India via re-export), Asia, and China. INCA has been working to improve collection rates, introduce varieties with higher productivity and larger kernel size, and install shelling and processing units that allow value to be added before export. Promoting local processing is a priority, as processed nuts and beneficiated kernels fetch significantly higher prices on the international market compared to raw nuts.

Beyond the nut, the cashew peduncle (cashew apple) is currently underutilised in Angola, representing an additional opportunity for the production of juices, cashew wine, and fermented products. INCA supports initiatives for the full utilisation of this crop, helping to increase income per producer and reduce post-harvest waste, while stimulating the creation of small and medium agri-food enterprises in producing regions.',
    N'30k t', N'Produção Anual', N'Annual Output',
    N'12+', N'Países Destino', N'Export Markets',
    N'Benguela,Namibe,Huíla,Cunene', N'Europa,Ásia,China,Índia', N'#5A7A5C', 4, 1
  );
  PRINT 'Fileira Caju inserida.';
END
ELSE
  PRINT 'Fileira Caju já existe — ignorado.';
GO

PRINT 'Script fileiras.sql concluído.';
