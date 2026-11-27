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
    auth/                #   components, hooks, pages               (login, registro, sesión)
    cart/                #   components, pages, utils               (carrito y pago)
    catalog/             #   components, data, hooks, pages, utils  (menú y detalle de producto)
    customers/           #   hooks, pages, utils
    dashboard/           #   components, pages, utils
    employees/           #   components, hooks, pages, utils
    legal/               #   components, data, pages, types, utils
    non-conforming-products/  # components, hooks, pages, services, utils
    product-categories/  #   components, hooks, pages, services, utils
    production-orders/   #   components, hooks, pages, services, utils
    products/            #   components, hooks, pages, services, utils
    purchase-orders/     #   components, hooks, pages, services, utils
    purchases/           #   components, hooks, pages, services, utils
    returns/             #   hooks, pages, utils
    roles/               #   components, hooks, pages, utils
    sales/               #   components, hooks, pages, services, utils
    suppliers/           #   components, hooks, pages, services, utils
    supplies/            #   components, hooks, pages, services, utils
    users/               #   components, hooks, pages, utils
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

Dentro de cada módulo: `pages/` (pantallas), `components/`, `hooks/`, `services/` (llamadas a la API y lógica de dominio), `utils/` (tipos, constantes y funciones) y `data/`. Cada carpeta existe solo si tiene archivos. Un componente que usa un solo módulo vive en ese módulo, no en `shared/`.

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
