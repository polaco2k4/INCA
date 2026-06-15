require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const supabase = require('../supabase');

async function main() {
  console.log('\n── Supabase Auth Users ─────────────────────────────');
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) { console.error('Erro:', listErr.message); }
  else if (!list.users.length) { console.log('  (nenhum utilizador em Auth)'); }
  else list.users.forEach(u => console.log(' •', u.email, '| id:', u.id, '| app_metadata:', JSON.stringify(u.app_metadata)));

  console.log('\n── Tabela administradores ──────────────────────────');
  const { data: admins, error: admErr } = await supabase.from('administradores').select('id, nome, email, nivel, activo, auth_user_id');
  if (admErr) { console.error('Erro:', admErr.message); }
  else if (!admins.length) { console.log('  (tabela vazia)'); }
  else admins.forEach(a => console.log(' •', a.email, '| nivel:', a.nivel, '| auth_user_id:', a.auth_user_id));

  console.log('');
}

main().catch(e => { console.error(e.message); process.exit(1); });
