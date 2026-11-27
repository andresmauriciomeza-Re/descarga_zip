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

Fases 0 a 5 completadas (un commit por fase, 1 a 5). Siguiente: Fase 6 (vaciar `App.tsx`).

Fase 5: `Header` (`PublicNav`) se sigue montando desde `App.tsx` porque lo comparten otras pantallas públicas; `Landing` arma `Content` y `Footer`.
Falta la revisión manual de las pantallas del panel con sesión iniciada.

## Fase 6 (sub-fases 6.1 a 6.8, un commit cada una)

Hecho: `App.tsx` conserva el estado y el armado de pantallas; las llamadas de respaldo de `localStorage` siguen ahí para ejecutarse en el mismo momento.

Pendiente:

- Probar a mano el cambio de rol, registro completo y checkout contra el backend real.
- `leerListaPersistida`, `esOrdenProduccionValida`, `esInsumoValido` y `esFichasValidas` (`storage.ts`) no tienen usos; revisar si se eliminan.

## Contextos

`AuthContext` y `CartContext` guardan el estado de sesión y carrito. Los efectos, `handleLogin` y `logout` siguen en `App` porque cruzan sesión, carrito, roles y navegación, y moverlos cambiaría el orden en que se ejecutan.

## Fase 7: React Router

- Tabla de rutas en `src/AppRoutes.tsx`; sincronización URL ↔ pantalla en `src/shared/hooks/useRouteSync.ts`. `App` sigue decidiendo qué pantalla pintar y llamando `navigate(screen)`.
- Se usa `react-router` 7 con `useTransitions={false}`. La versión 6 tenía avisos de seguridad.
- Sin `ProtectedRoute` ni layouts por ruta: los permisos y la disposición siguen en `App`. Queda como mejora posterior.
- `/` con sesión abierta restaura la última pantalla, como antes.
- Sin sesión, las rutas privadas llevan a `/login`; tras entrar se va al inicio, no a la ruta pedida.
- `/licencias` redirige a `/licenses`. `store-profile` usa `/account`.
- `vercel.json` reescribe todas las rutas a `index.html`. Falta confirmarlo en un despliegue real.
