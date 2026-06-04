const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sql, poolPromise } = require('./db');

// ── Upload de Fotos ──────────────────────────────────────────
const uploadStorage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(__dirname, 'uploads', 'projectos', String(req.params.id));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `foto_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const uploadFotos = multer({
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Apenas imagens são permitidas (JPEG, PNG, WebP, GIF).'));
  }
});

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// ── Middleware de Autenticação ───────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

// ── Middleware de Nível de Acesso ────────────────────────────
function requireLevel(...levels) {
  return (req, res, next) => {
    if (!levels.includes(req.admin.nivel)) {
      return res.status(403).json({ error: 'Permissão insuficiente.' });
    }
    next();
  };
}

// ── Helper: Registar Log ─────────────────────────────────────
async function logAction(admin_id, acao, entidade, entidade_id, detalhes, ip) {
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('admin_id', sql.Int, admin_id)
      .input('acao', sql.NVarChar, acao)
      .input('entidade', sql.NVarChar, entidade)
      .input('entidade_id', sql.Int, entidade_id || null)
      .input('detalhes', sql.NVarChar, detalhes || null)
      .input('ip_address', sql.NVarChar, ip || null)
      .query(`INSERT INTO admin_logs (admin_id, acao, entidade, entidade_id, detalhes, ip_address)
              VALUES (@admin_id, @acao, @entidade, @entidade_id, @detalhes, @ip_address)`);
  } catch (err) {
    console.error('Erro ao registar log:', err.message);
  }
}

// ════════════════════════════════════════════════════════════
//  AUTENTICAÇÃO
// ════════════════════════════════════════════════════════════

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e password são obrigatórios.' });

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('email', sql.NVarChar, email.trim().toLowerCase())
      .query('SELECT id, nome, email, password_hash, nivel, activo FROM administradores WHERE email = @email');

    if (result.recordset.length === 0)
      return res.status(401).json({ error: 'Email não encontrado.' });

    const admin = result.recordset[0];
    if (!admin.activo)
      return res.status(401).json({ error: 'Conta desactivada.' });

    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.status(401).json({ error: 'Password incorrecta.' });

    // Atualizar último acesso
    await pool.request()
      .input('id', sql.Int, admin.id)
      .query('UPDATE administradores SET ultimo_acesso = GETDATE() WHERE id = @id');

    // Gerar token JWT
    const token = jwt.sign(
      { id: admin.id, email: admin.email, nivel: admin.nivel },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await logAction(admin.id, 'LOGIN', 'administrador', admin.id, null, req.ip);

    res.json({
      success: true,
      token,
      admin: { id: admin.id, nome: admin.nome, email: admin.email, nivel: admin.nivel }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, req.admin.id)
      .query('SELECT id, nome, email, nivel, criado_em, ultimo_acesso FROM administradores WHERE id = @id');

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Administrador não encontrado.' });

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE PRODUTORES
// ════════════════════════════════════════════════════════════

// GET /api/admin/produtores/pendentes
router.get('/produtores/pendentes', authMiddleware, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`SELECT id, nome, nbi, telefone, email, provincia, municipio, fileira, 
                     area_ha, tipo_produtor, criado_em
              FROM produtores 
              WHERE activo = 0 
              ORDER BY criado_em DESC`);

    res.json({ produtores: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/produtores
router.get('/produtores', authMiddleware, async (req, res) => {
  const { activo, fileira, provincia, limit = 100, offset = 0 } = req.query;
  
  try {
    const pool = await poolPromise;
    let query = 'SELECT id, nome, nbi, telefone, email, provincia, municipio, fileira, area_ha, tipo_produtor, activo, criado_em FROM produtores WHERE 1=1';
    const request = pool.request();

    if (activo !== undefined) {
      query += ' AND activo = @activo';
      request.input('activo', sql.Bit, activo === 'true' || activo === '1' ? 1 : 0);
    }
    if (fileira) {
      query += ' AND fileira = @fileira';
      request.input('fileira', sql.NVarChar, fileira);
    }
    if (provincia) {
      query += ' AND provincia = @provincia';
      request.input('provincia', sql.NVarChar, provincia);
    }

    query += ' ORDER BY criado_em DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    request.input('offset', sql.Int, parseInt(offset));
    request.input('limit', sql.Int, parseInt(limit));

    const result = await request.query(query);
    res.json({ produtores: result.recordset, total: result.recordset.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/produtores/:id/aprovar
router.put('/produtores/:id/aprovar', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('UPDATE produtores SET activo = 1, actualizado_em = GETDATE() WHERE id = @id; SELECT * FROM produtores WHERE id = @id');

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Produtor não encontrado.' });

    const produtor = result.recordset[0];
    await logAction(req.admin.id, 'APROVAR', 'produtor', parseInt(id), `Produtor ${produtor.nome} (${produtor.nbi}) aprovado`, req.ip);

    res.json({ success: true, message: 'Produtor aprovado com sucesso.', produtor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/produtores/:id/rejeitar
router.put('/produtores/:id/rejeitar', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM produtores WHERE id = @id AND activo = 0; SELECT @@ROWCOUNT as deleted');

    if (result.recordset[0].deleted === 0)
      return res.status(404).json({ error: 'Produtor não encontrado ou já activo.' });

    await logAction(req.admin.id, 'REJEITAR', 'produtor', parseInt(id), motivo || 'Sem motivo especificado', req.ip);

    res.json({ success: true, message: 'Produtor rejeitado e removido.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/produtores/:id/desactivar
router.put('/produtores/:id/desactivar', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, id)
      .query('UPDATE produtores SET activo = 0 WHERE id = @id');

    await logAction(req.admin.id, 'DESACTIVAR', 'produtor', parseInt(id), null, req.ip);

    res.json({ success: true, message: 'Produtor desactivado.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE CERTIFICADOS
// ════════════════════════════════════════════════════════════

// GET /api/admin/certificados/pendentes
router.get('/certificados/pendentes', authMiddleware, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`SELECT c.*, p.nome as produtor_nome, p.nbi as produtor_nbi
              FROM certificados c
              LEFT JOIN produtores p ON c.produtor_id = p.id
              WHERE c.estado = 'pendente'
              ORDER BY c.criado_em ASC`);

    res.json({ certificados: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/certificados
router.get('/certificados', authMiddleware, async (req, res) => {
  const { estado, limit = 100, offset = 0 } = req.query;
  
  try {
    const pool = await poolPromise;
    let query = `SELECT c.*, p.nome as produtor_nome, p.nbi as produtor_nbi
                 FROM certificados c
                 LEFT JOIN produtores p ON c.produtor_id = p.id
                 WHERE 1=1`;
    const request = pool.request();

    if (estado) {
      query += ' AND c.estado = @estado';
      request.input('estado', sql.NVarChar, estado);
    }

    query += ' ORDER BY c.criado_em DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    request.input('offset', sql.Int, parseInt(offset));
    request.input('limit', sql.Int, parseInt(limit));

    const result = await request.query(query);
    res.json({ certificados: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/certificados/:referencia - Detalhes de um certificado
router.get('/certificados/:referencia', authMiddleware, async (req, res) => {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/certificados/:id/emitir
router.put('/certificados/:id/emitir', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { id } = req.params;
  const { observacoes } = req.body;
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('observacoes', sql.NVarChar, observacoes || null)
      .query(`UPDATE certificados SET estado = 'emitido', observacoes = @observacoes WHERE id = @id;
              SELECT * FROM certificados WHERE id = @id`);

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Certificado não encontrado.' });

    const cert = result.recordset[0];
    await logAction(req.admin.id, 'EMITIR', 'certificado', parseInt(id), `Certificado ${cert.referencia} emitido`, req.ip);

    res.json({ success: true, message: 'Certificado emitido.', certificado: cert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/certificados/:id/rejeitar
router.put('/certificados/:id/rejeitar', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { id } = req.params;
  const { observacoes } = req.body;
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('observacoes', sql.NVarChar, observacoes || 'Rejeitado')
      .query(`UPDATE certificados SET estado = 'rejeitado', observacoes = @observacoes WHERE id = @id;
              SELECT * FROM certificados WHERE id = @id`);

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Certificado não encontrado.' });

    const cert = result.recordset[0];
    await logAction(req.admin.id, 'REJEITAR', 'certificado', parseInt(id), observacoes, req.ip);

    res.json({ success: true, message: 'Certificado rejeitado.', certificado: cert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE PEDIDOS DE APOIO
// ════════════════════════════════════════════════════════════

// GET /api/admin/apoios/pendentes
router.get('/apoios/pendentes', authMiddleware, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`SELECT a.*, p.nome as produtor_nome, p.nbi as produtor_nbi
              FROM pedidos_apoio a
              LEFT JOIN produtores p ON a.produtor_id = p.id
              WHERE a.estado = 'em_analise'
              ORDER BY a.criado_em ASC`);

    res.json({ apoios: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/apoios
router.get('/apoios', authMiddleware, async (req, res) => {
  const { estado, limit = 100, offset = 0 } = req.query;
  
  try {
    const pool = await poolPromise;
    let query = `SELECT a.*, p.nome as produtor_nome, p.nbi as produtor_nbi
                 FROM pedidos_apoio a
                 LEFT JOIN produtores p ON a.produtor_id = p.id
                 WHERE 1=1`;
    const request = pool.request();

    if (estado) {
      query += ' AND a.estado = @estado';
      request.input('estado', sql.NVarChar, estado);
    }

    query += ' ORDER BY a.criado_em DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    request.input('offset', sql.Int, parseInt(offset));
    request.input('limit', sql.Int, parseInt(limit));

    const result = await request.query(query);
    res.json({ apoios: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/apoios/:id/aprovar
router.put('/apoios/:id/aprovar', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`UPDATE pedidos_apoio SET estado = 'aprovado' WHERE id = @id;
              SELECT * FROM pedidos_apoio WHERE id = @id`);

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Pedido não encontrado.' });

    const apoio = result.recordset[0];
    await logAction(req.admin.id, 'APROVAR', 'pedido_apoio', parseInt(id), `Pedido ${apoio.referencia} aprovado`, req.ip);

    res.json({ success: true, message: 'Pedido de apoio aprovado.', apoio });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/apoios/:id/rejeitar
router.put('/apoios/:id/rejeitar', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`UPDATE pedidos_apoio SET estado = 'rejeitado' WHERE id = @id;
              SELECT * FROM pedidos_apoio WHERE id = @id`);

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Pedido não encontrado.' });

    const apoio = result.recordset[0];
    await logAction(req.admin.id, 'REJEITAR', 'pedido_apoio', parseInt(id), `Pedido ${apoio.referencia} rejeitado`, req.ip);

    res.json({ success: true, message: 'Pedido de apoio rejeitado.', apoio });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  DASHBOARD & ESTATÍSTICAS
// ════════════════════════════════════════════════════════════

// GET /api/admin/dashboard
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const pool = await poolPromise;
    
    const stats = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM produtores WHERE activo = 0) as produtores_pendentes,
        (SELECT COUNT(*) FROM produtores WHERE activo = 1) as produtores_activos,
        (SELECT COUNT(*) FROM certificados WHERE estado = 'pendente') as certificados_pendentes,
        (SELECT COUNT(*) FROM certificados WHERE estado = 'emitido') as certificados_emitidos,
        (SELECT COUNT(*) FROM pedidos_apoio WHERE estado = 'em_analise') as apoios_pendentes,
        (SELECT COUNT(*) FROM pedidos_apoio WHERE estado = 'aprovado') as apoios_aprovados,
        (SELECT COUNT(*) FROM lotes) as total_lotes,
        (SELECT SUM(quantidade_kg) FROM lotes) as total_kg_producao
    `);

    res.json({ stats: stats.recordset[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/logs
router.get('/logs', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit))
      .query(`SELECT l.*, a.nome as admin_nome, a.email as admin_email
              FROM admin_logs l
              JOIN administradores a ON l.admin_id = a.id
              ORDER BY l.criado_em DESC
              OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);

    res.json({ logs: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE CONTEÚDO - ARTIGOS
// ════════════════════════════════════════════════════════════

// GET /api/admin/artigos
router.get('/artigos', authMiddleware, async (req, res) => {
  const { estado, categoria_id, destaque, limit = 50, offset = 0 } = req.query;
  
  try {
    const pool = await poolPromise;
    let query = `SELECT a.*, c.nome as categoria_nome, ad.nome as autor_nome
                 FROM artigos a
                 LEFT JOIN categorias_conteudo c ON a.categoria_id = c.id
                 LEFT JOIN administradores ad ON a.autor_id = ad.id
                 WHERE 1=1`;
    const request = pool.request();

    if (estado) {
      query += ' AND a.estado = @estado';
      request.input('estado', sql.NVarChar, estado);
    }
    if (categoria_id) {
      query += ' AND a.categoria_id = @categoria_id';
      request.input('categoria_id', sql.Int, parseInt(categoria_id));
    }
    if (destaque !== undefined) {
      query += ' AND a.destaque = @destaque';
      request.input('destaque', sql.Bit, destaque === 'true' || destaque === '1' ? 1 : 0);
    }

    query += ' ORDER BY a.criado_em DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    request.input('offset', sql.Int, parseInt(offset));
    request.input('limit', sql.Int, parseInt(limit));

    const result = await request.query(query);
    res.json({ artigos: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/artigos/:id
router.get('/artigos/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT a.*, c.nome as categoria_nome, ad.nome as autor_nome
              FROM artigos a
              LEFT JOIN categorias_conteudo c ON a.categoria_id = c.id
              LEFT JOIN administradores ad ON a.autor_id = ad.id
              WHERE a.id = @id`);

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Artigo não encontrado.' });

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/artigos
router.post('/artigos', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { titulo, titulo_en, slug, resumo, resumo_en, conteudo, conteudo_en, categoria_id, imagem_destaque, tags, estado, destaque } = req.body;
  
  if (!titulo || !conteudo) 
    return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });
  
  if (!titulo_en || !conteudo_en) 
    return res.status(400).json({ error: 'Título e conteúdo em inglês são obrigatórios.' });
  
  try {
    const pool = await poolPromise;
    const slugFinal = slug || titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const result = await pool.request()
      .input('titulo', sql.NVarChar, titulo)
      .input('titulo_en', sql.NVarChar, titulo_en)
      .input('slug', sql.NVarChar, slugFinal)
      .input('resumo', sql.NVarChar, resumo || null)
      .input('resumo_en', sql.NVarChar, resumo_en || null)
      .input('conteudo', sql.NVarChar, conteudo)
      .input('conteudo_en', sql.NVarChar, conteudo_en)
      .input('categoria_id', sql.Int, categoria_id || null)
      .input('autor_id', sql.Int, req.admin.id)
      .input('imagem_destaque', sql.NVarChar, imagem_destaque || null)
      .input('tags', sql.NVarChar, tags || null)
      .input('estado', sql.NVarChar, estado || 'rascunho')
      .input('destaque', sql.Bit, destaque ? 1 : 0)
      .input('publicado_em', sql.DateTime2, estado === 'publicado' ? new Date() : null)
      .query(`INSERT INTO artigos (titulo, titulo_en, slug, resumo, resumo_en, conteudo, conteudo_en, categoria_id, autor_id, imagem_destaque, tags, estado, destaque, publicado_em)
              OUTPUT INSERTED.*
              VALUES (@titulo, @titulo_en, @slug, @resumo, @resumo_en, @conteudo, @conteudo_en, @categoria_id, @autor_id, @imagem_destaque, @tags, @estado, @destaque, @publicado_em)`);

    const artigo = result.recordset[0];
    await logAction(req.admin.id, 'CRIAR', 'artigo', artigo.id, `Artigo "${titulo}" criado`, req.ip);

    res.status(201).json({ success: true, artigo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/artigos/:id
router.put('/artigos/:id', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { id } = req.params;
  const { titulo, titulo_en, slug, resumo, resumo_en, conteudo, conteudo_en, categoria_id, imagem_destaque, tags, estado, destaque } = req.body;
  
  try {
    const pool = await poolPromise;
    const request = pool.request().input('id', sql.Int, id);
    
    let updates = [];
    if (titulo !== undefined) {
      updates.push('titulo = @titulo');
      request.input('titulo', sql.NVarChar, titulo);
    }
    if (titulo_en !== undefined) {
      updates.push('titulo_en = @titulo_en');
      request.input('titulo_en', sql.NVarChar, titulo_en);
    }
    if (slug !== undefined) {
      updates.push('slug = @slug');
      request.input('slug', sql.NVarChar, slug);
    }
    if (resumo !== undefined) {
      updates.push('resumo = @resumo');
      request.input('resumo', sql.NVarChar, resumo);
    }
    if (resumo_en !== undefined) {
      updates.push('resumo_en = @resumo_en');
      request.input('resumo_en', sql.NVarChar, resumo_en);
    }
    if (conteudo !== undefined) {
      updates.push('conteudo = @conteudo');
      request.input('conteudo', sql.NVarChar, conteudo);
    }
    if (conteudo_en !== undefined) {
      updates.push('conteudo_en = @conteudo_en');
      request.input('conteudo_en', sql.NVarChar, conteudo_en);
    }
    if (categoria_id !== undefined) {
      updates.push('categoria_id = @categoria_id');
      request.input('categoria_id', sql.Int, categoria_id || null);
    }
    if (imagem_destaque !== undefined) {
      updates.push('imagem_destaque = @imagem_destaque');
      request.input('imagem_destaque', sql.NVarChar, imagem_destaque);
    }
    if (tags !== undefined) {
      updates.push('tags = @tags');
      request.input('tags', sql.NVarChar, tags);
    }
    if (estado !== undefined) {
      updates.push('estado = @estado');
      request.input('estado', sql.NVarChar, estado);
      if (estado === 'publicado') {
        updates.push('publicado_em = GETDATE()');
      }
    }
    if (destaque !== undefined) {
      updates.push('destaque = @destaque');
      request.input('destaque', sql.Bit, destaque ? 1 : 0);
    }
    
    updates.push('actualizado_em = GETDATE()');
    
    const result = await request.query(`UPDATE artigos SET ${updates.join(', ')} WHERE id = @id; SELECT * FROM artigos WHERE id = @id`);

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Artigo não encontrado.' });

    const artigo = result.recordset[0];
    await logAction(req.admin.id, 'EDITAR', 'artigo', parseInt(id), `Artigo "${artigo.titulo}" editado`, req.ip);

    res.json({ success: true, artigo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/artigos/:id
router.delete('/artigos/:id', authMiddleware, requireLevel('super_admin'), async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT titulo FROM artigos WHERE id = @id; DELETE FROM artigos WHERE id = @id');

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Artigo não encontrado.' });

    const titulo = result.recordset[0].titulo;
    await logAction(req.admin.id, 'ELIMINAR', 'artigo', parseInt(id), `Artigo "${titulo}" eliminado`, req.ip);

    res.json({ success: true, message: 'Artigo eliminado.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE CONTEÚDO - CATEGORIAS
// ════════════════════════════════════════════════════════════

// GET /api/admin/categorias
router.get('/categorias', authMiddleware, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query('SELECT * FROM categorias_conteudo ORDER BY nome ASC');

    res.json({ categorias: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/categorias
router.post('/categorias', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { nome, slug, descricao } = req.body;
  
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório.' });
  
  try {
    const pool = await poolPromise;
    const slugFinal = slug || nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const result = await pool.request()
      .input('nome', sql.NVarChar, nome)
      .input('slug', sql.NVarChar, slugFinal)
      .input('descricao', sql.NVarChar, descricao || null)
      .query(`INSERT INTO categorias_conteudo (nome, slug, descricao)
              OUTPUT INSERTED.*
              VALUES (@nome, @slug, @descricao)`);

    await logAction(req.admin.id, 'CRIAR', 'categoria', result.recordset[0].id, `Categoria "${nome}" criada`, req.ip);

    res.status(201).json({ success: true, categoria: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE CONTEÚDO - ANÚNCIOS
// ════════════════════════════════════════════════════════════

// GET /api/admin/anuncios
router.get('/anuncios', authMiddleware, async (req, res) => {
  const { activo, tipo, limit = 50, offset = 0 } = req.query;
  
  try {
    const pool = await poolPromise;
    let query = `SELECT a.*, ad.nome as criado_por_nome
                 FROM anuncios a
                 LEFT JOIN administradores ad ON a.criado_por = ad.id
                 WHERE 1=1`;
    const request = pool.request();

    if (activo !== undefined) {
      query += ' AND a.activo = @activo';
      request.input('activo', sql.Bit, activo === 'true' || activo === '1' ? 1 : 0);
    }
    if (tipo) {
      query += ' AND a.tipo = @tipo';
      request.input('tipo', sql.NVarChar, tipo);
    }

    query += ' ORDER BY a.criado_em DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    request.input('offset', sql.Int, parseInt(offset));
    request.input('limit', sql.Int, parseInt(limit));

    const result = await request.query(query);
    res.json({ anuncios: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/anuncios
router.post('/anuncios', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { titulo, titulo_en, mensagem, mensagem_en, tipo, link_url, link_texto, link_texto_en, activo, data_inicio, data_fim } = req.body;
  
  if (!titulo || !mensagem) 
    return res.status(400).json({ error: 'Título e mensagem são obrigatórios.' });
  
  if (!titulo_en || !mensagem_en) 
    return res.status(400).json({ error: 'Título e mensagem em inglês são obrigatórios.' });
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('titulo', sql.NVarChar, titulo)
      .input('titulo_en', sql.NVarChar, titulo_en)
      .input('mensagem', sql.NVarChar, mensagem)
      .input('mensagem_en', sql.NVarChar, mensagem_en)
      .input('tipo', sql.NVarChar, tipo || 'info')
      .input('link_url', sql.NVarChar, link_url || null)
      .input('link_texto', sql.NVarChar, link_texto || null)
      .input('link_texto_en', sql.NVarChar, link_texto_en || null)
      .input('activo', sql.Bit, activo !== undefined ? (activo ? 1 : 0) : 1)
      .input('data_inicio', sql.DateTime2, data_inicio ? new Date(data_inicio) : new Date())
      .input('data_fim', sql.DateTime2, data_fim ? new Date(data_fim) : null)
      .input('criado_por', sql.Int, req.admin.id)
      .query(`INSERT INTO anuncios (titulo, titulo_en, mensagem, mensagem_en, tipo, link_url, link_texto, link_texto_en, activo, data_inicio, data_fim, criado_por)
              OUTPUT INSERTED.*
              VALUES (@titulo, @titulo_en, @mensagem, @mensagem_en, @tipo, @link_url, @link_texto, @link_texto_en, @activo, @data_inicio, @data_fim, @criado_por)`);

    const anuncio = result.recordset[0];
    await logAction(req.admin.id, 'CRIAR', 'anuncio', anuncio.id, `Anúncio "${titulo}" criado`, req.ip);

    res.status(201).json({ success: true, anuncio });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/anuncios/:id
router.put('/anuncios/:id', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { id } = req.params;
  const { titulo, titulo_en, mensagem, mensagem_en, tipo, link_url, link_texto, link_texto_en, activo, data_inicio, data_fim } = req.body;
  
  try {
    const pool = await poolPromise;
    const request = pool.request().input('id', sql.Int, id);
    
    let updates = [];
    if (titulo !== undefined) {
      updates.push('titulo = @titulo');
      request.input('titulo', sql.NVarChar, titulo);
    }
    if (titulo_en !== undefined) {
      updates.push('titulo_en = @titulo_en');
      request.input('titulo_en', sql.NVarChar, titulo_en);
    }
    if (mensagem !== undefined) {
      updates.push('mensagem = @mensagem');
      request.input('mensagem', sql.NVarChar, mensagem);
    }
    if (mensagem_en !== undefined) {
      updates.push('mensagem_en = @mensagem_en');
      request.input('mensagem_en', sql.NVarChar, mensagem_en);
    }
    if (tipo !== undefined) {
      updates.push('tipo = @tipo');
      request.input('tipo', sql.NVarChar, tipo);
    }
    if (link_url !== undefined) {
      updates.push('link_url = @link_url');
      request.input('link_url', sql.NVarChar, link_url);
    }
    if (link_texto !== undefined) {
      updates.push('link_texto = @link_texto');
      request.input('link_texto', sql.NVarChar, link_texto);
    }
    if (link_texto_en !== undefined) {
      updates.push('link_texto_en = @link_texto_en');
      request.input('link_texto_en', sql.NVarChar, link_texto_en);
    }
    if (activo !== undefined) {
      updates.push('activo = @activo');
      request.input('activo', sql.Bit, activo ? 1 : 0);
    }
    if (data_inicio !== undefined) {
      updates.push('data_inicio = @data_inicio');
      request.input('data_inicio', sql.DateTime2, new Date(data_inicio));
    }
    if (data_fim !== undefined) {
      updates.push('data_fim = @data_fim');
      request.input('data_fim', sql.DateTime2, data_fim ? new Date(data_fim) : null);
    }
    
    if (updates.length === 0)
      return res.status(400).json({ error: 'Nenhum campo para actualizar.' });
    
    const result = await request.query(`UPDATE anuncios SET ${updates.join(', ')} WHERE id = @id; SELECT * FROM anuncios WHERE id = @id`);

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Anúncio não encontrado.' });

    const anuncio = result.recordset[0];
    await logAction(req.admin.id, 'EDITAR', 'anuncio', parseInt(id), `Anúncio "${anuncio.titulo}" editado`, req.ip);

    res.json({ success: true, anuncio });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/anuncios/:id
router.delete('/anuncios/:id', authMiddleware, requireLevel('super_admin'), async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT titulo FROM anuncios WHERE id = @id; DELETE FROM anuncios WHERE id = @id');

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Anúncio não encontrado.' });

    const titulo = result.recordset[0].titulo;
    await logAction(req.admin.id, 'ELIMINAR', 'anuncio', parseInt(id), `Anúncio "${titulo}" eliminado`, req.ip);

    res.json({ success: true, message: 'Anúncio eliminado.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE CONTEÚDO - FAQ
// ════════════════════════════════════════════════════════════

// GET /api/admin/faq
router.get('/faq', authMiddleware, async (req, res) => {
  const { categoria, activo } = req.query;
  
  try {
    const pool = await poolPromise;
    let query = 'SELECT * FROM faq WHERE 1=1';
    const request = pool.request();

    if (categoria) {
      query += ' AND categoria = @categoria';
      request.input('categoria', sql.NVarChar, categoria);
    }
    if (activo !== undefined) {
      query += ' AND activo = @activo';
      request.input('activo', sql.Bit, activo === 'true' || activo === '1' ? 1 : 0);
    }

    query += ' ORDER BY ordem ASC, criado_em DESC';

    const result = await request.query(query);
    res.json({ faq: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/faq
router.post('/faq', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { pergunta, resposta, categoria, ordem, activo } = req.body;
  
  if (!pergunta || !resposta) 
    return res.status(400).json({ error: 'Pergunta e resposta são obrigatórios.' });
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('pergunta', sql.NVarChar, pergunta)
      .input('resposta', sql.NVarChar, resposta)
      .input('categoria', sql.NVarChar, categoria || null)
      .input('ordem', sql.Int, ordem || 0)
      .input('activo', sql.Bit, activo !== undefined ? (activo ? 1 : 0) : 1)
      .query(`INSERT INTO faq (pergunta, resposta, categoria, ordem, activo)
              OUTPUT INSERTED.*
              VALUES (@pergunta, @resposta, @categoria, @ordem, @activo)`);

    const faq = result.recordset[0];
    await logAction(req.admin.id, 'CRIAR', 'faq', faq.id, `FAQ criado: "${pergunta}"`, req.ip);

    res.status(201).json({ success: true, faq });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/faq/:id
router.put('/faq/:id', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { id } = req.params;
  const { pergunta, resposta, categoria, ordem, activo } = req.body;
  
  try {
    const pool = await poolPromise;
    const request = pool.request().input('id', sql.Int, id);
    
    let updates = [];
    if (pergunta !== undefined) {
      updates.push('pergunta = @pergunta');
      request.input('pergunta', sql.NVarChar, pergunta);
    }
    if (resposta !== undefined) {
      updates.push('resposta = @resposta');
      request.input('resposta', sql.NVarChar, resposta);
    }
    if (categoria !== undefined) {
      updates.push('categoria = @categoria');
      request.input('categoria', sql.NVarChar, categoria);
    }
    if (ordem !== undefined) {
      updates.push('ordem = @ordem');
      request.input('ordem', sql.Int, ordem);
    }
    if (activo !== undefined) {
      updates.push('activo = @activo');
      request.input('activo', sql.Bit, activo ? 1 : 0);
    }
    
    if (updates.length === 0)
      return res.status(400).json({ error: 'Nenhum campo para actualizar.' });
    
    const result = await request.query(`UPDATE faq SET ${updates.join(', ')} WHERE id = @id; SELECT * FROM faq WHERE id = @id`);

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'FAQ não encontrado.' });

    const faq = result.recordset[0];
    await logAction(req.admin.id, 'EDITAR', 'faq', parseInt(id), `FAQ editado`, req.ip);

    res.json({ success: true, faq });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/faq/:id
router.delete('/faq/:id', authMiddleware, requireLevel('super_admin'), async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM faq WHERE id = @id');

    await logAction(req.admin.id, 'ELIMINAR', 'faq', parseInt(id), `FAQ eliminado`, req.ip);

    res.json({ success: true, message: 'FAQ eliminado.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE CONTEÚDO - PROJECTOS
// ════════════════════════════════════════════════════════════

// GET /api/admin/projectos
router.get('/projectos', authMiddleware, async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  
  try {
    const pool = await poolPromise;
    let query = 'SELECT * FROM projectos WHERE 1=1';
    const request = pool.request();

    if (status) {
      query += ' AND status = @status';
      request.input('status', sql.NVarChar, status);
    }

    query += ' ORDER BY criado_em DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    request.input('offset', sql.Int, parseInt(offset));
    request.input('limit', sql.Int, parseInt(limit));

    const result = await request.query(query);
    res.json({ projectos: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/projectos
router.post('/projectos', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { 
    nome, nome_en, descricao, descricao_en, fileira, investimento_usd, hectares,
    produtores_capacitar, capacidade_anual_t, ano_inicio, ano_conclusao, status,
    coordenador, telefone_coordenador, email_coordenador, provincias, tecnologias,
    mercados_exportacao, logo_emoji, cor_tema
  } = req.body;
  
  if (!nome || !descricao || !nome_en || !descricao_en) 
    return res.status(400).json({ error: 'Nome e descrição em português e inglês são obrigatórios.' });

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('nome', sql.NVarChar, nome)
      .input('nome_en', sql.NVarChar, nome_en)
      .input('descricao', sql.NVarChar, descricao)
      .input('descricao_en', sql.NVarChar, descricao_en)
      .input('fileira', sql.NVarChar, fileira || '')
      .input('investimento_usd', sql.Decimal(14, 2), investimento_usd || 0)
      .input('hectares', sql.Decimal(10, 2), hectares || 0)
      .input('produtores_capacitar', sql.Int, produtores_capacitar || 0)
      .input('capacidade_anual_t', sql.Decimal(10, 2), capacidade_anual_t || 0)
      .input('ano_inicio', sql.Int, ano_inicio || new Date().getFullYear())
      .input('ano_conclusao', sql.Int, ano_conclusao || new Date().getFullYear() + 3)
      .input('status', sql.NVarChar, status || 'em_planeamento')
      .input('coordenador', sql.NVarChar, coordenador || null)
      .input('telefone_coordenador', sql.NVarChar, telefone_coordenador || null)
      .input('email_coordenador', sql.NVarChar, email_coordenador || null)
      .input('provincias', sql.NVarChar, provincias || null)
      .input('tecnologias', sql.NVarChar, tecnologias || null)
      .input('mercados_exportacao', sql.NVarChar, mercados_exportacao || null)
      .input('logo_emoji', sql.NVarChar, logo_emoji || '📋')
      .input('cor_tema', sql.NVarChar, cor_tema || '#C49A3C')
      .query(`INSERT INTO projectos (nome, nome_en, descricao, descricao_en, fileira, investimento_usd, hectares, produtores_capacitar, capacidade_anual_t, ano_inicio, ano_conclusao, status, coordenador, telefone_coordenador, email_coordenador, provincias, tecnologias, mercados_exportacao, logo_emoji, cor_tema)
              OUTPUT INSERTED.*
              VALUES (@nome, @nome_en, @descricao, @descricao_en, @fileira, @investimento_usd, @hectares, @produtores_capacitar, @capacidade_anual_t, @ano_inicio, @ano_conclusao, @status, @coordenador, @telefone_coordenador, @email_coordenador, @provincias, @tecnologias, @mercados_exportacao, @logo_emoji, @cor_tema)`);

    const projecto = result.recordset[0];
    await logAction(req.admin.id, 'CRIAR', 'projecto', projecto.id, `Projecto criado: "${nome}"`, req.ip);

    res.status(201).json({ success: true, projecto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/projectos/:id
router.put('/projectos/:id', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { id } = req.params;
  const { 
    nome, nome_en, descricao, descricao_en, fileira, investimento_usd, hectares,
    produtores_capacitar, capacidade_anual_t, ano_inicio, ano_conclusao, status,
    coordenador, telefone_coordenador, email_coordenador, provincias, tecnologias,
    mercados_exportacao, logo_emoji, cor_tema
  } = req.body;
  
  try {
    const pool = await poolPromise;
    const request = pool.request().input('id', sql.Int, id);

    const updates = [];
    if (nome !== undefined) {
      updates.push('nome = @nome');
      request.input('nome', sql.NVarChar, nome);
    }
    if (nome_en !== undefined) {
      updates.push('nome_en = @nome_en');
      request.input('nome_en', sql.NVarChar, nome_en);
    }
    if (descricao !== undefined) {
      updates.push('descricao = @descricao');
      request.input('descricao', sql.NVarChar, descricao);
    }
    if (descricao_en !== undefined) {
      updates.push('descricao_en = @descricao_en');
      request.input('descricao_en', sql.NVarChar, descricao_en);
    }
    if (fileira !== undefined) {
      updates.push('fileira = @fileira');
      request.input('fileira', sql.NVarChar, fileira);
    }
    if (investimento_usd !== undefined) {
      updates.push('investimento_usd = @investimento_usd');
      request.input('investimento_usd', sql.Decimal(14, 2), investimento_usd);
    }
    if (hectares !== undefined) {
      updates.push('hectares = @hectares');
      request.input('hectares', sql.Decimal(10, 2), hectares);
    }
    if (produtores_capacitar !== undefined) {
      updates.push('produtores_capacitar = @produtores_capacitar');
      request.input('produtores_capacitar', sql.Int, produtores_capacitar);
    }
    if (capacidade_anual_t !== undefined) {
      updates.push('capacidade_anual_t = @capacidade_anual_t');
      request.input('capacidade_anual_t', sql.Decimal(10, 2), capacidade_anual_t);
    }
    if (ano_inicio !== undefined) {
      updates.push('ano_inicio = @ano_inicio');
      request.input('ano_inicio', sql.Int, ano_inicio);
    }
    if (ano_conclusao !== undefined) {
      updates.push('ano_conclusao = @ano_conclusao');
      request.input('ano_conclusao', sql.Int, ano_conclusao);
    }
    if (status !== undefined) {
      updates.push('status = @status');
      request.input('status', sql.NVarChar, status);
    }
    if (coordenador !== undefined) {
      updates.push('coordenador = @coordenador');
      request.input('coordenador', sql.NVarChar, coordenador);
    }
    if (telefone_coordenador !== undefined) {
      updates.push('telefone_coordenador = @telefone_coordenador');
      request.input('telefone_coordenador', sql.NVarChar, telefone_coordenador);
    }
    if (email_coordenador !== undefined) {
      updates.push('email_coordenador = @email_coordenador');
      request.input('email_coordenador', sql.NVarChar, email_coordenador);
    }
    if (provincias !== undefined) {
      updates.push('provincias = @provincias');
      request.input('provincias', sql.NVarChar, provincias);
    }
    if (tecnologias !== undefined) {
      updates.push('tecnologias = @tecnologias');
      request.input('tecnologias', sql.NVarChar, tecnologias);
    }
    if (mercados_exportacao !== undefined) {
      updates.push('mercados_exportacao = @mercados_exportacao');
      request.input('mercados_exportacao', sql.NVarChar, mercados_exportacao);
    }
    if (logo_emoji !== undefined) {
      updates.push('logo_emoji = @logo_emoji');
      request.input('logo_emoji', sql.NVarChar, logo_emoji);
    }
    if (cor_tema !== undefined) {
      updates.push('cor_tema = @cor_tema');
      request.input('cor_tema', sql.NVarChar, cor_tema);
    }

    if (updates.length === 0)
      return res.status(400).json({ error: 'Nenhum campo para actualizar.' });
    
    const result = await request.query(`UPDATE projectos SET ${updates.join(', ')}, actualizado_em = GETDATE() WHERE id = @id; SELECT * FROM projectos WHERE id = @id`);

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Projecto não encontrado.' });

    const projecto = result.recordset[0];
    await logAction(req.admin.id, 'EDITAR', 'projecto', parseInt(id), `Projecto editado`, req.ip);

    res.json({ success: true, projecto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/projectos/:id
router.delete('/projectos/:id', authMiddleware, requireLevel('super_admin'), async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM projectos WHERE id = @id');

    await logAction(req.admin.id, 'ELIMINAR', 'projecto', parseInt(id), `Projecto eliminado`, req.ip);

    res.json({ success: true, message: 'Projecto eliminado.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  FOTOS DE PROJECTOS
// ════════════════════════════════════════════════════════════

// Garante que a tabela projecto_fotos existe
async function ensureFotosTable() {
  try {
    const pool = await poolPromise;
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'projecto_fotos')
      CREATE TABLE projecto_fotos (
        id           INT IDENTITY(1,1) PRIMARY KEY,
        projecto_id  INT NOT NULL,
        filename     NVARCHAR(255) NOT NULL,
        url_path     NVARCHAR(500) NOT NULL,
        ordem        INT DEFAULT 0,
        criado_em    DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT fk_projecto_fotos FOREIGN KEY (projecto_id) REFERENCES projectos(id) ON DELETE CASCADE
      )
    `);
  } catch (_) {}
}
ensureFotosTable();

// GET /api/admin/projectos/:id/fotos
router.get('/projectos/:id/fotos', authMiddleware, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM projecto_fotos WHERE projecto_id = @id ORDER BY ordem, id');
    res.json({ fotos: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/projectos/:id/fotos  (até 10 ficheiros por pedido)
router.post('/projectos/:id/fotos', authMiddleware, requireLevel('admin', 'super_admin'), (req, res, next) => {
  uploadFotos.array('fotos', 10)(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ error: 'Nenhum ficheiro enviado.' });

  try {
    const pool = await poolPromise;

    // Verificar quantas fotos já existem
    const countResult = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT COUNT(*) AS total FROM projecto_fotos WHERE projecto_id = @id');
    const existing = countResult.recordset[0].total;

    if (existing + req.files.length > 10) {
      // Apagar ficheiros recém-enviados pois ultrapassaria o limite
      req.files.forEach(f => fs.unlink(f.path, () => {}));
      return res.status(400).json({ error: `Limite de 10 fotos excedido. Já existem ${existing} fotos.` });
    }

    const inserted = [];
    for (const file of req.files) {
      const urlPath = `/uploads/projectos/${req.params.id}/${file.filename}`;
      const r = await pool.request()
        .input('projecto_id', sql.Int, req.params.id)
        .input('filename', sql.NVarChar, file.filename)
        .input('url_path', sql.NVarChar, urlPath)
        .query('INSERT INTO projecto_fotos (projecto_id, filename, url_path) OUTPUT INSERTED.* VALUES (@projecto_id, @filename, @url_path)');
      inserted.push(r.recordset[0]);
    }

    await logAction(req.admin.id, 'UPLOAD', 'projecto_fotos', parseInt(req.params.id), `${req.files.length} foto(s) adicionada(s)`, req.ip);
    res.status(201).json({ success: true, fotos: inserted });
  } catch (err) {
    req.files.forEach(f => fs.unlink(f.path, () => {}));
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/projectos/:id/fotos/:fotoId
router.delete('/projectos/:id/fotos/:fotoId', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('fotoId', sql.Int, req.params.fotoId)
      .query('SELECT * FROM projecto_fotos WHERE id = @fotoId AND projecto_id = @id');

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Foto não encontrada.' });

    const foto = result.recordset[0];
    const filePath = path.join(__dirname, 'uploads', 'projectos', String(req.params.id), foto.filename);
    fs.unlink(filePath, () => {});

    await pool.request()
      .input('fotoId', sql.Int, req.params.fotoId)
      .query('DELETE FROM projecto_fotos WHERE id = @fotoId');

    await logAction(req.admin.id, 'ELIMINAR', 'projecto_fotos', parseInt(req.params.fotoId), `Foto eliminada do projecto ${req.params.id}`, req.ip);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE CONTEÚDO - MEDIA
// ════════════════════════════════════════════════════════════

// GET /api/admin/media
router.get('/media', authMiddleware, async (req, res) => {
  const { tipo, limit = 50, offset = 0 } = req.query;
  
  try {
    const pool = await poolPromise;
    let query = `SELECT m.*, ad.nome as upload_por_nome
                 FROM media m
                 LEFT JOIN administradores ad ON m.upload_por = ad.id
                 WHERE 1=1`;
    const request = pool.request();

    if (tipo) {
      query += ' AND m.tipo = @tipo';
      request.input('tipo', sql.NVarChar, tipo);
    }

    query += ' ORDER BY m.criado_em DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    request.input('offset', sql.Int, parseInt(offset));
    request.input('limit', sql.Int, parseInt(limit));

    const result = await request.query(query);
    res.json({ media: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/media
router.post('/media', authMiddleware, async (req, res) => {
  const { titulo, descricao, tipo, url, tamanho_kb, mime_type } = req.body;
  
  if (!titulo || !tipo || !url) 
    return res.status(400).json({ error: 'Título, tipo e URL são obrigatórios.' });
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('titulo', sql.NVarChar, titulo)
      .input('descricao', sql.NVarChar, descricao || null)
      .input('tipo', sql.NVarChar, tipo)
      .input('url', sql.NVarChar, url)
      .input('tamanho_kb', sql.Int, tamanho_kb || null)
      .input('mime_type', sql.NVarChar, mime_type || null)
      .input('upload_por', sql.Int, req.admin.id)
      .query(`INSERT INTO media (titulo, descricao, tipo, url, tamanho_kb, mime_type, upload_por)
              OUTPUT INSERTED.*
              VALUES (@titulo, @descricao, @tipo, @url, @tamanho_kb, @mime_type, @upload_por)`);

    const media = result.recordset[0];
    await logAction(req.admin.id, 'UPLOAD', 'media', media.id, `Media "${titulo}" adicionado`, req.ip);

    res.status(201).json({ success: true, media });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/media/:id
router.delete('/media/:id', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT titulo FROM media WHERE id = @id; DELETE FROM media WHERE id = @id');

    if (result.recordset.length === 0)
      return res.status(404).json({ error: 'Media não encontrado.' });

    const titulo = result.recordset[0].titulo;
    await logAction(req.admin.id, 'ELIMINAR', 'media', parseInt(id), `Media "${titulo}" eliminado`, req.ip);

    res.json({ success: true, message: 'Media eliminado.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
