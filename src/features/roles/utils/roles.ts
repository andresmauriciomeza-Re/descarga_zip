import type { RolApi } from "@/shared/services/authService";

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
