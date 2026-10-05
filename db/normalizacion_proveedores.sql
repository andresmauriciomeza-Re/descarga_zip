-- =============================================================
-- Normalización de proveedores con datos incompletos
-- Sistema: S.I.V.PRO (pizzería La Sirena) — SQL Server
-- =============================================================
-- Contexto: el alta desde "+ Crear proveedor" (Crear Orden y Crear
-- Compra) no pasaba por el mismo punto que "Crear Proveedor" del
-- módulo Proveedores, por lo que podían quedar registros con el NIT
-- en dígitos puros (9876543211) mientras las semillas lo guardaban
-- con formato (901.777.888-1), además de textos con espacios de más.
--
-- Este script deja TODOS los proveedores con la misma forma:
--   Nit               10 dígitos con formato 987.654.321-1
--   Nombre            sin espacios sobrantes
--   Asesor_comercial  sin espacios sobrantes
--   Direccion         sin espacios sobrantes
--   Email             sin espacios sobrantes
--   Telefono          sin espacios al inicio/fin (se conserva el
--                     valor interno tal como está guardado)
-- Al final imprime los registros que NO se pudieron corregir
-- automáticamente (NIT que no suma 10 dígitos): esos hay que
-- revisarlos a mano.
--
-- Reversible: NO. Ejecutar con respaldo previo.
-- Idempotente: se puede ejecutar varias veces (el 2ª vez no cambia
-- nada).
-- =============================================================

PRINT '--- Normalización de proveedores (Tb_Proveedores) ---';

IF OBJECT_ID('dbo.Tb_Proveedores') IS NULL
BEGIN
  PRINT '  !! La tabla dbo.Tb_Proveedores no existe. Nada que hacer.';
  RETURN;
END
GO

-- 1) NIT: se quitan todos los signos y, si quedan exactamente 10 dígitos,
--    se escribe con el formato único del sistema (XXX.XXX.XXX-X).
;WITH base AS (
  SELECT Id_Proveedor,
         Nit,
         dig = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(Nit),
                'NIT', ''), '.', ''), '-', ''), ' ', ''), CHAR(9), '')
  FROM dbo.Tb_Proveedores
)
UPDATE p
SET p.Nit = LEFT(b.dig, 3) + '.' + SUBSTRING(b.dig, 4, 3) + '.'
            + SUBSTRING(b.dig, 7, 3) + '-' + SUBSTRING(b.dig, 10, 1)
FROM dbo.Tb_Proveedores p
INNER JOIN base b ON b.Id_Proveedor = p.Id_Proveedor
WHERE LEN(b.dig) = 10
  AND p.Nit <> LEFT(b.dig, 3) + '.' + SUBSTRING(b.dig, 4, 3) + '.'
              + SUBSTRING(b.dig, 7, 3) + '-' + SUBSTRING(b.dig, 10, 1);
PRINT '  > NIT con formato actualizados: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
GO

-- 2) Textos: espacios al inicio/final y dobles espacios internos.
UPDATE dbo.Tb_Proveedores
SET Nombre           = LTRIM(RTRIM(REPLACE(Nombre, '  ', ' '))),
    Asesor_comercial = LTRIM(RTRIM(REPLACE(Asesor_comercial, '  ', ' '))),
    Direccion        = LTRIM(RTRIM(REPLACE(Direccion, '  ', ' '))),
    Email            = LTRIM(RTRIM(Email)),
    Telefono         = LTRIM(RTRIM(Telefono))
WHERE Nombre           <> LTRIM(RTRIM(REPLACE(Nombre, '  ', ' ')))
   OR Asesor_comercial <> LTRIM(RTRIM(REPLACE(Asesor_comercial, '  ', ' ')))
   OR Direccion        <> LTRIM(RTRIM(REPLACE(Direccion, '  ', ' ')))
   OR Email            <> LTRIM(RTRIM(Email))
   OR Telefono         <> LTRIM(RTRIM(Telefono));
PRINT '  > Registros con textos limpiados: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
GO

-- 3) Reporte: los que siguen con un NIT inválido (no suma 10 dígitos)
--    no se corrigen solos porque no hay con qué rellenarlos.
PRINT '  > Proveedores con NIT inválido (revisar a mano):';
SELECT Id_Proveedor, Nit, Nombre, Estado
FROM dbo.Tb_Proveedores
WHERE LEN(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(Nit), 'NIT', ''),
          '.', ''), '-', ''), ' ', '')) <> 10;
GO

-- =============================================================
-- NOTA sobre la eliminación de proveedores (punto 3)
-- =============================================================
-- La validación "no se puede eliminar un proveedor con órdenes o
-- compras" vive en el frontend; aquí está la defensa en profundidad.
-- Ya existe en la base y NO hay que crearla de nuevo:
--
--   FK_OrdenCompras_Proveedores  (Tb_OrdenCompras.Id_Proveedor)
--   FK_Compras_Proveedores       (Tb_Compras.Id_Proveedor)
--
-- Ambas están con DELETE = NO ACTION (por defecto), por lo que un
-- DELETE sobre un proveedor referenciado falla con el error 547 y la
-- fila queda intacta. Comprobación:
-- =============================================================
SELECT fk.name                AS ForeignKey,
       OBJECT_NAME(fk.parent_object_id)  AS TablaHija,
       OBJECT_NAME(fk.referenced_object_id) AS TablaPadre,
       fk.delete_referential_action_desc AS AccionAlBorrar
FROM sys.foreign_keys fk
WHERE OBJECT_NAME(fk.referenced_object_id) = 'Tb_Proveedores';
GO
