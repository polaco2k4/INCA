require('dotenv').config();
const { sql, poolPromise } = require('./db');
const fs = require('fs');

async function executarSchema() {
  try {
    console.log('📂 A ler schema_conteudo.sql...');
    const schema = fs.readFileSync('./schema_conteudo.sql', 'utf8');
    
    const pool = await poolPromise;
    console.log('✅ Conectado à base de dados');
    
    const batches = schema.split(/\bGO\b/gi).filter(b => b.trim());
    
    console.log(`📝 A executar ${batches.length} comandos SQL...\n`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch) {
        try {
          const result = await pool.request().query(batch);
          if (result.recordset && result.recordset.length > 0) {
            result.recordset.forEach(row => {
              Object.values(row).forEach(val => {
                if (typeof val === 'string' && val.includes('═')) {
                  console.log(val);
                }
              });
            });
          }
        } catch (err) {
          if (!err.message.includes('already exists')) {
            console.error(`❌ Erro no batch ${i + 1}:`, err.message);
          }
        }
      }
    }
    
    console.log('\n✅ Schema de gestão de conteúdo executado com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

executarSchema();
