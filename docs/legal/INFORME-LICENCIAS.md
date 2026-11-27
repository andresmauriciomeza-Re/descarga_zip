# Informe: página «Licencias y reconocimientos»

Fecha: 25 de noviembre de 2026. Base de trabajo: rama `feature/limpieza-codigo`, en el mismo commit que
`origin/develop` (`1d6ce99`). No se hicieron commits, push ni despliegues.

## 1. Solución implementada

- Enlace `<a href="/licencias">` en el footer de la página principal, en una línea nueva bajo la franja de
  copyright y NIT. El contenido anterior del footer no cambió.
- Página pública `/licencias` con el contenido oficial completo, índice por anclas, tablas por categoría,
  enlaces a fuentes oficiales y a los textos SPDX, y «Consultar avisos legales de terceros».
- Avisos de terceros e inventario generados con un script reproducible.

Añadidos no incluidos en el contenido proporcionado: enlaces «Texto oficial» por licencia y una nota que
advierte que hay paquetes pendientes de verificación.

## 2. Archivos

Creados:

- `src/features/legal/pages/LicensesScreen.tsx`
- `src/features/legal/components/LicenseTable.tsx`, `LicenseIndex.tsx`
- `src/features/legal/data/licenses.ts`, `types/licenses.types.ts`, `navigation.ts`
- `scripts/legal/generar-avisos.mjs` y `scripts/legal/upstream/*.txt`
- `public/legal/THIRD-PARTY-NOTICES.txt`
- `docs/legal/inventario-dependencias.csv` y este informe
- `vercel.json`

Modificados:

- `src/App.tsx`: enlace del footer e integración de la pantalla.
- `src/shared/utils/screen.ts`: pantalla `"licencias"`.
- `vite.config.ts`: `/legal/` excluido del `navigateFallback` de la PWA.

El backend y la base de datos no se modificaron. No se instalaron dependencias. `dist/` (ignorado por git)
quedó regenerado por la compilación.

## 3. Navegación

La aplicación navega con `useState<Screen>`, sin React Router. Se añadió la pantalla `"licencias"` y el hook
`useRutaLicencias`, que sincroniza la URL `/licencias` con el historial (Atrás, Adelante, recarga y acceso
directo). Las demás pantallas siguen sin historial propio.

Ajustes en `App.tsx` para que la página sea realmente pública:

- Al abrir `/licencias` con sesión guardada se muestra la página, no la última pantalla del panel.
- La sesión guardada conserva la pantalla de trabajo anterior.
- Un cierre de sesión forzado (token vencido, inactividad) mientras se está en `/licencias` no expulsa al
  lector de la página. La sesión se cierra igual.

La página usa la barra pública y la barra inferior móvil existentes; no muestra el sidebar administrativo.

## 4. Verificación de licencias

- 780 entradas en el frontend y 137 en el backend (917). Coinciden con la revisión preliminar.
- Las versiones de las tablas coinciden con los `package-lock.json`; las licencias de los paquetes npm
  listados coinciden con sus metadatos.
- Ámbito: 313 entradas de producción en el frontend (incluye transitivas y opcionales) y 137 en el servidor.
  El resto del frontend es de desarrollo.
- En el bundle del navegador hay además código de Workbox, `idb`, Tailwind, Vite y vite-plugin-pwa, aunque
  figuran como dependencias de desarrollo. Sus avisos se incluyen.

| Componente | Resultado |
|---|---|
| Sharp / libvips | Apache 2.0 / LGPL 3.0 o posterior. Solo desarrollo; no se distribuyen. |
| Lightning CSS | MPL 2.0. Solo desarrollo. |
| caniuse-lite | CC BY 4.0. Solo desarrollo. |
| JSZip | MIT **o** GPL 3.0 o posterior. Se reproducen ambos textos; no se eligió por el proyecto. |
| DOMPurify | MPL 2.0 **o** Apache 2.0. Se reproducen ambos textos. |
| Busboy, Streamsearch | MIT confirmado en el archivo `LICENSE` instalado. |
| Nodemailer 10.1.0 | MIT-0 confirmado en su `LICENSE`. |
| Lucide | ISC; el aviso incluye la parte derivada de Feather (MIT, Cole Bemis). |
| @types | Las 24 entradas son MIT. |
| shadcn/ui, Montserrat, Poppins | Textos tomados de los repositorios oficiales (MIT y OFL 1.1). |

