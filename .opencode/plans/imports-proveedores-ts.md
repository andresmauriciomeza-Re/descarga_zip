# Plan: reducir 9 errores TS a 1 (imports) — paso 5 postergado

Rama `feature/drex_productos` @ `a058480`. Verificación previa: `npx tsc --noEmit` = 9 errores.
Cambio de imports solamente. **Sin commit.** Paso 5 (`OrdenCompraScreen.tsx:516`, `ProveedorRef.id`) postergado a decisión del usuario.

## PASO 1 — `src/app/screens/SuppliersScreen.tsx`

### 1a) Línea 3
```tsx
ANTES:
import { Plus, X, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

DESPUÉS:
import { Plus, X, ChevronLeft, ChevronRight, AlertCircle, Search, Eye, Pencil, Trash2 } from "lucide-react";
```
Resuelve: :449 `Search`, :519 `Eye`, :524 `Pencil`, :530 `Trash2`.
Sin colisión: existe `search` minúscula (:174) y comentario `{/* Search */}` (:447).

### 1b) Línea 148 (ampliar import existente, NO agregar línea nueva)
```tsx
ANTES:
import type { OrdenCompra, GestionCompra } from "./OrdenCompraScreen";

DESPUÉS:
import type { OrdenCompra, GestionCompra, ProveedorRef } from "./OrdenCompraScreen";
```
Resuelve: :157 y :158. `ProveedorRef` se exporta en `OrdenCompraScreen.tsx:110`.

**Resultado: 6 → 0.**

## PASO 2 — `src/app/screens/GestionCompraScreen.tsx`

Línea 5:
```tsx
ANTES:
  Plus, Check, Ban, CheckCircle2,

DESPUÉS:
  Plus, Check, Ban, CheckCircle2, HelpCircle,
```
Resuelve: :911 `HelpCircle` (tooltip de precios). No renombrar a `CircleHelp`.

**Resultado: 1 → 0.**

## PASO 3 — `src/app/screens/OrdenCompraScreen.tsx`

Línea 14:
```tsx
ANTES:
  AlertTriangle, CheckCircle2, Lock,

DESPUÉS:
  AlertTriangle, CheckCircle2, Lock, Eye,
```
Resuelve: :2385 `Eye`.

**Resultado: 2 → 1** (queda el paso 5).

## PASO 4
Incluido en 1b (no requiere archivo adicional).

## Verificación
```powershell
npx tsc --noEmit
```
Esperado: **1 error** total, `src/app/screens/OrdenCompraScreen.tsx(516,15): error TS2741` (id faltante).
Cero errores nuevos. Opcional: `npm run build` (debe seguir exit 0).

## Verificaciones ya hechas (no repetir)
- 1 solo import de `lucide-react` por archivo (SuppliersScreen:3, GestionCompraScreen:3-6, OrdenCompraScreen:11-15).
- `Search/Eye/Pencil/Trash2/HelpCircle` NO están importados hoy en esos archivos.
- Los 5 nombres existen en `lucide-react` instalado (verificado en runtime).
- `ProveedorRef` exportado real; patrón `import type ... from "./OrdenCompraScreen"` ya usado en RecepcionCompraScreen:19 y GestionCompraScreen:26.

## PASO 5 — POSTERGADO (no aplicar)
`NuevoProveedorModal` (`OrdenCompraScreen.tsx:487`), `submit()` :513-525 llama `onGuardar({...})` **sin `id`** (:516).
Llamadores: `GestionCompraScreen.tsx:1195` → `crearProveedor` (:374, usa `setProvId(p.id)` en :381) y `OrdenCompraScreen.tsx:1385` → `handleNuevoProv` (:871) → `handleNuevoProveedor` (:1490) / `handleNuevoProveedorLocal` (:2045). **Ninguno asigna `id` aguas arriba.**
- App.tsx no usa el modal (0 coincidencias); solo declara el estado con `PROVEEDORES_INIT` (:8538) y lo pasa como prop.
- SuppliersScreen no usa el modal; tiene `handleCreate` (:226-242) que **sí** genera `PROV-00N` (:232-236).

### Opción (a) — `Omit<ProveedorRef, "id">` / `id?` opcional
Mínimo tipográfico, pero: (1) desplaza el error a las firmas de `crearProveedor`/`handleNuevoProv`; (2) el proveedor queda sin id en runtime → `setProvId(undefined)` y `find(p => p.id === g.proveedorId)` (:1419, :1528) no matchean; (3) con `strict:false` no hay ningún error tipo que lo delate → bug silencioso.

### Opción (b) — RECOMENDADA: generar `id` al guardar
Dentro de `submit()` (:513-525), con `existentes?: { nit: string; nombre: string }[]` (**:495**) ampliado a `ProveedorRef[]` (los 2 call sites ya pasan `existentes={proveedores}`: GestionCompraScreen:1194, OrdenCompraScreen:1384 → no cambian). Patrón igual a `SuppliersScreen.tsx:232-236`:
```tsx
const nextNum = existentes.reduce((max, x) => Math.max(max, parseInt(x.id.replace("PROV-", ""), 10) || 0), 0) + 1;
const id = `PROV-${String(nextNum).padStart(3, "0")}`;
```
Compatible con `useProveedorForm(..., existentes)` (:510): `ProveedorRef[]` es subtipo de `{nit, nombre}[]`.
Riesgos: bajo (mismo patrón aceptado); medio (colisión si 2 modales en estados divergentes, igual que SuppliersScreen).
**Requiere aprobación explícita antes de aplicar.**
