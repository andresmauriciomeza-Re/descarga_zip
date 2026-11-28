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

En escritorio el puntaje llega a variar 15 puntos entre corridas del mismo código. Para comparar dos versiones hay que alternar las corridas y servirlas las dos en el puerto 4173: la API no acepta otros puertos locales y la página carga sin menú.

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
| 3, Excel al exportar | Móvil | 43 | 100 | 100 | 100 | 1,6 s | 5,8 s | 2467 ms | 6,2 s | 0,009 |
| 3, Excel al exportar | Escritorio | 59 | 100 | 100 | 100 | 0,6 s | 1,7 s | 977 ms | 2,7 s | 0 |
| 5, hero sin esperar animaciones | Móvil | 62 | 100 | 100 | 100 | 1,6 s | 1,6 s | 4954 ms | 7,2 s | 0,041 |
| 5, hero sin esperar animaciones | Escritorio | 77 | 100 | 100 | 100 | 0,6 s | 1,6 s | 265 ms | 2,5 s | 0,021 |
| 4, fuentes locales | Móvil | 62 | 100 | 100 | 100 | 1,0 s | 1,0 s | 5933 ms | 7,3 s | 0 |
| 4, fuentes locales | Escritorio | 58 | 100 | 100 | 100 | 0,3 s | 1,7 s | 1357 ms | 2,8 s | 0 |

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

## Fase 3: Excel solo al exportar

- `exceljs`, `xlsx` y `jspdf` se piden al descargar (`shared/utils/optionalImport.ts`).
- Si no se pueden bajar, sale un aviso de error y la página no se recarga. La precarga al pasar el mouse tampoco recarga.
- `vendor-excel` quedó fuera de lo que la PWA guarda por adelantado: de 6,8 MB a 5,6 MB.
- Los 7 módulos descargan un Excel con las mismas hojas, celdas, estilos y anchos que antes (datos simulados).

La fila de escritorio (59) se midió justo después de compilar. Comparando las fases 2 y 3 alternadas, 5 corridas cada una:

| Versión | Rend. (mediana y rango) | TBT | LCP |
|---|---|---|---|
| Fase 2 | 79 (65–84) | 192 ms | 1,6 s |
| Fase 3 | 70 (66–75) | 366 ms | 1,8 s |

Los rangos se solapan: con esta medición no se distinguen.

Consecuencias:

- Sin conexión ya no se puede descargar un Excel desde la app instalada.
- `xlsx` sigue instalado; reemplazarlo queda como tarea aparte.

## Observado, sin cambiar

En móvil, al volver del detalle de un producto, el menú queda a veces en la posición anterior y a veces centra la tarjeta (unos 130 px de diferencia). También pasa en la versión anterior a estas fases.

## Fase 5: pintado principal (hecha antes que la 4)

Medida alternando 5 corridas de cada versión en el puerto 4173:

| Disp. | Antes: rend. (rango) / LCP | Después: rend. (rango) / LCP |
|---|---|---|
| Móvil | 42 (40–46) / 5,8 s | 62 (59–67) / 1,6 s |
| Escritorio | 70 (68–76) / 1,6 s | 77 (57–84) / 1,6 s |

Cambios:

- La primera pantalla se monta sin el fundido de entrada; los cambios de pantalla lo conservan.
- El título y el párrafo del hero se mueven, pero ya no empiezan invisibles.
- La foto del hero se precarga desde `index.html`.

La corrección 2 aprobada cambia: `initial={false}` en `AnimatePresence` se transmite a todos los componentes del primer render y habría apagado las animaciones de entrada del landing. Se puso solo en el contenedor, en la primera carga.

No se hizo:

- Versión de la foto de 800 px: en un celular la foto se recorta y se dibuja con al menos 1170 px de ancho, así que se vería borrosa.
- Las líneas del título siguen subiendo desde su recorte; el pintado principal ya cumple la meta (2,5 s).
- Adelantar la petición del catálogo en `main.tsx` (opcional; el hero no la espera).
- Esqueleto de carga en las secciones del menú: hoy quedan vacías hasta que responde la API, y añadirlo es diseño nuevo.

Observado:

- El desplazamiento de diseño subió (móvil 0,009 → 0,041; sigue bajo 0,1). Lo causa el cambio de fuente: el texto se ve antes de que lleguen las fuentes de Google. Revisar tras la Fase 4.
- El tiempo de bloqueo en móvil salió con mediana más alta (3517 → 4954 ms), con rangos que se solapan (1257–6477 y 1625–5445). Revisar en la Fase 7.
- La precarga de la foto se aplica a cualquier dirección, también a las que no muestran el hero.

## Fase 4: fuentes locales

Montserrat 600 y 700 y Poppins 400, 500 y 600, subconjunto latino, desde `@fontsource` 5.3.0. Ya no hay peticiones a Google Fonts.

Comparación alternada con la versión anterior (5 corridas, dos precargas):

| Disp. | Rend. antes → después | Primer pintado | Bloqueo del primer pintado | CLS |
|---|---|---|---|---|
| Móvil | 61 (56–62) → 64 (61–66) | 1,7 s → 1,0 s | ~960 ms → ~260 ms | 0,023 → 0,040 |
| Escritorio | 61 (57–66) → 58 (55–62) | 0,7 s → 0,3 s | ~430 ms → ~70 ms | 0,013 → 0 |

En móvil los saltos los causaban Poppins 500 y 600, que llegaban tarde. Con sus precargas (4 en total), 5 corridas dieron 0; sin ellas, 2 de 5 tuvieron saltos.

- Se agregó `woff2` a lo que guarda la PWA; sin eso la app instalada perdía las fuentes sin conexión (comprobado que las conserva).
- Capturas de 12 pantallas antes y después: entre 0 y 0,05 % de píxeles distintos.
- La página de licencias y los avisos ya no dicen que las fuentes vienen de Google Fonts; se agregaron los dos paquetes a la tabla y a los avisos regenerados.

El puntaje queda limitado por el tiempo de bloqueo (mediana de varios segundos en móvil, con mucha variación). Conviene medirlo en un Chrome con ventana antes de la Fase 7, porque estas mediciones usan Chrome sin ventana.
