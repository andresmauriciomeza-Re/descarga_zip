import React, { useState, useEffect } from "react";
import { Eye, ArrowLeft, Plus, CheckCircle2, Pencil, Trash2, Download, Package } from "lucide-react";
import { toast } from "sonner";
import { exportarMultiExcelEstilizado, exportarGestionComprasConInsumosExcel, type GestionCompraConInsumos } from "@/shared/utils/styledExcelExport";
import type { CategoriaInsumo } from "@/features/supplies/pages/SuppliesScreen";
import type { Insumo } from "@/features/supplies/utils/supplies";
import type { Producto } from "@/features/products/utils/products";
import type { CategoriaProducto } from "@/features/product-categories/utils/product-categories";
import { SearchInput } from "@/shared/components/SearchInput";
import { ActionIcons } from "@/shared/components/buttons/ActionIcons";
import { limpiarNumeroInput, numeroDeInput } from "@/shared/utils/numberInput";
import { Paginador } from "@/shared/components/Paginator";
import { BotonDescargarExcel } from "@/shared/components/buttons/DownloadExcelButton";
import { AvisoBanner } from "@/shared/components/panel/NoticeBanner";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";
import { BotonRuta } from "@/shared/components/buttons/BreadcrumbButton";
import { BuscadorGrande } from "@/shared/components/panel/LargeSearch";
import { DialogoConfirmacion } from "@/shared/components/panel/ConfirmDialog";
import { EncabezadoPagina } from "@/shared/components/panel/PageHeader";
import { EstadoPill } from "@/shared/components/panel/StatusPill";
import { FiltrosChips } from "@/shared/components/panel/FilterChips";
import { PaginadorGrande } from "@/shared/components/panel/LargePaginator";
import { SeccionFormulario } from "@/shared/components/panel/FormSection";
import { TarjetaFila } from "@/shared/components/panel/RowCard";
import { VacioEstado } from "@/shared/components/panel/EmptyState";
import { ConfirmModal } from "@/features/purchase-orders/components/ConfirmModal";
import type { GestionCompra, OrdenItem, OrdenCompra, EstadoGestion, EstadoOrden, ProveedorRef } from "@/features/purchase-orders/utils/purchase-orders";
import { esLineaProducto, textoStockActualizado, type SetCatalogo } from "@/features/purchases/services/inventory";
import {
  anularCompra as anularCompraApi,
  crearCompra,
  mensajeErrorCompras,
} from "@/features/purchases/services/purchasesApi";
import { obtenerOrdenCompra } from "@/features/purchase-orders/services/purchaseOrdersApi";
import { usePurchases } from "@/features/purchases/hooks/usePurchases";
import { TablaItemsFactura } from "@/features/purchases/components/InvoiceItemsTable";
import { CompraForm } from "@/features/purchases/components/PurchaseForm";
import { fmtCOP, type ItemFactura, type NuevaCompraData } from "@/features/purchases/utils/purchases";

// ─── CONTROL DE STOCK DE LAS COMPRAS ─────────────────────────────────────────
// Las funciones de inventario (sumar/revertir stock) viven en
// `services/inventario.ts` para que la Recepción de compra comparta
// EXACTAMENTE el mismo camino sin tener que importar esta pantalla.

/**
 * `GestionCompra` se declara en OrdenCompraScreen.tsx (archivo que este cambio
 * no puede tocar), así que se amplía con *module augmentation*: TypeScript
 * fusiona estos dos campos con la interfaz original en todo el proyecto sin
 * duplicar el modelo.
 *
 * - `stockAplicado`: la compra ya sumó sus ítems al inventario. Marca de
 *   control para aplicar el stock UNA sola vez (guardar/reintentar dos veces
 *   no debe duplicar la suma).
 * - `stockRevertido`: esa suma ya se devolvió al anular. Guard para que una
 *   segunda anulación (o un reintentos) no reste dos veces la misma compra.
 * - `proveedorNit`: NIT del proveedor tal como lo devuelve el backend
 *   (`p.nit AS proveedor_nit`). El listado lo muestra bajo el nombre y NUNCA
 *   se busca "difusamente" por nombre: un `id_proveedor` NULL devuelve el
 *   proveedor vacío y la fila muestra «—».
 */
