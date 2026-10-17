import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  EstadoSelect,
  ESTADO_ACTIVO_COLOR,
  ESTADO_INACTIVO_COLOR,
} from "@/shared/components/EstadoSelect";
import { SearchInput } from "@/shared/components/SearchInput";
import { Paginador } from "@/shared/components/Paginador";
import { ActionIcons } from "@/shared/components/ActionIcons";
import { SegmentadoButtons } from "@/shared/components/SegmentadoButtons";
import { DOC_TIPOS, fmtDoc } from "@/features/usuarios/pages/GestionUsuariosScreen";
import { etiquetaTipoDocumento } from "@/shared/utils/tiposDocumento";
import { type Empleado } from "@/features/empleados/pages/GestionEmpleadosScreen";
import { type Usuario } from "@/features/usuarios/pages/GestionUsuariosScreen";
import { type Rol } from "@/features/roles/pages/GestionConfigScreen";
import { filtrarCorreo, filtrarDocumento, filtrarNombre, soloDigitos, validarCorreo, validarDocumento, validarNombre } from "@/shared/components/campo";

const SERIF = "var(--font-titulo)";
const MONO  = "var(--font-texto)";

const AVATAR_COLORS = [
  "bg-red-500","bg-blue-500","bg-emerald-500",
  "bg-purple-500","bg-amber-500","bg-pink-500","bg-indigo-500","bg-teal-500",
];

export interface Cliente {
  id: string;
  nombre: string;
  iniciales: string;
  avatarColor: string;
  correo: string;
  tipoDocumento: string;
  numeroDocumento: string;
  pedidos: number;
  activo: boolean;
}

export const INITIAL_CLIENTES: Cliente[] = [
  { id:"CLI-008", nombre:"Tomás Jiménez",     iniciales:"TJ", avatarColor:"bg-teal-500",    correo:"tomas.j@gmail.com",           tipoDocumento:"CC", numeroDocumento:"88990011", pedidos:4,  activo:true  },
];

