import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, Eye, Pencil, Trash2, X, AlertCircle, ArrowLeft, User, Building2, Phone, FileText } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "@/shared/components/ConfirmDeleteModal";
// Los filtros y validadores de escritura viven en `useProveedorForm` (los usa
// también el formulario compartido de Orden de Compra y Compra).
import { useProveedorForm, formatoNit, siguienteProveedorId, nombreGuardado, datosNuevosProveedor, contactoGuardado, type TipoPersona, type TipoDocumento, type TipoSociedad, type ProveedorFormValues } from "@/features/compras/hooks/useProveedorForm";
import { ProveedorFormCampos } from "@/features/compras/components/ProveedorForm";
import { TipoPersonaSelector } from "@/features/compras/components/TipoPersonaSelector";
import {
  EstadoSelect,
  ESTADO_ACTIVO_COLOR,
  ESTADO_INACTIVO_COLOR,
  type EstadoOption,
} from "@/shared/components/EstadoSelect";
import { EstadoHistorialTooltip } from "@/features/compras/components/EstadoHistorialTooltip";
import type { ProveedorRef } from "@/features/orden-compra/pages/OrdenCompraScreen";
import {
  actualizarProveedor,
  cambiarEstadoProveedor,
  crearProveedor,
  eliminarProveedor,
  mensajeErrorProveedores,
} from "@/features/proveedores/services/proveedoresApi";
import { Paginador } from "@/shared/components/Paginador";

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

export type SupplierStatus = "activo" | "inactivo";

export interface Supplier {
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
  /** Persona Jurídica → bloque Razón social (`nombre_comercial` en la BD). */
  nombreComercial?: string;
  /** Adjunto de la Cámara de Comercio: nombre del archivo + dataURL/URL. */
  camaraComercioNombre?: string;
  camaraComercioArchivo?: string;
  fechaExpedicionCamara?: string;
  /** Persona Jurídica: contacto comercial (en Natural queda vacío). Al
   *  guardar se copia a asesor/telefono/email para el resto de la app. */
  contactoNombre?: string;
  contactoTelefono?: string;
  /** Teléfono FIJO del contacto (`contacto_telefono_fijo` en la BD). */
  contactoTelefonoFijo?: string;
  contactoEmail?: string;
  /** Representante legal (solo Persona Jurídica). */
  repLegalNombres?: string;
  repLegalApellidos?: string;
  repLegalTipoDocumento?: TipoDocumento | "";
  repLegalNumeroDocumento?: string;
  /** Teléfono y email del representante legal (`rep_legal_telefono` y `rep_legal_email` en la BD). */
  repLegalTelefono?: string;
  repLegalEmail?: string;
}

export const INITIAL_SUPPLIERS: Supplier[] = [];

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
  // Punto 3.1: el alta arranca con "Persona Natural" preseleccionado; en
  // edición el valor lo manda el proveedor guardado (editForm.reset() lo
  // re-siembra desde editItem) y aquí no interviene.
  tipoPersona: "Persona Natural",
  // Persona Natural.
  nombres: "",
  apellidos: "",
  tipoDocumento: "",
  numeroDocumento: "",
  dv: "",
  // Persona Jurídica.
  razonSocial: "",
  nombreComercial: "",
  tipoSociedad: "",
  camaraComercioNombre: "",
  camaraComercioArchivo: "",
  fechaExpedicionCamara: "",
  contactoNombre: "",
  contactoTelefono: "",
  contactoTelefonoFijo: "",
  contactoEmail: "",
  repLegalNombres: "",
  repLegalApellidos: "",
  repLegalTipoDocumento: "",
  repLegalNumeroDocumento: "",
  repLegalTelefono: "",
  repLegalEmail: "",
});

