const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const supabase = require('./supabase');

// multer em memória — o buffer vai directo para Supabase Storage
const uploadFotos = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Apenas imagens são permitidas (JPEG, PNG, WebP, GIF).'));
  }
});

const router = express.Router();

// ── Middleware de Autenticação (Supabase Auth) ───────────────
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido.' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Token inválido ou expirado.' });

  req.admin = {
    id:    user.app_metadata?.db_id,
    nivel: user.app_metadata?.nivel,
    email: user.email,
    authId: user.id,
  };
  next();
}

// ── Middleware de Nível de Acesso ────────────────────────────
function requireLevel(...levels) {
  return (req, res, next) => {
    if (!levels.includes(req.admin.nivel))
      return res.status(403).json({ error: 'Permissão insuficiente.' });
    next();
  };
}

// ── Helper: Registar Log ─────────────────────────────────────
async function logAction(admin_id, acao, entidade, entidade_id, detalhes, ip) {
  try {
    await supabase.from('admin_logs').insert({
      admin_id: admin_id || null,
      acao, entidade,
      entidade_id: entidade_id || null,
      detalhes: detalhes || null,
      ip_address: ip || null,
    });
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
    const emailLower = email.trim().toLowerCase();

    // 1 — Verificar DB primeiro (client ainda usa service_role antes do signIn)
    const { data: admin, error: dbErr } = await supabase.from('administradores')
      .select('id, nome, email, nivel, activo')
      .eq('email', emailLower)
      .single();

    if (dbErr || !admin) return res.status(401).json({ error: 'Email ou password incorrectos.' });
    if (!admin.activo)   return res.status(401).json({ error: 'Conta desactivada.' });

    // 2 — Autenticar via Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: emailLower,
      password,
    });

    if (authErr) return res.status(401).json({ error: 'Email ou password incorrectos.' });

    // 3 — Sincronizar app_metadata (auth.admin usa sempre service_role)
    await supabase.auth.admin.updateUserById(authData.user.id, {
      app_metadata: { db_id: admin.id, nivel: admin.nivel }
    });

    // 4 — Actualizar último acesso e log (via auth.admin para evitar conflito de sessão)
    await supabase.auth.admin.updateUserById(authData.user.id, {
      app_metadata: { db_id: admin.id, nivel: admin.nivel, ultimo_acesso: new Date().toISOString() }
    });

    logAction(admin.id, 'LOGIN', 'administrador', admin.id, null, req.ip).catch(() => {});

    res.json({
      success: true,
      token: authData.session.access_token,
      admin: { id: admin.id, nome: admin.nome, email: admin.email, nivel: admin.nivel },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('administradores')
      .select('id, nome, email, nivel, criado_em, ultimo_acesso')
      .eq('id', req.admin.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Administrador não encontrado.' });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE PRODUTORES
// ════════════════════════════════════════════════════════════

router.get('/produtores/pendentes', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('produtores')
      .select('id, nome, nbi, telefone, email, provincia, municipio, fileira, area_ha, tipo_produtor, criado_em')
      .eq('activo', false)
      .order('criado_em', { ascending: false });
    if (error) throw error;
    res.json({ produtores: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/produtores', authMiddleware, async (req, res) => {
  const { activo, fileira, provincia, limit = 100, offset = 0 } = req.query;
  try {
    let query = supabase.from('produtores')
      .select('id, nome, nbi, telefone, email, provincia, municipio, fileira, area_ha, tipo_produtor, activo, criado_em')
      .order('criado_em', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (activo !== undefined) query = query.eq('activo', activo === 'true' || activo === '1');
    if (fileira)              query = query.eq('fileira', fileira);
    if (provincia)            query = query.eq('provincia', provincia);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ produtores: data || [], total: data?.length || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/produtores/:id/aprovar', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const { data, error } = await supabase.from('produtores')
      .update({ activo: true, actualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Produtor não encontrado.' });

    await logAction(req.admin.id, 'APROVAR', 'produtor', id, `Produtor ${data.nome} (${data.nbi}) aprovado`, req.ip);
    res.json({ success: true, message: 'Produtor aprovado com sucesso.', produtor: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/produtores/:id/rejeitar', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { motivo } = req.body;
  try {
    const { data: existing } = await supabase.from('produtores')
      .select('id, auth_user_id').eq('id', id).eq('activo', false).maybeSingle();

    if (!existing) return res.status(404).json({ error: 'Produtor não encontrado ou já activo.' });

    if (existing.auth_user_id) {
      await supabase.auth.admin.deleteUser(existing.auth_user_id);
    }
    await supabase.from('produtores').delete().eq('id', id);

    await logAction(req.admin.id, 'REJEITAR', 'produtor', id, motivo || 'Sem motivo especificado', req.ip);
    res.json({ success: true, message: 'Produtor rejeitado e removido.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/produtores/:id/desactivar', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await supabase.from('produtores').update({ activo: false }).eq('id', id);
    await logAction(req.admin.id, 'DESACTIVAR', 'produtor', id, null, req.ip);
    res.json({ success: true, message: 'Produtor desactivado.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE CERTIFICADOS
// ════════════════════════════════════════════════════════════

router.get('/certificados/pendentes', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('certificados')
      .select('*, produtores(nome, nbi)')
      .eq('estado', 'pendente')
      .order('criado_em', { ascending: true });
    if (error) throw error;
    const certs = (data || []).map(({ produtores: p, ...c }) => ({ ...c, produtor_nome: p?.nome, produtor_nbi: p?.nbi }));
    res.json({ certificados: certs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/certificados', authMiddleware, async (req, res) => {
  const { estado, limit = 100, offset = 0 } = req.query;
  try {
    let query = supabase.from('certificados')
      .select('*, produtores(nome, nbi)')
      .order('criado_em', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    if (estado) query = query.eq('estado', estado);
    const { data, error } = await query;
    if (error) throw error;
    const certs = (data || []).map(({ produtores: p, ...c }) => ({ ...c, produtor_nome: p?.nome, produtor_nbi: p?.nbi }));
    res.json({ certificados: certs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/certificados/:referencia', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('certificados')
      .select('*, produtores(nome, nbi)')
      .eq('referencia', req.params.referencia)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Certificado não encontrado.' });
    const { produtores: p, ...cert } = data;
    res.json({ certificado: { ...cert, produtor_nome: p?.nome, produtor_nbi: p?.nbi } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/certificados/:id/emitir', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { observacoes } = req.body;
  try {
    const { data, error } = await supabase.from('certificados')
      .update({ estado: 'emitido', observacoes: observacoes || null })
      .eq('id', id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Certificado não encontrado.' });
    await logAction(req.admin.id, 'EMITIR', 'certificado', id, `Certificado ${data.referencia} emitido`, req.ip);
    res.json({ success: true, message: 'Certificado emitido.', certificado: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/certificados/:id/rejeitar', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { observacoes } = req.body;
  try {
    const { data, error } = await supabase.from('certificados')
      .update({ estado: 'rejeitado', observacoes: observacoes || 'Rejeitado' })
      .eq('id', id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Certificado não encontrado.' });
    await logAction(req.admin.id, 'REJEITAR', 'certificado', id, observacoes, req.ip);
    res.json({ success: true, message: 'Certificado rejeitado.', certificado: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE PEDIDOS DE APOIO
// ════════════════════════════════════════════════════════════

router.get('/apoios/pendentes', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('pedidos_apoio')
      .select('*, produtores(nome, nbi)')
      .eq('estado', 'em_analise')
      .order('criado_em', { ascending: true });
    if (error) throw error;
    const apoios = (data || []).map(({ produtores: p, ...a }) => ({ ...a, produtor_nome: p?.nome, produtor_nbi: p?.nbi }));
    res.json({ apoios });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/apoios', authMiddleware, async (req, res) => {
  const { estado, limit = 100, offset = 0 } = req.query;
  try {
    let query = supabase.from('pedidos_apoio')
      .select('*, produtores(nome, nbi)')
      .order('criado_em', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    if (estado) query = query.eq('estado', estado);
    const { data, error } = await query;
    if (error) throw error;
    const apoios = (data || []).map(({ produtores: p, ...a }) => ({ ...a, produtor_nome: p?.nome, produtor_nbi: p?.nbi }));
    res.json({ apoios });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/apoios/:id/aprovar', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const { data, error } = await supabase.from('pedidos_apoio')
      .update({ estado: 'aprovado' }).eq('id', id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Pedido não encontrado.' });
    await logAction(req.admin.id, 'APROVAR', 'pedido_apoio', id, `Pedido ${data.referencia} aprovado`, req.ip);
    res.json({ success: true, message: 'Pedido de apoio aprovado.', apoio: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/apoios/:id/rejeitar', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const { data, error } = await supabase.from('pedidos_apoio')
      .update({ estado: 'rejeitado' }).eq('id', id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Pedido não encontrado.' });
    await logAction(req.admin.id, 'REJEITAR', 'pedido_apoio', id, `Pedido ${data.referencia} rejeitado`, req.ip);
    res.json({ success: true, message: 'Pedido de apoio rejeitado.', apoio: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  DASHBOARD & ESTATÍSTICAS
// ════════════════════════════════════════════════════════════

router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('get_dashboard_stats');
    if (error) throw error;
    res.json({ stats: data?.[0] || {} });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/logs', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  try {
    const { data, error } = await supabase.from('admin_logs')
      .select('*, administradores(nome, email)')
      .order('criado_em', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    if (error) throw error;
    const logs = (data || []).map(({ administradores: a, ...l }) => ({
      ...l, admin_nome: a?.nome, admin_email: a?.email
    }));
    res.json({ logs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE CONTEÚDO — ARTIGOS
// ════════════════════════════════════════════════════════════

router.get('/artigos', authMiddleware, async (req, res) => {
  const { estado, categoria_id, destaque, limit = 50, offset = 0 } = req.query;
  try {
    let query = supabase.from('artigos')
      .select('*, categorias_conteudo(nome), administradores(nome)')
      .order('criado_em', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (estado)      query = query.eq('estado', estado);
    if (categoria_id) query = query.eq('categoria_id', parseInt(categoria_id));
    if (destaque !== undefined) query = query.eq('destaque', destaque === 'true' || destaque === '1');

    const { data, error } = await query;
    if (error) throw error;
    const artigos = (data || []).map(({ categorias_conteudo: cat, administradores: aut, ...a }) => ({
      ...a, categoria_nome: cat?.nome, autor_nome: aut?.nome,
    }));
    res.json({ artigos });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/artigos/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('artigos')
      .select('*, categorias_conteudo(nome), administradores(nome)')
      .eq('id', parseInt(req.params.id))
      .single();
    if (error || !data) return res.status(404).json({ error: 'Artigo não encontrado.' });
    const { categorias_conteudo: cat, administradores: aut, ...artigo } = data;
    res.json({ ...artigo, categoria_nome: cat?.nome, autor_nome: aut?.nome });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/artigos', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { titulo, titulo_en, slug, resumo, resumo_en, conteudo, conteudo_en,
          categoria_id, imagem_destaque, tags, estado, destaque } = req.body;

  if (!titulo || !conteudo)       return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });
  if (!titulo_en || !conteudo_en) return res.status(400).json({ error: 'Título e conteúdo em inglês são obrigatórios.' });

  try {
    const slugFinal = slug || titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { data: artigo, error } = await supabase.from('artigos').insert({
      titulo, titulo_en, slug: slugFinal, resumo: resumo || null, resumo_en: resumo_en || null,
      conteudo, conteudo_en, categoria_id: categoria_id || null, autor_id: req.admin.id,
      imagem_destaque: imagem_destaque || null, tags: tags || null,
      estado: estado || 'rascunho', destaque: destaque ? true : false,
      publicado_em: estado === 'publicado' ? new Date().toISOString() : null,
    }).select().single();
    if (error) throw error;
    await logAction(req.admin.id, 'CRIAR', 'artigo', artigo.id, `Artigo "${titulo}" criado`, req.ip);
    res.status(201).json({ success: true, artigo });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/artigos/:id', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { titulo, titulo_en, slug, resumo, resumo_en, conteudo, conteudo_en,
          categoria_id, imagem_destaque, tags, estado, destaque } = req.body;
  try {
    const updates = { actualizado_em: new Date().toISOString() };
    if (titulo            !== undefined) updates.titulo            = titulo;
    if (titulo_en         !== undefined) updates.titulo_en         = titulo_en;
    if (slug              !== undefined) updates.slug              = slug;
    if (resumo            !== undefined) updates.resumo            = resumo;
    if (resumo_en         !== undefined) updates.resumo_en         = resumo_en;
    if (conteudo          !== undefined) updates.conteudo          = conteudo;
    if (conteudo_en       !== undefined) updates.conteudo_en       = conteudo_en;
    if (categoria_id      !== undefined) updates.categoria_id      = categoria_id || null;
    if (imagem_destaque   !== undefined) updates.imagem_destaque   = imagem_destaque;
    if (tags              !== undefined) updates.tags              = tags;
    if (destaque          !== undefined) updates.destaque          = Boolean(destaque);
    if (estado !== undefined) {
      updates.estado = estado;
      if (estado === 'publicado') updates.publicado_em = new Date().toISOString();
    }

    const { data: artigo, error } = await supabase.from('artigos')
      .update(updates).eq('id', id).select().single();
    if (error || !artigo) return res.status(404).json({ error: 'Artigo não encontrado.' });
    await logAction(req.admin.id, 'EDITAR', 'artigo', id, `Artigo "${artigo.titulo}" editado`, req.ip);
    res.json({ success: true, artigo });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/artigos/:id', authMiddleware, requireLevel('super_admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const { data: artigo } = await supabase.from('artigos').select('titulo').eq('id', id).single();
    if (!artigo) return res.status(404).json({ error: 'Artigo não encontrado.' });
    await supabase.from('artigos').delete().eq('id', id);
    await logAction(req.admin.id, 'ELIMINAR', 'artigo', id, `Artigo "${artigo.titulo}" eliminado`, req.ip);
    res.json({ success: true, message: 'Artigo eliminado.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE CONTEÚDO — CATEGORIAS
// ════════════════════════════════════════════════════════════

router.get('/categorias', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('categorias_conteudo').select('*').order('nome');
    if (error) throw error;
    res.json({ categorias: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/categorias', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { nome, slug, descricao } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório.' });
  try {
    const slugFinal = slug || nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { data: categoria, error } = await supabase.from('categorias_conteudo')
      .insert({ nome, slug: slugFinal, descricao: descricao || null }).select().single();
    if (error) throw error;
    await logAction(req.admin.id, 'CRIAR', 'categoria', categoria.id, `Categoria "${nome}" criada`, req.ip);
    res.status(201).json({ success: true, categoria });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE CONTEÚDO — ANÚNCIOS
// ════════════════════════════════════════════════════════════

router.get('/anuncios', authMiddleware, async (req, res) => {
  const { activo, tipo, limit = 50, offset = 0 } = req.query;
  try {
    let query = supabase.from('anuncios')
      .select('*, administradores(nome)')
      .order('criado_em', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    if (activo !== undefined) query = query.eq('activo', activo === 'true' || activo === '1');
    if (tipo)                 query = query.eq('tipo', tipo);
    const { data, error } = await query;
    if (error) throw error;
    const anuncios = (data || []).map(({ administradores: a, ...n }) => ({ ...n, criado_por_nome: a?.nome }));
    res.json({ anuncios });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/anuncios', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { titulo, titulo_en, mensagem, mensagem_en, tipo, link_url, link_texto, link_texto_en, activo, data_inicio, data_fim } = req.body;
  if (!titulo || !mensagem)       return res.status(400).json({ error: 'Título e mensagem são obrigatórios.' });
  if (!titulo_en || !mensagem_en) return res.status(400).json({ error: 'Título e mensagem em inglês são obrigatórios.' });
  try {
    const { data: anuncio, error } = await supabase.from('anuncios').insert({
      titulo, titulo_en, mensagem, mensagem_en, tipo: tipo || 'info',
      link_url: link_url || null, link_texto: link_texto || null, link_texto_en: link_texto_en || null,
      activo: activo !== undefined ? Boolean(activo) : true,
      data_inicio: data_inicio ? new Date(data_inicio).toISOString() : new Date().toISOString(),
      data_fim: data_fim ? new Date(data_fim).toISOString() : null,
      criado_por: req.admin.id,
    }).select().single();
    if (error) throw error;
    await logAction(req.admin.id, 'CRIAR', 'anuncio', anuncio.id, `Anúncio "${titulo}" criado`, req.ip);
    res.status(201).json({ success: true, anuncio });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/anuncios/:id', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { titulo, titulo_en, mensagem, mensagem_en, tipo, link_url, link_texto, link_texto_en, activo, data_inicio, data_fim } = req.body;
  try {
    const updates = {};
    if (titulo      !== undefined) updates.titulo      = titulo;
    if (titulo_en   !== undefined) updates.titulo_en   = titulo_en;
    if (mensagem    !== undefined) updates.mensagem    = mensagem;
    if (mensagem_en !== undefined) updates.mensagem_en = mensagem_en;
    if (tipo        !== undefined) updates.tipo        = tipo;
    if (link_url    !== undefined) updates.link_url    = link_url;
    if (link_texto  !== undefined) updates.link_texto  = link_texto;
    if (link_texto_en !== undefined) updates.link_texto_en = link_texto_en;
    if (activo      !== undefined) updates.activo      = Boolean(activo);
    if (data_inicio !== undefined) updates.data_inicio = new Date(data_inicio).toISOString();
    if (data_fim    !== undefined) updates.data_fim    = data_fim ? new Date(data_fim).toISOString() : null;

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nenhum campo para actualizar.' });

    const { data: anuncio, error } = await supabase.from('anuncios')
      .update(updates).eq('id', id).select().single();
    if (error || !anuncio) return res.status(404).json({ error: 'Anúncio não encontrado.' });
    await logAction(req.admin.id, 'EDITAR', 'anuncio', id, `Anúncio "${anuncio.titulo}" editado`, req.ip);
    res.json({ success: true, anuncio });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/anuncios/:id', authMiddleware, requireLevel('super_admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const { data: anuncio } = await supabase.from('anuncios').select('titulo').eq('id', id).single();
    if (!anuncio) return res.status(404).json({ error: 'Anúncio não encontrado.' });
    await supabase.from('anuncios').delete().eq('id', id);
    await logAction(req.admin.id, 'ELIMINAR', 'anuncio', id, `Anúncio "${anuncio.titulo}" eliminado`, req.ip);
    res.json({ success: true, message: 'Anúncio eliminado.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE CONTEÚDO — FAQ
// ════════════════════════════════════════════════════════════

router.get('/faq', authMiddleware, async (req, res) => {
  const { categoria, activo } = req.query;
  try {
    let query = supabase.from('faq').select('*').order('ordem').order('criado_em', { ascending: false });
    if (categoria)           query = query.eq('categoria', categoria);
    if (activo !== undefined) query = query.eq('activo', activo === 'true' || activo === '1');
    const { data, error } = await query;
    if (error) throw error;
    res.json({ faq: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/faq', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { pergunta, resposta, categoria, ordem, activo } = req.body;
  if (!pergunta || !resposta) return res.status(400).json({ error: 'Pergunta e resposta são obrigatórios.' });
  try {
    const { data: faq, error } = await supabase.from('faq').insert({
      pergunta, resposta, categoria: categoria || null,
      ordem: ordem || 0, activo: activo !== undefined ? Boolean(activo) : true,
    }).select().single();
    if (error) throw error;
    await logAction(req.admin.id, 'CRIAR', 'faq', faq.id, `FAQ criado: "${pergunta}"`, req.ip);
    res.status(201).json({ success: true, faq });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/faq/:id', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { pergunta, resposta, categoria, ordem, activo } = req.body;
  try {
    const updates = {};
    if (pergunta  !== undefined) updates.pergunta  = pergunta;
    if (resposta  !== undefined) updates.resposta  = resposta;
    if (categoria !== undefined) updates.categoria = categoria;
    if (ordem     !== undefined) updates.ordem     = ordem;
    if (activo    !== undefined) updates.activo    = Boolean(activo);
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nenhum campo para actualizar.' });
    const { data: faq, error } = await supabase.from('faq').update(updates).eq('id', id).select().single();
    if (error || !faq) return res.status(404).json({ error: 'FAQ não encontrado.' });
    await logAction(req.admin.id, 'EDITAR', 'faq', id, `FAQ editado`, req.ip);
    res.json({ success: true, faq });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/faq/:id', authMiddleware, requireLevel('super_admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await supabase.from('faq').delete().eq('id', id);
    await logAction(req.admin.id, 'ELIMINAR', 'faq', id, `FAQ eliminado`, req.ip);
    res.json({ success: true, message: 'FAQ eliminado.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE CONTEÚDO — PROJECTOS
// ════════════════════════════════════════════════════════════

router.get('/projectos', authMiddleware, async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  try {
    let query = supabase.from('projectos').select('*')
      .order('criado_em', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ projectos: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/projectos', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const {
    nome, nome_en, descricao, descricao_en, fileira, investimento_usd, hectares,
    produtores_capacitar, capacidade_anual_t, ano_inicio, ano_conclusao, status,
    coordenador, telefone_coordenador, email_coordenador, provincias, tecnologias,
    mercados_exportacao, logo_emoji, cor_tema,
  } = req.body;

  if (!nome || !descricao || !nome_en || !descricao_en)
    return res.status(400).json({ error: 'Nome e descrição em português e inglês são obrigatórios.' });

  try {
    const { data: projecto, error } = await supabase.from('projectos').insert({
      nome, nome_en, descricao, descricao_en, fileira: fileira || '',
      investimento_usd: investimento_usd || 0, hectares: hectares || 0,
      produtores_capacitar: produtores_capacitar || 0, capacidade_anual_t: capacidade_anual_t || 0,
      ano_inicio: ano_inicio || new Date().getFullYear(),
      ano_conclusao: ano_conclusao || new Date().getFullYear() + 3,
      status: status || 'em_planeamento',
      coordenador: coordenador || null, telefone_coordenador: telefone_coordenador || null,
      email_coordenador: email_coordenador || null, provincias: provincias || null,
      tecnologias: tecnologias || null, mercados_exportacao: mercados_exportacao || null,
      logo_emoji: logo_emoji || '📋', cor_tema: cor_tema || '#C49A3C',
    }).select().single();

    if (error) throw error;
    await logAction(req.admin.id, 'CRIAR', 'projecto', projecto.id, `Projecto criado: "${nome}"`, req.ip);
    res.status(201).json({ success: true, projecto });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/projectos/:id', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const {
    nome, nome_en, descricao, descricao_en, fileira, investimento_usd, hectares,
    produtores_capacitar, capacidade_anual_t, ano_inicio, ano_conclusao, status,
    coordenador, telefone_coordenador, email_coordenador, provincias, tecnologias,
    mercados_exportacao, logo_emoji, cor_tema,
  } = req.body;

  try {
    const updates = { actualizado_em: new Date().toISOString() };
    if (nome                !== undefined) updates.nome                = nome;
    if (nome_en             !== undefined) updates.nome_en             = nome_en;
    if (descricao           !== undefined) updates.descricao           = descricao;
    if (descricao_en        !== undefined) updates.descricao_en        = descricao_en;
    if (fileira             !== undefined) updates.fileira             = fileira;
    if (investimento_usd    !== undefined) updates.investimento_usd    = investimento_usd;
    if (hectares            !== undefined) updates.hectares            = hectares;
    if (produtores_capacitar !== undefined) updates.produtores_capacitar = produtores_capacitar;
    if (capacidade_anual_t  !== undefined) updates.capacidade_anual_t  = capacidade_anual_t;
    if (ano_inicio          !== undefined) updates.ano_inicio          = ano_inicio;
    if (ano_conclusao       !== undefined) updates.ano_conclusao       = ano_conclusao;
    if (status              !== undefined) updates.status              = status;
    if (coordenador         !== undefined) updates.coordenador         = coordenador;
    if (telefone_coordenador !== undefined) updates.telefone_coordenador = telefone_coordenador;
    if (email_coordenador   !== undefined) updates.email_coordenador   = email_coordenador;
    if (provincias          !== undefined) updates.provincias          = provincias;
    if (tecnologias         !== undefined) updates.tecnologias         = tecnologias;
    if (mercados_exportacao !== undefined) updates.mercados_exportacao = mercados_exportacao;
    if (logo_emoji          !== undefined) updates.logo_emoji          = logo_emoji;
    if (cor_tema            !== undefined) updates.cor_tema            = cor_tema;

    if (Object.keys(updates).length === 1) return res.status(400).json({ error: 'Nenhum campo para actualizar.' });

    const { data: projecto, error } = await supabase.from('projectos')
      .update(updates).eq('id', id).select().single();
    if (error || !projecto) return res.status(404).json({ error: 'Projecto não encontrado.' });
    await logAction(req.admin.id, 'EDITAR', 'projecto', id, `Projecto editado`, req.ip);
    res.json({ success: true, projecto });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/projectos/:id', authMiddleware, requireLevel('super_admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await supabase.from('projectos').delete().eq('id', id);
    await logAction(req.admin.id, 'ELIMINAR', 'projecto', id, `Projecto eliminado`, req.ip);
    res.json({ success: true, message: 'Projecto eliminado.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  FOTOS DE PROJECTOS (Supabase Storage)
// ════════════════════════════════════════════════════════════

router.get('/projectos/:id/fotos', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('projecto_fotos')
      .select('id, url_path, filename, ordem')
      .eq('projecto_id', parseInt(req.params.id))
      .order('ordem').order('id');
    if (error) throw error;
    res.json({ fotos: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/projectos/:id/fotos', authMiddleware, requireLevel('admin', 'super_admin'),
  (req, res, next) => {
    uploadFotos.array('fotos', 10)(req, res, err => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  async (req, res) => {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: 'Nenhum ficheiro enviado.' });

    const projectoId = parseInt(req.params.id);

    try {
      const { count } = await supabase.from('projecto_fotos')
        .select('id', { count: 'exact', head: true })
        .eq('projecto_id', projectoId);

      if ((count || 0) + req.files.length > 10)
        return res.status(400).json({ error: `Limite de 10 fotos excedido. Já existem ${count} fotos.` });

      const inserted = [];
      for (const file of req.files) {
        const ext      = path.extname(file.originalname).toLowerCase();
        const filename = `foto_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
        const storagePath = `${projectoId}/${filename}`;

        const { error: uploadErr } = await supabase.storage
          .from('projectos')
          .upload(storagePath, file.buffer, { contentType: file.mimetype });

        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage.from('projectos').getPublicUrl(storagePath);

        const { data: row, error: dbErr } = await supabase.from('projecto_fotos')
          .insert({ projecto_id: projectoId, filename, url_path: publicUrl })
          .select().single();
        if (dbErr) throw dbErr;
        inserted.push(row);
      }

      await logAction(req.admin.id, 'UPLOAD', 'projecto_fotos', projectoId, `${req.files.length} foto(s) adicionada(s)`, req.ip);
      res.status(201).json({ success: true, fotos: inserted });
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
);

router.delete('/projectos/:id/fotos/:fotoId', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const projectoId = parseInt(req.params.id);
  const fotoId     = parseInt(req.params.fotoId);
  try {
    const { data: foto } = await supabase.from('projecto_fotos')
      .select('filename').eq('id', fotoId).eq('projecto_id', projectoId).single();

    if (!foto) return res.status(404).json({ error: 'Foto não encontrada.' });

    await supabase.storage.from('projectos').remove([`${projectoId}/${foto.filename}`]);
    await supabase.from('projecto_fotos').delete().eq('id', fotoId);

    await logAction(req.admin.id, 'ELIMINAR', 'projecto_fotos', fotoId, `Foto eliminada do projecto ${projectoId}`, req.ip);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE CONTEÚDO — MEDIA
// ════════════════════════════════════════════════════════════

router.get('/media', authMiddleware, async (req, res) => {
  const { tipo, limit = 50, offset = 0 } = req.query;
  try {
    let query = supabase.from('media')
      .select('*, administradores(nome)')
      .order('criado_em', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    if (tipo) query = query.eq('tipo', tipo);
    const { data, error } = await query;
    if (error) throw error;
    const media = (data || []).map(({ administradores: a, ...m }) => ({ ...m, upload_por_nome: a?.nome }));
    res.json({ media });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/media', authMiddleware, async (req, res) => {
  const { titulo, descricao, tipo, url, tamanho_kb, mime_type } = req.body;
  if (!titulo || !tipo || !url) return res.status(400).json({ error: 'Título, tipo e URL são obrigatórios.' });
  try {
    const { data: media, error } = await supabase.from('media').insert({
      titulo, descricao: descricao || null, tipo, url,
      tamanho_kb: tamanho_kb || null, mime_type: mime_type || null,
      upload_por: req.admin.id,
    }).select().single();
    if (error) throw error;
    await logAction(req.admin.id, 'UPLOAD', 'media', media.id, `Media "${titulo}" adicionado`, req.ip);
    res.status(201).json({ success: true, media });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/media/:id', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const { data: media } = await supabase.from('media').select('titulo').eq('id', id).single();
    if (!media) return res.status(404).json({ error: 'Media não encontrado.' });
    await supabase.from('media').delete().eq('id', id);
    await logAction(req.admin.id, 'ELIMINAR', 'media', id, `Media "${media.titulo}" eliminado`, req.ip);
    res.json({ success: true, message: 'Media eliminado.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE FILEIRAS
// ════════════════════════════════════════════════════════════

router.get('/fileiras', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('fileiras').select('*').order('ordem').order('id');
    if (error) throw error;
    res.json({ fileiras: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/fileiras', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const {
    nome_pt, nome_en, nome_latin, icone,
    descricao_pt, descricao_en, descricao_detalhada_pt, descricao_detalhada_en,
    stat1_valor, stat1_label_pt, stat1_label_en,
    stat2_valor, stat2_label_pt, stat2_label_en,
    provincias, mercados, cor_tema, ordem, activo,
  } = req.body;

  if (!nome_pt) return res.status(400).json({ error: 'Nome em português é obrigatório.' });

  try {
    const { data: fileira, error } = await supabase.from('fileiras').insert({
      nome_pt, nome_en: nome_en || nome_pt, nome_latin: nome_latin || null,
      icone: icone || '🌿',
      descricao_pt: descricao_pt || null, descricao_en: descricao_en || null,
      descricao_detalhada_pt: descricao_detalhada_pt || null,
      descricao_detalhada_en: descricao_detalhada_en || null,
      stat1_valor: stat1_valor || null, stat1_label_pt: stat1_label_pt || null, stat1_label_en: stat1_label_en || null,
      stat2_valor: stat2_valor || null, stat2_label_pt: stat2_label_pt || null, stat2_label_en: stat2_label_en || null,
      provincias: provincias || null, mercados: mercados || null,
      cor_tema: cor_tema || '#C49A3C', ordem: ordem != null ? parseInt(ordem) : 0,
      activo: activo !== undefined ? Boolean(activo) : true,
    }).select().single();

    if (error) throw error;
    await logAction(req.admin.id, 'CRIAR', 'fileira', fileira.id, `Fileira "${nome_pt}" criada`, req.ip);
    res.status(201).json({ success: true, fileira });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/fileiras/:id', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const {
    nome_pt, nome_en, nome_latin, icone,
    descricao_pt, descricao_en, descricao_detalhada_pt, descricao_detalhada_en,
    stat1_valor, stat1_label_pt, stat1_label_en,
    stat2_valor, stat2_label_pt, stat2_label_en,
    provincias, mercados, cor_tema, ordem, activo,
  } = req.body;

  try {
    const updates = { actualizado_em: new Date().toISOString() };
    if (nome_pt                !== undefined) updates.nome_pt                = nome_pt;
    if (nome_en                !== undefined) updates.nome_en                = nome_en;
    if (nome_latin             !== undefined) updates.nome_latin             = nome_latin;
    if (icone                  !== undefined) updates.icone                  = icone;
    if (descricao_pt           !== undefined) updates.descricao_pt           = descricao_pt;
    if (descricao_en           !== undefined) updates.descricao_en           = descricao_en;
    if (descricao_detalhada_pt !== undefined) updates.descricao_detalhada_pt = descricao_detalhada_pt;
    if (descricao_detalhada_en !== undefined) updates.descricao_detalhada_en = descricao_detalhada_en;
    if (stat1_valor            !== undefined) updates.stat1_valor            = stat1_valor;
    if (stat1_label_pt         !== undefined) updates.stat1_label_pt         = stat1_label_pt;
    if (stat1_label_en         !== undefined) updates.stat1_label_en         = stat1_label_en;
    if (stat2_valor            !== undefined) updates.stat2_valor            = stat2_valor;
    if (stat2_label_pt         !== undefined) updates.stat2_label_pt         = stat2_label_pt;
    if (stat2_label_en         !== undefined) updates.stat2_label_en         = stat2_label_en;
    if (provincias             !== undefined) updates.provincias             = provincias;
    if (mercados               !== undefined) updates.mercados               = mercados;
    if (cor_tema               !== undefined) updates.cor_tema               = cor_tema;
    if (ordem                  !== undefined) updates.ordem                  = parseInt(ordem);
    if (activo                 !== undefined) updates.activo                 = Boolean(activo);

    if (Object.keys(updates).length === 1) return res.status(400).json({ error: 'Nenhum campo para actualizar.' });

    const { data: fileira, error } = await supabase.from('fileiras')
      .update(updates).eq('id', id).select().single();
    if (error || !fileira) return res.status(404).json({ error: 'Fileira não encontrada.' });
    await logAction(req.admin.id, 'EDITAR', 'fileira', id, `Fileira "${fileira.nome_pt}" editada`, req.ip);
    res.json({ success: true, fileira });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/fileiras/:id', authMiddleware, requireLevel('super_admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const { data: fileira } = await supabase.from('fileiras').select('nome_pt').eq('id', id).single();
    if (!fileira) return res.status(404).json({ error: 'Fileira não encontrada.' });
    await supabase.from('fileiras').delete().eq('id', id);
    await logAction(req.admin.id, 'ELIMINAR', 'fileira', id, `Fileira "${fileira.nome_pt}" eliminada`, req.ip);
    res.json({ success: true, message: 'Fileira eliminada.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  KPIs HOMEPAGE
// ════════════════════════════════════════════════════════════

router.get('/kpis', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('kpis_homepage').select('*').order('ordem');
    if (error) throw error;
    res.json({ kpis: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/kpis/:chave', authMiddleware, requireLevel('admin', 'super_admin'), async (req, res) => {
  const { chave } = req.params;
  const { valor_num, sufixo, label_pt, label_en } = req.body;
  try {
    const updates = { actualizado_em: new Date().toISOString() };
    if (valor_num !== undefined) updates.valor_num = parseFloat(valor_num);
    if (sufixo    !== undefined) updates.sufixo    = sufixo || null;
    if (label_pt  !== undefined) updates.label_pt  = label_pt;
    if (label_en  !== undefined) updates.label_en  = label_en;
    if (Object.keys(updates).length === 1) return res.status(400).json({ error: 'Nenhum campo para actualizar.' });

    const { data: kpi, error } = await supabase.from('kpis_homepage')
      .update(updates).eq('chave', chave).select().single();
    if (error || !kpi) return res.status(404).json({ error: 'KPI não encontrado.' });
    await logAction(req.admin.id, 'EDITAR', 'kpi_homepage', null, `KPI "${chave}" actualizado`, req.ip);
    res.json({ success: true, kpi });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
