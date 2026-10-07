import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, Eye, Pencil, Trash2, X, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
// Los filtros y validadores de escritura viven en `useProveedorForm` (los usa
// también el formulario compartido de Orden de Compra y Compra).
import { useProveedorForm, formatoNit, siguienteProveedorId, nombreGuardado, datosNuevosProveedor, contactoGuardado, type TipoPersona, type TipoDocumento, type TipoSociedad, type ProveedorFormValues } from "../components/useProveedorForm";
import { ProveedorFormCampos } from "../components/ProveedorForm";
import {
  EstadoSelect,
  ESTADO_ACTIVO_COLOR,
  ESTADO_INACTIVO_COLOR,
  type EstadoOption,
} from "../components/EstadoSelect";
import { EstadoHistorialTooltip } from "../components/EstadoHistorialTooltip";
import type { ProveedorRef } from "./OrdenCompraScreen";
import { useFilasPorPagina } from "../hooks/useFilasPorPagina";

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
  /** Nombre DERIVADO: Persona Natural → "Nombres Apellidos", Persona Jurídica
   *  → Razón social. Es el dato que leen listados, compras y órdenes. */
  nombre: string;
  // Campos de contacto viejos: hoy son OPCIONALES porque el formulario ya no
  // los pide a Persona Natural (los cubre el contacto comercial de Jurídica).
  // Los proveedores antiguos sí los traen y al editar se conservan.
  telefono?: string;
  email?: string;
  direccion?: string;
  asesorComercial?: string;
  estado: SupplierStatus;
  /** Punto 12: opcional (los registros antiguos no lo traen); el alta lo
   *  pide siempre. "" = sin elegir, se muestra como "—" en listado/detalle. */
  tipoPersona?: TipoPersona | "";
  // ── Datos nuevos por tipo de persona (todos opcionales: los registros
  // antiguos no los traen y los formularios de Orden/Compra no los generan). ──
  /** Persona Natural. */
  nombres?: string;
  apellidos?: string;
  tipoDocumento?: TipoDocumento | "";
  numeroDocumento?: string;
  /** DV (dígito de verificación). */
  dv?: string;
  /** Persona Jurídica: forma societaria. La razón social NO se guarda aquí,
   *  vive en `nombre` (es su valor derivado). */
  tipoSociedad?: TipoSociedad | "";
  /** Adjunto de la Cámara de Comercio: nombre del archivo + dataURL. */
  camaraComercioNombre?: string;
  camaraComercioArchivo?: string;
  fechaExpedicionCamara?: string;
  /** Persona Jurídica: contacto comercial (en Natural queda vacío). Al
   *  guardar se copia a asesor/telefono/email para el resto de la app. */
  contactoNombre?: string;
  contactoTelefono?: string;
  contactoEmail?: string;
  /** Representante legal (solo Persona Jurídica). */
  repLegalNombres?: string;
  repLegalApellidos?: string;
  repLegalTipoDocumento?: TipoDocumento | "";
  repLegalNumeroDocumento?: string;
}

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: "1", nit: "900.123.456-1",
    nombre: "Distribuidora La Cosecha",
    telefono: "604 321 0001", email: "cosecha@proveedores.co",
    direccion: "Cra 50 #30-10, Medellín",
    asesorComercial: "Carlos Mejía",
    estado: "activo",
    tipoPersona: "Persona Jurídica",
  },
  {
    id: "2", nit: "800.654.321-2",
    nombre: "Quesos del Norte S.A.S.",
    telefono: "604 321 0002", email: "quesos@norte.co",
    direccion: "Cll 80 #45-20, Bello",
    asesorComercial: "Ana Restrepo",
    estado: "activo",
    tipoPersona: "Persona Jurídica",
  },
  {
    id: "3", nit: "700.111.222-3",
    nombre: "Carnes Premium Ltda.",
    telefono: "604 321 0003", email: "ventas@carnespremium.co",
    direccion: "Av. 33 #76-60, Medellín",
    asesorComercial: "Jorge Ríos",
    estado: "inactivo",
    tipoPersona: "Persona Jurídica",
  },
  {
    id: "4", nit: "901.777.888-4",
    nombre: "Bebidas y Más",
    telefono: "604 321 0004", email: "pedidos@bebidasmas.co",
    direccion: "Cra 65 #12-40, Itagüí",
    asesorComercial: "Luisa Palacio",
    estado: "activo",
    tipoPersona: "Persona Natural",
  },
];

