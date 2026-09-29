-- ================================================================
-- Migración: Módulo de Insumos
-- Sistema: S.I.V.PRO (pizzería La Sirena) · SQL Server
-- Objetivo:
--   1. Renombrar PrecioUnitario -> CostoUnitario en Tb_Insumo
--   2. Convertir ID de categoría a numérico (TbCategoriaInsumo)
--   3. Agregar ficha técnica (TbFichaTecnicaInsumo)
--   4. Agregar campo Activo a Tb_Insumo
--   5. Agregar campo TieneCompras a Tb_Insumo (o vista)
-- Reversible: NO. Respaldar la base antes de ejecutar.
-- ================================================================

PRINT '--- Migración de Insumos ---';

-- ----------------------------------------------------------------
-- 1) Renombrar PrecioUnitario -> CostoUnitario en Tb_Insumo
-- ----------------------------------------------------------------
IF EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.Tb_Insumo') AND name = 'PrecioUnitario'
)
BEGIN
  EXEC sp_rename 'dbo.Tb_Insumo.PrecioUnitario', 'CostoUnitario', 'COLUMN';
  PRINT '  ✓ Columna PrecioUnitario renombrada a CostoUnitario';
END
ELSE
BEGIN
  PRINT '  ⚠ La columna PrecioUnitario no existe (ya fue renombrada o no aplica)';
END
GO

-- ----------------------------------------------------------------
-- 2) Tabla de categorías de insumos con ID numérico
-- ----------------------------------------------------------------
IF NOT EXISTS (
  SELECT 1 FROM sys.tables WHERE name = 'TbCategoriaInsumo'
)
BEGIN
  CREATE TABLE dbo.TbCategoriaInsumo (
    IdCategoriaInsumo INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Activo BIT NOT NULL DEFAULT 1
  );
  PRINT '  ✓ Tabla TbCategoriaInsumo creada';

  -- Insertar categorías iniciales
  INSERT INTO dbo.TbCategoriaInsumo (Nombre) VALUES
    ('Lácteos'),
    ('Carnes y Embutidos'),
    ('Vegetales y Hierbas'),
    ('Harinas y Masas'),
    ('Salsas y Condimentos'),
    ('Frutas'),
    ('Bebidas'),
    ('Otros');
  PRINT '  ✓ Categorías iniciales insertadas';
END
ELSE
BEGIN
  PRINT '  ⚠ La tabla TbCategoriaInsumo ya existe';
END
GO

-- Si existe la tabla antigua con IDs alfanuméricos, migrar datos
IF EXISTS (
  SELECT 1 FROM sys.tables WHERE name = 'Tb_Categoria_Insumos'
)
BEGIN
  -- Migrar datos de la tabla antigua a la nueva
  INSERT INTO dbo.TbCategoriaInsumo (Nombre, Activo)
  SELECT DISTINCT CategoriaNombre, 1
  FROM dbo.Tb_Categoria_Insumos
  WHERE NOT EXISTS (
    SELECT 1 FROM dbo.TbCategoriaInsumo n WHERE n.Nombre = CategoriaNombre
  );
  PRINT '  ✓ Datos de categorías migrados';
END
GO

-- ----------------------------------------------------------------
-- 3) Tabla de ficha técnica de insumos
-- ----------------------------------------------------------------
IF NOT EXISTS (
  SELECT 1 FROM sys.tables WHERE name = 'TbFichaTecnicaInsumo'
)
BEGIN
  CREATE TABLE dbo.TbFichaTecnicaInsumo (
    IdFichaTecnica INT IDENTITY(1,1) PRIMARY KEY,
    IdInsumo INT NOT NULL,
    Descripcion VARCHAR(500) NULL,
    Marca VARCHAR(100) NULL,
    Presentacion VARCHAR(100) NULL,
    CondicionesAlmacenamiento VARCHAR(200) NULL,
    TemperaturaConservacion VARCHAR(50) NULL,
    VidaUtilDias INT NULL,
    RegistroInvima VARCHAR(100) NULL,
    Observaciones VARCHAR(500) NULL,
    CONSTRAINT FK_FichaTecnica_Insumo FOREIGN KEY (IdInsumo)
      REFERENCES dbo.Tb_Insumo(IdInsumo)
  );
  PRINT '  ✓ Tabla TbFichaTecnicaInsumo creada';
END
ELSE
BEGIN
  PRINT '  ⚠ La tabla TbFichaTecnicaInsumo ya existe';
END
GO

-- ----------------------------------------------------------------
-- 4) Agregar campo Activo a Tb_Insumo
-- ----------------------------------------------------------------
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.Tb_Insumo') AND name = 'Activos'
)
BEGIN
  ALTER TABLE dbo.Tb_Insumo ADD Activo BIT NOT NULL DEFAULT 1;
  PRINT '  ✓ Columna Activo agregada a Tb_Insumo';
END
ELSE
BEGIN
  PRINT '  ⚠ La columna Activo ya existe en Tb_Insumo';
END
GO

-- ----------------------------------------------------------------
-- 5) Vista para verificar si un insumo tiene compras asociadas
-- ----------------------------------------------------------------
IF EXISTS (
  SELECT 1 FROM sys.views WHERE name = 'vw_Insumo_TieneCompras'
)
BEGIN
  DROP VIEW dbo.vw_Insumo_TieneCompras;
  PRINT '  ⚠ Vista vw_Insumo_TieneCompras existente eliminada';
END
GO

CREATE VIEW dbo.vw_Insumo_TieneCompras AS
SELECT DISTINCT
  d.IdInsumo,
  1 AS TieneCompras
FROM dbo.Tb_DetalleCompra d
INNER JOIN dbo.Tb_Compra c ON d.IdCompra = c.IdCompra
WHERE c.Estado <> 'Anulada';
GO
PRINT '  ✓ Vista vw_Insumo_TieneCompras creada';

-- ----------------------------------------------------------------
-- 6) Actualizar Tb_Insumo para referenciar nueva categoría numérica
--    (Esto asume que ya se hizo la migración de datos manualmente)
-- ----------------------------------------------------------------
IF EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.Tb_Insumo') AND name = 'IdCategoriaIns'
)
BEGIN
  -- Verificar si la columna ya es numérica
  IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Tb_Insumo')
      AND name = 'IdCategoriaIns'
      AND system_type_id IN (48, 52, 56, 60, 108) -- tipos numéricos
  )
  BEGIN
    PRINT '  ✓ IdCategoriaIns ya es numérico';
  END
  ELSE
  BEGIN
    PRINT '  ⚠ IdCategoriaIns no es numérico - requiere migración manual de datos';
  END
END
GO

PRINT '--- Migración de Insumos completada ---';
