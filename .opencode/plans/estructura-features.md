# Plan: Reorganización de src/ a estructura feature-based (ACTUALIZADO)

**Objetivo**: Terminar la reorganización de `src/` a estructura feature-based SIN cambiar comportamiento, lógica, JSX ni estilos. Solo se mueven archivos y se corrigen rutas de import.

**Fecha**: 2026-10-00
**Estado**: Pendiente de aprobación

---

## 0. HALLAZGO CRÍTICO: la migración ya está ~70% ejecutada (sin commit)

`git status` muestra **103 entradas** staged/modificadas de una sesión anterior:
- Todos los archivos del mapa ya fueron `git mv`'d a sus features/shared (historial preservado en el índice).
- Se creó el esqueleto de las 20 carpetas de `features/` con sus 5 subcarpetas y `.gitkeep`.
- Muchos imports ya apuntan a `@/shared/...` y `@/features/...`.
- **Pero quedó incompleto**: `App.tsx` no se movió, los CSS quedaron anidados dos veces (`shared/styles/styles/`), `@source` de Tailwind no se actualizó, `main.tsx` importa un CSS que no existe donde dice, y ~20 archivos tienen imports rotos (88 errores TS actuales).

**Decisión implícita del plan**: continuar desde este estado (no hacer reset; los `git mv` ya staged preservan historial). Si prefieres revertir y rehacer limpio, dímelo antes de ejecutar.

---

## 1. Línea base

### Estado actual del árbol (medido hoy, post-movimientos parciales)
```
npx tsc --noEmit
```
**Resultado**: **88 errores** (91 líneas de salida):
| Tipo | Cantidad | Causa |
|------|----------|-------|
| TS2307 Cannot find module | 78 | Imports sin actualizar tras los moves (esta tarea los debe llevar a 0) |
| TS2339 Property does not exist | 8 | 5 preexistentes + 3 en cascada por augmentación rota (ver abajo) |
| TS2664 Invalid module augmentation | 1 | `declare module "./OrdenCompraScreen"` roto en GestionCompraScreen |
| TS2322 Type assign | 1 | Preexistente en App.tsx:6913 |

Desglose de los no-TS2307 (verificados en código):
- **Preexistentes (existen idénticos en HEAD)**: App.tsx:6913 (TS2322 MotivoDevolucion), App.tsx:8380–8381 (TS2339 ×3 sobre `unknown`), GestionUsuariosScreen:378 (TS2339 `every`) → **5 errores**.
- **En cascada por la migración**: GestionCompraScreen:56 TS2664 (augmentación `declare module "./OrdenCompraScreen"` ya no resuelve) → provoca 4 TS2339 de `stockAplicado`/`stockRevertido` en OrdenCompraScreen:2149/2157 y RecepcionCompraScreen:603. **Desaparecen al fijar el alias.**

⚠️ **Discrepancia**: dices "~9 preexistentes"; el plan viejo decía 0; mi inspección de HEAD dice 5. Durante la ejecución (Lote 0) mediré el baseline real de HEAD con un `git worktree` temporal en `%TEMP%` (no toca el árbol principal) y fijaremos la cifra de comparación.

### Build
`npm run build` **está roto ahora**: `main.tsx` importa `./shared/styles/index.css` pero el archivo quedó en `shared/styles/styles/index.css`. No lo corro en modo plan (reescribe `dist/`).
Baseline del plan anterior (medido antes de los moves): **CSS 159.93 kB** (gzip 24.60 kB), **JS 3,001.15 kB** (gzip 821.25 kB), build ~38 s. Re-mediré en el worktree de HEAD durante la ejecución.

---

## 2. Estado actual vs objetivo (verificado en código real)

### Ya hecho ✔
- `git mv` de las 21 pantallas a `features/*/pages/` según el mapa.
- `git mv` de componentes compartidos a `shared/components/` (incl. `ui/` completa y `figma/`).
- `git mv` de hooks/services a `features/compras/{hooks,services}`, `features/ventas/services`, `features/categoria-productos/services`, `shared/utils`.
- Esqueleto de las 20 features con `{components,hooks,pages,services,slices}/.gitkeep`.
- Imports ya corregidos a alias `@/...` en la mayoría de pantallas (Ventas, Insumos, Config, Roles, Productos-partial, OrdenCompra-partial, etc.).
- `shared/contexts/`, `shared/hooks/`, `shared/services/` creados con `.gitkeep`.

