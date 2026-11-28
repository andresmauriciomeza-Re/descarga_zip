import { formatearFechaHora } from "@/shared/utils/time";
import React, { useState, useEffect } from "react";
// Bloque 3: el "+ Crear insumo" comparte el mismo catálogo de categorías
// obligatorias (A5.1) que usa Gestión de Insumos.
import type { CategoriaInsumo } from "@/features/supplies/utils/supplies";
import type { Insumo } from "@/features/supplies/utils/supplies";
import type { Producto } from "@/features/products/utils/products";
// Bloque 2: "+ Crear producto" con el mismo modal que Nueva Compra y
// Recepción (reemplaza al NuevoProductoModal local, que se eliminó).
import type { CategoriaProducto } from "@/features/product-categories/utils/product-categories";
import { AnimatePresence } from "motion/react";
// Bloque 3 (A5.2): el modal de Nuevo Insumo usa la MISMA lista de unidades
// (con etiqueta larga) que Crear Insumo en Gestión de Insumos.
// Bloque 3: comparación de nombres (sin tildes ni mayúsculas) y nombre con
// mayúscula inicial, compartidos con Gestión de Insumos y Productos.
import { EstadoHistorialTooltip } from "@/features/purchases/components/StatusHistoryTooltip";
import { Plus, Eye, Pencil, Trash2, ClipboardCheck, AlertTriangle, Lock, Download } from "lucide-react";
import { toast } from "sonner";
import { exportarMultiExcelEstilizado, exportarOrdenesConInsumosExcel, type OrdenConInsumos } from "@/shared/utils/styledExcelExport";
import { aplicarStockCompra, type SetCatalogo } from "@/features/purchases/services/inventory";
import {
  actualizarOrdenCompra,
  cambiarEstadoOrdenCompra,
  crearOrdenCompra,
  mensajeErrorOrdenesCompra,
  obtenerOrdenCompra,
} from "@/features/purchase-orders/services/purchaseOrdersApi";
import { listarCompras } from "@/features/purchases/services/purchasesApi";
import { BotonDescargarExcel } from "@/shared/components/buttons/DownloadExcelButton";
import { SearchInput } from "@/shared/components/SearchInput";
import { ActionIcons } from "@/shared/components/buttons/ActionIcons";
import { Paginador } from "@/shared/components/Paginator";
import { AvisoBanner } from "@/shared/components/panel/NoticeBanner";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";
import { BuscadorGrande } from "@/shared/components/panel/LargeSearch";
import { DialogoConfirmacion } from "@/shared/components/panel/ConfirmDialog";
import { EncabezadoPagina } from "@/shared/components/panel/PageHeader";
import { EstadoPill, type TonoPill } from "@/shared/components/panel/StatusPill";
import { FiltrosChips } from "@/shared/components/panel/FilterChips";
import { PaginadorGrande } from "@/shared/components/panel/LargePaginator";
import { TarjetaFila } from "@/shared/components/panel/RowCard";
import { VacioEstado } from "@/shared/components/panel/EmptyState";
import { usePurchaseOrders } from "@/features/purchase-orders/hooks/usePurchaseOrders";
import { claveEstado, type OrdenCompra, type GestionCompra, type ProveedorRef, type EstadoOrden, type OrdenItem } from "@/features/purchase-orders/utils/purchase-orders";
import { OrdenModal } from "@/features/purchase-orders/components/PurchaseOrderModal";
import { OrdenDetallePageContenido } from "@/features/purchase-orders/components/PurchaseOrderDetailContent";
import { ESTADO_CONFIG, fmtCOP, totalLineaOrden, calcTotal, type OrdenFormData, type NuevoInsumoCreado } from "@/features/purchase-orders/utils/purchase-orders";
import { cargarParaDescarga } from "@/shared/utils/optionalImport";

/**
 * Sólo las órdenes en Borrador se pueden editar: es la condición del lápiz en
 * el listado, del guard de entrada al formulario y de la validación al guardar.
 */
const esBorrador = (estado?: string) => claveEstado(estado) === "borrador";

/** Ancho reservado del botón de editar (p-1.5 + ícono w-4 = 28px) para que,
    en las filas sin lápiz, los iconos [Ver] [Editar] [OC] sigan alineados. */
const SLOT_EDITAR = "block shrink-0 p-1.5 w-7 h-7";


