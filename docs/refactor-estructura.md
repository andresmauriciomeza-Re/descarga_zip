# Reestructuración de carpetas: línea base y decisiones

Rama: `refactor/estructura-ingles` (creada desde `develop`).

## Línea base (2026-11-27)

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` | 0 errores |
| `npm run build` | compila; `dist/` ≈ 10,4 MB en 61 archivos, `index-*.js` 1207,71 kB |
| `node --test tests/*.mjs` | 25 de 25 |

En Windows, `npm run build` falla si la terminal está en `d:\…` (letra minúscula). Usar `D:\…`.

## Decisiones

- Se mantiene `.tsx`.
- Subcarpetas por módulo: `components/`, `hooks/`, `pages/`; `services/` solo si hay API; sin `slices/`.
- Botones de las secciones 3.1 y 3.2: se mueven y renombran. Los de 3.3 quedan para después.
- React Router se instala en la Fase 7.
- `.env.production` se mantiene en Git.

## Pendientes a cuidar en la Fase 7

- Conservar los parámetros `?activar=`, `?verificar=` y `?factura=`.
- Agregar en `vercel.json` el rewrite general a `index.html`.
- Las pantallas de detalle dependen de estado además del nombre de pantalla; conservar scroll y sesión.
- No agregar el footer del landing a otras rutas.
- Revisar las pantallas que no están en la tabla de rutas (p. ej. `manage-products`).

## Avance

Fases 0 a 4 completadas (un commit por fase, 1 a 4). Siguiente: Fase 5 (`layout/`).
Falta la revisión manual de las pantallas del panel con sesión iniciada.
