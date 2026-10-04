import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Eye, X, ArrowLeft, ChevronLeft, ChevronRight,
  Plus, Check, Ban, CheckCircle2, HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { exportarMultiExcelEstilizado, exportarGestionComprasConInsumosExcel, type GestionCompraConInsumos } from "../utils/exportExcelEstilizado";
import { calcularLineaIva } from "../utils/iva";
import type { Insumo } from "./GestionInsumosScreen";
import { CompactInsumoForm, UNIDADES } from "../components/CompactInsumoForm";
import { InsumosSolicitadosTable, type InsumoSolicitadoRow } from "../components/InsumosSolicitadosTable";
import { EstadoSelect } from "../components/EstadoSelect";
import { SearchInput } from "../components/SearchInput";
import { ActionIcons } from "../components/ActionIcons";
import { BotonDescargarExcel } from "../components/BotonDescargarExcel";
import {
  NuevoProveedorModal,
  NuevoInsumoModal,
  ConfirmModal,
  FORM_MAXW,
  type GestionCompra,
  type OrdenCompra,
  type EstadoGestion,
  type EstadoOrden,
  type ProveedorRef,
} from "./OrdenCompraScreen";

const SERIF = "var(--font-titulo)";
const PER_PAGE = 5;

const ESTADO_CONFIG: Record<EstadoGestion, string> = {
  "Recibido":   "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  "Anulado":    "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
};

