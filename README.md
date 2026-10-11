# S.I.V.PRO

Sistema Integral de Ventas y Producción para **La Sirena Pizza** (Medellín, Colombia). Aplicación web para gestión de pedidos, producción, inventario, compras y clientes, pensada para usuarios con poca experiencia tecnológica.

## Stack

- **React 18** + **TypeScript**
- **Vite 6** (bundler y dev server)
- **Tailwind CSS v4** (vía `@tailwindcss/vite`)
- **shadcn/ui** (primitivas Radix UI) y **Lucide** (iconos)
- **Recharts** (gráficas), **Sonner** (notificaciones), **Motion** (animaciones)

## Requisitos

- Node.js 18+
- **npm** (este proyecto usa npm y `package-lock.json`; no usar pnpm/yarn)

## Scripts

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo (Vite)
npm run build      # build de producción en dist/
npm run preview    # previsualizar el build de producción
npm run typecheck  # chequeo de tipos (tsc --noEmit)
```

## Estructura

```
src/
  App.tsx                  # raíz de la app (layout, sidebar, routing por estado)
  main.tsx                 # entrypoint (createRoot + estilos globales)
  features/                # pantallas por dominio de negocio
    dashboard/             #   Dashboard principal
    devoluciones/          #   Módulo de devoluciones
    ...                    #   (compras, ventas, insumos, producción, etc.)
  shared/
    components/            # componentes reutilizables (ui/, propios)
    contexts/              # contextos de React
    hooks/                 # hooks personalizados
    services/              # lógica de servicios
    styles/                # CSS globales (index.css → fonts/tailwind/theme)
    utils/                 # utilidades (screen, catalogo, etc.)
  assets/img/              # imágenes y assets del proyecto
db/                        # migraciones SQL
docs/                      # documentación (brief de diseño)
```

Las pantallas viven en `src/features/<dominio>/pages/` y se montan desde `App.tsx`. Los componentes y helpers compartidos están en `src/shared/`.
