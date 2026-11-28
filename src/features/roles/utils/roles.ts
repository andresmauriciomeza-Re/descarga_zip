import type { RolApi } from "@/shared/services/authService";
import { claveGeneroRol } from "@/shared/utils/roleName";

// ── Árbol de módulos / sub-opciones del sistema ──────────────────────
export const MENU_TREE = [
  { modulo: "Dashboard",     subs: ["Dashboard"] },
  { modulo: "Configuración", subs: ["Roles", "Usuarios"] },
  { modulo: "Compras",       subs: ["Insumos", "Proveedores", "Orden de Compra", "Compra"] },
  { modulo: "Producción",    subs: ["Categoría de Producto", "Productos", "Orden de Producción", "Empleados", "Producto No Conforme"] },
  { modulo: "Ventas",        subs: ["Clientes", "Ventas", "Devoluciones"] },
];

export const ACCIONES = ["Ver", "Crear", "Editar", "Eliminar"] as const;

// Privilegio aparte de los CRUD: habilita el botón "Descargar Excel" del módulo.
// No es una acción más del CRUD porque no crea ni edita nada, y porque solo se
// ofrece en los sub-módulos de `SUBS_CON_EXCEL` (en el resto no se puede
// descargar nada, así que ofrecerlo sería un privilegio que no hace nada).
export const ACCION_EXCEL = "Descargar Excel" as const;

export type Accion = typeof ACCIONES[number] | typeof ACCION_EXCEL;

// AccesosMap: "Módulo::SubOpcion" → Accion[]
export type AccesosMap = Record<string, Accion[]>;

export const KEY = (modulo: string, sub: string) => `${modulo}::${sub}`;

export interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  accesos: AccesosMap;
  activo: boolean;
  usuariosAsignados?: number;
}

export const idApiARolUi = (id: string | number) => `ROL-${String(id).padStart(3, "0")}`;

export const adaptarRolApi = (rol: RolApi): Rol => ({
  id: idApiARolUi(rol.id),
  nombre: rol.nombre,
  descripcion: rol.descripcion ?? "",
  activo: rol.activo,
  usuariosAsignados: Number(rol.usuariosAsignados ?? 0),
  accesos: rol.accesos as AccesosMap,
});

export const mensajeError = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

// ── Celdas de la grilla de módulos ──────────────────────────────────────
// Replican el orden de las secciones del sidebar del Admin (NAV_SECTIONS en
// App.tsx): Dashboard · Configuración · Usuarios · Compras · Producción ·
// Ventas. "Dashboard" es un módulo INDEPENDIENTE (primera tarjeta): asignar
// Ventas u otro módulo con todas sus sub-opciones y privilegios NO da acceso
// al Dashboard. Su permiso es solo "Ver" (MODULOS_SOLO_LECTURA) y decide quién
// ve la pantalla "dashboard" (hasDashboardAccess en App.tsx), no el nombre
// del rol. La clave "Dashboard::Dashboard" se migra una sola vez con la
// bandera "sivpro.migracion.dashboardPermiso.v1" y después solo la cambia el
// super admin desde este editor.
// "Usuarios" es una celda propia porque en el sidebar lo es, pero NO es
// un módulo nuevo: sigue siendo la sub-opción `Configuración::Usuarios` de
// MENU_TREE, igual que la nombra el `permKey` del sidebar y el guard de ruta.
// Por eso `modulo` + `subs` apuntan a algo que ya existe y ninguna clave de
// permiso cambia: los roles ya guardados en localStorage no pierden acceso.
export type Celda = { nombre: string; modulo: string; subs?: string[] };

// Sub-opciones que gobierna una celda: las declaradas, o todas las del módulo.
// Con MENU_TREE intacto, las 6 celdas cubren las 15 sub-opciones asignables
// (1+1+1+2+4+5+3, incluyendo "Dashboard"), así que todas siguen siendo
// asignables.
export const subsDeCelda = (c: Celda): string[] =>
  c.subs ?? MENU_TREE.find(m => m.modulo === c.modulo)!.subs;

// Todas las acciones, para leer de un `AccesosMap` sin usar solo ACCIONES: el
// resumen de permisos debe sacar también el chip de "Descargar Excel".
export const TODAS_ACCIONES: readonly Accion[] = [...ACCIONES, ACCION_EXCEL];