## 5. Pendiente de verificar

1. `buffers@0.1.1` (transitiva de ExcelJS): no declara licencia. Es el caso más delicado.
2. `binary` y `chainsaw`: declaran MIT y MIT/X11, sin texto ni aviso de autoría.
3. `victory-vendor`: no trae licencia propia; se copió la del repositorio de origen. Contrastar.
4. Radix UI, Embla, Input OTP, React Resizable Panels, react-remove-scroll-bar y saxes no traen licencia en
   npm: el texto proviene de la rama principal de su repositorio, no de la etiqueta de la versión instalada.
5. Node.js, PostgreSQL y npm CLI: su licencia no se contrastó contra archivos instalados. Falta la versión de
   PostgreSQL.
6. Imágenes: no hay registro de origen ni licencia de `src/assets/img/` ni `public/`. La página afirma que hay
   fotografías de Unsplash; en el código solo se halló una URL de Unsplash (`src/App.tsx`) y no se pudo
   comprobar que las imágenes locales vengan de allí.
7. Imágenes y marcas de terceros (Coca-Cola, Pepsi): sin autorización documentada.
8. Titularidad y licencia propia: el backend declara `ISC` en `package.json` sin archivo `LICENSE`; el
   frontend no tiene licencia (`"private": true`). La declaración `ISC` puede contradecir la sección 2 de la
   página. No se modificó nada.

Para revisar antes de publicar:

- La sección 3 conserva la frase «Las versiones y licencias deberán contrastarse… antes de su publicación».
  Es una nota interna; conviene decidir si se retira.
- El footer existente muestra «NIT: 900.123.456-7», que parece un valor de ejemplo.

## 6. Resultados

| Comprobación | Antes | Después |
|---|---|---|
| `npm run typecheck` | Sin errores | Sin errores |
| `npm run build` | Correcto | Correcto |
| `node --test tests/*.test.mjs` | 25/25 | 25/25 |
| Pruebas de navegador (Playwright, Edge) | — | 46/46 |
| Enlaces externos de la página (24) | — | Todos responden 200 |

Las pruebas de navegador se hicieron sobre `vite preview`, con **la API simulada** (incluida la sesión
autenticada): acceso, footer, hover y foco, contenido, historial, recarga, anchos de 1280, 820, 375 y 320 px,
modo claro y oscuro, avisos, PWA y sin conexión. Los únicos mensajes de consola fueron los provocados por las
propias pruebas (sin conexión y 401 simulado).

Preexistentes: la compilación advierte de fragmentos de más de 500 kB; en producción `/licencias` devolvía 404
(no había reescritura en Vercel).

No se probó: despliegue en Vercel (la regla de `vercel.json` solo se confirma al desplegar), backend real,
Firefox, Safari, dispositivos físicos, lector de pantalla ni la actualización de una PWA ya instalada.

## 7. Criterios de aceptación

| Criterio | Estado |
|---|---|
| Enlace `<a>` en el footer, discreto | Cumple |
| Footer original intacto | Cumple (se añadió una línea) |
| Página independiente y pública | Cumple |
| Contenido completo y por categorías | Cumple |
| Licencias coinciden con las dependencias | Cumple para paquetes npm; ver puntos 5.1–5.5 |
| Avisos legales disponibles | Cumple, con los pendientes identificados en el archivo |
| Responsiva y accesible | Cumple en lo probado; sin lector de pantalla |
| Navegación | Cumple en local; falta confirmar en Vercel |
| Sin errores de compilación ni cambios en backend o base de datos | Cumple |
| Pendientes documentados | Cumple |

## 8. Mantenimiento

Tras cambiar dependencias, ejecutar `npm ci` en ambos repositorios, actualizar
`src/features/legal/data/licenses.ts` y regenerar:

```bash
node scripts/legal/generar-avisos.mjs ../sivpro-backend
```
