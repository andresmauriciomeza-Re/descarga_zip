-- =============================================================
-- S.I.V.PRO — Historial de estados y anulación de compras
-- =============================================================
-- Este script crea las tablas necesarias para almacenar:
-- 1. Historial de cambios de estado de Órdenes de Compra
-- 2. Motivo y fecha de anulación de Compras (Gestión de Compras)
-- 3. Validación de NIT de proveedores (exactamente 10 dígitos)
-- =============================================================

-- 1. Tabla: Historial de estados de Órdenes de Compra
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Tb_HistorialEstadoOrdenCompra')
BEGIN
  CREATE TABLE dbo.Tb_HistorialEstadoOrdenCompra (
    IdHistorial INT IDENTITY(1,1) PRIMARY KEY,
    IdOrdenCompra INT NOT NULL,
    EstadoAnterior VARCHAR(20) NOT NULL,
    EstadoNuevo VARCHAR(20) NOT NULL,
    FechaHora DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_HistorialOC_OrdenCompra FOREIGN KEY (IdOrdenCompra)
      REFERENCES dbo.Tb_OrdenCompra(IdOrdenCompra)
  );

  CREATE INDEX IX_HistorialEstadoOC_IdOrden ON dbo.Tb_HistorialEstadoOrdenCompra(IdOrdenCompra);
  CREATE INDEX IX_HistorialEstadoOC_FechaHora ON dbo.Tb_HistorialEstadoOrdenCompra(FechaHora DESC);
END
GO

-- 2. Tabla: Anulación de compras (Gestión de Compras)
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
END
GO

-- 3. Validación de NIT de proveedor: exactamente 10 dígitos
-- Si la tabla Tb_Proveedor existe, agregar constraint de validación
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Tb_Proveedor')
BEGIN
  -- Eliminar constraint si existe para evitar errores
  IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_Tb_Proveedor_NIT')
  BEGIN
    ALTER TABLE dbo.Tb_Proveedor DROP CONSTRAINT CK_Tb_Proveedor_NIT;
  END

  -- Agregar constraint: NIT debe tener exactamente 10 dígitos
  ALTER TABLE dbo.Tb_Proveedor
  ADD CONSTRAINT CK_Tb_Proveedor_NIT
  CHECK (LEN(NIT) = 10 AND NIT NOT LIKE '%[^0-9]%');
END
GO

-- 4. Índice único para evitar NIT duplicados
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Tb_Proveedor')
BEGIN
  IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_Tb_Proveedor_NIT')
  BEGIN
    CREATE UNIQUE INDEX UQ_Tb_Proveedor_NIT ON dbo.Tb_Proveedor(NIT);
  END
END
GO

-- =============================================================
-- NOTAS:
-- - Tb_HistorialEstadoOrdenCompra: guarda cada cambio de estado
--   con fecha y hora exacta del momento del cambio.
-- - Tb_AnulacionCompra: guarda el motivo y fecha/hora de anulación
--   de una compra en Gestión de Compras.
-- - CK_Tb_Proveedor_NIT: valida que el NIT tenga exactamente 10 dígitos
--   y solo contenga números.
-- - UQ_Tb_Proveedor_NIT: evita NIT duplicados.
-- =============================================================
