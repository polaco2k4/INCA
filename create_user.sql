-- ════════════════════════════════════════════════════════════
--  Criar utilizador inca_user no SQL Server Express
--  Execute este script no SQL Server Management Studio (SSMS)
-- ════════════════════════════════════════════════════════════

-- 1. Criar LOGIN no servidor
USE master;
GO

IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'inca_user')
BEGIN
    CREATE LOGIN inca_user WITH PASSWORD = 'Angola.2026#';
    PRINT '✅ Login inca_user criado com sucesso';
END
ELSE
BEGIN
    PRINT '⚠️ Login inca_user já existe';
END
GO

-- 2. Verificar se a base de dados existe
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'inca_portal')
BEGIN
    PRINT '❌ Base de dados inca_portal não existe!';
    PRINT '   Execute primeiro o ficheiro schema.sql';
END
ELSE
BEGIN
    -- 3. Criar USER na base de dados
    USE inca_portal;
    GO

    IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'inca_user')
    BEGIN
        CREATE USER inca_user FOR LOGIN inca_user;
        PRINT '✅ User inca_user criado na base de dados inca_portal';
    END
    ELSE
    BEGIN
        PRINT '⚠️ User inca_user já existe na base de dados';
    END

    -- 4. Conceder permissões (db_owner = controlo total)
    ALTER ROLE db_owner ADD MEMBER inca_user;
    PRINT '✅ Permissões db_owner concedidas ao inca_user';
    GO

    PRINT '';
    PRINT '════════════════════════════════════════════════════════════';
    PRINT '  Utilizador configurado com sucesso!';
    PRINT '  Login: inca_user';
    PRINT '  Base de dados: inca_portal';
    PRINT '════════════════════════════════════════════════════════════';
END
GO
