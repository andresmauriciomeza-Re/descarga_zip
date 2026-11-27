import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Check, Plus, Lock, Home, Settings, Users, ShoppingBag, Layers, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { validarNombre } from "@/shared/components/FormInputs";
import { claveGeneroRol, formatearNombreRol, formaDobleGenerica, sugerenciaGenerica } from "@/shared/utils/roleName";
import { AvisoBanner } from "@/shared/components/panel/NoticeBanner";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";
import { BuscadorGrande } from "@/shared/components/panel/LargeSearch";
import { CampoFormulario } from "@/shared/components/panel/FormField";
import { DatosDetalle } from "@/shared/components/panel/DetailData";
import { DialogoConfirmacion } from "@/shared/components/panel/ConfirmDialog";
import { EncabezadoPagina } from "@/shared/components/panel/PageHeader";
import { EstadoPill } from "@/shared/components/panel/StatusPill";
import { OpcionesBotones } from "@/shared/components/buttons/OptionButtons";
import { PaginadorGrande } from "@/shared/components/panel/LargePaginator";
import { SeccionFormulario } from "@/shared/components/panel/FormSection";
import { TarjetaFila } from "@/shared/components/panel/RowCard";
import { VacioEstado } from "@/shared/components/panel/EmptyState";
import { cambiarEstadoRol as cambiarEstadoRolApi, crearRol as crearRolApi, editarRol as editarRolApi, eliminarRol as eliminarRolApi, type RolPayloadApi } from "@/shared/services/authService";
import { useRoles } from "@/features/roles/hooks/useRoles";
import { type Rol, MENU_TREE, KEY, adaptarRolApi, mensajeError, type AccesosMap, type Accion, ACCIONES, ACCION_EXCEL } from "@/features/roles/utils/roles";

const SERIF = "var(--font-titulo)";

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
// Con MENU_TREE intacto, las 6 celdas cubren las 15 sub-opciones asignables
// (1+1+1+2+4+5+3, incluyendo "Dashboard"), así que todas siguen siendo
// asignables.
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

export const fullAccesos = (): AccesosMap => {
  const m: AccesosMap = {};
  MENU_TREE.forEach(({ modulo, subs }) =>
    subs.forEach(sub => { m[KEY(modulo, sub)] = [...accionesDeSub(modulo, sub)]; })
  );
  return m;
};

