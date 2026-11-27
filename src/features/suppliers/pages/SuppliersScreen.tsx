import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, AlertCircle, ArrowLeft, Truck } from "lucide-react";
import { toast } from "sonner";
import { ordenarPorIdDescendente } from "@/shared/utils/sortById";
import { ConfirmDeleteModal } from "@/shared/components/ConfirmDeleteModal";
// Los filtros y validadores de escritura viven en `useProveedorForm` (los usa
// también el formulario compartido de Orden de Compra y Compra).
import { useProveedorForm, formatoNit, siguienteProveedorId, nombreGuardado, datosNuevosProveedor, contactoGuardado, type TipoPersona, type TipoDocumento, type TipoSociedad, type ProveedorFormValues } from "@/features/suppliers/hooks/useSupplierForm";
import { ProveedorFormCampos } from "@/features/suppliers/components/SupplierForm";
import { TipoPersonaSelector } from "@/features/suppliers/components/PersonTypeSelector";
import {
  EstadoSelect,
  ESTADO_ACTIVO_COLOR,
  ESTADO_INACTIVO_COLOR,
  type EstadoOption,
} from "@/shared/components/StatusSelect";
import { EstadoHistorialTooltip } from "@/features/purchases/components/StatusHistoryTooltip";
import type { ProveedorRef } from "@/features/purchase-orders/pages/PurchaseOrdersScreen";
import {
  actualizarProveedor,
  cambiarEstadoProveedor,
  crearProveedor,
  eliminarProveedor,
  mensajeErrorProveedores,
} from "@/features/suppliers/services/suppliersApi";
import { AvisoBanner } from "@/shared/components/panel/NoticeBanner";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";
import { BotonRuta } from "@/shared/components/buttons/BreadcrumbButton";
import { BuscadorGrande } from "@/shared/components/panel/LargeSearch";
import { DatosDetalle } from "@/shared/components/panel/DetailData";
import { DialogoConfirmacion } from "@/shared/components/panel/ConfirmDialog";
import { EncabezadoPagina } from "@/shared/components/panel/PageHeader";
import { EstadoPill, type TonoPill } from "@/shared/components/panel/StatusPill";
import { PaginadorGrande } from "@/shared/components/panel/LargePaginator";
import { SeccionFormulario } from "@/shared/components/panel/FormSection";
import { VacioEstado } from "@/shared/components/panel/EmptyState";

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
          <button onClick={onCancel} className="flex-1 py-3 max-md:min-h-11 border border-border rounded-xl font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-3 max-md:min-h-11 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors active:scale-95 cursor-pointer">Sí, confirmar</button>
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
 * Cuerpo del detalle: pinta EXACTAMENTE los campos que pide cada tipo de
 * persona (misma sección y mismo orden que el formulario), así lo que se guardó
 * es lo que se ve. Los campos sin dato salen "—". Los proveedores antiguos sin
 * tipo siguen mostrando el bloque de contacto viejo.
 */