function addDays(d: string, days: number) {
  const dt = new Date(`${d}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Fecha CON hora del último cambio de estado (01/10/2026 8:35 p. m.), la que se
 * muestra bajo el badge en el listado. Las órdenes sin historial caen en su
 * fecha de creación.
 */
function fechaUltimoCambio(o: OrdenCompra): string {
  const historial = o.historialEstados ?? [];
  const ultimo = historial[historial.length - 1];
  return formatearFechaHora(ultimo ? ultimo.fechaHora : o.fecha);
}

/** Construye el Insumo que nace desde "+ Crear insumo": entra al catálogo como
 *  tipo "Insumo" con stocks en cero y CON la categoría elegida en el modal
 *  (bloque 3: antes quedaba vacía y había que reclasificarlo a mano). */
export function insumoDeAlta(ins: NuevoInsumoCreado): Insumo {
  return {
    id: ins.id,
    nombre: ins.nombre,
    unidadMedida: ins.unidadMedida,
    costoUnitario: ins.precioUnitario,
    precioUnitario: ins.precioUnitario,
    iva: ins.iva,
    tipo: "Insumo",
    stockActual: 0,
    stockMinimo: 0,
    categoriaId: ins.categoriaId,
    estado: "activo",
  };
}

// ��������� NUEVA ORDEN COMPRA ��� PÁGINA INDEPENDIENTE ���������������������������������������������������������������������������������������������

interface NuevaOrdenCompraPageProps {
  ordenes: OrdenCompra[];
  setOrdenes: React.Dispatch<React.SetStateAction<OrdenCompra[]>>;
  proveedores: ProveedorRef[];
  setProveedores: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
  insumos: Insumo[];
  /** Punto 3.3: catálogo de productos para el selector "Tipo". */
  productos: Producto[];
  /** Bloque 2: categorías y alta de productos desde "+ Crear producto" (el
   *  callback viene de App y agrega al catálogo del panel). */
  categorias?: CategoriaProducto[];
  onCrearProducto?: (p: Producto) => Promise<Producto>;
  /** Bloque 2.2: categorías de insumos desde la API para el modal de alta. */
  categoriasInsumo?: CategoriaInsumo[];
  /** Punto 5: alta de insumos desde "+ Crear insumo" (catálogo, tipo "Insumo"). */
  setInsumos: React.Dispatch<React.SetStateAction<Insumo[]>>;
  onNuevoProveedor?: (p: ProveedorRef) => void;
  onBack: () => void;
  /** Orden a editar (modo edición). Si no se pasa, es modo creación. */
  orden?: OrdenCompra;
  /** Ítems precargados al llegar desde una orden de producción. */
  initialItems?: OrdenItem[];
}

export function NuevaOrdenCompraPage({
  ordenes,
  setOrdenes,
  proveedores,
  setProveedores,
  insumos,
  productos,
  categorias,
  onCrearProducto,
  categoriasInsumo,
  setInsumos,
  onNuevoProveedor,
  onBack,
  orden,
  initialItems,
}: NuevaOrdenCompraPageProps) {
  const isEdit = !!orden;
  // La orden a editar se relee de `ordenes` por id: App guarda una copia en
  // `ordenAEditar` y podría quedar desfasada si el estado cambia después.
  const ordenViva = isEdit ? (ordenes.find(o => o.id === orden?.id) ?? orden) : undefined;

  // Entrada directa a la edición (deep link, botón guardado, etc.): si la orden
  // ya NO está en Borrador no se pinta el formulario, se avisa y se vuelve al
  // listado. Mismo mensaje que la validación de `handleGuardar`.
  // `onBack` es una flecha inline en App (identidad nueva en cada render), así
  // que las deps son sólo el id y el estado de la orden.
  useEffect(() => {
    if (!ordenViva || esBorrador(ordenViva.estado)) return;
    toast.error("Solo se pueden editar órdenes en estado Borrador");
    onBack();
  }, [orden?.id, ordenViva?.estado]);

  // El insumo creado pasa al catálogo global con los datos confirmados por API.
  const handleCrearInsumo = (ins: Insumo) =>
    setInsumos(prev => [ins, ...prev.filter((existente) => existente.id !== ins.id)]);

  const handleGuardar = async (data: OrdenFormData) => {
    const idProveedor = Number(proveedores.find((p) => p.nombre === data.proveedor)?.id ?? 0);
    if (!idProveedor) {
      toast.error("Elige un proveedor válido para la orden.");
      return;
    }
    const items = data.items.filter((i) => i.idInsumo && i.cantidad > 0);
    try {
      if (isEdit && orden) {
        // Validación backend: solo se puede editar en estado Borrador
        if (!esBorrador(orden.estado)) {
          toast.error("Solo se pueden editar órdenes en estado Borrador");
          return;
        }
        const actualizada = await actualizarOrdenCompra(orden.id, {
          id_proveedor: idProveedor,
          items,
        });
        // El estado se cambia por su transición (PATCH /estado), no al editar.
        const trasEstado =
          data.estado !== actualizada.estado
            ? await cambiarEstadoOrdenCompra(actualizada.id, data.estado as EstadoOrden)
            : actualizada;
        setOrdenes(prev => prev.map(o => o.id === orden.id ? trasEstado : o));
        toast.success(`OC ${orden.id} actualizada`);
      } else {
        const creada = await crearOrdenCompra({
          id_proveedor: idProveedor,
          estado_inicial: "Borrador",
          items,
        });
        setOrdenes(prev => [creada, ...prev]);
        toast.success(`OC ${creada.id} guardada como ${creada.estado}`);
      }
      onBack();
    } catch (error) {
      toast.error(mensajeErrorOrdenesCompra(error, "No se pudo guardar la orden."));
    }
  };

  const handleNuevoProveedor = (p: ProveedorRef) => {
    // Actualizar el estado global de proveedores en App.tsx para que el
    // listado de Proveedores lo vea inmediatamente.
    setProveedores(prev => [p, ...prev.filter(x => x.id !== p.id && x.nombre.toLowerCase() !== p.nombre.toLowerCase())]);
    onNuevoProveedor?.(p);
    return p.nombre;
  };

  return (
    <OrdenModal
      mode={isEdit ? "edit" : "create"}
      tipo="orden"
      orden={orden}
      initialItems={isEdit ? undefined : initialItems}
      // Pantalla completa dentro del panel (no modal): cabecera con ← y
      // pie Cancelar/Guardar siempre visibles, sin scroll de página.
      fullPage
      proveedores={proveedores}
      insumos={insumos}
      productos={productos}
      // Bloque 2: "+ Crear producto" con las categorías del panel.
      categorias={categorias}
      categoriasInsumo={categoriasInsumo}
      onCrearProducto={onCrearProducto}
      onClose={onBack}
      onGuardar={handleGuardar}
      onNuevoProveedor={handleNuevoProveedor}
      onCrearInsumo={handleCrearInsumo}
    />
  );
}

// ��������� MAIN SCREEN ������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

interface Props {
  ordenes: OrdenCompra[];
  setOrdenes: React.Dispatch<React.SetStateAction<OrdenCompra[]>>;
  gestiones: GestionCompra[];
  setGestiones: React.Dispatch<React.SetStateAction<GestionCompra[]>>;
  proveedores: ProveedorRef[];
  setProveedores: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
  insumos: Insumo[];
  setInsumos?: React.Dispatch<React.SetStateAction<Insumo[]>>;
  onNuevoProveedor?: (p: ProveedorRef) => void;
  onAbrirRecepcion?: (orden: OrdenCompra) => void;
  onVerDetalle: (orden: OrdenCompra) => void;
  onNuevaOrden: () => void;
  onEditarOrden: (orden: OrdenCompra) => void;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  canCreate?: boolean;
  canEdit?: boolean;
  canExportExcel?: boolean;
  /** Punto 3.2: catálogo de Productos para el buscador "Producto" del modal
   *  que se abre desde este listado (antes llegaba `undefined` y salía vacío). */
  productos?: Producto[];
  /** Punto B7: sin él la anulación se igual no revierte el stock de
   *  productos de sus facturas (ver `handleAnularOrden`). */
  setProductos?: SetCatalogo<Producto>;
  onRecargarCatalogo?: () => Promise<void>;
  /** Recarga el listado COMPLETO de órdenes tras un cambio de estado (p. ej.
   *  marcar Completado a mano): el badge y el botón "OC" salen del backend. */
  onRecargarOrdenes?: () => Promise<void>;
  /** Bloque 2: categorías y alta de productos desde "+ Crear producto" del
   *  OrdenModal que abre este listado. */
  categorias?: CategoriaProducto[];
  onCrearProducto?: (p: Producto) => Promise<Producto>;
  /** Bloque 2.2: categorías de insumos desde la API para el modal de alta. */
  categoriasInsumo?: CategoriaInsumo[];
  /** Carga de la lista desde la API y su error ("Reintentar"): nunca datos de
      ejemplo cuando falla. */
  cargando?: boolean;
  errorCarga?: string | null;
  onReintentar?: () => void;
}

export function OrdenCompraScreen({
  ordenes, setOrdenes, gestiones, setGestiones,
  proveedores, setProveedores,
   insumos, setInsumos, productos, setProductos, onRecargarCatalogo, onRecargarOrdenes, categorias, categoriasInsumo, onCrearProducto, onNuevoProveedor, onAbrirRecepcion, onVerDetalle, onNuevaOrden, onEditarOrden,
  cargando = false,
  errorCarga,
  onReintentar,
  page, setPage,
  canCreate = true, canEdit = true,
  canExportExcel = true,
}: Props) {
  const { search, setSearch, chipEstado, setChipEstado, getFacturas, filtered, PER_PAGE, pageActual, paged } = usePurchaseOrders(gestiones, ordenes, proveedores, page, setPage);
  const [modal, setModal] = useState<{ mode: "create" | "edit" | "view"; orden?: OrdenCompra } | null>(null);
  const [recepcionOrden, setRecepcionOrden] = useState<OrdenCompra | null>(null);
  const [sendConfirm, setSendConfirm] = useState<OrdenCompra | null>(null);
  const [anularConfirm, setAnularConfirm] = useState<OrdenCompra | null>(null);
  /** Motivo de la anulación (lo exige el servidor). */
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [anulandoOrden, setAnulandoOrden] = useState(false);
  const [estadoConfirm, setEstadoConfirm] = useState<{ id: string; from: EstadoOrden; next: EstadoOrden } | null>(null);






  /** Facturas (compras) registradas para una orden. */
  const facturasDeOrden = (oid: string) => gestiones.filter((g) => g.ordenId === oid);

  /** Ids de insumos ya registrados en compras no anuladas de la orden. */
  const registradosEnOrden = (oid: string) => {
    const set = new Set<string>();
    for (const g of gestiones) {
      if (g.ordenId !== oid) continue;
      if (g.estado === "Anulado") continue;
      for (const it of g.items ?? []) set.add(it.idInsumo);
    }
    return set;
  };

  /** id_proveedor de la API desde el nombre que usa el formulario (el
      selector de proveedor guarda el nombre, como siempre). */
  const idProveedorDeNombre = (nombre: string): number => {
    const p = proveedores.find((x) => x.nombre === nombre);
    return p ? Number(p.id) || 0 : 0;
  };

  const handleGuardarOrden = async (data: OrdenFormData) => {
    const idProveedor = idProveedorDeNombre(data.proveedor);
    if (!idProveedor) {
      toast.error("Elige un proveedor válido para la orden.");
      return;
    }
    const items = data.items.filter((i) => i.idInsumo && i.cantidad > 0);
    try {
      if (modal?.mode === "create") {
        const creada = await crearOrdenCompra({
          id_proveedor: idProveedor,
          estado_inicial: "Borrador",
          items,
        });
        setOrdenes(p => [creada, ...p]);
        toast.success(`OC ${creada.id} guardada como ${creada.estado}`);
      } else if (modal?.mode === "edit" && modal.orden) {
        // Validación de backend: solo se puede editar en estado Borrador
        if (!esBorrador(modal.orden.estado)) {
          toast.error("Solo se pueden editar órdenes en estado Borrador");
          return;
        }
        // El estado no se edita desde el formulario: si la orden queda
        // "Enviado" se cambia por su transición (PATCH /estado).
        const actualizada = await actualizarOrdenCompra(modal.orden.id, {
          id_proveedor: idProveedor,
          items,
        });
        const trasEstado =
          data.estado !== actualizada.estado
            ? await cambiarEstadoOrdenCompra(actualizada.id, data.estado as EstadoOrden)
            : actualizada;
        setOrdenes(p => p.map(o => o.id === modal.orden!.id ? trasEstado : o));
        toast.success(`OC ${trasEstado.id} actualizada`);
      }
      setModal(null);
    } catch (error) {
      // 409/400 del servidor: el mensaje se muestra y no se cambia nada.
      toast.error(mensajeErrorOrdenesCompra(error, "No se pudo guardar la orden."));
    }
  };

  const handleNuevoProveedorLocal = (p: ProveedorRef): string => {
    setProveedores(prev => [p, ...prev.filter(x => x.id !== p.id && x.nombre.toLowerCase() !== p.nombre.toLowerCase())]);
    onNuevoProveedor?.(p);
    return p.nombre;
  };

  const handleEnviarOrden = async (o: OrdenCompra) => {
    try {
      const actualizada = await cambiarEstadoOrdenCompra(o.id, "Enviado");
      setOrdenes(p => p.map(x => x.id === o.id ? actualizada : x));
      toast.success(`OC ${o.id} enviada al proveedor`);
    } catch (error) {
      toast.error(mensajeErrorOrdenesCompra(error, "No se pudo enviar la orden."));
    } finally {
      setSendConfirm(null);
    }
  };

  const handleAnularOrden = async (o: OrdenCompra, motivoDelDialogo?: string) => {
    if (anulandoOrden) return;
    const motivo = (motivoDelDialogo ?? motivoAnulacion ?? "").trim();
    if (!motivo) {
      toast.error("Debes escribir el motivo de la anulación");
      return;
    }
    setAnulandoOrden(true);
    try {
      // El backend anula la orden y SUS compras devolviendo el stock que
      // hubieran sumado (y recalculando la recepción). Un 409 muestra su
      // mensaje y no se cambia nada.
      // Decisión D1: se anula la orden con su motivo; las compras Recibido y el stock no se tocan.
      const actualizada = await cambiarEstadoOrdenCompra(o.id, "Anulado", motivo);
      setOrdenes((prev) => prev.map((x) => (x.id === o.id ? actualizada : x)));
      setOrdenes((prev) => prev.map((x) => (x.id === o.id ? actualizada : x)));
      // Las compras asociadas quedaron "Anulado" en la base: se recargan.
      // Las compras asociadas conservan su estado (Decisión D1).
      // El stock del catálogo no cambia al anular la orden.
      toast.success(`OC ${o.id} anulada`);
      setAnularConfirm(null);
      setRecepcionOrden(null);
      setMotivoAnulacion("");
    } catch (error) {
      toast.error(mensajeErrorOrdenesCompra(error, "No se pudo anular la orden."));
    } finally {
      setAnulandoOrden(false);
    }
  };

  const handleCambiarEstado = async (id: string, next: EstadoOrden) => {
    // "Anulado" siempre pide motivo: se abre su modal en vez de cambiar el
    // estado a pelo (el servidor exige el motivo).
    if (next === "Anulado") {
      setEstadoConfirm(null);
      setMotivoAnulacion("");
      setAnularConfirm(ordenes.find((o) => o.id === id) ?? null);
      return;
    }
    try {
      const actualizada = await cambiarEstadoOrdenCompra(id, next);
      setOrdenes(p => p.map(x => x.id === id ? actualizada : x));
      // La lista completa se resincroniza con GET /ordenes-compra: así el
      // badge (p. ej. Completado a mano) y el botón "OC" quedan tal cual los
      // calcula el backend, sin recargar la página.
      await onRecargarOrdenes?.();
      toast.success(`Estado cambiado a: ${next}`);
    } catch (error) {
      toast.error(mensajeErrorOrdenesCompra(error, "No se pudo cambiar el estado."));
    } finally {
      setEstadoConfirm(null);
    }
  };

  const handleDownload = async () => {
    // Exportar todas las órdenes (filtradas) con sus insumos agrupados en una sola hoja
    const ordenesParaExcel: OrdenConInsumos[] = filtered.map(o => {
      // Buscar facturas de esta orden para obtener el número de factura de los insumos no solicitados
      const facturasOrden = gestiones.filter(g => g.ordenId === o.id && g.numeroFactura);
      // Mapa de idInsumo -> numeroFactura para insumos no solicitados
      const extraFacturaMap = new Map<string, string>();
      for (const f of facturasOrden) {
        for (const it of f.items ?? []) {
          if (it.esNoSolicitado) {
            extraFacturaMap.set(it.idInsumo, f.numeroFactura);
          }
        }
      }
      
      return {
        id: o.id,
        proveedor: o.proveedor,
        fecha: formatearFechaHora(o.fecha),
        estado: o.estado,
        items: o.items.map(item => ({
          nombre: item.nombre,
          cantidad: item.cantidad,
          unidad: item.unidad,
          costoUnitario: item.costoUnitario,
          iva: item.iva,
        })),
        recepcion: o.recepcion?.itemsExtra && o.recepcion.itemsExtra.length > 0
          ? {
              itemsExtra: o.recepcion.itemsExtra.map(item => ({
                nombre: item.nombre,
                cantidad: item.cantidadRecibida,
                unidad: item.unidad,
                costoUnitario: item.costoUnitario,
                iva: item.iva ?? 0,
                facturaNumero: extraFacturaMap.get(item.idInsumo) || "",
              })),
            }
          : undefined,
      };
    });
    
    await exportarOrdenesConInsumosExcel({
      ordenes: ordenesParaExcel,
      proveedores,
      nombreArchivo: "ordenes-de-compra",
    });
    toast.success("Excel descargado");
  };

  // PDF generation for individual order
  const handleDownloadPDF = (orden: OrdenCompra) => {
    // Dynamic import of jsPDF to avoid SSR issues
    cargarParaDescarga(() => import("jspdf")).then(({ jsPDF }) => {
      cargarParaDescarga(() => import("jspdf-autotable")).then(() => {
        const doc = new jsPDF();
        const prov = proveedores.find(p => p.nombre === orden.proveedor);
        const nit = orden.proveedorNit || prov?.nit || "";
        const asesor = prov?.asesorComercial ?? "";
        const telefono = prov?.telefono ?? "";
        const email = prov?.email ?? "";
        
        // Header - La Sirena
        doc.setFontSize(20);
        doc.setTextColor(220, 38, 38); // Red color
        doc.text("La Sirena Pizza", 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("S.I.V.PRO - Sistema de Gestión", 14, 26);
        
        // Order info
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Orden de Compra N° ${orden.id}`, 14, 36);
        doc.text(`Fecha: ${orden.fecha}`, 14, 42);
        doc.text(`Estado: ${orden.estado}`, 14, 48);
        
        // Provider info
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text("Proveedor:", 14, 56);
        doc.setFont(undefined, 'normal');
        doc.text(orden.proveedor, 14, 62);
        if (nit) doc.text(`NIT: ${nit}`, 14, 68);
        if (asesor) doc.text(`Asesor: ${asesor}`, 14, 74);
        if (telefono) doc.text(`Tel: ${telefono}`, 14, 80);
        if (email) doc.text(`Email: ${email}`, 14, 86);
        
        // Items table
        const tableData = orden.items.map(item => [
          item.nombre,
          item.cantidad.toString(),
          item.unidad,
          new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(item.costoUnitario),
          `${item.iva ?? 0}%`,
          new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(totalLineaOrden(item)),
        ]);
        
        (doc as any).autoTable({
          startY: 95,
          head: [["Insumo", "Cantidad", "Unidad", "Monto unit.", "IVA %", "Subtotal"]],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [220, 38, 38], textColor: 255 },
          styles: { fontSize: 9 },
        });
        
        // Totals
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        const total = calcTotal(orden.items);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`Total: ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(total)}`, 14, finalY);
        
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("La Sirena Pizza - Medellín, Colombia - S.I.V.PRO", 105, 290, { align: "center" });
        
        doc.save(`orden-compra-${orden.id}-${new Date().toLocaleDateString("en-CA")}.pdf`);
        toast.success("PDF generado");
      });
    }).catch(() => {
      toast.error("Error generando PDF. Instale jspdf y jspdf-autotable.");
    });
  };

  const numeroOrden = (id: string) => id.replace(/^\D+-?0*/, "") || id;
  const tonoEstado: Record<EstadoOrden, TonoPill> = { Borrador: "gris", Enviado: "azul", Completado: "verde", Anulado: "rojo" };
  const resumenPedido = (o: OrdenCompra) => {
    const nombres = o.items.map((i) => i.nombre);
    return nombres.length <= 3 ? nombres.join(", ") : `${nombres.slice(0, 3).join(", ")} y ${nombres.length - 3} más`;
  };
  const dialogoEstado = estadoConfirm;
  const ordenAnular = anularConfirm;

  return (
    <div className="pn-contenido">
      <EncabezadoPagina
        titulo="Orden de Compra"
        descripcion="Los pedidos que La Sirena le hace a sus proveedores y si ya llegó la mercancía"
        acciones={
          <>
            {canExportExcel && <BotonAccion icono={Download} onClick={handleDownload}>Descargar en Excel</BotonAccion>}
            {canCreate && (
              <BotonAccion variante="principal" icono={Plus} onClick={() => { onNuevaOrden(); }}>
                Hacer un pedido a un proveedor
              </BotonAccion>
            )}
          </>
        }
      />

      {/* Cómo se lee el estado de una orden */}
      <ol className="pn-pasos" aria-label="Estados de una orden">
        <li><strong>1 · Borrador:</strong> lo estás armando</li>
        <li aria-hidden="true">›</li>
        <li><strong>2 · Enviado:</strong> el proveedor ya lo tiene</li>
        <li aria-hidden="true">›</li>
        <li><strong>3 · Completado:</strong> llegó todo con su factura</li>
      </ol>

      <div className="grid gap-4 mb-6">
        <BuscadorGrande
          etiqueta="Buscar una orden"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Escribe el número, el proveedor, el NIT o la factura"
        />
        <FiltrosChips
          valor={chipEstado}
          onChange={v => { setChipEstado(v); setPage(1); }}
          opciones={[
            { valor: "todas", etiqueta: "Todas" },
            { valor: "enviado", etiqueta: "Por llegar", contador: ordenes.filter(o => o.estado === "Enviado").length },
            { valor: "borrador", etiqueta: "Sin enviar", contador: ordenes.filter(o => o.estado === "Borrador").length },
            { valor: "completado", etiqueta: "Completadas" },
            { valor: "anulado", etiqueta: "Anuladas" },
          ]}
        />
      </div>

      {cargando ? (
        <p role="status" className="pn-nota">Cargando las órdenes…</p>
      ) : errorCarga ? (
        <AvisoBanner
          titulo="No pudimos cargar las órdenes"
          boton={onReintentar ? <BotonAccion onClick={onReintentar}>Intentar de nuevo</BotonAccion> : undefined}
        >
          {errorCarga}
        </AvisoBanner>
      ) : paged.length === 0 ? (
        <VacioEstado icono={ClipboardCheck} titulo="No encontramos ninguna orden">
          Revisa cómo lo escribiste, cambia el filtro o haz un pedido nuevo.
        </VacioEstado>
      ) : (
        <div className="pn-lista">
          {paged.map(o => {
            const facturas = getFacturas(o.id);
            const totalOrden = o.total ?? calcTotal(o.items);
            const totalFacturado = o.facturado ?? facturas.reduce((s, f) => s + f.valorTotal, 0);
            const porFacturar = o.porFacturar ?? Math.max(0, totalOrden - totalFacturado);
            const prov = proveedores.find(p => p.nombre === o.proveedor);
            const nit = o.proveedorNit || prov?.nit || "";
            const numerosFactura = facturas.length > 0 ? facturas.map(f => f.numeroFactura) : (o.facturas ?? []);
            const puedeRecibir = o.estado === "Enviado" && o.items.some(item => !item.facturado && !registradosEnOrden(o.id).has(item.idInsumo));
            const finalizada = o.estado === "Completado" || o.estado === "Anulado";
            return (
              <TarjetaFila
                key={o.id}
                pre={`Orden #${numeroOrden(o.id)} · ${o.fecha}`}
                nombre={o.proveedor}
                detalle={
                  <>
                    {nit ? `NIT ${nit}` : "Sin NIT"}
                    <br />Pidió: {resumenPedido(o) || "—"}
                  </>
                }
                datos={[
                  { etiqueta: "Total", valor: <span style={{ font: "700 1.5rem var(--font-titulo)" }}>{fmtCOP(totalOrden)}</span> },
                  {
                    etiqueta: "Factura",
                    valor: numerosFactura.length > 0
                      ? <>Factura {numerosFactura.join(", ")}{porFacturar > 0 && <><br /><span style={{ color: "var(--ambar-texto)" }}>Por facturar {fmtCOP(porFacturar)}</span></>}</>
                      : o.estado === "Borrador" || o.estado === "Anulado" ? "—" : "Falta la factura",
                  },
                ]}
                estado={
                  <div className="grid gap-1 justify-items-start">
                    <EstadoPill tono={tonoEstado[o.estado]}>{o.estado}</EstadoPill>
                    <span style={{ fontSize: "1rem", color: "var(--gris-texto)" }}>{fechaUltimoCambio(o)}</span>
                    <EstadoHistorialTooltip historial={o.historialEstados ?? []} estadoColors={ESTADO_CONFIG}>
                      <button type="button" className="pn-boton pn-boton--normal" style={{ minHeight: "2.75rem", fontSize: "1rem" }}>Ver historial</button>
                    </EstadoHistorialTooltip>
                  </div>
                }
                acciones={
                  <>
                    {o.estado === "Borrador" && (
                      <BotonAccion variante="principal" onClick={() => setEstadoConfirm({ id: o.id, from: o.estado, next: "Enviado" })}>
                        Enviar al proveedor
                      </BotonAccion>
                    )}
                    {puedeRecibir && (
                      <BotonAccion variante="principal" onClick={() => onAbrirRecepcion?.(o)}>Ya llegó: recibir</BotonAccion>
                    )}
                    {o.estado === "Completado" && (
                      <BotonAccion variante="principal" onClick={() => onVerDetalle(o)}>Ver la factura</BotonAccion>
                    )}
                    {o.estado === "Anulado" && (
                      <BotonAccion variante="principal" onClick={() => onVerDetalle(o)}>Ver por qué</BotonAccion>
                    )}
                    <BotonAccion variante="normal" onClick={() => onVerDetalle(o)}>Ver la orden</BotonAccion>
                    {esBorrador(o.estado) && (
                      <BotonAccion variante="normal" onClick={() => onEditarOrden(o)}>Cambiar</BotonAccion>
                    )}
                    {!finalizada && (
                      <BotonAccion variante="peligro" onClick={() => { setMotivoAnulacion(""); setAnularConfirm(o); }}>Anular</BotonAccion>
                    )}
                  </>
                }
              />
            );
          })}
        </div>
      )}

      <PaginadorGrande pagina={pageActual} total={filtered.length} porPagina={PER_PAGE} onCambiar={setPage} />

      <AnimatePresence>
        {modal && (
          <OrdenModal
            mode={modal.mode}
            orden={modal.orden}
            proveedores={proveedores}
            insumos={insumos}
            // Punto 3.2: sin el catálogo el buscador "Producto" de este modal
            // no tenía con qué filtrar y quedaba siempre vacío.
            productos={productos}
            // Bloque 2: "+ Crear producto" con las categorías del panel.
            categorias={categorias}
            categoriasInsumo={categoriasInsumo}
            onCrearProducto={onCrearProducto}
            onClose={() => setModal(null)}
            onGuardar={handleGuardarOrden}
            onNuevoProveedor={handleNuevoProveedorLocal}
            onCrearInsumo={(ins) =>
              setInsumos?.((prev) => [
                ins,
                ...prev.filter((existente) => existente.id !== ins.id),
              ])
            }
          />
        )}
      </AnimatePresence>

      {/* Enviar / cambiar de estado (Borrador → Enviado, Enviado → Completado) */}
      {dialogoEstado && dialogoEstado.next !== "Anulado" && (
        <DialogoConfirmacion
          abierto
          onCambiarAbierto={a => { if (!a) setEstadoConfirm(null); }}
          titulo={
            dialogoEstado.next === "Enviado"
              ? `¿Enviar la orden #${numeroOrden(dialogoEstado.id)} a ${ordenes.find(o => o.id === dialogoEstado.id)?.proveedor ?? "el proveedor"}?`
              : dialogoEstado.next === "Completado"
                ? `¿Marcar la orden #${numeroOrden(dialogoEstado.id)} como completada?`
                : `¿Pasar la orden #${numeroOrden(dialogoEstado.id)} a ${dialogoEstado.next}?`
          }
          queVaAPasar={
            dialogoEstado.next === "Enviado"
              ? ["Ya no se podrá cambiar", "Queda esperando a que llegue"]
              : dialogoEstado.next === "Completado"
                ? ["Ya no se podrán anotar más facturas en esta orden", "Queda guardada como completada"]
                : ["La orden avanza al siguiente paso"]
          }
          textoAccion={dialogoEstado.next === "Enviado" ? "Sí, enviar la orden" : dialogoEstado.next === "Completado" ? "Sí, marcar como completada" : `Sí, pasar a ${dialogoEstado.next}`}
          onConfirmar={() => { void handleCambiarEstado(dialogoEstado.id, dialogoEstado.next); }}
        />
      )}
      {sendConfirm && (
        <DialogoConfirmacion
          abierto
          onCambiarAbierto={a => { if (!a) setSendConfirm(null); }}
          titulo={`¿Enviar la orden #${numeroOrden(sendConfirm.id)} a ${sendConfirm.proveedor}?`}
          queVaAPasar={["Ya no se podrá cambiar", "Queda esperando a que llegue"]}
          textoAccion="Sí, enviar la orden"
          onConfirmar={() => { void handleEnviarOrden(sendConfirm); }}
        />
      )}

      {/* Anular (con el motivo que exige el servidor) */}
      {ordenAnular && (
        <DialogoConfirmacion
          abierto
          onCambiarAbierto={a => { if (!a && !anulandoOrden) setAnularConfirm(null); }}
          titulo={`¿Anular la orden #${numeroOrden(ordenAnular.id)}?`}
          queVaAPasar={[
            "El proveedor no debe mandar nada",
            "Queda guardada como anulada",
            ...(facturasDeOrden(ordenAnular.id).length > 0 ? ["Las facturas que ya llegaron conservan su estado y lo que sumaron a la bodega"] : []),
            "No se puede deshacer",
          ]}
          pedirMotivo
          etiquetaMotivo="¿Por qué se anula?"
          motivoObligatorio
          textoAccion={anulandoOrden ? "Anulando…" : "Sí, anular la orden"}
          onConfirmar={(motivo) => { setMotivoAnulacion(motivo); void handleAnularOrden(ordenAnular, motivo); }}
        />
      )}
    </div>
  );
}

// ─── ORDEN DETALLE PAGE ───────────────────────────────────────────────────────

interface OrdenDetallePageProps {
  orden: OrdenCompra;
  gestiones: GestionCompra[];
  onBack: () => void;
  onEditar: (orden: OrdenCompra) => void;
  onAbrirRecepcion: (orden: OrdenCompra) => void;
}

export function OrdenDetallePage({
  orden,
  gestiones,
  onBack,
  onVerFactura,
}: OrdenDetallePageProps & { onVerFactura?: (gestion: GestionCompra) => void }) {
  const [ordenDetalle, setOrdenDetalle] = useState<OrdenCompra>(orden);
  useEffect(() => {
    setOrdenDetalle(orden);
    let cancelado = false;
    obtenerOrdenCompra(orden.id)
      .then((fresca) => {
        if (!cancelado) setOrdenDetalle(fresca);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [orden]);
  return <OrdenDetallePageContenido orden={ordenDetalle} gestiones={gestiones} onBack={onBack} onVerFactura={onVerFactura} />;
}

