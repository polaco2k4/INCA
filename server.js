require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const bcrypt       = require('bcryptjs');
const path         = require('path');
const { sql, poolPromise } = require('./db');
const adminRoutes  = require('./admin-routes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Rotas Administrativas ────────────────────────────────────
app.use('/api/admin', adminRoutes);

// ── Helper ───────────────────────────────────────────────────
function refCode(prefix) {
  return `${prefix}-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;
}

function generateResetToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { nbi, pin } = req.body;
  if (!nbi || !pin) return res.status(400).json({ error: 'NBI e PIN são obrigatórios.' });
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('nbi', sql.NVarChar, nbi.trim().toUpperCase())
      .query('SELECT id, nome, nbi, pin_hash, provincia, fileira FROM produtores WHERE nbi = @nbi AND activo = 1');

    if (result.recordset.length === 0)
      return res.status(401).json({ error: 'NBI não encontrado ou conta inactiva.' });

    const produtor = result.recordset[0];
    const ok = await bcrypt.compare(pin, produtor.pin_hash);
    if (!ok) return res.status(401).json({ error: 'PIN incorrecto.' });

    const stats = await pool.request()
      .input('pid', sql.Int, produtor.id)
      .query(`
        SELECT
          (SELECT COUNT(*) FROM parcelas      WHERE produtor_id = @pid) AS parcelas,
          (SELECT COUNT(*) FROM lotes         WHERE produtor_id = @pid) AS lotes,
          (SELECT COUNT(*) FROM certificados  WHERE produtor_id = @pid AND estado = 'pendente') AS certPend,
          (SELECT COUNT(*) FROM pedidos_apoio WHERE produtor_id = @pid AND estado = 'em_analise') AS pedAnali
      `);

    const s = stats.recordset[0];
    res.json({
      success: true,
      produtor: { id: produtor.id, nome: produtor.nome, nbi: produtor.nbi,
                  provincia: produtor.provincia, fileira: produtor.fileira },
      stats: { parcelas: s.parcelas, lotes: s.lotes, certPend: s.certPend, pedAnali: s.pedAnali },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/registar
app.post('/api/registar', async (req, res) => {
  const { nome, nbi, telefone, email, pin } = req.body;
  if (!nome || !nbi || !pin) return res.status(400).json({ error: 'Nome, NBI e PIN são obrigatórios.' });
  if (pin.length < 6) return res.status(400).json({ error: 'PIN deve ter mínimo 6 caracteres.' });
  try {
    const pool = await poolPromise;
    const exist = await pool.request()
      .input('nbi', sql.NVarChar, nbi.trim().toUpperCase())
      .query('SELECT id FROM produtores WHERE nbi = @nbi');
    if (exist.recordset.length > 0) return res.status(409).json({ error: 'Este NBI já está registado.' });

    const pin_hash = await bcrypt.hash(pin, 10);
    await pool.request()
      .input('nome',     sql.NVarChar, nome.trim())
      .input('nbi',      sql.NVarChar, nbi.trim().toUpperCase())
      .input('telefone', sql.NVarChar, telefone || null)
      .input('email',    sql.NVarChar, email    || null)
      .input('pin_hash', sql.NVarChar, pin_hash)
      .query('INSERT INTO produtores (nome, nbi, telefone, email, pin_hash) VALUES (@nome, @nbi, @telefone, @email, @pin_hash)');

    res.status(201).json({ success: true, message: 'Conta criada. Aguarda validação pelo INCA (24–48h).' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  RESET DE SENHA
// ════════════════════════════════════════════════════════════

// POST /api/reset-solicitar - Solicitar reset de senha
app.post('/api/reset-solicitar', async (req, res) => {
  const { nbi, email } = req.body;
  if (!nbi || !email) return res.status(400).json({ error: 'NBI e email são obrigatórios.' });

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('nbi', sql.NVarChar, nbi.trim().toUpperCase())
      .input('email', sql.NVarChar, email.trim().toLowerCase())
      .query('SELECT id, nome, email FROM produtores WHERE nbi = @nbi AND email = @email AND activo = 1');

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'NBI ou email não encontrados.' });

    const produtor = result.recordset[0];
    
    // Gerar token de reset (válido por 24 horas)
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Guardar token na base de dados (usando tabela temporária ou campo existente)
    await pool.request()
      .input('produtor_id', sql.Int, produtor.id)
      .input('reset_token', sql.NVarChar, resetToken)
      .input('reset_expires', sql.DateTime2, expiresAt)
      .query(`
        UPDATE produtores 
        SET reset_token = @reset_token, reset_expires = @reset_expires 
        WHERE id = @produtor_id
      `);

    // Em produção, enviar email aqui
    // Por agora, retornamos o token para demonstração
    res.json({ 
      success: true, 
      message: 'Instruções de reset enviadas para o email.',
      // Apenas para demo - remover em produção
      demoToken: resetToken,
      demoLink: `http://localhost:3001/reset-confirmar.html?token=${resetToken}&nbi=${nbi}`
    });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// POST /api-reset-confirmar - Confirmar reset de senha
