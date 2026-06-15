require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const path        = require('path');
const supabase    = require('./supabase');
const adminRoutes = require('./admin-routes');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api/admin', adminRoutes);

// ── Helpers ──────────────────────────────────────────────────
function refCode(prefix) {
  return `${prefix}-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;
}

function generateResetToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token;
}

// ════════════════════════════════════════════════════════════
//  AUTH — PRODUTORES
// ════════════════════════════════════════════════════════════

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { nbi, pin } = req.body;
  if (!nbi || !pin) return res.status(400).json({ error: 'NBI e PIN são obrigatórios.' });
  try {
    const nbiUpper = nbi.trim().toUpperCase();
    const syntheticEmail = `${nbi.trim().toLowerCase()}@inca.ao`;

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password: pin
    });

    if (authError) {
      const { data: prod } = await supabase.from('produtores').select('activo').eq('nbi', nbiUpper).single();
      if (prod && !prod.activo) return res.status(401).json({ error: 'Conta inactiva. Aguarda aprovação pelo INCA.' });
      return res.status(401).json({ error: 'NBI não encontrado ou PIN incorrecto.' });
    }

    const { data: produtor, error: dbErr } = await supabase
      .from('produtores')
      .select('id, nome, nbi, provincia, fileira, activo')
      .eq('nbi', nbiUpper)
      .single();

    if (dbErr || !produtor) return res.status(401).json({ error: 'Produtor não encontrado.' });
    if (!produtor.activo) return res.status(401).json({ error: 'Conta inactiva. Aguarda aprovação pelo INCA.' });

    const pid = produtor.id;
    const [parcelas, lotes, certPend, pedAnali] = await Promise.all([
      supabase.from('parcelas').select('id', { count: 'exact', head: true }).eq('produtor_id', pid),
      supabase.from('lotes').select('id', { count: 'exact', head: true }).eq('produtor_id', pid),
      supabase.from('certificados').select('id', { count: 'exact', head: true }).eq('produtor_id', pid).eq('estado', 'pendente'),
      supabase.from('pedidos_apoio').select('id', { count: 'exact', head: true }).eq('produtor_id', pid).eq('estado', 'em_analise'),
    ]);

    res.json({
      success: true,
      produtor: { id: produtor.id, nome: produtor.nome, nbi: produtor.nbi, provincia: produtor.provincia, fileira: produtor.fileira },
      stats: { parcelas: parcelas.count, lotes: lotes.count, certPend: certPend.count, pedAnali: pedAnali.count },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/registar
app.post('/api/registar', async (req, res) => {
  const { nome, nbi, telefone, email, pin } = req.body;
  if (!nome || !nbi || !pin) return res.status(400).json({ error: 'Nome, NBI e PIN são obrigatórios.' });
  if (pin.length < 6) return res.status(400).json({ error: 'PIN deve ter mínimo 6 caracteres.' });
  try {
    const nbiUpper = nbi.trim().toUpperCase();
    const syntheticEmail = `${nbi.trim().toLowerCase()}@inca.ao`;

    const { data: existing } = await supabase.from('produtores').select('id').eq('nbi', nbiUpper).maybeSingle();
    if (existing) return res.status(409).json({ error: 'Este NBI já está registado.' });

    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: syntheticEmail,
      password: pin,
      email_confirm: true,
      user_metadata: { nbi: nbiUpper, tipo: 'produtor' }
    });
    if (authErr) return res.status(500).json({ error: authErr.message });

    const { error: dbErr } = await supabase.from('produtores').insert({
      nome: nome.trim(),
      nbi: nbiUpper,
      telefone: telefone || null,
      email: email || null,
      auth_user_id: authUser.user.id,
      activo: false
    });

    if (dbErr) {
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return res.status(500).json({ error: dbErr.message });
    }

    res.status(201).json({ success: true, message: 'Conta criada. Aguarda validação pelo INCA (24–48h).' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  RESET DE SENHA
// ════════════════════════════════════════════════════════════

// POST /api/reset-solicitar
app.post('/api/reset-solicitar', async (req, res) => {
  const { nbi, email } = req.body;
  if (!nbi || !email) return res.status(400).json({ error: 'NBI e email são obrigatórios.' });
  try {
    const { data: produtor, error } = await supabase
      .from('produtores')
      .select('id, nome, email')
      .eq('nbi', nbi.trim().toUpperCase())
      .eq('email', email.trim().toLowerCase())
      .eq('activo', true)
      .maybeSingle();

    if (error || !produtor) return res.status(404).json({ error: 'NBI ou email não encontrados.' });

    const resetToken = generateResetToken();
    const expiresAt  = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('produtores')
      .update({ reset_token: resetToken, reset_expires: expiresAt })
      .eq('id', produtor.id);

    res.json({
      success: true,
      message: 'Instruções de reset enviadas para o email.',
      demoToken: resetToken,
      demoLink: `http://localhost:${PORT}/reset-confirmar.html?token=${resetToken}&nbi=${nbi}`
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/reset-confirmar
app.post('/api/reset-confirmar', async (req, res) => {
  const { token, nbi, novoPin } = req.body;
  if (!token || !nbi || !novoPin) return res.status(400).json({ error: 'Token, NBI e novo PIN são obrigatórios.' });
  if (novoPin.length < 6) return res.status(400).json({ error: 'O novo PIN deve ter pelo menos 6 caracteres.' });
  try {
    const { data: produtor } = await supabase
      .from('produtores')
      .select('id, auth_user_id, reset_token, reset_expires')
      .eq('nbi', nbi.trim().toUpperCase())
      .eq('reset_token', token)
      .eq('activo', true)
      .maybeSingle();

    if (!produtor) return res.status(404).json({ error: 'Token inválido ou expirado.' });

    if (new Date() > new Date(produtor.reset_expires)) {
      await supabase.from('produtores').update({ reset_token: null, reset_expires: null }).eq('id', produtor.id);
      return res.status(400).json({ error: 'Token expirado. Solicite um novo reset.' });
    }

    if (produtor.auth_user_id) {
      await supabase.auth.admin.updateUserById(produtor.auth_user_id, { password: novoPin });
    }

    await supabase.from('produtores')
      .update({ reset_token: null, reset_expires: null, actualizado_em: new Date().toISOString() })
      .eq('id', produtor.id);

    res.json({ success: true, message: 'PIN actualizado com sucesso! Pode fazer login com o novo PIN.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reset-verificar
app.get('/api/reset-verificar', async (req, res) => {
  const { token, nbi } = req.query;
  if (!token || !nbi) return res.status(400).json({ error: 'Token e NBI são obrigatórios.' });
  try {
    const { data: produtor } = await supabase
      .from('produtores')
      .select('reset_expires')
      .eq('nbi', nbi.trim().toUpperCase())
      .eq('reset_token', token)
      .eq('activo', true)
      .maybeSingle();

    if (!produtor) return res.status(404).json({ error: 'Token inválido.' });
    if (new Date() > new Date(produtor.reset_expires)) return res.status(400).json({ error: 'Token expirado.' });

    res.json({ success: true, message: 'Token válido.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  CADASTRO DE PRODUTOR
// ════════════════════════════════════════════════════════════

app.post('/api/produtores', async (req, res) => {
  const { produtor_id, nome, nbi, telefone, email, provincia,
          municipio, fileira, area_ha, tipo_produtor, latitude, longitude } = req.body;
  if (!nbi || !nome || !provincia || !fileira || !area_ha)
    return res.status(400).json({ error: 'Campos obrigatórios em falta.' });
  try {
    const nbiUpper = nbi.trim().toUpperCase();
    const { data: existing } = await supabase.from('produtores').select('id').eq('nbi', nbiUpper).maybeSingle();
    const updates = { nome, telefone: telefone || null, email: email || null, provincia, municipio: municipio || null,
                      fileira, area_ha: parseFloat(area_ha), tipo_produtor: tipo_produtor || 'Individual / Familiar' };

    let pid;
    if (existing) {
      await supabase.from('produtores').update(updates).eq('nbi', nbiUpper);
      pid = existing.id;
    } else {
      const { data: newP } = await supabase.from('produtores').insert({ ...updates, nbi: nbiUpper }).select('id').single();
      pid = newP?.id || produtor_id;
    }

    if (latitude && longitude && pid) {
      await supabase.from('parcelas').insert({
        produtor_id: pid, fileira, area_ha: parseFloat(area_ha),
        latitude: parseFloat(latitude), longitude: parseFloat(longitude)
      });
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
    const referencia = refCode('CERT');
    await supabase.from('certificados').insert({
      produtor_id: produtor_id || null, produto,
      quantidade_kg: parseFloat(quantidade), numero_lote: lote || null,
      pais_destino: destino, data_exportacao, referencia
    });
    res.status(201).json({ success: true, referencia });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  RASTREABILIDADE
// ════════════════════════════════════════════════════════════

app.get('/api/rastreio/:codigo', async (req, res) => {
  const codigo = req.params.codigo.trim().toUpperCase();
  try {
    const { data: lote, error } = await supabase.from('lotes').select('*').eq('codigo', codigo).single();
    if (error || !lote) return res.status(404).json({ error: 'Lote não encontrado.' });

    const { data: eventos } = await supabase.from('lote_eventos')
      .select('*').eq('lote_id', lote.id).order('data_evento', { ascending: true });

    res.json({ lote, eventos: eventos || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  PEDIDOS DE APOIO
// ════════════════════════════════════════════════════════════

app.post('/api/apoios', async (req, res) => {
  const { produtor_id, tipo, fileira, valor_estimado, descricao } = req.body;
  if (!tipo || !fileira || !descricao) return res.status(400).json({ error: 'Campos obrigatórios em falta.' });
  try {
    const referencia = refCode('APOIO');
    await supabase.from('pedidos_apoio').insert({
      produtor_id: produtor_id || null, tipo, fileira,
      valor_estimado: valor_estimado ? parseFloat(valor_estimado) : null,
      descricao, referencia
    });
    res.status(201).json({ success: true, referencia });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  ESTATÍSTICAS
// ════════════════════════════════════════════════════════════

app.get('/api/estatisticas', async (req, res) => {
  const tipo = req.query.tipo || 'producao';
  try {
    if (tipo === 'producao') {
      const [fileiras, provincias] = await Promise.all([
        supabase.rpc('get_producao_por_fileira'),
        supabase.rpc('get_producao_por_provincia'),
      ]);
      return res.json({ fileiras: fileiras.data || [], provincias: provincias.data || [] });
    }
    if (tipo === 'exportacao') {
      const [destinos, porFileira] = await Promise.all([
        supabase.rpc('get_exportacao_por_destino'),
        supabase.rpc('get_exportacao_por_fileira'),
      ]);
      return res.json({ destinos: destinos.data || [], porFileira: porFileira.data || [] });
    }
    if (tipo === 'precos') {
      const { data } = await supabase.from('precos_mercado').select('*').order('atualizado_em', { ascending: false });
      return res.json(data || []);
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
    let query = supabase.from('artigos')
      .select('id, titulo, slug, resumo, imagem_destaque, tags, publicado_em, visualizacoes, categorias_conteudo(nome, slug)')
      .eq('estado', 'publicado')
      .order('publicado_em', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (categoria) query = query.eq('categorias_conteudo.slug', categoria);
    if (destaque !== undefined) query = query.eq('destaque', destaque === 'true' || destaque === '1');

    const { data, error } = await query;
    if (error) throw error;

    const artigos = (data || []).map(({ categorias_conteudo: cat, ...a }) => ({
      ...a,
      categoria_nome: cat?.nome,
      categoria_slug: cat?.slug,
    }));

    res.json({ artigos });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/artigos/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const { data, error } = await supabase.from('artigos')
      .select('*, categorias_conteudo(nome, slug)')
      .eq('slug', slug)
      .eq('estado', 'publicado')
      .single();

    if (error || !data) return res.status(404).json({ error: 'Artigo não encontrado.' });

    await supabase.from('artigos').update({ visualizacoes: (data.visualizacoes || 0) + 1 }).eq('slug', slug);

    const { categorias_conteudo: cat, ...artigo } = data;
    res.json({ ...artigo, categoria_nome: cat?.nome, categoria_slug: cat?.slug });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/anuncios/activos', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('anuncios')
      .select('id, titulo, mensagem, tipo, link_url, link_texto, data_inicio, data_fim')
      .eq('activo', true)
      .lte('data_inicio', now)
      .or(`data_fim.is.null,data_fim.gte.${now}`);

    if (error) throw error;

    const typeOrder = { urgente: 1, aviso: 2, sucesso: 3, info: 4 };
    const sorted = (data || []).sort((a, b) =>
      (typeOrder[a.tipo] || 4) - (typeOrder[b.tipo] || 4) ||
      new Date(b.data_inicio) - new Date(a.data_inicio)
    );

    res.json({ anuncios: sorted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/faq', async (req, res) => {
  const { categoria } = req.query;
  try {
    let query = supabase.from('faq').select('id, pergunta, resposta, categoria').eq('activo', true).order('ordem').order('criado_em', { ascending: false });
    if (categoria) query = query.eq('categoria', categoria);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ faq: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/homepage-stats', async (req, res) => {
  try {
    const { data, error } = await supabase.from('kpis_homepage')
      .select('chave, valor_num, sufixo, label_pt, label_en')
      .order('ordem');
    if (error) throw error;
    res.json({ kpis: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/fileiras', async (req, res) => {
  try {
    const { data, error } = await supabase.from('fileiras')
      .select('*').eq('activo', true).order('ordem').order('id');
    if (error) throw error;
    res.json({ fileiras: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  GESTÃO DE PRODUTORES
// ════════════════════════════════════════════════════════════

app.get('/api/produtores/id/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('produtores')
      .select('id, nome, nbi, telefone, email, provincia, municipio, fileira, area_ha, tipo_produtor, activo, criado_em')
      .eq('id', parseInt(req.params.id))
      .single();
    if (error || !data) return res.status(404).json({ error: 'Produtor não encontrado.' });
    res.json({ produtor: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/produtores/:nbi', async (req, res) => {
  try {
    const { data, error } = await supabase.from('produtores')
      .select('id, nome, nbi, telefone, email, provincia, municipio, fileira, area_ha, tipo_produtor, activo, criado_em')
      .eq('nbi', req.params.nbi.trim().toUpperCase())
      .single();
    if (error || !data) return res.status(404).json({ error: 'Produtor não encontrado.' });
    res.json({ produtor: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/produtores/:id', async (req, res) => {
  const { nome, telefone, email, provincia, municipio, fileira, area_ha, tipo_produtor } = req.body;
  try {
    await supabase.from('produtores').update({
      nome, telefone: telefone || null, email: email || null, provincia,
      municipio: municipio || null, fileira, area_ha: parseFloat(area_ha),
      tipo_produtor: tipo_produtor || 'Individual / Familiar',
      actualizado_em: new Date().toISOString()
    }).eq('id', parseInt(req.params.id));
    res.json({ success: true, message: 'Produtor atualizado com sucesso.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/produtores/:id/parcelas', async (req, res) => {
  try {
    const { data, error } = await supabase.from('parcelas')
      .select('id, fileira, area_ha, latitude, longitude, criado_em')
      .eq('produtor_id', parseInt(req.params.id))
      .order('criado_em', { ascending: false });
    if (error) throw error;
    res.json({ parcelas: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/produtores/:id/parcelas', async (req, res) => {
  const { fileira, area_ha, latitude, longitude } = req.body;
  if (!fileira) return res.status(400).json({ error: 'Fileira é obrigatória.' });
  const toDecimal = v => (v != null && !isNaN(parseFloat(v))) ? parseFloat(v) : null;
  try {
    await supabase.from('parcelas').insert({
      produtor_id: parseInt(req.params.id), fileira,
      area_ha: toDecimal(area_ha), latitude: toDecimal(latitude), longitude: toDecimal(longitude)
    });
    res.status(201).json({ success: true, message: 'Parcela registada com sucesso.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/produtores/:id/parcelas/:parcelaId', async (req, res) => {
  try {
    await supabase.from('parcelas')
      .delete()
      .eq('produtor_id', parseInt(req.params.id))
      .eq('id', parseInt(req.params.parcelaId));
    res.json({ success: true, message: 'Parcela removida com sucesso.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/produtores/:id/parcelas/:parcelaId', async (req, res) => {
  const { fileira, area_ha, latitude, longitude } = req.body;
  try {
    await supabase.from('parcelas').update({
      fileira, area_ha: parseFloat(area_ha),
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
    }).eq('produtor_id', parseInt(req.params.id)).eq('id', parseInt(req.params.parcelaId));
    res.json({ success: true, message: 'Parcela actualizada com sucesso.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  CERTIFICADOS (CRUD)
// ════════════════════════════════════════════════════════════

app.get('/api/certificados', async (req, res) => {
  const { produtor_id, estado, referencia } = req.query;
  try {
    let query = supabase.from('certificados').select('*, produtores(nome)').order('criado_em', { ascending: false });
    if (produtor_id) query = query.eq('produtor_id', parseInt(produtor_id));
    if (estado)      query = query.eq('estado', estado);
    if (referencia)  query = query.eq('referencia', referencia);
    const { data, error } = await query;
    if (error) throw error;
    const certificados = (data || []).map(({ produtores: p, ...c }) => ({ ...c, produtor_nome: p?.nome }));
    res.json({ certificados });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/certificados/:referencia', async (req, res) => {
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

app.put('/api/certificados/:id', async (req, res) => {
  const { estado, observacoes } = req.body;
  if (!estado || !['pendente','emitido','rejeitado'].includes(estado))
    return res.status(400).json({ error: 'Estado inválido.' });
  try {
    await supabase.from('certificados').update({ estado, observacoes: observacoes || null }).eq('id', parseInt(req.params.id));
    res.json({ success: true, message: 'Certificado atualizado com sucesso.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  PEDIDOS DE APOIO (CRUD)
// ════════════════════════════════════════════════════════════

app.get('/api/apoios', async (req, res) => {
  const { produtor_id, estado, tipo, fileira } = req.query;
  try {
    let query = supabase.from('pedidos_apoio').select('*, produtores(nome)').order('criado_em', { ascending: false });
    if (produtor_id) query = query.eq('produtor_id', parseInt(produtor_id));
    if (estado)      query = query.eq('estado', estado);
    if (tipo)        query = query.eq('tipo', tipo);
    if (fileira)     query = query.eq('fileira', fileira);
    const { data, error } = await query;
    if (error) throw error;
    const apoios = (data || []).map(({ produtores: p, ...a }) => ({ ...a, produtor_nome: p?.nome }));
    res.json({ apoios });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/apoios/:referencia', async (req, res) => {
  try {
    const { data, error } = await supabase.from('pedidos_apoio')
      .select('*, produtores(nome, nbi)')
      .eq('referencia', req.params.referencia)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Pedido não encontrado.' });
    const { produtores: p, ...apoio } = data;
    res.json({ apoio: { ...apoio, produtor_nome: p?.nome, produtor_nbi: p?.nbi } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/apoios/:id', async (req, res) => {
  const { estado } = req.body;
  if (!estado || !['em_analise','aprovado','rejeitado'].includes(estado))
    return res.status(400).json({ error: 'Estado inválido.' });
  try {
    await supabase.from('pedidos_apoio').update({ estado }).eq('id', parseInt(req.params.id));
    res.json({ success: true, message: 'Pedido atualizado com sucesso.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  LOTES / RASTREABILIDADE
// ════════════════════════════════════════════════════════════

app.post('/api/lotes', async (req, res) => {
  const { produtor_id, fileira, produto, quantidade_kg, provincia, municipio, estado } = req.body;
  if (!fileira || !produto || !quantidade_kg || !provincia)
    return res.status(400).json({ error: 'Campos obrigatórios em falta.' });
  try {
    const codigo = refCode('LOTE');
    const { data: lote, error } = await supabase.from('lotes')
      .insert({ codigo, produtor_id: produtor_id || null, fileira, produto,
                quantidade_kg: parseFloat(quantidade_kg), provincia, municipio: municipio || null,
                estado: estado || 'colhido' })
      .select('id').single();
    if (error) throw error;

    await supabase.from('lote_eventos').insert({
      lote_id: lote.id, titulo: '🌱 Lote Registado',
      descricao: `Lote ${codigo} criado no sistema INCA`
    });

    res.status(201).json({ success: true, codigo, message: 'Lote registado com sucesso.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/lotes', async (req, res) => {
  const { produtor_id, fileira, estado, produto } = req.query;
  try {
    let query = supabase.from('lotes').select('*, produtores(nome)').order('criado_em', { ascending: false });
    if (produtor_id) query = query.eq('produtor_id', parseInt(produtor_id));
    if (fileira)     query = query.eq('fileira', fileira);
    if (estado)      query = query.eq('estado', estado);
    if (produto)     query = query.eq('produto', produto);
    const { data, error } = await query;
    if (error) throw error;
    const lotes = (data || []).map(({ produtores: p, ...l }) => ({ ...l, produtor_nome: p?.nome }));
    res.json({ lotes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/lotes/:id', async (req, res) => {
  const { estado } = req.body;
  if (!estado || !['colhido','em_processamento','pronto','exportado'].includes(estado))
    return res.status(400).json({ error: 'Estado inválido.' });
  try {
    const id = parseInt(req.params.id);
    await supabase.from('lotes').update({ estado }).eq('id', id);

    const tituloMap = {
      colhido: '☀️ Colheita', em_processamento: '⚙️ Processamento',
      pronto: '✅ Pronto para Exportação', exportado: '🚢 Exportado'
    };
    await supabase.from('lote_eventos').insert({
      lote_id: id, titulo: tituloMap[estado], descricao: `Estado atualizado para: ${estado}`
    });

    res.json({ success: true, message: 'Lote atualizado com sucesso.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/lote_eventos', async (req, res) => {
  const { lote_id, titulo, descricao, tipo } = req.body;
  if (!lote_id || !titulo) return res.status(400).json({ error: 'lote_id e titulo são obrigatórios.' });
  try {
    await supabase.from('lote_eventos').insert({
      lote_id: parseInt(lote_id), titulo, descricao: descricao || null, tipo: tipo || 'normal'
    });
    res.status(201).json({ success: true, message: 'Evento registado com sucesso.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  PREÇOS DE MERCADO
// ════════════════════════════════════════════════════════════

app.get('/api/precos', async (req, res) => {
  try {
    const { data, error } = await supabase.from('precos_mercado').select('*').order('atualizado_em', { ascending: false });
    if (error) throw error;
    res.json({ precos: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/precos', async (req, res) => {
  const { produto, preco_aoa_kg, preco_usd_kg, variacao_pct } = req.body;
  if (!produto || !preco_aoa_kg) return res.status(400).json({ error: 'Produto e preço AOA são obrigatórios.' });
  try {
    await supabase.from('precos_mercado').insert({
      produto, preco_aoa_kg: parseFloat(preco_aoa_kg),
      preco_usd_kg: preco_usd_kg ? parseFloat(preco_usd_kg) : null,
      variacao_pct: variacao_pct ? parseFloat(variacao_pct) : null
    });
    res.status(201).json({ success: true, message: 'Preço registado com sucesso.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  PROJECTOS
// ════════════════════════════════════════════════════════════

app.get('/api/projectos', async (req, res) => {
  try {
    const { data, error } = await supabase.from('projectos')
      .select('id, nome, nome_en, descricao, descricao_en, fileira, investimento_usd, hectares, produtores_capacitar, capacidade_anual_t, ano_inicio, ano_conclusao, status, coordenador, telefone_coordenador, email_coordenador, provincias, tecnologias, mercados_exportacao, logo_emoji, cor_tema, criado_em, actualizado_em')
      .order('criado_em', { ascending: false });
    if (error) throw error;
    res.json({ projectos: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Atenção: rotas específicas ANTES de /:id para evitar conflito
app.get('/api/projectos/fotos', async (req, res) => {
  const { fileira, projeto_id } = req.query;
  try {
    let query = supabase.from('projecto_fotos').select('id, url_path, filename, ordem').order('ordem').order('id');
    if (projeto_id) {
      query = query.eq('projecto_id', parseInt(projeto_id));
    } else {
      const { data: projs } = await supabase.from('projectos').select('id').eq('fileira', fileira || '');
      const ids = (projs || []).map(p => p.id);
      if (ids.length === 0) return res.json({ fotos: [] });
      query = query.in('projecto_id', ids);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json({ fotos: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/projectos/estatisticas', async (req, res) => {
  try {
    const [stats, porFileira] = await Promise.all([
      supabase.rpc('get_projectos_estatisticas'),
      supabase.rpc('get_projectos_por_fileira'),
    ]);
    res.json({ ...(stats.data?.[0] || {}), por_fileira: porFileira.data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/projectos/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [projectRes, phasesRes, invRes, updRes] = await Promise.all([
      supabase.from('projectos')
        .select('id, nome, nome_en, descricao, descricao_en, fileira, investimento_usd, hectares, produtores_capacitar, capacidade_anual_t, ano_inicio, ano_conclusao, status, coordenador, telefone_coordenador, email_coordenador, provincias, tecnologias, mercados_exportacao, logo_emoji, cor_tema, criado_em, actualizado_em')
        .eq('id', id).single(),
      supabase.from('projeto_fases')
        .select('id, nome_fase, nome_fase_en, descricao, descricao_en, data_inicio, data_fim, progresso_pct, status')
        .eq('projeto_id', id).order('data_inicio'),
      supabase.from('projeto_investimentos')
        .select('categoria, categoria_en, valor_usd, fornecedor, descricao, data_investimento')
        .eq('projeto_id', id).order('data_investimento', { ascending: false }),
      supabase.from('projeto_actualizacoes')
        .select('titulo, titulo_en, descricao, descricao_en, tipo_actualizacao, data_publicacao, autor')
        .eq('projeto_id', id).order('data_publicacao', { ascending: false }),
    ]);

    if (projectRes.error || !projectRes.data)
      return res.status(404).json({ error: 'Projecto não encontrado.' });

    res.json({
      project: projectRes.data,
      phases: phasesRes.data || [],
      investments: invRes.data || [],
      updates: updRes.data || [],
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Static files ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname)));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'instituto_cafe_angola.html'));
});

// ── Arranque ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  Servidor INCA (Supabase) em http://localhost:${PORT}`);
});