// "Dashboard" admite SOLO el permiso "Ver": es un indicador global, no un
// módulo con CRUD. La celda aparece en el editor (independiente de Ventas y
// del resto) y `accionesDe` limita sus acciones a ["Ver"]. Inicio sigue
// siendo universal y no depende de esta entrada del editor de roles.
export const MODULOS_SOLO_LECTURA = ["Dashboard"];

// Sub-módulos cuyo listado se puede descargar a Excel, por `permKey` completo
// ("Módulo::SubOpcion") porque el privilegio se asigna por sub-opción y no por
// módulo. Son los 6 que hoy muestran el botón.
export const SUBS_CON_EXCEL: readonly string[] = [
  KEY("Compras", "Orden de Compra"),
  KEY("Compras", "Compra"),
  KEY("Producción", "Productos"),
  KEY("Producción", "Orden de Producción"),
  KEY("Producción", "Producto No Conforme"),
  KEY("Ventas", "Ventas"),
];

// ¿Este sub-módulo admite "Descargar Excel"?
export const tieneDescargaExcel = (modulo: string, sub: string) =>
  SUBS_CON_EXCEL.includes(KEY(modulo, sub));

// Acciones disponibles para un módulo. Todo lo que asigne permisos debe pasar
// por aquí en lugar de leer ACCIONES directamente.
export const accionesDe = (modulo: string): readonly Accion[] =>
  MODULOS_SOLO_LECTURA.includes(modulo) ? (["Ver"] as const) : ACCIONES;

// Igual que `accionesDe` pero por sub-opción, que es donde se decide si el
// privilegio "Descargar Excel" tiene sentido. Las 4 del CRUD son las mismas en
// todos los sub-módulos de un módulo; el Excel solo se suma en los de
// `SUBS_CON_EXCEL`.
export const accionesDeSub = (modulo: string, sub: string): readonly Accion[] =>
  tieneDescargaExcel(modulo, sub) ? [...accionesDe(modulo), ACCION_EXCEL] : accionesDe(modulo);

export const accionColors: Record<Accion, string> = {
  Ver:      "bg-blue-100 text-blue-700 border-blue-200",
  Crear:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  Editar:   "bg-amber-100 text-amber-700 border-amber-200",
  Eliminar: "bg-red-100 text-red-700 border-red-200",
  // Verde del botón "Descargar Excel" (`#2E7D32`), para que el chip del permiso
  // y el botón que habilita se lean como la misma función.
  [ACCION_EXCEL]: "bg-green-100 text-green-800 border-green-200",
};

// ── Palabras que ve la persona (los valores internos NO cambian) ─────────
// En el AccesosMap y en el backend las acciones siguen siendo "Ver", "Crear",
// "Editar", "Eliminar" y "Descargar Excel". Aquí solo se traducen a lo que se lee.
export const COLUMNAS_MATRIZ: readonly Accion[] = [...ACCIONES, ACCION_EXCEL];

export const ETIQUETA_COLUMNA: Record<Accion, string> = {
  Ver: "Ver",
  Crear: "Agregar",
  Editar: "Cambiar",
  Eliminar: "Borrar",
  [ACCION_EXCEL]: "Descargar Excel",
};

export const VERBO_ACCION: Record<Accion, string> = {
  Ver: "ver",
  Crear: "agregar",
  Editar: "cambiar",
  Eliminar: "borrar",
  [ACCION_EXCEL]: "descargar Excel",
};

// Áreas en el orden en que le sirven a quien configura el cargo.
export const ORDEN_AREAS = ["Ventas", "Producción", "Compras", "Configuración", "Dashboard"];

export const AREAS_MATRIZ = ORDEN_AREAS
  .map(a => MENU_TREE.find(m => m.modulo === a))
  .filter((m): m is (typeof MENU_TREE)[number] => !!m);

