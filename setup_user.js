// Script para criar utilizador inca_user no SQL Server
require('dotenv').config();
const sql = require('mssql');

// Conectar com Windows Authentication (admin)
const adminConfig = {
  server:   process.env.DB_SERVER || 'localhost',
  port:     Number(process.env.DB_PORT) || 1433,
  database: 'master',
  options: {
    instanceName: process.env.DB_INSTANCE || 'SQLEXPRESS',
    trustServerCertificate: true,
    enableArithAbort: true,
    trustedConnection: true, // Windows Authentication
  },
};

async function setupUser() {
  let pool;
  try {
    console.log('🔌 Conectando ao SQL Server com Windows Authentication...');
    pool = await sql.connect(adminConfig);
    console.log('✅ Conectado!\n');

    // 1. Criar LOGIN
    console.log('📝 Criando login inca_user...');
    try {
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'inca_user')
        BEGIN
          CREATE LOGIN inca_user WITH PASSWORD = 'Angola.2026#';
          PRINT 'Login criado';
        END
      `);
      console.log('✅ Login inca_user criado/verificado\n');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('⚠️  Login já existe\n');
      } else throw err;
    }

    // 2. Verificar se DB existe
    const dbCheck = await pool.request().query(`
      SELECT name FROM sys.databases WHERE name = 'inca_portal'
    `);
    
    if (dbCheck.recordset.length === 0) {
      console.log('❌ Base de dados inca_portal não existe!');
      console.log('   Execute primeiro: node -e "require(\'./db\')" ou o schema.sql\n');
      process.exit(1);
    }

    // 3. Mudar para inca_portal
    await pool.request().query('USE inca_portal');
    console.log('📂 Usando base de dados inca_portal\n');

    // 4. Criar USER
    console.log('👤 Criando user inca_user...');
    try {
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'inca_user')
        BEGIN
          CREATE USER inca_user FOR LOGIN inca_user;
        END
      `);
      console.log('✅ User inca_user criado/verificado\n');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('⚠️  User já existe\n');
      } else throw err;
    }

    // 5. Conceder permissões
    console.log('🔐 Concedendo permissões db_owner...');
    await pool.request().query(`
      ALTER ROLE db_owner ADD MEMBER inca_user;
    `);
    console.log('✅ Permissões concedidas\n');

    console.log('════════════════════════════════════════════════════════════');
    console.log('  ✅ Utilizador configurado com sucesso!');
    console.log('  Login: inca_user');
    console.log('  Password: Angola.2026#');
    console.log('  Base de dados: inca_portal');
    console.log('  Permissões: db_owner (controlo total)');
    console.log('════════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('❌ Erro:', err.message);
    console.error('\n💡 Dica: Este script precisa de Windows Authentication.');
    console.error('   Execute o ficheiro create_user.sql manualmente no SSMS.\n');
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

setupUser();
