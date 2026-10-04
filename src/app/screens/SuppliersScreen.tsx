import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { filtrarCorreo, soloDigitos, soloLetras, validarCorreo } from "../components/campo";
import { useProveedorForm, filtrarNit, soloDireccion } from "../components/useProveedorForm";
import { ProveedorFormCampos } from "../components/ProveedorForm";
import {
  EstadoSelect,
  ESTADO_ACTIVO_COLOR,
  ESTADO_INACTIVO_COLOR,
  type EstadoOption,
} from "../components/EstadoSelect";
import { EstadoHistorialTooltip } from "../components/EstadoHistorialTooltip";

const SERIF = "var(--font-titulo)";

function ConfirmModal({
  title, message, onConfirm, onCancel,
}: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }} transition={{ duration: 0.18 }}
        className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: SERIF }}>{title}</h3>
        </div>
        <p className="text-muted-foreground mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 border border-border rounded-xl font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors active:scale-95 cursor-pointer">Sí, confirmar</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────── SUPPLIERS ───────────────────────────

type SupplierStatus = "activo" | "inactivo";

interface Supplier {
  id: string;
  nit: string;
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
  asesorComercial: string;
  estado: SupplierStatus;
}

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: "PROV-001", nit: "900.123.456-1",
    nombre: "Distribuidora La Cosecha",
    telefono: "604 321 0001", email: "cosecha@proveedores.co",
    direccion: "Cra 50 #30-10, Medellín",
    asesorComercial: "Carlos Mejía",
    estado: "activo",
  },
  {
    id: "PROV-002", nit: "800.654.321-2",
    nombre: "Quesos del Norte S.A.S.",
    telefono: "604 321 0002", email: "quesos@norte.co",
    direccion: "Cll 80 #45-20, Bello",
    asesorComercial: "Ana Restrepo",
    estado: "activo",
  },
  {
    id: "PROV-003", nit: "700.111.222-3",
    nombre: "Carnes Premium Ltda.",
    telefono: "604 321 0003", email: "ventas@carnespremium.co",
    direccion: "Av. 33 #76-60, Medellín",
    asesorComercial: "Jorge Ríos",
    estado: "inactivo",
  },
  {
    id: "PROV-004", nit: "901.777.888-4",
    nombre: "Bebidas y Más",
    telefono: "604 321 0004", email: "pedidos@bebidasmas.co",
    direccion: "Cra 65 #12-40, Itagüí",
    asesorComercial: "Luisa Palacio",
    estado: "activo",
  },
];

const INITIAL_PURCHASES_REF = [
  { id: "COM-001", idProveedor: "PROV-001" },
  { id: "COM-002", idProveedor: "PROV-003" },
  { id: "COM-003", idProveedor: "PROV-002" },
  { id: "COM-004", idProveedor: "PROV-001" },
  { id: "COM-005", idProveedor: "PROV-004" },
];

const SUPPLIER_STATUS_COLOR: Record<SupplierStatus, string> = {
  activo:   "bg-emerald-100 text-emerald-800",
  inactivo: "bg-red-100 text-red-700",
};

const emptySupplier = (): Omit<Supplier, "id"> => ({
  nit: "",
  nombre: "",
  telefono: "",
  email: "",
  direccion: "",
  asesorComercial: "",
  estado: "activo",
});

function Modal({
  title, onClose, onConfirm, confirmLabel = "Guardar", children,
}: {
  title: string; onClose: () => void; onConfirm: () => void; confirmLabel?: string; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.16 }}
          className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="px-5 py-4 space-y-4">{children}</div>
          <div className="flex gap-3 px-5 py-4 border-t border-border">
            <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">Cancelar</button>
            <button onClick={onConfirm} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">{confirmLabel}</button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

import type { OrdenCompra, GestionCompra } from "./OrdenCompraScreen";

interface SuppliersScreenProps {
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  ordenes?: OrdenCompra[];
  gestiones?: GestionCompra[];
  /** Estado global de proveedores desde App.tsx */
  proveedores?: ProveedorRef[];
  setProveedores?: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
}

