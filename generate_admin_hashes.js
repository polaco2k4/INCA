// Gerar hashes bcrypt para passwords dos administradores
const bcrypt = require('bcryptjs');

async function generateHashes() {
  const adminPassword = 'Admin@2026';
  const operadorPassword = 'Operador@2026';

  const adminHash = await bcrypt.hash(adminPassword, 10);
  const operadorHash = await bcrypt.hash(operadorPassword, 10);

  console.log('Hashes gerados:\n');
  console.log('Admin (Admin@2026):');
  console.log(adminHash);
  console.log('\nOperador (Operador@2026):');
  console.log(operadorHash);
  console.log('\nCopie estes hashes para o schema_admin.sql');
}

generateHashes();