declare module "@/features/purchase-orders/utils/purchase-orders" {
  interface GestionCompra {
    stockAplicado?: boolean;
    stockRevertido?: boolean;
    proveedorNit?: string;
  }
}

const campoMedioCls = "max-w-[240px]"; // Número de factura
const campoLargoCls = "max-w-xs"; // Proveedor (búsqueda)

// ─── NUEVA COMPRA — PÁGINA INDEPENDIENTE ─────────────────────────────────────

interface NuevaCompraPageProps {
  gestiones: GestionCompra[];
  setGestiones: React.Dispatch<React.SetStateAction<GestionCompra[]>>;
  proveedores: ProveedorRef[];
  setProveedores: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
  insumos: Insumo[];
  /** P14: catálogo de productos para poder facturar productos en la compra. */
  productos?: Producto[];
  /** Bloque 2: categorías y alta de productos desde "+ Crear producto" (el
   *  callback viene de App y agrega al catálogo del panel). */
  categorias?: CategoriaProducto[];
  /** Bloque 2.2: categorías de insumos desde la API para el "+ Crear insumo". */
  categoriasInsumo?: CategoriaInsumo[];
  onCrearProducto?: (p: Producto) => Promise<Producto>;
  /** Control de inventario al guardar la compra. Opcionales: sin ellos la
   *  compra se guarda igual y simplemente no se suma el stock (ver
   *  `handleGuardar`). */
  setInsumos?: SetCatalogo<Insumo>;
  setProductos?: SetCatalogo<Producto>;
  onRecargarCatalogo?: () => Promise<void>;
  onBack: () => void;
}

