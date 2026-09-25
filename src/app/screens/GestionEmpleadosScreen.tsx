import { useState, useMemo, useRef, useLayoutEffect, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Eye, Pencil, ChevronLeft, ChevronRight, Briefcase, X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { EstadoSwitch } from "../components/EstadoSwitch";
import { type Rol } from "./GestionConfigScreen";
import { type Usuario, DOC_TIPOS, fmtDoc } from "./GestionUsuariosScreen";
import { type Cliente } from "./GestionClientesScreen";

const SERIF = "'DM Serif Display', serif";
const MONO  = "'JetBrains Mono', monospace";

const AVATAR_COLORS = [
  "bg-red-500","bg-blue-500","bg-emerald-500",
  "bg-purple-500","bg-amber-500","bg-pink-500","bg-indigo-500","bg-teal-500",
];

// Una contratación del empleado. `Empleado.cargo/rolId/fechaInicio/fechaFinal`
// guarda SOLO la contratación vigente (lo que ve la tabla); aquí va el
// historial completo, para no perder los cambios de cargo ni los reingresos.
export interface Contratacion {
  id: string;           // "EMP-001-C01", "EMP-001-C02" (C## con 2 dígitos)
  cargo: string;
  rolId: string;
  fechaInicio: string;  // YYYY-MM-DD
  fechaFinal: string;   // "" si la contratación sigue vigente
}

export interface Empleado {
  id: string;              // EMP-00X
  nombre: string;
  iniciales: string;
  avatarColor: string;
  correo: string;
  telefono: string;
  tipoDocumento: string;
  numeroDocumento: string;
  contrasena: string;
  rolId: string;           // Tb_Empleado.Id_rol (FK)
  activo: boolean;         // Tb_Empleado.Estado
  cargo: string;           // Contratacion_empleado.Cargo (contratación vigente)
  fechaInicio: string;     // Contratacion_empleado.Fecha_inicio (vigente)
  fechaFinal: string;      // Contratacion_empleado.Fecha_final ("" si sigue activo)
  contrataciones: Contratacion[]; // historial, de la más antigua a la más reciente
}

// Semilla cruda: los empleados sin historial. `INITIAL_EMPLEADOS` le deriva una
// única contratación inicial a partir de sus propios campos, para que el dato no
// quede escrito dos veces y ambas copias no puedan desincronizarse.
const EMPLEADOS_SEMILLA: Omit<Empleado, "contrataciones">[] = [
  { id:"EMP-001", nombre:"Gloria Inés Vargas",  iniciales:"GV", avatarColor:"bg-red-500",     correo:"gloria@lasirena.com",          telefono:"604 321 0001", tipoDocumento:"CC", numeroDocumento:"12345678", contrasena:"123456", rolId:"ROL-001", activo:true,  cargo:"Administración",        fechaInicio:"2024-01-15", fechaFinal:"" },
  { id:"EMP-002", nombre:"Sebastián Gómez",     iniciales:"SG", avatarColor:"bg-blue-500",    correo:"sebastian.gomez@lasirena.com", telefono:"310 456 7890", tipoDocumento:"CC", numeroDocumento:"87654321", contrasena:"123456", rolId:"ROL-003", activo:true,  cargo:"Cocinero",             fechaInicio:"2024-02-01", fechaFinal:"" },
  { id:"EMP-003", nombre:"María González",      iniciales:"MG", avatarColor:"bg-emerald-500", correo:"maria.gonzalez@gmail.com",     telefono:"315 123 4567", tipoDocumento:"CC", numeroDocumento:"11223344", contrasena:"123456", rolId:"ROL-003", activo:true,  cargo:"Cajero",               fechaInicio:"2024-02-10", fechaFinal:"" },
  { id:"EMP-004", nombre:"Carlos Martínez",     iniciales:"CM", avatarColor:"bg-amber-500",   correo:"carlos.m@hotmail.com",         telefono:"320 987 6543", tipoDocumento:"CC", numeroDocumento:"22334455", contrasena:"123456", rolId:"ROL-003", activo:true,  cargo:"Domiciliario",         fechaInicio:"2024-03-05", fechaFinal:"" },
  { id:"EMP-005", nombre:"Ana Rodríguez",       iniciales:"AR", avatarColor:"bg-purple-500",  correo:"ana.rodriguez@outlook.com",    telefono:"318 765 4321", tipoDocumento:"CC", numeroDocumento:"33445566", contrasena:"123456", rolId:"ROL-003", activo:true,  cargo:"Mesera",               fechaInicio:"2024-03-12", fechaFinal:"" },
  { id:"EMP-006", nombre:"Jorge Vargas",        iniciales:"JV", avatarColor:"bg-pink-500",    correo:"jorge.vargas@gmail.com",       telefono:"301 234 5678", tipoDocumento:"CE", numeroDocumento:"44556677", contrasena:"123456", rolId:"ROL-003", activo:false, cargo:"Operador de producción", fechaInicio:"2024-01-20", fechaFinal:"2025-06-30" },
  { id:"EMP-007", nombre:"Patricia Soto",       iniciales:"PS", avatarColor:"bg-teal-500",    correo:"patricia.soto@yahoo.com",      telefono:"305 678 9012", tipoDocumento:"CC", numeroDocumento:"55667788", contrasena:"123456", rolId:"ROL-003", activo:true,  cargo:"Cajero",               fechaInicio:"2024-04-01", fechaFinal:"" },
  { id:"EMP-008", nombre:"Luis Herrera",        iniciales:"LH", avatarColor:"bg-indigo-500",  correo:"lherrera@gmail.com",           telefono:"312 345 6789", tipoDocumento:"CC", numeroDocumento:"66778899", contrasena:"123456", rolId:"ROL-003", activo:true,  cargo:"Cocinero",             fechaInicio:"2024-04-18", fechaFinal:"" },
  { id:"EMP-009", nombre:"Sandra Ríos",         iniciales:"SR", avatarColor:"bg-blue-500",    correo:"sandrios@gmail.com",           telefono:"316 890 1234", tipoDocumento:"CC", numeroDocumento:"77889900", contrasena:"123456", rolId:"ROL-003", activo:false, cargo:"Auxiliar de cocina",    fechaInicio:"2024-02-25", fechaFinal:"2025-03-15" },
  { id:"EMP-010", nombre:"Andrés Castillo",     iniciales:"AC", avatarColor:"bg-emerald-500", correo:"andres.castillo@gmail.com",    telefono:"314 567 8901", tipoDocumento:"TI", numeroDocumento:"10111213", contrasena:"123456", rolId:"ROL-003", activo:true,  cargo:"Domiciliario",         fechaInicio:"2024-05-02", fechaFinal:"" },
];

// Cada empleado de la semilla arranca con una contratación inicial (C01) que es
// una proyección de sus propios campos de contrato, no una copia escrita a mano.
export const INITIAL_EMPLEADOS: Empleado[] = EMPLEADOS_SEMILLA.map(e => ({
  ...e,
  contrataciones: [{
    id: `${e.id}-C01`,
    cargo: e.cargo,
    rolId: e.rolId,
    fechaInicio: e.fechaInicio,
    fechaFinal: e.fechaFinal,
  }],
}));

// Siguiente id de contratación para un empleado. Se apoya en el sufijo numérico
// en vez de en `length` para no repetir un id si alguna vez se editara o quitara
// una contratación del historial. El cero a la izquierda mantiene el orden
// lexicético correcto (C02 < C10).
export const nuevoContratacionId = (empleadoId: string, existentes: Contratacion[]) => {
  const max = existentes.reduce((m, c) => {
    const n = parseInt(c.id.split("-C")[1] ?? "", 10) || 0;
    return Math.max(m, n);
  }, 0);
  return `${empleadoId}-C${String(max + 1).padStart(2, "0")}`;
};

// De la más reciente a la más antigua. Primero por fecha de inicio y, si empatan
// (dos contrataciones el mismo día), por id, que ya refleja el orden en que se
// fueron registrando.
export const ordenarContrataciones = (cs: Contratacion[]): Contratacion[] =>
  [...cs].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio) || b.id.localeCompare(a.id));