### Pendiente ✖
1. **Styles anidados dos veces**: CSS en `src/shared/styles/styles/*.css` (debería ser `src/shared/styles/*.css`). `@source` de tailwind.css NO se actualizó. `main.tsx` importa ruta inexistente.
2. **App.tsx** sigue en `src/app/App.tsx`; sus 22 imports `./screens/*` siguen rotos; `main.tsx` aún importa `./app/App`.
3. **~20 archivos** con imports relativos viejos (tabla §3).
4. **Huérfanos** `GestionAgendaScreen`/`GestionPerdidasScreen` quedaron con imports rotos (sus dependencias se movieron).

---

## 3. Tabla de correcciones de import PENDIENTES (cada una verificada contra tsc/grep)

> Convención destino: alias `@/features/<carpeta>/pages/<Archivo>`. No se crean barrels.

### 3.1 Lote styles (ver §4-A)
| Archivo actual | Acción |
|---|---|
| `src/shared/styles/styles/{fonts,globals,index,tailwind,theme}.css` | `git mv` → `src/shared/styles/` (quitar nivel); borrar dir vacío |
| `src/shared/styles/tailwind.css` (tras mover) | `@source '../**/*.{js,ts,jsx,tsx}'` → `'../../**/*.{js,ts,jsx,tsx}'` |
| `src/main.tsx` | El import CSS `./shared/styles/index.css` queda correcto tras aplanar |

### 3.2 App.tsx (mover a `src/App.tsx` + 22 imports)
| Línea | De | A |
|---|---|---|
| main.tsx:3 | `./app/App` | `./App` |
| 102 | `./screens/CategoriaProductoScreen` | `@/features/categoria-productos/pages/CategoriaProductoScreen` |
| 103 | `./screens/GestionClientesScreen` | `@/features/clientes/pages/GestionClientesScreen` |
| 104 | `./screens/GestionCompraScreen` | `@/features/compra/pages/GestionCompraScreen` |
| 105 | `./screens/GestionConfigScreen` | `@/features/roles/pages/GestionConfigScreen` |
| 106 | `./screens/GestionEmpleadosScreen` | `@/features/empleados/pages/GestionEmpleadosScreen` |
| 107,111 | `./screens/GestionInsumosScreen` | `@/features/insumos/pages/GestionInsumosScreen` |
| 112 | `./screens/GestionProductosScreen` | `@/features/productos/pages/GestionProductosScreen` |
| 118 | `./screens/GestionUsuariosScreen` | `@/features/usuarios/pages/GestionUsuariosScreen` |
| 119 | `./screens/MiPerfilScreen` | `@/features/usuarios/pages/MiPerfilScreen` |
| 120 | `./screens/MisPedidosScreen` | `@/features/ventas/pages/MisPedidosScreen` |
| 125,133 | `./screens/OrdenCompraScreen` | `@/features/orden-compra/pages/OrdenCompraScreen` |
| 142 | `./screens/OrdenProduccionScreen` | `@/features/orden-produccion/pages/OrdenProduccionScreen` |
| 143 | `./screens/ProductosPerecederosScreen` | `@/features/cpn/pages/ProductosPerecederosScreen` |
| 144 | `./screens/ProductoTerminadoScreen` | `@/features/productos/pages/ProductoTerminadoScreen` |
| 147 | `./screens/PurchasesScreen` | `@/features/compras/pages/PurchasesScreen` |
| 148 | `./screens/RecepcionCompraScreen` | `@/features/orden-compra/pages/RecepcionCompraScreen` |
| 149 | `./screens/RecetasScreen` | `@/features/productos/pages/RecetasScreen` |
| 153 | `./screens/SalesChartScreen` | `@/features/dashboard/pages/SalesChartScreen` |
| 156 | `./screens/SuppliersScreen` | `@/features/proveedores/pages/SuppliersScreen` |
| 157 | `./screens/VentasScreen` | `@/features/ventas/pages/VentasScreen` |