/**
 * Cuerpo de "Ver detalle": pinta EXACTAMENTE los campos que pide cada tipo de
 * persona (misma sección y mismo orden que el formulario, decisión 6.1), así
 * lo que se guardó es lo que se ve. Los campos sin columna en la BD (teléfono
 * y email del representante, nombre comercial y teléfono fijo) hoy salen "—".
 * Los proveedores antiguos sin tipo siguen mostrando el bloque de contacto
 * viejo (asesor/teléfono/email/dirección). El Estado vive en la sección
 * "Configuración" del propio modal, así que no se repite aquí.
 */
function DetalleContenido({ s, cls }: { s: Supplier; cls: string }) {
  const esNatural = s.tipoPersona === "Persona Natural";
  const esJuridica = s.tipoPersona === "Persona Jurídica";
  const gridDetalleCls = "grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2.5";

  const seccion = (titulo: string, icono: React.ReactNode) => (
    <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-3 pb-2 border-b border-border">
      <span className="text-primary shrink-0">{icono}</span>
      <span>{titulo}</span>
    </div>
  );

  /** Celda de la rejilla: valor vacío o sin registrar → "—". */
  const celda = (label: string, valor?: string, contenido?: React.ReactNode) => (
    <div>
      <p className="text-sm font-semibold text-muted-foreground mb-1">{label}</p>
      <div className={cls}>{contenido ?? ((valor ?? "").trim() || "—")}</div>
    </div>
  );

  const celdaEstado = () => (
    <div>
      <p className="text-sm font-semibold text-muted-foreground mb-1">Estado</p>
      <EstadoSelect
        value={s.estado}
        options={[
          { value: "activo", label: "Activo", color: ESTADO_ACTIVO_COLOR },
          { value: "inactivo", label: "Inactivo", color: ESTADO_INACTIVO_COLOR },
        ]}
        disabled
      />
    </div>
  );

  /** El formulario guarda UN solo campo "Nombre completo": aquí se une lo que
      el modelo trae partido (nombres + apellidos) y, si no hay, el `nombre`. */
  const nombreCompleto = [s.nombres ?? "", s.apellidos ?? ""]
    .map(x => x.trim())
    .filter(Boolean)
    .join(" ") || (s.nombre ?? "");

  return (
    <div className="space-y-6 mx-auto max-w-4xl">
      {/* ── Persona Natural: los 7 campos del formulario, SIN NIT y SIN DV ── */}
      {esNatural && (
        <div>
          {seccion("Datos del proveedor", <User className="w-4 h-4" />)}
          <div className={gridDetalleCls}>
            {celda("Tipo de documento", s.tipoDocumento)}
            {celda("Número de documento", s.numeroDocumento)}
            {celda("Nombre completo", nombreCompleto)}
            {celda("Teléfono", s.telefono)}
            {celda("Email", s.email)}
            {celda("Dirección", s.direccion)}
            {celdaEstado()}
          </div>
        </div>
      )}

      {/* ── Persona Jurídica: las 4 secciones apiladas del formulario ─────── */}
      {esJuridica && (
        <>
          <div>
            {seccion("Representante legal", <User className="w-4 h-4" />)}
            <div className={gridDetalleCls}>
              {celda("Tipo de documento", s.repLegalTipoDocumento)}
              {celda("Número de documento", s.repLegalNumeroDocumento)}
              {celda(
                "Nombre completo",
                [s.repLegalNombres ?? "", s.repLegalApellidos ?? ""]
                  .map(x => x.trim())
                  .filter(Boolean)
                  .join(" "),
              )}
              {celda("Teléfono", s.repLegalTelefono)}
              {celda("Email", s.repLegalEmail)}
            </div>
          </div>

          <div>
            {seccion("Razón social", <Building2 className="w-4 h-4" />)}
            <div className={gridDetalleCls}>
              {/* En Jurídica el nombre guardado ES la razón social. */}
              {celda("Nombre o razón social", s.nombre)}
              {celda("Nombre comercial", s.nombreComercial)}
              {celda("NIT", formatoNit(s.nit))}
              {celda("Tipo de sociedad", s.tipoSociedad)}
            </div>
          </div>

          <div>
            {seccion("Contacto comercial", <Phone className="w-4 h-4" />)}
            <div className={gridDetalleCls}>
              {celda("Email", s.contactoEmail || s.email)}
              {celda("Teléfono celular", s.contactoTelefono || s.telefono)}
              {celda("Teléfono fijo", s.contactoTelefonoFijo)}
              {celda("Dirección comercial", s.direccion)}
              {celda("Nombre del contacto", s.contactoNombre || s.asesorComercial)}
            </div>
          </div>

          <div>
            {seccion("Cámara de Comercio", <FileText className="w-4 h-4" />)}
            <div className={gridDetalleCls}>
              {celda(
                "Cámara de Comercio",
                s.camaraComercioNombre,
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
            </div>
          </div>

          {/* Estado: último elemento en fila propia sin barra de título */}
          <div className={gridDetalleCls}>
            {celdaEstado()}
          </div>
        </>
      )}

      {/* Proveedor antiguo sin tipo de persona registrado. */}
      {!esNatural && !esJuridica && (
        <div>
          {seccion("Datos del proveedor", <User className="w-4 h-4" />)}
          <div className={gridDetalleCls}>
            {celda("Nombre", s.nombre)}
            {celda("Asesor Comercial", s.asesorComercial)}
            {celda("Teléfono", s.telefono)}
            {celda("Email", s.email)}
            {celda("Dirección", s.direccion)}
            {celdaEstado()}
          </div>
        </div>
      )}
    </div>
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

import type { OrdenCompra, GestionCompra } from "@/features/orden-compra/pages/OrdenCompraScreen";

/** 409/400 del servidor: NIT, documento y correo repetidos se pintan bajo su
    campo; el resto va en un toast (p. ej. "…tiene historial. Desactívalo." al borrar). */
async function mostrarErrorProveedor(
  error: unknown,
  setErrorServidor: (campo: keyof ProveedorFormValues, mensaje: string) => void,
  fallback: string,
) {
  const mensaje = mensajeErrorProveedores(error, fallback);
  // Solo se pinta BAJO su campo si ese campo está pintado HOY: el formulario
  // cambia con el tipo de persona (el NIT ya no existe en Persona Natural y
  // el correo vive en `contactoEmail` en Jurídica). Dejar el error en un campo
  // oculto bloquearía el guardado sin que el usuario vea nada.
  const visible = (campo: string) => !!document.querySelector(`[data-prov-campo="${campo}"]`);
  let campo: keyof ProveedorFormValues | null = null;
  if (/nit/i.test(mensaje) && visible("nit")) campo = "nit";
  else if (/documento/i.test(mensaje) && visible("numeroDocumento")) campo = "numeroDocumento";
  else if (/correo|email/i.test(mensaje)) {
    if (visible("contactoEmail")) campo = "contactoEmail";
    else if (visible("email")) campo = "email";
  }
  if (campo) {
    setErrorServidor(campo, mensaje);
    const el = document.querySelector<HTMLElement>(`[data-prov-campo="${campo}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus();
  } else {
    toast.error(mensaje);
  }
}

interface SuppliersScreenProps {
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  ordenes?: OrdenCompra[];
  gestiones?: GestionCompra[];
  /** Estado global de proveedores desde App.tsx */
  proveedores?: ProveedorRef[];
  setProveedores?: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
  /** Carga desde la API y su error ("Reintentar"): nunca datos de ejemplo. */
  cargando?: boolean;
  errorCarga?: string | null;
  onReintentar?: () => void;
}

export function SuppliersScreen({ 
  canCreate = true, 
  canEdit = true, 
  canDelete = true,
  ordenes = [],
  gestiones = [],
  proveedores: proveedoresProp,
  setProveedores: setProveedoresProp,
  cargando = false,
  errorCarga,
  onReintentar,
}: SuppliersScreenProps) {
  // Usar el estado global de proveedores si está disponible, si no, usar datos locales
  const [suppliersLocal, setSuppliersLocal] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const suppliers = proveedoresProp ?? suppliersLocal;
  const setSuppliers = setProveedoresProp ?? setSuppliersLocal;
  /** "Guardando…" mientras habla la API: bloquea el doble clic. */
  const [guardando, setGuardando] = useState(false);
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
  // 5 proveedores por página (unificado con el resto de listados).
  const PER_PAGE = 5;

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

  const disabledCls = "w-full px-3 py-2.5 bg-muted/40 rounded-xl border border-border text-sm text-muted-foreground cursor-not-allowed select-none";

  const proveedorForm = useProveedorForm(
    form,
    suppliers.map(s => ({ nit: s.nit, nombre: s.nombre })),
  );

  const handleCreate = async () => {
    if (guardando) return;
    // Fase 2: el botón YA NO se apaga solo. Al pulsarlo se pintan todos los
    // errores que falten y el foco va al primer campo inválido; si hay error,
    // el formulario NO se envía.
    if (proveedorForm.enfocarPrimeroInvalido()) {
      toast.error("Revisa los campos del formulario");
      return;
    }
    const v = proveedorForm.values;
    // El objeto se arma llave por llave: `nombre` y el contacto vienen ya
    // derivados del formulario, y los datos por tipo de persona se suman
    // aparte. La API devuelve el proveedor con su id real ("1", "2", …).
    const nuevo: Supplier = {
      id: siguienteProveedorId(suppliers),
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
    setGuardando(true);
    try {
      const creado = await crearProveedor(nuevo);
      setSuppliers(p => [creado, ...p]);
      setShowCreate(false);
      setForm(emptySupplier());
      proveedorForm.reset();
      toast.success("Proveedor creado exitosamente");
    } catch (error) {
      await mostrarErrorProveedor(error, proveedorForm.setErrorServidor, "No se pudo crear el proveedor.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEdit = async () => {
    if (!editItem || guardando) return;
    // Se ignoran DOS llaves que este formulario no gestiona como dato
    // editable: el NIT (queda congelado) y el nombre (se deriva de la
    // identificación al guardar). Sin esta lista el modal no se podría
    // guardar mientras haya un proveedor antiguo cuyo NIT venga con formato
    // ("900.123.456-1") o un nombre heredado. El resto de los errores pinta
    // su mensaje y mueve el foco al primer campo inválido (Fase 2).
    if (editForm.enfocarPrimeroInvalido(["nit", "nombre"])) {
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
    const editado: Supplier = {
      // Se conserva TODO lo que el formulario no cubre, en especial la
      // dirección y los datos de contacto de un proveedor viejo: no se borran.
      ...editItem,
      // El NIT es fijo (el servidor ni lo toca si no cambia) y el nombre se
      // recalcula desde Nombres+Apellidos / Razón social.
      nit: editItem.nit,
      nombre: renombrarRompeOrdenes ? editItem.nombre : nombreEditado,
      // Persona Jurídica: el contacto comercial pisa asesor/teléfono/email;
      // en Persona Natural se conservan los valores anteriores.
      ...contactoGuardado(v, editItem),
      direccion: (v.direccion ?? "").trim() || (editItem.direccion ?? ""),
      estado: v.estado,
      tipoPersona: v.tipoPersona,
      ...datosNuevosProveedor(v),
    };
    setGuardando(true);
    try {
      const actualizado = await actualizarProveedor(editado);
      setSuppliers(p => p.map(s => s.id === editItem.id ? actualizado : s));
      if (detailItem?.id === editItem.id) setDetailItem(actualizado);
      setEditItem(null);
      toast.success("Proveedor editado exitosamente");
    } catch (error) {
      await mostrarErrorProveedor(error, editForm.setErrorServidor, "No se pudo editar el proveedor.");
    } finally {
      setGuardando(false);
    }
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

  const handleDelete = async (s: Supplier) => {
    try {
      await eliminarProveedor(s.id);
    } catch (error) {
      // Con historial el servidor responde 409: "…tiene historial. Desactívalo."
      toast.error(mensajeErrorProveedores(error, "No se pudo eliminar el proveedor."));
      setDeleteItem(null);
      return;
    }
    setSuppliers(p => p.filter(x => !(x.id === s.id && x.nombre === s.nombre)));
    setDeleteItem(null);
    toast.success("Proveedor eliminado");
  };

  const applyToggleEstado = async (id: string) => {
    const actual = suppliers.find(s => s.id === id);
    if (!actual) return;
    const nuevoEstado = actual.estado === "activo" ? "inactivo" : "activo";
    try {
      const actualizado = await cambiarEstadoProveedor(id, nuevoEstado === "activo");
      setSuppliers(p => p.map(x => (x.id === id ? actualizado : x)));
      toast.success(`Estado cambiado a ${nuevoEstado === "activo" ? "Activo" : "Inactivo"}`);
    } catch (error) {
      toast.error(mensajeErrorProveedores(error, "No se pudo cambiar el estado."));
    } finally {
      setConfirmToggleId(null);
    }
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
      // Campos nuevos: los proveedores antiguos no los traen (y el backend
      // aún no los guarda), así que arrancan en "".
      nombreComercial: editItem?.nombreComercial ?? "",
      contactoTelefonoFijo: editItem?.contactoTelefonoFijo ?? "",
      repLegalTelefono: editItem?.repLegalTelefono ?? "",
      repLegalEmail: editItem?.repLegalEmail ?? "",
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

  // ── Punto 3.1: alta y edición dejan de ser modales (`fixed … max-w-6xl`)
  // y pasan a PANTALLA COMPLETA, con el patrón de `OrdenCompraScreen` en modo
  // página: flecha ← + título + subtítulo, formulario con scroll propio y los
  // botones fijos abajo. Es un return temprano DESPUÉS de todos los hooks
  // (justo antes del listado), así el orden de hooks no cambia. El formulario
  // es el MISMO `ProveedorFormCampos`: validaciones, NIT en solo lectura al
  // editar y el borrador de `useProveedorForm` siguen intactos.
  const enAlta = showCreate;
  const enPantalla = enAlta || editItem !== null;
  const salirDePantalla = () => { if (enAlta) setShowCreate(false); else setEditItem(null); };

  if (enPantalla) {
    const clsBase = "flex-1 h-10 rounded-xl text-sm font-semibold transition-colors active:scale-95 inline-flex items-center justify-center gap-2";
    // Formulario activo (alta o edición): el selector del encabezado lee y
    // escribe su tipo de persona.
    const formActivo = enAlta || !editItem ? proveedorForm : editForm;
    const btnCls = "px-5 h-10 rounded-xl text-sm font-semibold transition-colors active:scale-95 inline-flex items-center justify-center gap-2";
    return (
      // Contenedor centrado (max-w-4xl, mx-auto) y SIN scroll interno: usa el
      // scroll único de `<main>` en App.tsx (prohibido el scroll doble).
      <div className="w-full max-w-4xl mx-auto px-4 py-4">
        {/* Encabezado: ← + título + subtítulo y, a la derecha, el selector
            Persona Natural / Persona Jurídica. */}
        <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-border">
          <button
            onClick={salirDePantalla}
            title="Volver"
            className="shrink-0 p-2 -ml-1 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>
              {enAlta ? "Crear Proveedor" : `Editar — ${editItem?.nombre ?? ""}`}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {enAlta
                ? "Registra la identificación, el contacto y la configuración del proveedor."
                : "Actualiza los datos del proveedor. El NIT no se modifica."}
            </p>
          </div>
          <TipoPersonaSelector
            className="ml-auto shrink-0"
            valor={formActivo.values.tipoPersona}
            disabled={!enAlta}
            onChange={(tipo) => {
              formActivo.marcarTocado("tipoPersona");
              formActivo.setCampo("tipoPersona", tipo);
            }}
            error={formActivo.obtenerError("tipoPersona")}
          />
        </div>

        <div className="py-5">
          {enAlta || !editItem ? (
            <ProveedorFormCampos form={proveedorForm} />
          ) : (
            <ProveedorFormCampos
              form={editForm}
              autoFocusNombre={false}
              // El NIT queda congelado: es la regla del módulo.
              nitLectura={editItem.nit}
            />
          )}
        </div>

        {/* Botones Cancelar / Guardar alineados a la derecha al final del formulario. */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button
            onClick={salirDePantalla}
            className={`${btnCls} border border-border text-foreground hover:bg-muted cursor-pointer`}
          >
            Cancelar
          </button>
          <button
            onClick={enAlta ? () => void handleCreate() : () => void handleEdit()}
            disabled={guardando}
            className={`${btnCls} bg-primary text-white hover:bg-red-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary`}
          >
            {guardando ? "Guardando…" : enAlta ? "Crear" : "Guardar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 h-full min-h-0 flex flex-col overflow-hidden">
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
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por NIT, nombre, asesor o email..."
          className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {/* Punto 2.5: la card medía todo el alto restante (`flex-1 min-h-0`) y,
          con la raíz locked en `h-dvh`, se estiraba hasta el fondo dejando un
          hueco vacío bajo la última fila. Ahora mide su contenido y el
          paginador queda pegado debajo. La tabla se pagina en filas fijas de 5;
          sólo queda scroll horizontal en tablet y scroll vertical en móvil
          (tarjetas). `table-fixed` con anchos % por <th> reparte las columnas;
          la columna Teléfono sólo existe desde 1440px (debajo va bajo
          Contacto). */}
      <div className="flex flex-col bg-card border border-border rounded-2xl overflow-hidden shrink-0">
        <div className="overflow-x-auto">
          {cargando ? (
            <div className="px-4 py-14 text-center text-muted-foreground">
              Cargando proveedores…
            </div>
          ) : errorCarga ? (
            <div className="px-4 py-14 text-center text-muted-foreground">
              <p className="font-semibold text-foreground">{errorCarga}</p>
              {onReintentar && (
                <button
                  type="button"
                  onClick={onReintentar}
                  className="mt-3 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Reintentar
                </button>
              )}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-14 text-center text-muted-foreground">
              <p className="text-4xl mb-3">🚛</p>
              <p>No se encontraron proveedores</p>
            </div>
          ) : (
            <table className="hidden md:table w-full table-fixed md:min-w-[800px]">
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
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
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
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
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
                  className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
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
                    className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
        </div>
      </div>

      {/* Paginador fuera y debajo de la card (unificado). */}
      {filtered.length > 0 && (
        <Paginador pagina={pageActual} totalPaginas={totalPages} onCambio={setPage} />
      )}

      {/* ── Modal: Ver detalle ── */}
      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="bg-card rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)]"
            >
              <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-border shrink-0">
                <h3 className="text-lg font-bold text-foreground min-w-0 flex-1 truncate" style={{ fontFamily: SERIF }}>
                  Detalle — {detailItem.nombre}
                </h3>
                <TipoPersonaSelector
                  comoEtiqueta
                  valor={detailItem.tipoPersona ?? ""}
                  className="ml-auto shrink-0"
                />
                <button
                  onClick={() => setDetailItem(null)}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0">
                <DetalleContenido s={detailItem} cls={disabledCls} />
              </div>
              <div className="flex justify-end px-6 py-4 border-t border-border shrink-0">
                <button
                  onClick={() => setDetailItem(null)}
                  className="px-5 h-10 bg-muted rounded-xl text-sm font-semibold text-foreground hover:bg-border cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
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
