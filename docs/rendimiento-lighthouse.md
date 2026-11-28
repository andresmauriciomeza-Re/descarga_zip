# Rendimiento y Lighthouse

Plan: `SDD-lighthouse-sivpro-v2.md`. Rama: `perf/lighthouse`, creada desde `refactor/estructura-ingles` (`c5f904a`).

## Correcciones aprobadas al plan (2026-11-27)

1. **Fase 2:** además de `App.tsx`, importan desde pantallas `shared/utils/storage.ts`, `layout/components/Content.tsx` (`estadoDe`), `features/auth/hooks/useSession.ts` y otras pantallas y componentes (`tipoDe`, `CATEGORIAS_INSUMO`, `DOC_TIPOS`, `ordenarContrataciones`). También hay que moverlo; si no, Excel sigue en el arranque.
2. **Fase 5:** en `App.tsx`, el contenedor animado envuelve toda la app y empieza transparente. Agregar `initial={false}` en `AnimatePresence`.
3. **Fase 5:** la imagen del hero se queda en `src/assets/img/` y se precarga desde ahí. `public/img/` está fuera del caché de la PWA.
4. **Fase 2:** si falla la carga de una pantalla porque se publicó una versión nueva, recargar la página.
5. **Fase 3:** productos no conformes usa `xlsx`, no `exceljs`. Por ahora las librerías solo se cargan al exportar; reemplazar `xlsx` queda como tarea aparte.
6. **Fase 7:** incluir también `App.tsx` y `ActivateAccountModal`, que cargan `motion` al arrancar.

## Cómo se mide

- Producción: `npm run build` y `npm run preview` (puerto 4173).
- `npx lighthouse@13.6.0` con Chrome sin ventana y perfil limpio (sin extensiones); escritorio con `--preset=desktop`.
- 3 corridas y la mediana de cada columna.
- La API (`.env.production`) se despierta antes de cada corrida: el primer pedido llegó a tardar 16,7 s.
- Informes HTML y JSON en `D:\Documentos\SIVPRO\lighthouse-informes\`, fuera del repositorio.

Los números sirven para comparar entre fases con este mismo método. DevTools en otro equipo puede dar valores distintos; el tiempo de bloqueo es el que más varía.

## Mediciones

| Fase | Disp. | Rend. | Acces. | Práct. | SEO | FCP | LCP | TBT | SI | CLS |
|------|-------|:-----:|:------:|:------:|:---:|-----|-----|-----|----|-----|
| Antes (modo desarrollo, con extensión; medido por el usuario) | Móvil | 42 | 96 | 100 | 100 | 8,5 s | 16,8 s | 320 ms | 11,0 s | 0 |
| 0, línea base | Móvil | 36 | 96 | 100 | 100 | 1,6 s | 9,3 s | 3831 ms | 8,3 s | 0,009 |
| 0, línea base | Escritorio | 58 | 96 | 100 | 100 | 0,7 s | 2,1 s | 554 ms | 2,9 s | 0,008 |
| 1, contraste | Móvil | 36 | 100 | 100 | 100 | 1,6 s | 9,4 s | 4453 ms | 8,1 s | 0,001 |
| 2, pantallas bajo demanda | Móvil | 42 | 100 | 100 | 100 | 1,6 s | 6,1 s | 2956 ms | 6,3 s | 0,009 |
| 2, pantallas bajo demanda | Escritorio | 79 | 100 | 100 | 100 | 0,6 s | 1,6 s | 263 ms | 2,5 s | 0 |

## Línea base

Archivos del build (sin comprimir / gzip):

| Archivo | Tamaño | gzip |
|---|---|---|
| `index.js` | 1251 kB | 371 kB |
| `vendor-excel.js` (se precarga en el inicio) | 1226 kB | 367 kB |
| `vendor-charts.js` | 416 kB | 112 kB |
| `vendor-react.js` | 143 kB | 46 kB |
| CSS | 201 kB | 32 kB |

Avisos principales en móvil: JavaScript sin usar (537 KiB), solicitudes que bloquean el pintado (960 ms), retraso de pintado del texto principal (4,1 s) e imágenes (50 KiB). El único fallo de accesibilidad es el contraste del texto de la franja de estadísticas (3,24 : 1).

## Fase 2: pantallas bajo demanda

| | Antes | Después |
|---|---|---|
| Archivo principal | 1251 kB (371 kB gzip) | 466 kB (152 kB gzip) |
| Excel en el arranque | sí, precargado | no |
| Peso total del landing | 1055 KiB | 482 KiB |
| Ciclos de importación | 2 | 1 (`authService` y `api`) |

Desvíos del plan:

- `TIPOS_PRODUCTO` y `TipoProducto` pasaron a `shared/utils/categoryConfig.ts` para no crear un ciclo al mover `tipoDe`.
- `BottomNav` se queda con carga directa: también se dibuja en la parte pública.
- Archivo nuevo `shared/utils/lazyScreens.ts` para la precarga. No cabía en `AppRoutes.tsx` (lo empaqueta el test de rutas) ni en `screen.ts` (lo importan las pantallas). Las pantallas no deben importarlo.
- `main.tsx` recarga una vez la página si falta un archivo (versión nueva publicada) y hay conexión. Al recargar se pierde lo que estuviera escrito en un formulario sin guardar.

Para la Fase 3: un `import()` de Excel que falle también dispararía esa recarga. Hay que tratarlo para que muestre el aviso de error en su lugar.

El service worker todavía guarda en segundo plano todos los archivos, Excel incluido (136 entradas, 6,8 MB). Se trata en la Fase 3.