export function GestionClientesScreen({ canCreate: _canCreate = true, canEdit = true, canDelete: _canDelete = true, clientes, setClientes, empleados, usuarios, roles = [], sesionCorreo = "" }: {
  canCreate?: boolean; canEdit?: boolean; canDelete?: boolean;
  clientes: Cliente[];
  setClientes: React.Dispatch<React.SetStateAction<Cliente[]>>;
  empleados: Empleado[];
  usuarios: Usuario[];
  /** Roles del sistema: con ellos se dice quién es Administrador. */
  roles?: Rol[];
  /** Correo de la cuenta con la que se abrió la sesión (su propio cliente). */
  sesionCorreo?: string;
}) {
  const [search,       setSearch]     = useState("");
  const [filterEstado, setFiltro]     = useState("todos");
  const [sortBy,       setSortBy]     = useState("nombre");
  const [page,         setPage]       = useState(1);
  const [detailItem,   setDetailItem] = useState<Cliente | null>(null);
  const [editItem,     setEditItem]   = useState<Cliente | null>(null);
  const [showCreate,   setShowCreate] = useState(false);
  const [newNombre,    setNewNombre]  = useState("");
  const [newCorreo,    setNewCorreo]  = useState("");
  const [newTelefono,  setNewTelefono]= useState("");
  const [newTipoDoc,   setNewTipoDoc] = useState("CC");
  const [newDocumento, setNewDocumento] = useState("");
  const [newActivo,    setNewActivo]  = useState(true);
  const [createErrors, setCreateErrors] = useState<{ nombre?: string; correo?: string; tipoDocumento?: string; numeroDocumento?: string }>({});
  const [editErrors,   setEditErrors] = useState<{ nombre?: string; correo?: string }>({});
  const [editPrevCorreo, setEditPrevCorreo] = useState<string | null>(null);
  const [editTipoOriginal, setEditTipoOriginal] = useState("");
  const [editNumOriginal, setEditNumOriginal] = useState("");
  const [editPedidosOriginal, setEditPedidosOriginal] = useState(0);

  const total   = clientes.length;
  const activos = clientes.filter(c => c.activo).length;
  const inact   = clientes.filter(c => !c.activo).length;

  const filtered = useMemo(() => {
    let r = clientes.filter(c => {
      const q = search.toLowerCase();
      const matchQ = !q ||
        c.nombre.toLowerCase().includes(q) ||
        c.correo.toLowerCase().includes(q) ||
        c.numeroDocumento.toLowerCase().includes(q) ||
        `${c.tipoDocumento} ${c.numeroDocumento}`.toLowerCase().includes(q);
      const matchE = filterEstado === "todos" || (filterEstado === "activo" ? c.activo : !c.activo);
      return matchQ && matchE;
    });
    // El orden nunca depende de `activo`: con el filtro en "Todos los estados"
    // los activos y los inactivos quedan intercalados según el criterio elegido.
    // El desempate alfabético mantiene el orden determinista si dos clientes
    // tienen los mismos pedidos.
    if (sortBy === "pedidos") r = [...r].sort((a,b) => b.pedidos - a.pedidos || a.nombre.localeCompare(b.nombre));
    else                      r = [...r].sort((a,b) => a.nombre.localeCompare(b.nombre));
    return r;
  }, [clientes, search, filterEstado, sortBy]);

  // 5 clientes por página (unificado con el resto de listados): la tabla
  // nunca lleva scroll interno, la navegación es solo por el paginador.
  const PER_PAGE = 5;

  // ── P8 — Reconciliación Gloria ↔ Clientes ──────────────────────────────
  // Gloria (USR-001, super administradora) aparece en el módulo de Usuarios
  // pero NO figuraba en el listado de clientes, lo que rompía la
  // consistencia entre módulos. Decisión: al montar esta pantalla, si
  // `clientes` no la incluye, se agrega aquí con su correo y su documento
  // CC 12345678 (los mismos que tiene como usuario), para que el módulo de
  // Clientes la muestre y ambos módulos cuenten con la misma persona. Se usa
  // el update funcional para no pisar altas hechas en el mismo render, y la
  // dependencia vacía hace que solo corra al montar (el chequeo de
  // existencia vive dentro del update).
  useEffect(() => {
    setClientes(prev => {
      const correo = "gloria@lasirena.com";
      if (prev.some(c => c.correo.trim().toLowerCase() === correo)) return prev;
      const maxNum = prev.reduce((max, c) => {
        const n = parseInt(c.id.replace("CLI-", "")) || 0;
        return Math.max(max, n);
      }, 0);
      return [
        { id: `CLI-${String(maxNum + 1).padStart(3, "0")}`, nombre: "Gloria Inés Vargas", iniciales: "GV", avatarColor: "bg-red-500", correo, tipoDocumento: "CC", numeroDocumento: "12345678", pedidos: 0, activo: true },
        ...prev,
      ];
    });
  }, [setClientes]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  // La página efectiva nunca puede pasar de totalPages: si el conjunto filtrado
  // se reduce (p. ej. al apagar un switch con un filtro de estado activo) `page`
  // quedaría fuera de rango, la tabla saldría vacía y la paginación se ocultaría,
  // dejando al usuario sin forma de volver.
  const pageActual = Math.min(page, totalPages);
  const paged      = filtered.slice((pageActual-1)*PER_PAGE, pageActual*PER_PAGE);

  // ── Bloqueos del estado de un cliente ─────────────────────────────────
  // Dos cuentas no se pueden apagar: la del administrador (si no, nadie
  // entraría al panel) y la propia (el usuario se dejaría fuera de su sesión).
  const rolDeCorreo = (correo: string): Rol | null => {
    const em = correo.trim().toLowerCase();
    // Un correo vacío nunca coincide con otro vacío: si no, todos los clientes
    // sin correo (p. ej. los creados desde una venta) tomarían el rol del
    // primer usuario también sin correo.
    if (!em) return null;
    const u = usuarios.find((x) => x.correo.trim().toLowerCase() === em);
    if (!u) return null;
    return roles.find((r) => r.id === u.rolId) ?? null;
  };
  /** ¿El cliente es una cuenta con rol "Administrador"? Se compara por el
      NOMBRE del rol y no por su id, porque el módulo de Roles permite
      renombrar los roles: si mañana "Administrador" se llama distinto, el
      id fijo ya no significaría nada. */
  const esAdministrador = (c: Cliente) => rolDeCorreo(c.correo)?.nombre === "Administrador";
  /** ¿Es la cuenta con la que se abrió la sesión? */
  const esCuentaPropia = (c: Cliente) =>
    !!sesionCorreo &&
    c.correo.trim().toLowerCase() === sesionCorreo.trim().toLowerCase();
  /** Mensaje de error si el estado de este cliente no se puede tocar. */
  const bloqueoEstado = (c: Cliente): string | null =>
    esAdministrador(c)
      ? "No es posible cambiar el estado del administrador"
      : esCuentaPropia(c)
        ? "No es posible cambiar el estado de tu propia cuenta"
        : null;
  /** Tooltip del control de la lista: el del administrador explica la regla. */
  const tooltipEstado = (c: Cliente) =>
    esAdministrador(c) ? "El administrador no puede ser inactivado" : bloqueoEstado(c);

  const toggleEstado = (id: string) => {
    const cliente = clientes.find(c => c.id === id);
    const motivo = cliente ? bloqueoEstado(cliente) : null;
    if (motivo) { toast.error(motivo); return; }
    setClientes(p => p.map(c => c.id === id ? { ...c, activo: !c.activo } : c));
    toast.success("Estado del cliente actualizado");
  };

  const handleEdit = () => {
    if (!editItem) return;
    // Si el formulario tocó el estado, se comprueba aquí la misma regla que
    // en la lista: el administrador y la cuenta propia no se inactivan.
    const original = clientes.find(c => c.id === editItem.id);
    if (original && original.activo !== editItem.activo) {
      const motivo = bloqueoEstado(original);
      if (motivo) { toast.error(motivo); return; }
    }
    const errs: { nombre?: string; correo?: string } = {};
    if (!editItem.nombre.trim()) errs.nombre = "El nombre es obligatorio";
    else { const v = validarNombre(editItem.nombre); if (v) errs.nombre = v; }
    if (!editItem.correo.trim()) errs.correo = "El correo es obligatorio";
    else {
      const v = validarCorreo(editItem.correo);
      if (v) errs.correo = v;
      if (!errs.correo) {
        const em = editItem.correo.trim().toLowerCase();
        const otro = (correo: string) => correo.trim().toLowerCase() !== (editPrevCorreo ?? "").trim().toLowerCase();
        // Correo vacío nunca coincide con otro vacío (aunque `em` aquí ya es
        // no vacío por la validación de arriba).
        const duplicado =
          clientes.some(c => c.id !== editItem.id && otro(c.correo) && c.correo.trim() !== "" && c.correo.trim().toLowerCase() === em) ||
          empleados.some(e => otro(e.correo) && e.correo.trim() !== "" && e.correo.trim().toLowerCase() === em) ||
          usuarios.some(u => otro(u.correo) && u.correo.trim() !== "" && u.correo.trim().toLowerCase() === em);
        if (duplicado) errs.correo = "Este correo ya está registrado";
      }
    }
    if (Object.keys(errs).length) { setEditErrors(errs); return; }
    const nuevasIniciales = editItem.nombre.trim().split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
    setClientes(p => p.map(c => c.id === editItem.id ? {
      ...editItem,
      iniciales: nuevasIniciales,
      tipoDocumento: editTipoOriginal,
      numeroDocumento: editNumOriginal,
      pedidos: editPedidosOriginal,
    } : c));
    setEditItem(null);
    setEditPrevCorreo(null);
    setEditErrors({});
    toast.success("Cliente actualizado correctamente");
  };

  const abrirEdicion = (c: Cliente) => {
    setEditItem({ ...c });
    setEditPrevCorreo(c.correo);
    setEditTipoOriginal(c.tipoDocumento);
    setEditNumOriginal(c.numeroDocumento);
    setEditPedidosOriginal(c.pedidos);
    setEditErrors({});
  };

  const resetCreate = () => {
    setNewNombre(""); setNewCorreo(""); setNewTelefono(""); setNewTipoDoc("CC"); setNewDocumento("");
    setNewActivo(true); setCreateErrors({});
  };

  // ── P1 — Validación en tiempo real del alta de cliente ─────────────────
  // Mientras se escribe ya se comprueba el formato (con los helpers de
  // `campo.tsx`) Y que el dato no pertenezca ya a otra persona: el duplicado
  // se busca en las tres colecciones (clientes, empleados y usuarios), igual
  // que en el envío, para que el botón quede bloqueado en cuanto el usuario
  // pega un documento o correo ya registrado. Se usan las MISMAS funciones en
  // onChange y en handleCreate, así no puede existir un duplicado que el
  // envío detecte pero el tiempo real no.
  const correoDuplicado = (correo: string): boolean => {
    const em = correo.trim().toLowerCase();
    // Un correo vacío nunca coincide con otro correo vacío.
    if (!em) return false;
    return (
      clientes.some(c => c.correo.trim() !== "" && c.correo.trim().toLowerCase() === em) ||
      empleados.some(e => e.correo.trim() !== "" && e.correo.trim().toLowerCase() === em) ||
      usuarios.some(u => u.correo.trim() !== "" && u.correo.trim().toLowerCase() === em)
    );
  };
  const documentoDuplicado = (tipo: string, numero: string): boolean => {
    const clave = `${tipo}||${numero}`.toLowerCase();
    return (
      clientes.some(c => `${c.tipoDocumento}||${c.numeroDocumento}`.toLowerCase() === clave) ||
      empleados.some(e => `${e.tipoDocumento}||${e.numeroDocumento}`.toLowerCase() === clave) ||
      usuarios.some(u => `${u.tipoDocumento}||${u.numeroDocumento}`.toLowerCase() === clave)
    );
  };
  // Devuelve el error del campo, o undefined si está válido (o vacío: el
  // vacío solo se marca en el envío, para no gritar "obligatorio" al abrir
  // el modal).
  const errorCorreoAlta = (correo: string): string | undefined => {
    if (!correo.trim()) return undefined;
    const formato = validarCorreo(correo);
    if (formato) return formato;
    return correoDuplicado(correo) ? "Ya existe un cliente con este correo" : undefined;
  };
  const errorDocumentoAlta = (tipo: string, numero: string): string | undefined => {
    if (!numero.trim()) return undefined;
    const formato = validarDocumento(numero, tipo);
    if (formato) return formato;
    return documentoDuplicado(tipo, numero) ? "Ya existe un cliente con este documento" : undefined;
  };
  // P1: el botón queda bloqueado mientras haya CUALQUIER error en el alta
  // (formato inválido O duplicado de documento/correo).
  const createBloqueado = Object.values(createErrors).some(v => !!v);

  const handleCreate = () => {
    const errs: { nombre?: string; correo?: string; tipoDocumento?: string; numeroDocumento?: string } = {};
    if (!newNombre.trim()) errs.nombre = "El nombre es obligatorio";
    else { const v = validarNombre(newNombre); if (v) errs.nombre = v; }
    if (!newCorreo.trim()) {
      errs.correo = "El correo es obligatorio";
    } else {
      // Reutiliza las mismas funciones del tiempo real: formato + duplicado.
      const v = errorCorreoAlta(newCorreo);
      if (v) errs.correo = v;
    }
    if (!newTipoDoc.trim()) {
      errs.tipoDocumento = "Selecciona el tipo de documento";
    }
    const dm = newDocumento.trim();
    if (!dm) {
      errs.numeroDocumento = "El número de documento es obligatorio";
    } else {
      const v = errorDocumentoAlta(newTipoDoc, dm);
      if (v) errs.numeroDocumento = v;
    }
    if (Object.keys(errs).length) { setCreateErrors(errs); return; }

    const maxNum = clientes.reduce((max, c) => {
      const n = parseInt(c.id.replace("CLI-", "")) || 0;
      return Math.max(max, n);
    }, 0);
    const newId = `CLI-${String(maxNum + 1).padStart(3, "0")}`;
    const iniciales = newNombre.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    const avatarColor = AVATAR_COLORS[(clientes.length) % AVATAR_COLORS.length];

    setClientes(prev => [
      { id: newId, nombre: newNombre.trim(), iniciales, avatarColor, correo: newCorreo.trim(), tipoDocumento: newTipoDoc, numeroDocumento: dm, pedidos: 0, activo: newActivo },
      ...prev,
    ]);
    setShowCreate(false);
    resetCreate();
    toast.success(`Cliente ${newNombre.trim()} creado correctamente`);
  };

  const iCls = "px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer";

  return (
    <div className="px-4 sm:px-6 pt-5 pb-4 h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Clientes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Usuarios registrados con tipo cliente en La Sirena</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {_canCreate && (
            <button
              onClick={() => { resetCreate(); setShowCreate(true); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <UserPlus className="w-4 h-4" /> Crear cliente
            </button>
          )}
        </div>
      </div>



      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5 shrink-0">
        <SearchInput
          value={search}
          onChange={v => { setSearch(v); setPage(1); }}
          placeholder="Buscar por nombre, correo, documento o estado..."
          wrapperClassName="w-full max-w-sm shrink-0"
        />
        <select value={filterEstado} onChange={e => { setFiltro(e.target.value); setPage(1); }} className={iCls}>
          <option value="todos">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
        <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }} className={iCls}>
          <option value="nombre">Ordenar por nombre</option>
          <option value="pedidos">Ordenar por pedidos</option>
        </select>
      </div>

      {/* Tabla — la tarjeta recorta las esquinas redondeadas y nunca hace scroll:
          5 filas por página y navegación solo por el paginador. */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-2 flex-1 min-h-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
            <tr>
              {["Cliente","Correo","Pedidos","Estado","Acciones"].map(h => (
                <th key={h} className="px-4 py-1.5 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-14 text-center text-muted-foreground">
                  <p className="text-4xl mb-3">👥</p><p>No se encontraron clientes</p>
                </td></tr>
              ) : paged.map(c => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-1.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${c.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {c.iniciales}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{c.nombre}</p>
                        <p className="text-xs text-muted-foreground font-mono">{fmtDoc(c.tipoDocumento, c.numeroDocumento)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-1.5 text-sm text-muted-foreground">{c.correo}</td>
                  <td className="px-4 py-1.5 text-sm font-bold text-center text-foreground" style={{ fontFamily: MONO }}>{c.pedidos}</td>
                  <td className="px-4 py-1.5">
                    {/* Pill de estado (diseño de Proveedores): antes era un
                        badge y el switch vivía en Acciones. La del
                        administrador y la de la propia cuenta quedan
                        bloqueadas, con el motivo en el tooltip. */}
                    <span
                      title={tooltipEstado(c) ?? undefined}
                      className="inline-block"
                    >
                      <EstadoSelect
                        value={c.activo ? "activo" : "inactivo"}
                        disabled={!!bloqueoEstado(c)}
                        onChange={nuevoEstado => {
                          if ((nuevoEstado === "activo") === c.activo) return;
                          toggleEstado(c.id);
                        }}
                        options={[
                          { value: "activo", label: "Activo", color: ESTADO_ACTIVO_COLOR },
                          { value: "inactivo", label: "Inactivo", color: ESTADO_INACTIVO_COLOR },
                        ]}
                      />
                    </span>
                  </td>
                  <td className="px-4 py-1.5">
                    <ActionIcons
                      onView={() => setDetailItem(c)}
                      onEdit={canEdit ? () => { abrirEdicion(c); } : undefined}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación (unificada, fuera de la card) */}
      {filtered.length > 0 && (
        <Paginador pagina={pageActual} totalPaginas={totalPages} onCambio={setPage} />
      )}

      {/* Modal: Ver detalle */}
      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
              exit={{ scale:.95, opacity:0 }} transition={{ duration:.15 }}
              className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Detalle Cliente</h3>
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
                    { l: "Tipo de documento",   v: detailItem.tipoDocumento },
                    { l: "Número de documento", v: detailItem.numeroDocumento },
                    { l: "Pedidos totales", v: String(detailItem.pedidos) },
                    { l: "Estado",          v: detailItem.activo ? "Activo" : "Inactivo" },
                  ].map(({ l, v }) => (
                    <div key={l} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-4">
                      <span className="text-sm text-muted-foreground font-medium shrink-0">{l}</span>
                      <span className="text-sm font-semibold text-foreground text-right">{v}</span>
                    </div>
                  ))}
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

      {/* Modal: Crear cliente */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
                exit={{ scale:.95, opacity:0 }} transition={{ duration:.15 }}
                 className="bg-card rounded-2xl w-full max-w-xl shadow-2xl border border-border my-4">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Crear Cliente</h3>
                  <button onClick={() => { setShowCreate(false); resetCreate(); }}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                 <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  {/* Documento — cada campo en su columna del grid, igual que
                      Nombre completo / Correo electrónico. */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1 whitespace-nowrap">
                      Tipo de documento <span className="text-primary">*</span>
                    </label>
                    <select
                      value={newTipoDoc}
                      // P1: al cambiar el tipo se revalida el documento en
                      // tiempo real, porque el formato y el duplicado
                      // dependen del tipo (CC 6-10, CE/PP 6-12).
                      onChange={e => { setNewTipoDoc(e.target.value); setCreateErrors(p => ({ ...p, tipoDocumento: undefined, numeroDocumento: errorDocumentoAlta(e.target.value, newDocumento) })); }}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer ${createErrors.tipoDocumento ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                    >
                      {DOC_TIPOS.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                    </select>
                    {createErrors.tipoDocumento && <p className="text-xs text-red-500 mt-1 leading-tight">{createErrors.tipoDocumento}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Número de documento <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newDocumento}
                      autoComplete="off"
                      // P1 — tiempo real: solo dígitos (soloDigitos) y como
                      // máximo 10 números, cortando el valor con slice(0,10).
                      onChange={e => { const v = soloDigitos(e.target.value).slice(0, 10); setNewDocumento(v); setCreateErrors(p => ({ ...p, numeroDocumento: errorDocumentoAlta(newTipoDoc, v) })); }}
                      placeholder="12345678"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${createErrors.numeroDocumento ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                    />
                    {createErrors.numeroDocumento && <p className="text-xs text-red-500 mt-1 leading-tight">{createErrors.numeroDocumento}</p>}
                  </div>

                  {/* Nombre */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Nombre completo <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      value={newNombre}
                       onChange={e => { const v = filtrarNombre(e.target.value); setNewNombre(v); setCreateErrors(p => ({ ...p, nombre: validarNombre(v) ?? undefined })); }}
                      placeholder="Ej: Laura Martínez"
                      autoFocus
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${createErrors.nombre ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                    />
                    {createErrors.nombre && <p className="text-xs text-red-500 mt-1 leading-tight">{createErrors.nombre}</p>}
                  </div>

                  {/* Correo */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Correo electrónico <span className="text-primary">*</span>
                    </label>
                    <input
                      type="email"
                      value={newCorreo}
                      autoComplete="off"
                      // P1 — tiempo real: filtrarCorreo normaliza mientras se
                      // escribe y errorCorreoAlta valida formato + duplicado
                      // contra clientes, empleados y usuarios.
                      onChange={e => { const v = filtrarCorreo(e.target.value); setNewCorreo(v); setCreateErrors(p => ({ ...p, correo: errorCorreoAlta(v) })); }}
                      placeholder="correo@ejemplo.com"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${createErrors.correo ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                    />
                    {createErrors.correo && <p className="text-xs text-red-500 mt-1 leading-tight">{createErrors.correo}</p>}
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Teléfono <span className="text-muted-foreground font-normal">(opcional)</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={newTelefono}
                      autoComplete="off"
                      onChange={e => setNewTelefono(soloDigitos(e.target.value))}
                      placeholder="3001234567"
                      className="w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  {/* Estado: punto 3.2, 2 opciones → control segmentado */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                    <SegmentadoButtons
                      valor={newActivo ? "activo" : "inactivo"}
                      onChange={valor => setNewActivo(valor === "activo")}
                      opciones={[
                        { valor: "activo", etiqueta: "Activo" },
                        { valor: "inactivo", etiqueta: "Inactivo" },
                      ]}
                    />
                  </div>
                </div>

                <div className="flex gap-3 px-5 py-4 border-t border-border">
                  <button onClick={() => { setShowCreate(false); resetCreate(); }}
                    className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleCreate}
                    // P1: bloqueado mientras haya error de formato o un
                    // documento/correo duplicado — el usuario ve el mensaje
                    // debajo del campo en el momento de escribir.
                    disabled={createBloqueado}
                    title={createBloqueado ? "Corrige los campos marcados en rojo para crear el cliente" : undefined}
                    className={`flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold transition-colors active:scale-95 ${createBloqueado ? "opacity-50 cursor-not-allowed" : "hover:bg-red-700 cursor-pointer"}`}>
                    Crear cliente
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Editar cliente */}
      <AnimatePresence>
        {editItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
            <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
              exit={{ scale:.95, opacity:0 }} transition={{ duration:.15 }}
               className="bg-card rounded-2xl w-full max-w-xl shadow-2xl border border-border my-4">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Editar Cliente</h3>
                <button onClick={() => setEditItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
                 <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                 <div className="sm:col-span-2 flex items-center gap-3 pb-2">
                  <div className={`w-12 h-12 rounded-full ${editItem.avatarColor} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                    {editItem.nombre.trim().split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{editItem.nombre}</p>
                    <p className="text-xs font-mono text-muted-foreground">{fmtDoc(editItem.tipoDocumento, editItem.numeroDocumento)}</p>
                  </div>
                </div>
                 <div className="sm:col-span-2 flex gap-3 items-start">
                  <div className="w-56 shrink-0">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1 whitespace-nowrap">Tipo de documento</label>
                    <input
                      type="text"
                      value={etiquetaTipoDocumento(editItem.tipoDocumento)}
                      disabled
                      className="w-full px-3 py-2.5 bg-muted/50 rounded-xl border border-border text-sm text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Número de documento</label>
                    <input
                      type="text"
                      value={editItem.numeroDocumento}
                      disabled
                      autoComplete="off"
                      className="w-full px-3 py-2.5 bg-muted/50 rounded-xl border border-border text-sm text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                </div>
                 <p className="sm:col-span-2 text-xs text-muted-foreground -mt-1">No se puede modificar el documento de un cliente registrado.</p>
                {[
                  { label: "Nombre completo", field: "nombre" as const, type: "text"  },
                  { label: "Correo",          field: "correo" as const, type: "email" },
                ].map(({ label, field, type }) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
                    <input type={type} value={editItem[field]} autoComplete="off"
                      onChange={e => { const v = field === "correo" ? filtrarCorreo(e.target.value) : field === "nombre" ? filtrarNombre(e.target.value) : e.target.value; setEditItem(x => x && ({ ...x, [field]: v })); setEditErrors(p => ({ ...p, [field]: field === "correo" ? validarCorreo(v) ?? undefined : field === "nombre" ? validarNombre(v) ?? undefined : undefined })); }}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${editErrors[field] ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`} />
                    {editErrors[field] && <p className="text-xs text-red-500 mt-1 leading-tight">{editErrors[field]}</p>}
                  </div>
                ))}
                  <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Pedidos</label>
                  <input type="number" value={editItem.pedidos} disabled
                    className="w-full px-3 py-2.5 bg-muted/50 rounded-xl border border-border text-sm text-muted-foreground cursor-not-allowed" />
                  <p className="text-xs text-muted-foreground mt-1">Los pedidos se actualizan automáticamente. No se puede modificar.</p>
                </div>
                 <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                  {/* Punto 3.2: 2 opciones → control segmentado */}
                  <SegmentadoButtons
                    valor={editItem.activo ? "activo" : "inactivo"}
                    onChange={valor => setEditItem(x => x && ({ ...x, activo: valor === "activo" }))}
                    opciones={[
                      { valor: "activo", etiqueta: "Activo" },
                      { valor: "inactivo", etiqueta: "Inactivo" },
                    ]}
                  />
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

    </div>
  );
}
