# Reestructuración de carpetas y archivos

Rama: `refactor/estructura-ingles` (creada desde `feature/compra`, igual en ese momento a `origin/develop`). Fases 0 a 7 y 9 completadas; la 8 (hooks por módulo, opcional) no se ha hecho. La estructura final está descrita en el `README.md`.

## Línea base y cierre (2026-11-27)

| Comprobación | Antes | Al cierre |
|---|---|---|
| `npm run typecheck` | 0 errores | 0 errores |
| `node --test tests/*.mjs` | 25 de 25 | 30 de 30 |
| CSS del build | `index-cNTtHrwS.css` | el mismo archivo |
| JavaScript principal | 1207,71 kB | 1251,34 kB (React Router) |
| `App.tsx` | 10 769 líneas | unas 3200 |

En Windows, `npm run build` falla si la terminal está en `d:\…` (letra minúscula). Usar `D:\…`.

## Decisiones

- Se mantiene `.tsx`.
- Subcarpetas por módulo: `components/`, `hooks/`, `pages/`; `services/` solo si hacen falta; sin `slices/`.
- Botones de las secciones 3.1 y 3.2 del SDD: movidos y renombrados. Los de 3.3 quedan para después.
- `.env.production` se mantiene en Git.

## Diferencias con el SDD

- `Header` se monta desde `App.tsx` porque lo comparten otras pantallas públicas; `Landing` arma `Content` y `Footer`.
- `AuthContext` y `CartContext` guardan el estado. Los efectos, `handleLogin` y `logout` siguen en `App` porque cruzan sesión, carrito, roles y navegación.
- `App` sigue decidiendo qué pantalla pintar y llamando `navigate(screen)`; React Router sincroniza la URL. `AppRoutes.tsx` define las URL, no un componente por ruta.
- Sin `ProtectedRoute` ni layouts por ruta: permisos y disposición siguen en `App`.
- `react-router` 7 con `useTransitions={false}`; la versión 6 tenía avisos de seguridad.

## Cambios de comportamiento

- Sin sesión, las rutas privadas llevan a `/login`; tras entrar se va al inicio, no a la ruta pedida.
- Una sesión expirada dentro del panel termina en `/login` en lugar del landing.
- `/licencias` redirige a `/licenses`. `store-profile` usa `/account`.
- `/` con sesión abierta restaura la última pantalla, como antes.

## Antes de publicar

Las pruebas de navegador se hicieron con el backend simulado.

- Probar con el backend real: registro y verificación de correo, invitación de empleado, pedido con comprobante, recepción de compra y enlace de factura.
- Confirmar en una vista previa de Vercel que recargar `/admin/suppliers` funciona (`vercel.json` cambió).
- Comprobar que la app instalada (PWA) se actualiza.

## Pendientes

- `leerListaPersistida`, `esOrdenProduccionValida`, `esInsumoValido` y `esFichasValidas` (`storage.ts`) no tienen usos.
- `DownloadExcelButton` se importa en 7 archivos y no se dibuja en ninguno; revisar si falta el botón de Excel.
- Botones escritos a mano que podrían usar `ActionButton` (sección 3.3 del SDD).
- Fase 8: extraer la carga de datos de las pantallas grandes a `hooks/`.