export function GestionEmpleadosScreen({
  roles,
  usuarios,
  empleados,
  setEmpleados,
  setUsuarios,
  clientes,
}: {
  roles: Rol[];
  usuarios: Usuario[];
  empleados: Empleado[];
  setEmpleados: React.Dispatch<React.SetStateAction<Empleado[]>>;
  setUsuarios: React.Dispatch<React.SetStateAction<Usuario[]>>;
  clientes: Cliente[];
}) {
  const [search,      setSearch]    = useState("");
  const [filterEstado,setFiltro]    = useState("todos");
  const [editErrors,  setEditErrors] = useState<Record<string, string>>({});
  const [sortBy,      setSortBy]    = useState("nombre");
  const [page,        setPage]      = useState(1);
  const [detailItem,  setDetailItem] = useState<Empleado | null>(null);
  const [editItem,    setEditItem]  = useState<Empleado | null>(null);
  const [editPrevCorreo, setEditPrevCorreo] = useState<string | null>(null);
  const [showCreate,  setShowCreate] = useState(false);

  // Modal "Nueva contratación": registra una entrada más en el historial del
  // empleado elegido y, con esos mismos datos, actualiza su contratación vigente.
  const [showContrat,       setShowContrat]      = useState(false);
  const [ctrEmpleadoId,     setCtrEmpleadoId]    = useState("");
  const [ctrActivo,         setCtrActivo]        = useState(true);
  const [ctrRolId,          setCtrRolId]         = useState<string>(
    () => roles.find(r => r.activo)?.id ?? "ROL-003",
  );
  const [ctrCargo,          setCtrCargo]         = useState("");
  const [ctrFechaInicio,    setCtrFechaInicio]   = useState("");
  const [ctrFechaFinal,     setCtrFechaFinal]    = useState("");
  const [ctrErrors,         setCtrErrors]        = useState<Record<string, string>>({});

  const [newNombre,       setNewNombre]       = useState("");
  const [newCorreo,       setNewCorreo]       = useState("");
  const [newTelefono,     setNewTelefono]     = useState("");
  const [newTipoDoc,      setNewTipoDoc]      = useState("CC");
  const [newDocumento,    setNewDocumento]    = useState("");
  const [newContrasena,   setNewContrasena]   = useState("");
  const [newConfirmar,    setNewConfirmar]    = useState("");
  const [newActivo,       setNewActivo]       = useState(true);
  const [newRolId,        setNewRolId]        = useState<string>(
    () => roles.find(r => r.activo)?.id ?? "ROL-003",
  );
  const [newCargo,        setNewCargo]        = useState("");
  const [newFechaInicio,  setNewFechaInicio]  = useState("");
  const [newFechaFinal,   setNewFechaFinal]   = useState("");
  const [createErrors,    setCreateErrors]    = useState<Record<string, string>>({});

  const rolInfo = (rolId: string) => roles.find(r => r.id === rolId) ?? null;
  const rolNombre = (rolId: string) => rolInfo(rolId)?.nombre ?? rolId;

  // Historial del empleado abierto en el modal de detalle, de la contratación
  // más reciente a la más antigua. Un `empleado` leído de una build anterior
  // podría no tener la lista, así que se tolerate como vacío.
  const detalleHistorial = useMemo(
    () => (detailItem ? ordenarContrataciones(detailItem.contrataciones ?? []) : []),
    [detailItem],
  );

  // Fuente de verdad del rol/identidad = lista `usuarios` (la que consulta el login).
  // Cada operación sobre un empleado actualiza (o crea) su registro Usuario vinculado por correo.
  const upsertUsuario = (emp: Empleado, prevCorreo?: string) => {
    setUsuarios(prev => {
      const kPrev = prevCorreo?.trim().toLowerCase();
      const kNew  = emp.correo.trim().toLowerCase();
      const target =
        (kPrev && prev.find(u => u.correo.trim().toLowerCase() === kPrev)) ||
        prev.find(u => u.correo.trim().toLowerCase() === kNew) ||
        null;
      const base: Pick<Usuario,
        "nombre" | "iniciales" | "avatarColor" | "correo" | "telefono" |
        "tipoDocumento" | "numeroDocumento" | "rolId" | "activo"
      > = {
        nombre: emp.nombre.trim(),
        iniciales: emp.iniciales,
        avatarColor: emp.avatarColor,
        correo: emp.correo.trim(),
        telefono: emp.telefono.trim(),
        tipoDocumento: emp.tipoDocumento,
        numeroDocumento: emp.numeroDocumento.trim(),
        rolId: emp.rolId,
        activo: emp.activo,
      };
      if (target) {
        return prev.map(u => u.id === target.id ? { ...u, ...base } : u);
      }
      const maxNum = prev.reduce((max, u) => {
        const n = parseInt(u.id.replace("USR-", ""), 10) || 0;
        return Math.max(max, n);
      }, 0);
      return [...prev, { id: `USR-${String(maxNum + 1).padStart(3, "0")}`, ...base }];
    });
  };

  const total   = empleados.length;
  const activos = empleados.filter(e => e.activo).length;
  const inact   = empleados.filter(e => !e.activo).length;

  const filtered = useMemo(() => {
    let r = empleados.filter(e => {
      const q = search.toLowerCase();
      const est = e.activo ? "activo" : "inactivo";
      const rol = rolNombre(e.rolId).toLowerCase();
      const matchQ =
        !q ||
        e.nombre.toLowerCase().includes(q) ||
        e.correo.toLowerCase().includes(q) ||
        e.cargo.toLowerCase().includes(q) ||
        e.numeroDocumento.toLowerCase().includes(q) ||
        `${e.tipoDocumento} ${e.numeroDocumento}`.toLowerCase().includes(q) ||
        rol.includes(q) ||
        est.includes(q);
      const matchE = filterEstado === "todos" || (filterEstado === "activo" ? e.activo : !e.activo);
      return matchQ && matchE;
    });
    // Ni "nombre" ni "cargo" dependen de `activo`: con el filtro en "Todos los
    // estados" los activos y los inactivos quedan intercalados. Se eliminó la
    // ordenación por estado, que solo servía para agruparlos en bloques.
    if (sortBy === "cargo") r = [...r].sort((a,b) => a.cargo.localeCompare(b.cargo));
    else                    r = [...r].sort((a,b) => a.nombre.localeCompare(b.nombre));
    return r;
  }, [empleados, search, filterEstado, sortBy]);

  // Filas por página adaptadas al alto disponible: la tabla nunca lleva scroll
  // interno, así que el paginador es la única forma de ver más empleados.
  // Se mide la tarjeta, que al ser `flex-1 min-h-0` dentro de una cadena
  // bloqueada a `h-dvh` tiene un alto que NO depende de cuántas filas haya,
  // de modo que no hay bucle de realimentación entre medición y render.
  const cardRef = useRef<HTMLDivElement>(null);
  const [filasPorPagina, setFilasPorPagina] = useState(6);
  const hayFilasRef = useRef(false);
  hayFilasRef.current = filtered.length > 0;

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const medir = () => {
      // Sin resultados la única <tr> es la de "No se encontraron", que mide
      // distinto: se conserva el último valor válido en vez de calcular con ella.
      if (!hayFilasRef.current) return;
      const thead = card.querySelector("thead");
      const fila  = card.querySelector("tbody tr");
      if (!(thead instanceof HTMLElement) || !(fila instanceof HTMLElement)) return;
      const altoFila = fila.offsetHeight;
      if (altoFila <= 0) return;
      const disponible = card.clientHeight - thead.offsetHeight;
      // `divide-y` pone 1px entre filas que el offsetHeight de la primera fila
      // no incluye, así que el divisor lleva ese +1 y el numerador lo compensa.
      // Sin piso mínimo: si se forzara un mínimo mayor de lo que cabe, la última
      // fila de cada página quedaría recortada por el `overflow-hidden` de la
      // tarjeta sin poder alcanzarla con el paginador (estaría en la misma
      // página), que es peor que un paginador más largo.
      const n = Math.max(1, Math.floor((disponible + 1) / (altoFila + 1)));
      setFilasPorPagina(prev => (prev === n ? prev : n));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(card);
    return () => ro.disconnect();
  }, []);

  // Si al encoger la ventana caben menos filas por página, la página actual
  // puede quedar fuera de rango: se vuelve a la primera.
  useEffect(() => { setPage(1); }, [filasPorPagina]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / filasPorPagina));
  // La página efectiva nunca puede pasar de totalPages: si el conjunto filtrado
  // se reduce (p. ej. al apagar un switch con un filtro de estado activo) `page`
  // quedaría fuera de rango, la tabla saldría vacía y la paginación se ocultaría,
  // dejando al usuario sin forma de volver.
  const pageActual = Math.min(page, totalPages);
  const paged      = filtered.slice((pageActual-1)*filasPorPagina, pageActual*filasPorPagina);

  const toggleEstado = (id: string) => {
    setEmpleados(p => p.map(e => e.id === id ? { ...e, activo: !e.activo } : e));
    const cur = empleados.find(e => e.id === id);
    if (cur) upsertUsuario({ ...cur, activo: !cur.activo }, cur.correo);
    toast.success("Estado del empleado actualizado");
  };

  const handleEdit = () => {
    if (!editItem) return;
    const e = editItem;
    const errs: Record<string, string> = {};
    if (!e.nombre.trim()) errs.nombre = "El nombre es obligatorio";
    if (!e.correo.trim()) errs.correo = "El correo es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.correo.trim())) errs.correo = "Formato de correo no válido";
    if (e.telefono.trim() && !/^[\d\s+()\-]+$/.test(e.telefono.trim()))
      errs.telefono = "El teléfono solo debe contener números";
    if (!e.tipoDocumento.trim()) errs.tipoDocumento = "El tipo de documento es obligatorio";
    if (!e.numeroDocumento.trim()) errs.numeroDocumento = "El número de documento es obligatorio";
    else if (e.tipoDocumento !== "PP" && !/^\d+$/.test(e.numeroDocumento.trim()))
      errs.numeroDocumento = "El número de documento solo debe contener números";
    if (!e.fechaInicio) errs.fechaInicio = "La fecha de inicio es obligatoria";
    if (e.fechaInicio && e.fechaFinal && e.fechaFinal < e.fechaInicio)
      errs.fechaFinal = "La fecha final no puede ser anterior a la fecha de inicio";
    if (!e.rolId) errs.rol = "Selecciona un rol";
    if (!e.cargo.trim()) errs.cargo = "El cargo es obligatorio";

    if (Object.keys(errs).length) { setEditErrors(errs); return; }

    const em = e.correo.trim().toLowerCase();
    const dm = e.numeroDocumento.trim();
    const clave = `${e.tipoDocumento}||${dm}`.toLowerCase();
    const ancla = editPrevCorreo?.trim().toLowerCase();
    const otro = (correo: string) => correo.trim().toLowerCase() !== ancla;
    const correoDup =
      empleados.some(x => x.id !== e.id && otro(x.correo) && x.correo.trim().toLowerCase() === em) ||
      usuarios.some(u => otro(u.correo) && u.correo.trim().toLowerCase() === em) ||
      clientes.some(c => otro(c.correo) && c.correo.trim().toLowerCase() === em);
    const docDup =
      empleados.some(x => x.id !== e.id && otro(x.correo) && `${x.tipoDocumento}||${x.numeroDocumento}`.toLowerCase() === clave) ||
      usuarios.some(u => otro(u.correo) && `${u.tipoDocumento}||${u.numeroDocumento}`.toLowerCase() === clave) ||
      clientes.some(c => otro(c.correo) && `${c.tipoDocumento}||${c.numeroDocumento}`.toLowerCase() === clave);
    if (correoDup) errs.correo = "Este correo ya está registrado";
    if (docDup) errs.numeroDocumento = "Este documento ya está registrado";
    if (Object.keys(errs).length) { setEditErrors(errs); return; }

    const nuevasIniciales = e.nombre.trim().split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
    setEmpleados(p => p.map(x => x.id === e.id ? { ...e, iniciales: nuevasIniciales } : x));
    upsertUsuario({ ...e, iniciales: nuevasIniciales }, editPrevCorreo ?? undefined);
    setEditItem(null);
    setEditPrevCorreo(null);
    setEditErrors({});
    toast.success("Empleado actualizado correctamente");
  };

  const resetCreate = () => {
    setNewNombre(""); setNewCorreo(""); setNewTelefono(""); setNewTipoDoc("CC");
    setNewDocumento(""); setNewContrasena(""); setNewConfirmar("");
    setNewActivo(true);
    setNewRolId(roles.find(r => r.activo)?.id ?? "ROL-003");
    setNewCargo(""); setNewFechaInicio(""); setNewFechaFinal(""); setCreateErrors({});
  };

  const handleCreate = () => {
    const errs: Record<string, string> = {};
    if (!newNombre.trim()) errs.nombre = "El nombre es obligatorio";
    if (!newCorreo.trim()) { errs.correo = "El correo es obligatorio"; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCorreo.trim())) { errs.correo = "Formato de correo no válido"; }
    if (newTelefono.trim() && !/^[\d\s+()\-]+$/.test(newTelefono.trim()))
      errs.telefono = "El teléfono solo debe contener números";
    if (!newTipoDoc.trim()) { errs.tipoDocumento = "Selecciona el tipo de documento"; }
    if (!newDocumento.trim()) { errs.documento = "El número de documento es obligatorio"; }
    else if (newTipoDoc !== "PP" && !/^\d+$/.test(newDocumento.trim())) { errs.documento = "El número de documento solo debe contener números"; }
    if (!newContrasena.trim()) { errs.contrasena = "La contraseña es obligatoria"; }
    else if (newContrasena.length < 6) { errs.contrasena = "Mínimo 6 caracteres"; }
    if (!newConfirmar.trim()) { errs.confirmar = "Confirma la contraseña"; }
    else if (newContrasena !== newConfirmar) { errs.confirmar = "Las contraseñas no coinciden"; }
    if (!newRolId) errs.rol = "Selecciona un rol";
    if (!newCargo.trim()) errs.cargo = "El cargo es obligatorio";
    if (!newFechaInicio) errs.fechaInicio = "La fecha de inicio es obligatoria";
    if (newFechaInicio && newFechaFinal && newFechaFinal < newFechaInicio)
      errs.fechaFinal = "La fecha final no puede ser anterior a la fecha de inicio";

    const em = newCorreo.trim().toLowerCase();
    const dm = newDocumento.trim();
    const clave = `${newTipoDoc}||${dm}`.toLowerCase();
    const dupeInList =
      empleados.length > 0 &&
      (empleados.some(e =>
        e.correo.trim().toLowerCase() === em || `${e.tipoDocumento}||${e.numeroDocumento}`.toLowerCase() === clave
      ));
    const dupeInUsers =
      usuarios.some(u =>
        u.correo.trim().toLowerCase() === em || `${u.tipoDocumento}||${u.numeroDocumento}`.toLowerCase() === clave
      );
    const dupeInClients =
      clientes.some(c => c.correo.trim().toLowerCase() === em || `${c.tipoDocumento}||${c.numeroDocumento}`.toLowerCase() === clave);
    if (dupeInList || dupeInUsers || dupeInClients) {
      const hayCorreo = empleados.some(e => e.correo.trim().toLowerCase() === em) ||
        usuarios.some(u => u.correo.trim().toLowerCase() === em) ||
        clientes.some(c => c.correo.trim().toLowerCase() === em);
      const hayDoc = empleados.some(e => `${e.tipoDocumento}||${e.numeroDocumento}`.toLowerCase() === clave) ||
        usuarios.some(u => `${u.tipoDocumento}||${u.numeroDocumento}`.toLowerCase() === clave) ||
        clientes.some(c => `${c.tipoDocumento}||${c.numeroDocumento}`.toLowerCase() === clave);
      if (hayCorreo) errs.correo = "Este correo ya está registrado";
      if (hayDoc) errs.documento = "Este documento ya está registrado";
    }

    if (Object.keys(errs).length) { setCreateErrors(errs); return; }

    const maxNum = empleados.reduce((max, e) => {
      const n = parseInt(e.id.replace("EMP-", "")) || 0;
      return Math.max(max, n);
    }, 0);
    const newId = `EMP-${String(maxNum + 1).padStart(3, "0")}`;
    const iniciales = newNombre.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    const avatarColor = AVATAR_COLORS[empleados.length % AVATAR_COLORS.length];

    const nuevoEmpleado: Empleado = {
      id: newId,
      nombre: newNombre.trim(),
      iniciales,
      avatarColor,
      correo: newCorreo.trim(),
      telefono: newTelefono.trim(),
      tipoDocumento: newTipoDoc,
      numeroDocumento: dm,
      contrasena: newContrasena,
      rolId: newRolId,
      activo: newActivo,
      cargo: newCargo.trim(),
      fechaInicio: newFechaInicio,
      fechaFinal: newFechaFinal,
      // El alta es en sí misma la primera contratación: se guarda como registro
      // del historial para que quede desde el mismo momento, no solo implícita.
      contrataciones: [{
        id: nuevoContratacionId(newId, []),
        cargo: newCargo.trim(),
        rolId: newRolId,
        fechaInicio: newFechaInicio,
        fechaFinal: newFechaFinal,
      }],
    };

    setEmpleados(prev => [nuevoEmpleado, ...prev]);
    upsertUsuario(nuevoEmpleado);
    setShowCreate(false);
    resetCreate();
    toast.success(`Empleado ${newNombre.trim()} creado correctamente`);
  };

  const resetContratacion = () => {
    setCtrEmpleadoId(""); setCtrActivo(true);
    setCtrRolId(roles.find(r => r.activo)?.id ?? "ROL-003");
    setCtrCargo(""); setCtrFechaInicio(""); setCtrFechaFinal("");
    setCtrErrors({});
  };

  // Registra una contratación nueva. Añade la entrada al historial SIN tocar las
  // anteriores y, a la vez, deja los campos de contrato del empleado reflejando
  // esta última contratación, que es lo que muestra la tabla.
  const handleNuevaContratacion = () => {
    const errs: Record<string, string> = {};
    const emp = empleados.find(e => e.id === ctrEmpleadoId);

    if (!ctrEmpleadoId) errs.empleado = "Selecciona un empleado";
    else if (!emp) errs.empleado = "El empleado seleccionado no existe";

    if (!ctrRolId) errs.rol = "Selecciona un rol";
    if (!ctrCargo.trim()) errs.cargo = "El cargo es obligatorio";
    if (!ctrFechaInicio) errs.fechaInicio = "La fecha de inicio es obligatoria";
    // Solo tiene sentido si la contratación ya empezó: comparar como texto ISO
    // (YYYY-MM-DD) es equivalente a comparar fechas.
    if (ctrFechaFinal && ctrFechaFinal < ctrFechaInicio) {
      errs.fechaFinal = "La fecha final no puede ser anterior a la fecha de inicio";
    }

    if (Object.keys(errs).length) { setCtrErrors(errs); return; }

    const contrato: Contratacion = {
      id: nuevoContratacionId(emp!.id, emp!.contrataciones ?? []),
      cargo: ctrCargo.trim(),
      rolId: ctrRolId,
      fechaInicio: ctrFechaInicio,
      fechaFinal: ctrFechaFinal,
    };

    const actualizado: Empleado = {
      ...emp!,
      cargo: contrato.cargo,
      rolId: contrato.rolId,
      fechaInicio: contrato.fechaInicio,
      fechaFinal: contrato.fechaFinal,
      activo: ctrActivo,
      contrataciones: [...(emp!.contrataciones ?? []), contrato],
    };

    setEmpleados(prev => prev.map(e => (e.id === actualizado.id ? actualizado : e)));
    // El rol y el estado del empleado son también los del Usuario que usa el
    // login, así que hay que reflejarlos o la etiqueta de rol de la pantalla
    // de Usuarios quedaría mostrando el valor anterior.
    upsertUsuario(actualizado);
    if (detailItem?.id === actualizado.id) setDetailItem(actualizado);

    setShowContrat(false);
    resetContratacion();
    toast.success(`Contratación registrada para ${actualizado.nombre}`);
  };

  const iCls = "px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer";
  const fCls = (err?: string) =>
    `w-full px-3 py-2 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${err ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`;

  return (
    <div className="px-6 pt-5 pb-4 max-w-6xl mx-auto h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Empleados</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Usuarios registrados con tipo empleado en La Sirena</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { resetContratacion(); setShowContrat(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer"
          >
            <Briefcase className="w-4 h-4" /> Nueva contratación
          </button>
          <button
            onClick={() => { resetCreate(); setShowCreate(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <UserPlus className="w-4 h-4" /> Crear empleado
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3 shrink-0">
        {[
          { label: "Total empleados", value: total,   cls: "text-foreground",       bg: "bg-card"       },
          { label: "Activos",         value: activos, cls: "text-emerald-600",       bg: "bg-emerald-50" },
          { label: "Inactivos",       value: inact,   cls: "text-muted-foreground", bg: "bg-muted"      },
        ].map(({ label, value, cls, bg }) => (
          <div key={label} className={`${bg} border border-border rounded-2xl p-2.5`}>
            <p className={`text-2xl font-bold ${cls}`}>{value}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5 shrink-0">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre, correo, cargo, documento o estado..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={filterEstado} onChange={e => { setFiltro(e.target.value); setPage(1); }} className={iCls}>
          <option value="todos">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={iCls}>
          <option value="nombre">Ordenar por nombre</option>
          <option value="cargo">Ordenar por cargo</option>
        </select>
      </div>

      {/* Tabla — la tarjeta recorta las esquinas redondeadas y nunca hace scroll:
          el número de filas por página se calcula arriba para que siempre quepan
          enteras y la navegación sea solo por el paginador. */}
      <div ref={cardRef} className="bg-card border border-border rounded-2xl overflow-hidden mb-2 flex-1 min-h-0">
        <table className="w-full">
          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
            <tr>
              {["Empleado","Correo","Cargo","Estado","Acciones"].map(h => (
                <th key={h} className="px-4 py-1.5 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-14 text-center text-muted-foreground">
                  <p className="text-4xl mb-3">👥</p><p>No se encontraron empleados</p>
                </td></tr>
              ) : paged.map(e => {
                const rol = rolInfo(e.rolId);
                return (
                  <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full ${e.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {e.iniciales}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{e.nombre}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-mono text-muted-foreground">{fmtDoc(e.tipoDocumento, e.numeroDocumento)}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 ${rol && !rol.activo ? "opacity-50" : ""}`}>
                              Empleado/{rolNombre(e.rolId)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-1.5 text-sm text-muted-foreground">{e.correo}</td>
                    <td className="px-4 py-1.5 text-sm text-muted-foreground">{e.cargo}</td>
                    <td className="px-4 py-1.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${e.activo ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>
                        {e.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setDetailItem(e)} title="Ver detalle"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors cursor-pointer">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditItem({ ...e }); setEditPrevCorreo(e.correo); setEditErrors({}); }} title="Editar"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <EstadoSwitch activo={e.activo} onToggle={() => toggleEstado(e.id)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
        </table>
      </div>

      {/* Paginación */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-center shrink-0">
          {/* Los controles se muestran siempre, incluso con una sola página: con
              las filas por página adaptativas puede dar 1 sola página, y ocultarlos
              dejaría la tabla sin ninguna señal de que la lista estaba completa.
              Con una sola página ambas flechas salen deshabilitadas (disabled:opacity-40). */}
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={pageActual === 1}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i+1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-sm font-semibold cursor-pointer ${n === pageActual ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={pageActual === totalPages}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal: Nueva contratación */}
      <AnimatePresence>
        {showContrat && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
                className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4">
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Nueva Contratación</h3>
                  <button onClick={() => { setShowContrat(false); resetContratacion(); }}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-4 py-3.5 grid grid-cols-2 gap-x-3 gap-y-3">
                  {/* Empleado al que se le registra la contratación */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Empleado <span className="text-primary">*</span>
                    </label>
                    <select value={ctrEmpleadoId} autoFocus
                      onChange={e => { setCtrEmpleadoId(e.target.value); if (ctrErrors.empleado) setCtrErrors(p => ({ ...p, empleado: undefined })); }}
                      className={`${fCls(ctrErrors.empleado)} cursor-pointer`}>
                      <option value="">Selecciona un empleado…</option>
                      {empleados.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.nombre}
                        </option>
                      ))}
                    </select>
                    {ctrErrors.empleado && <p className="text-xs text-red-500 mt-1">{ctrErrors.empleado}</p>}
                  </div>

                  {/* Datos de Tb_Empleado */}
                  <p className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-1.5">Datos de Tb_Empleado</p>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                    <select value={ctrActivo ? "activo" : "inactivo"}
                      onChange={e => setCtrActivo(e.target.value === "activo")}
                      className={`${fCls()} cursor-pointer`}>
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Rol <span className="text-primary">*</span>
                    </label>
                    <select value={ctrRolId}
                      onChange={e => { setCtrRolId(e.target.value); if (ctrErrors.rol) setCtrErrors(p => ({ ...p, rol: undefined })); }}
                      className={`${fCls(ctrErrors.rol)} cursor-pointer`}>
                      {roles.filter(r => r.activo).map(r => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                      ))}
                    </select>
                    {ctrErrors.rol && <p className="text-xs text-red-500 mt-1">{ctrErrors.rol}</p>}
                  </div>

                  {/* Datos de Contratacion_empleado */}
                  <p className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-1.5">Datos de Contratacion_empleado</p>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Cargo <span className="text-primary">*</span>
                    </label>
                    <input type="text" value={ctrCargo}
                      onChange={e => { setCtrCargo(e.target.value); if (ctrErrors.cargo) setCtrErrors(p => ({ ...p, cargo: undefined })); }}
                      placeholder="Ej: Cajero"
                      className={fCls(ctrErrors.cargo)} />
                    {ctrErrors.cargo && <p className="text-xs text-red-500 mt-1">{ctrErrors.cargo}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Fecha de inicio <span className="text-primary">*</span>
                    </label>
                    <input type="date" value={ctrFechaInicio}
                      onChange={e => { setCtrFechaInicio(e.target.value); if (ctrErrors.fechaInicio) setCtrErrors(p => ({ ...p, fechaInicio: undefined })); }}
                      className={fCls(ctrErrors.fechaInicio)} />
                    {ctrErrors.fechaInicio && <p className="text-xs text-red-500 mt-1">{ctrErrors.fechaInicio}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Fecha final <span className="text-muted-foreground font-normal">(opcional)</span>
                    </label>
                    <input type="date" value={ctrFechaFinal}
                      onChange={e => { setCtrFechaFinal(e.target.value); if (ctrErrors.fechaFinal) setCtrErrors(p => ({ ...p, fechaFinal: undefined })); }}
                      className={fCls(ctrErrors.fechaFinal)} />
                    {ctrErrors.fechaFinal && <p className="text-xs text-red-500 mt-1">{ctrErrors.fechaFinal}</p>}
                  </div>
                </div>

                <div className="flex gap-3 px-4 py-3 border-t border-border">
                  <button onClick={() => { setShowContrat(false); resetContratacion(); }}
                    className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleNuevaContratacion}
                    className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                    Registrar
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Ver detalle */}
      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
              className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Detalle Empleado</h3>
                <button onClick={() => setDetailItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center gap-4 pb-4 mb-4 border-b border-border">
                  <div className={`w-14 h-14 rounded-full ${detailItem.avatarColor} flex items-center justify-center text-white text-lg font-bold`}>
                    {detailItem.iniciales}
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-base">{detailItem.nombre}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{fmtDoc(detailItem.tipoDocumento, detailItem.numeroDocumento)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { l: "Correo",          v: detailItem.correo },
                    { l: "Teléfono",        v: detailItem.telefono || "—" },
                    { l: "Tipo de documento",   v: detailItem.tipoDocumento },
                    { l: "Número de documento", v: detailItem.numeroDocumento },
                    { l: "Cargo",           v: detailItem.cargo },
                    { l: "Rol asignado",    v: rolNombre(detailItem.rolId) },
                    { l: "Fecha inicio",    v: detailItem.fechaInicio },
                    { l: "Fecha final",     v: detailItem.fechaFinal || "Continúa activo" },
                    { l: "Estado",          v: detailItem.activo ? "Activo" : "Inactivo" },
                  ].map(({ l, v }) => (
                    <div key={l} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-4">
                      <span className="text-sm text-muted-foreground font-medium shrink-0">{l}</span>
                      <span className="text-sm font-semibold text-foreground text-right">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Historial de contrataciones. La lista lleva su propio tope de
                    alto: el modal no crece sin límite aunque el empleado haya
                    cambiado de cargo muchas veces. */}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                    Historial de contrataciones
                  </p>
                  {detalleHistorial.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin contrataciones registradas</p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                      {detalleHistorial.map((c, i) => (
                        <div key={c.id}
                          className={`rounded-xl border px-3 py-2.5 ${i === 0 ? "border-primary/30 bg-primary/5" : "border-border bg-muted/40"}`}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-semibold text-foreground">{c.cargo}</span>
                            {i === 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide shrink-0">
                                Actual
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{rolNombre(c.rolId)}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            {c.fechaInicio} → {c.fechaFinal || "Continúa activo"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="px-5 py-4 border-t border-border">
                <button onClick={() => setDetailItem(null)}
                  className="w-full py-2.5 bg-muted rounded-xl text-sm font-semibold text-foreground hover:bg-border cursor-pointer transition-colors">
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Crear empleado */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
                className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Crear Empleado</h3>
                  <button onClick={() => { setShowCreate(false); resetCreate(); }}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-4 py-3.5 grid grid-cols-2 gap-x-3 gap-y-2.5">
                  {/* Datos de cuenta */}
                  <p className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-1.5 first:pt-0">Datos de cuenta</p>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Nombre completo <span className="text-primary">*</span>
                    </label>
                    <input type="text" value={newNombre} autoFocus
                      onChange={e => { setNewNombre(e.target.value); if (createErrors.nombre) setCreateErrors(p => ({ ...p, nombre: undefined })); }}
                      placeholder="Ej: Laura Martínez"
                      className={fCls(createErrors.nombre)} />
                    {createErrors.nombre && <p className="text-xs text-red-500 mt-1">{createErrors.nombre}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Correo electrónico <span className="text-primary">*</span>
                    </label>
                    <input type="email" value={newCorreo}
                      onChange={e => { setNewCorreo(e.target.value); if (createErrors.correo) setCreateErrors(p => ({ ...p, correo: undefined })); }}
                      placeholder="correo@ejemplo.com"
                      className={fCls(createErrors.correo)} />
                    {createErrors.correo && <p className="text-xs text-red-500 mt-1">{createErrors.correo}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Teléfono <span className="text-muted-foreground font-normal">(opcional)</span>
                    </label>
                    <input type="tel" value={newTelefono}
                      onChange={e => { setNewTelefono(e.target.value); if (createErrors.telefono) setCreateErrors(p => ({ ...p, telefono: undefined })); }}
                      placeholder="3001234567"
                      className={fCls(createErrors.telefono)} />
                    {createErrors.telefono && <p className="text-xs text-red-500 mt-1">{createErrors.telefono}</p>}
                  </div>
                  <div className="flex gap-2">
                    <div className="w-28 shrink-0">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Tipo de documento <span className="text-primary">*</span></label>
                      <select value={newTipoDoc}
                        onChange={e => { setNewTipoDoc(e.target.value); if (createErrors.tipoDocumento) setCreateErrors(p => ({ ...p, tipoDocumento: undefined })); }}
                        className={`${fCls(createErrors.tipoDocumento)} cursor-pointer`}>
                        {DOC_TIPOS.map(t => <option key={t.code} value={t.code}>{t.code}</option>)}
                      </select>
                      {createErrors.tipoDocumento && <p className="text-xs text-red-500 mt-1">{createErrors.tipoDocumento}</p>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        Número de documento <span className="text-primary">*</span>
                      </label>
                      <input type="text" inputMode={newTipoDoc === "PP" ? "text" : "numeric"} value={newDocumento}
                        onChange={e => { setNewDocumento(e.target.value.replace(/[\s.]/g, "")); if (createErrors.documento) setCreateErrors(p => ({ ...p, documento: undefined })); }}
                        placeholder={newTipoDoc === "PP" ? "AB123456" : "12345678"}
                        className={fCls(createErrors.documento)} />
                      {createErrors.documento && <p className="text-xs text-red-500 mt-1">{createErrors.documento}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Contraseña <span className="text-primary">*</span>
                    </label>
                    <input type="password" value={newContrasena}
                      onChange={e => { setNewContrasena(e.target.value); if (createErrors.contrasena) setCreateErrors(p => ({ ...p, contrasena: undefined })); }}
                      placeholder="Mínimo 6 caracteres"
                      className={fCls(createErrors.contrasena)} />
                    {createErrors.contrasena && <p className="text-xs text-red-500 mt-1">{createErrors.contrasena}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Confirmar contraseña <span className="text-primary">*</span>
                    </label>
                    <input type="password" value={newConfirmar}
                      onChange={e => { setNewConfirmar(e.target.value); if (createErrors.confirmar) setCreateErrors(p => ({ ...p, confirmar: undefined })); }}
                      placeholder="Repite la contraseña"
                      className={fCls(createErrors.confirmar)} />
                    {createErrors.confirmar && <p className="text-xs text-red-500 mt-1">{createErrors.confirmar}</p>}
                  </div>

                  {/* Datos de Tb_Empleado */}
                  <p className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-1.5">Datos de Tb_Empleado</p>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                    <select value={newActivo ? "activo" : "inactivo"}
                      onChange={e => setNewActivo(e.target.value === "activo")}
                      className={`${fCls()} cursor-pointer`}>
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Rol <span className="text-primary">*</span>
                    </label>
                    <select value={newRolId}
                      onChange={e => { setNewRolId(e.target.value); if (createErrors.rol) setCreateErrors(p => ({ ...p, rol: undefined })); }}
                      className={`${fCls(createErrors.rol)} cursor-pointer`}>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.nombre}{!r.activo ? " (Inactivo)" : ""}
                        </option>
                      ))}
                    </select>
                    {createErrors.rol && <p className="text-xs text-red-500 mt-1">{createErrors.rol}</p>}
                  </div>

                  {/* Datos de Contratacion_empleado */}
                  <p className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-1.5">Datos de Contratacion_empleado</p>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Cargo <span className="text-primary">*</span>
                    </label>
                    <input type="text" value={newCargo}
                      onChange={e => { setNewCargo(e.target.value); if (createErrors.cargo) setCreateErrors(p => ({ ...p, cargo: undefined })); }}
                      placeholder="Ej: Cajero"
                      className={fCls(createErrors.cargo)} />
                    {createErrors.cargo && <p className="text-xs text-red-500 mt-1">{createErrors.cargo}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Fecha de inicio <span className="text-primary">*</span>
                    </label>
                    <input type="date" value={newFechaInicio}
                      onChange={e => { setNewFechaInicio(e.target.value); if (createErrors.fechaInicio) setCreateErrors(p => ({ ...p, fechaInicio: undefined })); }}
                      className={fCls(createErrors.fechaInicio)} />
                    {createErrors.fechaInicio && <p className="text-xs text-red-500 mt-1">{createErrors.fechaInicio}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Fecha final <span className="text-muted-foreground font-normal">(opcional)</span>
                    </label>
                    <input type="date" value={newFechaFinal}
                      onChange={e => { setNewFechaFinal(e.target.value); if (createErrors.fechaFinal) setCreateErrors(p => ({ ...p, fechaFinal: undefined })); }}
                      className={fCls(createErrors.fechaFinal)} />
                    {createErrors.fechaFinal && <p className="text-xs text-red-500 mt-1">{createErrors.fechaFinal}</p>}
                  </div>
                </div>

                <div className="flex gap-3 px-4 py-3 border-t border-border">
                  <button onClick={() => { setShowCreate(false); resetCreate(); }}
                    className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleCreate}
                    className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                    Crear empleado
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Editar empleado */}
      <AnimatePresence>
        {editItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
            <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
              exit={{ scale:.95, opacity:0 }} transition={{ duration:.15 }}
              className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground" style={{fontFamily:SERIF}}>Editar Empleado</h3>
                <button onClick={() => setEditItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                  <X className="w-4 h-4"/>
                </button>
              </div>
              <div className="px-4 py-3.5 grid grid-cols-2 gap-x-3 gap-y-3">
                <div className="col-span-2 flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full ${editItem.avatarColor} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                    {editItem.iniciales}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{editItem.nombre}</p>
                    <p className="text-xs font-mono text-muted-foreground">{fmtDoc(editItem.tipoDocumento, editItem.numeroDocumento)}</p>
                  </div>
                </div>
                {[
                  { label: "Nombre completo", field: "nombre" as const, type: "text"  },
                  { label: "Correo",          field: "correo" as const, type: "email" },
                  { label: "Teléfono",        field: "telefono" as const, type: "tel" },
                ].map(({ label, field, type }) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
                    <input type={type} value={editItem[field]}
                      onChange={e => { setEditItem(x => x && ({ ...x, [field]: e.target.value })); if (editErrors[field]) setEditErrors(p => ({ ...p, [field]: undefined })); }}
                      className={`w-full px-3 py-2 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${editErrors[field] ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`} />
                    {editErrors[field] && <p className="text-xs text-red-500 mt-1">{editErrors[field]}</p>}
                  </div>
                ))}
                <div className="flex gap-2 col-span-2">
                  <div className="w-28 shrink-0">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Tipo de documento</label>
                    <select value={editItem.tipoDocumento}
                      onChange={e => { setEditItem(x => x && ({ ...x, tipoDocumento: e.target.value })); if (editErrors.tipoDocumento) setEditErrors(p => ({ ...p, tipoDocumento: undefined })); }}
                      className={`w-full px-3 py-2 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer ${editErrors.tipoDocumento ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}>
                      {DOC_TIPOS.map(t => <option key={t.code} value={t.code}>{t.code}</option>)}
                    </select>
                    {editErrors.tipoDocumento && <p className="text-xs text-red-500 mt-1">{editErrors.tipoDocumento}</p>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Número de documento</label>
                    <input type="text" inputMode={editItem.tipoDocumento === "PP" ? "text" : "numeric"} value={editItem.numeroDocumento}
                      onChange={e => { setEditItem(x => x && ({ ...x, numeroDocumento: e.target.value.replace(/[\s.]/g, "") })); if (editErrors.numeroDocumento) setEditErrors(p => ({ ...p, numeroDocumento: undefined })); }}
                      placeholder={editItem.tipoDocumento === "PP" ? "AB123456" : "12345678"}
                      className={`w-full px-3 py-2 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${editErrors.numeroDocumento ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`} />
                    {editErrors.numeroDocumento && <p className="text-xs text-red-500 mt-1">{editErrors.numeroDocumento}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Cargo</label>
                  <input type="text" value={editItem.cargo}
                    onChange={e => { setEditItem(x => x && ({ ...x, cargo: e.target.value })); if (editErrors.cargo) setEditErrors(p => ({ ...p, cargo: undefined })); }}
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${editErrors.cargo ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`} />
                  {editErrors.cargo && <p className="text-xs text-red-500 mt-1">{editErrors.cargo}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                  <select value={editItem.activo ? "activo" : "inactivo"}
                    onChange={e => setEditItem(x => x && ({ ...x, activo: e.target.value === "activo" }))}
                    className="w-full px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha de inicio</label>
                  <input type="date" value={editItem.fechaInicio}
                    onChange={e => { setEditItem(x => x && ({ ...x, fechaInicio: e.target.value })); if (editErrors.fechaInicio) setEditErrors(p => ({ ...p, fechaInicio: undefined })); }}
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${editErrors.fechaInicio ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`} />
                  {editErrors.fechaInicio && <p className="text-xs text-red-500 mt-1">{editErrors.fechaInicio}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha final</label>
                  <input type="date" value={editItem.fechaFinal}
                    onChange={e => { setEditItem(x => x && ({ ...x, fechaFinal: e.target.value })); if (editErrors.fechaFinal) setEditErrors(p => ({ ...p, fechaFinal: undefined })); }}
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${editErrors.fechaFinal ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`} />
                  {editErrors.fechaFinal && <p className="text-xs text-red-500 mt-1">{editErrors.fechaFinal}</p>}
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Rol actual</label>
                  <select value={editItem.rolId}
                    onChange={e => { setEditItem(x => x && ({ ...x, rolId: e.target.value })); if (editErrors.rol) setEditErrors(p => ({ ...p, rol: undefined })); }}
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer ${editErrors.rol ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}{!r.activo ? " (Inactivo)" : ""}
                      </option>
                    ))}
                  </select>
                  {editErrors.rol && <p className="text-xs text-red-500 mt-1">{editErrors.rol}</p>}
                </div>
              </div>
              <div className="flex gap-3 px-4 py-3 border-t border-border">
                <button onClick={() => setEditItem(null)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                  Cancelar
                </button>
                <button onClick={handleEdit}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                  Guardar cambios
                </button>
              </div>
            </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}