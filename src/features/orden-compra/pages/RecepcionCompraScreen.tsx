import React, { useMemo, useRef, useState, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { ArrowLeft, Check, Plus, Trash2, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import {
  calcularLineaIva,
  ETIQUETA_MODO_IVA,
  MODOS_IVA,
  ayudaModoIva,
  formatearChipIva,
  formatearModoIvaEnTabla,
  type ModoIva,
} from "@/features/compras/services/iva";
import {
  esEmpaque,
  factorDePresentacion,
  factorUnidadDirecta,
  listarPresentaciones,
  mensajeErrorPresentaciones,
  unidadesCompatibles,
  type PresentacionConfigurada,
} from "@/features/compras/services/presentaciones";
import {
  CompactInsumoForm,
  type CompactInsumoFormValues,
  type InsumoSuggestion,
} from "@/features/compras/components/CompactInsumoForm";
import {
  historialCompraDe,
  unidadesPorLinea,
  type SetCatalogo,
} from "@/features/compras/services/inventario";
import {
  mapearRecepcion,
  recibirOrdenCompra,
} from "@/features/orden-compra/services/ordenesCompraApi";
import { mapearCompraApi, type CompraApi } from "@/features/compras/services/comprasApi";
import {
  contenidoDe,
  empaqueDe,
  nombreBuscable,
  presentacionCompra,
} from "@/shared/utils/presentacion";
import { mismoNombre } from "@/shared/utils/nombres";
// Catálogo único de unidades de Compras (antes había una copia local sin
// paca/sixpack): una sola lista para validar y mostrar las medidas.
import { UNIDADES, etiquetaPresentacion } from "@/shared/utils/unidades";
import type { CategoriaInsumo, Insumo } from "@/features/insumos/pages/GestionInsumosScreen";
import type { Producto } from "@/features/productos/pages/GestionProductosScreen";
// Bloque 2: "+ Crear producto" desde el desplegable de no solicitados.
import { CrearProductoModal } from "@/features/productos/components/CrearProductoModal";
import type { CategoriaProducto } from "@/features/categoria-productos/pages/CategoriaProductoScreen";
import { UnidadSelect, type OpcionUnidad } from "@/features/compras/components/UnidadSelect";
import { SegmentadoButtons } from "@/shared/components/SegmentadoButtons";
import { CalendarDropdown } from "@/shared/components/CalendarDropdown";
import { ActionIcons, CLASE_BASE, CLASE_HOVER } from "@/shared/components/ActionIcons";
import { limpiarNumeroInput, numeroDeInput } from "@/shared/utils/numeroInput";
import {
  ConfirmModal,
  NuevoInsumoModal,
  insumoDeAlta,
  type OrdenCompra,
  type Recepcion,
  type ItemRecibido,
  type GestionCompra,
  type OrdenItem,
  type EstadoOrden,
  type ProveedorRef,
} from "@/features/orden-compra/pages/OrdenCompraScreen";

const SERIF = "var(--font-titulo)";

const iCls =
  "w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const compactInputCls =
  "w-full px-2.5 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30";

function fmtCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

interface Props {
  orden: OrdenCompra;
  insumos: Insumo[];
  /** Catálogo compartido: "+ Crear insumo" da de alta el insumo aquí. */
  setInsumos: React.Dispatch<React.SetStateAction<Insumo[]>>;
  /** P14: catálogo de productos. Se lee para ofrecerlo en el selector de
   *  tipo y — con `setProductos` (punto B5) — para sumar el stock recibido y
   *  escribir el precio de venta de las líneas de producto al guardar. */
  productos?: Producto[];
  /** Opcional: sin él la recepción se guarda igual y no se toca el catálogo
   *  de productos (ver `guardarConfirmado`). */
  setProductos?: SetCatalogo<Producto>;
  /** Bloque 2: categorías del panel y alta de productos desde "+ Crear
   *  producto" (callback de App; sin él el atajo del desplegable no se
   *  muestra). */
  categorias?: CategoriaProducto[];
  /** Bloque 2.2: categorías de insumos desde la API para el "+ Crear insumo". */
  categoriasInsumo?: CategoriaInsumo[];
  onCrearProducto?: (p: Producto) => Promise<Producto>;
  onRecargarCatalogo?: () => Promise<void>;
  gestiones: GestionCompra[];
  setGestiones: React.Dispatch<React.SetStateAction<GestionCompra[]>>;
  proveedores: ProveedorRef[];
  onGuardar: (recepcion: Recepcion, estado: EstadoOrden) => void;
  onBack: () => void;
}

/**
 * Ids de los insumos que ya se registraron en alguna factura de la OC. Esos
 * insumos no vuelven a ofrecerse al capturar otra factura de la misma orden,
 * aunque les sobre cantidad pendiente.
 */
function registradosEnOrden(gestiones: GestionCompra[], ordenId: string) {
  const set = new Set<string>();

  for (const g of gestiones) {
    if (g.ordenId !== ordenId) continue;
    // Una factura anulada ya no cuenta como registrada: sus insumos vuelven a
    // estar disponibles para otra factura de la misma OC (misma regla que
    // `registradosEnOrden` del listado de Orden de Compra).
    if (g.estado === "Anulado") continue;

    for (const it of g.items ?? []) set.add(it.idInsumo);
  }

  return set;
}

/**
 * "2024-02-05" → "05/02/2024" para mostrarlo en el mensaje de error.
 * Se resuelve sólo con texto (sin new Date()), así que no interviene ninguna
 * zona horaria.
 */
function fechaCorta(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/**
 * Devuelve la fecha como "YYYY-MM-DD" para poder compararla COMO TEXTO
 * (el orden lexicográfico de ISO coincide con el cronológico).
 * Acepta también "dd/MM/yyyy", que es otro formato que usa el proyecto.
 * Nunca se pasa por new Date("YYYY-MM-DD"): eso se interpreta en medianoche
 * UTC y en Colombia (UTC-5) cae en el día anterior.
 */
function aFechaIso(fecha: string): string {
  const t = fecha.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}

export function RecepcionCompraScreen({
  orden,
  insumos,
  setInsumos,
  productos,
  setProductos,
  categorias,
  categoriasInsumo,
  onCrearProducto,
  onRecargarCatalogo,
  gestiones,
  setGestiones,
  proveedores,
  onGuardar,
  onBack,
}: Props) {
  // `toISOString()` devuelve la fecha en UTC: en Colombia (UTC-5) después de las
  // 19:00 devolvía el día siguiente, así que la recepción de hoy quedaba
  // bloqueada por el `max` del date-picker. Se usa la fecha local, que es la
  // convención del proyecto.
  const today = new Date().toLocaleDateString("en-CA");

  const registrados = useMemo(
    () => registradosEnOrden(gestiones, orden.id),
    [gestiones, orden.id]
  );

  // Los insumos no solicitados se guardan con un id propio, así que también se
  // comparan por nombre para no ofrecer lo que ya llegó en otra factura.
  const nombresRegistrados = useMemo(() => {
    const set = new Set<string>();

    for (const g of gestiones) {
      if (g.ordenId !== orden.id) continue;
      // Mismo criterio que `registradosEnOrden`: lo que llegó en una factura
      // ANULADA vuelve a poder ofrecerse (también por nombre).
      if (g.estado === "Anulado") continue;

      for (const it of g.items ?? []) set.add(it.nombre.toLowerCase().trim());
    }

    return set;
  }, [gestiones, orden.id]);

  /** Ids del detalle de la OC (punto B6): un producto cuyo id ya está pedido
   *  o facturado en la orden no se ofrece de nuevo como "no solicitado",
   *  para que su línea no se fusione con la existente al aplicar stock. */
  const idsOrdenActual = useMemo(
    () => new Set(orden.items.map((i) => i.idInsumo)),
    [orden]
  );

  // Si todos los insumos ya están registrados (facturado según el BACKEND o
  // presente en una factura NO anulada), redirigir al listado. Con una factura
  // anulada sus insumos quedan pendientes otra vez y NO se saca al usuario.
  useEffect(() => {
    const todosRegistrados = orden.items.every(item => Boolean(item.facturado) || registrados.has(item.idInsumo));
    if (todosRegistrados) {
      toast.info(`La OC ${orden.id} ya tiene todos sus insumos registrados`);
      onBack();
    }
  }, [orden, registrados, onBack]);

  // Solo se ofrecen los insumos que aún no se han facturado en esta OC.
  const [items, setItems] = useState<ItemRecibido[]>(() => {
    const previos = registradosEnOrden(gestiones, orden.id);

    return orden.items
      .filter((i) => !i.facturado && !previos.has(i.idInsumo))
      .map((i) => {
        // Punto 2: si la bebida ya tiene precio de venta (en la línea de la
        // OC o en el catálogo) se precarga para poder editarlo a mano.
        const pvLinea = Number(i.precioVenta ?? 0);
        const pvCatalogo =
          (i.tipoItem ?? "insumo") === "producto"
            ? Number(
                (productos?.find((p) => p.id === i.idInsumo)
                  ?? productos?.find((p) => mismoNombre(p.nombre, i.nombre)))?.precioUnitario ?? 0
              )
            : 0;
        const precioVenta = pvLinea > 0 ? pvLinea : pvCatalogo;

        // 5.1: lo que queda POR recibir sale del resumen `recepcion` de la OC
        // (acumulado de las facturas anteriores). En una recepción parcial la
        // pantalla arranca con ese pendiente, no con el pedido completo.
        const rec = orden.recepcion?.items.find((r) => r.idInsumo === i.idInsumo);
        const pendienteCalculada = i.cantidadPendiente != null ? i.cantidadPendiente : (rec?.pendiente != null ? rec.pendiente : i.cantidad);
        const pendiente = rec
          ? Math.max(0, rec.cantidadSolicitada - rec.cantidadRecibida)
          : i.cantidad;
        const unidadBase =
          i.unidadBase ??
          insumos.find((insumo) => insumo.id === i.idInsumo)?.unidadMedida;
        const factorPresentacion =
          i.factorPresentacion ??
          (i.unidadesBase != null && i.cantidad > 0
            ? i.unidadesBase / i.cantidad
            : factorUnidadDirecta(i.unidad, unidadBase ?? "")) ??
          ((i.tipoItem ?? "insumo") === "producto"
            ? i.unidadesPorEmpaque ?? 1
            : undefined);

        return {
          rowId: i.rowId,
          idInsumo: i.idInsumo,
          nombre: i.nombre,
          cantidadSolicitada: i.cantidad,
          cantidadPendiente: pendienteCalculada,
          ...(factorPresentacion != null
            ? { unidadesPendientesBase: pendienteCalculada * factorPresentacion }
            : {}),
          cantidadRecibida: pendienteCalculada,
          unidad: i.unidad,
          unidadSolicitada: i.unidad,
          precioReferencia: i.costoUnitario,
          costoUnitario: i.costoUnitario, precioUnitario: i.costoUnitario,
          // Un IVA no configurado permanece vacío para que se solicite antes de guardar.
          iva: i.iva,
          modoIva: i.modoIva ?? "incluido",
          // P14: se conserva el catálogo (y el precio de venta si la línea lo
          // trae) para que la tabla de solicitados pueda mostrar "Producto".
          tipoItem: i.tipoItem,
          precioVenta: precioVenta > 0 ? precioVenta : undefined,
          // Ajuste de bebidas: la línea hereda el empaque de la OC (paca/
          // caja) para repartir el monto en sus unidades. Las líneas sin el
          // dato (unidad suelta, OCs viejas) se leen como 1.
          unidadesPorEmpaque: i.unidadesPorEmpaque,
          unidadBase,
          factorPresentacion,
        };
      })
      .filter((i) => i.cantidadRecibida > 0);
  });

  const [itemsExtra, setItemsExtra] = useState<ItemRecibido[]>([]);
  const [presentacionesPorInsumo, setPresentacionesPorInsumo] = useState<
    Record<string, PresentacionConfigurada[]>
  >({});
  const idsPresentacionesKey = Array.from(
    new Set(
      items
        .filter((item) => (item.tipoItem ?? "insumo") === "insumo" && /^INS-\d+$/.test(item.idInsumo))
        .map((item) => item.idInsumo),
    ),
  )
    .sort()
    .join(",");

  useEffect(() => {
    const ids = idsPresentacionesKey ? idsPresentacionesKey.split(",") : [];
    if (ids.length === 0) {
      setPresentacionesPorInsumo({});
      return;
    }

    let vivo = true;
    Promise.all(
      ids.map(async (id) => [id, await listarPresentaciones(id)] as const),
    )
      .then((entradas) => {
        if (vivo) setPresentacionesPorInsumo(Object.fromEntries(entradas));
      })
      .catch((error: unknown) => {
        if (vivo) {
          toast.error(
            mensajeErrorPresentaciones(error, "No se pudieron cargar las presentaciones del insumo."),
          );
        }
      });

    return () => {
      vivo = false;
    };
  }, [idsPresentacionesKey]);

  const unidadBaseDe = (item: ItemRecibido) =>
    item.unidadBase ??
    insumos.find((insumo) => insumo.id === item.idInsumo)?.unidadMedida ??
    "";

  const factorDeUnidadRecibida = (item: ItemRecibido, unidad = item.unidad) => {
    const base = unidadBaseDe(item);
    const configuradas = presentacionesPorInsumo[item.idInsumo] ?? [];
    return (
      factorUnidadDirecta(unidad, base) ??
      factorDePresentacion(unidad, base, configuradas) ??
      (unidad === item.unidad
        ? item.factorPresentacion ??
          ((item.tipoItem ?? "insumo") === "producto"
            ? item.unidadesPorEmpaque ?? 1
            : undefined)
        : undefined)
    );
  };

  const cantidadMaximaRecibida = (item: ItemRecibido) => {
    const factor = factorDeUnidadRecibida(item);
    if (item.unidadesPendientesBase != null && factor != null && factor > 0) {
      return item.unidadesPendientesBase / factor;
    }
    return item.cantidadPendiente ?? item.cantidadSolicitada;
  };

  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaFactura, setFechaFactura] = useState(today);

  // Refs de los campos: si una validación falla, el aviso tiene que quedar A LA
  // VISTA del usuario (la columna derecha scrollea por dentro) y con el foco
  // puesto en el campo. Renderizar el mensaje fuera del área visible era
  // indistinguible de "no pasa nada".
  const numeroFacturaRef = useRef<HTMLInputElement>(null);
  const fechaFacturaRef = useRef<HTMLInputElement>(null);
  const itemsMsgRef = useRef<HTMLParagraphElement>(null);

  const enfocarCampo = (ref: React.RefObject<HTMLElement | null>) => {
    const el = ref.current;
    if (!el) return;

    el.scrollIntoView({ block: "center", behavior: "smooth" });

    if (el instanceof HTMLInputElement) el.focus({ preventScroll: true });
  };

  const [exCategoriaInsumoId, setExCategoriaInsumoId] = useState<number | undefined>(undefined);
  const [nuevosInsumosPendientes, setNuevosInsumosPendientes] = useState<
    { id: string; nombre: string; unidadMedida: string; costoUnitario: number; iva: number; categoriaId: string }[]
  >([]);
  const [showNuevoInsumo, setShowNuevoInsumo] = useState(false);
  // Bloque 2: "+ Crear producto" del desplegable de no solicitados.
  const [showNuevoProducto, setShowNuevoProducto] = useState(false);

  const [exNombre, setExNombre] = useState("");
  const [exCant, setExCant] = useState(1);
  const [exUnidad, setExUnidad] = useState(UNIDADES[0]);
  // Ajuste de bebidas: unidades por paca/caja del producto no solicitado que
  // se está agregando (undefined = unidad suelta). El Monto unitario del
  // formulario es entonces por PRESENTACIÓN y el costo de referencia se
  // divide en estas unidades.
  const [exEmpaque, setExEmpaque] = useState<number | undefined>(undefined);
  const [exPrecio, setExPrecio] = useState(0);
  const [exIva, setExIva] = useState<number | undefined>(undefined);
  const [exIvaAntesDeExento, setExIvaAntesDeExento] = useState<number | undefined>(undefined);
  const [exModoIva, setExModoIva] = useState<ModoIva>("incluido");
  const [exUnidadBase, setExUnidadBase] = useState("");
  // P14: qué se está agregando como "no solicitado", insumo o producto.
  const [exTipo, setExTipo] = useState<"insumo" | "producto">("insumo");
  // Precio de VENTA al público del producto elegido (sólo con exTipo
  // "producto"; con insumos queda en 0 y no se guarda en la línea).
  const [exPrecioVenta, setExPrecioVenta] = useState(0);
  // Punto B6: id real del catálogo elegido en las sugerencias. Vacío = nombre
  // escrito a mano (la línea se guarda con id sintético `INS-EX-…`). Se limpia
  // al escribir, al trocar de tipo y al reiniciar el formulario, para no
  // arrastrar el id de otro ítem y que dos líneas no se fusionen en el stock.
  const [exId, setExId] = useState("");
  // Ajuste (bloque 2): el % de ganancia se quitó de la pantalla; el precio de
  // venta del producto se escribe a mano y se valida contra el costo con IVA.
  const [exShowSug, setExShowSug] = useState(false);
  const [showGuardarConf, setShowGuardarConf] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // ������ Edición en línea de insumos adicionales ������������������������������������������������������������������������������������������������
  const [editExtraId, setEditExtraId] = useState<string | null>(null);

  const exRef = useRef<HTMLDivElement>(null);

  // Factura única: normalización y validación de duplicados
  const normalizarFactura = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");
  const facturaActualNormalizada = normalizarFactura(numeroFactura);
  // Una compra ANULADA no bloquea su número: se puede registrar otra factura
  // con el mismo (el backend no tiene UNIQUE sobre n_factura).
  const facturaDuplicada = gestiones.some(
    (g) =>
      g.estado !== "Anulado" &&
      g.numeroFactura &&
      g.numeroFactura.trim().toUpperCase().replace(/\s+/g, "") === facturaActualNormalizada,
  );

  // ������ Validación en tiempo real (patrón de MiPerfilScreen) ������������������������������������������������������
  const [tocado, setTocado] = useState({ numeroFactura: false, fechaFactura: false });
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  const errorNumeroFactura = numeroFactura.trim()
    ? facturaDuplicada
      ? "Ya existe una compra con este número de factura"
      : undefined
    : "Ingresa el número de factura.";
  const [facturaTocada, setFacturaTocada] = useState(false);
  /**
   * Reglas de la fecha de factura, comparando el texto "YYYY-MM-DD" del input:
   * 1) obligatoria, 2) no futura (hoy SÍ vale: `today` es la fecha local), y
   * 3) no anterior a la orden. Todas se comparan como texto, nunca pasando la
   * fecha por new Date("YYYY-MM-DD"), que se calcula en UTC.
   */
  const errorFechaFactura = !fechaFactura.trim()
    ? "Ingresa la fecha de la factura"
    : !/^\d{4}-\d{2}-\d{2}$/.test(fechaFactura.trim())
      ? "La fecha de la factura debe tener formato YYYY-MM-DD"
      : undefined;
  const _errorFechaFacturaLegacy = true ? undefined
    : fechaFactura > today
      ? "La fecha de la factura no puede ser futura"
      : aFechaIso(orden.fecha) && fechaFactura < aFechaIso(orden.fecha)
        ? `La fecha de la factura no puede ser anterior a la fecha de la orden (${fechaCorta(orden.fecha)})`
        : undefined;
  const errorProveedor = orden.proveedor.trim()
    ? undefined
    : "La orden no tiene proveedor asignado.";
  // Debe haber al menos un insumo con cantidad mayor que cero.
  const errorItems =
    [...items, ...itemsExtra].some((i) => i.cantidadRecibida > 0)
      ? undefined
      : "Registra al menos un insumo con cantidad mayor que cero.";
  const lineaSinFactorPresentacion = [...items, ...itemsExtra].find((item) => {
    if (item.cantidadRecibida <= 0 || !esEmpaque(item.unidad)) return false;
    const unidadBase =
      item.unidadBase ??
      insumos.find((insumo) => insumo.id === item.idInsumo)?.unidadMedida ??
      "";
    const factor =
      item.factorPresentacion ??
      factorDePresentacion(
        item.unidad,
        unidadBase,
        presentacionesPorInsumo[item.idInsumo] ?? [],
      );
    return factor == null || factor <= 0;
  });

  const formValido =
    !errorNumeroFactura &&
    !errorFechaFactura &&
    !errorProveedor &&
    !errorItems &&
    !lineaSinFactorPresentacion &&
    !facturaDuplicada;
  const algunoTocado = tocado.numeroFactura || tocado.fechaFactura;
  const marcarTocado = (campo: "numeroFactura" | "fechaFactura") =>
    setTocado((t) => ({ ...t, [campo]: true }));

  /** Clase del input: resalta en rojo cuando el campo visible es inválido. */
  const campoCls = (error?: string) =>
    `${iCls} transition-colors ${error ? "border-red-400 focus:ring-red-300" : ""}`;

  const costoConIva = (monto: number, iva: number, modo: ModoIva = "incluido") =>
    modo === "mas_iva" ? monto * (1 + (iva || 0) / 100) : monto;

  /** Costo con IVA POR UNIDAD de una línea ya montada (solicitada o extra):
   *  con paca/caja el costoUnitario de la línea es por presentación, así que
   *  se divide en `unidadesPorLinea` (unidad suelta y líneas viejas ⇒ 1). */
  const costoConIvaDeLinea = (item: {
    costoUnitario: number;
    iva?: number;
    modoIva?: ModoIva;
    unidadesPorEmpaque?: number;
  }) =>
    costoConIva(item.costoUnitario, item.iva ?? 0, item.modoIva) /
    unidadesPorLinea(item);

  /** Punto 2: precio de venta inválido (vacío, 0 o ≤ costo con IVA). */
  const pvInvalido = (item: ItemRecibido) => {
    const pv = item.precioVenta ?? 0;
    return pv <= 0 || pv <= costoConIvaDeLinea(item);
  };

  /** Punto 2: mensaje en vivo de una fila pedida en la OC. Aplica sólo a
   *  PRODUCTOS con cantidad recibida > 0 (los insumos no llevan precio; con
   *  0 recibido la fila queda fuera de la factura y no exige precio). */
  const errorPvDe = (item: ItemRecibido): string | undefined => {
    if ((item.tipoItem ?? "insumo") !== "producto") return undefined;
    if (item.cantidadRecibida <= 0) return undefined;
    if ((item.precioVenta ?? 0) <= 0) return "Falta el precio de venta.";
    if (pvInvalido(item)) return "Debe superar el costo por unidad con IVA.";
    return undefined;
  };

  /** Filas de producto de "Recibido según factura" con precio inválido. */
  const filasPvMala = items.filter(
    (i) =>
      (i.tipoItem ?? "insumo") === "producto" &&
      i.cantidadRecibida > 0 &&
      pvInvalido(i)
  );

  /** Punto 2: TODO lo que impide guardar — productos pedidos recibidos sin
   *  precio válido + los extras de producto (que siempre van en la factura). */
  const lineasPvMala = [
    ...filasPvMala,
    ...itemsExtra.filter(
      (i) => (i.tipoItem ?? "insumo") === "producto" && pvInvalido(i)
    ),
  ];

  /** Ajuste (bloque 2): columna "Precio de vta" de "Recibido según factura".
   *  Se muestra sólo si la orden trae al menos una fila de PRODUCTO; en las
   *  filas de insumo la celda queda vacía y si la orden es sólo de insumos no
   *  se pinta la columna. */
  const mostrarColPrecioVta = items.some(
    (i) => (i.tipoItem ?? "insumo") === "producto"
  );

  /** Sugerencia del desplegable "Agregar no solicitado": misma forma para
   *  insumos y productos, más el precio de venta (sólo los productos). */
  type SugEx = {
    id: string;
    nombre: string;
    unidadMedida: string;
    costoUnitario: number;
    iva: number;
    precioVenta?: number;
    /** Presentación de la bebida ("1.5 L") para la segunda línea. */
    contenido?: string;
    /** Unidades por paca/caja del producto (sólo con presentación). */
    unidadesPorEmpaque?: number;
    /** Historial de compra: último monto SIN IVA de la presentación y su %
     *  (los escribe `aplicarPreciosCompra`); sin él la precarga es la de
     *  siempre. Punto C2: `ultimoMontoDigitado` es el monto TAL CUAL digitado
     *  (si existe, manda sobre `ultimoMontoSinIva`). */
    ultimoMontoSinIva?: number;
    ultimoIvaCompra?: number;
    ultimoMontoDigitado?: number;
  };

  const exSugs = useMemo<SugEx[]>(() => {
    if (exNombre.trim().length < 1) return [];
    const q = exNombre.toLowerCase();

    // P14: el buscador mira un catálogo u otro según el tipo elegido.
    if (exTipo === "producto") {
      // Mismo criterio que la Nueva compra: sólo productos terminados (los
      // "Producto insumo" se producen, no se compran). Bloque 2.5: se ofrecen
      // aunque estén "No disponible" (los recién creados con "+ Crear
      // producto" nacen así); sólo se excluyen los DESCONTINUADOS. Punto B6:
      // además se excluyen los ids que ya están en la OC o en facturas
      // previas de la orden.
      return (productos ?? [])
        .filter(
          (p) =>
            p.estado !== "Descontinuado" &&
            p.tipo === "Producto terminado" &&
            !idsOrdenActual.has(p.id) &&
            !registrados.has(p.id) &&
            !nombresRegistrados.has(p.nombre.toLowerCase().trim()) &&
            // El buscador mira también el contenido ("coca 1.5") para
            // distinguir presentaciones del mismo producto.
            (nombreBuscable(p).toLowerCase().includes(q) ||
              p.nombre.toLowerCase().includes(q))
        )
        .slice(0, 3)
        .map((p) => {
          const factor = empaqueDe(p);
          return {
            id: p.id,
            nombre: p.nombre,
            contenido: contenidoDe(p) || undefined,
            // La Medida muestra la presentación de compra ("Paca x12").
            unidadMedida: presentacionCompra(p),
            unidadesPorEmpaque: factor > 1 ? factor : undefined,
            // Punto B1 + ajuste: el monto es SIEMPRE `costoUnitario` (POR
            // UNIDAD en el catálogo) por las unidades de la presentación —
            // el precio de la paca. NUNCA el precio de venta como respaldo.
            costoUnitario: Number(p.costoUnitario || 0) * factor,
            iva: 0,
            // El precio de VENTA es `precioUnitario` del catálogo (por
            // unidad suelta; el costo es `costoUnitario` también por unidad).
            precioVenta: Number(p.precioUnitario || 0),
            // Ajuste: historial de compra para precargar monto e IVA.
            // Punto C2: también el monto digitado TAL CUAL (si existe, manda).
            ultimoMontoSinIva: p.ultimoMontoSinIva,
            ultimoIvaCompra: p.ultimoIvaCompra,
            ultimoMontoDigitado: p.ultimoMontoDigitado,
          };
        });
    }

    return [...nuevosInsumosPendientes.map((n) => ({ ...n, tipo: "Insumo" as const, estado: "activo" as const })), ...insumos]
      .filter(
        (i) =>
          (i.tipo ?? "Insumo") === "Insumo" &&
          i.estado === "activo" &&
          !registrados.has(i.id) &&
          !nombresRegistrados.has(i.nombre.toLowerCase().trim()) &&
          i.nombre.toLowerCase().includes(q)
      )
      .slice(0, 3);
  }, [
    insumos,
    productos,
    exNombre,
    exTipo,
    registrados,
    nombresRegistrados,
    idsOrdenActual,
    nuevosInsumosPendientes,
  ]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (
        exRef.current &&
        !exRef.current.contains(e.target as Node)
      ) {
        setExShowSug(false);
      }
    };

    document.addEventListener("mousedown", fn);

    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const updRec = (rowId: string, value: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              cantidadRecibida: Math.max(
                0,
                Math.min(value, cantidadMaximaRecibida(item))
              ),
            }
          : item
      )
    );
  };

  /**
   * Quita el insumo de esta factura. Solo afecta a la lista local: el pedido de
   * la OC no cambia, así que el insumo sigue pendiente para una factura futura.
   */
  const quitarItem = (rowId: string, nombre: string) => {
    setItems((prev) => prev.filter((item) => item.rowId !== rowId));

    toast.success(`"${nombre}" no viene en esta factura. Queda pendiente.`);
  };

  /** Punto 2: precio de venta a mano en una fila pedida en la OC (sólo las
   *  filas de producto lo muestran). */
  const updPvFila = (rowId: string, value: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.rowId === rowId
          ? { ...item, precioVenta: Math.max(0, value) }
          : item
      )
    );
  };

  /** Cambiar el Monto unitario sólo actualiza el monto: con el % de ganancia
   *  fuera de la pantalla el precio de venta ya no se recalcula solo (queda a
   *  criterio del usuario y se valida al guardar). */
  const updMontoFila = (rowId: string, value: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.rowId === rowId
          ? { ...item, costoUnitario: Math.max(0, value) }
          : item
      )
    );
  };

  const updModoIvaFila = (rowId: string, modoIva: ModoIva) => {
    setItems((prev) =>
      prev.map((item) =>
        item.rowId === rowId
          ? modoIva === "exento"
            ? { ...item, modoIva, ivaAntesDeExento: item.iva, iva: 0 }
            : item.modoIva === "exento"
              ? { ...item, modoIva, iva: item.ivaAntesDeExento, ivaAntesDeExento: undefined }
              : { ...item, modoIva }
          : item,
      ),
    );
  };

  const updIvaFila = (rowId: string, value: number | undefined) => {
    setItems((prev) =>
      prev.map((item) =>
        item.rowId === rowId
          ? { ...item, iva: value == null ? undefined : Math.min(100, Math.max(0, value)) }
          : item,
      ),
    );
  };

  const opcionesPresentacionDe = (item: ItemRecibido): OpcionUnidad[] => {
    const base = unidadBaseDe(item);
    const opciones = unidadesCompatibles(base).map((u) => ({ valor: u, etiqueta: u }));
    const vistas = new Set(opciones.map((opcion) => opcion.valor));
    (presentacionesPorInsumo[item.idInsumo] ?? []).forEach((presentacion) => {
      if (vistas.has(presentacion.presentacion)) return;
      vistas.add(presentacion.presentacion);
      opciones.push({
        valor: presentacion.presentacion,
        etiqueta: `${presentacion.presentacion} ×${presentacion.unidadesBase} ${base}`,
      });
    });
    if (!vistas.has(item.unidad)) {
      opciones.push({ valor: item.unidad, etiqueta: item.unidad });
    }
    return opciones;
  };

  const updPresentacionFila = (rowId: string, unidad: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.rowId !== rowId) return item;
        const factorAnterior = factorDeUnidadRecibida(item);
        const factor = factorDeUnidadRecibida(item, unidad);
        const cantidadBase = factorAnterior
          ? item.cantidadRecibida * factorAnterior
          : item.cantidadRecibida;
        const cantidadRecibida = factor
          ? Math.min(
              cantidadBase / factor,
              item.unidadesPendientesBase != null
                ? item.unidadesPendientesBase / factor
                : Number.POSITIVE_INFINITY,
            )
          : item.cantidadRecibida;
        return {
          ...item,
          unidad,
          cantidadRecibida,
          factorPresentacion: esEmpaque(unidad) ? factor : undefined,
        };
      }),
    );
  };

  const limpiarFormularioExtra = (
    tipo: "insumo" | "producto" = exTipo,
    cancelarEdicion = true
  ) => {
    setExNombre("");
    setExId("");
    setExCategoriaInsumoId(undefined);
    setExCant(1);
    setExUnidad(tipo === "producto" ? "" : UNIDADES[0]);
    setExUnidadBase("");
    setExEmpaque(undefined);
    setExPrecio(0);
    setExIva(undefined);
    setExIvaAntesDeExento(undefined);
    setExModoIva("incluido");
    setExPrecioVenta(0);
    setExShowSug(false);
    if (cancelarEdicion) setEditExtraId(null);
  };

  const addExtra = (
    values: CompactInsumoFormValues,
  ) => {
    if (!exNombre.trim()) {
      toast.error(
        exTipo === "producto"
          ? "Ingresa el nombre del producto."
          : "Ingresa el nombre del insumo."
      );
      return;
    }

    if (values.cantidad <= 0) {
      toast.error("La cantidad debe ser mayor que 0.");
      return;
    }

    if (!Number.isFinite(values.precio) || values.precio <= 0) {
      toast.error("El monto unitario debe ser mayor que cero.");
      return;
    }
    if (values.modoIva !== "exento" && values.iva == null) {
      toast.error("Ingresa el IVA.");
      return;
    }
    if (values.modoIva !== "exento" && (!Number.isFinite(values.iva) || values.iva < 0 || values.iva > 100)) {
      toast.error("El IVA debe estar entre 0 y 100.");
      return;
    }

    // Punto B6 + punto 3 + ajuste: mismo bloqueo que en la Nueva compra — un
    // producto no solicitado se agrega únicamente con precio de venta > 0 y >
    // al costo CON IVA POR UNIDAD.
    if (exTipo === "producto") {
      if ((values.precioVenta ?? 0) <= 0) {
        toast.error("El precio de venta del producto debe ser mayor que cero.");
        return;
      }
      const factorProducto = unidadesPorLinea({ unidadesPorEmpaque: exEmpaque });
      const costoRef = costoConIva(values.precio, values.iva, values.modoIva ?? "incluido") / factorProducto;
      if ((values.precioVenta ?? 0) <= costoRef) {
        toast.error("El precio de venta debe ser mayor que el costo por unidad con IVA.");
        return;
      }
    }

    const nuevoPendiente = nuevosInsumosPendientes.find(
      (n) => (exId && n.id === exId) || mismoNombre(n.nombre, exNombre.trim()),
    );
    const catIdNuevo = exCategoriaInsumoId ?? (nuevoPendiente ? Number(nuevoPendiente.categoriaId) : undefined);

    const lineaExtra: ItemRecibido = {
        rowId: editExtraId ?? `ex-${Date.now()}`,
        // Punto B6: con id elegido del catálogo la línea se asimila a ese
        // ítem (y el stock se aplica sobre él); sin selección se guarda con
        // id sintético para no fusionar líneas distintas.
        idInsumo: exId || `INS-EX-${Date.now()}`,
        idCategoriaInsumo: catIdNuevo,
        esNuevoInsumo: catIdNuevo ? true : undefined,
        nombre: exNombre.trim(),
        cantidadSolicitada: 0,
        cantidadRecibida: values.cantidad,
        // Medida de la fila: la presentación de compra del producto o la
        // unidad elegida; vacía ⇒ "und" para no dejar la fila en blanco.
        unidad: exUnidad.trim() || "und",
        precioReferencia: values.precio,
        costoUnitario: values.precio,
        precioUnitario: values.precio,
        iva: values.modoIva === "exento" ? 0 : values.iva,
        modoIva: values.modoIva ?? exModoIva,
        // P14: de qué catálogo salió la línea y, si es producto, su precio
        // de venta al público (ya validado arriba: siempre > 0 y > costo).
        tipoItem: exTipo,
        precioVenta: exTipo === "producto" ? values.precioVenta : undefined,
        unidadesPorEmpaque:
          exTipo === "producto" && exEmpaque && exEmpaque > 1
            ? exEmpaque
            : undefined,
        unidadBase:
          exTipo === "insumo" ? (values.unidadBase ?? exUnidadBase) || undefined : undefined,
        factorPresentacion:
          exTipo === "insumo" && esEmpaque(exUnidad)
            ? values.factorPresentacion
            : undefined,
      };

    setItemsExtra((prev) =>
      editExtraId
        ? prev.map((item) =>
            item.rowId === editExtraId
              ? { ...item, ...lineaExtra, rowId: item.rowId }
              : item
          )
        : [...prev, lineaExtra]
    );
    limpiarFormularioExtra();

    toast.success(
      editExtraId
        ? "Ítem adicional actualizado."
        : exTipo === "producto"
          ? "Producto adicional agregado."
          : "Insumo adicional agregado."
    );
  };

  const startEditExtra = (item: ItemRecibido) => {
    setEditExtraId(item.rowId);
    setExTipo(item.tipoItem ?? "insumo");
    setExNombre(item.nombre);
    setExId(item.idInsumo);
    setExCategoriaInsumoId(item.idCategoriaInsumo);
    setExCant(item.cantidadRecibida);
    setExUnidad(item.unidad);
    setExUnidadBase(
      item.unidadBase ??
        insumos.find((insumo) => insumo.id === item.idInsumo)?.unidadMedida ??
        "",
    );
    setExEmpaque(item.unidadesPorEmpaque);
    setExPrecio(item.costoUnitario);
    setExIva(item.iva);
    setExIvaAntesDeExento(item.ivaAntesDeExento);
    setExModoIva(item.modoIva ?? "incluido");
    setExPrecioVenta(item.precioVenta ?? 0);
    setExShowSug(false);
    exRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const totalPedido = orden.total ?? orden.items.reduce(
    (total, item) => total + item.cantidad * item.costoUnitario,
    0
  );

  // Totales por línea con el modo de IVA elegido para cada ítem.
  const totalRec = [...items, ...itemsExtra].reduce(
    (total, item) =>
      total +
      calcularLineaIva({
        cantidad: item.cantidadRecibida,
        montoUnitario: item.costoUnitario,
        porcentajeIva: item.iva ?? 0,
        modoIva: item.modoIva ?? "incluido",
      }).subtotalConIva,
    0
  );

  /** Suma una factura al acumulado de lo recibido en la OC. */
  const acumular = (
    mapa: Map<string, { nombre: string; unidad: string; cantidad: number; costoUnitario: number; precioUnitario: number; iva: number }>,
    item: OrdenItem
  ) => {
    const previo = mapa.get(item.idInsumo);

    if (previo) {
      previo.cantidad += item.cantidad;
      previo.costoUnitario = item.costoUnitario;
      previo.precioUnitario = item.precioUnitario;
      previo.iva = item.iva;
    } else {
      mapa.set(item.idInsumo, {
        nombre: item.nombre,
        unidad: item.unidad,
        cantidad: item.cantidad,
        costoUnitario: item.costoUnitario,
        precioUnitario: item.precioUnitario,
        iva: item.iva,
      });
    }
  };

  const guardarRecepcion = () => {
    setIntentoGuardar(true);

    if (!numeroFactura.trim()) {
      enfocarCampo(numeroFacturaRef);
      toast.error("Ingresa el número de factura.");
      return;
    }

    // Validación de factura duplicada (normalizando mayúsculas/espacios:
    // "fac-123456" y "FAC-123456" son la misma factura).
    const normalizarFactura = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");
    const facturaActualNormalizada = normalizarFactura(numeroFactura);
    // Mismo backstop que el campo en vivo: las compras ANULADAS no cuentan
    // como duplicado (ver `facturaDuplicada` arriba).
    const facturaDuplicada = gestiones.some(
      (g) =>
        g.estado !== "Anulado" &&
        g.numeroFactura &&
        normalizarFactura(g.numeroFactura) === facturaActualNormalizada,
    );
    if (facturaDuplicada) {
      enfocarCampo(numeroFacturaRef);
      toast.error("Ya existe una compra con este número de factura");
      return;
    }

    if (!fechaFactura) {
      enfocarCampo(fechaFacturaRef);
      toast.error("Selecciona la fecha de la factura.");
      return;
    }

    // Mismas reglas que las del campo: sin esto se podría guardar una fecha
    // futura o anterior a la orden aunque el campo aparezca en rojo.
    if (errorFechaFactura) {
      enfocarCampo(fechaFacturaRef);
      toast.error(errorFechaFactura);
      return;
    }

    if (!orden.proveedor.trim()) {
      // El aviso del proveedor se pinta justo debajo del campo de fecha.
      enfocarCampo(fechaFacturaRef);
      toast.error("La orden no tiene proveedor asignado.");
      return;
    }

    const filasRecibidas = items.filter((item) => item.cantidadRecibida > 0);

    if (filasRecibidas.length === 0 && itemsExtra.length === 0) {
      enfocarCampo(itemsMsgRef);
      toast.error("Registra al menos un insumo recibido en la factura.");
      return;
    }
    const ivaInvalido = [...filasRecibidas, ...itemsExtra].find(
      (item) =>
        (item.modoIva ?? "incluido") !== "exento" &&
        (item.iva == null || !Number.isFinite(item.iva) || item.iva < 0 || item.iva > 100),
    );
    if (ivaInvalido) {
      toast.error(ivaInvalido.iva == null ? "Ingresa el IVA." : "El IVA debe estar entre 0 y 100.");
      return;
    }
    if (lineaSinFactorPresentacion) {
      toast.error(
        `Configura el contenido de la presentación "${lineaSinFactorPresentacion.unidad}" para "${lineaSinFactorPresentacion.nombre}".`,
      );
      return;
    }

    // Punto 2 + punto 3 + ajuste: ninguna recepción se guarda con un producto
    // cuyo precio de venta esté vacío, en 0 o ≤ costo POR UNIDAD con IVA (el
    // botón Guardar ya viene deshabilitado y la tabla lo marca en rojo; esto
    // es el backstop).
    const pvMala = lineasPvMala[0];
    if (pvMala) {
      toast.error(
        (pvMala.precioVenta ?? 0) <= 0
          ? `«${pvMala.nombre}»: falta el precio de venta del producto.`
          : `«${pvMala.nombre}»: el precio de venta debe ser mayor que el costo por unidad con IVA.`
      );
      return;
    }

    setShowGuardarConf(true);
  };

  const confirmarGuardar = async () => {
    if (guardando) return;
    setGuardando(true);

    // Guardar NUNCA puede fallar en silencio: cualquier excepción (props mal
    // pasadas, error del backend al persistir, etc.) se informa en pantalla y
    // la recepción queda como estaba para poder reintentar.
    try {
      await guardarConfirmado();
      setShowGuardarConf(false);
    } catch (e) {
      console.error("No se pudo guardar la recepción:", e);
      toast.error(
        `No se pudo guardar la recepción: ${e instanceof Error ? e.message : String(e)}`
      );
    } finally {
      setGuardando(false);
    }
  };

  const guardarConfirmado = async () => {
    const filasRecibidas = items.filter((item) => item.cantidadRecibida > 0);

    // Un insumo es "no solicitado" si su id no está en el detalle de la OC:
    // así queda marcado en el guardado y además sirve para comparar después.
    const idsOrdenFactura = new Set(orden.items.map((item) => item.idInsumo));

    // Esta factura: solo lo que trae, con su número, fecha y total propios.
    // Cada línea guarda su porcentaje y sus valores de IVA (base e IVA).
    const itemsFactura: OrdenItem[] = [...filasRecibidas, ...itemsExtra].map(
      (item) => {
        const linea = calcularLineaIva({
          cantidad: item.cantidadRecibida,
          montoUnitario: item.costoUnitario,
          porcentajeIva: item.iva ?? 0,
          modoIva: item.modoIva ?? "incluido",
        });

        return {
          rowId: item.rowId,
          idInsumo: item.idInsumo,
          nombre: item.nombre,
          cantidad: item.cantidadRecibida,
          unidad: item.unidad,
          costoUnitario: item.costoUnitario,
          precioUnitario: item.costoUnitario,
          iva: item.iva ?? 0,
          modoIva: item.modoIva ?? "incluido",
          baseSinIva: linea.baseSinIva,
          montoIva: linea.montoIva,
          esNoSolicitado: !idsOrdenFactura.has(item.idInsumo),
          // P14: se conserva el catálogo y el precio de venta para que el
          // detalle de la compra pueda seguir mostrando "Producto · Venta".
          tipoItem: item.tipoItem,
          precioVenta: item.precioVenta,
          // Ajuste de bebidas: el empaque viaja con la línea para que stock
          // y costo por unidad se repartan en sus unidades (sin el dato se
          // lee como 1: unidad suelta y compras viejas no cambian).
          unidadesPorEmpaque: item.unidadesPorEmpaque,
          ...(item.unidadBase ? { unidadBase: item.unidadBase } : {}),
          ...(esEmpaque(item.unidad) && item.factorPresentacion != null
            ? { factorPresentacion: item.factorPresentacion }
            : {}),
          ...(item.idCategoriaInsumo != null ? { idCategoriaInsumo: item.idCategoriaInsumo } : {}),
          ...(item.esNuevoInsumo ? { esNuevoInsumo: true } : {}),
        };
      }
    );

    // 5.1: la recepción la registra el backend (crea la compra, suma el stock
    // de insumos y productos, actualiza costos y recalcula lo pendiente de la
    // OC). Recepción parcial → la OC queda Enviado; si llegó todo → Completado.
    // Sin puentes temporales: ya no se llama entradaCompra/reversaCompra ni se
    // suma stock en local (lo hace el servidor dentro de la recepción).
    const noSolicitados = itemsFactura.filter((it) => it.esNoSolicitado);
    const solicitados = itemsFactura.filter((it) => !it.esNoSolicitado);
    const resultado = await recibirOrdenCompra(orden.id, {
      n_factura: numeroFactura.trim(),
      fecha: fechaFactura,
      items: solicitados,
      items_no_solicitados: noSolicitados,
    });

    const compraCreada = mapearCompraApi(resultado.compra as CompraApi);
    setGestiones((prev) => [compraCreada, ...prev]);

    // El resumen del servidor es el que muestra lo pendiente en la pantalla.
    const recepcion: Recepcion = mapearRecepcion(resultado.recepcion) ?? {
      items: [],
      itemsExtra: [],
      usarLotes: false,
      fechaRecepcion: today,
    };
    const sinCubrir = recepcion.items.filter((it) => !it.facturado);
    const _sinCubrirLegacy = recepcion.items.filter(
      (it) => it.cantidadRecibida + 0.000001 < it.cantidadSolicitada,
    );

    onGuardar(recepcion, resultado.estado);
    // 5.2: después de guardar se recargan la OC, las compras, los insumos y
    // los productos (el backend cambió su stock y sus precios).
    await onRecargarCatalogo?.();

    toast.success(
      resultado.estado === "Completado"
        ? `Factura ${numeroFactura.trim()} guardada · OC ${orden.id} completada`
        : `Factura ${numeroFactura.trim()} guardada · ${sinCubrir.length} insumo(s) pendiente(s) en la OC ${orden.id}`,
    );

    onBack();
  };

  return (
    <div className="px-4 sm:px-6 pt-5 pb-4 h-full flex flex-col overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-5 pb-5 border-b border-border shrink-0">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          title="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            Recepción de compra
          </h1>

          <p className="text-sm text-muted-foreground mt-0.5">
            OC {orden.id} · {orden.proveedor} · {today}
          </p>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL — dos columnas (mismo patrón que "Crear Producto").
          Cada columna scrollea por dentro porque la raíz de esta pantalla es
          `h-full overflow-hidden` (pantalla locked): sin ese scroll, el
          contenido por debajo del viewport quedaría inalcanzable. */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-8 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* =========================================================
              COLUMNA IZQUIERDA — ORDEN DE COMPRA (solo lectura)
          ========================================================= */}
          <div className="w-full lg:w-1/2 overflow-y-auto pr-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Orden de compra
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Insumos pedidos · solo lectura
            </p>

            <div className="space-y-5">
              {/* Información */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    N· Orden
                  </p>
                  <p className="text-sm font-bold mt-1">
                    {orden.id}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Proveedor
                  </p>
                  <p className="text-sm font-bold mt-1">
                    {orden.proveedor}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Fecha
                  </p>
                  <p className="text-sm font-semibold mt-1">
                    {orden.fecha}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Estado
                  </p>
                  <span
                    className={`inline-flex mt-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      orden.estado === "Completado"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {orden.estado}
                  </span>
                </div>
              </div>

              {/* Tabla ��� insumos pedidos (solo lectura) */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">
                  Insumos solicitados
                </h3>

                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[480px]">
                      <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
                        <tr>
                          <th className="px-3 py-3 text-left font-semibold">
                            Insumo
                          </th>

                          <th className="px-3 py-3 text-left font-semibold">
                            Cantidad
                          </th>

                          <th className="px-3 py-3 text-left font-semibold">
                            Unidad
                          </th>

                          <th className="px-3 py-3 text-left font-semibold">
                            P. referencia
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-border">
                        {orden.items.map((item) => (
                          <tr key={item.rowId}>
                            <td className="px-3 py-3 font-semibold">
                              {item.nombre}
                              {(Boolean(item.facturado) || registrados.has(item.idInsumo)) && (
                                <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                                  Facturado
                                </span>
                              )}
                            </td>

                            <td className="px-3 py-3">
                              {item.cantidad}
                            </td>

                            <td className="px-3 py-3 text-xs text-muted-foreground">
                              {item.unidad}
                            </td>

                            <td className="px-3 py-3">
                              {fmtCOP(item.costoUnitario)}
                            </td>
                          </tr>
                        ))}
                      </tbody>

                      <tfoot className="bg-muted/50 border-t border-border">
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-2 text-xs font-bold text-muted-foreground text-right uppercase tracking-wider"
                          >
                            Total pedido
                          </td>
                          <td className="px-3 py-2 text-sm font-bold text-foreground">
                            {fmtCOP(totalPedido)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================
              COLUMNA DERECHA ��� COMPRA (factura del proveedor)
          ========================================================= */}
          <div className="w-full lg:w-1/2 overflow-y-auto pr-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Compra
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Compara factura y orden.
            </p>

            <div className="space-y-5">
              {/* Datos de la factura */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Número de factura <span className="text-red-500">*</span>
                  </label>

                  <input
                    ref={numeroFacturaRef}
                    value={numeroFactura}
                    onChange={(e) =>
                      setNumeroFactura(e.target.value)
                    }
                    onBlur={() => { marcarTocado("numeroFactura"); setFacturaTocada(true); }}
                    placeholder="Ej: FAC-000123"
                    className={campoCls(
                      (tocado.numeroFactura || facturaTocada || intentoGuardar)
                        ? errorNumeroFactura
                        : undefined
                    )}
                    aria-invalid={!!((tocado.numeroFactura || facturaTocada || intentoGuardar) && errorNumeroFactura)}
                  />
                  {(tocado.numeroFactura || facturaTocada || intentoGuardar) && errorNumeroFactura && (
                    <p className="text-xs text-red-500 mt-1 ml-0.5">
                      {errorNumeroFactura}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Fecha de factura <span className="text-red-500">*</span>
                  </label>

                  <CalendarDropdown
                    value={fechaFactura}
                    onChange={(v) => setFechaFactura(v)}


                    error={!!((tocado.fechaFactura || intentoGuardar) && errorFechaFactura)}
                    onBlur={() => marcarTocado("fechaFactura")}
                  />
                  {(tocado.fechaFactura || intentoGuardar) && errorFechaFactura && (
                    <p className="text-xs text-red-500 mt-1 ml-0.5">
                      {errorFechaFactura}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-muted-foreground">
                    Proveedor:{" "}
                    <span
                      className={`font-semibold ${
                        errorProveedor ? "text-red-500" : "text-foreground"
                      }`}
                    >
                      {orden.proveedor || "Sin proveedor"}
                    </span>
                  </p>
                  {errorProveedor && (
                    <p className="text-xs text-red-500 mt-1 ml-0.5">
                      {errorProveedor}
                    </p>
                  )}
                </div>
              </div>

              {/* Recibido según factura */}
              <div>
                {errorItems && (algunoTocado || intentoGuardar) && (
                  <p ref={itemsMsgRef} className="text-xs text-red-500 mb-2 ml-0.5">
                    {errorItems}
                  </p>
                )}
                {lineaSinFactorPresentacion && (
                  <p className="text-xs text-red-500 mb-2 ml-0.5">
                    Configura el contenido de {lineaSinFactorPresentacion.unidad} para{" "}
                    {lineaSinFactorPresentacion.nombre}.
                  </p>
                )}

                {/* Punto 2: aviso en vivo de los precios de venta faltantes o
                    inválidos (mismo criterio que pinta las celdas en rojo y
                    deshabilita el botón Guardar). */}
                {filasPvMala.length > 0 && (
                  <p className="text-xs font-medium text-red-500 mb-2 ml-0.5">
                    Corrige el precio de venta de {filasPvMala.length}{" "}
                    {filasPvMala.length === 1 ? "producto" : "productos"}: debe
                    ser mayor que el costo por unidad con IVA.
                  </p>
                )}

                <h3 className="text-sm font-bold text-foreground mb-3">
                  Recibido según factura
                </h3>

                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[820px]">
                      <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
                        <tr>
                          <th className="px-3 py-3 text-left font-semibold">
                            Insumo
                          </th>

                          <th className="px-3 py-3 text-left font-semibold leading-tight">
                            Cantidad +<br />presentación
                          </th>

                          <th className="px-3 py-3 text-left font-semibold">
                            Monto unitario
                          </th>

                          <th className="px-3 py-3 text-left font-semibold">
                            IVA
                          </th>

                          {/* Ajuste (bloque 2): sin "Ganancia %"; "Precio de
                              vta" sólo si la orden trae productos. */}
                          {mostrarColPrecioVta && (
                            <th className="px-3 py-3 text-left font-semibold">
                              Precio de vta
                            </th>
                          )}

                          <th className="px-3 py-3 text-left font-semibold">
                            Subtotal
                          </th>

                          <th />
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-border">
                        {items.length === 0 ? (
                          <tr>
                            <td
                              colSpan={mostrarColPrecioVta ? 7 : 6}
                              className="px-3 py-8 text-center text-xs text-muted-foreground"
                            >
                              Todos los insumos de la OC {orden.id} ya
                              se registraron en facturas anteriores
                            </td>
                          </tr>
                        ) : (
                          items.map((item) => (
                          <tr key={item.rowId}>
                            <td className="px-3 py-3">
                              <p className="font-semibold">
                                {item.nombre}
                              </p>

                              <p className="text-[11px] text-muted-foreground break-words">
                                {(item.tipoItem ?? "insumo") === "producto" && "Producto · "}
                                {formatearModoIvaEnTabla(item.modoIva ?? "incluido", item.iva)}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Pedido: {item.cantidadSolicitada}{" "}
                                {item.unidadSolicitada ?? item.unidad}
                              </p>
                            </td>

                            <td className="px-3 py-3">
                              <div className="flex flex-col items-start gap-1.5">
                                {(item.tipoItem ?? "insumo") === "producto" ? (
                                  <span className="text-xs text-muted-foreground">{item.unidad}</span>
                                ) : (
                                  <UnidadSelect
                                    value={item.unidad}
                                    onChange={(unidad) => updPresentacionFila(item.rowId, unidad)}
                                    ariaLabel={`Presentación de ${item.nombre}`}
                                    unidades={opcionesPresentacionDe(item)}
                                    fieldClassName="bg-background border border-border text-foreground h-9 rounded-lg text-xs"
                                  />
                                )}
                                <input
                                  type="number"
                                  min={0}
                                  max={cantidadMaximaRecibida(item)}
                                  value={item.cantidadRecibida === 0 ? "" : item.cantidadRecibida}
                                  placeholder="0"
                                  aria-label={`Cantidad recibida de ${item.nombre}`}
                                  onChange={(e) =>
                                    updRec(
                                      item.rowId,
                                      numeroDeInput(limpiarNumeroInput(e.target.value))
                                    )
                                  }
                                  className="w-20 px-2 py-2 bg-background border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary/30"
                                />
                                {esEmpaque(item.unidad) && (
                                  <span className="text-[11px] text-muted-foreground">
                                    {etiquetaPresentacion(item.unidad, factorDeUnidadRecibida(item), unidadBaseDe(item))}
                                  </span>
                                )}
                              </div>
                              {factorDeUnidadRecibida(item) == null && esEmpaque(item.unidad) && (
                                <p className="mt-1 text-[10px] text-red-500">
                                  Falta configurar el contenido de esta presentación.
                                </p>
                              )}
                            </td>

                            <td className="px-3 py-3">
                              {/* 0 = vacío (punto B1): al borrar no reaparece el 0. */}
                              <input
                                type="number"
                                min={0}
                                max={cantidadMaximaRecibida(item)}
                                value={item.cantidadRecibida === 0 ? "" : item.cantidadRecibida}
                                placeholder="0"
                                onChange={(e) =>
                                  updRec(
                                    item.rowId,
                                    numeroDeInput(limpiarNumeroInput(e.target.value))
                                  )
                                }
                                className="w-20 px-2 py-2 bg-background border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary/30"
                              />
                            </td>

                            <td className="px-3 py-3">
                              <input
                                type="number"
                                min={0}
                                value={item.costoUnitario === 0 ? "" : item.costoUnitario}
                                placeholder="0"
                                onChange={(e) =>
                                  updMontoFila(
                                    item.rowId,
                                    numeroDeInput(limpiarNumeroInput(e.target.value))
                                  )
                                }
                                className="w-24 px-2 py-2 bg-background border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary/30"
                              />
                              {/* Punto 3 + ajuste: el costo de referencia CON
                                  IVA POR UNIDAD con el que se valida el
                                  precio de venta (sólo en productos). Con
                                  paca/caja se muestra también el costo de la
                                  presentación. */}
                              {(item.tipoItem ?? "insumo") === "producto" && (
                                <>
                                  <p className="text-[10px] text-muted-foreground mt-1 text-center whitespace-nowrap">
                                    C/und: {fmtCOP(costoConIvaDeLinea(item))}
                                  </p>
                                  {unidadesPorLinea(item) > 1 && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5 text-center whitespace-nowrap">
                                      C/empaque:{" "}
                                      {fmtCOP(
                                        costoConIva(
                                          item.costoUnitario,
                                          item.iva ?? 0,
                                          item.modoIva,
                                        ),
                                      )}
                                    </p>
                                  )}
                                </>
                              )}
                            </td>

                            <td className="px-3 py-3">
                              {(item.modoIva ?? "incluido") !== "exento" && (
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={item.iva == null ? "" : item.iva}
                                  placeholder="0"
                                  onChange={(e) =>
                                    updIvaFila(
                                      item.rowId,
                                      e.target.value.trim() === ""
                                        ? undefined
                                        : numeroDeInput(limpiarNumeroInput(e.target.value)),
                                    )
                                  }
                                  className={`w-16 px-2 py-2 bg-background border rounded-lg text-sm text-center ${
                                    item.iva == null ? "border-red-400" : "border-border"
                                  }`}
                                />
                              )}
                              {(item.modoIva ?? "incluido") !== "exento" && item.iva == null && (
                                <p className="mt-1 text-[10px] text-red-500">Ingresa el IVA.</p>
                              )}
                              <div
                                className="mt-1 flex flex-wrap gap-1"
                                title={MODOS_IVA.map(ayudaModoIva).join(" · ")}
                              >
                                {MODOS_IVA.map((modo) => (
                                  <button
                                    key={modo}
                                    type="button"
                                    aria-pressed={(item.modoIva ?? "incluido") === modo}
                                    title={ayudaModoIva(modo)}
                                    onClick={() => updModoIvaFila(item.rowId, modo)}
                                    className={`rounded border px-1.5 py-1 text-[10px] font-semibold ${
                                      (item.modoIva ?? "incluido") === modo
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border text-muted-foreground"
                                    }`}
                                  >
                                    {ETIQUETA_MODO_IVA[modo].etiqueta}
                                  </button>
                                ))}
                              </div>
                            </td>

                            {/* Ajuste (bloque 2): sin columna de ganancia.
                                "Precio de vta" sólo se pinta en filas de
                                producto (y sólo si la orden trae productos);
                                los insumos no llevan precio. */}
                            {mostrarColPrecioVta &&
                              ((item.tipoItem ?? "insumo") === "producto" ? (
                                <td className="px-3 py-3 align-top">
                                  <input
                                    type="number"
                                    min={0}
                                    value={
                                      (item.precioVenta ?? 0) === 0
                                        ? ""
                                        : item.precioVenta
                                    }
                                    placeholder="0"
                                    onChange={(e) =>
                                      updPvFila(
                                        item.rowId,
                                        numeroDeInput(limpiarNumeroInput(e.target.value))
                                      )
                                    }
                                    className={`w-24 px-2 py-2 bg-background border rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary/30 ${
                                      errorPvDe(item)
                                        ? "border-red-400 focus:ring-red-300"
                                        : "border-border"
                                    }`}
                                  />
                                  {errorPvDe(item) && (
                                    <p className="text-[10px] font-medium text-red-500 mt-1">
                                      {errorPvDe(item)}
                                    </p>
                                  )}
                                </td>
                              ) : (
                                <td className="px-3 py-3 text-center text-xs text-muted-foreground">
                                  —
                                </td>
                              ))}

                            <td className="px-3 py-3 text-xs font-semibold whitespace-nowrap">
                              {fmtCOP(
                                calcularLineaIva({
                                  cantidad: item.cantidadRecibida,
                                  montoUnitario: item.costoUnitario,
                                  porcentajeIva: item.iva ?? 0,
                                  modoIva: item.modoIva ?? "incluido",
                                }).subtotalConIva
                              )}
                            </td>

                            <td className="px-3 py-3">
                              <button
                                onClick={() =>
                                  quitarItem(item.rowId, item.nombre)
                                }
                                title="Quitar de esta factura"
                                className={`${CLASE_BASE} ${CLASE_HOVER}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                          ))
                        )}
                      </tbody>

                      <tfoot className="bg-muted/50 border-t border-border">
                        <tr>
                          <td
                            colSpan={mostrarColPrecioVta ? 6 : 5}
                            className="px-3 py-2 text-xs font-bold text-muted-foreground text-right uppercase tracking-wider"
                          >
                            Total recibido
                          </td>
                          <td
                            colSpan={2}
                            className="px-3 py-2 text-sm font-bold text-foreground"
                          >
                            {fmtCOP(totalRec)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              {/* INSUMOS EXTRA */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">
                  Insumos adicionales recibidos
                </h3>

                {itemsExtra.length > 0 && (
                  <div className="border border-border rounded-xl overflow-hidden mb-3">
                    <div className="overflow-x-hidden">
                    <table className="table-fixed w-full text-sm">
                      <colgroup>
                        <col />
                        <col style={{ width: 58 }} />
                        <col style={{ width: 58 }} />
                        <col style={{ width: 76 }} />
                        <col style={{ width: 46 }} />
                        <col style={{ width: 76 }} />
                        <col style={{ width: 68 }} />
                      </colgroup>
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-1.5 py-2 text-left text-xs">
                            Nombre
                          </th>

                          <th className="px-1 py-2 text-right text-xs">
                            Cantidad
                          </th>

                          <th className="px-1 py-2 text-left text-xs">
                            Medida
                          </th>

                          <th className="px-1 py-2 text-right text-xs">
                            Monto unitario
                          </th>

                          <th className="px-1 py-2 text-right text-xs">
                            IVA
                          </th>

                          <th className="px-1 py-2 text-right text-xs">
                            Subtotal
                          </th>

                          <th className="px-1 py-2" />
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-border">
                        {itemsExtra.map((item) => {
                          const linea = calcularLineaIva({
                            cantidad: item.cantidadRecibida,
                            montoUnitario: item.costoUnitario,
                            porcentajeIva: item.iva ?? 0,
                            modoIva: item.modoIva ?? "incluido",
                          });
                          return (
                            <tr
                              key={item.rowId}
                              className={`hover:bg-muted/20 transition-colors ${
                                editExtraId === item.rowId ? "bg-primary/5" : ""
                              }`}
                            >
                              <td className="min-w-0 px-1.5 py-2 font-semibold">
                                <div className="truncate" title={item.nombre}>
                                  {item.nombre}
                                </div>
                                {/* P14: si la línea salió del catálogo de
                                    productos se deja ver su precio de venta
                                    al público (dato informativo; la factura
                                    calcula con el Monto unitario). */}
                                <div className="text-[11px] font-normal text-muted-foreground mt-0.5 break-words">
                                  {(item.tipoItem ?? "insumo") === "producto" && "Producto · "}
                                  {formatearModoIvaEnTabla(item.modoIva ?? "incluido", item.iva)}
                                  {(item.tipoItem ?? "insumo") === "producto" &&
                                    item.precioVenta != null && item.precioVenta > 0 && (
                                      <> · Venta: {fmtCOP(item.precioVenta)}</>
                                    )}
                                </div>
                              </td>

                              <td className="px-1 py-2 text-right">
                                {item.cantidadRecibida}
                                {esEmpaque(item.unidad) && (
                                  <div className="text-[11px] text-muted-foreground break-words">
                                    {etiquetaPresentacion(item.unidad, factorDeUnidadRecibida(item), unidadBaseDe(item))}
                                  </div>
                                )}
                              </td>
                              <td className="truncate px-1 py-2 text-xs text-muted-foreground" title={item.unidad}>
                                {!esEmpaque(item.unidad) && item.unidad}
                              </td>
                              <td className="px-1 py-2 text-right text-xs whitespace-nowrap">
                                {fmtCOP(item.costoUnitario)}
                              </td>
                              <td className="px-1 py-2 text-right text-xs">
                                <span className="inline-flex rounded-full bg-muted px-1.5 py-1 text-[10px] font-semibold whitespace-nowrap">
                                  {item.iva == null && (item.modoIva ?? "incluido") !== "exento"
                                    ? <span className="text-red-500">Ingresa el IVA.</span>
                                    : formatearChipIva(item.modoIva ?? "incluido", item.iva ?? 0)}
                                </span>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {fmtCOP(linea.montoIva)}
                                </p>
                              </td>
                              <td className="px-1 py-2 text-right text-xs font-semibold whitespace-nowrap">
                                {fmtCOP(linea.subtotalConIva)}
                              </td>
                              <td className="px-1 py-2 whitespace-nowrap">
                                <ActionIcons
                                  onEdit={() => startEditExtra(item)}
                                  editTitle="Editar insumo"
                                  onDelete={() => {
                                    if (editExtraId === item.rowId) limpiarFormularioExtra();
                                    setItemsExtra((prev) =>
                                      prev.filter((x) => x.rowId !== item.rowId)
                                    );
                                  }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}

                <CompactInsumoForm
                    containerRef={exRef}
                    titulo={`Agregar ${exTipo === "producto" ? "producto" : "insumo"} no solicitado`}
                    headerExtra={
                      <div className="flex items-center gap-2">
                        <label className="block text-[11px] font-semibold text-muted-foreground">
                          Tipo
                        </label>
                        <SegmentadoButtons
                          valor={exTipo}
                          onChange={(valor) => {
                            const nuevo = valor as "insumo" | "producto";
                            if (nuevo === exTipo) return;
                            setExTipo(nuevo);
                            limpiarFormularioExtra(nuevo, false);
                          }}
                          opciones={[
                            { valor: "insumo", etiqueta: "Insumo" },
                            { valor: "producto", etiqueta: "Producto" },
                          ]}
                        />
                      </div>
                    }
                    nombre={exNombre}
                    etiquetaNombre={exTipo === "producto" ? "Producto" : "Insumo"}
                    onNombreChange={(value) => {
                      setExNombre(value);
                      setExId("");
                      setExCategoriaInsumoId(undefined);
                      setExUnidadBase("");
                      setExModoIva("incluido");
                      if (exTipo === "producto") {
                        setExUnidad("");
                        setExEmpaque(undefined);
                      }
                      setExShowSug(true);
                    }}
                    onNombreFocus={() => setExShowSug(true)}
                    cantidad={exCant}
                    unidad={exUnidad}
                    onUnidadChange={setExUnidad}
                    unidadBase={exTipo === "insumo" ? exUnidadBase : undefined}
                    unidadBaseEditable={exTipo === "insumo" && !exUnidadBase}
                    insumoId={
                      exTipo === "insumo" && /^INS-\d+$/.test(exId) ? exId : undefined
                    }
                    factorPresentacionInicial={
                      itemsExtra.find((item) => item.rowId === editExtraId)?.factorPresentacion
                    }
                    presentacionInicial={
                      itemsExtra.find((item) => item.rowId === editExtraId)?.unidad
                    }
                    etiquetaUnidad="Presentación"
                    precio={exPrecio}
                    iva={exIva}
                    modoIva={exModoIva}
                    ivaAntesDeExento={exIvaAntesDeExento}
                    onModoIvaChange={setExModoIva}
                    mostrarPrecioVenta={exTipo === "producto"}
                    precioVenta={exPrecioVenta}
                    factorCostoUnidad={exTipo === "producto" ? exEmpaque ?? 1 : 1}
                    onAgregar={addExtra}
                    suggestions={exSugs as InsumoSuggestion[]}
                    showSuggestions={exShowSug}
                    onSelectSuggestion={(suggestion) => {
                      const ins = suggestion as SugEx;
                      setExNombre(ins.nombre);
                      setExId(ins.id);
                      const nuevoMatch = nuevosInsumosPendientes.find((n) => n.id === ins.id);
                      setExCategoriaInsumoId(
                        nuevoMatch ? Number(nuevoMatch.categoriaId) : undefined,
                      );
                      setExUnidad(
                        exTipo === "producto"
                          ? ins.unidadMedida
                          : UNIDADES.includes(ins.unidadMedida)
                            ? ins.unidadMedida
                            : UNIDADES[0],
                      );
                      setExUnidadBase(exTipo === "insumo" ? ins.unidadMedida : "");
                      setExModoIva("incluido");
                      setExEmpaque(
                        ins.unidadesPorEmpaque && ins.unidadesPorEmpaque > 1
                          ? ins.unidadesPorEmpaque
                          : undefined,
                      );
                      const hist = historialCompraDe(ins);
                      setExPrecio(
                        hist
                          ? hist.montoDigitado ?? hist.montoSinIva
                          : ins.costoUnitario,
                      );
                      setExIva(hist ? hist.iva : Number(ins.iva ?? 0));
                      setExIvaAntesDeExento(undefined);
                      setExPrecioVenta(Number(ins.precioVenta ?? 0));
                      setExShowSug(false);
                    }}
                    onCrearInsumo={() => {
                      setExShowSug(false);
                      setShowNuevoInsumo(true);
                    }}
                    onCrearProducto={() => {
                      setExShowSug(false);
                      setShowNuevoProducto(true);
                    }}
                    compacto
                    variante="compacta"
                    ocultarCrearInsumo={exTipo === "producto"}
                    ocultarCrearProducto={exTipo === "insumo"}
                    placeholder={
                      exTipo === "producto" ? "Buscar producto..." : "Buscar insumo..."
                    }
                    buttonLabel={editExtraId ? "Guardar cambios" : "Agregar"}
                    onCancelar={editExtraId ? () => limpiarFormularioExtra() : undefined}
                  />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onBack}
                  className="flex-1 py-3 border border-border rounded-xl text-sm font-semibold hover:bg-muted cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  onClick={guardarRecepcion}
                  // Punto 2: con un producto de precio de venta inválido no se
                  // puede guardar (el backstop en `guardarRecepcion` cubre la
                  // tecla Enter y cualquier otro camino).
                  disabled={lineasPvMala.length > 0 || !!lineaSinFactorPresentacion}
                  className={`flex-1 py-3 bg-primary text-white rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 ${
                    lineasPvMala.length > 0 || lineaSinFactorPresentacion
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-red-700 cursor-pointer"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Guardar
                </button>
              </div>

              <AnimatePresence>
                {showNuevoInsumo && (
                  <NuevoInsumoModal
                    nombreInicial={exNombre.trim()}
                    insumosExistentes={[...insumos, ...nuevosInsumosPendientes]}
                    persistirEnApi={false}
                    categoriasInsumo={categoriasInsumo}
                    onGuardar={(ins) => {
                      // Punto 2: se da de alta en el catálogo como tipo
                      // "Insumo" y queda seleccionado en el formulario.
                      // Regla 9: no se crea en POST /api/insumos; se envía en items_no_solicitados al guardar la recepción.
                      setNuevosInsumosPendientes((prev) => [
                        {
                          id: ins.id,
                          nombre: ins.nombre,
                          unidadMedida: ins.unidadMedida,
                          costoUnitario: ins.precioUnitario,
                          iva: ins.iva == null ? undefined : Number(ins.iva),
                          categoriaId: String(ins.categoriaId ?? ""),
                        },
                        ...prev.filter((x) => !mismoNombre(x.nombre, ins.nombre)),
                      ]);
                      setExId(ins.id);
                      setExCategoriaInsumoId(ins.categoriaId ? Number(ins.categoriaId) : undefined);
                      setExNombre(ins.nombre);
                      setExUnidad(
                        UNIDADES.includes(ins.unidadMedida)
                          ? ins.unidadMedida
                          : UNIDADES[0]
                      );
                      setExUnidadBase(ins.unidadMedida);
                      setExModoIva("incluido");
                      setExPrecio(ins.precioUnitario);
                      setExIva(ins.iva == null ? undefined : Number(ins.iva));
                      setShowNuevoInsumo(false);
                      toast.success(`Insumo "${ins.nombre}" creado`);
                    }}
                    onClose={() => setShowNuevoInsumo(false)}
                  />
                )}
              </AnimatePresence>

              {/* Bloque 2: Modal de nuevo producto ("+ Crear producto"). */}
              <AnimatePresence>
                {showNuevoProducto && (
                  <CrearProductoModal
                    nombreInicial={exNombre.trim()}
                    productos={productos ?? []}
                    categorias={categorias ?? []}
                    onGuardar={async (p) => {
                      const creado = await onCrearProducto?.(p);
                      if (!creado) throw new Error("No se pudo crear el producto en el servidor.");
                      // Queda seleccionado en la fila como si viniera del
                      // desplegable, para seguir con cantidad y precios.
                      setExNombre(creado.nombre);
                      setExId(creado.id);
                      setExUnidad(presentacionCompra(creado));
                      const factor = empaqueDe(creado);
                      setExEmpaque(factor > 1 ? factor : undefined);
                      // Sin historial de compra: monto e IVA en 0 — el usuario
                      // los captura con la factura.
                      setExPrecio(0);
                      setExIva(undefined);
                      setExModoIva("incluido");
                      setExUnidadBase("");
                      setExPrecioVenta(0);
                      setExShowSug(false);
                      setShowNuevoProducto(false);
                      toast.success(`Producto "${creado.nombre}" creado`);
                      return creado;
                    }}
                    onClose={() => setShowNuevoProducto(false)}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showGuardarConf && (
                  <ConfirmModal
                    title="¿Está seguro de los cambios?"
                    detail="Una vez guardado no se podrá modificar."
                    confirmLabel="Confirmar"
                    loading={guardando}
                    icon={
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                    }
                    onConfirm={() => void confirmarGuardar()}
                    onCancel={() => !guardando && setShowGuardarConf(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
      </div>
    </div>
  );
}
