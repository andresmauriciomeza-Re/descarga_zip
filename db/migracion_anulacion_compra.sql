-- =============================================================
-- Punto 6 — Validación de la anulación de compras
-- Sistema: S.I.V.PRO (pizzería La Sirena) · SQL Server
-- =============================================================
-- El frontend de "Gestión de Compras" exige, antes de anular:
--   1. Un "Motivo de anulación" obligatorio: mientras esté vacío el botón
--      "Anular" permanece deshabilitado y se muestra el mensaje
--      "Debes escribir el motivo de la anulación".
--   2. Registrar el motivo junto con la fecha/hora del cambio en la compra
--      (campos `motivoAnulacion` y `fechaAnulacion`).
-- Este script garantiza la misma regla del lado de la base de datos
-- (defensa en profundidad: la UI no es la única barrera).
-- Reversible: NO. Ejecutar con respaldo previo.
-- Idempotente: se puede ejecutar más de una vez.
-- =============================================================

PRINT '--- Validación de anulación de compras (punto 6) ---';

-- 1. Tabla de anulaciones (si aún no existe)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Tb_AnulacionCompra')
BEGIN
  CREATE TABLE dbo.Tb_AnulacionCompra (
    IdAnulacion INT IDENTITY(1,1) PRIMARY KEY,
    IdCompra INT NOT NULL,
    Motivo VARCHAR(500) NOT NULL,
    FechaHora DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_AnulacionCompra_Compra FOREIGN KEY (IdCompra)
      REFERENCES dbo.Tb_Compra(IdCompra)
  );

  CREATE INDEX IX_AnulacionCompra_IdCompra ON dbo.Tb_AnulacionCompra(IdCompra);
  PRINT '  + Tabla Tb_AnulacionCompra creada';
END
GO

-- 2. CHECK: el motivo es obligatorio y no puede quedar vacío.
--    NOT NULL solo rechaza NULL; este CHECK rechaza también '' y '   '.
--    Es el equivalente en BD del botón "Anular" deshabilitado del frontend.
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Tb_AnulacionCompra')
   AND NOT EXISTS (
     SELECT 1 FROM sys.check_constraints
     WHERE name = 'CK_AnulacionCompra_Motivo'
       AND parent_object_id = OBJECT_ID('dbo.Tb_AnulacionCompra')
   )
BEGIN
  ALTER TABLE dbo.Tb_AnulacionCompra
    ADD CONSTRAINT CK_AnulacionCompra_Motivo
    CHECK (LEN(LTRIM(RTRIM(Motivo))) > 0);

  PRINT '  + CHECK CK_AnulacionCompra_Motivo agregado (motivo no vacío)';
END
GO

-- =============================================================
-- NOTA PARA EL BACKEND (aún no existe API):
--   Toda anulación debe insertar una fila en Tb_AnulacionCompra con el motivo
--   recibido del frontend (campo `motivoAnulacion`) y la fecha/hora del cambio
--   (campo `fechaAnulacion`), en la misma transacción que pone la compra en
--   estado 'Anulado'. Si el motivo llega vacío, la operación debe rechazarse
--   con 400 antes de tocar la base; aun así, CK_AnulacionCompra_Motivo
--   impediría que una anulación sin motivo llegue a persistirse.
--
--   Importante: `fechaAnulacion` se guarda en el frontend como ISO-8601 UTC
--   (new Date().toISOString()). Al pasarlo a un DATETIME local, convertir la
--   zona horaria antes de insertar para que coincida con GETDATE().
-- =============================================================

-- 3. Verificación de que la regla quedó aplicada
SELECT
  c.name       AS ConstraintName,
  c.definition AS Regla
FROM sys.check_constraints c
WHERE c.parent_object_id = OBJECT_ID('dbo.Tb_AnulacionCompra')
ORDER BY c.name;

PRINT '--- Validación de anulación de compras completada ---';

-- =============================================================
-- PRUEBA MANUAL (debe fallar con error de CHECK; quitar el guion para usarla):
-- INSERT INTO dbo.Tb_AnulacionCompra (IdCompra, Motivo)
-- VALUES (1, '   ');   -- ERROR: CK_AnulacionCompra_Motivo
-- =============================================================
