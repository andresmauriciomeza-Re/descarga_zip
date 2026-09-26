import { useState, useMemo, useRef, useLayoutEffect, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, X, RefreshCw, AlertTriangle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { type Rol, MENU_TREE, ACCIONES, KEY, accionColors, countAccesos } from "./GestionConfigScreen";
import { type Empleado } from "./GestionEmpleadosScreen";
import { type Cliente } from "./GestionClientesScreen";

const SERIF = "'DM Serif Display', serif";

export const DOC_TIPOS = [
  { code: "CC", label: "Cédula de Ciudadanía" },
  { code: "CE", label: "Cédula de Extranjería" },
  { code: "TI", label: "Tarjeta de Identidad" },
  { code: "PP", label: "Pasaporte" },
];

export const fmtDoc = (tipo: string, numero: string) => `${tipo} ${numero}`;

export interface Usuario {
  id: string;
  nombre: string;
  iniciales: string;
  avatarColor: string;
  correo: string;
  telefono: string;
  tipoDocumento: string;
  numeroDocumento: string;
  rolId: string;
  rolInternoId?: string;
  activo: boolean;
}

export const INIT_USUARIOS: Usuario[] = [
  { id:"USR-001", nombre:"Gloria Inés Vargas",  iniciales:"GV", avatarColor:"bg-red-500",     correo:"gloria@lasirena.com",          telefono:"604 321 0001", tipoDocumento:"CC", numeroDocumento:"12345678", rolId:"ROL-001", activo:true  },
  { id:"USR-002", nombre:"Sebastián Gómez",     iniciales:"SG", avatarColor:"bg-blue-500",    correo:"sebastian.gomez@lasirena.com", telefono:"310 456 7890", tipoDocumento:"CC", numeroDocumento:"87654321", rolId:"ROL-003", activo:true  },
  { id:"USR-003", nombre:"María González",      iniciales:"MG", avatarColor:"bg-red-500",     correo:"maria.gonzalez@gmail.com",     telefono:"315 123 4567", tipoDocumento:"CC", numeroDocumento:"11223344", rolId:"ROL-003", activo:true  },
  { id:"USR-004", nombre:"Carlos Martínez",     iniciales:"CM", avatarColor:"bg-emerald-500", correo:"carlos.m@hotmail.com",         telefono:"320 987 6543", tipoDocumento:"CC", numeroDocumento:"22334455", rolId:"ROL-003", activo:true  },
  { id:"USR-005", nombre:"Ana Rodríguez",       iniciales:"AR", avatarColor:"bg-purple-500",  correo:"ana.rodriguez@outlook.com",    telefono:"318 765 4321", tipoDocumento:"CC", numeroDocumento:"33445566", rolId:"ROL-003", activo:true  },
  { id:"USR-006", nombre:"Jorge Vargas",        iniciales:"JV", avatarColor:"bg-amber-500",   correo:"jorge.vargas@gmail.com",       telefono:"301 234 5678", tipoDocumento:"CC", numeroDocumento:"44556677", rolId:"ROL-003", activo:false },
  { id:"USR-007", nombre:"Patricia Soto",       iniciales:"PS", avatarColor:"bg-pink-500",    correo:"patricia.soto@yahoo.com",      telefono:"305 678 9012", tipoDocumento:"CC", numeroDocumento:"55667788", rolId:"ROL-003", activo:true  },
  { id:"USR-008", nombre:"Luis Herrera",        iniciales:"LH", avatarColor:"bg-indigo-500",  correo:"lherrera@gmail.com",           telefono:"312 345 6789", tipoDocumento:"CC", numeroDocumento:"66778899", rolId:"ROL-003", activo:true  },
  { id:"USR-009", nombre:"Sandra Ríos",         iniciales:"SR", avatarColor:"bg-teal-500",    correo:"sandrios@gmail.com",           telefono:"316 890 1234", tipoDocumento:"CC", numeroDocumento:"77889900", rolId:"ROL-003", activo:false },
  { id:"USR-010", nombre:"Tomás Jiménez",       iniciales:"TJ", avatarColor:"bg-blue-500",    correo:"tomas.j@gmail.com",            telefono:"321 456 7890", tipoDocumento:"CC", numeroDocumento:"88990011", rolId:"ROL-002", activo:true  },
  { id:"USR-011", nombre:"Valentina Mora",      iniciales:"VM", avatarColor:"bg-red-500",     correo:"valmora@hotmail.com",          telefono:"317 012 3456", tipoDocumento:"CC", numeroDocumento:"99001122", rolId:"ROL-002", activo:true  },
  { id:"USR-012", nombre:"Andrés Castillo",     iniciales:"AC", avatarColor:"bg-emerald-500", correo:"andres.castillo@gmail.com",    telefono:"314 567 8901", tipoDocumento:"CC", numeroDocumento:"10111213", rolId:"ROL-003", activo:true  },
];

// Colores de avatar para los usuarios de alta. La misma paleta que usa Clientes
// para que ambos listados se vean homogéneos.
const AVATAR_COLORS = [
  "bg-red-500","bg-blue-500","bg-emerald-500",
  "bg-purple-500","bg-amber-500","bg-pink-500","bg-indigo-500","bg-teal-500",
];

// Paleta de colores para roles (por índice de ROL-XXX)
const ROL_PALETTE = [
  "bg-red-100 text-red-800",
  "bg-gray-100 text-gray-700",
  "bg-blue-100 text-blue-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-teal-100 text-teal-800",
];

function rolColor(rolId: string) {
  const idx = parseInt(rolId.replace("ROL-",""), 10) - 1;
  return ROL_PALETTE[idx >= 0 ? idx % ROL_PALETTE.length : 0];
}

const SPECIAL_ROLES = ["ROL-001", "ROL-002", "ROL-003"];

function rolLabel(u: Usuario, roles: Rol[], esEmpleado: boolean): string {
  const rol = roles.find(r => r.id === u.rolId);
  const nombre = rol?.nombre ?? u.rolId;
  if (esEmpleado) return nombre;
  if (!SPECIAL_ROLES.includes(u.rolId)) return `Cliente/${nombre}`;
  return nombre;
}

export function GestionUsuariosScreen({
  userRole,
  roles,
  usuarios,
  setUsuarios,
  empleados,
  setEmpleados,
  clientes,
}: {
  userRole: string;
  roles: Rol[];
  usuarios: Usuario[];
  setUsuarios: React.Dispatch<React.SetStateAction<Usuario[]>>;
  empleados: Empleado[];
  setEmpleados: React.Dispatch<React.SetStateAction<Empleado[]>>;
  clientes: Cliente[];
}) {
  const [search,     setSearch]    = useState("");
  const [filterRol,  setFiltroR]   = useState("todos");
  const [filterEst,  setFiltroE]   = useState("todos");
  const [page,       setPage]      = useState(1);
  const [detail,     setDetail]    = useState<Usuario | null>(null);
  const [editItem,   setEditItem]  = useState<Usuario | null>(null);
  const [editPrevCorreo, setEditPrevCorreo] = useState<string | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [deleteId,   setDeleteId]  = useState<string | null>(null);

  // Formulario de alta (modal "Crear usuario"). Se guarda con un prefijo `new`
  // para no chocar con el `editItem`, que lleva el mismo tipo de datos.
  const [showCreate,   setShowCreate]   = useState(false);
  const [newNombre,    setNewNombre]    = useState("");
  const [newCorreo,    setNewCorreo]    = useState("");
  const [newTelefono,  setNewTelefono]  = useState("");
  const [newTipoDoc,   setNewTipoDoc]   = useState("CC");
  const [newDocumento, setNewDocumento] = useState("");
  const [newRolId,     setNewRolId]     = useState("");
  const [newActivo,    setNewActivo]    = useState(true);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  const rolInfo = (rolId: string): Rol | null =>
    roles.find(r => r.id === rolId) ?? null;

  const esEmpleado = (u: Usuario) =>
    empleados.some(e => e.correo.trim().toLowerCase() === u.correo.trim().toLowerCase());

  // Métricas
  const total = usuarios.length;
  const nCli  = usuarios.filter(u => u.rolId === "ROL-002").length;
  const nAdm  = usuarios.filter(u => u.rolId === "ROL-001").length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return usuarios.filter(u => {
      const rol = rolInfo(u.rolId);
      const rolNombre = rol?.nombre ?? u.rolId;
      const matchQ = !q || u.nombre.toLowerCase().includes(q) || u.correo.toLowerCase().includes(q) || u.numeroDocumento.toLowerCase().includes(q) || `${u.tipoDocumento} ${u.numeroDocumento}`.toLowerCase().includes(q) || rolNombre.toLowerCase().includes(q);
      const matchR = filterRol === "todos" || u.rolId === filterRol;
      const matchE = filterEst === "todos" || (filterEst === "activo" ? u.activo : !u.activo);
      return matchQ && matchR && matchE;
    });
  }, [usuarios, search, filterRol, filterEst, roles]);

  // Filas por página adaptadas al alto disponible: la tabla nunca lleva scroll
  // interno, así que el paginador es la única forma de ver más usuarios.
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
  // se reduce (p. ej. al apagar un switch con un filtro de estado activo, o al
  // eliminar un usuario) `page` quedaría fuera de rango, la tabla saldría vacía
  // y la paginación se ocultaría, dejando al usuario sin forma de volver.
  const pageActual = Math.min(page, totalPages);
  const paged = filtered.slice((pageActual - 1) * filasPorPagina, pageActual * filasPorPagina);

  const updateUsuario = (id: string, patch: Partial<Usuario>) => {
    setUsuarios(p => p.map(u => u.id === id ? { ...u, ...patch } : u));
    setDetail(prev => prev && prev.id === id ? { ...prev, ...patch } : prev);
  };

  // Refleja en el registro Empleado vinculado (por correo) los cambios hechos desde "Usuarios".
  const updateEmpleadoLinked = (
    buscarCorreo: string,
    patch: Partial<Pick<Empleado, "nombre" | "correo" | "telefono" | "tipoDocumento" | "numeroDocumento" | "rolId" | "activo">>,
  ) => {
    const key = buscarCorreo.trim().toLowerCase();
    setEmpleados(p => p.map(e => {
      if (e.correo.trim().toLowerCase() !== key) return e;
      const nombre = patch.nombre ?? e.nombre;
      const iniciales = nombre.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
      return { ...e, ...patch, nombre, iniciales };
    }));
  };

  const cambiarEstado = () => {
    if (!detail) return;
    const nuevoEstado = !detail.activo;
    updateUsuario(detail.id, { activo: nuevoEstado });
    updateEmpleadoLinked(detail.correo, { activo: nuevoEstado });
    toast.success(`Usuario ${nuevoEstado ? "activado" : "desactivado"} correctamente`);
  };

  const handleEdit = () => {
    if (!editItem) return;
    const errs: Record<string, string> = {};
    if (!editItem.nombre.trim()) errs.nombre = "El nombre es obligatorio";
    if (!editItem.correo.trim()) errs.correo = "El correo es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editItem.correo.trim())) errs.correo = "Formato de correo no válido";
    if (!editItem.tipoDocumento.trim()) errs.tipoDocumento = "El tipo de documento es obligatorio";
    if (!editItem.numeroDocumento.trim()) errs.numeroDocumento = "El número de documento es obligatorio";
    else if (editItem.tipoDocumento !== "PP" && !/^\d+$/.test(editItem.numeroDocumento.trim()))
      errs.numeroDocumento = "El número de documento solo debe contener números";
    if (editItem.telefono.trim() && !/^[\d\s+()\-]+$/.test(editItem.telefono.trim()))
      errs.telefono = "El teléfono solo debe contener números";
    if (editItem.nombre.trim() && editItem.correo.trim() && editItem.numeroDocumento.trim()) {
      const em = editItem.correo.trim().toLowerCase();
      const dm = editItem.numeroDocumento.trim();
      const clave = `${editItem.tipoDocumento}||${dm}`.toLowerCase();
      const ancla = editPrevCorreo?.trim().toLowerCase();
      const otro = (correo: string) => correo.trim().toLowerCase() !== ancla;
      const correoDup =
        usuarios.some(u => u.id !== editItem.id && otro(u.correo) && u.correo.trim().toLowerCase() === em) ||
        empleados.some(e => otro(e.correo) && e.correo.trim().toLowerCase() === em) ||
        clientes.some(c => otro(c.correo) && c.correo.trim().toLowerCase() === em);
      const docDup =
        usuarios.some(u => u.id !== editItem.id && otro(u.correo) && `${u.tipoDocumento}||${u.numeroDocumento}`.toLowerCase() === clave) ||
        empleados.some(e => otro(e.correo) && `${e.tipoDocumento}||${e.numeroDocumento}`.toLowerCase() === clave) ||
        clientes.some(c => otro(c.correo) && `${c.tipoDocumento}||${c.numeroDocumento}`.toLowerCase() === clave);
      if (correoDup) errs.correo = "Este correo ya está registrado";
      if (docDup) errs.numeroDocumento = "Este documento ya está registrado";
    }
    if (Object.keys(errs).length) { setEditErrors(errs); return; }
    setUsuarios(p => p.map(u => u.id === editItem.id ? editItem : u));
    updateEmpleadoLinked(editPrevCorreo ?? editItem.correo, {
      nombre: editItem.nombre,
      correo: editItem.correo,
      telefono: editItem.telefono,
      tipoDocumento: editItem.tipoDocumento,
      numeroDocumento: editItem.numeroDocumento,
      rolId: editItem.rolId,
      activo: editItem.activo,
    });
    setEditItem(null);
    setEditPrevCorreo(null);
    setEditErrors({});
    toast.success("Usuario actualizado correctamente");
  };

  const handleDelete = (id: string) => {
    const objetivo = usuarios.find(u => u.id === id);
    setUsuarios(p => p.filter(u => u.id !== id));
    if (objetivo) {
      const key = objetivo.correo.trim().toLowerCase();
      setEmpleados(p => p.filter(e => e.correo.trim().toLowerCase() !== key));
    }
    setDeleteId(null);
    toast.success("Usuario eliminado correctamente");
  };

  const resetCreate = () => {
    setNewNombre(""); setNewCorreo(""); setNewTelefono(""); setNewTipoDoc("CC");
    setNewDocumento(""); setNewRolId(""); setNewActivo(true); setCreateErrors({});
  };

  // Alta de usuario. Mismo criterio que la validación de "Crear cliente": los
  // duplicados de correo y de documento se buscan en las TRES colecciones
  // (usuarios, empleados y clientes) porque un mismo correo o cédula no puede
  // representar a dos personas distintas dentro del sistema.
  const handleCreate = () => {
    const errs: Record<string, string> = {};

    if (!newNombre.trim()) errs.nombre = "El nombre es obligatorio";

    if (!newCorreo.trim()) {
      errs.correo = "El correo es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCorreo.trim())) {
      errs.correo = "Formato de correo no válido";
    } else {
      const em = newCorreo.trim().toLowerCase();
      const dupCorreo =
        usuarios.some(u => u.correo.trim().toLowerCase() === em) ||
        empleados.some(e => e.correo.trim().toLowerCase() === em) ||
        clientes.some(c => c.correo.trim().toLowerCase() === em);
      if (dupCorreo) errs.correo = "Este correo ya está registrado";
    }

    // Solo dígitos, 7 a 15. El mismo criterio que valida "Mi Perfil". Los
    // espacios, guiones y puntos se van quitando mientras se escribe.
    if (!newTelefono.trim()) {
      errs.telefono = "El teléfono es obligatorio";
    } else if (!/^\d{7,15}$/.test(newTelefono)) {
      errs.telefono = "El teléfono debe tener entre 7 y 15 dígitos";
    }

    // Un usuario no puede quedar sin rol: sin él no tendría permisos y la
    // etiqueta de la tabla saldría con el id crudo.
    const rolElegido = roles.find(r => r.id === newRolId);
    if (!newRolId) {
      errs.rolId = "Selecciona un rol";
    } else if (!rolElegido) {
      errs.rolId = "El rol seleccionado no existe";
    } else if (!rolElegido.activo) {
      errs.rolId = "El rol seleccionado está inactivo";
    }

    if (!newTipoDoc.trim()) {
      errs.tipoDocumento = "Selecciona el tipo de documento";
    }
    const dm = newDocumento.trim();
    if (!dm) {
      errs.numeroDocumento = "El número de documento es obligatorio";
    } else if (newTipoDoc !== "PP" && !/^\d+$/.test(dm)) {
      errs.numeroDocumento = "El número de documento solo debe contener números";
    } else {
      const clave = `${newTipoDoc}||${dm}`.toLowerCase();
      const dupDoc =
        usuarios.some(u => `${u.tipoDocumento}||${u.numeroDocumento}`.toLowerCase() === clave) ||
        empleados.some(e => `${e.tipoDocumento}||${e.numeroDocumento}`.toLowerCase() === clave) ||
        clientes.some(c => `${c.tipoDocumento}||${c.numeroDocumento}`.toLowerCase() === clave);
      if (dupDoc) errs.numeroDocumento = "Este documento ya está registrado";
    }

    if (Object.keys(errs).length) { setCreateErrors(errs); return; }

    // El id sigue la numeración más alta existente y no el largo del array: si
    // se borra un usuario intermedio, `length + 1` reutilizaría su id.
    const maxNum = usuarios.reduce((max, u) => {
      const n = parseInt(u.id.replace("USR-", ""), 10) || 0;
      return Math.max(max, n);
    }, 0);
    const newId = `USR-${String(maxNum + 1).padStart(3, "0")}`;
    const iniciales = newNombre.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    const avatarColor = AVATAR_COLORS[usuarios.length % AVATAR_COLORS.length];

    setUsuarios(prev => [
      {
        id: newId,
        nombre: newNombre.trim(),
        iniciales,
        avatarColor,
        correo: newCorreo.trim(),
        telefono: newTelefono,
        tipoDocumento: newTipoDoc,
        numeroDocumento: dm,
        rolId: newRolId,
        activo: newActivo,
      },
      ...prev,
    ]);
    setShowCreate(false);
    resetCreate();
    toast.success(`Usuario ${newNombre.trim()} creado correctamente`);
  };

  const iCls = "px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer";

  if (userRole !== "Administrador") {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: SERIF }}>Acceso restringido</h2>
        <p className="text-muted-foreground">Solo el Administrador puede acceder a Gestión Usuarios.</p>
      </div>
    );
  }

  return (
    <div className="px-6 pt-5 pb-4 max-w-6xl mx-auto h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Usuarios</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Todos los usuarios registrados en el sistema</p>
        </div>
        {/* Sin control de permiso: la pantalla ya está bloqueada para quien no
            sea Administrador más abajo, así que un chequeo extra sería código
            muerto. */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { resetCreate(); setShowCreate(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <UserPlus className="w-4 h-4" /> Crear usuario
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 shrink-0">
        {[
          { label: "Total usuarios",  value: total, cls: "text-foreground", bg: "bg-card"      },
          { label: "Clientes",        value: nCli,  cls: "text-gray-600",   bg: "bg-gray-50"   },
          { label: "Administradores", value: nAdm,  cls: "text-primary",    bg: "bg-primary/5" },
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
            placeholder="Buscar por nombre, correo, rol o documento..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={filterRol} onChange={e => { setFiltroR(e.target.value); setPage(1); }} className={iCls}>
          <option value="todos">Todos los roles</option>
          {roles.filter(r => r.activo).map(r => (
            <option key={r.id} value={r.id}>{r.nombre}</option>
          ))}
        </select>
        <select value={filterEst} onChange={e => { setFiltroE(e.target.value); setPage(1); }} className={iCls}>
          <option value="todos">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>

      {/* Tabla — la tarjeta recorta las esquinas redondeadas y nunca hace scroll:
          el número de filas por página se calcula arriba para que siempre quepan
          enteras y la navegación sea solo por el paginador. */}
      <div ref={cardRef} className="bg-card border border-border rounded-2xl overflow-hidden mb-2 flex-1 min-h-0">
        <table className="w-full">
          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
            <tr>
              {["Usuario","Correo","Rol actual","Estado","Acciones"].map(h => (
                <th key={h} className="px-4 py-1.5 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-14 text-center text-muted-foreground">
                  <p className="text-4xl mb-3">👤</p><p>No se encontraron usuarios</p>
                </td></tr>
              ) : paged.map(u => {
                const rol = rolInfo(u.rolId);
                const rolInactivo = rol && !rol.activo;
                return (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full ${u.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {u.iniciales}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{u.nombre}</p>
                          <p className="text-xs font-mono text-muted-foreground">{fmtDoc(u.tipoDocumento, u.numeroDocumento)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-1.5 text-sm text-muted-foreground">{u.correo}</td>
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-1.5">
                       <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${rolColor(u.rolId)} ${rolInactivo ? "opacity-50" : ""}`}>
                         {rolLabel(u, roles, esEmpleado(u))}
                       </span>
                        {rolInactivo && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Rol inactivo" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-1.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.activo ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>
                        {u.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setDetail(u)} title="Ver detalle"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors cursor-pointer">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditItem({ ...u }); setEditPrevCorreo(u.correo); setEditErrors({}); }} title="Editar"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(u.id)} title="Eliminar"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
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
              <ChevronLeft className="w-4 h-4"/>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i+1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-sm font-semibold cursor-pointer ${n === pageActual ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={pageActual === totalPages}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer">
              <ChevronRight className="w-4 h-4"/>
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Ver detalle ── */}
      <AnimatePresence>
        {detail && (() => {
          const rol = rolInfo(detail.rolId);
          const rolInactivo = rol && !rol.activo;
          return (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4">
              <motion.div initial={{scale:.95,opacity:0}} animate={{scale:1,opacity:1}}
                exit={{scale:.95,opacity:0}} transition={{duration:.15}}
                className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4">

                <div className="flex items-start justify-between px-5 py-4 border-b border-border">
                  <span className="text-base font-bold text-foreground" style={{fontFamily:SERIF}}>Detalle Usuario</span>
                  <button onClick={() => setDetail(null)}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                    <X className="w-4 h-4"/>
                  </button>
                </div>

                <div className="px-5 py-5 space-y-5">
                  {/* Avatar */}
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className={`w-20 h-20 rounded-full ${detail.avatarColor} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
                      {detail.iniciales}
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground" style={{fontFamily:SERIF}}>{detail.nombre}</p>
                      <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                       <span className={`px-3 py-1 rounded-full text-xs font-semibold ${rolColor(detail.rolId)} ${rolInactivo ? "opacity-60" : ""}`}>
                         {rolLabel(detail, roles, esEmpleado(detail))}
                       </span>
                        {rolInactivo && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                            <AlertTriangle className="w-3 h-3" /> Rol inactivo
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${detail.activo ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>
                          {detail.activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-muted/50 border-b border-border">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Información del usuario</p>
                    </div>
                    <div className="divide-y divide-border">
                      {[
                        { l: "Correo",    v: detail.correo },
                        { l: "Teléfono",  v: detail.telefono },
                        { l: "Tipo de documento",   v: detail.tipoDocumento },
                        { l: "Número de documento", v: detail.numeroDocumento },
                      ].map(({ l, v }) => (
                        <div key={l} className="flex items-center justify-between px-4 py-2.5 gap-4">
                          <span className="text-sm text-muted-foreground font-medium shrink-0">{l}</span>
                          <span className="text-sm font-semibold text-foreground text-right break-all">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Permisos del rol */}
                  {rol && (
                    <div className="border border-border rounded-xl overflow-hidden">
                      <div className="px-4 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Permisos del rol
                        </p>
                        <span className="text-xs text-primary font-semibold">
                          {countAccesos(rol.accesos)} sub-opciones
                        </span>
                      </div>
                      <div className="px-4 py-3 max-h-48 overflow-y-auto space-y-3">
                        {countAccesos(rol.accesos) === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Sin accesos configurados</p>
                        ) : MENU_TREE.map(({ modulo, subs }) => {
                          const activeSubs = subs.filter(s => {
                            const k = KEY(modulo, s);
                            return k in rol.accesos && rol.accesos[k].length > 0;
                          });
                          if (!activeSubs.length) return null;
                          return (
                            <div key={modulo}>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{modulo}</p>
                              <div className="space-y-1">
                                {activeSubs.map(sub => {
                                  const k = KEY(modulo, sub);
                                  const perms = rol.accesos[k] ?? [];
                                  return (
                                    <div key={sub} className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-muted/30 rounded-lg">
                                      <span className="text-xs font-medium text-foreground">{sub}</span>
                                      <div className="flex gap-1 flex-wrap justify-end">
                                        {ACCIONES.filter(a => perms.includes(a)).map(a => (
                                          <span key={a} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${accionColors[a]}`}>{a}</span>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Cambiar estado */}
                  <button onClick={cambiarEstado}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors cursor-pointer active:scale-95 ${
                      detail.activo
                        ? "border-gray-200 text-gray-600 hover:bg-gray-50"
                        : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    }`}>
                    <RefreshCw className="w-4 h-4" />
                    {detail.activo ? "Desactivar usuario" : "Activar usuario"}
                  </button>
                </div>

                <div className="px-5 py-4 border-t border-border">
                  <button onClick={() => setDetail(null)}
                    className="w-full py-2.5 bg-muted rounded-xl text-sm font-semibold text-foreground hover:bg-border cursor-pointer transition-colors">
                    Cerrar
                  </button>
                </div>
              </motion.div>
              </div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ── Modal: Editar usuario ── */}
     {/* ── Modal: Editar usuario ── */}
      <AnimatePresence>
        {editItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
            <motion.div initial={{scale:.95,opacity:0}} animate={{scale:1,opacity:1}}
              exit={{scale:.95,opacity:0}} transition={{duration:.15}}
              className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4">

              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground" style={{fontFamily:SERIF}}>Editar Usuario</h3>
                <button onClick={() => setEditItem(null)}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                  <X className="w-4 h-4"/>
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Avatar preview */}
                <div className="flex items-center gap-3 pb-2">
                  <div className={`w-12 h-12 rounded-full ${editItem.avatarColor} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                    {editItem.iniciales}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{editItem.nombre}</p>
                    <p className="text-xs font-mono text-muted-foreground">{fmtDoc(editItem.tipoDocumento, editItem.numeroDocumento)}</p>
                  </div>
                </div>

                {[
                  { label: "Nombre completo", field: "nombre"    as const, type: "text"  },
                  { label: "Correo",          field: "correo"    as const, type: "email" },
                  { label: "Teléfono",        field: "telefono"  as const, type: "tel"   },
                ].map(({ label, field, type }) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
                    <input
                      type={type}
                      value={editItem[field]}
                      onChange={e => { setEditItem(x => x && ({ ...x, [field]: e.target.value })); if (editErrors[field]) setEditErrors(p => ({ ...p, [field]: undefined })); }}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${editErrors[field] ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                    />
                    {editErrors[field] && <p className="text-xs text-red-500 mt-1">{editErrors[field]}</p>}
                  </div>
                ))}

                <div className="flex gap-3">
                  <div className="w-24 shrink-0">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Tipo de documento <span className="text-primary">*</span></label>
                    <select
                      value={editItem.tipoDocumento}
                      onChange={e => { setEditItem(x => x && ({ ...x, tipoDocumento: e.target.value })); if (editErrors.tipoDocumento) setEditErrors(p => ({ ...p, tipoDocumento: undefined })); }}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer ${editErrors.tipoDocumento ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                    >
                      {DOC_TIPOS.map(t => <option key={t.code} value={t.code}>{t.code}</option>)}
                    </select>
                    {editErrors.tipoDocumento && <p className="text-xs text-red-500 mt-1">{editErrors.tipoDocumento}</p>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Número de documento <span className="text-primary">*</span></label>
                    <input
                      type="text"
                      inputMode={editItem.tipoDocumento === "PP" ? "text" : "numeric"}
                      value={editItem.numeroDocumento}
                      onChange={e => { setEditItem(x => x && ({ ...x, numeroDocumento: e.target.value.replace(/[\s.]/g, "") })); if (editErrors.numeroDocumento) setEditErrors(p => ({ ...p, numeroDocumento: undefined })); }}
                      placeholder={editItem.tipoDocumento === "PP" ? "AB123456" : "12345678"}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${editErrors.numeroDocumento ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                    />
                    {editErrors.numeroDocumento && <p className="text-xs text-red-500 mt-1">{editErrors.numeroDocumento}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Rol actual</label>
                  <select
                    disabled={editItem ? esEmpleado(editItem) : false}
                    value={editItem.rolId}
                    onChange={e => setEditItem(x => x && ({ ...x, rolId: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}{!r.activo ? " (Inactivo)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                  <select
                    value={editItem.activo ? "activo" : "inactivo"}
                    onChange={e => setEditItem(x => x && ({ ...x, activo: e.target.value === "activo" }))}
                    className="w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 px-5 py-4 border-t border-border">
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
      {/* ── Modal: Confirmar eliminación ── */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{scale:.95,opacity:0}} animate={{scale:1,opacity:1}}
              exit={{scale:.95,opacity:0}} transition={{duration:.15}}
              className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border p-6">
              <h3 className="text-lg font-bold text-foreground mb-2" style={{fontFamily:SERIF}}>Eliminar usuario</h3>
              <p className="text-muted-foreground text-sm mb-6">
                ¿Seguro que deseas eliminar a{" "}
                <strong className="text-foreground">
                  {usuarios.find(u => u.id === deleteId)?.nombre}
                </strong>? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                  Cancelar
                </button>
                <button onClick={() => handleDelete(deleteId)}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                  Sí, eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Crear usuario ── */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
                exit={{ scale:.95, opacity:0 }} transition={{ duration:.15 }}
                className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Crear Usuario</h3>
                  <button onClick={() => { setShowCreate(false); resetCreate(); }}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {/* Nombre */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Nombre completo <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      value={newNombre}
                      onChange={e => { setNewNombre(e.target.value); if (createErrors.nombre) setCreateErrors(p => ({ ...p, nombre: undefined })); }}
                      placeholder="Ej: Laura Martínez"
                      autoFocus
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${createErrors.nombre ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                    />
                    {createErrors.nombre && <p className="text-xs text-red-500 mt-1">{createErrors.nombre}</p>}
                  </div>

                  {/* Correo */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Correo electrónico <span className="text-primary">*</span>
                    </label>
                    <input
                      type="email"
                      value={newCorreo}
                      onChange={e => { setNewCorreo(e.target.value); if (createErrors.correo) setCreateErrors(p => ({ ...p, correo: undefined })); }}
                      placeholder="correo@ejemplo.com"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${createErrors.correo ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                    />
                    {createErrors.correo && <p className="text-xs text-red-500 mt-1">{createErrors.correo}</p>}
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Número de teléfono <span className="text-primary">*</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={newTelefono}
                      onChange={e => { setNewTelefono(e.target.value.replace(/[\s.-]/g, "")); if (createErrors.telefono) setCreateErrors(p => ({ ...p, telefono: undefined })); }}
                      placeholder="3001234567"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${createErrors.telefono ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                    />
                    {createErrors.telefono && <p className="text-xs text-red-500 mt-1">{createErrors.telefono}</p>}
                  </div>

                  {/* Documento */}
                  <div className="flex gap-3">
                    <div className="w-28 shrink-0">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        Tipo de documento <span className="text-primary">*</span>
                      </label>
                      <select
                        value={newTipoDoc}
                        onChange={e => { setNewTipoDoc(e.target.value); if (createErrors.tipoDocumento) setCreateErrors(p => ({ ...p, tipoDocumento: undefined })); }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer ${createErrors.tipoDocumento ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                      >
                        {DOC_TIPOS.map(t => <option key={t.code} value={t.code}>{t.code}</option>)}
                      </select>
                      {createErrors.tipoDocumento && <p className="text-xs text-red-500 mt-1">{createErrors.tipoDocumento}</p>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        Número de documento <span className="text-primary">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode={newTipoDoc === "PP" ? "text" : "numeric"}
                        value={newDocumento}
                        onChange={e => { setNewDocumento(e.target.value.replace(/[\s.]/g, "")); if (createErrors.numeroDocumento) setCreateErrors(p => ({ ...p, numeroDocumento: undefined })); }}
                        placeholder={newTipoDoc === "PP" ? "AB123456" : "12345678"}
                        className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${createErrors.numeroDocumento ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                      />
                      {createErrors.numeroDocumento && <p className="text-xs text-red-500 mt-1">{createErrors.numeroDocumento}</p>}
                    </div>
                  </div>

                  {/* Rol */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Rol <span className="text-primary">*</span>
                    </label>
                    <select
                      value={newRolId}
                      onChange={e => { setNewRolId(e.target.value); if (createErrors.rolId) setCreateErrors(p => ({ ...p, rolId: undefined })); }}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer ${createErrors.rolId ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                    >
                      <option value="">Selecciona un rol…</option>
                      {roles.filter(r => r.activo).map(r => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                      ))}
                    </select>
                    {createErrors.rolId && <p className="text-xs text-red-500 mt-1">{createErrors.rolId}</p>}
                  </div>

                  {/* Estado */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                    <select
                      value={newActivo ? "activo" : "inactivo"}
                      onChange={e => setNewActivo(e.target.value === "activo")}
                      className="w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 px-5 py-4 border-t border-border">
                  <button onClick={() => { setShowCreate(false); resetCreate(); }}
                    className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleCreate}
                    className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                    Crear usuario
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
