-- Adicionar campos de reset de senha à tabela produtores
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('produtores') AND name = 'reset_token')
BEGIN
    ALTER TABLE produtores ADD reset_token NVARCHAR(255) NULL;
    PRINT 'Campo reset_token adicionado com sucesso.';
END
ELSE
BEGIN
    PRINT 'Campo reset_token já existe.';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('produtores') AND name = 'reset_expires')
BEGIN
    ALTER TABLE produtores ADD reset_expires DATETIME2 NULL;
    PRINT 'Campo reset_expires adicionado com sucesso.';
END
ELSE
BEGIN
    PRINT 'Campo reset_expires já existe.';
END

-- Verificar se os campos foram adicionados
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'produtores' 
    AND COLUMN_NAME IN ('reset_token', 'reset_expires')
ORDER BY COLUMN_NAME;
