import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, Pencil, Trash2, X, Check, ChevronLeft, ChevronRight, Plus, Home, Settings, Users, ShoppingBag, Layers, DollarSign, Search } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";

const SERIF = "var(--font-titulo)";

// ── Árbol de módulos / sub-opciones del sistema ──────────────────────
export const MENU_TREE = [
  { modulo: "Dashboard",     subs: ["Dashboard"] },
  { modulo: "Configuración", subs: ["Roles", "Usuarios"] },
  { modulo: "Compras",       subs: ["Insumos", "Proveedores", "Orden de Compra", "Compra"] },
  { modulo: "Producción",    subs: ["Categoría de Producto", "Productos", "Orden de Producción", "Empleados", "Producto No Conforme"] },
  { modulo: "Ventas",        subs: ["Clientes", "Ventas", "Devoluciones"] },
];

// ── Celdas de la grilla de módulos ──────────────────────────────────────
// Replican el orden de las secciones del sidebar del Admin (NAV_SECTIONS en
// App.tsx): Dashboard · Configuración · Usuarios · Compras · Producción ·
// Ventas. "Usuarios" es una celda propia porque en el sidebar lo es, pero NO es
// un módulo nuevo: sigue siendo la sub-opción `Configuración::Usuarios` de
// MENU_TREE, igual que la nombra el `permKey` del sidebar y el guard de ruta.
// Por eso `modulo` + `subs` apuntan a algo que ya existe y ninguna clave de
// permiso cambia: los roles ya guardados en localStorage no pierden acceso.
type Celda = { nombre: string; modulo: string; subs?: string[] };

const CELDAS: Celda[] = [
  { nombre: "Dashboard",     modulo: "Dashboard" },
  { nombre: "Configuración", modulo: "Configuración", subs: ["Roles"] },
  // El sidebar agrupa Usuarios y Empleados bajo una sección "Usuarios", de ahí
  // que compartan celda. Sigue siendo "un módulo simple" en permisos: cada
  // sub-opción ofrece las 4 acciones de accionesDe("Configuración").
  { nombre: "Usuarios",      modulo: "Configuración", subs: ["Usuarios"] },
  { nombre: "Compras",       modulo: "Compras" },
  { nombre: "Producción",    modulo: "Producción" },
  { nombre: "Ventas",        modulo: "Ventas" },
];

// Sub-opciones que gobierna una celda: las declaradas, o todas las del módulo.
// Con MENU_TREE intacto, las 6 celdas cubren las 15 sub-opciones sin dejar
// ninguna huérfana (1+1+2+4+4+3), así que todas siguen siendo asignables.
const subsDeCelda = (c: Celda): string[] =>
  c.subs ?? MENU_TREE.find(m => m.modulo === c.modulo)!.subs;

// Ícono de cada celda, indexado por nombre de celda y NO por módulo: la celda
// "Usuarios" apunta al módulo "Configuración" y debe mostrar las personas, no
// el engranaje. Son los mismos iconos que usa el sidebar. Una celda sin entrada
// aquí se sigue mostrando por su nombre, solo sin icono.
const CELDA_ICONOS: Record<string, typeof Home> = {
  Dashboard:     Home,
  Configuración: Settings,
  Usuarios:      Users,
  Compras:       ShoppingBag,
  Producción:    Layers,
  Ventas:        DollarSign,
};

export const ACCIONES = ["Ver", "Crear", "Editar", "Eliminar"] as const;

// Privilegio aparte de los CRUD: habilita el botón "Descargar Excel" del módulo.
// No es una acción más del CRUD porque no crea ni edita nada, y porque solo se
// ofrece en los sub-módulos de `SUBS_CON_EXCEL` (en el resto no se puede
// descargar nada, así que ofrecerlo sería un privilegio que no hace nada).
export const ACCION_EXCEL = "Descargar Excel" as const;

export type Accion = typeof ACCIONES[number] | typeof ACCION_EXCEL;

// Todas las acciones, para leer de un `AccesosMap` sin usar solo ACCIONES: el
// resumen de permisos debe sacar también el chip de "Descargar Excel".
export const TODAS_ACCIONES: readonly Accion[] = [...ACCIONES, ACCION_EXCEL];

// AccesosMap: "Módulo::SubOpcion" → Accion[]
export type AccesosMap = Record<string, Accion[]>;

