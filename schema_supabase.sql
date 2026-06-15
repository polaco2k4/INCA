-- ════════════════════════════════════════════════════════════
--  INCA Portal — Schema PostgreSQL (Supabase)
--  Executar no SQL Editor do Supabase Dashboard
-- ════════════════════════════════════════════════════════════

-- ── Extensões ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ════════════════════════════════════════════════════════════
--  FILEIRAS
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fileiras (
  id                      BIGSERIAL PRIMARY KEY,
  nome_pt                 TEXT NOT NULL,
  nome_en                 TEXT NOT NULL,
  nome_latin              TEXT,
  icone                   TEXT NOT NULL DEFAULT '🌿',
  descricao_pt            TEXT,
  descricao_en            TEXT,
  descricao_detalhada_pt  TEXT,
  descricao_detalhada_en  TEXT,
  stat1_valor             TEXT,
  stat1_label_pt          TEXT,
  stat1_label_en          TEXT,
  stat2_valor             TEXT,
  stat2_label_pt          TEXT,
  stat2_label_en          TEXT,
  provincias              TEXT,
  mercados                TEXT,
  cor_tema                TEXT NOT NULL DEFAULT '#C49A3C',
  ordem                   INTEGER NOT NULL DEFAULT 0,
  activo                  BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_em          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
--  PRODUTORES
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS produtores (
  id              BIGSERIAL PRIMARY KEY,
  auth_user_id    UUID UNIQUE,  -- Supabase Auth user ID
  nome            TEXT NOT NULL,
  nbi             TEXT NOT NULL UNIQUE,
  pin_hash        TEXT,         -- mantido para migração gradual
  telefone        TEXT,
  email           TEXT,
  provincia       TEXT,
  municipio       TEXT,
  fileira         TEXT,
  area_ha         DECIMAL(10,2),
  tipo_produtor   TEXT DEFAULT 'Individual / Familiar',
  reset_token     TEXT,
  reset_expires   TIMESTAMPTZ,
  activo          BOOLEAN DEFAULT FALSE,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  actualizado_em  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_produtores_activo ON produtores(activo);
CREATE INDEX IF NOT EXISTS idx_produtores_nbi ON produtores(nbi);

-- ════════════════════════════════════════════════════════════
--  PARCELAS
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS parcelas (
  id          BIGSERIAL PRIMARY KEY,
  produtor_id BIGINT NOT NULL REFERENCES produtores(id) ON DELETE CASCADE,
  fileira     TEXT,
  area_ha     DECIMAL(10,2),
  latitude    DECIMAL(10,6),
  longitude   DECIMAL(10,6),
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
--  LOTES
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lotes (
  id            BIGSERIAL PRIMARY KEY,
  codigo        TEXT NOT NULL UNIQUE,
  produtor_id   BIGINT REFERENCES produtores(id) ON DELETE SET NULL,
  fileira       TEXT,
  produto       TEXT,
  quantidade_kg DECIMAL(12,2),
  provincia     TEXT,
  municipio     TEXT,
  estado        TEXT DEFAULT 'colhido'
                CHECK (estado IN ('colhido','em_processamento','pronto','exportado')),
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lote_eventos (
  id          BIGSERIAL PRIMARY KEY,
  lote_id     BIGINT NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  titulo      TEXT NOT NULL,
  descricao   TEXT,
  tipo        TEXT DEFAULT 'normal' CHECK (tipo IN ('normal','destaque')),
  data_evento TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
--  CERTIFICADOS
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS certificados (
  id              BIGSERIAL PRIMARY KEY,
  produtor_id     BIGINT REFERENCES produtores(id) ON DELETE SET NULL,
  produto         TEXT NOT NULL,
  quantidade_kg   DECIMAL(12,2) NOT NULL,
  numero_lote     TEXT,
  pais_destino    TEXT NOT NULL,
  data_exportacao DATE NOT NULL,
  referencia      TEXT NOT NULL UNIQUE,
  estado          TEXT DEFAULT 'pendente'
                  CHECK (estado IN ('pendente','emitido','rejeitado')),
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificados_estado ON certificados(estado);

-- ════════════════════════════════════════════════════════════
--  PEDIDOS DE APOIO
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pedidos_apoio (
  id              BIGSERIAL PRIMARY KEY,
  produtor_id     BIGINT REFERENCES produtores(id) ON DELETE SET NULL,
  tipo            TEXT NOT NULL,
  fileira         TEXT NOT NULL,
  valor_estimado  DECIMAL(14,2),
  descricao       TEXT NOT NULL,
  referencia      TEXT NOT NULL UNIQUE,
  estado          TEXT DEFAULT 'em_analise'
                  CHECK (estado IN ('em_analise','aprovado','rejeitado')),
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_apoio_estado ON pedidos_apoio(estado);

-- ════════════════════════════════════════════════════════════
--  PREÇOS DE MERCADO
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS precos_mercado (
  id             BIGSERIAL PRIMARY KEY,
  produto        TEXT NOT NULL,
  preco_aoa_kg   DECIMAL(10,2),
  preco_usd_kg   DECIMAL(8,4),
  variacao_pct   DECIMAL(6,2),
  atualizado_em  TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
--  ADMINISTRADORES
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS administradores (
  id              BIGSERIAL PRIMARY KEY,
  auth_user_id    UUID UNIQUE,  -- Supabase Auth user ID
  nome            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT,         -- mantido para migração gradual
  nivel           TEXT DEFAULT 'operador'
                  CHECK (nivel IN ('super_admin','admin','operador')),
  activo          BOOLEAN DEFAULT TRUE,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  ultimo_acesso   TIMESTAMPTZ
);

-- ════════════════════════════════════════════════════════════
--  LOGS ADMINISTRATIVOS
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS admin_logs (
  id          BIGSERIAL PRIMARY KEY,
  admin_id    BIGINT NOT NULL REFERENCES administradores(id),
  acao        TEXT NOT NULL,
  entidade    TEXT NOT NULL,
  entidade_id BIGINT,
  detalhes    TEXT,
  ip_address  TEXT,
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);

-- ════════════════════════════════════════════════════════════
--  CONTEÚDO
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS categorias_conteudo (
  id        BIGSERIAL PRIMARY KEY,
  nome      TEXT NOT NULL UNIQUE,
  slug      TEXT NOT NULL UNIQUE,
  descricao TEXT,
  activo    BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS artigos (
  id              BIGSERIAL PRIMARY KEY,
  titulo          TEXT NOT NULL,
  titulo_en       TEXT,
  slug            TEXT NOT NULL UNIQUE,
  resumo          TEXT,
  resumo_en       TEXT,
  conteudo        TEXT NOT NULL,
  conteudo_en     TEXT,
  categoria_id    BIGINT REFERENCES categorias_conteudo(id) ON DELETE SET NULL,
  autor_id        BIGINT REFERENCES administradores(id) ON DELETE SET NULL,
  imagem_destaque TEXT,
  tags            TEXT,
  estado          TEXT DEFAULT 'rascunho'
                  CHECK (estado IN ('rascunho','publicado','arquivado')),
  destaque        BOOLEAN DEFAULT FALSE,
  visualizacoes   INTEGER DEFAULT 0,
  publicado_em    TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  actualizado_em  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artigos_estado ON artigos(estado);
CREATE INDEX IF NOT EXISTS idx_artigos_destaque ON artigos(destaque, publicado_em DESC);

CREATE TABLE IF NOT EXISTS anuncios (
  id          BIGSERIAL PRIMARY KEY,
  titulo      TEXT NOT NULL,
  titulo_en   TEXT,
  mensagem    TEXT NOT NULL,
  mensagem_en TEXT,
  tipo        TEXT DEFAULT 'info'
              CHECK (tipo IN ('info','aviso','urgente','sucesso')),
  link_url    TEXT,
  link_texto  TEXT,
  link_texto_en TEXT,
  activo      BOOLEAN DEFAULT TRUE,
  data_inicio TIMESTAMPTZ DEFAULT NOW(),
  data_fim    TIMESTAMPTZ,
  criado_por  BIGINT REFERENCES administradores(id) ON DELETE SET NULL,
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anuncios_activo ON anuncios(activo, data_inicio, data_fim);

CREATE TABLE IF NOT EXISTS media (
  id          BIGSERIAL PRIMARY KEY,
  titulo      TEXT NOT NULL,
  descricao   TEXT,
  tipo        TEXT NOT NULL CHECK (tipo IN ('imagem','video','documento','outro')),
  url         TEXT NOT NULL,
  tamanho_kb  INTEGER,
  mime_type   TEXT,
  upload_por  BIGINT REFERENCES administradores(id) ON DELETE SET NULL,
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paginas (
  id              BIGSERIAL PRIMARY KEY,
  titulo          TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  conteudo        TEXT NOT NULL,
  meta_descricao  TEXT,
  activo          BOOLEAN DEFAULT TRUE,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  actualizado_em  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faq (
  id        BIGSERIAL PRIMARY KEY,
  pergunta  TEXT NOT NULL,
  resposta  TEXT NOT NULL,
  categoria TEXT,
  ordem     INTEGER DEFAULT 0,
  activo    BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
--  PROJECTOS
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS projectos (
  id                   BIGSERIAL PRIMARY KEY,
  nome                 TEXT NOT NULL,
  nome_en              TEXT NOT NULL,
  descricao            TEXT NOT NULL,
  descricao_en         TEXT NOT NULL,
  fileira              TEXT NOT NULL,
  investimento_usd     DECIMAL(14,2) NOT NULL,
  hectares             DECIMAL(10,2) NOT NULL,
  produtores_capacitar INTEGER NOT NULL DEFAULT 0,
  capacidade_anual_t   DECIMAL(10,2) NOT NULL DEFAULT 0,
  ano_inicio           INTEGER NOT NULL,
  ano_conclusao        INTEGER NOT NULL,
  status               TEXT NOT NULL DEFAULT 'em_planeamento'
                       CHECK (status IN ('em_planeamento','em_execucao','concluido','suspenso')),
  coordenador          TEXT,
  telefone_coordenador TEXT,
  email_coordenador    TEXT,
  provincias           TEXT,
  tecnologias          TEXT,
  mercados_exportacao  TEXT,
  logo_emoji           TEXT DEFAULT '📋',
  cor_tema             TEXT DEFAULT '#C49A3C',
  criado_em            TIMESTAMPTZ DEFAULT NOW(),
  actualizado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projeto_fases (
  id           BIGSERIAL PRIMARY KEY,
  projeto_id   BIGINT NOT NULL REFERENCES projectos(id) ON DELETE CASCADE,
  nome_fase    TEXT NOT NULL,
  nome_fase_en TEXT NOT NULL,
  descricao    TEXT,
  descricao_en TEXT,
  data_inicio  DATE,
  data_fim     DATE,
  progresso_pct DECIMAL(5,2) DEFAULT 0,
  status       TEXT DEFAULT 'nao_iniciado'
               CHECK (status IN ('nao_iniciado','em_execucao','concluido','atrasado')),
  criado_em    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projeto_investimentos (
  id                 BIGSERIAL PRIMARY KEY,
  projeto_id         BIGINT NOT NULL REFERENCES projectos(id) ON DELETE CASCADE,
  categoria          TEXT NOT NULL,
  categoria_en       TEXT NOT NULL,
  valor_usd          DECIMAL(14,2) NOT NULL,
  moeda              TEXT DEFAULT 'USD',
  fornecedor         TEXT,
  descricao          TEXT,
  data_investimento  DATE,
  criado_em          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projeto_actualizacoes (
  id                BIGSERIAL PRIMARY KEY,
  projeto_id        BIGINT NOT NULL REFERENCES projectos(id) ON DELETE CASCADE,
  titulo            TEXT NOT NULL,
  titulo_en         TEXT NOT NULL,
  descricao         TEXT NOT NULL,
  descricao_en      TEXT NOT NULL,
  tipo_actualizacao TEXT NOT NULL DEFAULT 'geral'
                    CHECK (tipo_actualizacao IN ('geral','progresso','investimento','mudanca','conclusao')),
  data_publicacao   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  autor             TEXT,
  criado_em         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projecto_fotos (
  id          BIGSERIAL PRIMARY KEY,
  projecto_id BIGINT NOT NULL REFERENCES projectos(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  url_path    TEXT NOT NULL,   -- URL pública do Supabase Storage
  ordem       INTEGER DEFAULT 0,
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
--  KPIs HOMEPAGE
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS kpis_homepage (
  id             BIGSERIAL PRIMARY KEY,
  chave          TEXT NOT NULL UNIQUE,
  valor_num      DECIMAL(18,2) NOT NULL DEFAULT 0,
  sufixo         TEXT,
  label_pt       TEXT NOT NULL,
  label_en       TEXT NOT NULL,
  ordem          INTEGER NOT NULL DEFAULT 0,
  actualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
--  FUNÇÕES RPC (para queries com GROUP BY / agregados)
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_producao_por_fileira()
RETURNS TABLE(fileira TEXT, total_kg NUMERIC) AS $$
  SELECT fileira, SUM(quantidade_kg) AS total_kg
  FROM lotes
  GROUP BY fileira
  ORDER BY total_kg DESC;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_producao_por_provincia()
RETURNS TABLE(provincia TEXT, total_kg NUMERIC) AS $$
  SELECT p.provincia, SUM(l.quantidade_kg) AS total_kg
  FROM lotes l
  JOIN produtores p ON l.produtor_id = p.id
  WHERE l.fileira = 'Café'
  GROUP BY p.provincia
  ORDER BY total_kg DESC;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_exportacao_por_destino()
RETURNS TABLE(pais_destino TEXT, total_kg NUMERIC) AS $$
  SELECT pais_destino, SUM(quantidade_kg) AS total_kg
  FROM certificados
  WHERE estado = 'emitido'
  GROUP BY pais_destino
  ORDER BY total_kg DESC;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_exportacao_por_fileira()
RETURNS TABLE(produto TEXT, total_kg NUMERIC) AS $$
  SELECT produto, SUM(quantidade_kg) AS total_kg
  FROM certificados
  WHERE estado = 'emitido'
  GROUP BY produto
  ORDER BY total_kg DESC;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_projectos_estatisticas()
RETURNS TABLE(
  total_projectos         BIGINT,
  investimento_total      NUMERIC,
  hectares_total          NUMERIC,
  produtores_total        BIGINT,
  capacidade_total        NUMERIC,
  projectos_em_execucao   BIGINT,
  projectos_concluidos    BIGINT,
  projectos_em_planeamento BIGINT
) AS $$
  SELECT
    COUNT(*)                                              AS total_projectos,
    SUM(investimento_usd)                                 AS investimento_total,
    SUM(hectares)                                         AS hectares_total,
    SUM(produtores_capacitar)                             AS produtores_total,
    SUM(capacidade_anual_t)                               AS capacidade_total,
    COUNT(*) FILTER (WHERE status = 'em_execucao')        AS projectos_em_execucao,
    COUNT(*) FILTER (WHERE status = 'concluido')          AS projectos_concluidos,
    COUNT(*) FILTER (WHERE status = 'em_planeamento')     AS projectos_em_planeamento
  FROM projectos;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_projectos_por_fileira()
RETURNS TABLE(fileira TEXT, count BIGINT, investimento NUMERIC) AS $$
  SELECT fileira, COUNT(*) AS count, SUM(investimento_usd) AS investimento
  FROM projectos
  GROUP BY fileira
  ORDER BY count DESC;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE(
  produtores_pendentes  BIGINT,
  produtores_activos    BIGINT,
  certificados_pendentes BIGINT,
  certificados_emitidos  BIGINT,
  apoios_pendentes      BIGINT,
  apoios_aprovados      BIGINT,
  total_lotes           BIGINT,
  total_kg_producao     NUMERIC
) AS $$
  SELECT
    (SELECT COUNT(*) FROM produtores WHERE activo = FALSE)             AS produtores_pendentes,
    (SELECT COUNT(*) FROM produtores WHERE activo = TRUE)              AS produtores_activos,
    (SELECT COUNT(*) FROM certificados WHERE estado = 'pendente')      AS certificados_pendentes,
    (SELECT COUNT(*) FROM certificados WHERE estado = 'emitido')       AS certificados_emitidos,
    (SELECT COUNT(*) FROM pedidos_apoio WHERE estado = 'em_analise')   AS apoios_pendentes,
    (SELECT COUNT(*) FROM pedidos_apoio WHERE estado = 'aprovado')     AS apoios_aprovados,
    (SELECT COUNT(*) FROM lotes)                                       AS total_lotes,
    (SELECT COALESCE(SUM(quantidade_kg), 0) FROM lotes)                AS total_kg_producao;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY (desactivar para acesso via service_role)
-- ════════════════════════════════════════════════════════════

-- O backend usa service_role key que ignora RLS.
-- Activar RLS apenas se o frontend vier a aceder directamente ao Supabase.
-- ALTER TABLE produtores ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════
--  DADOS INICIAIS
-- ════════════════════════════════════════════════════════════

-- KPIs
INSERT INTO kpis_homepage (chave, valor_num, sufixo, label_pt, label_en, ordem)
VALUES
  ('produtores',    120000, 'k',   'Produtores Registados',     'Registered Producers',     1),
  ('provincias',        18, NULL,  'Províncias de Actuação',    'Provinces of Operation',   2),
  ('usd_exportado', 46000000, 'M', 'USD Valor Exportado (2024)','USD Export Value (2024)',  3),
  ('cooperativas',     340, NULL,  'Cooperativas Apoiadas',     'Cooperatives Supported',   4),
  ('fileiras',           4, NULL,  'Fileiras Agrícolas',        'Agricultural Value Chains',5)
ON CONFLICT (chave) DO NOTHING;

-- Categorias
INSERT INTO categorias_conteudo (nome, slug, descricao)
VALUES
  ('Notícias',      'noticias',      'Notícias e atualizações do INCA'),
  ('Eventos',       'eventos',       'Eventos, workshops e formações'),
  ('Mercado',       'mercado',       'Informações sobre mercado e preços'),
  ('Técnicas',      'tecnicas',      'Guias técnicos e boas práticas'),
  ('Institucional', 'institucional', 'Informações institucionais')
ON CONFLICT (slug) DO NOTHING;

-- Preços de mercado
INSERT INTO precos_mercado (produto, preco_aoa_kg, preco_usd_kg, variacao_pct)
VALUES
  ('Café Verde Arábica', 1850, 2.05,  4.2),
  ('Café Verde Robusta', 1420, 1.57,  2.8),
  ('Cacau Amêndoa',      3200, 3.54,  6.1),
  ('Caju (Amêndoa)',     2650, 2.93, -1.2),
  ('Óleo de Dendém',      890, 0.98,  0.5);

-- FAQ inicial
INSERT INTO faq (pergunta, resposta, categoria, ordem, activo)
VALUES
  ('Como me registo no portal?', 'Para se registar, clique em "Registar" na página inicial e preencha o formulário com os seus dados. Após o registo, a sua conta será validada pelo INCA em 24-48 horas.', 'Registo', 1, TRUE),
  ('O que é o NBI?', 'O NBI (Número de Beneficiário INCA) é o seu identificador único no sistema do INCA. É atribuído após a validação do seu registo.', 'Registo', 2, TRUE),
  ('Como solicito um certificado de origem?', 'Após fazer login, aceda à secção "Certificados" e preencha o formulário com as informações do lote a exportar. O INCA processará o seu pedido em 3-5 dias úteis.', 'Certificados', 3, TRUE),
  ('Quanto tempo demora a aprovação de um pedido de apoio?', 'Os pedidos de apoio são analisados pela equipa técnica do INCA. O tempo de resposta varia entre 7 a 15 dias úteis, dependendo da complexidade do pedido.', 'Apoios', 4, TRUE);

-- ════════════════════════════════════════════════════════════
--  NOTA: Criar contas de administrador via Supabase Auth
-- ════════════════════════════════════════════════════════════
-- 1. Ir ao Supabase Dashboard → Authentication → Users → Invite user
--    ou usar o script scripts/create_admin_users.js
-- 2. Após criar os utilizadores no Auth, inserir na tabela:
--
-- INSERT INTO administradores (auth_user_id, nome, email, nivel)
-- VALUES
--   ('<uuid-do-supabase-auth>', 'Administrador INCA', 'admin@inca.ao', 'super_admin'),
--   ('<uuid-do-supabase-auth>', 'Operador Demo', 'operador@inca.ao', 'operador');
-- ════════════════════════════════════════════════════════════