(Los imports de `@/shared/...` y `@/imports/...` en App.tsx ya están correctos.)

### 3.3 Features — pages con imports cruzados rotos
| Archivo | De → A |
|---|---|
| `features/clientes/pages/GestionClientesScreen.tsx` | `./GestionUsuariosScreen` ×2 → `@/features/usuarios/pages/GestionUsuariosScreen`; `./GestionEmpleadosScreen` → `@/features/empleados/pages/GestionEmpleadosScreen`; `./GestionConfigScreen` → `@/features/roles/pages/GestionConfigScreen` |
| `features/empleados/pages/GestionEmpleadosScreen.tsx` | `./GestionConfigScreen` → roles; `./GestionUsuariosScreen` → usuarios; `./GestionClientesScreen` → clientes (alias `@/features/.../pages/...`) |
| `features/usuarios/pages/GestionUsuariosScreen.tsx` | `./GestionConfigScreen` → roles; `./GestionEmpleadosScreen` → empleados; `./GestionClientesScreen` → clientes |
| `features/usuarios/pages/MiPerfilScreen.tsx` | `./GestionEmpleadosScreen` → empleados; `./GestionUsuariosScreen` → usuarios (mismo feature, pero usar alias por simetría — o dejar `./` válido, ver nota); `./GestionConfigScreen` → roles |
| `features/compra/pages/GestionCompraScreen.tsx` | `../utils/exportExcelEstilizado` → `@/shared/utils/exportExcelEstilizado`; `../utils/iva` → `@/features/compras/services/iva`; `../utils/inventario` → `@/features/compras/services/inventario`; `./GestionInsumosScreen` → insumos; `./GestionProductosScreen` → productos; `./OrdenCompraScreen` → `@/features/orden-compra/pages/OrdenCompraScreen`; `../components/CompactInsumoForm` → `@/features/compras/components/CompactInsumoForm`; `../components/InsumosSolicitadosTable` → `@/features/compras/components/InsumosSolicitadosTable`; **L56** `declare module "./OrdenCompraScreen"` → `declare module "@/features/orden-compra/pages/OrdenCompraScreen"` |
| `features/compras/pages/PurchasesScreen.tsx` | `./SuppliersScreen` → `@/features/proveedores/pages/SuppliersScreen` |
| `features/orden-compra/pages/OrdenCompraScreen.tsx` | `./GestionInsumosScreen` → insumos; `../utils/exportExcelEstilizado` → `@/shared/utils/...`; `../utils/inventario` → `@/features/compras/services/inventario` |
| `features/orden-compra/pages/RecepcionCompraScreen.tsx` | `../utils/iva` → `@/features/compras/services/iva`; `../utils/inventario` → `@/features/compras/services/inventario`; `./GestionInsumosScreen` → insumos |
| `features/orden-produccion/pages/OrdenProduccionScreen.tsx` | `../utils/exportExcelEstilizado` → `@/shared/utils/...`; `./GestionInsumosScreen` → insumos; `./VentasScreen` → `@/features/ventas/pages/VentasScreen`; `./GestionProductosScreen` → productos; `./ProductosPerecederosScreen` → `@/features/cpn/pages/ProductosPerecederosScreen` |
| `features/cpn/pages/ProductosPerecederosScreen.tsx` | `./GestionInsumosScreen` → insumos; `./GestionProductosScreen` → productos; `./OrdenProduccionScreen` → orden-produccion |
| `features/proveedores/pages/SuppliersScreen.tsx` | `./OrdenCompraScreen` ×2 (L17, L326) → `@/features/orden-compra/pages/OrdenCompraScreen` |
| `features/productos/pages/GestionProductosScreen.tsx` | `../utils/exportExcelEstilizado` → `@/shared/utils/...`; `../components/ConfirmDeleteModal` → `@/shared/components/ConfirmDeleteModal`; `./GestionInsumosScreen` → insumos; `./CategoriaProductoScreen` → `@/features/categoria-productos/pages/CategoriaProductoScreen`; `../components/EstadoProducto` ×2 (import + re-export L62-63) → `@/shared/components/EstadoProducto` |
| `features/productos/components/InsumoSearchField.tsx` | `../screens/GestionInsumosScreen` → `@/features/insumos/pages/GestionInsumosScreen` |
| `features/insumos/pages/GestionInsumosScreen.tsx` | `../utils/exportExcelEstilizado` → `@/shared/utils/exportExcelEstilizado` |
| `features/categoria-productos/pages/CategoriaProductoScreen.tsx` | `../constants/iconosCategoria` → `@/features/categoria-productos/services/iconosCategoria` |
| `features/ventas/pages/VentasScreen.tsx` | `../utils/facturaVenta` → `@/features/ventas/services/facturaVenta`; `../utils/exportExcel` → `@/features/ventas/services/exportExcel` |