const SUPPLIER_STATUS_COLOR: Record<SupplierStatus, string> = {
  activo:   "bg-emerald-100 text-emerald-800",
  inactivo: "bg-red-100 text-red-700",
};

/** Estado inicial del alta: son los valores del hook `useProveedorForm`
 *  (por eso incluye `tipoPersona`, que en el proveedor guardado es opcional).
 *  Los campos nuevos arrancan en "" para que ningún input quede sin controlar. */
const emptySupplier = (): ProveedorFormValues => ({
  nit: "",
  nombre: "",
  telefono: "",
  email: "",
  direccion: "",
  asesorComercial: "",
  estado: "activo",
  // Punto 12: sin elegir: la validación exige que el usuario lo elija.
  tipoPersona: "",
  // Persona Natural.
  nombres: "",
  apellidos: "",
  tipoDocumento: "",
  numeroDocumento: "",
  dv: "",
  // Persona Jurídica.
  razonSocial: "",
  tipoSociedad: "",
  camaraComercioNombre: "",
  camaraComercioArchivo: "",
  fechaExpedicionCamara: "",
  contactoNombre: "",
  contactoTelefono: "",
  contactoEmail: "",
  repLegalNombres: "",
  repLegalApellidos: "",
  repLegalTipoDocumento: "",
  repLegalNumeroDocumento: "",
});

/**
 * Cuerpo de "Ver detalle": pinta los datos según el tipo de persona, con los
 * mismos campos que pide cada formulario (así lo que se guardó es lo que se
 * ve). Los proveedores antiguos sin tipo siguen mostrando el bloque de
 * contacto viejo (asesor/teléfono/email/dirección).
 */
