// Contenido oficial de la página "Licencias y reconocimientos".
// Al cambiar dependencias: actualizar estas tablas y regenerar los avisos con
//   node scripts/legal/generar-avisos.mjs
import type {
  FuenteOficial,
  LicenciaResumen,
  SeccionIndice,
  Servicio,
  TablaDatos,
} from "../types/licencias.types";

export const FECHA_ACTUALIZACION = "25 de noviembre de 2026";
export const FECHA_ACTUALIZACION_ISO = "2026-11-25";
export const URL_AVISOS_TERCEROS = "/legal/THIRD-PARTY-NOTICES.txt";

export const SECCIONES: SeccionIndice[] = [
  { id: "informacion-general", titulo: "1. Información general" },
  { id: "propiedad-intelectual", titulo: "2. Propiedad intelectual" },
  { id: "tecnologias", titulo: "3. Tecnologías y componentes de software" },
  { id: "licencias-terceros", titulo: "4. Licencias de software de terceros" },
  { id: "tipografias-recursos", titulo: "5. Tipografías y recursos visuales" },
  { id: "servicios-externos", titulo: "6. Servicios y plataformas externas" },
  { id: "reconocimientos", titulo: "7. Reconocimientos" },
  { id: "actualizacion", titulo: "8. Consulta y actualización de licencias" },
];

const COLUMNAS_TECNOLOGIA = ["Tecnología", "Versión de referencia", "Licencia"];

export const TABLA_FRONTEND: TablaDatos = {
  titulo: "Tecnologías del frontend",
  columnas: COLUMNAS_TECNOLOGIA,
  filas: [
    ["React", "18.3.1", "MIT"],
    ["React DOM", "18.3.1", "MIT"],
    ["TypeScript", "7.0.2", "Apache 2.0"],
    ["Vite", "6.3.5", "MIT"],
    ["Tailwind CSS", "4.1.12", "MIT"],
    ["Radix UI", "Varias", "MIT"],
    ["shadcn/ui", "Componentes incorporados", "MIT"],
    ["Lucide React", "0.487.0", "ISC"],
    ["Axios", "1.20.0", "MIT"],
    ["Motion", "12.23.24", "MIT"],
    ["Recharts", "2.15.2", "MIT"],
    ["React Hook Form", "7.55.0", "MIT"],
    ["React Day Picker", "8.10.1", "MIT"],
    ["React Resizable Panels", "2.1.7", "MIT"],
    ["Date-fns", "3.6.0", "MIT"],
    ["ExcelJS", "4.4.0", "MIT"],
    ["SheetJS (xlsx)", "0.18.5", "Apache 2.0"],
    ["jsPDF", "4.2.1", "MIT"],
    ["jsPDF AutoTable", "5.0.8", "MIT"],
    ["QRCode", "1.5.4", "MIT"],
    ["Sonner", "2.0.3", "MIT"],
    ["Next Themes", "0.4.6", "MIT"],
    ["Embla Carousel React", "8.6.0", "MIT"],
    ["Input OTP", "1.4.2", "MIT"],
    ["CMDK", "1.1.1", "MIT"],
    ["Class Variance Authority", "0.7.1", "Apache 2.0"],
    ["CLSX", "2.1.1", "MIT"],
    ["Tailwind Merge", "3.2.0", "MIT"],
    ["TW Animate CSS", "1.3.8", "MIT"],
    ["Vaul", "1.1.2", "MIT"],
    ["Vite Plugin PWA", "2.0.0", "MIT"],
  ],
};

export const TABLA_BACKEND: TablaDatos = {
  titulo: "Tecnologías del backend",
  columnas: COLUMNAS_TECNOLOGIA,
  filas: [
    ["Node.js", "18 o superior", "MIT y avisos de terceros"],
    ["Express", "5.3.0", "MIT"],
    ["PostgreSQL", "Por verificar", "PostgreSQL License"],
    ["Node-postgres (pg)", "8.23.1", "MIT"],
    ["JSON Web Token", "9.0.3", "MIT"],
    ["bcryptjs", "3.0.3", "BSD 3-Clause"],
    ["CORS", "2.8.6", "MIT"],
    ["dotenv", "18.0.7", "BSD 2-Clause"],
    ["Multer", "2.4.0", "MIT"],
    ["Nodemailer", "10.1.0", "MIT-0"],
    ["Cloudinary SDK", "2.11.0", "MIT"],
    ["QRCode", "1.5.4", "MIT"],
  ],
};