*Nota*: `MisPedidosScreen.tsx` usa `./VentasScreen` y `hora12` de `@/shared/utils/hora` — ya funciona (mismo directorio); sin cambios.

### 3.4 Features — services/hooks/components
| Archivo | De → A |
|---|---|
| `features/compras/services/inventario.ts` | `../screens/GestionInsumosScreen` → `@/features/insumos/pages/GestionInsumosScreen`; `../screens/GestionProductosScreen` → `@/features/productos/pages/GestionProductosScreen`; `../screens/OrdenCompraScreen` → `@/features/orden-compra/pages/OrdenCompraScreen` |

(El resto de compras/components, compras/hooks, ventas/services, shared/utils ya están sin errores.)

### 3.5 shared — 2 archivos
| Archivo | De → A |
|---|---|
| `shared/components/CambiarRolMenu.tsx` | `../screens/GestionConfigScreen` → `@/features/roles/pages/GestionConfigScreen` |
| `shared/components/SelectorRoles.tsx` | `../screens/GestionConfigScreen` → `@/features/roles/pages/GestionConfigScreen` |

### 3.6 NO MOVER — pero SÍ corregir sus imports (huérfanos)
Nadie los importa (verificado con grep), pero tsc los compila y ahora están rotos:
| Archivo | Corrección mínima (sin mover) |
|---|---|
| `src/app/screens/GestionAgendaScreen.tsx` | `../components/CalendarDropdown` → `@/shared/components/CalendarDropdown`. (`../components/EstadoSwitch` sigue válido: EstadoSwitch no se movió.) |
| `src/app/screens/GestionPerdidasScreen.tsx` | `../components/CalendarDropdown` → `@/shared/components/CalendarDropdown`; `../components/ConfirmDeleteModal` → `@/shared/components/ConfirmDeleteModal` |
| `src/app/components/EstadoSwitch.tsx` | Sin imports rotos. Sin cambios. |

Pendiente de tu decisión su destino final (§7).

---

## 4. Orden de ejecución por lotes

### LOTE 0 — Baseline real (solo lectura + worktree temporal)
1. `git worktree add "$env:TEMP\descarga_zip-baseline" HEAD` (no toca el árbol principal).
2. En el worktree (con `node_modules` enlazado o instalado allí): `npx tsc --noEmit` y `npm run build`; anotar errores exactos + tamaños CSS/JS.
3. `git worktree remove` al terminar el baseline.
**Verificar**: cifras anotadas en §1.

### LOTE A — Styles
1. `git mv src/shared/styles/styles/*.css src/shared/styles/` ; eliminar `src/shared/styles/styles/` vacío.
2. Editar `src/shared/styles/tailwind.css`: `@source '../../**/*.{js,ts,jsx,tsx}'`.
**Verificar**: `Test-Path src/shared/styles/index.css` → true; `main.tsx` resuelve. `npx tsc --noEmit` (los TS2307 de pantallas siguen, el CSS no afecta a tsc).

### LOTE B — Imports de features y shared (~20 archivos)
Aplicar todas las filas de §3.3, §3.4 y §3.5 con edición puntual de líneas de import (preservar CRLF; no formatear).
**Verificar**: `npx tsc --noEmit` → solo quedan errores de `App.tsx` y de los 2 huérfanos de `app/screens/`.

### LOTE C — Huérfanos (imports in-place, sin mover)
Aplicar §3.6.
**Verificar**: `npx tsc --noEmit` → solo quedan errores de `App.tsx` (los 5 preexistentes + sus 22 TS2307).