export const KEY = (modulo: string, sub: string) => `${modulo}::${sub}`;

// Dashboard es configurable, pero solo admite el permiso de lectura. Inicio
// sigue siendo universal y no depende de esta entrada del editor de roles.
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

export const fullAccesos = (): AccesosMap => {
  const m: AccesosMap = {};
  MENU_TREE.forEach(({ modulo, subs }) =>
    subs.forEach(sub => { m[KEY(modulo, sub)] = [...accionesDeSub(modulo, sub)]; })
  );
  return m;
};

export interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  accesos: AccesosMap;
  activo: boolean;
}

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
    accesos: { [KEY("Ventas","Clientes")]: ["Ver"] },
  },
];

// "Permisos" = sub-módulos con al menos un privilegio asignado.
export const countAccesos = (accesos: AccesosMap) =>
  Object.values(accesos).filter(v => v.length > 0).length;

// "Módulos" = los que tienen al menos un permiso, para el contador
// "N permisos en M módulos" de la vista de detalle.
const countModulosConAcceso = (accesos: AccesosMap) =>
  MENU_TREE.filter(({ modulo, subs }) =>
    subs.some(sub => (accesos[KEY(modulo, sub)] ?? []).length > 0)
  ).length;

// Texto de usuarios asignados, en singular y plural.
const textoUsuariosAsignados = (n: number) =>
  n === 0
    ? "Sin usuarios asignados"
    : `${n} usuario${n === 1 ? "" : "s"} asignado${n === 1 ? "" : "s"}`;

// "15 permisos en 5 módulos".
const textoPermisosModulos = (accesos: AccesosMap) => {
  const permisos = countAccesos(accesos);
  const modulos = countModulosConAcceso(accesos);
  return `${permisos} permiso${permisos === 1 ? "" : "s"} en ${modulos} módulo${modulos === 1 ? "" : "s"}`;
};

export function nextRolId(roles: Rol[]) {
  const nums = roles.map(r => parseInt(r.id.replace("ROL-",""),10)).filter(n => !isNaN(n));
  return `ROL-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3,"0")}`;
}

export const accionColors: Record<Accion, string> = {
  Ver:      "bg-blue-100 text-blue-700 border-blue-200",
  Crear:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  Editar:   "bg-amber-100 text-amber-700 border-amber-200",
  Eliminar: "bg-red-100 text-red-700 border-red-200",
  // Verde del botón "Descargar Excel" (`#2E7D32`), para que el chip del permiso
  // y el botón que habilita se lean como la misma función.
  [ACCION_EXCEL]: "bg-green-100 text-green-800 border-green-200",
};

