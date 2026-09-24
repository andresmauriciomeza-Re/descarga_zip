-- ================================================================
-- Migración: Tipo y Número de Documento por persona
-- Sistema: S.I.V.PRO (pizzería La Sirena) · SQL Server
-- Objetivo:
--   1. Agregar TipoDocumento y NumeroDocumento a Tb_Usuario,
--      Tb_Empleado y Tb_Cliente.
--   2. Reconstruir los registros existentes que almacenan el
--      documento como texto mixto (ej. "CC 33445566") separando
--      tipo y número.
--   3. Aplicar índice único por (TipoDocumento, NumeroDocumento)
--      en cada tabla para garantizar la unicidad de la combinación.
-- Reversible: NO. Respaldar la base antes de ejecutar.
-- ================================================================

PRINT '--- Migración de documentos ---';

-- ----------------------------------------------------------------
-- 1) Columnas en Tb_Usuario
-- ----------------------------------------------------------------
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.Tb_Usuario') AND name = 'TipoDocumento'
)
ALTER TABLE dbo.Tb_Usuario ADD TipoDocumento VARCHAR(5) NOT NULL CONSTRAINT DF_Tb_Usuario_TipoDocumento DEFAULT 'CC';
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.Tb_Usuario') AND name = 'NumeroDocumento'
)
ALTER TABLE dbo.Tb_Usuario ADD NumeroDocumento VARCHAR(25) NOT NULL CONSTRAINT DF_Tb_Usuario_NumeroDocumento DEFAULT '';
GO

-- ----------------------------------------------------------------
-- 2) Columnas en Tb_Empleado
-- ----------------------------------------------------------------
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.Tb_Empleado') AND name = 'TipoDocumento'
)
ALTER TABLE dbo.Tb_Empleado ADD TipoDocumento VARCHAR(5) NOT NULL CONSTRAINT DF_Tb_Empleado_TipoDocumento DEFAULT 'CC';
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.Tb_Empleado') AND name = 'NumeroDocumento'
)
ALTER TABLE dbo.Tb_Empleado ADD NumeroDocumento VARCHAR(25) NOT NULL CONSTRAINT DF_Tb_Empleado_NumeroDocumento DEFAULT '';
GO

-- ----------------------------------------------------------------
-- 3) Columnas en Tb_Cliente
-- ----------------------------------------------------------------
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.Tb_Cliente') AND name = 'TipoDocumento'
)
ALTER TABLE dbo.Tb_Cliente ADD TipoDocumento VARCHAR(5) NOT NULL CONSTRAINT DF_Tb_Cliente_TipoDocumento DEFAULT 'CC';
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.Tb_Cliente') AND name = 'NumeroDocumento'
)
ALTER TABLE dbo.Tb_Cliente ADD NumeroDocumento VARCHAR(25) NOT NULL CONSTRAINT DF_Tb_Cliente_NumeroDocumento DEFAULT '';
GO

-- ----------------------------------------------------------------
-- 4) Backfill: separar el valor mixto de la columna `Documento`
--    (Formato esperado: "CC 33445566" o solo "33445566").
--    Solo se procesan filas que aún no tienen número separado.
-- ----------------------------------------------------------------
PRINT '--- Backfill Tb_Usuario ---';
UPDATE u
   SET TipoDocumento   = CASE
         WHEN CHARINDEX(' ', LTRIM(u.Documento)) > 0
              THEN UPPER(LTRIM(SUBSTRING(LTRIM(u.Documento), 1, CHARINDEX(' ', LTRIM(u.Documento)) - 1)))
         ELSE 'CC'
       END,
       NumeroDocumento = CASE
         WHEN CHARINDEX(' ', LTRIM(u.Documento)) > 0
              THEN RTRIM(LTRIM(SUBSTRING(LTRIM(u.Documento), CHARINDEX(' ', LTRIM(u.Documento)) + 1, 25)))
         ELSE LTRIM(u.Documento)
       END
  FROM dbo.Tb_Usuario u
 WHERE LTRIM(ISNULL(u.NumeroDocumento, '')) = '';
GO

PRINT '--- Backfill Tb_Empleado ---';
UPDATE e
   SET TipoDocumento   = CASE
         WHEN CHARINDEX(' ', LTRIM(e.Documento)) > 0
              THEN UPPER(LTRIM(SUBSTRING(LTRIM(e.Documento), 1, CHARINDEX(' ', LTRIM(e.Documento)) - 1)))
         ELSE 'CC'
       END,
       NumeroDocumento = CASE
         WHEN CHARINDEX(' ', LTRIM(e.Documento)) > 0
              THEN RTRIM(LTRIM(SUBSTRING(LTRIM(e.Documento), CHARINDEX(' ', LTRIM(e.Documento)) + 1, 25)))
         ELSE LTRIM(e.Documento)
       END
  FROM dbo.Tb_Empleado e
 WHERE LTRIM(ISNULL(e.NumeroDocumento, '')) = '';
GO

PRINT '--- Backfill Tb_Cliente ---';
UPDATE c
   SET TipoDocumento   = CASE
         WHEN CHARINDEX(' ', LTRIM(c.Documento)) > 0
              THEN UPPER(LTRIM(SUBSTRING(LTRIM(c.Documento), 1, CHARINDEX(' ', LTRIM(c.Documento)) - 1)))
         ELSE 'CC'
       END,
       NumeroDocumento = CASE
         WHEN CHARINDEX(' ', LTRIM(c.Documento)) > 0
              THEN RTRIM(LTRIM(SUBSTRING(LTRIM(c.Documento), CHARINDEX(' ', LTRIM(c.Documento)) + 1, 25)))
         ELSE LTRIM(c.Documento)
       END
  FROM dbo.Tb_Cliente c
 WHERE LTRIM(ISNULL(c.NumeroDocumento, '')) = '';
GO

-- ----------------------------------------------------------------
-- 5) Índices únicos por combinación (TipoDocumento, NumeroDocumento)
-- ----------------------------------------------------------------
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.Tb_Usuario') AND name = 'UQ_Tb_Usuario_TipoDoc_NumDoc'
)
CREATE UNIQUE INDEX UQ_Tb_Usuario_TipoDoc_NumDoc
  ON dbo.Tb_Usuario (TipoDocumento, NumeroDocumento);
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.Tb_Empleado') AND name = 'UQ_Tb_Empleado_TipoDoc_NumDoc'
)
CREATE UNIQUE INDEX UQ_Tb_Empleado_TipoDoc_NumDoc
  ON dbo.Tb_Empleado (TipoDocumento, NumeroDocumento);
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.Tb_Cliente') AND name = 'UQ_Tb_Cliente_TipoDoc_NumDoc'
)
CREATE UNIQUE INDEX UQ_Tb_Cliente_TipoDoc_NumDoc
  ON dbo.Tb_Cliente (TipoDocumento, NumeroDocumento);
GO

PRINT '--- Migración de documentos completada ---';