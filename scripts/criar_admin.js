/**
 * Cria (ou repara) um administrador no Supabase Auth + tabela administradores.
 *
 * Uso:
 *   node scripts/criar_admin.js <email> <password> <nome> [nivel]
 *
 * Exemplo:
 *   node scripts/criar_admin.js admin@inca.ao Senha123 "Admin INCA" super_admin
 *
 * Níveis válidos: super_admin | admin | operador  (padrão: super_admin)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const supabase = require('../supabase');

async function main() {
  const [,, email, password, nome, nivel = 'super_admin'] = process.argv;

  if (!email || !password || !nome) {
    console.error('Uso: node scripts/criar_admin.js <email> <password> <nome> [nivel]');
    process.exit(1);
  }

  const emailLower = email.trim().toLowerCase();
  const niveisValidos = ['super_admin', 'admin', 'operador'];
  if (!niveisValidos.includes(nivel)) {
    console.error(`Nível inválido "${nivel}". Use: ${niveisValidos.join(', ')}`);
    process.exit(1);
  }

  console.log(`\n🔧  A configurar administrador: ${emailLower} (${nivel})`);

  // 1 — Verificar se já existe na tabela administradores
  const { data: existing } = await supabase
    .from('administradores')
    .select('id, email, auth_user_id, activo')
    .eq('email', emailLower)
    .maybeSingle();

  let dbId       = existing?.id;
  let authUserId = existing?.auth_user_id;

  // 2 — Criar ou actualizar utilizador no Supabase Auth
  if (!authUserId) {
    // Tentar criar novo utilizador Auth
    const { data: authData, error: createErr } = await supabase.auth.admin.createUser({
      email: emailLower,
      password,
      email_confirm: true,
      app_metadata: { tipo: 'admin' },
    });

    if (createErr) {
      // Pode já existir em Auth mas não na tabela — tentar listá-lo
      const { data: list } = await supabase.auth.admin.listUsers();
      const found = list?.users?.find(u => u.email === emailLower);
      if (found) {
        console.log('   ℹ️  Utilizador Auth já existe — a reutilizar.');
        authUserId = found.id;
        // Actualizar password se necessário
        await supabase.auth.admin.updateUserById(authUserId, { password });
      } else {
        console.error('❌  Erro a criar utilizador Auth:', createErr.message);
        process.exit(1);
      }
    } else {
      authUserId = authData.user.id;
      console.log('   ✅  Utilizador criado no Supabase Auth:', authUserId);
    }
  } else {
    // Já existe em Auth — actualizar a password
    await supabase.auth.admin.updateUserById(authUserId, { password });
    console.log('   ✅  Password actualizada no Supabase Auth.');
  }

  // 3 — Inserir ou actualizar linha na tabela administradores
  if (!dbId) {
    const { data: inserted, error: insErr } = await supabase
      .from('administradores')
      .insert({ nome: nome.trim(), email: emailLower, nivel, activo: true, auth_user_id: authUserId })
      .select('id')
      .single();

    if (insErr) {
      console.error('❌  Erro ao inserir na tabela administradores:', insErr.message);
      process.exit(1);
    }
    dbId = inserted.id;
    console.log('   ✅  Linha inserida em administradores (id =', dbId, ')');
  } else {
    await supabase.from('administradores')
      .update({ nome: nome.trim(), nivel, activo: true, auth_user_id: authUserId })
      .eq('id', dbId);
    console.log('   ✅  Linha actualizada em administradores (id =', dbId, ')');
  }

  // 4 — Escrever db_id e nivel no app_metadata do Auth user
  await supabase.auth.admin.updateUserById(authUserId, {
    app_metadata: { tipo: 'admin', db_id: dbId, nivel },
  });
  console.log('   ✅  app_metadata definido: { db_id:', dbId, ', nivel:', nivel, '}');

  console.log('\n🎉  Administrador pronto!\n');
  console.log('   Email :', emailLower);
  console.log('   Nível :', nivel);
  console.log('   DB id :', dbId, '\n');
}

main().catch(err => { console.error('Erro inesperado:', err.message); process.exit(1); });
