# Reestructuración de carpetas y archivos

Rama: `refactor/estructura-ingles` (creada desde `feature/compra`, igual en ese momento a `origin/develop`). Fases 0 a 9 completadas (la 8, en parte; ver abajo). La estructura final está descrita en el `README.md`.

## Línea base y cierre (2026-11-27)

| Comprobación | Antes | Al cierre |
|---|---|---|
| `npm run typecheck` | 0 errores | 0 errores |
| `node --test tests/*.mjs` | 25 de 25 | 30 de 30 |
| CSS del build | `index-cNTtHrwS.css` | el mismo archivo |
| JavaScript principal | 1207,71 kB | 1254,35 kB (sobre todo React Router) |
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

## Fase 8: hooks por módulo

Cada hook agrupa carga de datos, búsqueda, filtros y paginación; formularios, diálogos y acciones siguen en la pantalla. Un commit por módulo: clientes, usuarios, proveedores, roles, categorías, productos terminados, compras, órdenes de compra, no conformes, órdenes de producción, insumos, ventas, empleados (solo carga), devoluciones y menú público.

Las quince pantallas dieron el mismo texto antes y después al cargar, buscar, filtrar y paginar con datos simulados.

## Antes de publicar

Las pruebas de navegador se hicieron con el backend simulado.

- Probar con el backend real: registro y verificación de correo, invitación de empleado, pedido con comprobante, recepción de compra y enlace de factura.
- Confirmar en una vista previa de Vercel que recargar `/admin/suppliers` funciona (`vercel.json` cambió).
- Comprobar que la app instalada (PWA) se actualiza.

## Pendientes

- `leerListaPersistida`, `esOrdenProduccionValida`, `esInsumoValido` y `esFichasValidas` (`storage.ts`) no tienen usos.
- `DownloadExcelButton` se importa en 7 archivos y no se dibuja en ninguno; revisar si falta el botón de Excel.
- Botones escritos a mano que podrían usar `ActionButton` (sección 3.3 del SDD).
- Fase 8, lo que falta: pantalla principal de productos, dashboard, carrito, mis pedidos, recepción de compra, perfiles, login y registro.

## Importaciones circulares

Medidas con `npx madge --circular --extensions ts,tsx --ts-config tsconfig.json src`. Sin `--ts-config`, madge no resuelve `@/` y solo ve 1 ciclo.

Había 42; 15 eran entre un hook de la Fase 8 y su pantalla. Se movió lo compartido a `utils/` de cada módulo y no queda ninguno entre hooks y pantallas.

Después quedaban 5. Al extraer los componentes (ver abajo) desaparecieron los tres de `ProductsScreen`, y quedan 2, anteriores a estas tareas:

1. `shared/services/authService.ts` > `shared/services/api.ts`
2. `supplies/pages/SuppliesScreen.tsx` > `supplies/services/suppliesApi.ts`

Sin formar ciclo, todavía se importa desde pantallas: `useSession` (`claveDoc`, `docValida` de usuarios), `storage.ts` (datos iniciales de roles y productos), `PreparationLine` (`tipoDe` de productos) y cuatro componentes de compras y órdenes de compra (categorías de insumo, de la pantalla de insumos).

## Componentes extraídos de las pantallas

Los componentes que estaban escritos dentro de las pantallas pasaron a `components/` de su módulo, sin cambiar su código. Lo que usaban de la pantalla pasó a `utils/`. Los componentes de `shared` que usaba un solo módulo se movieron a ese módulo.

Quedan nombres repetidos que no se unificaron porque sus props son distintas:

| Componente | Dónde está |
|---|---|
| `ConfirmModal` | `product-categories`, `purchase-orders`, `sales` y `suppliers` (`ConfirmModal.tsx`) |
| `ConfirmDialog` | `supplies`; además existe `shared/components/ConfirmDeleteModal.tsx` |
| `EstadoBadge` | `non-conforming-products` (`StatusBadges.tsx`), `purchases` y `purchase-orders` (`StatusBadge.tsx`) |

También se repiten en varios `utils/` constantes y funciones pequeñas como `SERIF`, `fmtCOP`, `iCls` y `ESTADO_CONFIG`; cada una ya estaba duplicada en su pantalla.
