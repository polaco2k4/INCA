require('dotenv').config();
const { sql, poolPromise } = require('./db');
const bcrypt = require('bcryptjs');

async function setPin() {
  try {
    const pool = await poolPromise;
    const pin = '1234'; // PIN simples para teste
    const pinHash = await bcrypt.hash(pin, 10);
    
    // Definir PIN para o primeiro produtor (João António Kafuxi)
    await pool.request()
      .input('id', sql.Int, 1)
      .input('pinHash', sql.NVarChar, pinHash)
      .query('UPDATE produtores SET pin_hash = @pinHash WHERE id = @id');
    
    console.log('✅ PIN definido com sucesso para João António Kafuxi');
    console.log('   NBI: DEMO-006-UIG-2026');
    console.log('   PIN: 1234');
    console.log('\nPode usar estas credenciais para fazer login no portal!');
    
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
}

setPin();
