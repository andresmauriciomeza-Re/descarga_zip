-- ================================================================
-- Migración: Insumos no solicitados en recepción de compra
-- Sistema: S.I.V.PRO (pizzería La Sirena) · SQL Server
-- Objetivo:
--   Agregar campo EsNoSolicitado a Tb_DetalleCompra para distinguir
--   insumos que venían en la orden vs. agregados manualmente en recepción.
-- Reversible: NO. Respaldar la base antes de ejecutar.
-- ================================================================

PRINT '--- Migración: Insumos no solicitados ---';

-- ----------------------------------------------------------------
-- Agregar campo EsNoSolicitado a Tb_DetalleCompra
-- ----------------------------------------------------------------
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.Tb_DetalleCompra') AND name = 'EsNoSolicitado'
)
BEGIN
  ALTER TABLE dbo.Tb_DetalleCompra ADD EsNoSolicitado BIT NOT NULL DEFAULT 0;
  PRINT '  ✓ Columna EsNoSolicitado agregada a Tb_DetalleCompra';
END
ELSE
BEGIN
  PRINT '  ⚠ La columna EsNoSolicitado ya existe en Tb_DetalleCompra';
END
GO

-- Índice para filtrar rápidamente insumos no solicitados
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.Tb_DetalleCompra') AND name = 'IX_Tb_DetalleCompra_EsNoSolicitado'
)
BEGIN
  CREATE INDEX IX_Tb_DetalleCompra_EsNoSolicitado ON dbo.Tb_DetalleCompra(EsNoSolicitado);
  PRINT '  ✓ Índice IX_Tb_DetalleCompra_EsNoSolicitado creado';
END
ELSE
BEGIN
  PRINT '  ⚠ Índice IX_Tb_DetalleCompra_EsNoSolicitado ya existe';
END
GO

PRINT '--- Migración completada ---';