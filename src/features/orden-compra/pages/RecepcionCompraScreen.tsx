import React, { useMemo, useRef, useState, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { ArrowLeft, Check, Plus, Search, Trash2, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { calcularLineaIva } from "@/features/compras/services/iva";
import {
  aplicarPreciosCompra,
  aplicarStockCompra,
  historialCompraDe,
  textoPreciosActualizado,
  textoStockActualizado,
  unidadesPorLinea,
  type SetCatalogo,
} from "@/features/compras/services/inventario";
import {
  contenidoDe,
  empaqueDe,
  nombreBuscable,
  presentacionCompra,
} from "@/shared/utils/presentacion";
import type { Insumo } from "@/features/insumos/pages/GestionInsumosScreen";
import type { Producto } from "@/features/productos/pages/GestionProductosScreen";
import { UnidadSelect } from "@/features/compras/components/UnidadSelect";
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

const UNIDADES = ["kg", "g", "lt", "ml", "und", "paq", "caja", "bolsa"];

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

  // Si todos los insumos ya están registrados, redirigir al listado
  useEffect(() => {
    const todosRegistrados = orden.items.every(item => registrados.has(item.idInsumo));
    if (todosRegistrados) {
      toast.info(`La OC ${orden.id} ya tiene todos sus insumos registrados`);
      onBack();
    }
  }, [orden.id, registrados, onBack]);

  // Solo se ofrecen los insumos que aún no se han facturado en esta OC.
  const [items, setItems] = useState<ItemRecibido[]>(() => {
    const previos = registradosEnOrden(gestiones, orden.id);

    return orden.items
      .filter((i) => !previos.has(i.idInsumo))
      .map((i) => {
        // Punto 2: si la bebida ya tiene precio de venta (en la línea de la
        // OC o en el catálogo) se precarga para poder editarlo a mano.
        const pvLinea = Number(i.precioVenta ?? 0);
        const pvCatalogo =
          (i.tipoItem ?? "insumo") === "producto"
            ? Number(
                productos?.find((p) => p.id === i.idInsumo)?.precioUnitario ?? 0
              )
            : 0;
        const precioVenta = pvLinea > 0 ? pvLinea : pvCatalogo;

        return {
          rowId: i.rowId,
          idInsumo: i.idInsumo,
          nombre: i.nombre,
          cantidadSolicitada: i.cantidad,
          cantidadRecibida: i.cantidad,
          unidad: i.unidad,
          precioReferencia: i.costoUnitario,
          costoUnitario: i.costoUnitario, precioUnitario: i.costoUnitario,
          // El IVA de la línea viene del catálogo/OC (0 % si no está definido).
          iva: Number(i.iva ?? 0),
          // P14: se conserva el catálogo (y el precio de venta si la línea lo
          // trae) para que la tabla de solicitados pueda mostrar "Producto".
          tipoItem: i.tipoItem,
          precioVenta: precioVenta > 0 ? precioVenta : undefined,
          // Ajuste de bebidas: la línea hereda el empaque de la OC (paca/
          // caja) para repartir el monto en sus unidades. Las líneas sin el
          // dato (unidad suelta, OCs viejas) se leen como 1.
          unidadesPorEmpaque: i.unidadesPorEmpaque,
        };
      });
  });

  const [itemsExtra, setItemsExtra] = useState<ItemRecibido[]>([]);

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

  // Esta pantalla SIEMPRE trabaja con precios SIN IVA:
  // - Monto unitario = base (sin IVA)
  // - Subtotal = Cantidad × Monto unitario
  // - IVA = Subtotal × IVA% / 100 (se SUMA aparte)
  // - Total pagado = Subtotal + IVA
  // Al guardar, la compra se registra como "precios sin IVA" (ivaIncluido: false).
  const ivaIncluido = false;
  const [showNuevoInsumo, setShowNuevoInsumo] = useState(false);

  const [exNombre, setExNombre] = useState("");
  const [exCant, setExCant] = useState(1);
  const [exUnidad, setExUnidad] = useState(UNIDADES[0]);
  // Ajuste de bebidas: unidades por paca/caja del producto no solicitado que
  // se está agregando (undefined = unidad suelta). El Monto unitario del
  // formulario es entonces por PRESENTACIÓN y el costo de referencia se
  // divide en estas unidades.
  const [exEmpaque, setExEmpaque] = useState<number | undefined>(undefined);
  const [exPrecio, setExPrecio] = useState(0);
  const [exIva, setExIva] = useState(0);
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

  // ������ Edición en línea de insumos adicionales ������������������������������������������������������������������������������������������������
  const [editExtraId, setEditExtraId] = useState<string | null>(null);
  const [editExtraDraft, setEditExtraDraft] = useState<{
    cantidad: number;
    unidad: string;
    costoUnitario: number;
    precioUnitario: number;
    iva: number;
  } | null>(null);

  const exRef = useRef<HTMLDivElement>(null);

  // Factura única: normalización y validación de duplicados
  const normalizarFactura = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");
  const facturaActualNormalizada = normalizarFactura(numeroFactura);
  const facturaDuplicada = gestiones.some(
    (g) =>
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

  const formValido =
    !errorNumeroFactura &&
    !errorFechaFactura &&
    !errorProveedor &&
    !errorItems &&
    !facturaDuplicada;
  const algunoTocado = tocado.numeroFactura || tocado.fechaFactura;
  const marcarTocado = (campo: "numeroFactura" | "fechaFactura") =>
    setTocado((t) => ({ ...t, [campo]: true }));

  /** Clase del input: resalta en rojo cuando el campo visible es inválido. */
  const campoCls = (error?: string) =>
    `${iCls} transition-colors ${error ? "border-red-400 focus:ring-red-300" : ""}`;

  /** Punto 3: esta recepción SIEMPRE se guarda como "precios sin IVA"
   *  (ver `ivaIncluido` arriba), así que el costo de referencia CON IVA de
   *  una línea = monto × (1 + iva%/100). Es contra ese costo (POR UNIDAD)
   *  que se valida el precio de venta de los productos. */
  const costoConIva = (monto: number, iva: number) =>
    monto * (1 + (iva || 0) / 100);

  /** Costo con IVA POR UNIDAD de una línea ya montada (solicitada o extra):
   *  con paca/caja el costoUnitario de la línea es por presentación, así que
   *  se divide en `unidadesPorLinea` (unidad suelta y líneas viejas ⇒ 1). */
  const costoConIvaDeLinea = (item: {
    costoUnitario: number;
    iva?: number;
    unidadesPorEmpaque?: number;
  }) =>
    costoConIva(item.costoUnitario, item.iva ?? 0) / unidadesPorLinea(item);

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

  /** Punto B6 + punto 3 + ajuste: precio de venta OBLIGATORIO en productos
   *  no solicitados, con las mismas reglas que la Nueva compra: > 0 y > al
   *  costo CON IVA POR UNIDAD (con paca/caja el monto del formulario es por
   *  presentación y se divide en el empaque). */
  const exFactor = unidadesPorLinea({ unidadesPorEmpaque: exEmpaque });
  const exCostoRef = costoConIva(exPrecio, exIva) / exFactor;
  const errorExPrecioVenta =
    exTipo === "producto" && exNombre.trim()
      ? exPrecioVenta <= 0
        ? "Ingresa el precio de venta del producto."
        : exPrecioVenta <= exCostoRef
          ? "El precio de venta debe ser mayor que el costo por unidad con IVA."
          : undefined
      : undefined;

  const onExMontoChange = (v: number) => setExPrecio(v);

  const onExIvaChange = (v: number) => setExIva(v);

  const onExPrecioVentaChange = (v: number) => setExPrecioVenta(v);

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
     *  siempre. */
    ultimoMontoSinIva?: number;
    ultimoIvaCompra?: number;
  };

  const exSugs = useMemo<SugEx[]>(() => {
    if (exNombre.trim().length < 1) return [];
    const q = exNombre.toLowerCase();

    // P14: el buscador mira un catálogo u otro según el tipo elegido.
    if (exTipo === "producto") {
      // Mismo criterio que la Nueva compra: sólo productos disponibles y
      // terminados (los "Producto insumo" se producen, no se compran). Punto
      // B6: además se excluyen los ids que ya están en la OC o en facturas
      // previas de la orden.
      return (productos ?? [])
        .filter(
          (p) =>
            p.estado === "Disponible" &&
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
            ultimoMontoSinIva: p.ultimoMontoSinIva,
            ultimoIvaCompra: p.ultimoIvaCompra,
          };
        });
    }

    return insumos
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
                Math.min(value, item.cantidadSolicitada)
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

  const addExtra = () => {
    if (!exNombre.trim()) {
      toast.error(
        exTipo === "producto"
          ? "Ingresa el nombre del producto."
          : "Ingresa el nombre del insumo."
      );
      return;
    }

    if (exCant <= 0) {
      toast.error("La cantidad debe ser mayor que 0.");
      return;
    }

    if (exPrecio < 0) {
      toast.error("El precio unitario no puede ser negativo.");
      return;
    }

    // Punto B6 + punto 3 + ajuste: mismo bloqueo que en la Nueva compra — un
    // producto no solicitado se agrega únicamente con precio de venta > 0 y >
    // al costo CON IVA POR UNIDAD.
    if (exTipo === "producto") {
      if (exPrecioVenta <= 0) {
        toast.error("El precio de venta del producto debe ser mayor que cero.");
        return;
      }
      if (exPrecioVenta <= exCostoRef) {
        toast.error("El precio de venta debe ser mayor que el costo por unidad con IVA.");
        return;
      }
    }

    setItemsExtra((prev) => [
      ...prev,
      {
        rowId: `ex-${Date.now()}`,
        // Punto B6: con id elegido del catálogo la línea se asimila a ese
        // ítem (y el stock se aplica sobre él); sin selección se guarda con
        // id sintético para no fusionar líneas distintas.
        idInsumo: exId || `INS-EX-${Date.now()}`,
        nombre: exNombre.trim(),
        cantidadSolicitada: 0,
        cantidadRecibida: exCant,
        // Medida de la fila: la presentación de compra del producto o la
        // unidad elegida; vacía ⇒ "und" para no dejar la fila en blanco.
        unidad: exUnidad.trim() || "und",
        precioReferencia: exPrecio,
        costoUnitario: exPrecio, precioUnitario: exPrecio, iva: exIva,
        // P14: de qué catálogo salió la línea y, si es producto, su precio
        // de venta al público (ya validado arriba: siempre > 0 y > costo).
        tipoItem: exTipo,
        ...(exTipo === "producto"
          ? {
              precioVenta: exPrecioVenta,
              // Ajuste de bebidas: sólo producto en paca/caja guarda el
              // empaque (unidad suelta ⇒ sin el dato, se lee como 1).
              ...(exEmpaque && exEmpaque > 1
                ? { unidadesPorEmpaque: exEmpaque }
                : {}),
            }
          : {}),
      },
    ]);

    setExNombre("");
    setExId("");
    setExCant(1);
    setExPrecio(0);
    setExIva(0);
    setExPrecioVenta(0);
    setExEmpaque(undefined);
    setExShowSug(false);

    toast.success(
      exTipo === "producto" ? "Producto adicional agregado." : "Insumo adicional agregado."
    );
  };

  const startEditExtra = (item: ItemRecibido) => {
    setEditExtraId(item.rowId);
    setEditExtraDraft({
      cantidad: item.cantidadRecibida,
      unidad: item.unidad,
      costoUnitario: item.costoUnitario, precioUnitario: item.costoUnitario,
      iva: item.iva ?? 0
    });
  };

  const cancelEditExtra = () => {
    setEditExtraId(null);
    setEditExtraDraft(null);
  };

  const commitEditExtra = () => {
    if (editExtraId && editExtraDraft) {
      setItemsExtra((prev) =>
        prev.map((item) =>
          item.rowId === editExtraId
            ? {
                ...item,
                cantidadRecibida: Math.max(0, editExtraDraft.cantidad),
                unidad: editExtraDraft.unidad,
                costoUnitario: Math.max(0, editExtraDraft.costoUnitario),
                precioUnitario: Math.max(0, editExtraDraft.costoUnitario),
                iva: Math.min(100, Math.max(0, editExtraDraft.iva)),
              }
            : item
        )
      );
    }
    cancelEditExtra();
  };

  const totalPedido = orden.items.reduce(
    (total, item) => total + item.cantidad * item.costoUnitario,
    0
  );

  // Punto 1: los totales de esta factura salen de la fórmula única
  // `calcularLineaIva` (Subtotal sin IVA → IVA → Total pagado).
  // Como ivaIncluido = false: Monto unitario = base, IVA se suma aparte.
  const totalRec = [...items, ...itemsExtra].reduce(
    (total, item) =>
      total +
      calcularLineaIva({
        cantidad: item.cantidadRecibida,
        montoUnitario: item.costoUnitario,
        porcentajeIva: item.iva ?? 0,
        ivaIncluido: false,
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
    const facturaDuplicada = gestiones.some(
      (g) =>
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

  const confirmarGuardar = () => {
    setShowGuardarConf(false);

    // Guardar NUNCA puede fallar en silencio: cualquier excepción (props mal
    // pasadas, error del backend al persistir, etc.) se informa en pantalla y
    // la recepción queda como estaba para poder reintentar.
    try {
      guardarConfirmado();
    } catch (e) {
      console.error("No se pudo guardar la recepción:", e);
      toast.error(
        `No se pudo guardar la recepción: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  };

  const guardarConfirmado = () => {
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
          ivaIncluido: false,
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
        };
      }
    );

    // Subtotal sin IVA → IVA → Total pagado (idéntico a `totalRec`).
    const subtotalSinIvaFactura = itemsFactura.reduce(
      (s, item) => s + (item.baseSinIva ?? 0),
      0
    );
    const totalIvaGuardado = itemsFactura.reduce(
      (s, item) => s + (item.montoIva ?? 0),
      0
    );
    const valorTotal = subtotalSinIvaFactura + totalIvaGuardado;

    // 1) Una compra nueva por factura: las facturas anteriores no se tocan.
    const nuevoId = String(
      Math.max(0, ...gestiones.map((g) => Number(g.id) || 0)) + 1
    ).padStart(3, "0");

    // Buscar proveedorId por nombre del proveedor de la orden
    const prov = proveedores.find(p => p.nombre === orden.proveedor);
    const proveedorId = prov?.id;

    const nuevaCompra: GestionCompra = {
      id: nuevoId,
      ordenId: orden.id,
      proveedor: orden.proveedor,
      proveedorId,
      numeroFactura: numeroFactura.trim(),
      fechaFactura,
      valorTotal,
      estado: "Recibido",
      items: itemsFactura,
      // Punto 1: la recepción SIEMPRE guarda como "precios sin IVA".
      // El Monto unitario es base, el IVA se calcula y suma aparte.
      ivaIncluido: false,
      subtotalSinIva: subtotalSinIvaFactura,
      totalIva: totalIvaGuardado,
      totalPagado: valorTotal,
    };

    // Factura guardada en "Recibido" ⇒ suma el stock de lo recibido. Mismo
    // camino que la Nueva compra, para que las dos formas de facturar entren
    // igual al inventario (punto B5: también el catálogo de productos).
    const resumen = aplicarStockCompra(itemsFactura, 1, {
      insumos,
      setInsumos,
      productos,
      setProductos,
    });
    if (resumen && resumen.nombres.length > 0) {
      nuevaCompra.stockAplicado = true;
    }

    // Punto B5 + puntos 1/3: la recepción también define el precio de venta y
    // el costo con IVA de las líneas de producto (mismas reglas que la Nueva
    // compra: precio > 0 y > costo con IVA). La recepción se guarda SIEMPRE
    // como "precios sin IVA", así que el costo con IVA = monto × (1 + iva/100).
    const resumenPrecios = aplicarPreciosCompra(itemsFactura, {
      productos,
      setProductos,
    }, ivaIncluido);

    setGestiones((prev) => [nuevaCompra, ...prev]);

    // 2) Acumulado de la OC: facturas anteriores + esta.
    const acum = new Map<
      string,
      { nombre: string; unidad: string; cantidad: number; costoUnitario: number; precioUnitario: number; iva: number }
    >();

    for (const g of gestiones) {
      if (g.ordenId !== orden.id) continue;

      for (const it of g.items ?? []) acumular(acum, it);
    }

    itemsFactura.forEach((it) => acumular(acum, it));

    // Un insumo queda cubierto en cuanto se registra en alguna factura: la orden
    // se completa cuando ninguna factura deja insumos sin registrar.
    const registradosAhora = new Set(registrados);

    itemsFactura.forEach((it) => registradosAhora.add(it.idInsumo));

    const pendientes = orden.items.filter(
      (item) => !registradosAhora.has(item.idInsumo)
    );

    const idsOrden = new Set(orden.items.map((item) => item.idInsumo));

    const recepcion: Recepcion = {
      items: orden.items
        .map((pedido) => {
          const a = acum.get(pedido.idInsumo);
          if (!a) return null;

          return {
            rowId: pedido.rowId,
            idInsumo: pedido.idInsumo,
            nombre: pedido.nombre,
            cantidadSolicitada: pedido.cantidad,
            cantidadRecibida: a.cantidad,
            unidad: pedido.unidad,
            precioReferencia: pedido.costoUnitario,
            costoUnitario: a.costoUnitario, precioUnitario: a.costoUnitario, iva: a.iva ?? 0
          } as ItemRecibido;
        })
        .filter((x): x is ItemRecibido => x !== null),
      itemsExtra: [...acum.entries()]
        .filter(([idInsumo]) => !idsOrden.has(idInsumo))
        .map(([idInsumo, a]) => ({
          rowId: `ex-${idInsumo}`,
          idInsumo,
          nombre: a.nombre,
          cantidadSolicitada: 0,
          cantidadRecibida: a.cantidad,
          unidad: a.unidad,
          precioReferencia: a.costoUnitario,
          costoUnitario: a.costoUnitario, precioUnitario: a.costoUnitario, iva: a.iva ?? 0
        })),
      usarLotes: false,
      fechaRecepcion: today,
    };

    // La orden solo se completa cuando ninguna factura deja insumos pendientes.
    onGuardar(recepcion, pendientes.length === 0 ? "Completado" : "Enviado");

    toast.success(
      pendientes.length === 0
        ? `Factura ${numeroFactura.trim()} guardada · OC ${orden.id} completada`
        : `Factura ${numeroFactura.trim()} guardada · ${pendientes.length} insumo(s) pendiente(s) en la OC ${orden.id}`
    );
    if (resumen && resumen.nombres.length > 0) {
      toast.info(textoStockActualizado(resumen));
    }
    if (resumenPrecios && resumenPrecios.nombres.length > 0) {
      toast.info(textoPreciosActualizado(resumenPrecios));
    }

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
                              {registrados.has(item.idInsumo) && (
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
                    max={today}
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
                    <table className="w-full text-sm min-w-[620px]">
                      <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
                        <tr>
                          <th className="px-3 py-3 text-left font-semibold">
                            Insumo
                          </th>

                          <th className="px-3 py-3 text-left font-semibold">
                            Cant. recibida
                          </th>

                          <th className="px-3 py-3 text-left font-semibold">
                            Monto unitario
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
                              colSpan={mostrarColPrecioVta ? 6 : 5}
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

                              <p className="text-[11px] text-muted-foreground">
                                Pedido: {item.cantidadSolicitada}{" "}
                                {item.unidad}
                              </p>
                            </td>

                            <td className="px-3 py-3">
                              {/* 0 = vacío (punto B1): al borrar no reaparece el 0. */}
                              <input
                                type="number"
                                min={0}
                                max={item.cantidadSolicitada}
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
                                        ),
                                      )}
                                    </p>
                                  )}
                                </>
                              )}
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
                                  ivaIncluido: false,
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
                            colSpan={mostrarColPrecioVta ? 4 : 3}
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
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[560px]">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs">
                            Nombre
                          </th>

                          <th className="px-3 py-2 text-left text-xs">
                            Cantidad
                          </th>

                          <th className="px-3 py-2 text-left text-xs">
                            Unidad
                          </th>

                          <th className="px-3 py-2 text-left text-xs">
                            Monto unitario
                          </th>

                          <th className="px-3 py-2 text-left text-xs">
                            Subtotal
                          </th>

                          <th />
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-border">
                        {itemsExtra.map((item) => {
                          const isEditing = editExtraId === item.rowId;
                          const draft = isEditing ? editExtraDraft : null;

                          return (
                            <tr key={item.rowId}>
                              {/* Nombre */}
                              <td className="px-3 py-2 font-semibold">
                                {item.nombre}
                                {/* P14: si la línea salió del catálogo de
                                    productos se deja ver su precio de venta
                                    al público (dato informativo; la factura
                                    calcula con el Monto unitario). */}
                                {(item.tipoItem ?? "insumo") === "producto" && (
                                  <div className="text-[11px] font-normal text-muted-foreground mt-0.5">
                                    Producto
                                    {item.precioVenta != null && item.precioVenta > 0 && (
                                      <> · Venta: {fmtCOP(item.precioVenta)}</>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Cantidad */}
                              <td className="px-3 py-2">
                                {draft ? (
                                  <input
                                    type="number"
                                    min={0}
                                    value={draft.cantidad === 0 ? "" : draft.cantidad}
                                    placeholder="0"
                                    onChange={(e) =>
                                      setEditExtraDraft({
                                        ...draft,
                                        cantidad: numeroDeInput(limpiarNumeroInput(e.target.value)),
                                      })
                                    }
                                    className="w-14 px-1.5 py-1 bg-background border border-border rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary/30"
                                  />
                                ) : (
                                  item.cantidadRecibida
                                )}
                              </td>

                              {/* Unidad — en productos la presentación de
                                  compra ("Paca x12") es sólo lectura: no
                                  está en la lista de unidades y cambiarla
                                  rompería el empaque de la línea. */}
                              <td className="px-3 py-2">
                                {draft && (item.tipoItem ?? "insumo") !== "producto" ? (
                                  <UnidadSelect
                                    value={draft.unidad}
                                    onChange={(unidad) =>
                                      setEditExtraDraft({
                                        ...draft,
                                        unidad,
                                      })
                                    }
                                    ariaLabel="Unidad"
                                    fieldClassName="bg-background border border-border text-foreground h-8 rounded-lg text-xs"
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    {draft ? draft.unidad : item.unidad}
                                  </span>
                                )}
                              </td>

                              {/* P. Unitario */}
                              <td className="px-3 py-2">
                                {draft ? (
                                  <input
                                    type="number"
                                    min={0}
                                    value={draft.costoUnitario === 0 ? "" : draft.costoUnitario}
                                    placeholder="0"
                                    onChange={(e) =>
                                      setEditExtraDraft({
                                        ...draft,
                                        costoUnitario: numeroDeInput(limpiarNumeroInput(e.target.value)),
                                        precioUnitario: numeroDeInput(limpiarNumeroInput(e.target.value)),
                                        iva: 0,
                                      })
                                    }
                                    className="w-20 px-1.5 py-1 bg-background border border-border rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary/30"
                                  />
                                ) : (
                                  fmtCOP(item.costoUnitario)
                                )}
                              </td>

                              {/* Subtotal */}
                              <td className="px-3 py-2 font-semibold">
                                {fmtCOP(
                                  (draft ? draft.cantidad : item.cantidadRecibida) *
                                    (draft ? draft.costoUnitario : item.costoUnitario)
                                )}
                              </td>

                              {/* Acciones */}
                              <td className="px-3 py-2">
                                {draft ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={commitEditExtra}
                                      title="Guardar cambios"
                                      className="p-1 rounded text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={cancelEditExtra}
                                      title="Cancelar"
                                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <ActionIcons
                                    onEdit={() => startEditExtra(item)}
                                    editTitle="Editar insumo"
                                    onDelete={() =>
                                      setItemsExtra((prev) =>
                                        prev.filter(
                                          (x) => x.rowId !== item.rowId
                                        )
                                      )
                                    }
                                  />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}

                <div
                  ref={exRef}
                  className="border border-dashed border-border rounded-xl p-3 bg-muted/30"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p className="text-xs font-bold text-muted-foreground">
                      Agregar {exTipo === "producto" ? "producto" : "insumo"} no solicitado
                    </p>
                    {/* P14: un "no solicitado" puede venir del catálogo de
                        insumos o del de productos (reventa). */}
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
                          // Al cambiar de catálogo lo cargado ya no sirve:
                          // se limpia la fila para buscar en la otra lista
                          // (la Medida queda vacía en producto y el empaque
                          // de paca/caja se borra).
                          setExNombre("");
                          setExId("");
                          setExUnidad(nuevo === "producto" ? "" : UNIDADES[0]);
                          setExEmpaque(undefined);
                          setExPrecio(0);
                          setExIva(0);
                          setExPrecioVenta(0);
                          setExShowSug(false);
                        }}
                        opciones={[
                          { valor: "insumo", etiqueta: "Insumo" },
                          { valor: "producto", etiqueta: "Producto" },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    {/* Nombre */}
                    <div className="relative w-[160px] flex-none">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Nombre
                      </label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        <input
                          value={exNombre}
                          onChange={(e) => {
                            setExNombre(e.target.value);
                            // Punto B6: al editar el texto a mano el id de la
                            // sugerencia elegida ya no corresponde.
                            setExId("");
                            // Ajuste: en producto la presentación elegida ya
                            // no aplica: la Medida queda vacía y el empaque
                            // se limpia.
                            if (exTipo === "producto") {
                              setExUnidad("");
                              setExEmpaque(undefined);
                            }
                            setExShowSug(true);
                          }}
                          onFocus={() => setExShowSug(true)}
                          placeholder={
                            exTipo === "producto" ? "Buscar producto..." : "Buscar insumo..."
                          }
                          className={`${compactInputCls} pl-8`}
                        />
                      </div>
                      {/* Punto 5: "+ Crear insumo" es SIEMPRE la primera
                          opción (aunque el campo esté vacío o sin resultados)
                          y va separado del resto de la lista. P14: no aplica
                          cuando se agregan PRODUCTOS (no se da de alta ninguno
                          desde aquí). */}
                      {exShowSug && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-30 overflow-hidden">
                          {exTipo === "insumo" && (
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setExShowSug(false);
                                setShowNuevoInsumo(true);
                              }}
                              className="w-full text-left px-3 py-2.5 text-xs font-semibold text-primary hover:bg-primary/10 cursor-pointer inline-flex items-center gap-2 border-b border-border"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Crear insumo {exNombre.trim() && `“${exNombre.trim()}”`}
                            </button>
                          )}
                          {exSugs.map((ins) => (
                            <button
                              key={ins.id}
                              type="button"
                              onMouseDown={() => {
                                setExNombre(ins.nombre);
                                // Punto B6: se recuerda el id real elegido
                                // para guardarlo en la línea.
                                setExId(ins.id);
                                // Ajuste: en PRODUCTO la Medida es solo
                                // lectura con la presentación de compra
                                // ("Paca x12"), que no está en la lista de
                                // unidades; en insumo sigue la regla de
                                // pertenencia a UNIDADES.
                                setExUnidad(
                                  exTipo === "producto"
                                    ? ins.unidadMedida
                                    : UNIDADES.includes(ins.unidadMedida)
                                      ? ins.unidadMedida
                                      : UNIDADES[0]
                                );
                                // Empaque de la presentación elegida.
                                setExEmpaque(
                                  ins.unidadesPorEmpaque &&
                                    ins.unidadesPorEmpaque > 1
                                    ? ins.unidadesPorEmpaque
                                    : undefined
                                );
                                // Ajuste: con historial de compra se precarga
                                // el último monto SIN IVA y su % (la
                                // Recepción guarda montos sin IVA); sin
                                // historial manda el costo del catálogo por
                                // presentación, como siempre.
                                const hist = historialCompraDe(ins);
                                const montoSel = hist
                                  ? hist.montoSinIva
                                  : ins.costoUnitario;
                                const ivaSel = hist
                                  ? hist.iva
                                  : Number(ins.iva ?? 0);
                                setExPrecio(montoSel);
                                // Punto 2: al elegir del catálogo se completan
                                // Medida, Monto unitario e IVA.
                                setExIva(ivaSel);
                                // P14: si es producto se copia también su
                                // precio de venta al público (se escribe a
                                // mano: el % de ganancia ya no existe).
                                const pvSug = Number(ins.precioVenta ?? 0);
                                setExPrecioVenta(pvSug);
                                setExShowSug(false);
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-muted cursor-pointer border-b border-border last:border-0"
                            >
                              <p className="text-sm font-semibold">{ins.nombre}</p>
                              {/* Contenido ("1.5 L") + medida de compra +
                                  monto de la presentación. */}
                              <p className="text-xs text-muted-foreground">
                                {[ins.contenido, ins.unidadMedida, fmtCOP(ins.costoUnitario)]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </button>
                          ))}
                          {exSugs.length === 0 && (
                            <div className="px-3 py-2.5 text-xs text-muted-foreground text-center">
                              Sin resultados
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Cantidad */}
                    <div className="w-16 flex-none">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Cantidad
                      </label>
                      {/* Nace en 1 (regla del alta) y borra a vacío (punto B1). */}
                      <input
                        type="number"
                        min={1}
                        value={exCant === 0 ? "" : exCant}
                        onChange={(e) => setExCant(numeroDeInput(limpiarNumeroInput(e.target.value)))}
                        placeholder="0"
                        className={compactInputCls}
                      />
                    </div>

                    {/* Medida — select personalizado (mismo componente que Nueva
                        Compra). Punto 2.7: a la misma altura que los inputs
                        vecinos (`compactInputCls` = py-2 ≈ 38 px) y con el mismo
                        padding/redondeo; antes era h-11 (44 px) y desentonaba.
                        Ajuste: con PRODUCTO es texto de solo lectura con la
                        presentación de compra ("Paca x12"), que no pertenece a
                        la lista de unidades. */}
                    <div className={exTipo === "producto" ? "w-[92px] flex-none" : "w-16 flex-none"}>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Medida
                      </label>
                      {exTipo === "producto" ? (
                        <div
                          title="La medida la define el ítem del catálogo"
                          className="w-full h-9 px-2.5 rounded-lg text-sm bg-muted/40 border border-border text-muted-foreground flex items-center cursor-default select-none truncate"
                        >
                          {exUnidad}
                        </div>
                      ) : (
                        <UnidadSelect
                          value={exUnidad}
                          onChange={setExUnidad}
                          ariaLabel="Medida"
                          fieldClassName="bg-muted border border-border text-foreground h-9 rounded-lg text-sm"
                        />
                      )}
                    </div>

                    {/* Precio — la factura SIEMPRE se trabaja SIN IVA */}
                    <div className="w-32 flex-none">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Monto unitario
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={exPrecio || ""}
                        onChange={(e) => onExMontoChange(Number(e.target.value))}
                        className={compactInputCls}
                      />
                    </div>

                    {/* IVA (%) — 0 a 100 */}
                    <div className="w-[76px] flex-none">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        IVA (%)
                      </label>
                      {/* Vacío = 0 % (punto B1); ya traía placeholder "0". */}
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={exIva === 0 ? "" : exIva}
                        onChange={(e) =>
                          onExIvaChange(
                            Math.min(100, Math.max(0, numeroDeInput(limpiarNumeroInput(e.target.value))))
                          )
                        }
                        placeholder="0"
                        className={compactInputCls}
                      />
                    </div>

                    {/* Precio de venta al público del producto: sólo se pinta
                        al agregar PRODUCTOS. Es OBLIGATORIO (punto B6 + 3): el
                        campo queda en rojo y el Agregar se deshabilita si el
                        precio está vacío, en 0 o ≤ al costo con IVA. */}
                    {exTipo === "producto" && (
                      <div className="w-32 flex-none">
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                          Precio de venta
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={exPrecioVenta || ""}
                          onChange={(e) =>
                            onExPrecioVentaChange(Math.max(0, Number(e.target.value)))
                          }
                          placeholder="0"
                          className={`${compactInputCls} ${
                            errorExPrecioVenta ? "border-red-400 focus:ring-red-300" : ""
                          }`}
                        />
                      </div>
                    )}

                    <button
                      onClick={addExtra}
                      disabled={!!errorExPrecioVenta}
                      className={`flex-none inline-flex h-11 items-center justify-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-semibold rounded-lg transition-colors ${
                        errorExPrecioVenta
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-red-700 cursor-pointer"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar
                    </button>
                  </div>

                  {/* Punto 3 + ajuste: el costo de referencia CON IVA POR
                      UNIDAD con el que se valida el precio de venta (con
                      paca/caja el Monto unitario es por presentación y ya
                      viene dividido). */}
                  {exTipo === "producto" && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Costo por unidad: {fmtCOP(exCostoRef)}
                    </p>
                  )}

                  {/* Punto B6: el precio de venta inválido se avisa en tiempo
                      real, debajo de la fila completa. */}
                  {errorExPrecioVenta && (
                    <p className="text-xs font-medium text-red-500 mt-1.5">
                      {errorExPrecioVenta}
                    </p>
                  )}
                </div>
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
                  disabled={lineasPvMala.length > 0}
                  className={`flex-1 py-3 bg-primary text-white rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 ${
                    lineasPvMala.length > 0
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
                    insumosExistentes={insumos}
                    onGuardar={(ins) => {
                      // Punto 2: se da de alta en el catálogo como tipo
                      // "Insumo" y queda seleccionado en el formulario.
                      setInsumos((prev) => [insumoDeAlta(ins), ...prev]);
                      setExNombre(ins.nombre);
                      setExUnidad(
                        UNIDADES.includes(ins.unidadMedida)
                          ? ins.unidadMedida
                          : UNIDADES[0]
                      );
                      setExPrecio(ins.precioUnitario);
                      setExIva(Number(ins.iva ?? 0));
                      setShowNuevoInsumo(false);
                      toast.success(`Insumo "${ins.nombre}" creado`);
                    }}
                    onClose={() => setShowNuevoInsumo(false)}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showGuardarConf && (
                  <ConfirmModal
                    title="¿Está seguro de los cambios?"
                    detail="Una vez guardado no se podrá modificar."
                    confirmLabel="Confirmar"
                    icon={
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                    }
                    onConfirm={confirmarGuardar}
                    onCancel={() => setShowGuardarConf(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
      </div>
    </div>
  );
}