const conAcciones = (base: AccesosMap, ks: string[], acts: Accion[]): AccesosMap => {
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

// "Administrador" y "Cliente" se reconocen SIEMPRE por nombre, nunca por id:
// los ids de roles base solo sirven como ancla de migración, porque el
// administrador puede renombrarlos o restaurar datos de semilla.
// "Empleado" también es base para eliminar/inactivar (pero SÍ se edita).
export const esRolBase = (r?: Rol | null): boolean => {
  const n = (r?.nombre ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return n === "administrador" || n === "cliente" || n === "empleado";
};

// Un rol se puede editar salvo los dos fijos por simplicidad de cuenta:
// "Administrador" y "Cliente". "Empleado" y todo rol extra/creado sí se editan.
export const rolEditable = (r?: Rol | null): boolean => {
  return !esRolBase(r);
};

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

// "15 permisos en 5 módulos". Exportado porque el detalle de usuario rotula cada
// tabla de permisos con el mismo contador que el detalle de rol.
export const textoPermisosModulos = (accesos: AccesosMap) => {
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
    <>
    {/* Menos de 768 px: lista por sub-módulo con sus privilegios (la tabla de 5 columnas no cabe). */}
    <div className="md:hidden space-y-3">
      {grupos.map(({ modulo, subs }) => (
        <div key={modulo}>
          <p className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted rounded-lg">{modulo}</p>
          <div className="divide-y divide-border">
            {subs.map(({ sub, perms }) => (
              <div key={sub} className="px-2 py-2.5">
                <p className="text-sm font-medium text-foreground">{sub}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {ACCIONES.filter(accion => perms.includes(accion)).map(accion => (
                    <span key={accion} className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${accionColors[accion]}`}>{accion}</span>
                  ))}
                  {perms.includes(ACCION_EXCEL) && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${accionColors[ACCION_EXCEL]}`}>{ACCION_EXCEL}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    <table className="w-full border-separate border-spacing-0 max-md:hidden">
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
    </>
  );
}


// ── Palabras que ve la persona (los valores internos NO cambian) ─────────
// En el AccesosMap y en el backend las acciones siguen siendo "Ver", "Crear",
// "Editar", "Eliminar" y "Descargar Excel". Aquí solo se traducen a lo que se lee.
const COLUMNAS_MATRIZ: readonly Accion[] = [...ACCIONES, ACCION_EXCEL];
const ETIQUETA_COLUMNA: Record<Accion, string> = {
  Ver: "Ver",
  Crear: "Agregar",
  Editar: "Cambiar",
  Eliminar: "Borrar",
  [ACCION_EXCEL]: "Descargar Excel",
};
const VERBO_ACCION: Record<Accion, string> = {
  Ver: "ver",
  Crear: "agregar",
  Editar: "cambiar",
  Eliminar: "borrar",
  [ACCION_EXCEL]: "descargar Excel",
};
// Áreas en el orden en que le sirven a quien configura el cargo.
const ORDEN_AREAS = ["Ventas", "Producción", "Compras", "Configuración", "Dashboard"];
const AREAS_MATRIZ = ORDEN_AREAS
  .map(a => MENU_TREE.find(m => m.modulo === a))
  .filter((m): m is (typeof MENU_TREE)[number] => !!m);

/** "A, B y C" */
const listaY = (xs: string[]) =>
  xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`;

/** "Ver, agregar y cambiar" */
const frasePermisos = (perms: readonly Accion[]) => {
  const verbos = TODAS_ACCIONES.filter(a => perms.includes(a)).map(a => VERBO_ACCION[a]);
  const f = listaY(verbos);
  return f.charAt(0).toUpperCase() + f.slice(1);
};

/** Opciones del menú en las que el cargo tiene al menos un permiso. */
const opcionesConAcceso = (accesos: AccesosMap) =>
  MENU_TREE.flatMap(({ modulo, subs }) => subs.filter(sub => (accesos[KEY(modulo, sub)] ?? []).length > 0));

const textoPuedeUsar = (accesos: AccesosMap) => {
  const o = opcionesConAcceso(accesos);
  return o.length === 0 ? "nada todavía" : listaY(o);
};

const textoPersonas = (n: number) =>
  n === 0 ? "Nadie lo tiene todavía" : n === 1 ? "1 persona lo tiene" : `${n} personas lo tienen`;

// ── Formulario crear / cambiar cargo ─────────────────────────────────
function RolModal({ title, initialNombre, initialDesc, initialActivo, initialAccesos, onClose, onSave, roles, rolId, accesosPropios }: {
  title: string;
  initialNombre: string; initialDesc: string; initialActivo: boolean; initialAccesos: AccesosMap;
  onClose: () => void;
  onSave: (nombre: string, desc: string, activo: boolean, accesos: AccesosMap) => void;
  roles: Rol[];
  rolId?: string;
  accesosPropios?: AccesosMap;
}) {
  const [nombre,     setNombre]     = useState(initialNombre);
  const [desc,       setDesc]       = useState(initialDesc);
  const [activo,     setActivo]     = useState(initialActivo);
  const [accesos,    setAccesos]    = useState<AccesosMap>({ ...initialAccesos });
  const [errors,     setErrors]     = useState<{ nombre?: string; modulos?: string }>({});

  // ── P3 — Validación en tiempo real del nombre del rol ──────────────────
  // Se deriva del valor mientras se escribe (no al enviar), igual que en los
  // demás módulos: formato razonable con `validarNombre` (letras y espacios)
  // y duplicado por CLAVE DE GÉNERO contra `roles` (un solo rol agrupa a
  // hombres y mujeres: "Mesero" y "Mesera" son el mismo rol), excluyendo el
  // rol que se está editando (`rolId`). También rechaza formas femeninas
  // (con su sugerencia genérica) y formas dobles ("Mesero o mesera").
  // El campo vacío sin tocar no muestra error: el envío (handleSave) sigue
  // siendo la red de seguridad para ese caso.
  const nombreTrim = nombre.trim();
  const claveNueva = nombreTrim ? claveGeneroRol(nombreTrim) : "";
  const rolExistente = claveNueva
    ? roles.find(r => r.id !== rolId && claveGeneroRol(r.nombre) === claveNueva)
    : undefined;
  const sugerida = nombreTrim ? sugerenciaGenerica(nombreTrim) : null;
  const errFemenina = sugerida
    ? `Usa la forma genérica del cargo: «${sugerida}»`
    : null;
  const doble = nombreTrim ? formaDobleGenerica(nombreTrim) : null;
  const nombreErrorTiempoReal =
    !nombreTrim
      ? undefined
      : validarNombre(nombreTrim)
        ? "Usa solo letras y espacios, sin espacios dobles"
        : rolExistente
          ? `Ya existe el rol «${rolExistente.nombre}». Un solo rol agrupa a hombres y mujeres.`
          : doble
            ? `Un solo nombre agrupa a todos: usa «${doble}»`
            : errFemenina ?? undefined;
  // Lo que se pinta bajo el campo: el error en tiempo real manda; si no hay,
  // el que quedó del último intento de guardar.
  const nombreError = nombreErrorTiempoReal ?? errors.nombre;
  // P3: el botón queda bloqueado mientras el nombre tenga cualquiera de estos
  // errores (formato, duplicado, forma doble o femenina); nunca sin
  // explicación visible.
  const guardarNombreBloqueado = !!nombreErrorTiempoReal || !!errors.modulos;
  /** Reemplaza el texto del campo por su forma genérica (botón "Usar «…»"). */
  const aplicarSugerencia = () => {
    if (!sugerida) return;
    setNombre(sugerida);
    setErrors(p => ({ ...p, nombre: undefined }));
  };

  const isSubOn = (m: string, s: string) => {
    const k = KEY(m, s);
    return k in accesos && accesos[k].length > 0;
  };
  // Un módulo está "completo" cuando cada sub-opción tiene TODAS las acciones
  // que le tocan, y eso depende del sub-módulo: "Descargar Excel" solo existe en
  // los 6 sub-módulos de `SUBS_CON_EXCEL`.
  const isAllMod = (m: string, subs: string[]) =>
    subs.every(s => accionesDeSub(m, s).every(a => (accesos[KEY(m, s)] ?? []).includes(a)));

  // ¿El usuario con sesión tiene este privilegio concreto? Si no, el rol no
  // puede asignárselo (evita que un rol suplente parcial conceda más de lo
  // que su propio usuario tiene). Un Administrador suplente con todos los
  // privilegios sí puede asignar cualquiera.
  const puedeAsignar = (m: string, s: string, accion: Accion) =>
    accesosPropios === undefined || (accesosPropios[KEY(m, s)] ?? []).includes(accion);

  const toggleAccion = (m: string, s: string, accion: Accion) => {
    const k = KEY(m, s);
    setErrors(p => ({ ...p, modulos: undefined }));
    if (!puedeAsignar(m, s, accion)) return;
    setAccesos(prev => {
      const cur = prev[k] ?? [];
      return { ...prev, [k]: cur.includes(accion) ? cur.filter(a => a !== accion) : [...cur, accion] };
    });
  };

  const toggleCelda = (celda: Celda) => {
    const subs = subsDeCelda(celda);
    const allOn = isAllMod(celda.modulo, subs);
    setAccesos(prev => {
      const next = { ...prev };
      subs.forEach(sub => {
        next[KEY(celda.modulo, sub)] = allOn
          ? []
          : accionesDeSub(celda.modulo, sub).filter(a => puedeAsignar(celda.modulo, sub, a));
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
    const aGuardar = nombre.trim();
    if (!aGuardar) errs.nombre = "Escribe el nombre del cargo para poder guardarlo";
    else if (validarNombre(aGuardar)) errs.nombre = "Usa solo letras y espacios, sin espacios dobles";
    else if (rolExistente) errs.nombre = `Ya existe el rol «${rolExistente.nombre}». Un solo rol agrupa a hombres y mujeres.`;
    else if (doble) errs.nombre = `Un solo nombre agrupa a todos: usa «${doble}»`;
    else if (errFemenina) errs.nombre = errFemenina;
    if (selectedSubs.length === 0) errs.modulos = "Marca al menos una casilla para que el cargo pueda hacer algo.";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    // Al crear y al editar el nombre se guarda con forma genérica y
    // normalizado ("repartidor" → "Repartidor", "CAJERO " → "Cajero").
    onSave(formatearNombreRol(aGuardar), desc.trim(), activo, accesos);
  };

  return (
    <Dialog.Root open onOpenChange={abierto => { if (!abierto) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="pn-dialogo-fondo" />
        <Dialog.Content className="pn-modal" aria-describedby={undefined}>
          <div className="pn-modal__cab">
            <Dialog.Title className="pn-modal__titulo">{title}</Dialog.Title>
          </div>

          <div className="pn-cargo-form">
            <div className="pn-cargo-form__izq">
              {/* 1 · Nombre */}
              <SeccionFormulario numero={1} titulo="¿Cómo se llama el cargo?">
                <div className="grid gap-4">
                  <CampoFormulario
                    etiqueta="Nombre del cargo"
                    ayuda="Usa un nombre para todos, por ejemplo Mesero"
                    error={nombreError}
                  >
                    {(p) => (
                      <input
                        {...p}
                        value={nombre}
                        // P3: se limpia el error del envío al escribir; el error en
                        // tiempo real (formato/duplicado/forma femenina o doble) se
                        // deriva arriba y se pinta debajo del campo.
                        onChange={e => { setNombre(e.target.value); if (errors.nombre) setErrors(prev => ({ ...prev, nombre: undefined })); }}
                        placeholder="Ej: Cajero"
                      />
                    )}
                  </CampoFormulario>
                  {sugerida && nombreError === errFemenina && (
                    <div>
                      <BotonAccion variante="normal" onClick={aplicarSugerencia}>Usar «{sugerida}»</BotonAccion>
                    </div>
                  )}
                  <CampoFormulario etiqueta="Descripción" opcional ayuda="Una frase que explique para qué sirve este cargo">
                    {(p) => (
                      <textarea
                        {...p}
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        rows={3}
                        placeholder="Ej: Atiende la caja y cobra los pedidos"
                      />
                    )}
                  </CampoFormulario>
                  <div>
                    <p className="pn-etiqueta">¿El cargo queda encendido?</p>
                    {rolId ? (
                      <p className="pn-campo__ayuda">
                        Este cargo está apagado. Después de cambiarlo, enciéndelo desde la lista de cargos.
                      </p>
                    ) : (
                      <OpcionesBotones
                        etiqueta="Estado del cargo"
                        valor={activo ? "activo" : "inactivo"}
                        onChange={v => setActivo(v === "activo")}
                        opciones={[
                          { valor: "activo", etiqueta: "Encendido" },
                          { valor: "inactivo", etiqueta: "Apagado" },
                        ]}
                      />
                    )}
                  </div>
                </div>
              </SeccionFormulario>

              {/* 2 · Matriz de permisos */}
              <SeccionFormulario
                numero={2}
                titulo="¿Qué puede hacer esta persona?"
                ayuda="Marca una casilla por cada cosa que podrá hacer. Lo que no marques, no podrá hacerlo."
              >
                {errors.modulos && (
                  <p className="pn-campo__error" role="alert" style={{ marginBottom: 12 }}>
                    <span>{errors.modulos}</span>
                  </p>
                )}
                <div className="pn-matriz-caja">
                  <table className="pn-matriz">
                    <thead>
                      <tr>
                        <th scope="col">Opción del menú</th>
                        {COLUMNAS_MATRIZ.map(a => (
                          <th key={a} scope="col">{ETIQUETA_COLUMNA[a]}</th>
                        ))}
                      </tr>
                    </thead>
                    {AREAS_MATRIZ.map(({ modulo, subs }) => {
                      const todo = isAllMod(modulo, subs);
                      return (
                        <tbody key={modulo}>
                          <tr className="pn-matriz__area">
                            <th scope="rowgroup" colSpan={COLUMNAS_MATRIZ.length + 1}>
                              <span>{modulo}</span>
                              <button
                                type="button"
                                className="pn-chip"
                                onClick={() => toggleCelda({ nombre: modulo, modulo })}
                              >
                                {todo ? `Quitar todo de ${modulo}` : `Marcar todo en ${modulo}`}
                              </button>
                            </th>
                          </tr>
                          {subs.map(sub => {
                            const k = KEY(modulo, sub);
                            const marcadas = accesos[k] ?? [];
                            const disponibles = accionesDeSub(modulo, sub);
                            return (
                              <tr key={sub}>
                                <th scope="row">{sub}</th>
                                {COLUMNAS_MATRIZ.map(a => {
                                  if (!disponibles.includes(a)) {
                                    return (
                                      <td key={a} className="pn-matriz__na">
                                        <span aria-hidden="true">—</span>
                                        <span className="sr-only">{`${sub}: ${ETIQUETA_COLUMNA[a]} no aplica`}</span>
                                      </td>
                                    );
                                  }
                                  const permitido = puedeAsignar(modulo, sub, a);
                                  return (
                                    <td key={a}>
                                      <input
                                        type="checkbox"
                                        checked={marcadas.includes(a)}
                                        disabled={!permitido}
                                        onChange={() => toggleAccion(modulo, sub, a)}
                                        aria-label={`${sub}: ${ETIQUETA_COLUMNA[a]}`}
                                        title={permitido ? undefined : "No tienes este permiso para poder darlo"}
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      );
                    })}
                  </table>
                </div>
              </SeccionFormulario>
            </div>

            {/* Resumen + botones (abajo en celular) */}
            <aside className="pn-cargo-form__der">
              <section className="pn-seccion">
                <h2>Así queda el cargo</h2>
                <p className="pn-seccion__ayuda">
                  {nombreTrim ? `El cargo «${nombreTrim}»` : "Este cargo"}{" "}
                  {selectedSubs.length === 0 ? "todavía no puede hacer nada." : "podrá hacer lo siguiente:"}
                </p>
                <div className="pn-resumen">
                  {AREAS_MATRIZ.map(({ modulo, subs }) => (
                    <div key={modulo}>
                      <p className="pn-resumen__area">{modulo}</p>
                      <ul>
                        {subs.map(sub => {
                          const perms = accesos[KEY(modulo, sub)] ?? [];
                          const si = perms.length > 0;
                          return (
                            <li key={sub} className={si ? "pn-resumen__si" : "pn-resumen__no"}>
                              {si
                                ? <Check size={22} aria-hidden="true" style={{ color: "var(--verde)" }} />
                                : <X size={22} aria-hidden="true" style={{ color: "var(--gris-texto)" }} />}
                              <span>
                                <strong>{sub}</strong>
                                {si ? `: ${frasePermisos(perms)}` : ": no"}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="pn-resumen__botones">
                  <BotonAccion
                    variante="principal"
                    onClick={handleSave}
                    disabled={guardarNombreBloqueado}
                    title={guardarNombreBloqueado ? "Corrige lo que está en rojo para guardar" : undefined}
                  >
                    Guardar cargo
                  </BotonAccion>
                  <BotonAccion variante="normal" onClick={onClose}>Cancelar</BotonAccion>
                </div>
              </section>
            </aside>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Ver qué puede hacer un cargo ──────────────────────────────────────
function DetalleCargo({ rol, onClose, onCambiar, onIrAEmpleados, puedeCambiar }: {
  rol: Rol;
  onClose: () => void;
  onCambiar: () => void;
  onIrAEmpleados?: () => void;
  puedeCambiar: boolean;
}) {
  const personas = rol.usuariosAsignados ?? 0;
  return (
    <Dialog.Root open onOpenChange={abierto => { if (!abierto) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="pn-dialogo-fondo" />
        <Dialog.Content className="pn-modal pn-modal--medio" aria-describedby={undefined}>
          <div className="pn-modal__cab">
            <Dialog.Title className="pn-modal__titulo">Cargo: {rol.nombre}</Dialog.Title>
            <EstadoPill tono={rol.activo ? "verde" : "gris"}>{rol.activo ? "Encendido" : "Apagado"}</EstadoPill>
          </div>
          {rol.descripcion && <DatosDetalle datos={[{ etiqueta: "Para qué sirve", valor: rol.descripcion }]} />}

          <div className="pn-cargo-detalle">
            <section className="pn-seccion">
              <h2>Qué puede hacer</h2>
              {AREAS_MATRIZ.map(({ modulo, subs }) => (
                <div key={modulo} style={{ marginTop: 14 }}>
                  <p className="pn-resumen__area">{modulo}</p>
                  <div className="pn-permisos">
                    {subs.map(sub => {
                      const perms = rol.accesos[KEY(modulo, sub)] ?? [];
                      const n = perms.length;
                      return (
                        <div key={sub} className={`pn-permisos__fila${n === 0 ? " pn-permisos__fila--no" : ""}`}>
                          <strong>{sub}</strong>
                          <span>{n === 0 ? "No puede hacer nada aquí" : frasePermisos(perms)}</span>
                          <EstadoPill tono={n === 0 ? "gris" : "verde"}>
                            {n === 0 ? "No" : `${n} ${n === 1 ? "acción" : "acciones"}`}
                          </EstadoPill>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>

            <aside className="pn-seccion" style={{ alignSelf: "start" }}>
              <h2>Quiénes lo tienen</h2>
              <p className="pn-seccion__ayuda">{textoPersonas(personas)}</p>
              {onIrAEmpleados && (
                <BotonAccion variante="normal" onClick={() => { onClose(); onIrAEmpleados(); }}>
                  Ir a Empleados
                </BotonAccion>
              )}
            </aside>
          </div>

          <div className="pn-dialogo__botones" style={{ marginTop: 18 }}>
            {puedeCambiar && !rol.activo && (
              <BotonAccion variante="principal" onClick={onCambiar}>Cambiar permisos</BotonAccion>
            )}
            <BotonAccion variante="oscuro" onClick={onClose}>Cerrar</BotonAccion>
          </div>
          {puedeCambiar && rol.activo && (
            <p className="pn-campo__ayuda" style={{ marginTop: 10 }}>
              Para cambiar lo que puede hacer, primero apágalo desde la lista de cargos.
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const idRolUiAApi = (id: string) => {
  const numero = Number(id.replace(/^ROL-/, ""));
  if (!Number.isSafeInteger(numero) || numero <= 0) throw new Error("El identificador del rol no es válido.");
  return String(numero);
};

const payloadRolApi = (nombre: string, descripcion: string, activo: boolean, accesos: AccesosMap): RolPayloadApi => ({
  nombre,
  descripcion,
  activo,
  accesos,
});

// ── Pantalla principal ────────────────────────────────────────────────
export function GestionConfigScreen({
  canVer = true,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  accesosPropios,
  loggedInRolId,
  onIrAEmpleados,
}: {
  canVer?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  accesosPropios?: AccesosMap;
  loggedInRolId?: string | null;
  /** Lleva a la pantalla de Empleados (botón «Ir a Empleados»). */
  onIrAEmpleados?: () => void;
}) {
  const { roles, setRoles, cargando, errorCarga, page, setPage, PER_PAGE, search, setSearch, cargarRoles, filtered, paged } = useRoles(canVer);
  const [showCreate, setShowCreate]= useState(false);
  const [editItem,   setEditItem]  = useState<Rol | null>(null);
  const [detailItem, setDetailItem]= useState<Rol | null>(null);
  const [deleteId,   setDeleteId]  = useState<string | null>(null);
  const [desactivarId, setDesactivarId] = useState<string | null>(null);
  const [estadoEnCurso, setEstadoEnCurso] = useState<string | null>(null);





  const handleCreate = async (nombre: string, desc: string, activo: boolean, accesos: AccesosMap) => {
    try {
      const creado = await crearRolApi(payloadRolApi(nombre, desc, activo, accesos));
      const rol = adaptarRolApi(creado);
      setRoles(p => [...p, rol]);
      setShowCreate(false);
      toast.success(`Rol ${rol.id} creado correctamente`);
    } catch (error) {
      toast.error(mensajeError(error, "No se pudo crear el rol."));
    }
  };

  const saveRol = async (id: string | null, nombre: string, desc: string, activo: boolean, accesos: AccesosMap) => {
    if (!id) return;
    const rol = roles.find(x => x.id === id);
    if (!rol) return;
    if (esRolBase(rol)) {
      toast.error("Este rol base no se puede editar");
      return;
    }
    if (rol.activo) {
      toast.error("Desactiva el rol antes de editarlo");
      return;
    }
    if (activo) {
      toast.error("Guarda el rol inactivo y actívalo después desde su estado.");
      return;
    }
    try {
      const actualizado = await editarRolApi(idRolUiAApi(id), payloadRolApi(nombre, desc, false, accesos));
      const nuevo = adaptarRolApi(actualizado);
      setRoles(p => p.map(x => x.id === id ? nuevo : x));
      setEditItem(null);
      toast.success("Rol actualizado correctamente");
    } catch (error) {
      toast.error(mensajeError(error, "No se pudo editar el rol."));
    }
  };

  const aplicarEstado = async (rol: Rol, activo: boolean, confirmado = false) => {
    if (esRolBase(rol) && !activo) {
      toast.error("No se puede desactivar un rol base.");
      return false;
    }
    if (rol.id === loggedInRolId) {
      toast.error("No puedes modificar tu propio rol.");
      return false;
    }
    if (rol.activo && !activo && (rol.usuariosAsignados ?? 0) > 0 && !confirmado) {
      setDesactivarId(rol.id);
      return false;
    }
    setEstadoEnCurso(rol.id);
    try {
      const actualizado = await cambiarEstadoRolApi(idRolUiAApi(rol.id), activo);
      const nuevo = adaptarRolApi(actualizado);
      setRoles(p => p.map(x => x.id === rol.id ? nuevo : x));
      setDesactivarId(null);
      toast.success(`Rol ${activo ? "activado" : "desactivado"} correctamente`);
      return true;
    } catch (error) {
      toast.error(mensajeError(error, "No se pudo cambiar el estado del rol."));
      return false;
    } finally {
      setEstadoEnCurso(null);
    }
  };

  const confirmarDesactivacion = async () => {
    const rol = roles.find(r => r.id === desactivarId);
    if (rol) await aplicarEstado(rol, false, true);
  };

  const handleDelete = async (id: string) => {
    const rol = roles.find(r => r.id === id);
    const asignados = rol?.usuariosAsignados ?? 0;
    if (esRolBase(rol) || asignados > 0) {
      toast.error(esRolBase(rol)
        ? "No se puede eliminar un rol base."
        : `No se puede eliminar el rol porque tiene ${asignados} usuario(s) asignado(s).`);
      return;
    }
    try {
      const respuesta = await eliminarRolApi(idRolUiAApi(id));
      setRoles(p => p.filter(r => r.id !== id));
      setDeleteId(null);
      toast.success(respuesta.mensaje);
    } catch (error) {
      toast.error(mensajeError(error, "No se pudo eliminar el rol."));
    }
  };

  const tarjetaCargo = (r: Rol) => {
    const fijo = esRolBase(r);
    const propio = r.id === loggedInRolId;
    const ocupado = estadoEnCurso === r.id;
    const personas = r.usuariosAsignados ?? 0;
    return (
      <TarjetaFila
        key={r.id}
        nombre={<span style={{ fontSize: 24 }}>{r.nombre}</span>}
        detalle={
          <>
            Puede usar: {textoPuedeUsar(r.accesos)}
            {propio && <><br />Es tu propio cargo: no puedes apagarlo ni borrarlo.</>}
          </>
        }
        datos={[{ etiqueta: "Personas con este cargo", valor: personas === 0 ? "Nadie" : String(personas) }]}
        estado={
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            <EstadoPill tono={r.activo ? "verde" : "gris"}>{r.activo ? "Encendido" : "Apagado"}</EstadoPill>
            {fijo && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 17, fontWeight: 600, color: "var(--gris-texto)" }}>
                <Lock size={20} aria-hidden="true" /> Fijo
              </span>
            )}
          </div>
        }
        acciones={
          fijo ? (
            <BotonAccion variante="normal" onClick={() => setDetailItem(r)}>Ver qué puede hacer</BotonAccion>
          ) : r.activo ? (
            <>
              {canEdit && (
                <BotonAccion
                  variante="principal"
                  disabled={propio || ocupado}
                  onClick={() => setDesactivarId(r.id)}
                >
                  Apagar para cambiarlo
                </BotonAccion>
              )}
              <BotonAccion variante="normal" onClick={() => setDetailItem(r)}>Ver qué puede hacer</BotonAccion>
            </>
          ) : (
            <>
              {canEdit && (
                <BotonAccion variante="principal" onClick={() => setEditItem(r)}>Cambiar permisos</BotonAccion>
              )}
              {canEdit && (
                <BotonAccion variante="bien" disabled={propio || ocupado} onClick={() => void aplicarEstado(r, true)}>
                  Encender
                </BotonAccion>
              )}
              <BotonAccion variante="normal" onClick={() => setDetailItem(r)}>Ver qué puede hacer</BotonAccion>
              {canDelete && (
                <BotonAccion variante="peligro" disabled={propio} onClick={() => setDeleteId(r.id)}>
                  Borrar cargo
                </BotonAccion>
              )}
            </>
          )
        }
      />
    );
  };

  if (!canVer) {
    return (
      <div className="pn-contenido">
        <VacioEstado icono={Lock} titulo="No tienes permiso para ver los cargos">
          Pide acceso a la persona que administra el sistema.
        </VacioEstado>
      </div>
    );
  }

  const cargosSistema = paged.filter(esRolBase);
  const cargosPizzeria = paged.filter(r => !esRolBase(r));
  const rolApagar = roles.find(r => r.id === desactivarId) ?? null;
  const rolBorrar = roles.find(r => r.id === deleteId) ?? null;
  const personasApagar = rolApagar?.usuariosAsignados ?? 0;
  const personasBorrar = rolBorrar?.usuariosAsignados ?? 0;

  return (
    <div className="pn-contenido">
      <EncabezadoPagina
        titulo="Roles"
        descripcion="Cada cargo dice qué partes del sistema puede usar una persona"
        acciones={canCreate && (
          <BotonAccion variante="principal" icono={Plus} onClick={() => setShowCreate(true)}>
            Crear un cargo nuevo
          </BotonAccion>
        )}
      />

      <BuscadorGrande
        etiqueta="Buscar un cargo"
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
        placeholder="Escribe el nombre del cargo"
      />

      <div style={{ marginTop: 24 }}>
        {cargando ? (
          <p role="status" className="pn-nota">Cargando los cargos…</p>
        ) : errorCarga ? (
          <AvisoBanner
            titulo="No pudimos cargar los cargos"
            boton={<BotonAccion onClick={() => void cargarRoles()}>Intentar de nuevo</BotonAccion>}
          >
            {errorCarga}
          </AvisoBanner>
        ) : paged.length === 0 ? (
          <VacioEstado icono={Lock} titulo={search.trim() ? "No encontramos ningún cargo con ese nombre" : "Todavía no hay cargos"}>
            {search.trim() ? "Revisa cómo lo escribiste o prueba con otra palabra." : "Crea el primero con el botón «Crear un cargo nuevo»."}
          </VacioEstado>
        ) : (
          <>
            {cargosSistema.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <h2 className="pn-h2">Cargos del sistema</h2>
                <p className="pn-seccion__ayuda" style={{ margin: "4px 0 14px" }}>Vienen con el sistema y no se pueden cambiar.</p>
                <div className="pn-lista">{cargosSistema.map(tarjetaCargo)}</div>
              </section>
            )}
            {cargosPizzeria.length > 0 && (
              <section>
                <h2 className="pn-h2">Cargos de la pizzería</h2>
                <p className="pn-seccion__ayuda" style={{ margin: "4px 0 14px" }}>Los que tú creaste. Para cambiarlos, primero apágalos.</p>
                <div className="pn-lista">{cargosPizzeria.map(tarjetaCargo)}</div>
              </section>
            )}
            <PaginadorGrande pagina={page} total={filtered.length} porPagina={PER_PAGE} onCambiar={setPage} />
            <p className="pn-nota">
              Un cargo que tiene personas asignadas no se puede borrar. Primero cámbiales el cargo en Empleados.
            </p>
          </>
        )}
      </div>

      {showCreate && (
        <RolModal key="create" title="Crear un cargo nuevo"
          initialNombre="" initialDesc="" initialActivo={true} initialAccesos={{}}
          roles={roles}
          accesosPropios={accesosPropios}
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}

      {editItem && (
        <RolModal key={editItem.id} title={`Cambiar permisos del cargo ${editItem.nombre}`}
          initialNombre={editItem.nombre} initialDesc={editItem.descripcion}
          initialActivo={editItem.activo} initialAccesos={{ ...editItem.accesos }}
          roles={roles} rolId={editItem.id} accesosPropios={accesosPropios}
          onClose={() => setEditItem(null)}
          onSave={(n,d,a,acc) => saveRol(editItem.id,n,d,a,acc)}
        />
      )}

      {detailItem && (
        <DetalleCargo
          rol={detailItem}
          puedeCambiar={canEdit && rolEditable(detailItem)}
          onClose={() => setDetailItem(null)}
          onCambiar={() => { setEditItem(detailItem); setDetailItem(null); }}
          onIrAEmpleados={onIrAEmpleados}
        />
      )}

      {/* Apagar un cargo */}
      <DialogoConfirmacion
        abierto={!!rolApagar}
        onCambiarAbierto={abierto => { if (!abierto) setDesactivarId(null); }}
        titulo={`¿Apagar el cargo ${rolApagar?.nombre ?? ""}?`}
        queVaAPasar={[
          personasApagar > 0
            ? `${personasApagar === 1 ? "La persona que lo tiene no podrá" : `Las ${personasApagar} personas que lo tienen no podrán`} usar ${textoPuedeUsar(rolApagar?.accesos ?? {})} mientras esté apagado`
            : "Nadie lo tiene ahora, así que a nadie le cambia nada",
          "Mientras esté apagado podrás cambiar sus permisos",
          "Cuando termines, lo enciendes y todo vuelve a funcionar",
        ]}
        textoAccion="Sí, apagar el cargo"
        onConfirmar={() => void confirmarDesactivacion()}
      />

      {/* Borrar un cargo: sin personas se confirma; con personas se explica por qué no */}
      {rolBorrar && personasBorrar > 0 ? (
        <DialogoConfirmacion
          variante="bloqueo"
          abierto
          onCambiarAbierto={abierto => { if (!abierto) setDeleteId(null); }}
          titulo={`No se puede borrar el cargo ${rolBorrar.nombre}`}
          porQueNo={[
            personasBorrar === 1 ? "Hay 1 persona con este cargo" : `Hay ${personasBorrar} personas con este cargo`,
            "Primero cámbiales el cargo en Empleados y después podrás borrarlo",
          ]}
          textoAlternativa={onIrAEmpleados ? "Ir a Empleados" : undefined}
          onAlternativa={onIrAEmpleados}
        />
      ) : (
        <DialogoConfirmacion
          abierto={!!rolBorrar}
          onCambiarAbierto={abierto => { if (!abierto) setDeleteId(null); }}
          titulo={`¿Borrar el cargo ${rolBorrar?.nombre ?? ""}?`}
          queVaAPasar={[
            "Se borra para siempre",
            "También se borran los permisos que tenía configurados",
            "Nadie tiene este cargo, así que a ninguna persona le cambia nada",
          ]}
          textoAccion="Sí, borrar el cargo"
          onConfirmar={() => { if (rolBorrar) void handleDelete(rolBorrar.id); }}
        />
      )}
    </div>
  );
}