export const TABLA_HERRAMIENTAS: TablaDatos = {
  titulo: "Herramientas complementarias de desarrollo",
  columnas: ["Herramienta", "Licencia"],
  filas: [
    ["Playwright", "Apache 2.0"],
    ["Sharp", "Apache 2.0"],
    ["libvips", "LGPL 3.0 o posterior"],
    ["npm CLI", "Artistic License 2.0"],
    ["Vite Plugin React", "MIT"],
    ["Tailwind CSS Vite", "MIT"],
    ["Type Definitions (@types)", "MIT, según los paquetes identificados"],
  ],
};

const spdx = (id: string) => `https://spdx.org/licenses/${id}.html`;

export const LICENCIAS: LicenciaResumen[] = [
  { nombre: "MIT", url: spdx("MIT"), resumen: "permite utilizar, modificar y distribuir software conservando los avisos correspondientes." },
  { nombre: "MIT-0", url: spdx("MIT-0"), resumen: "licencia permisiva sin el requisito habitual de atribución de MIT." },
  { nombre: "Apache 2.0", url: spdx("Apache-2.0"), resumen: "permite el uso, modificación y distribución conforme a sus condiciones y avisos legales." },
  { nombre: "ISC", url: spdx("ISC"), resumen: "permite utilizar, modificar y distribuir software conservando sus avisos correspondientes." },
  { nombre: "BSD 2-Clause", url: spdx("BSD-2-Clause"), resumen: "permite reutilizar y distribuir software bajo condiciones de conservación de avisos." },
  { nombre: "BSD 3-Clause", url: spdx("BSD-3-Clause"), resumen: "establece condiciones adicionales relacionadas con el uso de los nombres de sus autores." },
  { nombre: "PostgreSQL License", url: spdx("PostgreSQL"), resumen: "licencia permisiva aplicable al motor de base de datos PostgreSQL." },
  { nombre: "Mozilla Public License 2.0", url: spdx("MPL-2.0"), resumen: "establece obligaciones específicas sobre los archivos cubiertos cuando se distribuyen." },
  { nombre: "GNU Lesser General Public License 3.0", url: spdx("LGPL-3.0-or-later"), resumen: "permite utilizar bibliotecas bajo determinadas condiciones de modificación y distribución." },
  { nombre: "Blue Oak Model License 1.0.0", url: spdx("BlueOak-1.0.0"), resumen: "licencia permisiva con condiciones de conservación de avisos." },
  { nombre: "Creative Commons Attribution 4.0", url: spdx("CC-BY-4.0"), resumen: "permite reutilizar contenido proporcionando la atribución correspondiente." },
  { nombre: "The Unlicense", url: spdx("Unlicense"), resumen: "contempla la dedicación al dominio público y permisos alternativos de uso." },
  { nombre: "Zero-Clause BSD", url: spdx("0BSD"), resumen: "licencia permisiva sin las obligaciones habituales de atribución." },
  { nombre: "Zlib", url: spdx("Zlib"), resumen: "permite el uso y modificación bajo determinadas condiciones de autoría y distribución." },
  { nombre: "Artistic License 2.0", url: spdx("Artistic-2.0"), resumen: "establece condiciones para el uso, modificación y distribución del software." },
  { nombre: "SIL Open Font License 1.1", url: spdx("OFL-1.1"), resumen: "permite utilizar y distribuir tipografías conforme a sus condiciones." },
];

export const FUENTES_OFICIALES: FuenteOficial[] = [
  { nombre: "Montserrat", url: "https://github.com/google/fonts/blob/main/ofl/montserrat/OFL.txt" },
  { nombre: "Poppins", url: "https://github.com/google/fonts/blob/main/ofl/poppins/OFL.txt" },
  { nombre: "Google Fonts", url: "https://fonts.google.com/" },
  { nombre: "Unsplash", url: "https://unsplash.com/license" },
  { nombre: "Lucide", url: "https://lucide.dev/license" },
  { nombre: "shadcn/ui", url: "https://github.com/shadcn-ui/ui/blob/main/LICENSE.md" },
];

export const SERVICIOS: Servicio[] = [
  {
    nombre: "Cloudinary",
    descripcion:
      "Utilizado para el almacenamiento y gestión de imágenes, documentos y archivos relacionados con las operaciones del aplicativo.",
    terminos: "https://cloudinary.com/tou",
  },
  {
    nombre: "Google y Gmail",
    descripcion:
      "Utilizados para la distribución de recursos tipográficos y el envío de comunicaciones electrónicas asociadas a los procesos de autenticación y notificación.",
    terminos: "https://policies.google.com/terms",
  },
];
