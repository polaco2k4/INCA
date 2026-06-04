require('dotenv').config();
const sql = require('mssql');

const config = {
  server:   process.env.DB_SERVER   || 'localhost',
  port:     Number(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME     || 'inca_portal',
  user:     process.env.DB_USER     || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    instanceName:           process.env.DB_INSTANCE || 'SQLEXPRESS',
    trustServerCertificate: true,   // necessário para SQL Server Express local
    enableArithAbort:       true,
  },
  pool: {
    max: 10, min: 0, idleTimeoutMillis: 30000,
  },
};

// Pool partilhado — reutilizado em todo o app
const poolPromise = sql.connect(config)
  .then(pool => {
    console.log('✅  SQL Server ligado:', config.database, `(${config.server}\\${config.options.instanceName})`);
    return pool;
  })
  .catch(err => {
    console.error('❌  Erro ao ligar ao SQL Server:', err.message);
    console.error('    Verifique as credenciais em .env e se o serviço SQL Server Express está activo.');
    process.exit(1);
  });

module.exports = { sql, poolPromise };
