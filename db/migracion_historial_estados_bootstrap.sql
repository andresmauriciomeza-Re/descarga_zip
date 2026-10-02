-- ================================================================
-- Migración: Bootstrap de historial de estados para órdenes existentes
-- Sistema: S.I.V.PRO (pizzería La Sirena) · SQL Server
-- Objetivo:
--   Insertar el registro inicial de historial para órdenes de compra
--   que no tienen entradas en Tb_HistorialEstadoOrdenCompra.
--   Usa el estado actual y la fecha de creación de la orden.
-- Reversible: NO. Respaldar la base antes de ejecutar.
-- ================================================================

PRINT '--- Bootstrap de historial de estados ---';

-- Verificar que la tabla de historial existe
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Tb_HistorialEstadoOrdenCompra')
BEGIN
  PRINT '  ⚠ La tabla Tb_HistorialEstadoOrdenCompra no existe. Ejecute primero migracion_historial_estados.sql';
  RETURN;
END

-- Verificar que la tabla de órdenes existe
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Tb_OrdenCompra')
BEGIN
  PRINT '  ⚠ La tabla Tb_OrdenCompra no existe';
  RETURN;
END

-- Insertar registro inicial para órdenes sin historial
DECLARE @Insertados INT;

INSERT INTO dbo.Tb_HistorialEstadoOrdenCompra (IdOrdenCompra, EstadoAnterior, EstadoNuevo, FechaHora)
SELECT 
  oc.IdOrdenCompra,
  NULL,                           -- EstadoAnterior = NULL (es el primer estado)
  oc.Estado,                      -- EstadoNuevo = estado actual de la orden
  oc.FechaCreacion                -- FechaHora = fecha de creación de la orden
FROM dbo.Tb_OrdenCompra oc
WHERE NOT EXISTS (
  SELECT 1 
  FROM dbo.Tb_HistorialEstadoOrdenCompra h 
  WHERE h.IdOrdenCompra = oc.IdOrdenCompra
);

-- Se captura justo después del INSERT (@@ROWCOUNT se lee antes de cualquier
-- otro Statement que pueda sobreescribirlo).
SET @Insertados = @@ROWCOUNT;

PRINT '  ✓ Registros iniciales de historial insertados para órdenes sin historial';
PRINT '  → Filas insertadas: ' + CAST(@Insertados AS VARCHAR(10));

PRINT '--- Bootstrap completado ---';