export function SuppliersScreen({ 
  canCreate = true, 
  canEdit = true, 
  canDelete = true,
  ordenes = [],
  gestiones = [],
  proveedores: proveedoresProp,
  setProveedores: setProveedoresProp,
}: SuppliersScreenProps) {
  // Usar el estado global de proveedores si está disponible, si no, usar datos locales
  const [suppliersLocal, setSuppliersLocal] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const suppliers = proveedoresProp ?? suppliersLocal;
  const setSuppliers = setProveedoresProp ?? setSuppliersLocal;
  const [search,    setSearch]    = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editItem,   setEditItem]   = useState<Supplier | null>(null);
  const [detailItem, setDetailItem] = useState<Supplier | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [confirmToggleId, setConfirmToggleId] = useState<string | null>(null);
  const [form, setForm] = useState(emptySupplier());

  const [page, setPage] = useState(1);
  // Máximo 5 proveedores por página: la tabla nunca hace scroll por sí sola,
  // la única forma de ver el resto es el paginador de abajo.
  const PER_PAGE = 5;

  // Nota: La lógica anterior que consultaba si el proveedor tenía compras u
  // órdenes asociadas para decidir si se podían editar el NIT y el nombre fue
  // eliminada. Ahora el NIT y el nombre NUNCA se pueden editar después de creado
  // el proveedor, tenga o no compras u órdenes asociadas.

  const filtered = useMemo(
    () => suppliers.filter(s =>
      s.nombre.toLowerCase().includes(search.toLowerCase()) ||
      s.nit.toLowerCase().includes(search.toLowerCase()) ||
      s.telefono.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.asesorComercial.toLowerCase().includes(search.toLowerCase()) ||
      s.estado.toLowerCase().includes(search.toLowerCase())
    ),
    [suppliers, search],
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  // Página efectiva recortada al rango: si el total baja (borrado o filtro),
  // `page` puede quedar fuera de rango durante un render y la tabla saldría
  // vacía. Así nunca se pinta una página inexistente.
  const pageActual = Math.min(Math.max(page, 1), Math.max(1, totalPages));
  const paged = filtered.slice((pageActual - 1) * PER_PAGE, pageActual * PER_PAGE);

  // Si el buscador o un borrado reducen el total, `page` puede quedar apuntando
  // más allá de la última página: la tabla salía vacía sin mensaje de "sin
  // resultados" y "Siguiente" ya no avanzaba (hacía `min(totalPages, p + 1)`).
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  const inputCls = "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  const disabledCls = "w-full px-3 py-2.5 bg-muted/40 rounded-xl border border-border text-sm text-muted-foreground cursor-not-allowed select-none";

  const proveedorForm = useProveedorForm(
    form,
    suppliers.map(s => ({ nit: s.nit, nombre: s.nombre })),
  );

  const handleCreate = () => {
    proveedorForm.setIntentoGuardar(true);
    if (!proveedorForm.formValido) {
      toast.error("Revisa los campos del formulario");
      return;
    }
    const nextNum = suppliers.reduce((max, s) => {
      const n = parseInt(s.id.replace("PROV-", ""), 10) || 0;
      return Math.max(max, n);
    }, 0) + 1;
    const newId = `PROV-${String(nextNum).padStart(3, "0")}`;
    setSuppliers(p => [{ id: newId, ...proveedorForm.values }, ...p]);
    setShowCreate(false);
    setForm(emptySupplier());
    proveedorForm.reset();
    toast.success("Proveedor creado exitosamente");
  };

  const handleEdit = () => {
    if (!editItem) return;
    editForm.setIntentoGuardar(true);
    // Validar todos los campos editables (nombre y nit NUNCA se editan)
    const camposAValidar = ["asesorComercial", "telefono", "email", "direccion", "estado"];
    if (!camposAValidar.every(c => !editForm.errors[c])) {
      toast.error("Revisa los campos del formulario");
      return;
    }
    // El NIT y el nombre NUNCA se pueden editar: se conservan los valores originales
    setSuppliers(p => p.map(s => s.id === editItem.id ? {
      ...s,
      nombre: s.nombre, // NUNCA se actualiza
      nit: s.nit, // NUNCA se actualiza
      asesorComercial: editForm.values.asesorComercial,
      telefono: editForm.values.telefono,
      email: editForm.values.email,
      direccion: editForm.values.direccion,
      estado: editForm.values.estado,
    } : s));
    setEditItem(null);
    toast.success("Proveedor editado exitosamente");
  };

  const handleDelete = (id: string) => {
    if (INITIAL_PURCHASES_REF.some(c => c.idProveedor === id)) {
      toast.error("No se puede eliminar: el proveedor tiene compras asignadas");
      setDeleteId(null);
      return;
    }
    setSuppliers(p => p.filter(s => s.id !== id));
    setDeleteId(null);
    toast.success("Proveedor eliminado");
  };

  const applyToggleEstado = (id: string) => {
    setSuppliers(p => p.map(x =>
      x.id === id ? { ...x, estado: x.estado === "activo" ? "inactivo" : "activo" } : x
    ));
    const nuevoEstado = suppliers.find(s => s.id === id)?.estado === "activo" ? "Inactivo" : "Activo";
    toast.success(`Estado cambiado a ${nuevoEstado}`);
    setConfirmToggleId(null);
  };

  // El NIT y el nombre NUNCA se pueden editar después de creado el proveedor.
  // Se bloquean siempre, tenga o no compras u órdenes asociadas.
  const editForm = useProveedorForm(
    {
      nombre: editItem?.nombre ?? "",
      nit: editItem?.nit ?? "",
      // Las semillas guardan el teléfono con espacios ("604 321 0001") pero la
      // validación exige solo dígitos: se normaliza aquí, igual que hace el
      // filtro del propio campo, o el guardado quedaba bloqueado.
      telefono: soloDigitos(editItem?.telefono ?? ""),
      email: editItem?.email ?? "",
      asesorComercial: editItem?.asesorComercial ?? "",
      direccion: editItem?.direccion ?? "",
      estado: editItem?.estado ?? "activo",
    },
    suppliers.map(s => ({ nit: s.nit, nombre: s.nombre })),
    { bloquearNombre: true, bloquearNit: true },
  );

  // `useProveedorForm` guarda los valores en un useState que SOLO se inicializa
  // al montar, es decir con editItem = null (todo vacío). Sin este re-sellado el
  // modal Editar abría los campos de contacto en blanco y la validación
  // bloqueaba el guardado ("El asesor comercial es obligatorio", etc.), así que
  // no se guardaba ni el estado. Se re-sella cuando cambia el proveedor a editar
  // (nunca mientras se edita, o se perderían los cambios en curso).
  useEffect(() => {
    if (editItem) editForm.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editItem?.id]);

  const EditFields = () => editItem ? (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border">
          Identificación del proveedor
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">NIT</label>
            <div className={disabledCls}>{editItem.nit}</div>
            <p className="text-[10px] text-muted-foreground mt-1">El NIT y el nombre no se pueden modificar después de creado el proveedor</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre <span className="text-red-500">*</span></label>
            <div className={disabledCls}>{editItem.nombre}</div>
            <p className="text-[10px] text-muted-foreground mt-1">El NIT y el nombre no se pueden modificar después de creado el proveedor</p>
          </div>
        </div>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border">
          Contacto
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Asesor Comercial</label>
            <input
              value={editForm.values.asesorComercial}
              onChange={e => {
                editForm.setCampo("asesorComercial", soloLetras(e.target.value));
                setEditItem(x => x && { ...x, asesorComercial: soloLetras(e.target.value) });
              }}
              onBlur={() => editForm.marcarTocado("asesorComercial")}
              placeholder="Carlos Mejía"
              className={`${inputCls} ${editForm.campoCls("asesorComercial")}`}
            />
            {editForm.obtenerError("asesorComercial") && (
              <p className="text-xs text-red-500 mt-1 ml-0.5">{editForm.obtenerError("asesorComercial")}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Teléfono</label>
            <input
              type="tel"
              value={editForm.values.telefono}
              onChange={e => {
                editForm.setCampo("telefono", soloDigitos(e.target.value));
                setEditItem(x => x && { ...x, telefono: soloDigitos(e.target.value) });
              }}
              onBlur={() => editForm.marcarTocado("telefono")}
              className={`${inputCls} ${editForm.campoCls("telefono")}`}
            />
            {editForm.obtenerError("telefono") && (
              <p className="text-xs text-red-500 mt-1 ml-0.5">{editForm.obtenerError("telefono")}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Email</label>
            <input
              type="email"
              value={editForm.values.email}
              onChange={e => {
                editForm.setCampo("email", filtrarCorreo(e.target.value));
                setEditItem(x => x && { ...x, email: filtrarCorreo(e.target.value) });
              }}
              onBlur={() => editForm.marcarTocado("email")}
              className={`${inputCls} ${editForm.campoCls("email")}`}
            />
            {editForm.obtenerError("email") && (
              <p className="text-xs text-red-500 mt-1 ml-0.5">{editForm.obtenerError("email")}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Dirección *</label>
            <input
              value={editForm.values.direccion}
              onChange={e => {
                editForm.setCampo("direccion", soloDireccion(e.target.value));
                setEditItem(x => x && { ...x, direccion: soloDireccion(e.target.value) });
              }}
              onBlur={() => editForm.marcarTocado("direccion")}
              className={`${inputCls} ${editForm.campoCls("direccion")}`}
            />
            {editForm.obtenerError("direccion") && (
              <p className="text-xs text-red-500 mt-1 ml-0.5">{editForm.obtenerError("direccion")}</p>
            )}
          </div>
        </div>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border">
          Configuración
        </p>
        <div className="w-1/2 pr-1.5">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
          <EstadoSelect
            value={editForm.values.estado}
            onChange={(nuevoEstado) => {
              editForm.setCampo("estado", nuevoEstado);
              setEditItem(x => x && { ...x, estado: nuevoEstado });
            }}
            options={[
              { value: "activo", label: "Activo", color: "bg-emerald-100 text-emerald-800" },
              { value: "inactivo", label: "Inactivo", color: "bg-red-100 text-red-700" },
            ]}
          />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="px-4 py-3 max-w-6xl mx-auto h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Gestión Proveedor</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{suppliers.length} proveedores registrados</p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <button onClick={() => { setForm(emptySupplier()); setShowCreate(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md text-sm">
              <Plus className="w-4 h-4" /> Crear Proveedor
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por NIT, nombre, asesor o email..."
          className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {/* Table — el card mide sólo lo que ocupan el encabezado y las filas
          (sin flex-1 ni min-height): no queda espacio vacío debajo de la
          última fila. Si el alto disponible no alcanza, es el wrapper interno
          el que scrollea, nunca la página.
          `table-fixed` + <colgroup> reparte el ancho entre las 6 columnas, así
          que la tabla nunca supera el ancho disponible (sin scroll horizontal
          en escritorio); el `min-w` es sólo el piso para que en tablet/celular
          quepan las columnas y la tabla se desplace dentro del card. */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
        <div className="overflow-auto">
          <table className="w-full table-fixed min-w-[860px]">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[15%]" />
              <col className="w-[13%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {["Nombre", "Contacto", "Teléfono", "Email", "Estado", "Acciones"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    <p className="text-4xl mb-3">🚛</p>
                    <p>No se encontraron proveedores</p>
                  </td>
                </tr>
              ) : paged.map(s => (
                <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2 overflow-hidden">
                    <p className="text-sm font-medium text-foreground truncate" title={s.nombre}>{s.nombre}</p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate" title={`NIT ${s.nit}`}>NIT {s.nit}</p>
                  </td>
                  <td className="px-3 py-2 overflow-hidden">
                    <p className="text-sm text-foreground truncate" title={s.asesorComercial}>{s.asesorComercial || "—"}</p>
                  </td>
                  <td className="px-3 py-2 text-sm text-muted-foreground truncate" title={s.telefono}>{s.telefono}</td>
                  {/* El email largo se corta con "…" y el `title` muestra el
                      texto completo al pasar el cursor. */}
                  <td className="px-3 py-2 text-sm text-muted-foreground truncate" title={s.email}>{s.email}</td>
                  <td className="px-3 py-2 overflow-hidden">
                    <EstadoSelect
                      value={s.estado}
                      onChange={(nuevoEstado) => {
                        if (nuevoEstado === s.estado) return;
                        setConfirmToggleId(s.id);
                      }}
                      options={[
                        { value: "activo", label: "Activo", color: ESTADO_ACTIVO_COLOR },
                        { value: "inactivo", label: "Inactivo", color: ESTADO_INACTIVO_COLOR },
                      ]}
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setDetailItem(s)} title="Ver detalle"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors cursor-pointer">
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <button onClick={() => setEditItem({ ...s })} title="Editar"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => setDeleteId(s.id)} title="Eliminar"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginador compacto y centrado — sólo aparece con más de 5 proveedores
          filtrados (con 5 o menos se muestran todos y no hace falta).
          Sólo flechas ‹ › sin texto, sin borde ni fondo, en gris claro y
          deshabilitadas en el extremo correspondiente; los números van sin
          borde y la página actual en un círculo rojo del tema (bg-primary) con
          el número en blanco. Todo a 32 px de alto (w-8 h-8). */}
      {filtered.length > PER_PAGE && (
        <div className="flex items-center justify-center gap-1 mt-2 shrink-0">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={pageActual === 1}
            aria-label="Página anterior"
            className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground/60 hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setPage(n)}
              aria-current={n === pageActual ? "page" : undefined}
              className={`w-8 h-8 rounded-full text-sm font-semibold cursor-pointer transition-colors ${
                n === pageActual
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={pageActual === totalPages}
            aria-label="Página siguiente"
            className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground/60 hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Modal: Crear Proveedor (centrado, 2 columnas) ── */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.16 }}
                className="bg-card rounded-2xl w-full max-w-xl shadow-2xl border border-border my-4"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Crear Proveedor</h3>
                  <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
                </div>
                <div className="px-6 py-5">
                  {/* Punto 1: mismo formulario de proveedor que el de Orden de
                      Compra y el de Compra (mismas reglas y validación en vivo). */}
                  <ProveedorFormCampos form={proveedorForm} />
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-border">
                  <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">Cancelar</button>
                  <button
                    onClick={handleCreate}
                    disabled={!proveedorForm.formValido}
                    className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
                  >Crear</button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Editar (nombre y NIT bloqueados) ── */}
      <AnimatePresence>
        {editItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.16 }}
                className="bg-card rounded-2xl w-full max-w-xl shadow-2xl border border-border my-4"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Editar — {editItem.id}</h3>
                  <button onClick={() => setEditItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
                </div>
                <div className="px-6 py-5">
                  {EditFields()}
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-border">
                  <button onClick={() => setEditItem(null)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">Cancelar</button>
                  <button onClick={handleEdit} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">Guardar</button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Ver detalle ── */}
      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.16 }}
                className="bg-card rounded-2xl w-full max-w-xl shadow-2xl border border-border my-4">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Detalle — {detailItem.id}</h3>
                  <button onClick={() => setDetailItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
                </div>
                <div className="px-6 py-5 space-y-6">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border">
                      Identificación del proveedor
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">NIT</p>
                        <div className={disabledCls}>{detailItem.nit}</div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Nombre</p>
                        <div className={disabledCls}>{detailItem.nombre}</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border">
                      Contacto
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Asesor Comercial</p>
                        <div className={disabledCls}>{detailItem.asesorComercial || "—"}</div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Teléfono</p>
                        <div className={disabledCls}>{detailItem.telefono}</div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Email</p>
                        <div className={disabledCls}>{detailItem.email}</div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Dirección</p>
                        <div className={disabledCls}>{detailItem.direccion || "—"}</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border">
                      Configuración
                    </p>
                    <div className="w-1/2 pr-1.5">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Estado</p>
                      <div className={disabledCls}>{detailItem.estado === "activo" ? "Activo" : "Inactivo"}</div>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-border">
                  <button onClick={() => setDetailItem(null)}
                    className="w-full py-2.5 bg-muted rounded-xl text-sm font-semibold text-foreground hover:bg-border cursor-pointer transition-colors">
                    Cerrar
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Confirmar cambio de estado ── */}
      <AnimatePresence>
        {confirmToggleId && (() => {
          const sup = suppliers.find(s => s.id === confirmToggleId);
          if (!sup) return null;
          const nuevoEstado = sup.estado === "activo" ? "Inactivo" : "Activo";
          return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.94, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="text-base font-bold text-foreground" style={{ fontFamily: SERIF }}>
                    ¿Cambiar el estado a {nuevoEstado}?
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  El proveedor "{sup.nombre}" pasará de {sup.estado === "activo" ? "Activo" : "Inactivo"} a {nuevoEstado}.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmToggleId(null)}
                    className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => applyToggleEstado(confirmToggleId)}
                    className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95"
                  >
                    Confirmar
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ── Confirmar eliminación ── */}
      <AnimatePresence>
        {deleteId && (
          <ConfirmDeleteModal
            title="Eliminar proveedor"
            message={`¿Seguro que deseas eliminar al proveedor ${deleteId}? Esta acción no se puede deshacer.`}
            onConfirm={() => handleDelete(deleteId)}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
