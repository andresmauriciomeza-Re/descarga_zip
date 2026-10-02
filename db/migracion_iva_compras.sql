-- ================================================================
-- Migración: Regla de IVA en Compras
-- Sistema: S.I.V.PRO (pizzería La Sirena) · SQL Server
-- Objetivo:
--   1. Guardar en la compra si los montos de la factura traen IVA
--      incluido (IvaIncluido), el subtotal sin IVA, el total de IVA
--      y el total pagado.
--   2. Guardar por línea el porcentaje de IVA, la base sin IVA y el
--      monto del IVA.
--   3. Dejar las compras existentes abriéndose igual que siempre:
--      IvaIncluido = 1 ("Sí, IVA incluido") e IVA 0 %.
-- Reversible: NO. Respaldar la base antes de ejecutar.
-- Idempotente: se puede ejecutar más de una vez.
--
-- Frontend: la fórmula vive en UN solo archivo,
--   src/app/utils/iva.ts → función `calcularLineaIva`.
--   El backend debe usar exactamente la misma (ver NOTA ABAJO).
-- ================================================================

PRINT '--- Migración: Regla de IVA en Compras ---';

-- ----------------------------------------------------------------
-- 1) Tb_Compra: IvaIncluido / SubtotalSinIva / TotalIva / TotalPagado
-- ----------------------------------------------------------------
IF COL_LENGTH('dbo.Tb_Compra', 'IvaIncluido') IS NULL
BEGIN
  -- DEFAULT 1: las compras ya registradas se leen como
  -- "Sí, IVA incluido" (con IVA 0 % se ven exactamente igual).
  ALTER TABLE dbo.Tb_Compra ADD IvaIncluido BIT NOT NULL DEFAULT 1;
  PRINT '  ✓ Columna IvaIncluido agregada a Tb_Compra';
END
ELSE
  PRINT '  ⚠ La columna IvaIncluido ya existe en Tb_Compra';
GO

IF COL_LENGTH('dbo.Tb_Compra', 'SubtotalSinIva') IS NULL
BEGIN
  ALTER TABLE dbo.Tb_Compra ADD SubtotalSinIva DECIMAL(18,2) NULL;
  PRINT '  ✓ Columna SubtotalSinIva agregada a Tb_Compra';
END
ELSE
  PRINT '  ⚠ La columna SubtotalSinIva ya existe en Tb_Compra';
GO

IF COL_LENGTH('dbo.Tb_Compra', 'TotalIva') IS NULL
BEGIN
  ALTER TABLE dbo.Tb_Compra ADD TotalIva DECIMAL(18,2) NULL;
  PRINT '  ✓ Columna TotalIva agregada a Tb_Compra';
END
ELSE
  PRINT '  ⚠ La columna TotalIva ya existe en Tb_Compra';
GO

IF COL_LENGTH('dbo.Tb_Compra', 'TotalPagado') IS NULL
BEGIN
  ALTER TABLE dbo.Tb_Compra ADD TotalPagado DECIMAL(18,2) NULL;
  PRINT '  ✓ Columna TotalPagado agregada a Tb_Compra';
END
ELSE
  PRINT '  ⚠ La columna TotalPagado ya existe en Tb_Compra';
GO

-- ----------------------------------------------------------------
-- 2) Tb_DetalleCompra: IvaPorcentaje / BaseSinIva / MontoIva
--    (por línea de factura)
-- ----------------------------------------------------------------
IF COL_LENGTH('dbo.Tb_DetalleCompra', 'IvaPorcentaje') IS NULL
BEGIN
  -- Porcentaje de IVA de la línea, 0–100 (0 = las compras antiguas).
  ALTER TABLE dbo.Tb_DetalleCompra ADD IvaPorcentaje DECIMAL(9,2) NOT NULL DEFAULT 0;
  PRINT '  ✓ Columna IvaPorcentaje agregada a Tb_DetalleCompra';
END
ELSE
  PRINT '  ⚠ La columna IvaPorcentaje ya existe en Tb_DetalleCompra';
GO

IF COL_LENGTH('dbo.Tb_DetalleCompra', 'BaseSinIva') IS NULL
BEGIN
  ALTER TABLE dbo.Tb_DetalleCompra ADD BaseSinIva DECIMAL(18,2) NULL;
  PRINT '  ✓ Columna BaseSinIva agregada a Tb_DetalleCompra';
END
ELSE
  PRINT '  ⚠ La columna BaseSinIva ya existe en Tb_DetalleCompra';
GO

IF COL_LENGTH('dbo.Tb_DetalleCompra', 'MontoIva') IS NULL
BEGIN
  ALTER TABLE dbo.Tb_DetalleCompra ADD MontoIva DECIMAL(18,2) NULL;
  PRINT '  ✓ Columna MontoIva agregada a Tb_DetalleCompra';
END
ELSE
  PRINT '  ⚠ La columna MontoIva ya existe en Tb_DetalleCompra';
GO