### LOTE D — App.tsx + main.tsx
1. `git mv src/app/App.tsx src/App.tsx`.
2. Aplicar los 22 reemplazos de §3.2 en `src/App.tsx`.
3. `main.tsx`: `./app/App` → `./App`.
4. `src/app/` queda solo con `components/EstadoSwitch.tsx` y `screens/{GestionAgenda,GestionPerdidas}Screen.tsx` (huérfanos a la espera de decisión).
**Verificar**: `npx tsc --noEmit` → **exactamente** los errores preexistentes del baseline de Lote 0 (cero TS2307, cero TS2664; los 4 stock* en cascada deben desaparecer).

### LOTE E — Verificación final
1. `npx tsc --noEmit` → misma lista que baseline Lote 0.
2. `npm run build` → exitoso; comparar CSS (**~159.93 kB**) y JS con baseline. Si el CSS se desvía >1%, revisar `@source`.
3. `git status` → solo moves/ediciones esperadas; ningún archivo borrado; nada tocado en `dist/`, configs, `imports/`, `types/`.
4. Smoke check visual opcional: `npm run dev` y pasar 2–3 pantallas (Dashboard, Ventas, Compras).
5. **Sin commit ni push** (salvo que lo pidas).

---

## 5. Verificación final (tabla)

| Métrica | Línea base (Lote 0) | Post-movimiento | OK |
|---|---|---|---|
| Errores TS | ~5 preexistentes (confirmar) | idénticos | ☐ |
| TS2307 / TS2664 | 0 en baseline | 0 | ☐ |
| Build | exitoso | exitoso | ☐ |
| CSS size | ~159.93 kB | ~159.93 kB (±1%) | ☐ |
| JS size | ~3,001.15 kB | ~equiv | ☐ |

---

## 6. Riesgos y mitigación

1. **`@source` de Tailwind** (confirmado, y peor de lo estimado): los CSS quedaron en `shared/styles/styles/` (doble nivel) y `@source '../**/*'` solo escaneaba `shared/styles/**`. Mitigación: aplanar a `shared/styles/` + `@source '../../**/*'` (Lote A) y comparar tamaño de CSS final con baseline.
2. **Imports circulares** (confirmados): Clientes↔Usuarios↔Empleados↔Config (types + algunas values como `DOC_TIPOS`, `fullAccesos`); OrdenProduccion↔ProductosPerecederos; Compra→OrdenCompra. Mitigación: alias directo `@/features/.../pages/...`, sin barrels. TS/Vite manejan estos ciclos igual que antes (los ciclos ya existían con imports relativos).
3. **CRLF** (confirmado): editar solo líneas de import, conservando finales de línea; sin Prettier.
4. **`components/ui/` con imports relativos internos** (confirmado): ya se movió completa e intacta; no tocar nada dentro.
5. **`declare module` con alias** (nuevo): la augmentación de `GestionCompra` en GestionCompraScreen:56 debe pasar a `declare module "@/features/orden-compra/pages/OrdenCompraScreen"`; TS lo resuelve vía `paths`. Verificación: los 4 TS2339 de `stockAplicado`/`stockRevertido` deben desaparecer. Si TS no acepta el alias en la augmentación, alternativa: ruta relativa `../../orden-compra/pages/OrdenCompraScreen` solo en esa línea.
6. **Estado intermedio sin commit**: hay 103 entradas staged sin commit. Si algo sale mal en la ejecución, el recuperador es `git restore --staged --worktree src/` (descarta todo el trabajo previo) — solo como plan de emergencia, no ejecutar sin pedirlo.
7. **Huérfanos con imports rotos**: aunque nadie los importa, rompen el tsc. Se corrigen in-place (Lote C) sin moverlos.

---

## 7. Preguntas abiertas (necesito tu decisión)