function DetalleContenido({ s }: { s: Supplier }) {
  const esNatural = s.tipoPersona === "Persona Natural";
  const esJuridica = s.tipoPersona === "Persona Jurídica";
  const v = (x?: string) => (x ?? "").trim() || "—";
  const nombreCompleto = [s.nombres ?? "", s.apellidos ?? ""]
    .map(x => x.trim())
    .filter(Boolean)
    .join(" ") || (s.nombre ?? "");
  const documento = (tipo?: string, numero?: string) =>
    [tipo, numero].map(x => (x ?? "").trim()).filter(Boolean).join(" ") || "—";

  return (
    <div className="grid gap-5">
      {esNatural && (
        <>
          <SeccionFormulario titulo="Datos del proveedor">
            <DatosDetalle datos={[
              { etiqueta: "Nombre completo", valor: v(nombreCompleto) },
              { etiqueta: "Documento", valor: documento(s.tipoDocumento, s.numeroDocumento) },
            ]} />
          </SeccionFormulario>
          <SeccionFormulario titulo="Con quién hablar para pedir">
            <DatosDetalle datos={[
              { etiqueta: "Teléfono", valor: v(s.telefono) },
              { etiqueta: "Correo", valor: v(s.email) },
              { etiqueta: "Dirección", valor: v(s.direccion) },
            ]} />
          </SeccionFormulario>
        </>
      )}

      {esJuridica && (
        <>
          <SeccionFormulario titulo="Datos de la empresa">
            <DatosDetalle datos={[
              /* En Jurídica el nombre guardado ES la razón social. */
              { etiqueta: "Razón social", valor: v(s.nombre) },
              { etiqueta: "Nombre comercial", valor: v(s.nombreComercial) },
              { etiqueta: "NIT", valor: formatoNit(s.nit) || "—" },
              { etiqueta: "Tipo de sociedad", valor: v(s.tipoSociedad) },
              {
                etiqueta: "Cámara de Comercio",
                valor: s.camaraComercioArchivo ? (
                  <a
                    href={s.camaraComercioArchivo}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline break-all"
                    title={s.camaraComercioNombre}
                  >
                    {s.camaraComercioNombre || "Ver el archivo"}
                  </a>
                ) : v(s.camaraComercioNombre),
              },
              { etiqueta: "Fecha de la Cámara de Comercio", valor: v(s.fechaExpedicionCamara) },
            ]} />
          </SeccionFormulario>
          <SeccionFormulario titulo="Representante legal">
            <DatosDetalle datos={[
              {
                etiqueta: "Nombre",
                valor: v([s.repLegalNombres ?? "", s.repLegalApellidos ?? ""].map(x => x.trim()).filter(Boolean).join(" ")),
              },
              { etiqueta: "Documento", valor: documento(s.repLegalTipoDocumento, s.repLegalNumeroDocumento) },
              { etiqueta: "Celular", valor: v(s.repLegalTelefono) },
              { etiqueta: "Correo", valor: v(s.repLegalEmail) },
            ]} />
          </SeccionFormulario>
          <SeccionFormulario titulo="Con quién hablar para pedir">
            <DatosDetalle datos={[
              { etiqueta: "Asesor", valor: v(s.contactoNombre || s.asesorComercial) },
              { etiqueta: "Teléfono", valor: v(s.contactoTelefono || s.telefono) },
              { etiqueta: "Teléfono fijo", valor: v(s.contactoTelefonoFijo) },
              { etiqueta: "Correo", valor: v(s.contactoEmail || s.email) },
              { etiqueta: "Dirección", valor: v(s.direccion) },
            ]} />
          </SeccionFormulario>
        </>
      )}

      {/* Proveedor antiguo sin tipo de persona registrado. */}
      {!esNatural && !esJuridica && (
        <SeccionFormulario titulo="Datos del proveedor">
          <DatosDetalle datos={[
            { etiqueta: "Nombre", valor: v(s.nombre) },
            { etiqueta: "Asesor", valor: v(s.asesorComercial) },
            { etiqueta: "Teléfono", valor: v(s.telefono) },
            { etiqueta: "Correo", valor: v(s.email) },
            { etiqueta: "Dirección", valor: v(s.direccion) },
          ]} />
        </SeccionFormulario>
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
            <button onClick={onClose} className="p-1.5 max-md:p-3.5 max-md:-m-2 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="px-5 py-4 space-y-4">{children}</div>
          <div className="flex gap-3 px-5 py-4 border-t border-border">
            <button onClick={onClose} className="flex-1 py-2.5 max-md:min-h-11 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">Cancelar</button>
            <button onClick={onConfirm} className="flex-1 py-2.5 max-md:min-h-11 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">{confirmLabel}</button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

import type { OrdenCompra, GestionCompra } from "@/features/purchase-orders/pages/PurchaseOrdersScreen";

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
  /** Mensaje del servidor cuando no deja borrar (tiene historial). */
  const [bloqueoMensaje, setBloqueoMensaje] = useState("");
  const [confirmToggleId, setConfirmToggleId] = useState<string | null>(null);
  const [form, setForm] = useState(emptySupplier());

  const [page, setPage] = useState(1);
  // 5 proveedores por página (unificado con el resto de listados).
  const PER_PAGE = 10;

  // Nota: La lógica anterior que consultaba si el proveedor tenía compras u
  // órdenes asociadas para decidir si se podían editar el NIT y el nombre fue
  // eliminada. Ahora el NIT y el nombre NUNCA se pueden editar después de creado
  // el proveedor, tenga o no compras u órdenes asociadas.

  const filtered = useMemo(
    () => ordenarPorIdDescendente(suppliers.filter(s =>
      s.nombre.toLowerCase().includes(search.toLowerCase()) ||
      s.nit.toLowerCase().includes(search.toLowerCase()) ||
      // Los campos de contacto son opcionales en el modelo (Persona Natural no
      // los pide): se buscan sobre "" para no romper con un registro sin ellos.
      (s.telefono ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.asesorComercial ?? "").toLowerCase().includes(search.toLowerCase()) ||
      s.estado.toLowerCase().includes(search.toLowerCase())
    ), (supplier) => supplier.id),
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

  const disabledCls = "w-full px-3 py-2.5 max-md:min-h-11 bg-muted/40 rounded-xl border border-border text-sm text-muted-foreground cursor-not-allowed select-none";

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
    if (editForm.enfocarPrimeroInvalido(["nit", "nombre", "tipoDocumento", "numeroDocumento", "nombreCompleto", "razonSocial"])) {
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
      // Se explica en un diálogo con la opción de desactivarlo.
      setBloqueoMensaje(mensajeErrorProveedores(error, "No se pudo eliminar el proveedor."));
      setDeleteItem(null);
      setBloqueoItem(s);
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

  const tonoOrden: Record<string, TonoPill> = { Borrador: "gris", Enviado: "azul", Completado: "verde", Anulado: "rojo" };
  const borrarDesdeDetalle = async (s: Supplier) => {
    await handleDelete(s);
    setDetailItem(cur => (cur?.id === s.id ? null : cur));
  };

  // Confirmaciones (se pintan en el detalle y en la lista).
  const supToggle = confirmToggleId ? suppliers.find(s => s.id === confirmToggleId) ?? null : null;
  const dialogos = (
    <>
      <DialogoConfirmacion
        abierto={!!supToggle}
        onCambiarAbierto={a => { if (!a) setConfirmToggleId(null); }}
        titulo={supToggle?.estado === "activo" ? `¿Desactivar a ${supToggle?.nombre}?` : `¿Activar a ${supToggle?.nombre ?? ""}?`}
        queVaAPasar={supToggle?.estado === "activo"
          ? ["Ya no va a salir para hacerle pedidos", "Sus órdenes y facturas quedan guardadas", "Lo puedes volver a activar"]
          : ["Vuelve a salir para hacerle pedidos", "Sus órdenes y facturas siguen igual"]}
        textoSeguro={supToggle?.estado === "activo" ? "No, dejarlo como está" : "No, dejarlo desactivado"}
        textoAccion={supToggle?.estado === "activo" ? "Sí, desactivar" : "Sí, activar"}
        onConfirmar={() => { if (confirmToggleId) void applyToggleEstado(confirmToggleId); }}
      />
      {bloqueoItem ? (
        <DialogoConfirmacion
          variante="bloqueo"
          abierto
          onCambiarAbierto={a => { if (!a) { setBloqueoItem(null); setBloqueoMensaje(""); } }}
          titulo={`No se puede borrar a ${bloqueoItem.nombre}`}
          porQueNo={[
            bloqueoMensaje || "Tiene pedidos o compras registrados",
            "Lo que ya tiene historial no se borra: se desactiva y queda guardado",
          ]}
          textoAlternativa={bloqueoItem.estado === "activo" ? "Desactivarlo" : undefined}
          onAlternativa={() => setConfirmToggleId(bloqueoItem.id)}
        />
      ) : (
        <DialogoConfirmacion
          abierto={!!deleteItem}
          onCambiarAbierto={a => { if (!a) setDeleteItem(null); }}
          titulo={`¿Borrar a ${deleteItem?.nombre ?? ""}?`}
          queVaAPasar={["Se borra para siempre", "No se puede deshacer"]}
          textoAccion="Sí, borrar"
          onConfirmar={() => { if (deleteItem) void borrarDesdeDetalle(deleteItem); }}
        />
      )}
    </>
  );

  // ── Formulario: agregar o cambiar (pantalla completa) ──
  if (enPantalla) {
    // Formulario activo (alta o edición): el selector del paso 1 lee y escribe su tipo de persona.
    const formActivo = enAlta || !editItem ? proveedorForm : editForm;
    return (
      <div className="pn-contenido" style={{ maxWidth: 1000 }}>
        <BotonRuta>
          <BotonAccion icono={ArrowLeft} onClick={salirDePantalla}>Salir sin guardar</BotonAccion>
        </BotonRuta>
        <EncabezadoPagina
          titulo={enAlta ? "Agregar un proveedor" : `Cambiar datos de ${editItem?.nombre ?? ""}`}
          descripcion={enAlta
            ? "Anota quién es, cómo se le llama y con quién se habla para pedirle."
            : "Aquí cambias los datos del proveedor. El documento o NIT no se puede cambiar."}
        />
        <div className="grid gap-5">
          <SeccionFormulario numero={1} titulo="¿Es empresa o persona?">
            <TipoPersonaSelector
              valor={formActivo.values.tipoPersona}
              disabled={!enAlta}
              onChange={(tipo) => {
                formActivo.marcarTocado("tipoPersona");
                formActivo.setCampo("tipoPersona", tipo);
              }}
              error={formActivo.obtenerError("tipoPersona")}
            />
          </SeccionFormulario>

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

          <div className="pn-dialogo__botones" style={{ justifyContent: "flex-start" }}>
            <BotonAccion variante="normal" onClick={salirDePantalla}>Cancelar</BotonAccion>
            <BotonAccion
              variante="principal"
              disabled={guardando}
              onClick={enAlta ? () => void handleCreate() : () => void handleEdit()}
            >
              {guardando ? "Guardando…" : enAlta ? "Agregar el proveedor" : "Guardar cambios"}
            </BotonAccion>
          </div>
        </div>
      </div>
    );
  }

  // ── Detalle de un proveedor ──
  if (detailItem) {
    const s = detailItem;
    const apagado = s.estado === "inactivo";
    const pedidos = ordenes
      .filter(o => o.proveedor === s.nombre)
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, 5);
    return (
      <div className="pn-contenido" style={{ maxWidth: 1000 }}>
        <BotonRuta>
          <BotonAccion icono={ArrowLeft} onClick={() => setDetailItem(null)}>Volver a la lista</BotonAccion>
        </BotonRuta>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h1 style={{ font: "700 34px/1.15 var(--font-titulo)", margin: 0, overflowWrap: "anywhere" }}>{s.nombre}</h1>
          <EstadoPill tono={apagado ? "gris" : "verde"}>{apagado ? "Apagado" : "Activo"}</EstadoPill>
          <TipoPersonaSelector comoEtiqueta valor={s.tipoPersona ?? ""} />
        </div>

        <div className="pn-dialogo__botones" style={{ justifyContent: "flex-start", marginBottom: 20 }}>
          {canEdit && (
            <BotonAccion variante="principal" onClick={() => setEditItem({ ...s })}>Cambiar datos</BotonAccion>
          )}
          {canEdit && (
            <BotonAccion variante={apagado ? "bien" : "normal"} onClick={() => setConfirmToggleId(s.id)}>
              {apagado ? "Activar" : "Desactivar"}
            </BotonAccion>
          )}
          {canDelete && (
            <BotonAccion variante="peligro" onClick={() => alPedirEliminar(s)}>Borrar</BotonAccion>
          )}
        </div>

        <DetalleContenido s={s} />

        {pedidos.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <SeccionFormulario titulo="Últimos pedidos">
              <div className="pn-permisos">
                {pedidos.map(o => (
                  <div key={o.id} className="pn-permisos__fila" style={{ gridTemplateColumns: "minmax(120px,1fr) minmax(0,1fr) auto auto" }}>
                    <strong>Orden #{o.id.replace(/^\D+-?/, "") || o.id}</strong>
                    <span>{o.fecha}</span>
                    <span>{o.total != null ? `$${o.total.toLocaleString("es-CO")}` : ""}</span>
                    <EstadoPill tono={tonoOrden[o.estado] ?? "gris"}>{o.estado}</EstadoPill>
                  </div>
                ))}
              </div>
            </SeccionFormulario>
          </div>
        )}
        {dialogos}
      </div>
    );
  }

  // ── Lista ──
  return (
    <div className="pn-contenido">
      <EncabezadoPagina
        titulo="Proveedores"
        descripcion="Las empresas y personas que le venden a La Sirena, con su teléfono para llamarlos"
        acciones={canCreate && (
          <BotonAccion variante="principal" icono={Plus} onClick={() => { setForm(emptySupplier()); setShowCreate(true); }}>
            Agregar un proveedor
          </BotonAccion>
        )}
      />

      <div style={{ marginBottom: 24 }}>
        <BuscadorGrande
          etiqueta="Buscar un proveedor"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Escribe el nombre, el NIT o el nombre del asesor"
        />
      </div>

      {cargando ? (
        <p role="status" className="pn-nota">Cargando los proveedores…</p>
      ) : errorCarga ? (
        <AvisoBanner
          titulo="No pudimos cargar los proveedores"
          boton={onReintentar ? <BotonAccion onClick={onReintentar}>Intentar de nuevo</BotonAccion> : undefined}
        >
          {errorCarga}
        </AvisoBanner>
      ) : filtered.length === 0 ? (
        <VacioEstado icono={Truck} titulo="No encontramos ningún proveedor">
          Revisa cómo lo escribiste o agrega uno nuevo con «Agregar un proveedor».
        </VacioEstado>
      ) : (
        <div className="pn-prov-grid">
          {paged.map(s => {
            const apagado = s.estado === "inactivo";
            return (
              <article key={s.id} className="pn-tarjeta">
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h2 className="pn-tarjeta__nombre">{s.nombre}</h2>
                    <EstadoPill tono={apagado ? "gris" : "verde"}>{apagado ? "Apagado" : "Activo"}</EstadoPill>
                  </div>
                  <p className="pn-tarjeta__sub">
                    {s.tipoPersona === "Persona Jurídica" ? "Empresa" : s.tipoPersona === "Persona Natural" ? "Persona" : "Proveedor"} · NIT {formatoNit(s.nit)}
                  </p>
                </div>
                <dl className="pn-tarjeta__datos">
                  <div><dt>Correo</dt><dd>{s.email || (s as Supplier).contactoEmail || "—"}</dd></div>
                  <div><dt>Hablar con</dt><dd>{s.asesorComercial || (s as Supplier).contactoNombre || "—"}</dd></div>
                  <div><dt>Teléfono</dt><dd>{s.telefono || (s as Supplier).contactoTelefono || "—"}</dd></div>
                </dl>
                <div className="pn-tarjeta__botones">
                  <BotonAccion variante="normal" onClick={() => setDetailItem(s)}>Ver todos los datos</BotonAccion>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <PaginadorGrande pagina={pageActual} total={filtered.length} porPagina={PER_PAGE} onCambiar={setPage} />
      {dialogos}
    </div>
  );
}