export function NuevaCompraPage({
  gestiones,
  setGestiones,
  proveedores,
  setProveedores,
  insumos,
  productos,
  categorias,
  categoriasInsumo,
  onCrearProducto,
  setInsumos,
  setProductos,
  onRecargarCatalogo,
  onBack,
}: NuevaCompraPageProps) {
  const handleGuardar = async (data: NuevaCompraData) => {
    try {
      // 6.1: la compra directa la crea el backend, que además suma el stock de
      // insumos (convertidos a su unidad) y de productos (bebidas × empaque),
      // actualiza costos y deja la bebida sin precio en "Disponible". Sin
      // puentes temporales ni suma local de stock.
      const creada = await crearCompra({
        n_factura: data.numeroFactura,
        fecha: data.fechaFactura,
        id_proveedor: data.proveedorId ? Number(data.proveedorId) : null,
        // Fase 4: sin `iva_incluido` global; el backend lo deriva de los
        // `modo_iva` de cada línea.
        items: data.items.filter((i) => i.idInsumo && i.cantidad > 0),
      });
      setGestiones((prev) => [creada, ...prev]);
      toast.success(`Compra ${creada.id} creada · Factura ${creada.numeroFactura}`);
      // El stock de insumos y productos cambió en la base.
      await onRecargarCatalogo?.();
      onBack();
    } catch (error) {
      toast.error(mensajeErrorCompras(error, "No se pudo crear la compra."));
    }
  };

  return (
    <CompraForm
      // Pantalla completa dentro del panel (no modal).
      fullPage
      proveedores={proveedores}
      setProveedores={setProveedores}
      insumos={insumos}
      setInsumos={setInsumos}
      productos={productos}
      // Bloque 2: "+ Crear producto" del desplegable de ítems.
      categorias={categorias}
      categoriasInsumo={categoriasInsumo}
      onCrearProducto={onCrearProducto}
      gestiones={gestiones}
      onClose={onBack}
      onGuardar={handleGuardar}
    />
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

interface Props {
  gestiones: GestionCompra[];
  setGestiones: React.Dispatch<React.SetStateAction<GestionCompra[]>>;
  ordenes: OrdenCompra[];
  setOrdenes: React.Dispatch<React.SetStateAction<OrdenCompra[]>>;
  insumos: Insumo[];
  /** Catálogo de productos: necesario para devolver el stock de las líneas
   *  marcadas como "producto" al anular una compra. */
  productos?: Producto[];
  /** Bloque 2: categorías y alta de productos (se pasan a CompraForm; el
   *  modal de detalle es de sólo lectura pero se mantienen iguales las
   *  dos pantallas que renderizan CompraForm). */
  categorias?: CategoriaProducto[];
  /** Bloque 2.2: categorías de insumos desde la API para el "+ Crear insumo". */
  categoriasInsumo?: CategoriaInsumo[];
  onCrearProducto?: (p: Producto) => Promise<Producto>;
  proveedores: ProveedorRef[];
  setProveedores: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
  /** Control de inventario al anular. Opcionales: sin ellos la anulación
   *  sólo cambia el estado y NO se revierte stock (no se rompe nada). */
  setInsumos?: SetCatalogo<Insumo>;
  setProductos?: SetCatalogo<Producto>;
  onRecargarCatalogo?: () => Promise<void>;
  /** Recarga el listado COMPLETO de órdenes de compra (badge de estado y
   *  botón "OC") después de anular una compra asociada a una OC: el estado
   *  de la orden lo decide el backend, no el puntero local. */
  onRecargarOrdenes?: () => Promise<void>;
  onNuevaCompra: () => void;
  /** Carga de la lista desde la API y su error ("Reintentar"): nunca datos de
      ejemplo cuando falla. */
  cargando?: boolean;
  errorCarga?: string | null;
  onReintentar?: () => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExportExcel?: boolean;
}

export function GestionCompraScreen({
  gestiones, setGestiones, ordenes, setOrdenes, insumos, productos, proveedores, setProveedores,
  categorias, categoriasInsumo, onCrearProducto,
  setInsumos, setProductos,
  onRecargarCatalogo,
  onRecargarOrdenes,
  onNuevaCompra,
  cargando = false,
  errorCarga,
  onReintentar,
  canCreate = true,
  // El backend exige el privilegio "Editar" en PATCH /compras/:id/anular:
  // sin él no se muestra el ícono de anular.
  canEdit = true,
  canExportExcel = true,
}: Props) {
  const { search, setSearch, setPage, chipEstado, setChipEstado, getOrden, filtered, PER_PAGE, pageActual, paged } = usePurchases(ordenes, gestiones);
  const [detail, setDetail]   = useState<GestionCompra | null>(null);
  /** Confirmación de ANULACIÓN: es el ÚNICO cambio de estado que existe en
   *  este módulo (el select de estado se reemplazó por el ícono de anular). */
  const [estadoConfirm, setEstadoConfirm] = useState<{ id: string; from: EstadoGestion } | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");


  // Depuración (solo DEV): imprime el JSON que recibe el detalle de la compra
  // (lo mismo que "devolvería" el GET del detalle) al abrir el ojo.
  useEffect(() => {
    if (import.meta.env.DEV && detail) {
      // Debug logging removed
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail]);





  /** Orden de compra relacionada con la compra del diálogo de confirmación. */
  const estadoOrdenConfirm = estadoConfirm
    ? gestiones.find((g) => g.id === estadoConfirm.id)?.ordenId ?? ""
    : "";

  /** Pide confirmación de ANULACIÓN (único caso: "Anulado"). */
  const pedirCambiarEstado = (id: string) => {
    const actual = gestiones.find((g) => g.id === id)?.estado;

    // "Anulado" es definitivo: sólo se anulan compras en estado "Recibido".
    if (actual !== "Recibido") {
      setEstadoConfirm(null);
      return;
    }

    // Punto 6: el diálogo siempre arranca con el motivo vacío (si no, el botón
    // "Anular" se habilitaría con el motivo de una anulación anterior).
    setMotivoAnulacion("");
    setEstadoConfirm({ id, from: actual });
  };

  const handleCambiarEstado = async (id: string, motivo?: string) => {
    const compra = gestiones.find((g) => g.id === id);

    // ANULACIÓN (6.2): la hace el backend, que devuelve al inventario lo que
    // la compra sumó (insumos y productos). Un 409 ("ya se usaron/vendieron
    // unidades de «X»") muestra su mensaje y NO se anula nada.
    try {
      const anulada = await anularCompraApi(id, (motivo ?? "").trim());
      setGestiones((prev) => prev.map((x) => (x.id === id ? anulada : x)));
      // El stock cambió en la base: se recargan insumos y productos.
      await onRecargarCatalogo?.();

      // El backend anula la Orden de Compra cuando ésta tenía una sola
      // compra asociada: aquí solo se refleja su estado (con recarga).
      const ordenId = compra?.ordenId ?? "";
      if (!ordenId) {
        toast.success(`Compra ${id} anulada`);
      } else {
        try {
          // La orden puntual sólo decide el TEXTO del toast (¿la anulación
          // arrastró la OC?): el estado del listado y el botón "OC" salen
          // de la recarga COMPLETA de GET /ordenes-compra de abajo.
          const orden = await obtenerOrdenCompra(ordenId);
          toast.success(
            orden.estado === "Anulado"
              ? `Compra ${id} y orden ${ordenId} anuladas`
              : `Compra ${id} anulada`,
          );
        } catch {
          // La compra ya quedó anulada: se informa solo eso.
          toast.success(`Compra ${id} anulada`);
        }
        // La OC vuelve de Completado a Enviado (o se anula): se recarga la
        // lista completa de órdenes para que el badge y el botón "OC" se
        // actualicen sin recargar la página.
        await onRecargarOrdenes?.();
      }
    } catch (error) {
      toast.error(mensajeErrorCompras(error, "No se pudo anular la compra."));
    } finally {
      setEstadoConfirm(null);
      setMotivoAnulacion("");
    }
  };

  const handleDownload = async () => {
    // Preparar datos agrupados: cada compra con sus insumos debajo
    const comprasParaExcel: GestionCompraConInsumos[] = filtered.map(g => {
      const orden = getOrden(g.ordenId);
      // Proveedor y NIT vienen resueltos del backend: vacío si la compra no
      // tiene proveedor (nunca "difuso" por nombre, que con el campo en blanco
      // elegía el primer proveedor del catálogo).
      const idsOrden = new Set(orden?.items.map(i => i.idInsumo) ?? []);
      
      const items = (g.items ?? []).map(item => {
        const esSolicitado = idsOrden.has(item.idInsumo) || (item.esNoSolicitado === false && idsOrden.size === 0);
        let tipo: "Solicitado" | "No solicitado" | "—";
        if (orden && idsOrden.size > 0) {
          tipo = esSolicitado ? "Solicitado" : "No solicitado";
        } else {
          tipo = "—";
        }
        return {
          nombre: item.nombre,
          tipo,
          cantidad: item.cantidad,
          unidad: item.unidad,
          costoUnitario: item.costoUnitario,
          iva: item.iva ?? 0,
        };
      });

      return {
        id: g.id,
        numeroFactura: g.numeroFactura || "—",
        proveedor: g.proveedor ?? "",
        nit: g.proveedorNit ?? "",
        fechaFactura: g.fechaFactura,
        estado: g.estado,
        subtotalSinIva: g.subtotalSinIva ?? 0,
        totalIva: g.totalIva ?? 0,
        totalPagado: g.totalPagado ?? g.valorTotal,
        motivoAnulacion: g.motivoAnulacion,
        items,
      };
    });

    await exportarGestionComprasConInsumosExcel({
      compras: comprasParaExcel,
      nombreArchivo: "gestion-de-compras",
    });
    toast.success("Excel descargado");
  };

  const numeroOrden = (id: string) => id.replace(/^\D+-?0*/, "") || id;
  const origenDe = (g: GestionCompra) =>
    g.ordenId ? `Llegó por la orden de compra #${numeroOrden(g.ordenId)}` : "Compra directa, sin orden";
  const estadoCompraConfirm = estadoConfirm ? gestiones.find((g) => g.id === estadoConfirm.id) ?? null : null;

  /** Confirmación de anular (se pinta en el detalle). */
  const dialogoAnular = estadoConfirm && (
    <DialogoConfirmacion
      abierto
      onCambiarAbierto={a => { if (!a) { setEstadoConfirm(null); setMotivoAnulacion(""); } }}
      titulo={`¿Anular la factura ${estadoCompraConfirm?.numeroFactura || numeroOrden(estadoConfirm.id)}?`}
      queVaAPasar={[
        "Lo que se sumó a la bodega con esta factura se resta otra vez",
        "Queda guardada como anulada",
        ...(estadoOrdenConfirm ? [`La orden #${numeroOrden(estadoOrdenConfirm)} también queda anulada y no podrá recibir más facturas`] : []),
        "No se puede deshacer",
      ]}
      pedirMotivo
      etiquetaMotivo="¿Por qué se anula?"
      motivoObligatorio
      textoAccion="Sí, anular la factura"
      onConfirmar={(motivo) => { setMotivoAnulacion(motivo); void handleCambiarEstado(estadoConfirm.id, motivo); }}
    />
  );

  // ── Detalle de una factura ──
  const det = detail ? gestiones.find((g) => g.id === detail.id) ?? detail : null;
  if (det) {
    const itemsDetalle: ItemFactura[] = (det.items ?? []).map(item => ({
      rowId: item.rowId,
      idInsumo: item.idInsumo,
      nombre: item.nombre,
      unidad: item.unidad,
      cantidad: item.cantidad,
      costoUnitario: item.costoUnitario,
      precioUnitario: item.precioUnitario,
      iva: item.iva,
      modoIva: item.modoIva ?? "incluido",
      baseSinIva: item.baseSinIva,
      montoIva: item.montoIva,
      tipoItem: item.tipoItem,
      precioVenta: item.precioVenta,
      factorPresentacion: item.factorPresentacion,
      unidadBase: item.unidadBase,
    }));
    return (
      <div className="pn-contenido" style={{ maxWidth: 1100 }}>
        <BotonRuta>
          <BotonAccion icono={ArrowLeft} onClick={() => setDetail(null)}>Volver a la lista</BotonAccion>
        </BotonRuta>
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <h1 style={{ font: "700 34px/1.15 var(--font-titulo)", margin: 0 }}>Factura {det.numeroFactura || "sin número"}</h1>
          <EstadoPill tono={det.estado === "Recibido" ? "verde" : "rojo"}>{det.estado === "Recibido" ? "Recibida" : "Anulada"}</EstadoPill>
        </div>
        <p className="pn-seccion__ayuda" style={{ marginBottom: 20 }}>
          {det.proveedor || "Sin proveedor"} · {det.fechaFactura || "sin fecha"} · {origenDe(det).replace("Llegó por la orden de compra", "llegó por la orden").replace("Compra directa, sin orden", "compra directa, sin orden")}
        </p>
        {det.estado === "Anulado" && (
          <div className="pn-dialogo__caja pn-dialogo__caja--ambar">
            <strong>Por qué se anuló:</strong>
            {det.motivoAnulacion || "No se anotó el motivo"}
          </div>
        )}
        <SeccionFormulario titulo="Qué llegó">
          <TablaItemsFactura items={itemsDetalle} soloLectura onEdit={() => {}} onRemove={() => {}} />
        </SeccionFormulario>
        <div className="pn-dialogo__botones" style={{ marginTop: 18, justifyContent: "flex-start" }}>
          {det.estado === "Recibido" && canEdit && (
            <BotonAccion variante="peligro" onClick={() => pedirCambiarEstado(det.id)}>Anular la factura</BotonAccion>
          )}
          <BotonAccion variante="oscuro" onClick={() => setDetail(null)}>Volver a la lista</BotonAccion>
        </div>
        {dialogoAnular}
      </div>
    );
  }

  // ── Lista ──
  return (
    <div className="pn-contenido">
      <EncabezadoPagina
        titulo="Compra"
        descripcion="Las facturas de lo que llegó. Al guardarlas, lo comprado se suma solo a la bodega"
        acciones={
          <>
            {canExportExcel && <BotonAccion icono={Download} onClick={handleDownload}>Descargar en Excel</BotonAccion>}
            {canCreate && <BotonAccion variante="principal" icono={Plus} onClick={onNuevaCompra}>Anotar una factura</BotonAccion>}
          </>
        }
      />

      <div className="grid gap-4 mb-6">
        <BuscadorGrande
          etiqueta="Buscar una factura"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Escribe el número de factura, de la orden o el proveedor"
        />
        <FiltrosChips
          valor={chipEstado}
          onChange={v => { setChipEstado(v); setPage(1); }}
          opciones={[
            { valor: "todas", etiqueta: "Todas" },
            { valor: "Recibido", etiqueta: "Recibidas" },
            { valor: "Anulado", etiqueta: "Anuladas" },
          ]}
        />
      </div>

      {cargando ? (
        <p role="status" className="pn-nota">Cargando las facturas…</p>
      ) : errorCarga ? (
        <AvisoBanner
          titulo="No pudimos cargar las facturas"
          boton={onReintentar ? <BotonAccion onClick={onReintentar}>Intentar de nuevo</BotonAccion> : undefined}
        >
          {errorCarga}
        </AvisoBanner>
      ) : paged.length === 0 ? (
        <VacioEstado icono={Package} titulo="Todavía no hay facturas">
          Se anotan cuando llega mercancía: desde una orden de compra o con «Anotar una factura».
        </VacioEstado>
      ) : (
        <div className="pn-lista">
          {paged.map(g => (
            <TarjetaFila
              key={g.id}
              pre={`Factura ${g.numeroFactura || "sin número"} · ${g.fechaFactura || "sin fecha"}`}
              nombre={g.proveedor || "Sin proveedor"}
              detalle={
                <>
                  {g.proveedorNit ? `NIT ${g.proveedorNit}` : "Sin NIT"}
                  <br />{origenDe(g)}
                </>
              }
              datos={[{
                etiqueta: "Total pagado",
                valor: g.valorTotal > 0 ? (
                  <>
                    <span style={{ font: "700 24px var(--font-titulo)" }}>{fmtCOP(g.valorTotal)}</span>
                    <br /><span style={{ fontSize: 17, fontWeight: 400 }}>Incluye IVA de {fmtCOP(g.totalIva ?? 0)}</span>
                  </>
                ) : "—",
              }]}
              estado={
                <div className="grid gap-1 justify-items-start">
                  <EstadoPill tono={g.estado === "Recibido" ? "verde" : "rojo"}>{g.estado === "Recibido" ? "Recibida" : "Anulada"}</EstadoPill>
                  {g.estado === "Anulado" && g.motivoAnulacion && (
                    <span style={{ fontSize: 16, color: "var(--rojo-texto)", maxWidth: 260 }}>Motivo: {g.motivoAnulacion}</span>
                  )}
                </div>
              }
              acciones={<BotonAccion variante="normal" onClick={() => setDetail(g)}>Ver qué llegó</BotonAccion>}
            />
          ))}
        </div>
      )}

      <PaginadorGrande pagina={pageActual} total={filtered.length} porPagina={PER_PAGE} onCambiar={setPage} />
      {dialogoAnular}
    </div>
  );
}
