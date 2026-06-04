const { sql, poolPromise } = require('./db');

async function addEnglishFields() {
  try {
    console.log('Connecting to database...');
    const pool = await poolPromise;
    
    console.log('Adding English fields to artigos table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('artigos') AND name = 'titulo_en')
      BEGIN
        ALTER TABLE artigos ADD titulo_en NVARCHAR(300);
        ALTER TABLE artigos ADD resumo_en NVARCHAR(500);
        ALTER TABLE artigos ADD conteudo_en NVARCHAR(MAX);
        PRINT 'English fields added to artigos table';
      END
      ELSE
      BEGIN
        PRINT 'English fields already exist in artigos table';
      END
    `);
    
    console.log('Adding English fields to anuncios table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('anuncios') AND name = 'titulo_en')
      BEGIN
        ALTER TABLE anuncios ADD titulo_en NVARCHAR(200);
        ALTER TABLE anuncios ADD mensagem_en NVARCHAR(MAX);
        ALTER TABLE anuncios ADD link_texto_en NVARCHAR(100);
        PRINT 'English fields added to anuncios table';
      END
      ELSE
      BEGIN
        PRINT 'English fields already exist in anuncios table';
      END
    `);
    
    console.log('Adding English fields to categorias_conteudo table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('categorias_conteudo') AND name = 'nome_en')
      BEGIN
        ALTER TABLE categorias_conteudo ADD nome_en NVARCHAR(100);
        ALTER TABLE categorias_conteudo ADD descricao_en NVARCHAR(MAX);
        PRINT 'English fields added to categorias_conteudo table';
      END
      ELSE
      BEGIN
        PRINT 'English fields already exist in categorias_conteudo table';
      END
    `);
    
    console.log('Adding English fields to media table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('media') AND name = 'titulo_en')
      BEGIN
        ALTER TABLE media ADD titulo_en NVARCHAR(200);
        ALTER TABLE media ADD descricao_en NVARCHAR(MAX);
        PRINT 'English fields added to media table';
      END
      ELSE
      BEGIN
        PRINT 'English fields already exist in media table';
      END
    `);
    
    console.log('✅ All English fields added successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error adding English fields:', error);
    process.exit(1);
  }
}

addEnglishFields();