// Vista de SOLO LECTURA de los permisos de un rol. A diferencia del acordeón
// (`PermissionCategoryAccordion`), que es para editar, esto no tiene nada
// desplegable: todos los módulos, sub-módulos y privilegios se ven de una vez,
// sin un solo clic, y solo se hace scroll en el contenedor que la envuelve.
// Una fila de título por módulo y una fila por sub-módulo; las columnas de
// privilegio quedan alineadas para poder comparar de arriba abajo.
export function PermisosTablaDetalle({ accesos }: { accesos: AccesosMap }) {
  // Solo los módulos con al menos un sub-módulo con privilegios, y dentro de
  // ellos solo los sub-módulos con privilegios: lo demás no se lista.
  const grupos = MENU_TREE
    .map(({ modulo, subs }) => ({
      modulo,
      subs: subs
        .map(sub => ({ sub, perms: accesos[KEY(modulo, sub)] ?? [] }))
        .filter(({ perms }) => perms.length > 0),
    }))
    .filter(({ subs }) => subs.length > 0);

  if (grupos.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Sin accesos configurados</p>;
  }

  return (
    <table className="w-full border-separate border-spacing-0">
      <thead>
        <tr>
          <th className="sticky top-0 z-10 bg-card px-2 py-2 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
            Permiso
          </th>
          {ACCIONES.map(accion => (
            <th key={accion} className="sticky top-0 z-10 bg-card w-20 px-1 py-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
              {accion}
            </th>
          ))}
        </tr>
      </thead>
      {grupos.map(({ modulo, subs }) => (
        <tbody key={modulo}>
          <tr>
            <td colSpan={ACCIONES.length + 1} className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted border-y border-border">
              {modulo}
            </td>
          </tr>
          {subs.map(({ sub, perms }) => (
            <tr key={sub} className="hover:bg-muted/20">
              <td className="px-2 py-2 text-sm font-medium text-foreground">
                <span className="flex flex-wrap items-center gap-1.5">
                  {sub}
                  {/* "Descargar Excel" no es una columna: viaja con el
                      sub-módulo para que el privilegio siga siendo visible. */}
                  {perms.includes(ACCION_EXCEL) && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${accionColors[ACCION_EXCEL]}`}>
                      {ACCION_EXCEL}
                    </span>
                  )}
                </span>
              </td>
              {ACCIONES.map(accion => (
                <td key={accion} className="w-20 px-1 py-2 text-center">
                  {perms.includes(accion) ? (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${accionColors[accion]}`}>{accion}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground/60">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  );
}

export function PermissionCategoryAccordion({ accesos }: { accesos: AccesosMap }) {
  const [expandedModules, setExpandedModules] = useState<string[]>(() =>
    MENU_TREE
      .filter(({ modulo, subs }) => subs.some(sub => (accesos[KEY(modulo, sub)] ?? []).length > 0))
      .map(({ modulo }) => modulo)
  );

  return (
    <>
      {MENU_TREE.map(({ modulo, subs }) => {
        const activeSubs = subs.filter(sub => {
          const k = KEY(modulo, sub);
          return k in accesos && accesos[k].length > 0;
        });
        if (!activeSubs.length) return null;

        const isExpanded = expandedModules.includes(modulo);
        return (
          <div key={modulo}>
            <button
              type="button"
              onClick={() => setExpandedModules(prev => isExpanded
                ? prev.filter(item => item !== modulo)
                : [...prev, modulo]
              )}
              className="w-full flex items-center gap-1.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 cursor-pointer hover:text-foreground transition-colors"
              aria-expanded={isExpanded}
            >
              <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              {modulo}
            </button>
            {isExpanded && (
              <div className="space-y-1">
                {activeSubs.map(sub => {
                  const k = KEY(modulo, sub);
                  const perms = accesos[k] ?? [];
                  return (
                    <div key={sub} className="flex items-center justify-between gap-3 px-3 py-1.5 bg-muted/30 rounded-xl">
                      <span className="text-sm font-medium text-foreground">{sub}</span>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {TODAS_ACCIONES.filter(a => perms.includes(a)).map(a => (
                          <span key={a} className={`text-[10px] font-semibold px-1.5 py-0 rounded-full border ${accionColors[a]}`}>{a}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ── RolModal — árbol izquierdo + CRUD derecho ─────────────────────────
function RolModal({ title, initialNombre, initialDesc, initialActivo, initialAccesos, onClose, onSave, roles, rolId }: {
  title: string;
  initialNombre: string; initialDesc: string; initialActivo: boolean; initialAccesos: AccesosMap;
  onClose: () => void;
  onSave: (nombre: string, desc: string, activo: boolean, accesos: AccesosMap) => void;
  roles: Rol[];
  rolId?: string;
}) {
  const [nombre,     setNombre]     = useState(initialNombre);
  const [desc,       setDesc]       = useState(initialDesc);
  const [activo,     setActivo]     = useState(initialActivo);
  const [accesos,    setAccesos]    = useState<AccesosMap>({ ...initialAccesos });
  const [moduloActivo, setModuloActivo] = useState<string | null>(null);
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [moduloResumen, setModuloResumen] = useState<string | null>(null);
  const [errors,     setErrors]     = useState<{ nombre?: string; modulos?: string }>({});

  const iCls = "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  const isSubOn = (m: string, s: string) => {
    const k = KEY(m, s);
    return k in accesos && accesos[k].length > 0;
  };
  // Un módulo está "completo" cuando cada sub-opción tiene TODAS las acciones
  // que le tocan, y eso depende del sub-módulo: "Descargar Excel" solo existe en
  // los 6 sub-módulos de `SUBS_CON_EXCEL`.
  const isAllMod = (m: string, subs: string[]) =>
    subs.every(s => accionesDeSub(m, s).every(a => (accesos[KEY(m, s)] ?? []).includes(a)));
  const isSomeMod = (m: string, subs: string[]) => subs.some(s => isSubOn(m, s));
  const countAssignedPermissions = (celda: Celda) =>
    subsDeCelda(celda).filter(sub => isSubOn(celda.modulo, sub)).length;

  const toggleAccion = (m: string, s: string, accion: Accion) => {
    const k = KEY(m, s);
    setErrors(p => ({ ...p, modulos: undefined }));
    setAccesos(prev => {
      const cur = prev[k] ?? [];
      return { ...prev, [k]: cur.includes(accion) ? cur.filter(a => a !== accion) : [...cur, accion] };
    });
  };

  const permisoBadge = (m: string, s: string, accion: Accion, compacto = false) => (
    <button
      key={accion}
      type="button"
      onClick={() => toggleAccion(m, s, accion)}
      aria-pressed={(accesos[KEY(m, s)] ?? []).includes(accion)}
      title={`${(accesos[KEY(m, s)] ?? []).includes(accion) ? "Desactivar" : "Activar"} privilegio ${accion}`}
      className={`${compacto ? "text-[10px] px-1.5 py-0" : "text-xs px-2.5 py-1"} inline-flex items-center font-semibold rounded-lg border cursor-pointer transition-all active:scale-95 ${(accesos[KEY(m, s)] ?? []).includes(accion) ? accionColors[accion] : "bg-muted text-muted-foreground border-border hover:border-primary/30"}`}
    >
      {accion}
    </button>
  );

  const toggleCelda = (celda: Celda) => {
    const subs = subsDeCelda(celda);
    const allOn = isAllMod(celda.modulo, subs);
    setAccesos(prev => {
      const next = { ...prev };
      subs.forEach(sub => {
        next[KEY(celda.modulo, sub)] = allOn ? [] : [...accionesDeSub(celda.modulo, sub)];
      });
      return next;
    });
    setErrors(p => ({ ...p, modulos: undefined }));
  };

  const selectedSubs = MENU_TREE.flatMap(({ modulo, subs }) =>
    subs.filter(sub => isSubOn(modulo, sub)).map(sub => ({ modulo, sub }))
  );

  const handleSave = () => {
    const errs: { nombre?: string; modulos?: string } = {};
    if (!nombre.trim()) errs.nombre = "El nombre del rol es obligatorio";
    else if (roles.some(r =>
      r.nombre.trim().toLowerCase() === nombre.trim().toLowerCase() && r.id !== rolId
    )) errs.nombre = "Ya existe un rol con este nombre";
    if (selectedSubs.length === 0) errs.modulos = "Selecciona al menos un módulo o sub-opción";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave(nombre.trim(), desc.trim(), activo, accesos);
  };

  const renderPermissionDetails = (celda: Celda) => {
    const subs = subsDeCelda(celda);
    return (
      <div className="space-y-2">
        {subs.map(sub => {
          const k = KEY(celda.modulo, sub);
          const selAcc = accesos[k] ?? [];
          // Por sub-opción, no por módulo: aquí es donde aparece "Descargar Excel".
          const disponibles = accionesDeSub(celda.modulo, sub);
          const allSel = disponibles.every(a => selAcc.includes(a));
          return (
            <div key={sub} className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border">
                <span className="text-sm font-semibold text-foreground">{sub}</span>
                {disponibles.length > 1 && (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={allSel}
                    onClick={() => setAccesos(prev => ({ ...prev, [k]: allSel ? [] : [...disponibles] }))}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border transition-all cursor-pointer active:scale-95 ${
                      allSel
                        ? "bg-red-100 text-red-700 border-red-200"
                        : "bg-muted text-muted-foreground border-border hover:bg-primary/30"
                    }`}
                  >
                    <Check className={`w-4 h-4 ${allSel ? "" : "opacity-0"}`} />
                    Todos
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap px-3 py-2.5">
                {disponibles.map(accion => {
                  const on = selAcc.includes(accion);
                  return (
                    <button key={accion} type="button" onClick={() => toggleAccion(celda.modulo, sub, accion)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${
                        on ? accionColors[accion] : "bg-muted text-muted-foreground border-border hover:border-primary/30"
                      }`}
                    >
                      {on && <Check className="w-3 h-3" />}{accion}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAssignedSummary = (celda: Celda) => {
    const assignedSubs = subsDeCelda(celda).filter(sub => isSubOn(celda.modulo, sub));
    return (
      <div className="divide-y divide-border px-2">
        {assignedSubs.map(sub => {
          return (
            <div key={sub} className="flex items-center justify-between gap-3 py-2">
              <span className="text-xs font-medium text-foreground">{sub}</span>
              <div className="flex gap-1 flex-wrap justify-end">
                {accionesDeSub(celda.modulo, sub).map(accion => permisoBadge(celda.modulo, sub, accion, true))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAssignedDetails = (celda: Celda) => {
    const assignedSubs = subsDeCelda(celda).filter(sub => isSubOn(celda.modulo, sub));
    return (
      <div className="divide-y divide-border px-2">
        {assignedSubs.map(sub => {
          return (
            <div key={sub} className="py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">{sub}</span>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  {accionesDeSub(celda.modulo, sub).map(accion => permisoBadge(celda.modulo, sub, accion))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
        className="bg-card rounded-2xl w-full max-w-5xl shadow-2xl border border-border flex flex-col"
        style={{ maxHeight: "calc(100vh - 2rem)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
          <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        {/* Two-column body — fills remaining height.
            `min-w-0` en las dos columnas: sin él, el `min-content` de la
            grilla de 3 columnas empujaba a la columna izquierda más allá del
            50% y el desborde partía el modal en dos. */}
        <div
          className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden pb-4"
          style={{ maxHeight: "calc(100vh - 160px)" }}
        >

          {/* ── LEFT 50%: split into top (info) + bottom (modules) ── */}
          <div className="md:w-1/2 min-w-0 flex flex-col divide-y divide-border shrink-0">

            {/* TOP: Información del rol */}
            <div className="px-5 py-3 space-y-2.5 shrink-0">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Información del rol</p>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre *</label>
                <input value={nombre}
                  onChange={e => { setNombre(e.target.value); if (errors.nombre) setErrors(p => ({ ...p, nombre: undefined })); }}
                  placeholder="Ej: Cajero"
                  className={`${iCls} ${errors.nombre ? "!border-red-400 !bg-red-50/30" : ""}`} />
                {errors.nombre && <p className="text-xs text-red-500 mt-1 leading-tight">{errors.nombre}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Descripción</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
                  placeholder="Responsabilidades del rol..." className={iCls + " resize-none"} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                <select value={activo ? "activo" : "inactivo"} onChange={e => setActivo(e.target.value === "activo")}
                  className={iCls + " cursor-pointer"}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            {/* BOTTOM: Grilla de módulos. El scroll vive DENTRO de la grilla;
                `min-h-0` evita que el contenedor flex la recorte (antes usaba
                overflow-hidden y "Ventas" quedaba inalcanzable). `px-5` es el
                mismo padding que los campos de arriba, así la grilla queda
                alineada con el input de Nombre; `min-w-0` y el grid con
                minmax(0, 1fr) evitan que las tarjetas la desborden. */}
            <div className="flex flex-col flex-1 min-h-0 min-w-0 px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 shrink-0">
                Módulos y sub-opciones
                 <span className="ml-2 text-primary font-semibold normal-case">{selectedSubs.length} permisos seleccionados</span>
              </p>
              {errors.modulos && <p className="text-xs text-red-500 mb-2">{errors.modulos}</p>}
              <button
                type="button"
                onClick={() => { setMostrarResumen(true); setModuloResumen(null); setModuloActivo(null); }}
                className={`w-full mb-3 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold cursor-pointer transition-colors ${
                  mostrarResumen
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted text-foreground"
                }`}
              >
                Ver permisos
              </button>
              <div
                className="grid grid-cols-2 md:grid-cols-3"
                style={{ display: "grid", gap: "12px", gridAutoRows: "1fr", boxSizing: "border-box", width: "100%", maxWidth: "100%" }}
              >
                {CELDAS.map(celda => {
                  const modulo = celda.nombre;
                  const Icon = CELDA_ICONOS[modulo];
                  const subs = subsDeCelda(celda);
                  const activo = moduloActivo === modulo;
                  const allOn = isAllMod(celda.modulo, subs);
                  const someOn = isSomeMod(celda.modulo, subs);
                  return (
                    <div
                      key={modulo}
                      role="button"
                      tabIndex={0}
                      onClick={() => { setMostrarResumen(false); setModuloResumen(null); setModuloActivo(modulo); }}
                      onKeyDown={event => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setMostrarResumen(false);
                          setModuloResumen(null);
                          setModuloActivo(modulo);
                        }
                      }}
                      aria-pressed={activo}
                      style={{ boxSizing: "border-box", width: "100%", maxWidth: "100%" }}
                      className={`relative h-full min-w-0 flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                        activo
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:bg-muted hover:border-primary/30"
                      }`}
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-label={`${allOn ? "Quitar" : "Asignar"} todos los permisos de ${modulo}`}
                        aria-checked={allOn}
                        onClick={event => { event.stopPropagation(); toggleCelda(celda); }}
                        style={{ position: "absolute", top: "8px", right: "8px" }}
                        className={`w-3.5 h-3.5 rounded-[5px] border flex items-center justify-center transition-colors ${
                          allOn
                            ? "bg-primary border-primary"
                            : someOn
                              ? "bg-primary/40 border-primary/40"
                              : "border-border bg-background"
                        }`}
                      >
                        {allOn && <Check className="w-2.5 h-2.5 text-white" />}
                        {someOn && !allOn && <span className="w-1.5 h-0.5 rounded-full bg-primary" />}
                      </button>
                      {Icon
                        ? <Icon className={`w-5 h-5 ${activo ? "text-primary" : "text-muted-foreground"}`} />
                        : <span className="w-5 h-5" />}
                      <span className={`text-[11px] font-semibold text-center leading-tight ${activo ? "text-primary" : "text-foreground"}`}>
                        {modulo}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── RIGHT 50%: Permisos CRUD ── */}
          <div className="md:w-1/2 min-w-0 flex flex-col min-h-0 px-5 py-4">
           <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 shrink-0">
             Asignar permisos al rol
           </p>
             {mostrarResumen ? (
               (() => {
                 const asignados = CELDAS.filter(celda =>
                   isSomeMod(celda.modulo, subsDeCelda(celda))
                 );
                 return (
                    <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
                     {asignados.length === 0 ? (
                       <div className="flex flex-col items-center justify-center text-center min-h-40">
                         <p className="text-sm font-semibold text-foreground mb-1">Sin permisos asignados</p>
                         <p className="text-xs text-muted-foreground max-w-52">
                           Selecciona un módulo o un privilegio para comenzar a configurar el rol.
                         </p>
                       </div>
                     ) : (
                       <>
                         <p className="text-xs text-muted-foreground">
                           Resumen de los permisos asignados. Selecciona un módulo para ver todas sus opciones.
                         </p>
                         <div className="space-y-2">
                           {asignados.map(celda => {
                             const abierto = celda.nombre === moduloResumen;
                             return (
                               <div key={celda.nombre} className="border border-border rounded-xl overflow-hidden">
                                 <button
                                   type="button"
                                   onClick={() => setModuloResumen(abierto ? null : celda.nombre)}
                                   className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-muted/40 hover:bg-muted text-left cursor-pointer"
                                 >
                                    <span className="text-sm font-semibold text-foreground">{celda.nombre}</span>
                                    <span className="text-xs font-semibold text-primary">
                                      {countAssignedPermissions(celda)} permisos
                                    </span>
                                  </button>
                                  {abierto ? renderAssignedDetails(celda) : renderAssignedSummary(celda)}
                                </div>
                             );
                           })}
                         </div>
                       </>
                     )}
                   </div>
                 );
               })()
             ) : moduloActivo === null ? (
               <div className="flex flex-col items-center justify-center text-center flex-1">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <span className="text-2xl">🔒</span>
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Ningún módulo abierto</p>
                <p className="text-xs text-muted-foreground max-w-44">
                  Elige un módulo en la grilla para ver sus permisos y configurarlos
                </p>
              </div>
            ) : (
               <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
                 {(() => {
                  // Solo la celda abierta. Antes se iteraba todo MENU_TREE
                  // filtrando por isSubOn, así que un módulo sin permisos no
                  // mostraba nada; ahora se listan TODAS sus sub-opciones para
                  // que sus botones aparezcan sin marcar hasta que se pulse uno.
                  // Se resuelve por celda (no por módulo) para que "Usuarios",
                  // que comparte módulo con Configuración, muestre las suyas.
                  const celda = CELDAS.find(c => c.nombre === moduloActivo);
                   if (!celda) return null;
                   return (
                     <>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {celda.nombre}
                      </p>
                       {renderPermissionDetails(celda)}
                     </>
                   );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-3 border-t border-border shrink-0">
          <button onClick={onClose} className="px-5 py-2 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">Guardar rol</button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────
export function GestionConfigScreen({
  userRole,
  roles,
  setRoles,
  rolUserCounts,
}: {
  userRole: string;
  roles: Rol[];
  setRoles: React.Dispatch<React.SetStateAction<Rol[]>>;
  rolUserCounts: Record<string, number>;
}) {
  const [page,       setPage]      = useState(1);
  const PER_PAGE = 5;
  const [showCreate, setShowCreate]= useState(false);
  const [editItem,   setEditItem]  = useState<Rol | null>(null);
  const [detailItem, setDetailItem]= useState<Rol | null>(null);
  const [deleteId,   setDeleteId]  = useState<string | null>(null);
  const [search,     setSearch]    = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return roles;
    return roles.filter(r =>
      r.nombre.toLowerCase().includes(q) ||
      (r.descripcion ?? "").toLowerCase().includes(q)
    );
  }, [roles, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const handleCreate = (nombre: string, desc: string, activo: boolean, accesos: AccesosMap) => {
    const newRol: Rol = { id: nextRolId(roles), nombre, descripcion: desc, activo, accesos };
    setRoles(p => [...p, newRol]);
    setShowCreate(false);
    toast.success(`Rol ${newRol.id} creado`);
  };

  const saveRol = (id: string | null, nombre: string, desc: string, activo: boolean, accesos: AccesosMap) => {
    if (id) {
      setRoles(p => p.map(r => r.id === id ? { ...r, nombre, descripcion: desc, activo, accesos } : r));
      setEditItem(null);
      toast.success("Rol actualizado");
    }
  };

  const handleDelete = (id: string) => {
    const rol = roles.find(r => r.id === id);
    const asignados = rolUserCounts[id] ?? 0;
    if (id === "ROL-001" || id === "ROL-002" || asignados > 0) {
      toast.error(
        id === "ROL-001" || id === "ROL-002"
          ? "No se puede eliminar un rol base"
          : `No se puede eliminar el rol porque tiene ${asignados} usuario(s) asignado(s)`,
      );
      return;
    }
    setRoles(p => p.filter(r => r.id !== id));
    setDeleteId(null);
    toast.success("Rol eliminado");
  };

  if (userRole !== "Administrador") {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: SERIF }}>Acceso restringido</h2>
        <p className="text-muted-foreground">Solo el Administrador puede acceder a Gestión Configuración.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
           <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Gestión de Roles</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{roles.length} roles registrados</p>
        </div>
         <div className="flex items-center gap-2">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <input
               value={search}
               onChange={e => { setSearch(e.target.value); setPage(1); }}
               placeholder="Buscar por nombre o descripción..."
               className="w-64 pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
             />
           </div>
           <button onClick={() => setShowCreate(true)}
             className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md">
             <Plus className="w-4 h-4" /> Crear Rol
           </button>
         </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>{["ID Rol","Nombre","Descripción","Estado","Acciones"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-14 text-center text-muted-foreground">
                  <p className="text-4xl mb-3">🔐</p><p>No se encontraron roles</p>
                </td></tr>
              ) : paged.map(r => (
                <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3.5 text-sm font-mono font-semibold text-foreground">{r.id}</td>
                  <td className="px-4 py-3.5 text-sm font-medium text-foreground">{r.nombre}</td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground max-w-[160px] truncate">{r.descripcion || "—"}</td>
                  <td className="px-4 py-3.5">
                    <select value={r.activo ? "activo" : "inactivo"}
                      onChange={e => { setRoles(p => p.map(x => x.id === r.id ? { ...x, activo: e.target.value === "activo" } : x)); toast.success("Estado actualizado"); }}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${r.activo ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setDetailItem(r)} title="Ver detalle" className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors cursor-pointer"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => setEditItem(r)} title="Editar" className="p-1.5 rounded-lg hover:bg-amber-50 text-muted-foreground hover:text-amber-600 transition-colors cursor-pointer"><Pencil className="w-4 h-4" /></button>
                       <button onClick={() => handleDelete(r.id)} disabled={r.id === "ROL-001" || r.id === "ROL-002" || (rolUserCounts[r.id] ?? 0) > 0} title={(rolUserCounts[r.id] ?? 0) > 0 ? `No se puede eliminar: ${rolUserCounts[r.id]} usuario(s) asignado(s)` : "Eliminar"} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-center mt-4">
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"><ChevronLeft className="w-4 h-4"/></button>
              {Array.from({length:totalPages},(_,i)=>i+1).map(n=>(
                <button key={n} onClick={()=>setPage(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold cursor-pointer ${n===page?"bg-primary text-white":"hover:bg-muted text-muted-foreground"}`}>{n}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"><ChevronRight className="w-4 h-4"/></button>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <RolModal key="create" title="Crear Rol"
            initialNombre="" initialDesc="" initialActivo={true} initialAccesos={{}}
            roles={roles}
            onClose={() => setShowCreate(false)}
            onSave={handleCreate}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editItem && (
          <RolModal key={editItem.id} title={`Editar Rol — ${editItem.id}`}
            initialNombre={editItem.nombre} initialDesc={editItem.descripcion}
            initialActivo={editItem.activo} initialAccesos={{ ...editItem.accesos }}
            roles={roles} rolId={editItem.id}
            onClose={() => setEditItem(null)}
            onSave={(n,d,a,acc) => saveRol(editItem.id,n,d,a,acc)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
            <motion.div initial={{ scale:.95,opacity:0 }} animate={{ scale:1,opacity:1 }}
              exit={{ scale:.95,opacity:0 }} transition={{ duration:.15 }}
              className="bg-card rounded-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] shadow-2xl border border-border my-4 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Detalle — {detailItem.nombre}</h3>
                <button onClick={() => setDetailItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              {/* Todo el cuerpo (datos + tabla) vive en el área con scroll
                  interno; el pie queda fuera, así "Editar rol" y "Cerrar"
                  siempre se ven aunque la lista sea larga. */}
              <div className="px-5 py-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
                {/* Datos del rol en cuadrícula de 2 columnas: Nombre | Estado /
                    Usuarios asignados | (Descripción ocupa las 2 columnas). */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { l: "Nombre",            v: detailItem.nombre,                     ancho: false },
                    { l: "Estado",            v: detailItem.activo ? "Activo" : "Inactivo", ancho: false },
                    { l: "Usuarios",          v: textoUsuariosAsignados(rolUserCounts[detailItem.id] ?? 0), ancho: false },
                    { l: "Descripción",       v: detailItem.descripcion || "—",            ancho: true },
                  ].map(({ l, v, ancho }) => (
                    <div key={l} className={`flex flex-col gap-0.5 min-w-0 ${ancho ? "col-span-2" : ""}`}>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{l}</span>
                      <span className="text-sm font-semibold text-foreground break-words">{v}</span>
                    </div>
                  ))}
                </div>
                {/* Contador + tabla de permisos. */}
                <div>
                  <div className="flex items-center justify-between gap-3 pb-2 border-b border-border">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Accesos configurados
                    </p>
                    <span className="text-xs text-primary font-semibold">
                      {textoPermisosModulos(detailItem.accesos)}
                    </span>
                  </div>
                  <PermisosTablaDetalle accesos={detailItem.accesos} />
                </div>
              </div>
              <div className="px-5 py-3 border-t border-border flex gap-3 shrink-0">
                <button onClick={() => { setDetailItem(null); setEditItem(detailItem); }}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                  Editar rol
                </button>
                <button onClick={() => setDetailItem(null)}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors">
                  Cerrar
                </button>
              </div>
            </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (() => {
          const count = rolUserCounts[deleteId] ?? 0;
          // Por nombre, nunca por el ID técnico: "eliminar el rol Administrador".
          const nombreRol = roles.find(r => r.id === deleteId)?.nombre ?? "";
          const message = count > 0
            ? `Este rol tiene ${count} usuario${count > 1 ? "s" : ""} asignado${count > 1 ? "s" : ""}. ¿Deseas eliminarlo de todas formas? Los usuarios quedarán SIN ACCESO hasta que les asignes otro rol.`
            : `¿Seguro que deseas eliminar el rol ${nombreRol}? Se eliminan también sus accesos configurados.`;
          return (
            <ConfirmDeleteModal
              title="Eliminar rol"
              message={message}
              onConfirm={() => handleDelete(deleteId)}
              onCancel={() => setDeleteId(null)}
            />
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
