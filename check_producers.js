require('dotenv').config();
const { sql, poolPromise } = require('./db');

async function checkProducers() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT TOP 3 id, nome, nbi, provincia FROM produtores');
    
    console.log('Produtores disponíveis:');
    result.recordset.forEach(p => {
      console.log(`ID: ${p.id}, Nome: ${p.nome}, NBI: ${p.nbi}, Província: ${p.provincia}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
}

checkProducers();