/** "A, B y C" */
export const listaY = (xs: string[]) =>
  xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`;

/** "Ver, agregar y cambiar" */
export const frasePermisos = (perms: readonly Accion[]) => {
  const verbos = TODAS_ACCIONES.filter(a => perms.includes(a)).map(a => VERBO_ACCION[a]);
  const f = listaY(verbos);
  return f.charAt(0).toUpperCase() + f.slice(1);
};

export const textoPersonas = (n: number) =>
  n === 0 ? "Nadie lo tiene todavía" : n === 1 ? "1 persona lo tiene" : `${n} personas lo tienen`;

export const fullAccesos = (): AccesosMap => {
  const m: AccesosMap = {};
  MENU_TREE.forEach(({ modulo, subs }) =>
    subs.forEach(sub => { m[KEY(modulo, sub)] = [...accionesDeSub(modulo, sub)]; })
  );
  return m;
};

export const conAcciones = (base: AccesosMap, ks: string[], acts: Accion[]): AccesosMap => {
  const m: AccesosMap = { ...base };
  ks.forEach(k => { m[k] = [...acts]; });
  return m;
};

export const ROLES_CARGO: Rol[] = [
  {
    id: "ROL-004", nombre: "Cajero",
    descripcion: "Atiende el punto de venta y la gestión de clientes.", activo: true,
    accesos: conAcciones({},
      [KEY("Ventas", "Ventas"), KEY("Ventas", "Clientes"), KEY("Ventas", "Devoluciones")],
      [...ACCIONES]),
  },
  {
    id: "ROL-005", nombre: "Mesero",
    descripcion: "Toma pedidos en sala y atiende a los clientes.", activo: true,
    accesos: conAcciones({},
      [KEY("Ventas", "Ventas"), KEY("Ventas", "Clientes")], [...ACCIONES]),
  },
];

// Roles de la semilla anterior que se purgan de datos viejos. Solo se eliminan
// si coinciden nombre Y id: un rol creado por el usuario que haya recibido uno
// de estos ids se conserva intacto.
export const ROLES_SEMILLA_ELIMINADOS: Rol[] = [
  { id: "ROL-006", nombre: "Domiciliario", descripcion: "", activo: true, accesos: {} },
  { id: "ROL-007", nombre: "Cocinero", descripcion: "", activo: true, accesos: {} },
  { id: "ROL-008", nombre: "Auxiliar de cocina", descripcion: "", activo: true, accesos: {} },
  { id: "ROL-009", nombre: "Operador de producción", descripcion: "", activo: true, accesos: {} },
  { id: "ROL-010", nombre: "Auxiliar administrativo", descripcion: "", activo: true, accesos: {} },
];

export const INITIAL_ROLES: Rol[] = [
  {
    id: "ROL-001", nombre: "Administrador", descripcion: "Acceso total al sistema.", activo: true,
    accesos: fullAccesos(),
  },
  {
    id: "ROL-002", nombre: "Cliente", descripcion: "Acceso al portal de pedidos en línea.", activo: true,
    accesos: { [KEY("Ventas","Ventas")]: ["Ver","Crear"] },
  },
  {
    id: "ROL-003", nombre: "Empleado", descripcion: "Acceso operativo al sistema.", activo: true,
    accesos: {},
  },
  ...ROLES_CARGO,
];

// Garantía de semilla sobre datos viejos: fusiona los roles de la semilla que
// falten por NOMBRE. Si el id está ocupado, asigna el siguiente libre.
export const completarRolesSemilla = (existentes: Rol[]): Rol[] => {
  // Purga: solo se borran los que coinciden nombre Y id (ROL-006…ROL-010).
  const eliminadosKeys = new Set(ROLES_SEMILLA_ELIMINADOS.map(r => `${r.id}||${claveGeneroRol(r.nombre)}`));
  const purge = existentes.filter(r => !eliminadosKeys.has(`${r.id}||${claveGeneroRol(r.nombre)}`));
  if (purge.length === 0) return INITIAL_ROLES;
  const salida = [...purge];
  const usados = new Set(existentes.map(r => r.id));
  // La comparación es por clave de género: "Mesero" y "Mesera" son UN rol, así
  // la semilla no agrega un segundo rol por diferencia de género.
  const nombres = new Set(existentes.map(r => claveGeneroRol(r.nombre)));
  for (const semilla of INITIAL_ROLES) {
    const clave = claveGeneroRol(semilla.nombre);
    if (nombres.has(clave)) continue;
    let id = semilla.id;
    if (usados.has(id)) id = nextRolId(salida);
    usados.add(id);
    nombres.add(clave);
    salida.push({ ...semilla, id });
  }
  return salida;
};

export function nextRolId(roles: Rol[]) {
  const nums = roles.map(r => parseInt(r.id.replace("ROL-",""),10)).filter(n => !isNaN(n));
  return `ROL-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3,"0")}`;
}
