require('dotenv').config();
const { sql, poolPromise } = require('./db');

async function checkStatus() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT id, nome, nbi, activo FROM produtores');
    
    console.log('Estado dos produtores:');
    result.recordset.forEach(p => {
      console.log(`ID: ${p.id}, Nome: ${p.nome}, NBI: ${p.nbi}, Activo: ${p.activo}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
}

checkStatus();