function DetalleContenido({ s, cls }: { s: Supplier; cls: string }) {
  const esNatural = s.tipoPersona === "Persona Natural";
  const esJuridica = s.tipoPersona === "Persona Jurídica";

  const seccion = (titulo: string) => (
    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border">
      {titulo}
    </p>
  );

  /** Celda de la rejilla: valor vacío o sin registrar → "—". */
  const celda = (label: string, valor?: string, contenido?: React.ReactNode) => (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
      <div className={cls}>{contenido ?? ((valor ?? "").trim() || "—")}</div>
    </div>
  );

  return (
    <>
      <div>
        {seccion("Identificación del proveedor")}
        <div className="grid grid-cols-2 gap-3">
          {/* En Jurídica el nombre guardado ES la razón social. */}
          {celda(esJuridica ? "Razón social" : "Nombre", s.nombre)}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Tipo de persona</p>
            <div className={cls}>{s.tipoPersona || "—"}</div>
          </div>
          {esNatural && (
            <>
              {celda("Nombres", s.nombres)}
              {celda("Apellidos", s.apellidos)}
              {celda("Tipo de documento", s.tipoDocumento)}
              {celda("Número de documento", s.numeroDocumento)}
              {celda("NIT (opcional)", formatoNit(s.nit))}
              {celda("DV", s.dv)}
            </>
          )}
          {!esNatural && (
            <>
              {celda("NIT", formatoNit(s.nit))}
              {celda("DV", s.dv)}
              {esJuridica && celda("Tipo de sociedad", s.tipoSociedad)}
            </>
          )}
        </div>
      </div>

      {esJuridica && (
        <div>
          {seccion("Cámara de Comercio")}
          <div className="grid grid-cols-2 gap-3">
            {celda(
              "Documento",
              s.camaraComercioNombre,
              // Si quedó el dataURL se puede abrir en otra pestaña; si no,
              // solo se muestra el nombre del archivo.
              s.camaraComercioArchivo
                ? (
                  <a
                    href={s.camaraComercioArchivo}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline break-all hover:text-red-700"
                    title={s.camaraComercioNombre}
                  >
                    {s.camaraComercioNombre}
                  </a>
                )
                : undefined,
            )}
            {celda("Fecha de expedición", s.fechaExpedicionCamara)}
          </div>
        </div>
      )}

      {esJuridica && (
        <div>
          {seccion("Contacto comercial")}
          <div className="grid grid-cols-2 gap-3">
            {celda("Nombre", s.contactoNombre)}
            {celda("Teléfono", s.contactoTelefono)}
            {celda("Correo", s.contactoEmail)}
          </div>
        </div>
      )}

      {esJuridica && (
        <div>
          {seccion("Representante legal")}
          <div className="grid grid-cols-2 gap-3">
            {celda("Nombres", s.repLegalNombres)}
            {celda("Apellidos", s.repLegalApellidos)}
            {celda("Tipo de documento", s.repLegalTipoDocumento)}
            {celda("Número de documento", s.repLegalNumeroDocumento)}
          </div>
        </div>
      )}

      {!esNatural && !esJuridica && (
        <div>
          {seccion("Contacto")}
          <div className="grid grid-cols-2 gap-3">
            {celda("Asesor Comercial", s.asesorComercial)}
            {celda("Teléfono", s.telefono)}
            {celda("Email", s.email)}
            {celda("Dirección", s.direccion)}
          </div>
        </div>
      )}
    </>
  );
}

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
  // Punto 3: se guarda el PROVEEDOR, no el id. Con el id podían quedar en
  // `undefined` (proveedores creados desde Crear Orden/Compra) y `deleteId &&`
  // resultaba falsy: el ícono de eliminar no abría NINGUNA alerta.
  const [deleteItem, setDeleteItem] = useState<Supplier | null>(null);
  // Proveedor con órdenes/compras: en vez de la alerta de borrado se muestra
  // esta alerta informativa con un solo botón.
  const [bloqueoItem, setBloqueoItem] = useState<Supplier | null>(null);
  const [confirmToggleId, setConfirmToggleId] = useState<string | null>(null);
  const [form, setForm] = useState(emptySupplier());

  const [page, setPage] = useState(1);
  // Máximo 5 proveedores por página: las filas por página se calculan según el
  // alto disponible (ResizeObserver, useFilasPorPagina). La tabla nunca hace
  // scroll por sí sola, la única forma de ver el resto es el paginador de abajo.
  const { scrollerRef, tablaRef, filasPorPagina, permitirScrollY } = useFilasPorPagina();

  // Nota: La lógica anterior que consultaba si el proveedor tenía compras u
  // órdenes asociadas para decidir si se podían editar el NIT y el nombre fue
  // eliminada. Ahora el NIT y el nombre NUNCA se pueden editar después de creado
  // el proveedor, tenga o no compras u órdenes asociadas.

  const filtered = useMemo(
    () => suppliers.filter(s =>
      s.nombre.toLowerCase().includes(search.toLowerCase()) ||
      s.nit.toLowerCase().includes(search.toLowerCase()) ||
      // Los campos de contacto son opcionales en el modelo (Persona Natural no
      // los pide): se buscan sobre "" para no romper con un registro sin ellos.
      (s.telefono ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.asesorComercial ?? "").toLowerCase().includes(search.toLowerCase()) ||
      s.estado.toLowerCase().includes(search.toLowerCase())
    ),
    [suppliers, search],
  );

  const totalPages = Math.ceil(filtered.length / filasPorPagina);
  // Página efectiva recortada al rango: si el total baja (borrado o filtro),
  // `page` puede quedar fuera de rango durante un render y la tabla saldría
  // vacía. Así nunca se pinta una página inexistente.
  const pageActual = Math.min(Math.max(page, 1), Math.max(1, totalPages));
  const paged = filtered.slice((pageActual - 1) * filasPorPagina, pageActual * filasPorPagina);

  // Si el buscador o un borrado reducen el total, `page` puede quedar apuntando
  // más allá de la última página: la tabla salía vacía sin mensaje de "sin
  // resultados" y "Siguiente" ya no avanzaba (hacía `min(totalPages, p + 1)`).
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

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
    // Punto 1: mismo generador de id que "+ Crear proveedor" (Crear Orden y
    // Crear Compra): un único punto para los tres formularios, ids numéricos
    // sin prefijo (regla del sistema) y tolerante a registros heredados que
    // hubieran quedado sin id (antes `s.id.replace(...)` lanzaba TypeError).
    const newId = siguienteProveedorId(suppliers);
    const v = proveedorForm.values;
    // El objeto se arma llave por llave: el estado global se guarda como
    // ProveedorRef (App.tsx no conoce los campos nuevos), así que los campos
    // viejos SIEMPRE van presentes y los datos por tipo de persona se suman
    // aparte. `nombre` y el contacto vienen ya derivados del formulario.
    const nuevo: Supplier = {
      id: newId,
      nombre: nombreGuardado(v),
      nit: v.nit.trim(),
      // Persona Jurídica: contacto comercial → asesor/teléfono/email (los que
      // leen compras y órdenes). Persona Natural no los pide: quedan vacíos.
      ...contactoGuardado(v),
      direccion: (v.direccion ?? "").trim(),
      estado: v.estado,
      tipoPersona: v.tipoPersona,
      ...datosNuevosProveedor(v),
    };
    setSuppliers(p => [nuevo, ...p]);
    setShowCreate(false);
    setForm(emptySupplier());
    proveedorForm.reset();
    toast.success("Proveedor creado exitosamente");
  };

  const handleEdit = () => {
    if (!editItem) return;
    editForm.setIntentoGuardar(true);
    // Se revisan TODOS los campos con error MENOS los dos que este formulario
    // no gestiona como dato editable: el NIT (queda congelado arriba) y el
    // nombre (se deriva de la identificación al guardar). Sin esta lista el
    // modal no se podría guardar mientras haya un proveedor antiguo cuyo NIT
    // venga con formato ("900.123.456-1") o un nombre heredado.
    const camposConError = (Object.keys(editForm.errors) as (keyof ProveedorFormValues)[])
      .filter(c => c !== "nit" && c !== "nombre");
    if (camposConError.length > 0) {
      toast.error("Revisa los campos del formulario");
      return;
    }
    const v = editForm.values;
    // Las órdenes de compra guardan el NOMBRE del proveedor como texto (es lo
    // que `tieneMovimientos` usa para bloquear el borrado): renombrarlo dejaría
    // esa referencia huérfana. Si el proveedor ya tiene órdenes, se conserva el
    // nombre y se avisa; los datos nuevos (nombres/apellidos o razón social) sí
    // se guardan igual.
    const nombreEditado = nombreGuardado(v, editItem.nombre);
    const renombrarRompeOrdenes =
      nombreEditado !== editItem.nombre &&
      ordenes.some(o => o.proveedor === editItem.nombre);
    if (renombrarRompeOrdenes) {
      toast.warning("El nombre se mantiene: el proveedor tiene órdenes de compra registradas con su nombre actual.");
    }
    setSuppliers(p => p.map(s => s.id === editItem.id ? {
      // `...s` conserva TODO lo que el formulario nuevo no cubre, en especial
      // la dirección y los datos de contacto de un proveedor viejo: no se borran.
      ...s,
      // El NIT y el nombre de la base siguen sin editarse: el NIT es fijo y el
      // nombre se recalcula desde Nombres+Apellidos / Razón social.
      nit: s.nit,
      nombre: renombrarRompeOrdenes ? s.nombre : nombreEditado,
      // Persona Jurídica: el contacto comercial pisa asesor/teléfono/email;
      // en Persona Natural se conservan los valores anteriores.
      ...contactoGuardado(v, s),
      estado: v.estado,
      tipoPersona: v.tipoPersona,
      ...datosNuevosProveedor(v),
    } : s));
    setEditItem(null);
    toast.success("Proveedor editado exitosamente");
  };

  /** Punto 3: un proveedor no se puede eliminar si tiene órdenes de compra o
   *  compras asociadas. Se comprueba contra los datos REALES que entrega
   *  App.tsx (`ordenes` y `gestiones`), no contra una lista fija: las órdenes
   *  guardan el nombre del proveedor y las compras, además, su id. Se matchea
   *  por id O por nombre, cubriendo también los proveedores que se crearon
   *  antes de tener id. */
  const tieneMovimientos = (s: Supplier) =>
    ordenes.some(o => o.proveedor === s.nombre) ||
    gestiones.some(g => g.proveedorId === s.id || g.proveedor === s.nombre);

  /** Punto 3: SIEMPRE se abre una alerta. Si hay movimientos, la informativa;
   *  si no, la de confirmación. */
  const alPedirEliminar = (s: Supplier) => {
    if (tieneMovimientos(s)) {
      setBloqueoItem(s);
      return;
    }
    setDeleteItem(s);
  };

  const handleDelete = (s: Supplier) => {
    setSuppliers(p => p.filter(x => !(x.id === s.id && x.nombre === s.nombre)));
    setDeleteItem(null);
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
      // Punto 2: el teléfono se muestra EXACTAMENTE como está guardado, igual
      // que en Ver detalle y en el listado. La validación ignora los espacios
      // ("604 321 0001" pasa), y al escribir el filtro del propio campo deja
      // el valor en dígitos como siempre.
      telefono: editItem?.telefono ?? "",
      email: editItem?.email ?? "",
      asesorComercial: editItem?.asesorComercial ?? "",
      direccion: editItem?.direccion ?? "",
      estado: editItem?.estado ?? "activo",
      // Punto 12: vacío si el proveedor no lo tiene registrado todavía.
      tipoPersona: editItem?.tipoPersona ?? "",
      // ── Datos nuevos. Los proveedores antiguos no los traen, así que se
      // arrancan en "" y el formulario pide completarlos al guardar. ──
      nombres: editItem?.nombres ?? "",
      apellidos: editItem?.apellidos ?? "",
      tipoDocumento: editItem?.tipoDocumento ?? "",
      numeroDocumento: editItem?.numeroDocumento ?? "",
      dv: editItem?.dv ?? "",
      tipoSociedad: editItem?.tipoSociedad ?? "",
      camaraComercioNombre: editItem?.camaraComercioNombre ?? "",
      camaraComercioArchivo: editItem?.camaraComercioArchivo ?? "",
      fechaExpedicionCamara: editItem?.fechaExpedicionCamara ?? "",
      repLegalNombres: editItem?.repLegalNombres ?? "",
      repLegalApellidos: editItem?.repLegalApellidos ?? "",
      repLegalTipoDocumento: editItem?.repLegalTipoDocumento ?? "",
      repLegalNumeroDocumento: editItem?.repLegalNumeroDocumento ?? "",
      // Razón social: en el modelo no existe como campo, vive en `nombre`
      // (es lo que se muestra como "Razón social"), así que un proveedor
      // Jurídico antiguo se siembra desde ahí y no se pierde al editar.
      razonSocial: editItem?.tipoPersona === "Persona Jurídica" ? (editItem?.nombre ?? "") : "",
      // Contacto comercial: en Jurídica se siembra desde los campos viejos
      // (asesor/teléfono/email) para que un proveedor antiguo no los pierda;
      // en Natural el formulario no lo muestra.
      contactoNombre: editItem?.tipoPersona === "Persona Jurídica"
        ? (editItem?.contactoNombre ?? editItem?.asesorComercial ?? "")
        : (editItem?.contactoNombre ?? ""),
      contactoTelefono: editItem?.tipoPersona === "Persona Jurídica"
        ? (editItem?.contactoTelefono ?? editItem?.telefono ?? "")
        : (editItem?.contactoTelefono ?? ""),
      contactoEmail: editItem?.tipoPersona === "Persona Jurídica"
        ? (editItem?.contactoEmail ?? editItem?.email ?? "")
        : (editItem?.contactoEmail ?? ""),
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

  // Modal Editar: usa el MISMO componente que el alta (`ProveedorFormCampos`),
  // que pinta los campos según el tipo de persona y deja el NIT en solo
  // lectura al recibir `nitLectura`. Antes aquí había un bloque de campos a
  // mano: se duplicaba con el formulario y, como el componente se recreaba en
  // cada render, React remontaba todos los inputs y se perdía el foco.

  return (
    <div className="px-4 py-3 max-w-6xl mx-auto h-full min-h-0 flex flex-col overflow-hidden">
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
      <div className="relative mb-4 shrink-0 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por NIT, nombre, asesor o email..."
          className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {/* La card ocupa todo el alto restante: la tabla NO hace scroll vertical
          (se pagina en filas que quepan, useFilasPorPagina); sólo queda scroll
          horizontal en tablet y scroll vertical en móvil (tarjetas). El
          paginador queda fijo debajo, siempre visible y por encima del footer.
          `table-fixed` con anchos % por <th> reparte las columnas; la columna
          Teléfono sólo existe desde 1440px (debajo va bajo Contacto). */}
      <div className="flex-1 min-h-0 flex flex-col bg-card border border-border rounded-2xl overflow-hidden">
        <div
          ref={scrollerRef}
          className={`flex-1 min-h-0 overflow-x-auto ${permitirScrollY ? "overflow-y-auto" : "overflow-y-auto md:overflow-y-hidden"}`}
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-14 text-center text-muted-foreground">
              <p className="text-4xl mb-3">🚛</p>
              <p>No se encontraron proveedores</p>
            </div>
          ) : (
            <table ref={tablaRef} className="hidden md:table w-full table-fixed md:min-w-[800px]">
              <thead className="bg-muted text-xs text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap sticky top-0 left-0 z-30 bg-muted w-[24%] min-[1440px]:w-[22%]">Nombre</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap sticky top-0 z-20 bg-muted w-[12%] min-[1440px]:w-[11%]">Tipo</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap sticky top-0 z-20 bg-muted w-[15%] min-[1440px]:w-[13%]">Contacto</th>
                  <th className="hidden min-[1440px]:table-cell px-3 py-2 text-left font-semibold whitespace-nowrap sticky top-0 z-20 bg-muted w-[12%]">Teléfono</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap sticky top-0 z-20 bg-muted w-[19%] min-[1440px]:w-[16%]">Email</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap sticky top-0 z-20 bg-muted w-[15%] min-[1440px]:w-[12%]">Estado</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap sticky top-0 right-0 z-30 bg-muted w-[15%] min-[1440px]:w-[14%]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.map(s => (
                  <tr key={s.id} className="group hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2 overflow-hidden sticky left-0 z-10 bg-card group-hover:bg-muted/20">
                      <p className="text-sm font-medium text-foreground truncate" title={s.nombre}>{s.nombre}</p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate" title={`NIT ${formatoNit(s.nit)}`}>NIT {formatoNit(s.nit)}</p>
                    </td>
                    {/* Punto 12 (PR #111): el tipo de persona también se ve en el
                        listado; los proveedores antiguos sin dato muestran "-". */}
                    <td
                      className="px-3 py-2 text-sm text-muted-foreground truncate"
                      title={s.tipoPersona || "Sin registrar"}
                    >
                      {s.tipoPersona || "-"}
                    </td>
                    <td className="px-3 py-2 overflow-hidden">
                      <p className="text-sm text-foreground truncate" title={s.asesorComercial}>{s.asesorComercial || "—"}</p>
                      {/* Sólo hasta 1439px: el teléfono va bajo el contacto */}
                      <p className="text-[11px] text-muted-foreground truncate min-[1440px]:hidden" title={s.telefono}>{s.telefono}</p>
                    </td>
                    <td className="hidden min-[1440px]:table-cell px-3 py-2 text-sm text-muted-foreground truncate" title={s.telefono}>{s.telefono}</td>
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
                    <td className="px-3 py-2 sticky right-0 z-10 bg-card group-hover:bg-muted/20">
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
                          <button onClick={() => alPedirEliminar(s)} title="Eliminar"
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
          )}

      {/* Celular (<768px): cada proveedor como tarjeta. */}
      {filtered.length > 0 && (
        <div className="md:hidden divide-y divide-border">
          {paged.map(s => (
            <div key={s.id} className="p-4">
              {/* Nombre, NIT y estado arriba */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground break-words">{s.nombre}</p>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">NIT {formatoNit(s.nit)}</p>
                </div>
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
                  className="shrink-0"
                />
              </div>

              {/* Contacto con teléfono y email */}
              <div className="mt-2 space-y-0.5">
                <p className="text-sm text-foreground">{s.asesorComercial || "—"}</p>
                <p className="text-xs text-muted-foreground" title={s.telefono}>{s.telefono}</p>
                <p className="text-xs text-muted-foreground truncate" title={s.email}>{s.email}</p>
              </div>

              {/* Acciones abajo — mismas reglas y permisos que la tabla. */}
              <div className="mt-2.5 flex items-center gap-1.5">
                <button onClick={() => setDetailItem(s)} title="Ver detalle"
                  className="p-2 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors cursor-pointer">
                  <Eye className="w-4 h-4" />
                </button>
                {canEdit && (
                  <button onClick={() => setEditItem({ ...s })} title="Editar"
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => alPedirEliminar(s)} title="Eliminar"
                    className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
        </div>

      {/* Paginador fijo dentro de la card: no se pierde con el scroll.
          Sólo aparece con más de 5 proveedores filtrados. Sólo flechas ‹ › sin
          texto; la página actual en un círculo rojo del tema (bg-primary). */}
      {filtered.length > filasPorPagina && (
        <div className="shrink-0 border-t border-border flex items-center justify-center gap-1 px-3 py-2">
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
      </div>

      {/* ── Modal: Crear Proveedor (centrado, 2 columnas) ── */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.16 }}
                className="bg-card rounded-2xl w-full max-w-6xl shadow-2xl border border-border my-4 flex flex-col max-h-[calc(100dvh-2rem)]"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Crear Proveedor</h3>
                  <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
                </div>
                {/* Cuerpo con scroll propio SIEMPRE: el formulario va en dos
                    columnas y, si la ventana no alcanza, se desplaza aquí sin
                    perder la cabecera ni los botones. */}
                <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0">
                  {/* Punto 1: mismo formulario de proveedor que el de Orden de
                      Compra y el de Compra (mismas reglas y validación en vivo). */}
                  <ProveedorFormCampos form={proveedorForm} />
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
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
                className="bg-card rounded-2xl w-full max-w-6xl shadow-2xl border border-border my-4 flex flex-col max-h-[calc(100dvh-2rem)]"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Editar — {editItem.nombre}</h3>
                  <button onClick={() => setEditItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
                </div>
                <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0">
                  {editItem && (
                    <ProveedorFormCampos
                      form={editForm}
                      autoFocusNombre={false}
                      // El NIT queda congelado: es la regla del módulo.
                      nitLectura={editItem.nit}
                    />
                  )}
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
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
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Detalle — {detailItem.nombre}</h3>
                  <button onClick={() => setDetailItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
                </div>
                <div className="px-6 py-5 space-y-6">
                  {/* Punto 12 + formulario por tipo de persona: el detalle
                      muestra exactamente los campos que pide cada tipo. */}
                  <DetalleContenido s={detailItem} cls={disabledCls} />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border">
                      Configuración
                    </p>
                    <div className="w-1/2 pr-1.5">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Estado</p>
                      {/* Punto 2: badge de color igual al del listado y en modo
                          solo lectura (antes el estado iba dentro de un div con
                          aspecto de input deshabilitado). */}
                      <EstadoSelect
                        value={detailItem.estado}
                        options={[
                          { value: "activo", label: "Activo", color: ESTADO_ACTIVO_COLOR },
                          { value: "inactivo", label: "Inactivo", color: ESTADO_INACTIVO_COLOR },
                        ]}
                        disabled
                      />
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

      {/* ── Proveedor con órdenes/compras: alerta informativa (un solo botón)
             en lugar de la de eliminar ── */}
      <AnimatePresence>
        {bloqueoItem && (
          <ConfirmDeleteModal
            informativo
            title="No se puede eliminar"
            message={
              <>
                No se puede eliminar {bloqueoItem.nombre} porque tiene órdenes de
                compra o compras registradas. Puedes cambiar su estado a Inactivo.
              </>
            }
            onCancel={() => setBloqueoItem(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Confirmar eliminación (siempre con el nombre, nunca con el id) ── */}
      <AnimatePresence>
        {deleteItem && (
          <ConfirmDeleteModal
            title="Eliminar proveedor"
            message={`¿Seguro que deseas eliminar al proveedor ${deleteItem.nombre}? Esta acción no se puede deshacer.`}
            onConfirm={() => handleDelete(deleteItem)}
            onCancel={() => setDeleteItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