/** Badge de estado, con el mismo estilo que el detalle de Orden de Compra. */
function EstadoBadge({ e }: { e: EstadoGestion }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ESTADO_CONFIG[e]}`}>
      {e}
    </span>
  );
}

function fmtCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
}

// ─── NUEVA COMPRA ─────────────────────────────────────────────────────────────

const iCls =
  "w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

// Anchos compactos de los campos superiores, en línea con el detalle de Orden de Compra
const campoCortoCls = "max-w-[180px]"; // Fecha de factura · Estado
const campoMedioCls = "max-w-[240px]"; // Número de factura
const campoLargoCls = "max-w-xs"; // Proveedor (búsqueda)

/** Sección con título pequeño en mayúsculas y línea divisoria: mismo estilo
 *  que el formulario Nuevo Proveedor. */
const seccionCls =
  "text-[11px] leading-none font-bold uppercase tracking-widest text-muted-foreground pb-1.5 border-b border-border";

/** Labels de las guías: 13px en gris oscuro (pantalla completa). */
const labelPaginaCls = "block text-[13px] leading-tight font-medium text-foreground/70 mb-1";
const labelModalCls = "block text-xs font-semibold text-muted-foreground mb-1.5";

/** Inputs en pantalla completa: mismo estilo que `iCls` pero con 40px EXACTOS
 *  (py-2.5 + border da 42px, y la fila de insumos y el selector de IVA van a
 *  40px, así todos los controles del formulario miden lo mismo). */
const iPaginaCls =
  "w-full h-10 px-3 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

/** Tooltip de la opción de IVA no elegida, bloqueada con insumos en la tabla. */
const MSJ_IVA_BLOQUEADO = "Elimina los insumos agregados para cambiar esta opción";

/** Ayuda del ícono (?) junto a la pregunta del selector de precios. */
const MSJ_IVA_AYUDA =
  "Mira la parte de abajo de la factura. Si aparece una línea de IVA que se SUMA al subtotal, elige “Precios sin IVA”. Si no aparece esa línea o dice “IVA incluido”, elige “Precios con IVA incluido”.";

/** Error rojo bajo las tarjetas al intentar agregar o guardar sin elegir. */
const MSJ_IVA_FALTA = "Elige cómo vienen los precios en la factura";

/** Aviso de la sección "Agregar insumo" mientras no se ha elegido nada. */
const MSJ_SIN_PRECIOS = "Primero elige cómo vienen los precios en la factura";

/** Las dos tarjetas del selector (solo pantalla completa). */
const OPCIONES_IVA = [
  {
    valor: true,
    titulo: "Con IVA incluido",
    tag: "Más común",
    desc: "El IVA ya está en el precio",
  },
  {
    valor: false,
    titulo: "Sin IVA",
    tag: "",
    desc: "El IVA se suma al final",
  },
] as const;

type ItemFactura = {
  rowId: string;
  idInsumo: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  costoUnitario: number;
  precioUnitario: number;
  /** Porcentaje de IVA de la línea (0–100). */
  iva: number;
  /** Valores guardados de la línea (se recalculan en el backend). */
  baseSinIva?: number;
  montoIva?: number;
};

export interface NuevaCompraData {
  proveedor: string;
  proveedorId?: string;
  numeroFactura: string;
  fechaFactura: string;
  valorTotal: number;
  estado: EstadoGestion;
  items: ItemFactura[];
  /** true = los montos de la factura ya incluyen el IVA. */
  ivaIncluido: boolean;
  /** Suma de las bases (sin IVA) de las líneas. */
  subtotalSinIva: number;
  /** Suma del IVA de las líneas. */
  totalIva: number;
  /** Total pagado = subtotalSinIva + totalIva (= valorTotal). */
  totalPagado: number;
}

function CompraForm({
  proveedores,
  setProveedores,
  insumos,
  gestiones,
  mode = "create",
  compra,
  fullPage = false,
  ordenes,
  onClose,
  onGuardar,
}: {
  proveedores: ProveedorRef[];
  setProveedores: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
  insumos: Insumo[];
  /** Gestiones de compra existentes para validar factura única. */
  gestiones: GestionCompra[];
  mode?: "create" | "view";
  compra?: GestionCompra;
  fullPage?: boolean;
  /** Órdenes de compra: necesarias para separar solicitados / no solicitados. */
  ordenes?: OrdenCompra[];
  onClose: () => void;
  onGuardar: (data: NuevaCompraData) => void;
}) {
  const isView = mode === "view";
  const isPage = fullPage;
  // `toISOString()` devuelve la fecha en UTC: en Colombia (UTC-5) después de las
  // 19:00 devolvía el día siguiente, así que las facturas de hoy quedaban
  // bloqueadas por el `max` del date-picker. Se usa la fecha local, que es la
  // convención del proyecto (App.tsx, ProductosPerecederosScreen).
  const today = new Date().toLocaleDateString("en-CA");

  const [numeroFactura, setNumeroFactura] = useState(compra?.numeroFactura ?? "");
  const [fechaFactura, setFechaFactura] = useState(compra?.fechaFactura || today);
  const [items, setItems] = useState<ItemFactura[]>((compra?.items ?? []).map(item => ({
    rowId: item.rowId,
    idInsumo: item.idInsumo,
    nombre: item.nombre,
    unidad: item.unidad,
    cantidad: item.cantidad,
    costoUnitario: item.costoUnitario,
    precioUnitario: item.precioUnitario,
    iva: item.iva,
    baseSinIva: item.baseSinIva,
    montoIva: item.montoIva,
  })));

  // "¿Los montos de la factura incluyen IVA?".
  // Al CREAR ninguna opción viene seleccionada: hay que elegir una antes de
  // poder agregar insumos o guardar. En DETALLE se lee el valor guardado y las
  // compras antiguas, sin el campo, se leen como "Sí, IVA incluido"
  // (con IVA 0 % se ven exactamente igual que antes).
  const [ivaIncluido, setIvaIncluido] = useState<boolean | null>(
    compra ? compra.ivaIncluido ?? true : null
  );

  /**
   * Con al menos un insumo en la tabla, la opción de IVA NO elegida queda
   * bloqueada (deshabilitada y en gris). Si se borran todos los insumos, la
   * otra opción vuelve a desbloquearse.
   */
  const ivaBloqueada = (opcion: boolean) =>
    items.length > 0 && ivaIncluido !== null && ivaIncluido !== opcion;

  const [itemNombre, setItemNombre] = useState("");
  const [itemCantidad, setItemCantidad] = useState(1);
  const [itemUnidad, setItemUnidad] = useState(UNIDADES[0]);
  const [itemPrecio, setItemPrecio] = useState(0);
  const [itemIva, setItemIva] = useState(0);
  const [itemId, setItemId] = useState("");
  const [itemSugAbierto, setItemSugAbierto] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  /** Input de Nombre: recupera el foco tras agregar o actualizar una fila. */
  const nombreRef = useRef<HTMLInputElement>(null);
  /** Fila en edición: el lápiz de la tabla carga sus datos en este formulario
   *  y el botón pasa a "Actualizar" (pantalla completa). */
  const [editando, setEditando] = useState<string | null>(null);

  // Factura única: normalización y validación de duplicados
  const normalizarFactura = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");
  const facturaActualNormalizada = normalizarFactura(numeroFactura);
  const facturaDuplicada = gestiones.some(
    (g) =>
      g.numeroFactura &&
      normalizarFactura(g.numeroFactura) === facturaActualNormalizada &&
      g.id !== (compra?.id ?? ""),
  );
  const [facturaTocada, setFacturaTocada] = useState(false);

  const [provQuery, setProvQuery] = useState(compra?.proveedor ?? "");
  const [provId, setProvId] = useState(compra?.proveedorId ?? "");
  const [provSugAbierto, setProvSugAbierto] = useState(false);
  const [mostrarNuevoProveedor, setMostrarNuevoProveedor] = useState(false);
  const [showGuardarConf, setShowGuardarConf] = useState(false);
  const [showNuevoInsumo, setShowNuevoInsumo] = useState(false);
  const provRef = useRef<HTMLDivElement>(null);

  /** Cerrar: vuelve directo al listado sin confirmación. */
  const salir = () => {
    onClose();
  };

  // ── Separación solicitados / no solicitados (solo detalle) ─────────────────
  // Regla del módulo: es "solicitado" el insumo cuyo id está en el detalle de
  // la Orden de Compra; todo lo demás llegó de más en la recepción.
  const orden = useMemo(
    () => ordenes?.find((o) => o.id === compra?.ordenId),
    [ordenes, compra?.ordenId]
  );
  const idsOrden = useMemo(
    () => new Set((orden?.items ?? []).map((i) => i.idInsumo)),
    [orden]
  );
  const solicitados = useMemo(
    () => (orden ? items.filter((i) => idsOrden.has(i.idInsumo)) : []),
    [orden, items, idsOrden]
  );
  const noSolicitados = useMemo(
    () => (orden ? items.filter((i) => !idsOrden.has(i.idInsumo)) : []),
    [orden, items, idsOrden]
  );
  // Punto 1: totales con la fórmula única `calcularLineaIva`.
  // Orden siempre: Subtotal sin IVA → IVA → Total pagado, y por construcción
  // subtotalSinIva + totalIva === totalPagado.
  const lineasIva = items.map((item) =>
    calcularLineaIva({
      cantidad: item.cantidad,
      montoUnitario: item.precioUnitario,
      porcentajeIva: item.iva,
      // Mientras no se elija ninguna opción no hay ítems, así que el `?? true`
      // solo evita el `null` del estado (nunca altera un cálculo real).
      ivaIncluido: ivaIncluido ?? true,
    })
  );
  const subtotalSinIva = lineasIva.reduce((s, l) => s + l.baseSinIva, 0);
  const totalIva = lineasIva.reduce((s, l) => s + l.montoIva, 0);
  const totalPagado = lineasIva.reduce((s, l) => s + l.subtotalConIva, 0);
  const total = subtotalSinIva + totalIva;

  // ── Validación en tiempo real (patrón de MiPerfilScreen) ──────────────────
  const [tocado, setTocado] = useState({ numeroFactura: false, fechaFactura: false });
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  /** Marca el intento de agregar/guardar sin haber elegido los precios: es lo
   *  que muestra el error rojo bajo las tarjetas (no aparece al abrir). */
  const [ivaIntentado, setIvaIntentado] = useState(false);

  const errorNumeroFactura = numeroFactura.trim()
    ? facturaDuplicada
      ? "Ya existe una compra con este número de factura"
      : undefined
    : "Ingresa el número de factura.";
  const errorFechaFactura = fechaFactura ? undefined : "Selecciona la fecha de la factura.";
  // El proveedor es opcional en este formulario.
  const errorItems = items.length > 0 ? undefined : "Agrega al menos un insumo a la factura.";

  const algunoTocado = tocado.numeroFactura || tocado.fechaFactura;
  const marcarTocado = (campo: "numeroFactura" | "fechaFactura") =>
    setTocado((t) => ({ ...t, [campo]: true }));

  /** Labels: 13px en gris oscuro en pantalla completa; xs gris en el modal. */
  const labelCls = isPage ? labelPaginaCls : labelModalCls;

  /** Etiqueta del campo de monto: según la opción elegida dice de qué valor
   *  se trata ("con IVA" / "sin IVA") para saber qué copiar de la factura. */
  const labelMonto =
    ivaIncluido === null
      ? "Monto unitario"
      : ivaIncluido
        ? "Monto unitario (con IVA)"
        : "Monto unitario (sin IVA)";

  /** Clase del input: resalta en rojo cuando el campo visible es inválido. */
  const campoCls = (error?: string) =>
    `${isPage ? iPaginaCls : iCls} transition-colors ${
      error ? "border-red-400 focus:ring-red-300" : ""
    }`;

  const provSugs = useMemo(() => {
    const q = provQuery.trim().toLowerCase();
    const base = q
      ? proveedores.filter((p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.nit.toLowerCase().includes(q) ||
          p.asesorComercial.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
        )
      : proveedores;
    return base.slice(0, 3);
  }, [proveedores, provQuery]);

  const itemSugs = useMemo(() => {
    // Filtrar solo por tipo "Insumo" y estado "activo"
    const soloInsumos = insumos.filter(i => (i.tipo ?? "Insumo") === "Insumo" && i.estado === "activo");
    // Si el campo está vacío, mostrar los primeros 3 insumos disponibles
    if (itemNombre.trim().length === 0) return soloInsumos.slice(0, 3);
    return soloInsumos.filter((i) => i.nombre.toLowerCase().includes(itemNombre.toLowerCase())).slice(0, 3);
  }, [insumos, itemNombre]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
        setItemSugAbierto(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (provRef.current && !provRef.current.contains(e.target as Node)) {
        setProvSugAbierto(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // Requiere al menos un insumo, que el total sea mayor que cero y haber
  // elegido si los montos de la factura incluyen IVA.
  const errorTotal = total > 0 ? undefined : "El total de la factura debe ser mayor que cero.";
  const camposOk =
    !errorNumeroFactura && !errorFechaFactura && !errorItems && !errorTotal;
  const faltaIva = ivaIncluido === null;
  // Guardar queda habilitado aunque falte elegir el IVA: en ese caso el clic
  // muestra el mensaje rojo bajo el selector (y el toast) sin abrir el confirm.
  const botonGuardarOk = camposOk && !facturaDuplicada;

  const seleccionarProveedor = (p: ProveedorRef) => {
    setProvQuery(p.nombre);
    setProvId(p.id);
    setProvSugAbierto(false);
  };

  const crearProveedor = (p: ProveedorRef) => {
    // Actualizar el estado global de proveedores en App.tsx para que el
    // listado de Proveedores lo vea inmediatamente.
    if (!proveedores.some((x) => x.nombre.toLowerCase() === p.nombre.toLowerCase())) {
      setProveedores((prev) => [...prev, p]);
    }
    setProvQuery(p.nombre);
    setProvId(p.id);
    setMostrarNuevoProveedor(false);
    toast.success(`Proveedor "${p.nombre}" creado`);
  };

  const seleccionarInsumo = (ins: Insumo) => {
    // Punto 2: el precio del catálogo viene en `costoUnitario` (number), que es
    // el mismo que muestra la lista desplegable. `precioUnitario` es null en las
    // semillas, por eso el Monto unitario quedaba en 0.
    setItemId(ins.id);
    setItemNombre(ins.nombre);
    setItemUnidad(UNIDADES.includes(ins.unidadMedida) ? ins.unidadMedida : UNIDADES[0]);
    setItemPrecio(Number(ins.costoUnitario ?? ins.precioUnitario ?? 0));
    setItemIva(Number(ins.iva ?? 0));
    setItemSugAbierto(false);
  };

  const agregarItem = () => {
    // Sin elegir cómo vienen los precios no se puede agregar nada: se marca el
    // intento y aparece el aviso rojo bajo las tarjetas (la sección está a la
    // mitad de opacidad y los campos, deshabilitados).
    if (ivaIncluido === null) {
      setIvaIntentado(true);
      return;
    }

    // Modo edición (lápiz de la tabla): los datos ya están cargados en los
    // campos de arriba, así que solo se reemplaza la fila y se vuelve a dejar
    // el formulario listo para el siguiente insumo.
    if (editando) {
      if (!itemNombre.trim()) {
        toast.error("Ingresa el nombre del insumo.");
        return;
      }
      if (
        items.some(
          (item) =>
            item.rowId !== editando &&
            item.nombre.toLowerCase() === itemNombre.trim().toLowerCase()
        )
      ) {
        toast.error("Este insumo ya fue agregado a la factura.");
        return;
      }
      actualizarItem(editando, {
        nombre: itemNombre.trim(),
        cantidad: itemCantidad,
        unidad: itemUnidad,
        precioUnitario: itemPrecio,
        iva: itemIva,
      });
      limpiarFilaInsumo();
      return;
    }

    if (!itemNombre.trim()) {
      toast.error("Ingresa el nombre del insumo.");
      return;
    }
    if (itemCantidad <= 0) {
      toast.error("La cantidad debe ser mayor que cero.");
      return;
    }
    if (itemPrecio < 0) {
      toast.error("El precio unitario no puede ser negativo.");
      return;
    }
    if (items.some((item) => item.nombre.toLowerCase() === itemNombre.trim().toLowerCase())) {
      toast.error("Este insumo ya fue agregado a la factura.");
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        rowId: `fact-${Date.now()}`,
        idInsumo: itemId || `INS-FAC-${Date.now()}`,
        nombre: itemNombre.trim(),
        unidad: itemUnidad,
        cantidad: itemCantidad,
        costoUnitario: itemPrecio,
        precioUnitario: itemPrecio,
        iva: itemIva,
      },
    ]);

    limpiarFilaInsumo();
  };

  /** Deja la fila "Agregar insumo" lista para el siguiente insumo: campos en
   *  cero y foco de vuelta en el buscador de Nombre. */
  const limpiarFilaInsumo = () => {
    setItemNombre("");
    setItemCantidad(1);
    setItemPrecio(0);
    setItemIva(0);
    setItemId("");
    setItemSugAbierto(false);
    setEditando(null);
    nombreRef.current?.focus();
  };

  /** Lápiz de la tabla: carga la fila en el formulario de la izquierda. */
  const editarItem = (row: InsumoSolicitadoRow) => {
    setEditando(row.rowId);
    setItemNombre(row.nombre);
    setItemCantidad(row.cantidad);
    setItemUnidad(row.unidad);
    setItemPrecio(row.precioUnitario);
    setItemIva(row.iva);
    setItemSugAbierto(false);
    nombreRef.current?.focus();
  };

  const eliminarItem = (rowId: string) => {
    setItems((prev) => prev.filter((item) => item.rowId !== rowId));
  };

  const actualizarItem = (
    rowId: string,
    patch: Partial<ItemFactura>
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              ...patch,
              // `costoUnitario` es el precio que consumen el listado, el PDF y
              // la persistencia de la compra: si cambia el monto unitario hay
              // que moverlo también o los totales quedan con el precio viejo.
              costoUnitario: patch.precioUnitario ?? item.costoUnitario,
            }
          : item
      )
    );
  };

  const guardar = () => {
    setIntentoGuardar(true);

    if (!numeroFactura.trim()) {
      toast.error("Ingresa el número de factura.");
      return;
    }
    if (facturaDuplicada) {
      toast.error("Ya existe una compra con este número de factura");
      return;
    }
    if (!fechaFactura) {
      toast.error("Selecciona la fecha de la factura.");
      return;
    }
    // El proveedor es opcional: si se escribió, se usa; si no, queda vacío.
    if (items.length === 0) {
      toast.error("Agrega al menos un insumo recibido.");
      return;
    }
    if (total <= 0) {
      toast.error("El total recibido debe ser mayor que cero.");
      return;
    }
    if (faltaIva) {
      // Con el formulario completo pero sin elegir los precios el botón está
      // habilitado: aquí se avisa en rojo bajo las tarjetas y no se guarda.
      setIvaIntentado(true);
      toast.error(MSJ_IVA_FALTA);
      return;
    }

    setShowGuardarConf(true);
  };

  const confirmarGuardar = () => {
    setShowGuardarConf(false);
    onGuardar({
      proveedor: provQuery.trim(),
      proveedorId: provId,
      numeroFactura: numeroFactura.trim(),
      fechaFactura,
      valorTotal: total,
      // Punto 4: la compra se guarda siempre con estado "Recibido".
      estado: "Recibido",
      // Punto 1: cada línea guarda sus valores de IVA; los totales de la
      // factura se guardan aparte (y el backend los recalcula).
      items: items.map((item, i) => ({
        ...item,
        baseSinIva: lineasIva[i].baseSinIva,
        montoIva: lineasIva[i].montoIva,
      })),
      ivaIncluido: ivaIncluido ?? true,
      subtotalSinIva,
      totalIva,
      totalPagado,
    });
  };

  /** Subtítulo de la cabecera (solo cuando aporta algo). */
  const subtitulo = isView
    ? compra
      ? `Compra ${compra.id}`
      : ""
    : isPage
      ? "Registra una factura de proveedor"
      : "";

  return (
    <>
      <div
        className={
          isPage
            ? "w-full p-4 max-w-[1200px] mx-auto h-full flex flex-col overflow-hidden"
            : "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-hidden"
        }
      >
        <div
          className={
            isPage
              ? "w-full h-full flex flex-col"
              : "h-full flex items-center justify-center p-4"
          }
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`flex flex-col w-full ${isPage ? "max-w-[1200px]" : FORM_MAXW}${
              isPage
                ? " h-full"
                : " max-h-[calc(100dvh-2rem)] bg-card rounded-2xl shadow-2xl border border-border my-4"
            }`}
          >
            {/* Cabecera: ← + título + subtítulo en pantalla completa; X en el
                modal. Volver pide confirmación si hay datos escritos. */}
            <div className={`flex items-center justify-between gap-3 px-5 ${isPage ? "py-1.5" : "py-4"} border-b border-border shrink-0`}>
              <div className="flex items-center gap-3 min-w-0">
                {isPage && (
                  <button
                    onClick={salir}
                    title="Volver"
                    className="shrink-0 p-2 -ml-1 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="min-w-0">
                  <h3
                    className={`${isPage ? "text-lg" : "text-base"} font-bold text-foreground`}
                    style={{ fontFamily: SERIF }}
                  >
                    {isView ? "Detalle de Compra" : "Nueva Compra"}
                  </h3>
                  {subtitulo && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitulo}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isView && compra && <EstadoBadge e={compra.estado} />}
                {!isPage && (
                  <button
                    onClick={salir}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div
              className={
                isPage
                  ? "flex-1 min-h-0 px-5 py-3 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden"
                  : "flex-1 min-h-0 px-5 py-5 flex flex-col gap-5 overflow-y-auto"
              }
            >
              {/* Columna IZQUIERDA — formulario (50 %). En el modal es solo un
                  grupo vertical: mantiene el mismo flujo de antes. */}
              <div
                className={
                  isPage
                    ? "w-full lg:w-[50%] shrink-0 lg:pr-6 min-h-0 flex flex-col gap-6 lg:overflow-y-auto"
                    : "flex flex-col gap-5"
                }
              >
              {/* Banners de estado */}
              {isView && compra?.estado === "Anulado" && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                  <Ban className="w-4 h-4 shrink-0" />
                  Esta compra ha sido anulada.
                </div>
              )}

              {/* Sección 1 — "Datos de la factura" (el título solo existe en
                  pantalla completa; en el modal el `<section>` solo agrupa
                  para mantener el mismo espaciado de antes). */}
              <section
                className={`flex flex-col ${isPage ? "gap-2 shrink-0" : "gap-5"}`}
              >
                {isPage && <p className={seccionCls}>Datos de la factura</p>}

                {/* Detalle (vista): 3 columnas. Creación en pantalla completa:
                    Fila 1: Número de factura * | Proveedor (opcional)
                    Fila 2: Fecha de factura * | Estado (badge Recibido)
                    En el modal se conserva la rejilla original. */}
                <div
                  className={`grid gap-4 shrink-0 ${
                    isView
                      ? "grid-cols-2 md:grid-cols-3"
                      : isPage
                        ? "grid-cols-2"
                        : "grid-cols-1 md:grid-cols-3"
                  }`}
                >
                  <div className="relative">
                    <label className={labelCls}>
                      Número de factura {!isView && <span className="text-red-500">*</span>}
                    </label>
                    {isView ? (
                      <p className="text-sm font-semibold text-foreground py-2">{numeroFactura || "—"}</p>
                    ) : (
                      <input
                        value={numeroFactura}
                        onChange={(e) => setNumeroFactura(e.target.value)}
                        onBlur={() => { marcarTocado("numeroFactura"); setFacturaTocada(true); }}
                        placeholder="Ej: FAC-2026-0001"
                        className={campoCls(
                          (tocado.numeroFactura || facturaTocada || intentoGuardar) ? errorNumeroFactura : undefined
                        )}
                        aria-invalid={!!((tocado.numeroFactura || facturaTocada || intentoGuardar) && errorNumeroFactura)}
                        autoFocus
                      />
                    )}
                    {!isView && (tocado.numeroFactura || facturaTocada || intentoGuardar) && errorNumeroFactura && (
                      <p className={isPage ? "absolute left-0 top-full text-xs text-red-500" : "text-xs text-red-500 mt-1 ml-0.5"}>{errorNumeroFactura}</p>
                    )}
                  </div>

                  <div className="relative">
                    <label className={labelCls}>
                      Proveedor <span className="text-muted-foreground/70 font-normal">(opcional)</span>
                    </label>
                    {isView ? (
                      <p className="text-sm font-semibold text-foreground py-2">{provQuery || "—"}</p>
                    ) : (
                      <div className="relative" ref={provRef}>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <input
                          value={provQuery}
                          onChange={(e) => {
                            setProvQuery(e.target.value);
                            setProvSugAbierto(true);
                          }}
                          onFocus={() => setProvSugAbierto(true)}
                          placeholder="Buscar por nombre, NIT, asesor o email..."
                          className={`${isPage ? iPaginaCls : iCls} pl-10`}
                        />
                        {/* Punto 6: el desplegable va por encima de todo el formulario. */}
                        {provSugAbierto && (
                          <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                            {/* Opción "+ Crear proveedor" PRIMERA */}
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setProvSugAbierto(false);
                                setMostrarNuevoProveedor(true);
                              }}
                              className="w-full text-left px-3 py-2.5 text-xs font-semibold text-primary hover:bg-primary/10 cursor-pointer inline-flex items-center gap-2 border-b border-border"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Crear proveedor {provQuery.trim() && `“${provQuery.trim()}”`}
                            </button>
                            <hr className="my-0.5 border-border" />
                            {/* Resultados - máximo 3 */}
                            {provSugs.slice(0, 3).map((p) => (
                              <button
                                key={p.nit}
                                type="button"
                                onMouseDown={() => seleccionarProveedor(p)}
                                className="w-full text-left px-3 py-2.5 text-xs hover:bg-muted cursor-pointer border-b border-border last:border-0"
                              >
                                <p className="font-semibold text-foreground">{p.nombre}</p>
                                <p className="text-muted-foreground">
                                  NIT {p.nit}
                                  {p.asesorComercial && <> · Asesor: {p.asesorComercial}</>}
                                </p>
                              </button>
                            ))}
                            {provSugs.length === 0 && (
                              <div className="px-3 py-2.5 text-xs text-muted-foreground text-center border-b border-border">
                                Sin resultados
                              </div>
                            )}
                            {provSugs.length > 3 && (
                              <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                                +{provSugs.length - 3} más...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {!isView && isPage && (
                    <>
                      <div className="relative">
                        <label className={labelCls}>
                          Fecha de factura <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={fechaFactura}
                          onChange={(e) => setFechaFactura(e.target.value)}
                          onBlur={() => marcarTocado("fechaFactura")}
                          max={today}
                          className={campoCls(
                            (tocado.fechaFactura || intentoGuardar) ? errorFechaFactura : undefined
                          )}
                          aria-invalid={!!((tocado.fechaFactura || intentoGuardar) && errorFechaFactura)}
                        />
                        {(tocado.fechaFactura || intentoGuardar) && errorFechaFactura && (
                          <p className="absolute left-0 top-full text-xs text-red-500">{errorFechaFactura}</p>
                        )}
                      </div>

                      <div className="relative">
                        <label className={labelCls}>Estado</label>
                        {/* Badge "Recibido" alineado a la izquierda, centrado verticalmente a la altura del input */}
                        <div className="h-10 flex items-center">
                          <EstadoBadge e="Recibido" />
                        </div>
                      </div>
                    </>
                  )}

                  {!isView && !isPage && (
                    <>
                      <div className={campoCortoCls}>
                        <label className={labelCls}>
                          Fecha de factura <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={fechaFactura}
                          onChange={(e) => setFechaFactura(e.target.value)}
                          onBlur={() => marcarTocado("fechaFactura")}
                          max={today}
                          className={campoCls(
                            (tocado.fechaFactura || intentoGuardar) ? errorFechaFactura : undefined
                          )}
                          aria-invalid={!!((tocado.fechaFactura || intentoGuardar) && errorFechaFactura)}
                        />
                        {(tocado.fechaFactura || intentoGuardar) && errorFechaFactura && (
                          <p className="text-xs text-red-500 mt-1 ml-0.5">{errorFechaFactura}</p>
                        )}
                      </div>

                      <div className={campoCortoCls}>
                        <label className={labelCls}>Estado</label>
                        <div className="py-2">
                          <EstadoBadge e="Recibido" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* IVA de la factura — solo el modal conserva el control
                      segmentado original. Reglas compartidas: al crear NINGUNA
                      opción viene seleccionada, y con insumos en la tabla la
                      opción no elegida queda bloqueada. */}
                  {!isView && !isPage && (
                    <div className="md:col-span-2">
                      <label className={labelCls}>
                        ¿Los montos de la factura incluyen IVA?
                      </label>

                      <div className="inline-flex gap-1 p-1 bg-muted border border-border rounded-xl">
                        {([true, false] as const).map((opcion) => {
                          const elegida = ivaIncluido === opcion;
                          const bloqueada = ivaBloqueada(opcion);

                          return (
                            <span
                              key={String(opcion)}
                              className={`inline-flex ${bloqueada ? "cursor-not-allowed" : ""}`}
                              title={bloqueada ? MSJ_IVA_BLOQUEADO : undefined}
                            >
                              <button
                                type="button"
                                onClick={() => setIvaIncluido(opcion)}
                                aria-pressed={elegida}
                                disabled={bloqueada}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                  elegida
                                    ? "bg-primary text-white shadow-sm"
                                    : bloqueada
                                      ? "bg-background text-muted-foreground/50 cursor-not-allowed pointer-events-none"
                                      : "text-muted-foreground hover:bg-background cursor-pointer"
                                }`}
                              >
                                {opcion ? "Sí, IVA incluido" : "No, sin IVA"}
                              </button>
                            </span>
                          );
                        })}
                      </div>

                      {ivaIncluido === null && intentoGuardar ? (
                        <p className="text-xs text-red-500 mt-1">Selecciona si los montos de la factura incluyen IVA</p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                          {ivaIncluido === null
                            ? "Indica cómo vienen los montos en la factura"
                            : ivaIncluido
                              ? "El monto unitario de cada línea ya trae el IVA adentro."
                              : "El monto unitario de cada línea es base y el IVA se suma aparte."}
                        </p>
                      )}
                    </div>
                  )}
                </div>

              {/* Selector de precios (pantalla completa): dos tarjetas tipo
                  radio, en la MISMA fila. NINGUNA viene elegida al abrir; con
                  al menos un insumo la no elegida queda bloqueada y su tooltip
                  explica cómo desbloquearla. El error en ROJO solo aparece
                  cuando el usuario intenta agregar o guardar. */}
              {!isView && isPage && (
                <div className="shrink-0">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[13px] leading-tight font-medium text-foreground/70">
                      ¿Cómo vienen los precios en la factura?{" "}
                      <span className="text-red-500">*</span>
                    </span>
                    {/* Ayuda: el tooltip entra por tokens, así que se lee bien
                        en modo claro y en modo oscuro. */}
                    <span className="group relative inline-flex">
                      <HelpCircle
                        aria-hidden
                        className="w-4 h-4 text-muted-foreground cursor-help"
                      />
                      <span className="sr-only">Ayuda sobre los precios de la factura</span>
                      <span className="pointer-events-none absolute left-0 top-full mt-2 z-50 w-[280px] rounded-xl border border-border bg-popover text-popover-foreground shadow-xl p-3 text-xs leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity">
                        {MSJ_IVA_AYUDA}
                      </span>
                    </span>
                  </div>

                  <div
                    role="radiogroup"
                    aria-label="Cómo vienen los precios en la factura"
                    className="flex gap-2"
                  >
                    {OPCIONES_IVA.map(({ valor, titulo, tag, desc }) => {
                      const elegida = ivaIncluido === valor;
                      const bloqueada = ivaBloqueada(valor);

                      return (
                        <button
                          key={String(valor)}
                          type="button"
                          role="radio"
                          aria-checked={elegida}
                          disabled={bloqueada}
                          title={bloqueada ? MSJ_IVA_BLOQUEADO : undefined}
                          onClick={() => {
                            if (bloqueada) return;
                            setIvaIncluido(valor);
                            setIvaIntentado(false);
                          }}
                          className={`flex-1 flex items-start gap-2 px-2 py-2 rounded-xl border text-left transition-colors ${
                            elegida
                              ? "border-primary bg-primary/5"
                              : "border-border bg-background"
                          } ${
                            bloqueada
                              ? "opacity-60 cursor-not-allowed"
                              : "cursor-pointer hover:border-primary/40"
                          }`}
                        >
                          <span
                            className={`mt-0.5 w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
                              elegida ? "border-primary" : "border-muted-foreground/40"
                            }`}
                          >
                            {elegida && <span className="w-2 h-2 rounded-full bg-primary" />}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <span className="text-[12px] font-semibold text-foreground">
                                {titulo}
                              </span>
                              {tag && (
                                <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                  {tag}
                                </span>
                              )}
                            </span>
                            <span className="block text-[11px] leading-snug text-muted-foreground mt-0.5">
                              {desc}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {ivaIncluido === null && (ivaIntentado || intentoGuardar) && (
                    <p className="text-xs text-red-500 mt-1.5">{MSJ_IVA_FALTA}</p>
                  )}
                </div>
              )}
              </section>

              {/* Sección 2 — "Agregar insumo": fila con buscador, stepper y
                  botón en una sola línea. En pantalla completa es el ÚLTIMO
                  bloque de la columna izquierda (la tabla vive en la derecha). */}
              {!isView && (
                <section className={`flex flex-col ${isPage ? "gap-3 shrink-0" : "gap-5"}`}>
                  {isPage && <p className={seccionCls}>Agregar insumo</p>}
                  <CompactInsumoForm
                    containerRef={itemRef}
                    titulo={isPage ? "" : "Agregar insumo"}
                    nombre={itemNombre}
                    onNombreChange={(value) => {
                      setItemNombre(value);
                      setItemId("");
                      setItemSugAbierto(true);
                    }}
                    onNombreFocus={() => setItemSugAbierto(true)}
                    cantidad={itemCantidad}
                    onCantidadChange={setItemCantidad}
                    unidad={itemUnidad}
                    onUnidadChange={setItemUnidad}
                    disabled={ivaIncluido === null}
                    precio={itemPrecio}
                    onPrecioChange={setItemPrecio}
                    iva={itemIva}
                    onIvaChange={setItemIva}
                    onAgregar={agregarItem}
                    suggestions={itemSugs}
                    showSuggestions={itemSugAbierto}
                    onSelectSuggestion={(suggestion) => seleccionarInsumo(suggestion as Insumo)}
                    onCrearInsumo={() => {
                      // Al abrir el modal se cierra el desplegable de
                      // sugerencias: si queda abierto quedaría por encima del
                      // formulario de "Nuevo Insumo" e interceptaría los clics.
                      setItemSugAbierto(false);
                      setShowNuevoInsumo(true);
                    }}
                    compacto={isPage}
                    buttonLabel={editando ? "Actualizar" : "Agregar"}
                    variante="compacta"
                  />
                  {/* Aviso de insumos/total: en pantalla completa va justo
                      debajo de la fila (solo empuja la tabla al aparecer); en
                      el modal, con el mismo margen de 20px de antes. */}
                  {(errorItems || errorTotal) && (algunoTocado || intentoGuardar) && (
                    <p className={`text-xs text-red-500 ${isPage ? "mt-1 ml-0.5" : "mt-5 ml-0.5"}`}>
                      {errorItems ?? errorTotal}
                    </p>
                  )}
                </section>
              )}
              </div>

              {/* Columna DERECHA (50 %) — insumos agregados, totales y
                  botones. Separada de la izquierda por una línea vertical. */}
              <div
                className={
                  isPage
                    ? "w-full lg:w-[50%] min-w-0 min-h-0 flex flex-col gap-3 lg:border-l lg:border-border lg:pl-6"
                    : "flex flex-col gap-5"
                }
              >
                {/* Cabecera de la tabla: contador y, debajo, un recordatorio
                    de la opción de precios elegida. */}
                {isPage && !isView && (
                  <div className="shrink-0">
                    <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-border">
                      <p className="text-[11px] leading-none font-bold uppercase tracking-widest text-muted-foreground">
                        Insumos agregados
                      </p>
                      <span className="text-xs font-medium text-muted-foreground">
                        {items.length} {items.length === 1 ? "insumo" : "insumos"}
                      </span>
                    </div>
                    {ivaIncluido !== null && (
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        {ivaIncluido ? "Precios con IVA incluido" : "Precios sin IVA"}
                      </p>
                    )}
                  </div>
                )}

              {isView ? (
                <div className="flex flex-col gap-4">
                  {/* Punto 1: el detalle indica si los montos guardados traen
                      IVA incluido o no. */}
                  <div className="shrink-0">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-muted border border-border text-muted-foreground">
                      {ivaIncluido ? "Montos con IVA incluido" : "Montos sin IVA"}
                    </span>
                  </div>
                  {orden ? (
                    <>
                      <InsumosSolicitadosTable
                        items={solicitados}
                        showActions={false}
                        titulo="Insumos solicitados"
                        subtotalLabel="Subtotal solicitados"
                        mostrarIva
                        mostrarTotal={false}
                        modoIva
                        ivaIncluido={ivaIncluido ?? true}
                        className={isPage ? "flex-1 min-h-0" : ""}
                      />
                      {noSolicitados.length > 0 && (
                        <InsumosSolicitadosTable
                          items={noSolicitados}
                          showActions={false}
                          tono="amber"
                          titulo="Insumos no solicitados"
                          subtotalLabel="Subtotal no solicitados"
                          mostrarIva
                          mostrarTotal={false}
                          modoIva
                          ivaIncluido={ivaIncluido ?? true}
                        />
                      )}
                    </>
                  ) : (
                    <InsumosSolicitadosTable
                      items={items}
                      showActions={false}
                      titulo="Insumos recibidos"
                      subtotalLabel="Subtotal"
                      mostrarIva
                      mostrarTotal={false}
                      modoIva
                      ivaIncluido={ivaIncluido ?? true}
                      className={isPage ? "flex-1 min-h-0" : ""}
                    />
                  )}

                  {/* Total pagado */}
                  <div className="flex justify-between items-center px-1 pt-1 border-t border-border shrink-0">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Total pagado
                    </span>
                    <span className="text-lg font-bold text-foreground">
                      {fmtCOP(totalPagado)}
                    </span>
                  </div>
                </div>
              ) : (
                <InsumosSolicitadosTable
                  items={items}
                  showActions
                  onRemove={eliminarItem}
                  onUpdate={actualizarItem}
                  totalLabel="Total pagado"
                  modoIva
                  ivaIncluido={ivaIncluido ?? true}
                  enPagina={isPage}
                  className={isPage ? "flex-1 min-h-0" : ""}
                />
              )}

                {/* Acciones: en pantalla completa van al final de ESTA columna
                    (siempre visibles); en el modal siguen en el pie general. */}
                {isPage && !isView && (
                  <div className="flex gap-3 shrink-0 pt-1">
                    <button
                      onClick={salir}
                      className="flex-1 h-10 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={guardar}
                      disabled={!botonGuardarOk}
                      className="flex-1 h-10 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
                    >
                      <Check className="w-4 h-4" />
                      Guardar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer del modal — solo en creación; en detalle se cierra con
                la X del encabezado. */}
            {!isView && !isPage && (
              <div className="flex gap-3 px-5 py-4 border-t border-border shrink-0">
                <button
                  onClick={salir}
                  className="flex-1 h-10 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={!botonGuardarOk}
                  className="flex-1 h-10 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
                >
                  <Check className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {mostrarNuevoProveedor && (
          <NuevoProveedorModal
            nombreInicial={provQuery.trim()}
            existentes={proveedores}
            onGuardar={crearProveedor}
            onClose={() => setMostrarNuevoProveedor(false)}
          />
        )}
      </AnimatePresence>

      {/* Punto 2: Modal de nuevo insumo */}
      <AnimatePresence>
        {showNuevoInsumo && (
          <NuevoInsumoModal
            nombreInicial={itemNombre}
            insumosExistentes={insumos}
            onGuardar={(ins) => {
              setItemNombre(ins.nombre);
              setItemUnidad(ins.unidadMedida);
              setItemPrecio(ins.precioUnitario);
              setItemId(ins.id);
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
    </>
  );
}

// ─── NUEVA COMPRA — PÁGINA INDEPENDIENTE ─────────────────────────────────────

interface NuevaCompraPageProps {
  gestiones: GestionCompra[];
  setGestiones: React.Dispatch<React.SetStateAction<GestionCompra[]>>;
  proveedores: ProveedorRef[];
  setProveedores: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
  insumos: Insumo[];
  onBack: () => void;
}

export function NuevaCompraPage({
  gestiones,
  setGestiones,
  proveedores,
  setProveedores,
  insumos,
  onBack,
}: NuevaCompraPageProps) {
  const handleGuardar = (data: NuevaCompraData) => {
    const nuevoId = String(
      Math.max(0, ...gestiones.map((g) => parseInt(g.id, 10) || 0)) + 1
    ).padStart(3, "0");

    const nueva: GestionCompra = {
      id: nuevoId,
      ordenId: "",
      proveedor: data.proveedor,
      proveedorId: data.proveedorId,
      numeroFactura: data.numeroFactura,
      fechaFactura: data.fechaFactura,
      valorTotal: data.valorTotal,
      estado: data.estado,
      items: data.items.map((item) => ({ ...item })),
      // Punto 1: totales de IVA guardados en la compra (el backend los
      // recalcula con la misma fórmula antes de persistir).
      ivaIncluido: data.ivaIncluido,
      subtotalSinIva: data.subtotalSinIva,
      totalIva: data.totalIva,
      totalPagado: data.totalPagado,
    };

    setGestiones((prev) => [nueva, ...prev]);
    toast.success(`Compra ${nueva.id} creada · Factura ${nueva.numeroFactura}`);
    onBack();
  };

  return (
    <CompraForm
      // Pantalla completa dentro del panel (no modal).
      fullPage
      proveedores={proveedores}
      setProveedores={setProveedores}
      insumos={insumos}
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
  proveedores: ProveedorRef[];
  setProveedores: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
  onNuevaCompra: () => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExportExcel?: boolean;
}

export function GestionCompraScreen({
  gestiones, setGestiones, ordenes, setOrdenes, insumos, proveedores, setProveedores,
  onNuevaCompra,
  canCreate = true,
  canExportExcel = true,
}: Props) {
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [detail, setDetail]   = useState<GestionCompra | null>(null);
  const [estadoConfirm, setEstadoConfirm] = useState<{ id: string; from: EstadoGestion; next: EstadoGestion } | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");

  // Se declara antes del `useMemo` de abajo porque la fábrica lo invoca durante
  // el render; como `const`, usarla desde allí la lanzaba en TDZ
  // ("Cannot access 'getOrden' before initialization") al escribir en el buscador.
  const getOrden = (oid: string) => ordenes.find(o => o.id === oid);

  // Depuración (solo DEV): imprime el JSON que recibe el detalle de la compra
  // (lo mismo que "devolvería" el GET del detalle) al abrir el ojo.
  useEffect(() => {
    if (import.meta.env.DEV && detail) {
      // Debug logging removed
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail]);

  const filtered = useMemo(() =>
    gestiones.filter(g => {
      const q = search.toLowerCase();
      if (!q) return true;
      const proveedor = g.proveedor ?? getOrden(g.ordenId)?.proveedor ?? "";
      return proveedor.toLowerCase().includes(q)
        || g.numeroFactura.toLowerCase().includes(q)
        || g.estado.toLowerCase().includes(q);
    }),
    [gestiones, search, ordenes]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  /** Orden de compra relacionada con la compra del diálogo de confirmación. */
  const estadoOrdenConfirm = estadoConfirm
    ? gestiones.find((g) => g.id === estadoConfirm.id)?.ordenId ?? ""
    : "";

  /** Pide confirmación antes de aplicar el cambio de estado. */
  const pedirCambiarEstado = (id: string, next: EstadoGestion) => {
    const actual = gestiones.find((g) => g.id === id)?.estado;

    // "Anulado" es definitivo: no se puede volver a "Recibido".
    if (!actual || actual === next || actual === "Anulado") {
      setEstadoConfirm(null);
      return;
    }

    // Punto 6: el diálogo siempre arranca con el motivo vacío (si no, el botón
    // "Anular" se habilitaría con el motivo de una anulación anterior).
    setMotivoAnulacion("");
    setEstadoConfirm({ id, from: actual, next });
  };

  const handleCambiarEstado = (id: string, next: EstadoGestion, motivo?: string) => {
    // Solo se actualiza el estado de la Compra puntual (por su ID).
    // Punto 6: al anular se guarda el motivo (obligatorio en el formulario) y
    // la fecha/hora exacta en la que ocurrió; en los demás cambios se limpian.
    setGestiones((prev) => prev.map((x) => (x.id === id ? {
      ...x,
      estado: next,
      motivoAnulacion: next === "Anulado" ? motivo : undefined,
      fechaAnulacion: next === "Anulado" ? new Date().toISOString() : undefined,
    } : x)));
    setEstadoConfirm(null);
    setMotivoAnulacion("");

    // Caso 2 — Orden de Compra con SOLO una Compra asociada:
    // Al anular esa única Compra, la Orden de Compra asociada también pasa a Anulado.
    if (next === "Anulado") {
      const ordenId = gestiones.find((g) => g.id === id)?.ordenId ?? "";
      if (ordenId) {
        const comprasAsociadas = gestiones.filter((g) => g.ordenId === ordenId);
        if (comprasAsociadas.length === 1) {
          setOrdenes((prev) =>
            prev.map((o) =>
              o.id === ordenId ? { ...o, estado: "Anulado" as EstadoOrden } : o
            )
          );
          toast.success(`Compra ${id} y orden ${ordenId} anuladas`);
          return;
        }
      }
    }

    toast.success(`Estado cambiado a: ${next}`);
  };

  const handleDownload = async () => {
    // Preparar datos agrupados: cada compra con sus insumos debajo
    const comprasParaExcel: GestionCompraConInsumos[] = filtered.map(g => {
      const orden = getOrden(g.ordenId);
      // Buscar proveedor por ID primero (JOIN correcto), luego por nombre como fallback
      const prov = g.proveedorId
        ? proveedores.find(p => p.id === g.proveedorId)
        : proveedores.find(p => 
            p.nombre === (orden?.proveedor ?? g.proveedor) || 
            p.nombre.toLowerCase() === (orden?.proveedor ?? g.proveedor)?.toLowerCase() ||
            p.nombre.toLowerCase().includes((orden?.proveedor ?? g.proveedor)?.toLowerCase() || '') ||
            (orden?.proveedor ?? g.proveedor)?.toLowerCase().includes(p.nombre.toLowerCase() || '')
          );
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
        proveedor: prov?.nombre ?? orden?.proveedor ?? g.proveedor ?? "—",
        nit: prov?.nit ?? "",
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

  return (
    <div className="px-6 pt-5 pb-4 max-w-5xl mx-auto h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-4 mb-5 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>
            Gestión de Compras
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Registro de facturas vinculadas a órdenes completadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canExportExcel && <BotonDescargarExcel onClick={handleDownload} />}
          {canCreate && (
            <button
              onClick={onNuevaCompra}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Crear Compra
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 shrink-0">
        <SearchInput
          value={search}
          onChange={v => { setSearch(v); setPage(1); }}
          placeholder="Buscar por ID, OC o N° Factura..."
          wrapperClassName="w-full max-w-sm shrink-0"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-3">
        <div className="overflow-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {["N° Factura", "Fecha", "Nombre", "Total", "Estado", "Acciones"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-14 text-center text-muted-foreground">
                      <p className="text-4xl mb-3">📦</p>
                      <p className="font-medium">No hay gestiones de compra aún</p>
                      <p className="text-xs mt-1">
                        Se crean al recibir una Orden de Compra o manualmente con «+ Crear Compra»
                      </p>
                    </td>
                  </tr>
                )
                : paged.map(g => {
                  const orden = getOrden(g.ordenId);
                  // Buscar proveedor por ID primero (JOIN correcto), luego por nombre como fallback
                  const prov = g.proveedorId
                    ? proveedores.find(p => p.id === g.proveedorId)
                    : proveedores.find(p => 
                        p.nombre === (g.proveedor || orden?.proveedor) || 
                        p.nombre.toLowerCase() === (g.proveedor || orden?.proveedor)?.toLowerCase() ||
                        p.nombre.toLowerCase().includes((g.proveedor || orden?.proveedor)?.toLowerCase() || '') ||
                        (g.proveedor || orden?.proveedor)?.toLowerCase().includes(p.nombre.toLowerCase() || '')
                      );
                  const nit = prov?.nit ?? "";
                  const nombreMostrar = prov?.nombre || g.proveedor || orden?.proveedor || "—";
                  return (
                    <tr key={g.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 text-xs">
                        {g.numeroFactura
                          ? <span className="font-mono font-semibold text-foreground">{g.numeroFactura}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {g.fechaFactura || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-foreground">
                        <p className="text-sm text-foreground">{nombreMostrar}</p>
                        {nit && <p className="text-[11px] text-muted-foreground font-mono">NIT {nit}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-foreground whitespace-nowrap">
                        {g.valorTotal > 0
                          ? fmtCOP(g.valorTotal)
                          : <span className="text-muted-foreground font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <EstadoSelect
                          value={g.estado}
                          onChange={(nuevoEstado) => {
                            if (nuevoEstado === g.estado) return;
                            pedirCambiarEstado(g.id, nuevoEstado);
                          }}
                          options={[
                            { value: "Recibido" as EstadoGestion, label: "Recibido", color: ESTADO_CONFIG.Recibido },
                            { value: "Anulado" as EstadoGestion, label: "Anulado", color: ESTADO_CONFIG.Anulado },
                          ]}
                          disabled={g.estado === "Anulado"}
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => setDetail(g)}
                          title="Ver detalle"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-sm font-semibold cursor-pointer ${n === page ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {detail && (
          <CompraForm
            mode="view"
            compra={{
              ...detail,
              proveedor:
                detail.proveedor ?? getOrden(detail.ordenId)?.proveedor ?? "",
            }}
            proveedores={proveedores}
            setProveedores={setProveedores}
            insumos={insumos}
            gestiones={gestiones}
            ordenes={ordenes}
            onClose={() => setDetail(null)}
            onGuardar={() => {}}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {estadoConfirm && (
          <ConfirmModal
            title={`¿Cambiar el estado a ${estadoConfirm.next}?`}
            body={`La compra ${estadoConfirm.id} pasará de ${estadoConfirm.from} a ${estadoConfirm.next}.`}
            detail={
              estadoConfirm.next === "Anulado"
                ? estadoOrdenConfirm
                  ? `La orden ${estadoOrdenConfirm} también quedará anulada y no podrá recibir más facturas.`
                  : "Una compra anulada no puede volver al estado Recibido."
                : "Volverá a contar en los totales de Gestión de Compras."
            }
            confirmLabel={
              estadoConfirm.next === "Anulado" ? "Anular" : `Marcar ${estadoConfirm.next}`
            }
            danger={estadoConfirm.next === "Anulado"}
            icon={
              estadoConfirm.next === "Anulado" ? (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-red-600" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
              )
            }
            showMotivo={estadoConfirm.next === "Anulado"}
            motivo={motivoAnulacion}
            onMotivoChange={setMotivoAnulacion}
            onConfirm={() => handleCambiarEstado(estadoConfirm.id, estadoConfirm.next, motivoAnulacion)}
            onCancel={() => {
              setEstadoConfirm(null);
              setMotivoAnulacion("");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