app.post('/api/reset-confirmar', async (req, res) => {
  const { token, nbi, novoPin } = req.body;
  if (!token || !nbi || !novoPin) 
    return res.status(400).json({ error: 'Token, NBI e novo PIN são obrigatórios.' });

  if (novoPin.length < 6) 
    return res.status(400).json({ error: 'O novo PIN deve ter pelo menos 6 caracteres.' });

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('nbi', sql.NVarChar, nbi.trim().toUpperCase())
      .input('token', sql.NVarChar, token)
      .query(`
        SELECT id, reset_token, reset_expires 
        FROM produtores 
        WHERE nbi = @nbi AND reset_token = @token AND activo = 1
      `);

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Token inválido ou expirado.' });

    const produtor = result.recordset[0];
    
    // Verificar se token não expirou
    if (new Date() > new Date(produtor.reset_expires)) {
      await pool.request()
        .input('nbi', sql.NVarChar, nbi.trim().toUpperCase())
        .query('UPDATE produtores SET reset_token = NULL, reset_expires = NULL WHERE nbi = @nbi');
      
      return res.status(400).json({ error: 'Token expirado. Solicite um novo reset.' });
    }

    // Hash do novo PIN
    const pin_hash = await bcrypt.hash(novoPin, 10);

    // Actualizar senha e limpar token
    await pool.request()
      .input('produtor_id', sql.Int, produtor.id)
      .input('pin_hash', sql.NVarChar, pin_hash)
      .query(`
        UPDATE produtores 
        SET pin_hash = @pin_hash, reset_token = NULL, reset_expires = NULL, actualizado_em = GETDATE()
        WHERE id = @produtor_id
      `);

    res.json({ 
      success: true, 
      message: 'PIN actualizado com sucesso! Pode fazer login com o novo PIN.' 
    });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// GET /api-reset-verificar - Verificar se token é válido
app.get('/api/reset-verificar', async (req, res) => {
  const { token, nbi } = req.query;
  if (!token || !nbi) 
    return res.status(400).json({ error: 'Token e NBI são obrigatórios.' });

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('nbi', sql.NVarChar, nbi.trim().toUpperCase())
      .input('token', sql.NVarChar, token)
      .query(`
        SELECT reset_expires 
        FROM produtores 
        WHERE nbi = @nbi AND reset_token = @token AND activo = 1
      `);

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Token inválido.' });

    const { reset_expires } = result.recordset[0];
    
    // Verificar se token não expirou
    if (new Date() > new Date(reset_expires)) {
      return res.status(400).json({ error: 'Token expirado.' });
    }

    res.json({ 
      success: true, 
      message: 'Token válido.' 
    });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// ════════════════════════════════════════════════════════════
//  CADASTRO
// ════════════════════════════════════════════════════════════

app.post('/api/produtores', async (req, res) => {
  const { produtor_id, nome, nbi, telefone, email, provincia,
          municipio, fileira, area_ha, tipo_produtor, latitude, longitude } = req.body;
  if (!nbi || !nome || !provincia || !fileira || !area_ha)
    return res.status(400).json({ error: 'Campos obrigatórios em falta.' });
  try {
    const pool = await poolPromise;
    const exist = await pool.request()
      .input('nbi', sql.NVarChar, nbi.trim().toUpperCase())
      .query('SELECT id FROM produtores WHERE nbi = @nbi');

    if (exist.recordset.length > 0) {
      await pool.request()
        .input('nome',          sql.NVarChar,  nome)
        .input('telefone',      sql.NVarChar,  telefone   || null)
        .input('email',         sql.NVarChar,  email      || null)
        .input('provincia',     sql.NVarChar,  provincia)
        .input('municipio',     sql.NVarChar,  municipio  || null)
        .input('fileira',       sql.NVarChar,  fileira)
        .input('area_ha',       sql.Decimal,   parseFloat(area_ha))
        .input('tipo_produtor', sql.NVarChar,  tipo_produtor || 'Individual / Familiar')
        .input('nbi',           sql.NVarChar,  nbi.trim().toUpperCase())
        .query(`UPDATE produtores SET nome=@nome, telefone=@telefone, email=@email,
                provincia=@provincia, municipio=@municipio, fileira=@fileira,
                area_ha=@area_ha, tipo_produtor=@tipo_produtor WHERE nbi=@nbi`);
    } else {
      await pool.request()
        .input('nome',          sql.NVarChar,  nome)
        .input('nbi',           sql.NVarChar,  nbi.trim().toUpperCase())
        .input('telefone',      sql.NVarChar,  telefone   || null)
        .input('email',         sql.NVarChar,  email      || null)
        .input('provincia',     sql.NVarChar,  provincia)
        .input('municipio',     sql.NVarChar,  municipio  || null)
        .input('fileira',       sql.NVarChar,  fileira)
        .input('area_ha',       sql.Decimal,   parseFloat(area_ha))
        .input('tipo_produtor', sql.NVarChar,  tipo_produtor || 'Individual / Familiar')
        .query(`INSERT INTO produtores (nome, nbi, telefone, email, provincia, municipio, fileira, area_ha, tipo_produtor)
                VALUES (@nome, @nbi, @telefone, @email, @provincia, @municipio, @fileira, @area_ha, @tipo_produtor)`);
    }

    if (latitude && longitude) {
      const pid = exist.recordset.length > 0 ? exist.recordset[0].id : produtor_id;
      if (pid) {
        await pool.request()
          .input('pid',       sql.Int,     pid)
          .input('fileira',   sql.NVarChar, fileira)
          .input('area_ha',   sql.Decimal,  parseFloat(area_ha))
          .input('latitude',  sql.Decimal,  parseFloat(latitude))
          .input('longitude', sql.Decimal,  parseFloat(longitude))
          .query('INSERT INTO parcelas (produtor_id, fileira, area_ha, latitude, longitude) VALUES (@pid, @fileira, @area_ha, @latitude, @longitude)');
      }
    }

    res.status(201).json({ success: true, referencia: refCode('INCA-CAD') });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  CERTIFICADOS
// ════════════════════════════════════════════════════════════

app.post('/api/certificados', async (req, res) => {
  const { produtor_id, produto, quantidade, lote, destino, data_exportacao } = req.body;
  if (!produto || !quantidade || !destino || !data_exportacao)
    return res.status(400).json({ error: 'Campos obrigatórios em falta.' });
  try {
    const pool = await poolPromise;
    const referencia = refCode('CERT');
    await pool.request()
      .input('produtor_id',    sql.Int,      produtor_id    || null)
      .input('produto',        sql.NVarChar, produto)
      .input('quantidade_kg',  sql.Decimal,  parseFloat(quantidade))
      .input('numero_lote',    sql.NVarChar, lote           || null)
      .input('pais_destino',   sql.NVarChar, destino)
      .input('data_exportacao',sql.Date,     new Date(data_exportacao))
      .input('referencia',     sql.NVarChar, referencia)
      .query(`INSERT INTO certificados (produtor_id, produto, quantidade_kg, numero_lote, pais_destino, data_exportacao, referencia)
              VALUES (@produtor_id, @produto, @quantidade_kg, @numero_lote, @pais_destino, @data_exportacao, @referencia)`);
    res.status(201).json({ success: true, referencia });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  RASTREABILIDADE
// ════════════════════════════════════════════════════════════

app.get('/api/rastreio/:codigo', async (req, res) => {
  const codigo = req.params.codigo.trim().toUpperCase();
  try {
    const pool = await poolPromise;
    const loteRes = await pool.request()
      .input('codigo', sql.NVarChar, codigo)
      .query('SELECT * FROM lotes WHERE codigo = @codigo');
    if (loteRes.recordset.length === 0)
      return res.status(404).json({ error: 'Lote não encontrado.' });

    const lote = loteRes.recordset[0];
    const eventosRes = await pool.request()
      .input('lote_id', sql.Int, lote.id)
      .query('SELECT * FROM lote_eventos WHERE lote_id = @lote_id ORDER BY data_evento ASC');

    res.json({ lote, eventos: eventosRes.recordset });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  PEDIDOS DE APOIO
// ════════════════════════════════════════════════════════════

app.post('/api/apoios', async (req, res) => {
  const { produtor_id, tipo, fileira, valor_estimado, descricao } = req.body;
  if (!tipo || !fileira || !descricao)
    return res.status(400).json({ error: 'Campos obrigatórios em falta.' });
  try {
    const pool = await poolPromise;
    const referencia = refCode('APOIO');
    await pool.request()
      .input('produtor_id',    sql.Int,      produtor_id     || null)
      .input('tipo',           sql.NVarChar, tipo)
      .input('fileira',        sql.NVarChar, fileira)
      .input('valor_estimado', sql.Decimal,  valor_estimado ? parseFloat(valor_estimado) : null)
      .input('descricao',      sql.NVarChar, descricao)
      .input('referencia',     sql.NVarChar, referencia)
      .query(`INSERT INTO pedidos_apoio (produtor_id, tipo, fileira, valor_estimado, descricao, referencia)
              VALUES (@produtor_id, @tipo, @fileira, @valor_estimado, @descricao, @referencia)`);
    res.status(201).json({ success: true, referencia });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  ESTATÍSTICAS
// ════════════════════════════════════════════════════════════

app.get('/api/estatisticas', async (req, res) => {
  const tipo = req.query.tipo || 'producao';
  try {
    const pool = await poolPromise;
    if (tipo === 'producao') {
      const fileiras = await pool.request()
        .query('SELECT fileira, SUM(quantidade_kg) AS total_kg FROM lotes GROUP BY fileira ORDER BY total_kg DESC');
      const provincias = await pool.request()
        .query(`SELECT p.provincia, SUM(l.quantidade_kg) AS total_kg
                FROM lotes l JOIN produtores p ON l.produtor_id = p.id
                WHERE l.fileira = 'Café'
                GROUP BY p.provincia ORDER BY total_kg DESC`);
      return res.json({ fileiras: fileiras.recordset, provincias: provincias.recordset });
    }
    if (tipo === 'exportacao') {
      const destinos = await pool.request()
        .query(`SELECT pais_destino, SUM(quantidade_kg) AS total_kg
                FROM certificados WHERE estado = 'emitido'
                GROUP BY pais_destino ORDER BY total_kg DESC`);
      const porFileira = await pool.request()
        .query(`SELECT produto, SUM(quantidade_kg) AS total_kg
                FROM certificados WHERE estado = 'emitido'
                GROUP BY produto ORDER BY total_kg DESC`);
      return res.json({ destinos: destinos.recordset, porFileira: porFileira.recordset });
    }
    if (tipo === 'precos') {
      const rows = await pool.request()
        .query('SELECT * FROM precos_mercado ORDER BY atualizado_em DESC');
      return res.json(rows.recordset);
    }
    res.status(400).json({ error: 'Tipo inválido.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  CONTEÚDO PÚBLICO
// ════════════════════════════════════════════════════════════

app.get('/api/artigos', async (req, res) => {
  const { categoria, destaque, limit = 10, offset = 0 } = req.query;
  try {
    const pool = await poolPromise;
    let query = `SELECT a.id, a.titulo, a.slug, a.resumo, a.imagem_destaque, a.tags, 
                        a.publicado_em, a.visualizacoes, c.nome as categoria_nome, c.slug as categoria_slug
                 FROM artigos a
                 LEFT JOIN categorias_conteudo c ON a.categoria_id = c.id
                 WHERE a.estado = 'publicado'`;
    const request = pool.request();

    if (categoria) {
      query += ' AND c.slug = @categoria';
      request.input('categoria', sql.NVarChar, categoria);
    }
    if (destaque !== undefined) {
      query += ' AND a.destaque = @destaque';
      request.input('destaque', sql.Bit, destaque === 'true' || destaque === '1' ? 1 : 0);
    }

    query += ' ORDER BY a.publicado_em DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    request.input('offset', sql.Int, parseInt(offset));
    request.input('limit', sql.Int, parseInt(limit));

    const result = await request.query(query);
    res.json({ artigos: result.recordset });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/artigos/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('slug', sql.NVarChar, slug)
      .query(`SELECT a.*, c.nome as categoria_nome, c.slug as categoria_slug
              FROM artigos a
              LEFT JOIN categorias_conteudo c ON a.categoria_id = c.id
              WHERE a.slug = @slug AND a.estado = 'publicado'`);

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Artigo não encontrado.' });

    await pool.request()
      .input('slug', sql.NVarChar, slug)
      .query('UPDATE artigos SET visualizacoes = visualizacoes + 1 WHERE slug = @slug');

    res.json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/anuncios/activos', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`SELECT id, titulo, mensagem, tipo, link_url, link_texto, data_inicio, data_fim
              FROM anuncios
              WHERE activo = 1 
                AND data_inicio <= GETDATE()
                AND (data_fim IS NULL OR data_fim >= GETDATE())
              ORDER BY 
                CASE tipo 
                  WHEN 'urgente' THEN 1
                  WHEN 'aviso' THEN 2
                  WHEN 'sucesso' THEN 3
                  ELSE 4
                END,
                data_inicio DESC`);

    res.json({ anuncios: result.recordset });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/faq', async (req, res) => {
  const { categoria } = req.query;
  try {
    const pool = await poolPromise;
    let query = 'SELECT id, pergunta, resposta, categoria FROM faq WHERE activo = 1';
    const request = pool.request();

    if (categoria) {
      query += ' AND categoria = @categoria';
      request.input('categoria', sql.NVarChar, categoria);
    }

    query += ' ORDER BY ordem ASC, criado_em DESC';

    const result = await request.query(query);
    res.json({ faq: result.recordset });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE PRODUTORES
// ════════════════════════════════════════════════════════════

// GET /api/produtores/id/:id - Dados do produtor por ID (mais fiável que por NBI)
app.get('/api/produtores/id/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT id, nome, nbi, telefone, email, provincia, municipio, fileira, area_ha, tipo_produtor, activo, criado_em FROM produtores WHERE id = @id');

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Produtor não encontrado.' });

    res.json({ produtor: result.recordset[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/produtores/:nbi - Dados do produtor
app.get('/api/produtores/:nbi', async (req, res) => {
  const { nbi } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('nbi', sql.NVarChar, nbi.trim().toUpperCase())
      .query('SELECT id, nome, nbi, telefone, email, provincia, municipio, fileira, area_ha, tipo_produtor, activo, criado_em FROM produtores WHERE nbi = @nbi');

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Produtor não encontrado.' });

    res.json({ produtor: result.recordset[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/produtores/:id - Atualizar produtor
app.put('/api/produtores/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, telefone, email, provincia, municipio, fileira, area_ha, tipo_produtor } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('nome', sql.NVarChar, nome)
      .input('telefone', sql.NVarChar, telefone || null)
      .input('email', sql.NVarChar, email || null)
      .input('provincia', sql.NVarChar, provincia)
      .input('municipio', sql.NVarChar, municipio || null)
      .input('fileira', sql.NVarChar, fileira)
      .input('area_ha', sql.Decimal, parseFloat(area_ha))
      .input('tipo_produtor', sql.NVarChar, tipo_produtor || 'Individual / Familiar')
      .query(`UPDATE produtores SET nome=@nome, telefone=@telefone, email=@email,
              provincia=@provincia, municipio=@municipio, fileira=@fileira,
              area_ha=@area_ha, tipo_produtor=@tipo_produtor, actualizado_em=GETDATE()
              WHERE id=@id`);

    res.json({ success: true, message: 'Produtor atualizado com sucesso.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/produtores/:id/parcelas - Parcelas do produtor
app.get('/api/produtores/:id/parcelas', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT id, fileira, area_ha, latitude, longitude, criado_em FROM parcelas WHERE produtor_id = @id ORDER BY criado_em DESC');

    res.json({ parcelas: result.recordset });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/produtores/:id/parcelas - Adicionar parcela
app.post('/api/produtores/:id/parcelas', async (req, res) => {
  const { id } = req.params;
  const { fileira, area_ha, latitude, longitude } = req.body;
  if (!fileira) return res.status(400).json({ error: 'Fileira é obrigatória.' });
  const toDecimal = v => (v != null && !isNaN(parseFloat(v))) ? parseFloat(v) : null;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('produtor_id', sql.Int, parseInt(id))
      .input('fileira', sql.NVarChar, fileira)
      .input('area_ha', sql.Decimal, toDecimal(area_ha))
      .input('latitude', sql.Decimal, toDecimal(latitude))
      .input('longitude', sql.Decimal, toDecimal(longitude))
      .query('INSERT INTO parcelas (produtor_id, fileira, area_ha, latitude, longitude) VALUES (@produtor_id, @fileira, @area_ha, @latitude, @longitude)');

    res.status(201).json({ success: true, message: 'Parcela registada com sucesso.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/produtores/:id/parcelas/:parcelaId - Remover parcela
app.delete('/api/produtores/:id/parcelas/:parcelaId', async (req, res) => {
  const { id, parcelaId } = req.params;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('parcelaId', sql.Int, parseInt(parcelaId))
      .query('DELETE FROM parcelas WHERE produtor_id = @id AND id = @parcelaId');

    res.json({ success: true, message: 'Parcela removida com sucesso.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/produtores/:id/parcelas/:parcelaId - Atualizar parcela
app.put('/api/produtores/:id/parcelas/:parcelaId', async (req, res) => {
  const { id, parcelaId } = req.params;
  const { fileira, area_ha, latitude, longitude } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('parcelaId', sql.Int, parseInt(parcelaId))
      .input('fileira', sql.NVarChar, fileira)
      .input('area_ha', sql.Decimal, parseFloat(area_ha))
      .input('latitude', sql.Decimal, parseFloat(latitude) || null)
      .input('longitude', sql.Decimal, parseFloat(longitude) || null)
      .query(`UPDATE parcelas SET fileira=@fileira, area_ha=@area_ha, 
              latitude=@latitude, longitude=@longitude 
              WHERE produtor_id=@id AND id=@parcelaId`);

    res.json({ success: true, message: 'Parcela actualizada com sucesso.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  CERTIFICADOS
// ════════════════════════════════════════════════════════════

// GET /api/certificados - Listar certificados (com filtros)
app.get('/api/certificados', async (req, res) => {
  const { produtor_id, estado, referencia } = req.query;
  try {
    const pool = await poolPromise;
    let query = 'SELECT c.*, p.nome as produtor_nome FROM certificados c LEFT JOIN produtores p ON c.produtor_id = p.id WHERE 1=1';
    const request = pool.request();

    if (produtor_id) {
      query += ' AND c.produtor_id = @produtor_id';
      request.input('produtor_id', sql.Int, parseInt(produtor_id));
    }
    if (estado) {
      query += ' AND c.estado = @estado';
      request.input('estado', sql.NVarChar, estado);
    }
    if (referencia) {
      query += ' AND c.referencia = @referencia';
      request.input('referencia', sql.NVarChar, referencia);
    }

    query += ' ORDER BY c.criado_em DESC';

    const result = await request.query(query);
    res.json({ certificados: result.recordset });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/certificados/:referencia - Detalhes do certificado
app.get('/api/certificados/:referencia', async (req, res) => {
  const { referencia } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('referencia', sql.NVarChar, referencia)
      .query(`SELECT c.*, p.nome as produtor_nome, p.nbi as produtor_nbi
              FROM certificados c
              LEFT JOIN produtores p ON c.produtor_id = p.id
              WHERE c.referencia = @referencia`);

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Certificado não encontrado.' });

    res.json({ certificado: result.recordset[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/certificados/:id - Atualizar estado do certificado
app.put('/api/certificados/:id', async (req, res) => {
  const { id } = req.params;
  const { estado, observacoes } = req.body;
  if (!estado || !['pendente', 'emitido', 'rejeitado'].includes(estado))
    return res.status(400).json({ error: 'Estado inválido.' });

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('estado', sql.NVarChar, estado)
      .input('observacoes', sql.NVarChar, observacoes || null)
      .query('UPDATE certificados SET estado=@estado, observacoes=@observacoes WHERE id=@id');

    res.json({ success: true, message: 'Certificado atualizado com sucesso.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  PEDIDOS DE APOIO
// ════════════════════════════════════════════════════════════

// GET /api/apoios - Listar pedidos (com filtros)
app.get('/api/apoios', async (req, res) => {
  const { produtor_id, estado, tipo, fileira } = req.query;
  try {
    const pool = await poolPromise;
    let query = 'SELECT a.*, p.nome as produtor_nome FROM pedidos_apoio a LEFT JOIN produtores p ON a.produtor_id = p.id WHERE 1=1';
    const request = pool.request();

    if (produtor_id) {
      query += ' AND a.produtor_id = @produtor_id';
      request.input('produtor_id', sql.Int, parseInt(produtor_id));
    }
    if (estado) {
      query += ' AND a.estado = @estado';
      request.input('estado', sql.NVarChar, estado);
    }
    if (tipo) {
      query += ' AND a.tipo = @tipo';
      request.input('tipo', sql.NVarChar, tipo);
    }
    if (fileira) {
      query += ' AND a.fileira = @fileira';
      request.input('fileira', sql.NVarChar, fileira);
    }

    query += ' ORDER BY a.criado_em DESC';

    const result = await request.query(query);
    res.json({ apoios: result.recordset });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/apoios/:referencia - Detalhes do pedido
app.get('/api/apoios/:referencia', async (req, res) => {
  const { referencia } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('referencia', sql.NVarChar, referencia)
      .query(`SELECT a.*, p.nome as produtor_nome, p.nbi as produtor_nbi
              FROM pedidos_apoio a
              LEFT JOIN produtores p ON a.produtor_id = p.id
              WHERE a.referencia = @referencia`);

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Pedido não encontrado.' });

    res.json({ apoio: result.recordset[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/apoios/:id - Atualizar estado do pedido
app.put('/api/apoios/:id', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  if (!estado || !['em_analise', 'aprovado', 'rejeitado'].includes(estado))
    return res.status(400).json({ error: 'Estado inválido.' });

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('estado', sql.NVarChar, estado)
      .query('UPDATE pedidos_apoio SET estado=@estado WHERE id=@id');

    res.json({ success: true, message: 'Pedido atualizado com sucesso.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  LOTES / RASTREABILIDADE
// ════════════════════════════════════════════════════════════

// POST /api/lotes - Criar novo lote
app.post('/api/lotes', async (req, res) => {
  const { produtor_id, fileira, produto, quantidade_kg, provincia, municipio, estado } = req.body;
  if (!fileira || !produto || !quantidade_kg || !provincia)
    return res.status(400).json({ error: 'Campos obrigatórios em falta.' });

  try {
    const pool = await poolPromise;
    const codigo = refCode('LOTE');

    await pool.request()
      .input('codigo', sql.NVarChar, codigo)
      .input('produtor_id', sql.Int, produtor_id || null)
      .input('fileira', sql.NVarChar, fileira)
      .input('produto', sql.NVarChar, produto)
      .input('quantidade_kg', sql.Decimal, parseFloat(quantidade_kg))
      .input('provincia', sql.NVarChar, provincia)
      .input('municipio', sql.NVarChar, municipio || null)
      .input('estado', sql.NVarChar, estado || 'colhido')
      .query(`INSERT INTO lotes (codigo, produtor_id, fileira, produto, quantidade_kg, provincia, municipio, estado)
              VALUES (@codigo, @produtor_id, @fileira, @produto, @quantidade_kg, @provincia, @municipio, @estado)`);

    // Registar evento inicial
    const lote = await pool.request()
      .input('codigo', sql.NVarChar, codigo)
      .query('SELECT id FROM lotes WHERE codigo = @codigo');

    if (lote.recordset.length > 0) {
      await pool.request()
        .input('lote_id', sql.Int, lote.recordset[0].id)
        .input('titulo', sql.NVarChar, '🌱 Lote Registado')
        .input('descricao', sql.NVarChar, `Lote ${codigo} criado no sistema INCA`)
        .query('INSERT INTO lote_eventos (lote_id, titulo, descricao) VALUES (@lote_id, @titulo, @descricao)');
    }

    res.status(201).json({ success: true, codigo, message: 'Lote registado com sucesso.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/lotes - Listar lotes (com filtros)
app.get('/api/lotes', async (req, res) => {
  const { produtor_id, fileira, estado, produto } = req.query;
  try {
    const pool = await poolPromise;
    let query = 'SELECT l.*, p.nome as produtor_nome FROM lotes l LEFT JOIN produtores p ON l.produtor_id = p.id WHERE 1=1';
    const request = pool.request();

    if (produtor_id) {
      query += ' AND l.produtor_id = @produtor_id';
      request.input('produtor_id', sql.Int, parseInt(produtor_id));
    }
    if (fileira) {
      query += ' AND l.fileira = @fileira';
      request.input('fileira', sql.NVarChar, fileira);
    }
    if (estado) {
      query += ' AND l.estado = @estado';
      request.input('estado', sql.NVarChar, estado);
    }
    if (produto) {
      query += ' AND l.produto = @produto';
      request.input('produto', sql.NVarChar, produto);
    }

    query += ' ORDER BY l.criado_em DESC';

    const result = await request.query(query);
    res.json({ lotes: result.recordset });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/lotes/:id - Atualizar lote
app.put('/api/lotes/:id', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  if (!estado || !['colhido', 'em_processamento', 'pronto', 'exportado'].includes(estado))
    return res.status(400).json({ error: 'Estado inválido.' });

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('estado', sql.NVarChar, estado)
      .query('UPDATE lotes SET estado=@estado WHERE id=@id');

    // Registar evento
    const tituloMap = {
      'colhido': '☀️ Colheita',
      'em_processamento': '⚙️ Processamento',
      'pronto': '✅ Pronto para Exportação',
      'exportado': '🚢 Exportado'
    };

    await pool.request()
      .input('lote_id', sql.Int, parseInt(id))
      .input('titulo', sql.NVarChar, tituloMap[estado])
      .input('descricao', sql.NVarChar, `Estado atualizado para: ${estado}`)
      .query('INSERT INTO lote_eventos (lote_id, titulo, descricao) VALUES (@lote_id, @titulo, @descricao)');

    res.json({ success: true, message: 'Lote atualizado com sucesso.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/lote_eventos - Adicionar evento a um lote
app.post('/api/lote_eventos', async (req, res) => {
  const { lote_id, titulo, descricao, tipo } = req.body;
  if (!lote_id || !titulo)
    return res.status(400).json({ error: 'lote_id e titulo são obrigatórios.' });

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('lote_id', sql.Int, parseInt(lote_id))
      .input('titulo', sql.NVarChar, titulo)
      .input('descricao', sql.NVarChar, descricao || null)
      .input('tipo', sql.NVarChar, tipo || 'normal')
      .query('INSERT INTO lote_eventos (lote_id, titulo, descricao, tipo) VALUES (@lote_id, @titulo, @descricao, @tipo)');

    res.status(201).json({ success: true, message: 'Evento registado com sucesso.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  PREÇOS DE MERCADO
// ════════════════════════════════════════════════════════════

// GET /api/precos - Listar preços
app.get('/api/precos', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query('SELECT * FROM precos_mercado ORDER BY atualizado_em DESC');

    res.json({ precos: result.recordset });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/precos - Adicionar preço (admin)
app.post('/api/precos', async (req, res) => {
  const { produto, preco_aoa_kg, preco_usd_kg, variacao_pct } = req.body;
  if (!produto || !preco_aoa_kg)
    return res.status(400).json({ error: 'Produto e preço AOA são obrigatórios.' });

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('produto', sql.NVarChar, produto)
      .input('preco_aoa_kg', sql.Decimal, parseFloat(preco_aoa_kg))
      .input('preco_usd_kg', sql.Decimal, preco_usd_kg ? parseFloat(preco_usd_kg) : null)
      .input('variacao_pct', sql.Decimal, variacao_pct ? parseFloat(variacao_pct) : null)
      .query('INSERT INTO precos_mercado (produto, preco_aoa_kg, preco_usd_kg, variacao_pct) VALUES (@produto, @preco_aoa_kg, @preco_usd_kg, @variacao_pct)');

    res.status(201).json({ success: true, message: 'Preço registado com sucesso.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  PROJECTOS
// ════════════════════════════════════════════════════════════

// GET /api/projectos - Listar todos os projectos
app.get('/api/projectos', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`
        SELECT 
          id, nome, nome_en, descricao, descricao_en, fileira, 
          investimento_usd, hectares, produtores_capacitar, capacidade_anual_t,
          ano_inicio, ano_conclusao, status, coordenador, telefone_coordenador,
          email_coordenador, provincias, tecnologias, mercados_exportacao,
          logo_emoji, cor_tema, criado_em, actualizado_em
        FROM projectos 
        ORDER BY criado_em DESC
      `);
    
    res.json({ projectos: result.recordset });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// GET /api/projectos/:id - Obter detalhes de um projecto
app.get('/api/projectos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await poolPromise;
    
    // Dados principais do projecto
    const projectResult = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        SELECT 
          id, nome, nome_en, descricao, descricao_en, fileira, 
          investimento_usd, hectares, produtores_capacitar, capacidade_anual_t,
          ano_inicio, ano_conclusao, status, coordenador, telefone_coordenador,
          email_coordenador, provincias, tecnologias, mercados_exportacao,
          logo_emoji, cor_tema, criado_em, actualizado_em
        FROM projectos 
        WHERE id = @id
      `);
    
    if (projectResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Projecto não encontrado.' });
    }
    
    const project = projectResult.recordset[0];
    
    // Fases do projecto
    const phasesResult = await pool.request()
      .input('projeto_id', sql.Int, parseInt(id))
      .query(`
        SELECT id, nome_fase, nome_fase_en, descricao, descricao_en, 
               data_inicio, data_fim, progresso_pct, status
        FROM projeto_fases 
        WHERE projeto_id = @projeto_id 
        ORDER BY data_inicio ASC
      `);
    
    // Investimentos do projecto
    const investmentsResult = await pool.request()
      .input('projeto_id', sql.Int, parseInt(id))
      .query(`
        SELECT categoria, categoria_en, valor_usd, fornecedor, 
               descricao, data_investimento
        FROM projeto_investimentos 
        WHERE projeto_id = @projeto_id 
        ORDER BY data_investimento DESC
      `);
    
    // Actualizações do projecto
    const updatesResult = await pool.request()
      .input('projeto_id', sql.Int, parseInt(id))
      .query(`
        SELECT titulo, titulo_en, descricao, descricao_en, 
               tipo_actualizacao, data_publicacao, autor
        FROM projeto_actualizacoes 
        WHERE projeto_id = @projeto_id 
        ORDER BY data_publicacao DESC
      `);
    
    res.json({
      project,
      phases: phasesResult.recordset,
      investments: investmentsResult.recordset,
      updates: updatesResult.recordset
    });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// GET /api/projectos/estatisticas - Estatísticas dos projectos
app.get('/api/projectos/estatisticas', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`
        SELECT 
          COUNT(*) as total_projectos,
          SUM(investimento_usd) as investimento_total,
          SUM(hectares) as hectares_total,
          SUM(produtores_capacitar) as produtores_total,
          SUM(capacidade_anual_t) as capacidade_total,
          COUNT(CASE WHEN status = 'em_execucao' THEN 1 END) as projectos_em_execucao,
          COUNT(CASE WHEN status = 'concluido' THEN 1 END) as projectos_concluidos,
          COUNT(CASE WHEN status = 'em_planeamento' THEN 1 END) as projectos_em_planeamento
        FROM projectos
      `);
    
    // Projectos por fileira
    const byFileiraResult = await pool.request()
      .query(`
        SELECT fileira, COUNT(*) as count, SUM(investimento_usd) as investimento
        FROM projectos 
        GROUP BY fileira 
        ORDER BY count DESC
      `);
    
    res.json({
      ...result.recordset[0],
      por_fileira: byFileiraResult.recordset
    });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// ── Serve static files ───────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname)));

// ── Catch-all → devolve o HTML ────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'instituto_cafe_angola.html'));
});

// ── Arranque ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  Servidor INCA em http://localhost:${PORT}`);
});
