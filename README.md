# S.I.V.PRO

Sistema Integral de Ventas y Producción para **La Sirena Pizza** (Medellín, Colombia). Aplicación web para gestión de pedidos, producción, inventario, compras y clientes, pensada para usuarios con poca experiencia tecnológica.

## Stack

- **React 18** + **TypeScript**
- **Vite 6** (bundler y dev server)
- **Tailwind CSS v4** (vía `@tailwindcss/vite`)
- **shadcn/ui** (primitivas Radix UI) y **Lucide** (iconos)
- **Recharts** (gráficas), **Sonner** (notificaciones), **Motion** (animaciones)

## Requisitos

- Node.js 20.19 o superior
- **npm** (este proyecto usa npm y `package-lock.json`; no usar pnpm/yarn)
- En Windows, abrir la terminal con la letra de unidad en mayúscula (`D:\...`): con `d:\...` falla `npm run build`

## Scripts

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo (Vite)
npm run build      # build de producción en dist/
npm run preview    # previsualizar el build de producción
npm run typecheck  # chequeo de tipos (tsc --noEmit)
node --test tests/*.mjs  # pruebas
```

## Estructura

```
src/
  main.tsx               # entrypoint (createRoot + estilos globales)
  App.tsx                # providers, estado de la app y qué pantalla se pinta
  AppRoutes.tsx          # URL de cada pantalla
  layout/                # estructura común y landing
    components/          #   Header, Content, Footer, Sidebar, AdminTopBar, BottomNav
    hooks/               #   animaciones del landing
    pages/               #   Landing
  features/              # un módulo por dominio de negocio
    auth/                #   login, registro y sesión
    catalog/             #   menú y detalle de producto
    cart/                #   carrito y pago
    customers/           #   clientes y perfil del cliente
    dashboard/  employees/  legal/  non-conforming-products/
    product-categories/  production-orders/  products/
    purchase-orders/  purchases/  returns/  roles/  sales/
    suppliers/  supplies/  users/
  shared/
    components/          # reutilizables
      buttons/           #   botones
      panel/             #   piezas del panel de administración
      ui/                #   shadcn/ui
    contexts/            # AuthContext, CartContext
    hooks/  services/  styles/  utils/
  types/                 # tipos compartidos
  assets/img/            # imágenes
tests/                   # pruebas con node:test
docs/                    # documentación
```

Dentro de cada módulo: `pages/` (pantallas), `components/`, `hooks/` y, solo si hacen falta, `services/` (llamadas a la API y lógica de dominio), `utils/` o `data/`.

## Convenciones

- Carpetas y archivos en inglés. Los nombres de componentes, variables y textos siguen en español (p. ej. `ProductsScreen.tsx` exporta `GestionProductosScreen`).
- Imports con el alias `@/` (apunta a `src/`).
- Botones: usar los de `shared/components/buttons/`.

## Navegación

`App` decide la pantalla y se navega con `navigate("suppliers")`. React Router mantiene la URL sincronizada (`shared/hooks/useRouteSync.ts`). Para agregar una pantalla:

1. Añadir su clave en `shared/utils/screen.ts`.
2. Darle URL en `AppRoutes.tsx` (TypeScript avisa si falta).
3. Pintarla en `App.tsx`; si es del panel, añadirla a `ADMIN_SCREENS` y revisar sus permisos en `shared/utils/navigation.ts`.

En producción, el servidor debe responder `index.html` en cualquier ruta (ver `vercel.json`).