1. **Continuar o revertir**: ¿sigo desde el estado parcial (recomendado, preserva `git mv`) o revierto todo y rehago limpio?
2. **Huérfanos** (`GestionAgendaScreen`, `GestionPerdidasScreen`, `EstadoSwitch`): ¿corrijo solo sus imports y los dejo en `app/` a la espera, o los muevo a algún feature (¿cuál?)?
3. **Styles**: ¿aplanar a `shared/styles/` directo (recomendado, coincide con el mapa) o mantener `shared/styles/styles/` (habría que usar `@source '../../../**/*'`)?
4. **PurchasesScreen** (en `compras/pages`, no aparece en el menú de App): ¿se queda ahí o es código muerto a migrar/eliminar luego?
5. **MiPerfilScreen** (`usuarios/pages`) y **MisPedidosScreen** (`ventas/pages`): ¿confirmas esa ubicación?
6. **Carpetas vacías de sección** (`configuracion`, `produccion`, `modulo-usuarios`, `modulo-ventas`, `devoluciones`): ¿solo esqueleto `.gitkeep` está bien? (Los ítems reales viven en sus features; `GestionConfigScreen` está en `roles/` por el mapa.)
7. **Baseline "~9"**: mi análisis dice 5 preexistentes. ¿Los ~9 que recuerdas incluían los 4 en cascada de `stockAplicado`? Lo confirmaré midiendo HEAD en el Lote 0.

---

## 8. FASE B (OPCIONAL — NO EJECUTAR en esta tarea)

Evaluación solo de viabilidad para extraer de `App.tsx` (10,479 líneas, 455.6 KB) dos pantallas embebidas:

### DashboardScreen (App.tsx:5716–~6114)
- **Identificadores de scope App.tsx que necesita**: tipo `Screen` (prop `navigate`), tipo `Venta`, `AccesosMap`, `minutosDeHora` (ya en `@/shared/utils/hora`), constantes `SERIF`/`MONO` (App.tsx:750–751, locales), y posiblemente `HOURLY_TODAY`/`SalesChartScreen` (ya en `features/dashboard/pages`).
- **Viable?** Sí, de riesgo **medio-bajo**: requiere exportar `type Screen` desde App.tsx (o moverlo a `shared/types/`) y pasar `SERIF`/`MONO` como props/consts locales duplicadas (el patrón ya existe: DevolucionesScreen define sus propias `SERIF_DEV`/`MONO_DEV`). JSX y lógica no cambian.

### DevolucionesScreen (App.tsx:6923–~7500?)
- **Identificadores**: tipos `Venta`, `Producto`, `OrdenProduccion`, `FichasPorProducto`, `Insumo`, `CategoriaProducto` (ya exportados por sus features), tipo local `EstadoDevolucion` (definido en App.tsx — habría que exportarlo o moverlo), `EstadoSelect` (ya en shared), `toast`, y sus propias `SERIF_DEV`/`MONO_DEV` (App.tsx:6870–6871, definidas justo antes — viajarían con ella).
- **Viable?** Sí, de riesgo **bajo-medio**: casi todo son tipos ya exportados; el único punto es `EstadoDevolucion` y los 4 errores TS preexistentes de App.tsx que tocan devoluciones (6913, 8380–8381) — al extraer, esos errores se moverían de archivo pero no se corregirían (fuera del alcance de "solo mover").

**Recomendación Fase B**: hacerla en una sesión futura aparte, después de que esta reorganización quede verificada y commiteada.

---

## 9. Restricciones (NO TOCAR)

- Nada de lógica, JSX, clases Tailwind, estados, localStorage keys, nombres de exports ni orden de props.
- No ejecutar Prettier ni formatear.
- No tocar: `package.json`, `package-lock.json`, `pnpm-workspace.yaml`, `vite.config*.ts`, `tsconfig.json`, `postcss.config*`, `index.html`, `db/`, `artifacts/`, `dist/`, `guidelines/`, `node_modules/`, `.git/`, `.gitignore`, `.opencode/plans/` (excepto este archivo), `src/imports/`, `src/types/`, ni duplicados `*-1`/`*-2`.
- No instalar dependencias. No agregar Redux, react-router ni nada nuevo. No crear `routes.tsx` ni barrels `index.ts`.
- No borrar ningún archivo. Usar `git mv`.
- No hacer commit ni push.
- Si algo no está claro, preguntar; no asumir.

---

**Detenido aquí. Espero tu aprobación y respuestas a §7 antes de ejecutar cualquier lote.**