-- ----------------------------------------------------------------
-- 3) Backfill de las compras existentes
--    Regla histórica: sin IVA (0 %), por lo tanto
--    base = subtotal, IVA = 0 y total pagado = subtotal.
--    Identidad que siempre se cumple: base + IVA = subtotal.
-- ----------------------------------------------------------------
IF COL_LENGTH('dbo.Tb_DetalleCompra', 'Subtotal') IS NOT NULL
BEGIN
  UPDATE d
     SET d.BaseSinIva = ISNULL(d.BaseSinIva, ISNULL(d.Subtotal, 0)),
         d.MontoIva   = ISNULL(d.MontoIva,   0)
  FROM dbo.Tb_DetalleCompra d
  WHERE d.BaseSinIva IS NULL OR d.MontoIva IS NULL;
  PRINT '  ✓ Tb_DetalleCompra: base/IVA de líneas históricas completados (IVA 0 %)';
END
GO

IF COL_LENGTH('dbo.Tb_DetalleCompra', 'Subtotal') IS NOT NULL
   AND COL_LENGTH('dbo.Tb_Compra', 'SubtotalSinIva') IS NOT NULL
BEGIN
  UPDATE c
     SET c.SubtotalSinIva = ISNULL(c.SubtotalSinIva, ISNULL(t.sub, 0)),
         c.TotalIva       = ISNULL(c.TotalIva,       0),
         c.TotalPagado    = ISNULL(c.TotalPagado,    ISNULL(t.sub, 0))
  FROM dbo.Tb_Compra c
  OUTER APPLY (
    SELECT SUM(d.Subtotal) AS sub
    FROM dbo.Tb_DetalleCompra d
    WHERE d.IdCompra = c.IdCompra
  ) t;
  PRINT '  ✓ Tb_Compra: totales históricos completados (TotalIva = 0)';
END
GO

-- =============================================================
-- NOTA PARA EL BACKEND (aún no existe API)
-- -------------------------------------------------------------
-- Al crear o actualizar una compra, el backend NO debe confiar en
-- los totales que envía el frontend: debe recalcularlos con esta
-- fórmula (idéntica a `calcularLineaIva` de
-- src/app/utils/iva.ts) y persistir los valores calculados.
--
--   redondear(n) = ROUND(n, 0)   -- pesos enteros, mitad hacia arriba
--   iva% = MIN(MAX(IvaPorcentaje, 0), 100)
--
--   SI IvaIncluido = 1 (los montos unitarios YA traen el IVA):
--       subtotalLinea = redondear(Cantidad * MontoUnitario)
--       BaseSinIva    = redondear(subtotalLinea / (1 + iva%/100))
--       MontoIva      = subtotalLinea - BaseSinIva
--       -- subtotalLinea se conserva tal cual (es lo que se paga)
--
--   SI IvaIncluido = 0 (los montos unitarios NO traen el IVA):
--       BaseSinIva  = redondear(Cantidad * MontoUnitario)
--       MontoIva    = redondear(BaseSinIva * iva%/100)
--       subtotalLinea = BaseSinIva + MontoIva
--
--   Por línea SIEMPRE se cumple:  BaseSinIva + MontoIva = subtotalLinea
--
--   Totales de la compra (orden fijo en la UI):
--       SubtotalSinIva = SUM(BaseSinIva)
--       TotalIva       = SUM(MontoIva)
--       TotalPagado    = SUM(subtotalLinea) = SubtotalSinIva + TotalIva
--       -- TotalPagado es el mismo valor que Tb_Compra.ValorTotal
--       -- (la UI muestra siempre: Subtotal sin IVA → IVA → Total pagado)
--
-- Si los totales recibidos no cuadran con esta fórmula, responder 400
-- (o guardar los valores recalculados) y registrar la diferencia.
--
-- Ejemplos de verificación (punto 1.7):
--   Línea A: cantidad 5, unitario 10.000, IVA 10 %
--     con IVA incluido → base 45.455 · IVA 4.545 · subtotal 50.000
--     sin IVA          → base 50.000 · IVA 5.000 · subtotal 55.000
--   Línea B: cantidad 1, unitario 30.000, IVA 12 %
--     con IVA incluido → base 26.786 · IVA 3.214 · subtotal 30.000
--     sin IVA          → base 30.000 · IVA 3.600 · subtotal 33.600
--   Totales A+B:
--     con IVA incluido → 72.241 + 7.759 = 80.000
--     sin IVA          → 80.000 + 8.600 = 88.600
-- =============================================================

-- ----------------------------------------------------------------
-- 4) Verificación de la regla aplicada
-- ----------------------------------------------------------------
SELECT
  c.name  AS Columna,
  t.name  AS Tipo,
  c.max_length AS Longitud,
  c.is_nullable AS Nullable,
  c.default_object_id AS TieneDefault
FROM sys.columns c
INNER JOIN sys.types t ON t.user_type_id = c.user_type_id
WHERE c.object_id IN (OBJECT_ID('dbo.Tb_Compra'), OBJECT_ID('dbo.Tb_DetalleCompra'))
  AND c.name IN ('IvaIncluido', 'SubtotalSinIva', 'TotalIva', 'TotalPagado',
                 'IvaPorcentaje', 'BaseSinIva', 'MontoIva')
ORDER BY OBJECT_NAME(c.object_id), c.column_id;

PRINT '--- Migración de IVA en Compras completada ---';

-- =============================================================
-- PRUEBA MANUAL (quitar el guion para usarla):
-- INSERT INTO dbo.Tb_Compra (IvaIncluido, SubtotalSinIva, TotalIva, TotalPagado)
-- VALUES (1, 72241.00, 7759.00, 80000.00);
-- -- Esperado: 72241 + 7759 = 80000
-- =============================================================
