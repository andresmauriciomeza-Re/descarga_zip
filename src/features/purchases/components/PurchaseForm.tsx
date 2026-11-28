import type { ProveedorRef, GestionCompra, OrdenCompra } from "@/features/purchase-orders/utils/purchase-orders";
import React, { useState, useRef, useMemo, useEffect } from "react";
import type { Insumo } from "@/features/supplies/utils/supplies";
import { type SetCatalogo, historialCompraDe, unidadesPorLinea } from "@/features/purchases/services/inventory";
import type { CategoriaInsumo } from "@/features/supplies/utils/supplies";
import type { Producto } from "@/features/products/utils/products";
import type { CategoriaProducto } from "@/features/product-categories/utils/product-categories";
import { type NuevaCompraData, type ItemFactura, type TipoItem, labelPaginaCls, labelModalCls, iPaginaCls, iCls, SERIF, labelDatoCls, valorDatoCls, campoCortoCls, fmtCOP } from "@/features/purchases/utils/purchases";
import { type ModoIva, calcularLineaIva, resolverModoIva, chipIvaSinPrefijo } from "@/features/purchases/services/vat";
import { nombreBuscable, contenidoDe, presentacionCompra, empaqueDe, medidaCompra } from "@/shared/utils/presentation";
import { type InsumoSuggestion, type CompactInsumoFormValues, CompactInsumoForm } from "@/features/purchases/components/CompactSupplyForm";
import { toast } from "sonner";
import { esEmpaque, etiquetaPresentacion } from "@/shared/utils/units";
import { motion, AnimatePresence } from "motion/react";
import { FORM_MAXW } from "@/features/purchase-orders/utils/purchase-orders";
import { NuevoProveedorModal } from "@/features/purchase-orders/components/NewSupplierModal";
import { ArrowLeft, X, Ban, Search, Plus, Check } from "lucide-react";
import { EstadoBadge } from "@/features/purchases/components/StatusBadge";
import { CalendarDropdown } from "@/shared/components/CalendarDropdown";
import { SegmentadoButtons } from "@/shared/components/buttons/SegmentedButtons";
import { esIdInsumo } from "@/shared/utils/technicalSheets";
import { TablaItemsFactura } from "@/features/purchases/components/InvoiceItemsTable";
import { CrearInsumoCompraModal } from "@/features/purchases/components/CreatePurchaseSupplyModal";
import { CrearProductoModal } from "@/features/products/components/CreateProductModal";
import { DialogoConfirmacion } from "@/shared/components/panel/ConfirmDialog";

export function CompraForm({
  proveedores,
  setProveedores,
  insumos,
  setInsumos,
  productos,
  categorias,
  gestiones,
  mode = "create",
  compra,
  fullPage = false,
  ordenes,
  onClose,
  onGuardar,
  onCrearProducto,
  categoriasInsumo,
}: {
  proveedores: ProveedorRef[];
  setProveedores: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
  insumos: Insumo[];
  setInsumos?: SetCatalogo<Insumo>;
  /** Bloque 2.2: categorías de insumos desde la API para el "+ Crear insumo". */
  categoriasInsumo?: CategoriaInsumo[];
  /** P14: catálogo de productos del módulo de Productos: son la otra mitad
   *  del selector "Tipo" de la Nueva compra. */
  productos?: Producto[];
  /** Bloque 2: categorías del panel para el "+ Crear producto" (sólo las de
   *  tipo "Producto terminado" se ofrecen). */
  categorias?: CategoriaProducto[];
  /** Gestiones de compra existentes para validar factura única. */
  gestiones: GestionCompra[];
  mode?: "create" | "view";
  compra?: GestionCompra;
  fullPage?: boolean;
  /** Órdenes de compra: necesarias para separar solicitados / no solicitados. */
  ordenes?: OrdenCompra[];
  onClose: () => void;
  onGuardar: (data: NuevaCompraData) => void | Promise<void>;
  /** Bloque 2: alta de productos desde "+ Crear producto" (callback de App:
   *  agrega el producto al catálogo del panel; sin él el atajo no se muestra). */
  onCrearProducto?: (p: Producto) => Promise<Producto>;
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
    // Las líneas antiguas sin modo conservan el valor predeterminado incluido.
    modoIva: item.modoIva ?? "incluido",
    baseSinIva: item.baseSinIva,
    montoIva: item.montoIva,
    // P14: se arrastran el catálogo y el precio de venta para que el detalle
    // pueda seguir mostrando "Producto · Venta" al reabrir la compra.
    tipoItem: item.tipoItem,
    precioVenta: item.precioVenta,
    // Presentaciones: factor de la línea (si la trae) para poder reenviarlo
    // al guardar desde el formulario.
    factorPresentacion: item.factorPresentacion,
    unidadBase: item.unidadBase,
  })));

  const [itemNombre, setItemNombre] = useState("");
  const [itemCantidad, setItemCantidad] = useState(1);
  // Reglas de negocio (Fase 4): la compra usa modo de IVA POR LÍNEA; no existe
  // selector global y el backend deriva el dato desde cada línea.
  // P11: la Medida ya no se elige a mano en la compra, así que el valor por
  // defecto es "und" y al guardar se toma SIEMPRE la unidad del insumo o del
  // producto seleccionado (ver `unidadElegida`).
  const [itemUnidad, setItemUnidad] = useState("und");
  // Ajuste de bebidas: unidades por paca/caja de la línea que se está
  // agregando (undefined = unidad suelta). Se carga del producto elegido y
  // se guarda en `ItemFactura.unidadesPorEmpaque`.
  const [itemEmpaque, setItemEmpaque] = useState<number | undefined>(undefined);
  const [itemPrecio, setItemPrecio] = useState(0);
  const [itemIva, setItemIva] = useState<number | undefined>(undefined);
  // Fase 4: modo de IVA de la fila que se está agregando. Vive en la pantalla
  // (no en el formulario) para poder resetearlo al elegir otro ítem y
  // cargarlo al editar una fila existente. Valor por defecto: "incluido".
  const [itemModoIva, setItemModoIva] = useState<ModoIva>("incluido");
  const [itemId, setItemId] = useState("");
  // P14: qué se está agregando, insumo del catálogo o producto del módulo.
  const [itemTipo, setItemTipo] = useState<TipoItem>("insumo");
  // Bloque 2: "+ Crear producto" del desplegable de ítems.
  const [showNuevoProducto, setShowNuevoProducto] = useState(false);
  // Precio de VENTA al público del producto elegido (sólo se captura cuando
  // el tipo es "producto"; con insumos queda en 0 y no se guarda).
  const [itemPrecioVenta, setItemPrecioVenta] = useState(0);
  // Ajuste (bloque 2): el % de ganancia se quitó de la pantalla; el precio de
  // venta se escribe a mano y se valida contra el costo por unidad con IVA.
  const [itemSugAbierto, setItemSugAbierto] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  /** Input de Nombre: recupera el foco tras agregar o actualizar una fila. */
  const nombreRef = useRef<HTMLInputElement>(null);
  /** Fecha de factura: `abrirPicker` la abre con clic/foco (Chrome ya no
      despliega el calendario sólo con enfocar el campo — punto 2.8b). */
  const fechaFacturaRef = useRef<HTMLInputElement>(null);
  /** Fila cargada en el formulario de la izquierda para editarla. */
  const [editando, setEditando] = useState<string | null>(null);

  // Factura única: normalización y validación de duplicados
  const normalizarFactura = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");
  const facturaActualNormalizada = normalizarFactura(numeroFactura);
  // Una compra ANULADA no bloquea su número: se puede registrar otra factura
  // con el mismo número (misma regla que en la Recepción de una OC).
  const facturaDuplicada = gestiones.some(
    (g) =>
      g.estado !== "Anulado" &&
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
  const [guardandoCompra, setGuardandoCompra] = useState(false);
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
  // La separación en dos tablas ya no existe: el detalle usa UNA sola tabla
  // y pinta "Solicitado" / "No solicitado" fila por fila con `idsOrden`.
  // Punto 1: totales con la fórmula única `calcularLineaIva`.
  // Orden siempre: Subtotal sin IVA → IVA → Total pagado, y por construcción
  // subtotalSinIva + totalIva === totalPagado.
  const lineasIva = items.map((item) =>
    calcularLineaIva({
      cantidad: item.cantidad,
      montoUnitario: item.precioUnitario,
      porcentajeIva: item.iva,
      modoIva: item.modoIva ?? "incluido",
    })
  );
  const subtotalSinIva = lineasIva.reduce((s, l) => s + l.baseSinIva, 0);
  const totalIva = lineasIva.reduce((s, l) => s + l.montoIva, 0);
  const totalPagado = lineasIva.reduce((s, l) => s + l.subtotalConIva, 0);
  const total = subtotalSinIva + totalIva;

  // P14: reparto por tipo de ítem, para el contador de la cabecera de la
  // tabla ("5 ítems · 3 insumos · 2 productos").
  const nProductos = items.filter((i) => (i.tipoItem ?? "insumo") === "producto").length;
  const nInsumos = items.length - nProductos;

  // ── Validación en tiempo real (patrón de MiPerfilScreen) ──────────────────
  const [tocado, setTocado] = useState({ numeroFactura: false, fechaFactura: false });
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  const errorNumeroFactura = numeroFactura.trim()
    ? facturaDuplicada
      ? "Ya existe una compra con este número de factura"
      : undefined
    : "Ingresa el número de factura.";
  const errorFechaFactura = fechaFactura ? undefined : "Selecciona la fecha de la factura.";
  // El proveedor es opcional en este formulario.
  const errorItems = items.length > 0 ? undefined : "Agrega al menos un ítem a la factura.";

  const algunoTocado = tocado.numeroFactura || tocado.fechaFactura;
  const marcarTocado = (campo: "numeroFactura" | "fechaFactura") =>
    setTocado((t) => ({ ...t, [campo]: true }));

  /** Labels: 13px en gris oscuro en pantalla completa; xs gris en el modal. */
  const labelCls = isPage ? labelPaginaCls : labelModalCls;

  /** Etiqueta del campo de monto: siempre "Monto unitario" (el modo de IVA de
   *  la línea se elige junto al campo, no cambia el nombre del dato). */
  const labelMonto = "Monto unitario";

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

  const itemSugs = useMemo<InsumoSuggestion[]>(() => {
    const q = itemNombre.trim().toLowerCase();

    // P14: el buscador mira un catálogo u otro según el tipo de ítem elegido.
    if (itemTipo === "producto") {
      // Bloque 2.5: se compran productos aunque estén "No disponible" (los
      // recién creados con "+ Crear producto" nacen así); sólo se excluyen
      // los DESCONTINUADOS, que ya no vuelven a comprarse. Punto 3.2: además
      // sólo "Producto terminado" (bebidas y reventa); los "Producto insumo"
      // (Pizzas, Lasañas) se producen, no se compran.
      const base = (productos ?? []).filter(
        (p) => p.estado !== "Descontinuado" && p.tipo === "Producto terminado",
      );
      // El buscador mira también el contenido ("coca 1.5") para distinguir
      // presentaciones del mismo producto.
      const filtrados = q
        ? base.filter((p) => nombreBuscable(p).toLowerCase().includes(q))
        : base;
      // Punto B1 + ajuste de bebidas: el monto de la línea es SIEMPRE el
      // costo (`costoUnitario`, que en el catálogo es POR UNIDAD) por las
      // unidades de la presentación: con "Paca x12" se precarga el precio
      // de la paca. Si viene en 0 (pendiente de calcular) el usuario lo
      // escribe a mano. Antes se caía al precio de venta y el producto
      // quedaba "gratis" en la factura.
      return filtrados.slice(0, 3).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        contenido: contenidoDe(p) || undefined,
        unidadMedida: presentacionCompra(p),
        costoUnitario: Number(p.costoUnitario || 0) * empaqueDe(p),
      }));
    }

    // Filtrar solo por tipo "Insumo" y estado "activo"
    const soloInsumos = insumos.filter(i => (i.tipo ?? "Insumo") === "Insumo" && i.estado === "activo");
    // Si el campo está vacío, mostrar los primeros 3 insumos disponibles
    if (!q) return soloInsumos.slice(0, 3);
    return soloInsumos.filter((i) => i.nombre.toLowerCase().includes(q)).slice(0, 3);
  }, [insumos, productos, itemNombre, itemTipo]);

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

  // Requiere al menos un ítem y que el total sea mayor que cero. El IVA se
  // valida por línea (modo + %), así que ya no hay un requisito global.
  const errorTotal = total > 0 ? undefined : "El total de la factura debe ser mayor que cero.";
  const camposOk =
    !errorNumeroFactura && !errorFechaFactura && !errorItems && !errorTotal;
  // Guardar queda habilitado sin selector global: la validación de línea ya
  // se hace sobre cada item y el backend deriva el valor global si hace falta.
  const botonGuardarOk =
    camposOk && !facturaDuplicada &&
    editando === null;

  const seleccionarProveedor = (p: ProveedorRef) => {
    setProvQuery(p.nombre);
    setProvId(p.id);
    setProvSugAbierto(false);
  };

  const crearProveedor = (p: ProveedorRef) => {
    // Actualizar el estado global de proveedores en App.tsx para que el
    // listado de Proveedores lo vea inmediatamente.
    setProveedores((prev) => [p, ...prev.filter((x) => x.id !== p.id && x.nombre.toLowerCase() !== p.nombre.toLowerCase())]);
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
    // P11: la unidad es la del insumo (no hay select de Medida en la compra);
    // si viniera vacía se guarda "und" para no dejar la fila en blanco.
    setItemUnidad(ins.unidadMedida?.trim() || "und");
    setItemPrecio(Number(ins.costoUnitario ?? ins.precioUnitario ?? 0));
    setItemIva(ins.iva == null ? undefined : Number(ins.iva));
    // Fase 4: al elegir otro ítem el modo de IVA vuelve a su valor por
    // defecto ("IVA incluido"); cada línea conserva el suyo ya agregada.
    setItemModoIva("incluido");
    setItemSugAbierto(false);
  };

  /** P14: catálogo de productos. Igual que con el insumo, se copian nombre,
   *  unidad de venta y monto; el producto no tiene IVA propio, así que sin
   *  historial de compra la línea queda en 0 % y el usuario puede ajustarlo
   *  en el formulario (con historial se trae ese %). */
  const seleccionarProducto = (p: Producto) => {
    setItemId(p.id);
    setItemNombre(p.nombre);
    // Punto 6: la Medida guarda el TOKEN que el backend acepta en `medida`
    // ("caja", "paca" o "und"); "Paca x12" no está en UNIDADES_COMPRA y el
    // guardado respondía 400. La etiqueta visible ("Caja x6") se arma en la
    // tabla con etiquetaPresentacion(unidad, factor, unidadBase).
    setItemUnidad(medidaCompra(p));
    const factor = empaqueDe(p);
    setItemEmpaque(factor > 1 ? factor : undefined);
    // Punto B1: el monto es SIEMPRE `costoUnitario` (que en el catálogo es
    // POR UNIDAD); nunca el precio de venta. Con paca/caja la línea se
    // cotiza por presentación: costoUnitario × unidades de la paca.
    const costoUnit = Number(p.costoUnitario || 0);
    const pv = Number(p.precioUnitario || 0);
    // Ajuste: con historial de compra se precarga el último monto con el IVA
    // sumado (la fila siempre arranca en "Con IVA", el modo por defecto; el
    // formulario lo confirma al elegir el ítem). Sin historial (productos
    // viejos) manda el costo del catálogo por presentación, como siempre.
    // Punto C2: si existe `montoDigitado` (último monto TAL CUAL lo digitó el
    // usuario, ej. 4000) manda ÉL, sin convertirlo por IVA en NINGÚN modo.
    const hist = historialCompraDe(p);
    const monto = hist
      ? hist.montoDigitado != null
        ? hist.montoDigitado
        : Math.round(hist.montoSinIva * (1 + hist.iva / 100) * 100) / 100
      : costoUnit * factor;
    setItemPrecio(monto);
    setItemIva(hist?.iva);
    // Fase 4: el modo de IVA vuelve a su valor por defecto al elegir otro ítem.
    setItemModoIva("incluido");
    // Precio de VENTA al público: es `precioUnitario` del catálogo de
    // productos (el costo es `costoUnitario` POR UNIDAD, y el precio de
    // venta también se define por unidad suelta). Se guarda aparte del
    // monto unitario de la factura para poder mostrarlo en el detalle.
    setItemPrecioVenta(pv);
    setItemSugAbierto(false);
  };

  /** Punto 3: costo de referencia = costo unitario CON IVA. Con IVA
   *  incluido (o exento) el monto ya es el costo; en "más IVA" se le suma el
   *  % de la línea. Es contra ese costo que se valida que el precio de venta
   *  lo superpase. */
  const costoConIva = (monto: number, iva: number, modo: ModoIva = "incluido") =>
    modo === "mas_iva" ? monto * (1 + iva / 100) : monto;

  /** Costo con IVA del ítem del formulario (lo ve el usuario bajo el campo):
   *  POR UNIDAD — si la línea es de paca/caja el monto (por presentación) se
   *  divide en `itemFactor`; unidad suelta ⇒ factor 1, sin cambios. */
  const itemFactor = unidadesPorLinea({ unidadesPorEmpaque: itemEmpaque });

  /** Costo con IVA POR UNIDAD de una línea YA agregada (punto 3 + ajuste +
   *  backstop de guardar): con paca/caja el monto es por presentación, y el
   *  modo de IVA de la propia línea decide si hay que sumarle el %. */
  const costoConIvaDeLinea = (i: ItemFactura) =>
    (resolverModoIva(i, null) === "mas_iva" ? i.precioUnitario * (1 + i.iva / 100) : i.precioUnitario) /
    unidadesPorLinea(i);

  /** Unidad que se guarda en la fila. Punto 6: en PRODUCTOS manda lo que
   *  quedó en el campo Presentación (el token "caja"/"paca"/"und"; al elegir
   *  el producto se precarga con `medidaCompra`), y sólo sin nada se cae al
   *  token del catálogo o a "und". En INSUMOS manda lo elegido en
   *  Presentación (unidad base, compatible o presentación configurada). */
  const unidadElegida = () => {
    if (itemTipo === "producto") {
      const p = productos?.find((x) => x.id === itemId);
      const delCatalogo = p ? medidaCompra(p) : undefined;
      return itemUnidad.trim() || delCatalogo || "und";
    }
    return itemUnidad.trim() || "und";
  };

  /** Fila que se está editando con el lápiz de la tabla: su Contenido y su
   *  Presentación se recargan en el formulario (punto 6) sin pisarlos con el
   *  factor configurado del catálogo. */
  const filaEditando = editando
    ? items.find((item) => item.rowId === editando)
    : undefined;

  /** Bebidas: tamaño de una unidad del producto ("400 ml") o undefined. */
  const tamanoDeProducto = (id: string) => {
    const p = productos?.find((x) => x.id === id);
    return (p && contenidoDe(p)) || undefined;
  };
  const tamanoDeFila = (row: Pick<ItemFactura, "tipoItem" | "idInsumo">) =>
    row.tipoItem === "producto" ? tamanoDeProducto(row.idInsumo) : undefined;

  const agregarItem = ({
    cantidad,
    precio,
    iva,
    precioVenta,
    modoIva,
    factorPresentacion,
    unidadBase,
  }: CompactInsumoFormValues) => {
    // El formulario ya no exige un selector global; cada línea lleva su `modoIva`.
    if (!itemNombre.trim()) {
      toast.error("Ingresa el nombre del ítem.");
      return;
    }
    if (cantidad <= 0) {
      toast.error("La cantidad debe ser mayor que cero.");
      return;
    }
    if (precio <= 0) {
      toast.error("El monto unitario debe ser mayor que cero.");
      return;
    }
    // Fase 4: el IVA se valida POR LÍNEA (0–100); con Exento el formulario ya
    // lo dejó en 0.
    if (!Number.isFinite(iva) || iva < 0 || iva > 100) {
      toast.error("El IVA debe estar entre 0 y 100.");
      return;
    }
    const unidad = unidadElegida();
    /** Punto 6: Contenido de ESTA línea (si se compró en un empaque). Es lo
     *  que viaja como `factor_presentacion` y lo que manda en los cálculos
     *  por unidad, por encima del empaque del catálogo. */
    const factorLinea =
      factorPresentacion != null && factorPresentacion > 0 ? factorPresentacion : null;
    /** Empaque del catálogo sólo si la línea sigue en una presentación: un
     *  producto en "paca ×12" comprado en "und" suelta entra de a 1. */
    const empaqueCatalogo =
      esEmpaque(unidad) && itemEmpaque && itemEmpaque > 1 ? itemEmpaque : undefined;
    // Punto B2 + punto 3: en PRODUCTOS el precio de venta es obligatorio y
    // tiene que quedar por encima del costo por unidad CON IVA (dividido por
    // el factor de ESTA línea): sin esto la línea no se agrega y la bebida
    // seguiría sin precio de venta en el catálogo.
    if (itemTipo === "producto") {
      if (!precioVenta || precioVenta <= 0) {
        toast.error("El precio de venta del producto debe ser mayor que cero.");
        return;
      }
      if (
        precioVenta <=
        costoConIva(precio, iva, modoIva ?? "incluido") / (factorLinea ?? empaqueCatalogo ?? 1)
      ) {
        toast.error("El precio de venta debe ser mayor que el costo por unidad con IVA.");
        return;
      }
    }
    // Punto 9 (sólo Nueva Compra): ya NO se bloquea por nombre. Sólo se
    // bloquea la LÍNEA IDÉNTICA — mismo ítem, Presentación, Contenido,
    // monto, modo/IVA y precio de venta; la CANTIDAD no compara, porque lo
    // correcto para sumar más unidades es editar la cantidad en la tabla.
    // Así se pueden apilar líneas del mismo ítem con distinto precio o
    // Contenido (p. ej. una caja de 6 lt y otra de 18 lt).
    const lineaRepetida = items.some(
      (item) =>
        item.rowId !== editando &&
        (item.tipoItem ?? "insumo") === itemTipo &&
        (itemId
          ? item.idInsumo === itemId
          : item.nombre.toLowerCase() === itemNombre.trim().toLowerCase()) &&
        item.unidad === unidad &&
        (item.factorPresentacion ?? null) === factorLinea &&
        item.precioUnitario === precio &&
        (item.modoIva ?? "incluido") === (modoIva ?? "incluido") &&
        item.iva === iva &&
        (item.precioVenta ?? null) === (precioVenta ?? null)
    );
    if (lineaRepetida) {
      toast.error("Ya agregaste esta misma línea. Edita su cantidad en la tabla.");
      return;
    }

    const lineaActualizada: ItemFactura = {
      // Punto 9: id único por fila (Date.now() colisionaba entre líneas
      // agregadas muy seguidas).
      rowId: editando ?? crypto.randomUUID(),
      idInsumo: itemId || `INS-FAC-${Date.now()}`,
      nombre: itemNombre.trim(),
      unidad,
      cantidad,
      costoUnitario: precio,
      precioUnitario: precio,
      iva,
      modoIva: modoIva ?? itemModoIva,
      tipoItem: itemTipo,
      precioVenta: itemTipo === "producto" ? precioVenta : undefined,
      // Punto 6: para productos el empaque de la LÍNEA manda sobre el del
      // catálogo (el Contenido pudo ajustarse en el formulario); para
      // insumos se conserva sin cambios (su costo por unidad usa el modo de
      // siempre y la etiqueta sale de factorPresentacion + unidadBase).
      unidadesPorEmpaque:
        itemTipo === "producto"
          ? factorLinea ?? empaqueCatalogo
          : undefined,
      // Presentaciones: el Contenido de la línea viaja al backend como
      // `factor_presentacion` (insumos y productos).
      factorPresentacion: factorLinea ?? undefined,
      // Unidad base de la línea ("lt", "und"…): la tabla arma con ella la
      // etiqueta "caja × 6 lt" y distingue líneas del mismo ítem.
      unidadBase,
    };

    setItems((prev) =>
      editando
        ? prev.map((item) =>
            item.rowId === editando
              ? { ...item, ...lineaActualizada, rowId: item.rowId }
              : item
          )
        : [...prev, lineaActualizada]
    );

    limpiarFilaInsumo();
  };

  /** Deja la fila "Agregar insumo" lista para el siguiente insumo: campos en
   *  cero y foco de vuelta en el buscador de Nombre.
   *  P11 + ajuste: la Medida vuelve a "und" para insumos y queda VACÍA para
   *  productos (la define el catálogo al elegir uno: "Paca x12"); el
   *  empaque se limpia siempre. El TIPO se conserva para poder agregar
   *  varios productos seguidos sin volver a elegirlo, salvo que el que
   *  llama pase el tipo nuevo (cambio de Insumo/Producto: se le pasa
   *  EXPLÍCITO porque por closure llegaría el valor viejo del estado). */
  const limpiarFilaInsumo = (tipo: TipoItem = itemTipo, cancelarEdicion = true) => {
    setItemNombre("");
    setItemCantidad(1);
    setItemUnidad("und");
    setItemEmpaque(undefined);
    setItemPrecio(0);
    setItemIva(undefined);
    // Fase 4: la fila nueva vuelve al modo de IVA por defecto.
    setItemModoIva("incluido");
    setItemId("");
    setItemPrecioVenta(0);
    setItemSugAbierto(false);
    if (cancelarEdicion) setEditando(null);
    nombreRef.current?.focus();
  };

  /** Lápiz de la tabla: carga la fila completa en el formulario izquierdo. */
  const editarItem = (row: ItemFactura) => {
    setItemTipo(row.tipoItem ?? "insumo");
    setItemNombre(row.nombre);
    setItemCantidad(row.cantidad);
    setItemUnidad(row.unidad);
    setItemEmpaque(
      row.unidadesPorEmpaque && row.unidadesPorEmpaque > 1
        ? row.unidadesPorEmpaque
        : undefined
    );
    setItemPrecio(row.precioUnitario);
    setItemIva(row.iva);
    // Fase 4: el lápiz carga el modo de IVA real de la línea.
    setItemModoIva(row.modoIva ?? "incluido");
    setItemId(row.idInsumo);
    setItemPrecioVenta(row.precioVenta ?? 0);
    setItemSugAbierto(false);
    setEditando(row.rowId);
    nombreRef.current?.focus();
  };

  const eliminarItem = (rowId: string) => {
    if (editando === rowId) limpiarFilaInsumo();
    setItems((prev) => prev.filter((item) => item.rowId !== rowId));
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
      toast.error("Agrega al menos un ítem a la factura.");
      return;
    }
    if (total <= 0) {
      toast.error("El total recibido debe ser mayor que cero.");
      return;
    }
    // Punto B2 + punto 3 + ajuste: backstop de precios de venta. Ninguna
    // línea de producto se guarda sin precio de venta válido (> 0 y > costo
    // POR UNIDAD con IVA), aunque haya llegado de una compra vieja o de una
    // Orden de Compra.
    const lineaPrecioMala = items.find((i) => {
      if ((i.tipoItem ?? "insumo") !== "producto") return false;
      const pv = i.precioVenta ?? 0;
      return pv <= 0 || pv <= costoConIvaDeLinea(i);
    });
    if (lineaPrecioMala) {
      toast.error(
        (lineaPrecioMala.precioVenta ?? 0) <= 0
          ? `«${lineaPrecioMala.nombre}»: falta el precio de venta del producto.`
          : `«${lineaPrecioMala.nombre}»: el precio de venta debe ser mayor que el costo por unidad con IVA.`
      );
      return;
    }

    setShowGuardarConf(true);
  };

  const confirmarGuardar = async () => {
    if (guardandoCompra) return;
    setGuardandoCompra(true);
    try {
      await onGuardar({
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
        modoIva: item.modoIva ?? "incluido",
        baseSinIva: lineasIva[i].baseSinIva,
        montoIva: lineasIva[i].montoIva,
      })),
      subtotalSinIva,
      totalIva,
      totalPagado,
      });
      setShowGuardarConf(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la compra.");
    } finally {
      setGuardandoCompra(false);
    }
  };

  /** Subtítulo de la cabecera (solo cuando aporta algo). */
  const subtitulo = isView
    ? compra
      ? `Compra N° ${compra.id}`
      : ""
    : isPage
      ? "Registra una factura de proveedor"
      : "";

  return (
    <>
      <div
        className={
          isPage
            ? "w-full px-4 sm:px-6 py-4 h-full flex flex-col overflow-hidden"
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
                    className="pn-boton pn-boton--normal shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Volver
                  </button>
                )}
                <div className="min-w-0">
                  <h3
                    className={`${isPage ? "text-3xl" : "text-2xl"} font-bold text-foreground`}
                    style={{ fontFamily: SERIF }}
                  >
                    {isView ? "Detalle de Compra" : "Anotar una factura"}
                  </h3>
                  {subtitulo && (
                    <p className="text-base text-muted-foreground mt-0.5 truncate">{subtitulo}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isView && compra && <EstadoBadge e={compra.estado} />}
                {!isPage && (
                  <button
                    onClick={salir}
                    className="p-1.5 max-md:p-3.5 max-md:-m-2 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
                  >
                    <X className="w-4 h-4" aria-hidden="true" /> Cerrar
                  </button>
                )}
              </div>
            </div>

            <div
              className={
                isPage
                  ? "flex-1 min-h-0 px-5 py-3 flex flex-col lg:flex-row overflow-y-auto overflow-x-clip"
                  : isView
                    // Detalle: el modal se AJUSTA al contenido (sin
                    // `flex-1 min-h-0`, que lo estiraba hasta el tope y
                    // dejaba el hueco muerto). El `max-h` —más el alto de la
                    // cabecera— garantiza que quepa en pantalla y que el
                    // cuerpo scrollee cuando hay muchos ítems.
                    ? "px-5 py-5 flex flex-col gap-4 overflow-y-auto max-h-[calc(100dvh-9rem)]"
                    : "flex-1 min-h-0 px-5 py-5 flex flex-col gap-5 overflow-y-auto"
              }
            >
              {/* Columna IZQUIERDA — formulario (50 %). En el modal es solo un
                  grupo vertical: mantiene el mismo flujo de antes. Punto 2.8a:
                  en página NO scrollea por dentro cuando el formulario entero
                  cabe (así no queda un hueco muerto); si algo no cabe — móvil,
                  donde la columna apila y se suma la tabla — el
                  `overflow-y-auto` del contenedor deja alcanzables "Agregar" y
                  el pie Cancelar/Guardar. */}
               <div
                className={
                  isPage
                    ? "w-full lg:w-[50%] shrink-0 lg:pr-6 min-h-0 flex flex-col gap-6 lg:h-full"
                    : "flex flex-col gap-5"
                }
              >
              {/* Franja de anulación: motivo + fecha (trazabilidad de la
                  anulación), en vez del aviso genérico de antes. */}
              {isView && compra?.estado === "Anulado" && (
                <div className="shrink-0 flex items-start gap-2.5 px-4 py-3 max-md:min-h-11 bg-red-50 border border-red-200 rounded-xl text-base text-red-800">
                  <Ban className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-semibold">Esta compra ha sido anulada.</p>
                    {compra?.motivoAnulacion && (
                      <p className="mt-1 break-words">
                        <span className="font-semibold">Motivo:</span> {compra.motivoAnulacion}
                      </p>
                    )}
                    {compra?.fechaAnulacion && (
                      <p className="text-base text-red-700/80 mt-0.5">
                        Anulada el {compra.fechaAnulacion}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Sección 1 — "Datos de la factura" (el título solo existe en
                  pantalla completa; en el modal el `<section>` solo agrupa
                  para mantener el mismo espaciado de antes). */}
              <section
                className={`flex flex-col ${isPage ? "gap-2 shrink-0" : "gap-5"}`}
              >
                {!isView && <h2 className="text-xl font-bold">1 · ¿De qué es la factura?</h2>}

                {/* Detalle (vista): rejilla compacta de resumen — 4 columnas
                    en escritorio, 2 en móvil. Creación en pantalla completa:
                    Fila 1: Número de factura * | Proveedor (opcional)
                    Fila 2: Fecha de factura * | Estado (badge Recibido)
                    En el modal se conserva la rejilla original. */}
                {isView ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-4 shrink-0">
                    <div className="min-w-0">
                      <p className={labelDatoCls}>N° de factura</p>
                      <p className={valorDatoCls}>{numeroFactura || "—"}</p>
                    </div>

                    <div className="min-w-0">
                      <p className={labelDatoCls}>Fecha de factura</p>
                      <p className={valorDatoCls}>{fechaFactura || "—"}</p>
                    </div>

                    <div className="min-w-0">
                      <p className={labelDatoCls}>Proveedor</p>
                      {provQuery ? (
                        <>
                          <p className={valorDatoCls} title={provQuery}>{provQuery}</p>
                          {compra?.proveedorNit && (
                            <p className="text-base text-muted-foreground font-mono mt-0.5 break-words">
                              NIT {compra.proveedorNit}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className={`${valorDatoCls} text-muted-foreground`}>—</p>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className={labelDatoCls}>Orden de compra</p>
                      <p className={valorDatoCls}>
                        {compra?.ordenId ? `OC N° ${compra.ordenId}` : "Compra directa"}
                      </p>
                    </div>

                    {/* El IVA es POR LÍNEA (Fase 4): ya no existe el resumen
                        global "Montos con IVA incluido / sin IVA"; el detalle
                        de cada ítem muestra su chip de IVA en la tabla. */}
                  </div>
                ) : (
                <div
                  className={`grid gap-4 shrink-0 ${
                    isPage
                      ? "grid-cols-1 sm:grid-cols-2"
                      : "grid-cols-1 md:grid-cols-3"
                  }`}
                >
                  <div className="relative">
                    <label className={labelCls}>
                      Número de factura {!isView && <span className="text-red-500">*</span>}
                    </label>
                    {isView ? (
                      <p className="text-base font-semibold text-foreground py-2">{numeroFactura || "—"}</p>
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
                      <p className={isPage ? "absolute left-0 top-full text-base text-red-500" : "text-base text-red-500 mt-1 ml-0.5"}>{errorNumeroFactura}</p>
                    )}
                  </div>

                  <div className="relative">
                    <label className={labelCls}>
                      Proveedor <span className="text-muted-foreground/70 font-normal">(opcional)</span>
                    </label>
                    {isView ? (
                      <p className="text-base font-semibold text-foreground py-2">{provQuery || "—"}</p>
                    ) : (
                      <div className="relative" ref={provRef}>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <input
                          value={provQuery}
                          onChange={(e) => {
                            setProvQuery(e.target.value);
                            // Toda edición manual suelta el proveedor elegido:
                            // si el texto ya no es el de una opción seleccionada
                            // (o se borró), se guarda SIN proveedor. Si el
                            // usuario vuelve a elegir una sugerencia,
                            // `seleccionarProveedor` re-fija `provId`.
                            setProvId("");
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
                              className="w-full text-left px-3 py-2.5 text-base font-semibold text-primary hover:bg-primary/10 cursor-pointer inline-flex items-center gap-2 border-b border-border"
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
                                className="w-full text-left px-3 py-2.5 text-base hover:bg-muted cursor-pointer border-b border-border last:border-0"
                              >
                                <p className="font-semibold text-foreground">{p.nombre}</p>
                                <p className="text-muted-foreground">
                                  NIT {p.nit}
                                  {p.asesorComercial && <> · Asesor: {p.asesorComercial}</>}
                                </p>
                              </button>
                            ))}
                            {provSugs.length === 0 && (
                              <div className="px-3 py-2.5 text-base text-muted-foreground text-center border-b border-border">
                                Sin resultados
                              </div>
                            )}
                            {provSugs.length > 3 && (
                              <div className="px-3 py-2 text-base text-muted-foreground text-center">
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
                        <CalendarDropdown
                          value={fechaFactura}
                          onChange={(v) => setFechaFactura(v)}
                          max={today}
                          error={!!((tocado.fechaFactura || intentoGuardar) && errorFechaFactura)}
                          onBlur={() => marcarTocado("fechaFactura")}
                        />
                        {(tocado.fechaFactura || intentoGuardar) && errorFechaFactura && (
                          <p className="absolute left-0 top-full text-base text-red-500">{errorFechaFactura}</p>
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
                        <CalendarDropdown
                          value={fechaFactura}
                          onChange={(v) => setFechaFactura(v)}
                          max={today}
                          error={!!((tocado.fechaFactura || intentoGuardar) && errorFechaFactura)}
                          onBlur={() => marcarTocado("fechaFactura")}
                        />
                        {(tocado.fechaFactura || intentoGuardar) && errorFechaFactura && (
                          <p className="text-base text-red-500 mt-1 ml-0.5">{errorFechaFactura}</p>
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

                  {/* El selector global quedó removido; el IVA de la compra se
                      deriva por línea y se sigue usando la lógica de `modoIva`. */}
                </div>
                )}
              </section>

              {/* Sección 2 — "Agregar ítem": fila con buscador, stepper y
                  botón en una sola línea. En pantalla completa es el ÚLTIMO
                  bloque de la columna izquierda (la tabla vive en la derecha). */}
              {!isView && (
                <section className={`flex flex-col ${isPage ? "gap-3 shrink-0" : "gap-5"}`}>
                  <CompactInsumoForm
                    containerRef={itemRef}
                    titulo="2 · ¿Qué llegó?"
                    headerExtra={
                      isPage ? (
                      <div className="flex items-center gap-2">
                        <label className="block text-base font-semibold text-muted-foreground">
                          Tipo
                        </label>
                        <SegmentadoButtons
                          valor={itemTipo}
                          onChange={(valor) => {
                            const nuevo = valor as TipoItem;
                            if (nuevo === itemTipo) return;
                            setItemTipo(nuevo);
                            // Al cambiar de catálogo el ítem cargado ya no
                            // sirve: se limpia la fila (la Medida según el
                            // tipo NUEVO) y el buscador empieza a mirar la
                            // otra lista.
                            limpiarFilaInsumo(nuevo, editando === null);
                          }}
                          opciones={[
                            { valor: "insumo", etiqueta: "Insumo" },
                            { valor: "producto", etiqueta: "Producto" },
                          ]}
                        />
                      </div>
                      ) : undefined
                    }
                    nombre={itemNombre}
                    onNombreChange={(value) => {
                      setItemNombre(value);
                      setItemId("");
                      // Escribir a mano suelta la presentación elegida: la
                      // Medida queda vacía (producto) o "und" (insumo) y el
                      // empaque de la paca/caja se limpia.
                      setItemUnidad("und");
                      setItemEmpaque(undefined);
                      setItemSugAbierto(true);
                    }}
                    onNombreFocus={() => setItemSugAbierto(true)}
                    // Punto 7: el desplegable se cierra al salir del BUSCADOR
                    // (otro campo del formulario, Tab, Esc o clic afuera).
                    onCerrarSugerencias={() => setItemSugAbierto(false)}
                    cantidad={itemCantidad}
                    unidad={itemUnidad}
                    onUnidadChange={setItemUnidad}
                    precio={itemPrecio}
                    iva={itemIva}
                    // Fase 4: modo de IVA POR LÍNEA controlado por la pantalla
                    // (se resetea al elegir otro ítem y se carga al editar).
                    modoIva={itemModoIva}
                    onModoIvaChange={setItemModoIva}
                    // Presentaciones: el insumo seleccionado define sus
                    // presentaciones configuradas y la unidad base ("¿cuántas
                    // kg trae cada paca?"). Para productos no aplica.
                    insumoId={itemTipo === "insumo" && esIdInsumo(itemId) ? itemId : undefined}
                    unidadBase={
                      itemTipo === "insumo"
                        ? insumos.find((i) => i.id === itemId)?.unidadMedida?.trim() || undefined
                        : // Punto 6: en PRODUCTOS la unidad base es su unidad
                          // de venta ("und"): contra ella se lee y calcula el
                          // Contenido de la caja/paca de ESTA línea.
                          productos?.find((x) => x.id === itemId)?.unidadVenta?.trim() ||
                          undefined
                    }
                    // Punto 6: al editar, el Contenido/Presentación de la
                    // FILA recargados mandan sobre el factor del catálogo; al
                    // agregar un producto nuevo se precarga su empaque.
                    factorPresentacionInicial={
                      editando
                        ? filaEditando?.factorPresentacion ??
                          filaEditando?.unidadesPorEmpaque
                        : itemTipo === "producto"
                          ? itemEmpaque
                          : undefined
                    }
                    presentacionInicial={
                      editando
                        ? filaEditando?.unidad
                        : itemTipo === "producto"
                          ? // La presentación del CATÁLOGO (no la elegida): su
                            // empaque sólo se sugiere para esa presentación.
                            (() => {
                              const p = productos?.find((x) => x.id === itemId);
                              return p ? medidaCompra(p) : undefined;
                            })()
                          : undefined
                    }
                    // Punto 6: el Contenido no pisa la presentación guardada
                    // del insumo (sólo la crea si no existía).
                    contenidoPorLinea
                    // Peso de medida del insumo elegido (si lo tiene): se
                    // muestra como ayuda bajo la línea del formulario.
                    pesoMedida={
                      itemTipo === "insumo"
                        ? insumos.find((i) => i.id === itemId)?.pesoMedida ?? null
                        : null
                    }
                    // Bebidas: tamaño de una unidad ("400 ml") en Medida y en
                    // la ayuda (el stock sigue contando unidades).
                    tamanoUnidad={
                      itemTipo === "producto"
                        ? tamanoDeProducto(itemId)
                        : undefined
                    }
                    etiquetaUnidad="Presentación"
                    // Punto 3: costo de referencia CON IVA que se muestra
                    // debajo del monto (según el modo de IVA de la fila).
                    factorCostoUnidad={itemFactor}
                    // Precio de venta al público: sólo para líneas de producto.
                    mostrarPrecioVenta={itemTipo === "producto"}
                    precioVenta={itemPrecioVenta}
                    onAgregar={agregarItem}
                    suggestions={itemSugs}
                    showSuggestions={itemSugAbierto}
                    onSelectSuggestion={(suggestion) => {
                      if (itemTipo === "producto") {
                        const p = (productos ?? []).find((x) => x.id === suggestion.id);
                        // Guarda por si el catálogo cambió mientras estaba
                        // abierto el desplegable.
                        if (p) seleccionarProducto(p);
                        return;
                      }
                      seleccionarInsumo(suggestion as Insumo);
                    }}
                    onCrearInsumo={() => {
                      // Al abrir el modal se cierra el desplegable de
                      // sugerencias: si queda abierto quedaría por encima del
                      // formulario de "Nuevo Insumo" e interceptaría los clics.
                      setItemSugAbierto(false);
                      setShowNuevoInsumo(true);
                    }}
                    // Bloque 2: el atajo "+ Crear producto" del desplegable
                    // (al final y sólo sin coincidencias) abre el modal.
                    onCrearProducto={() => {
                      setItemSugAbierto(false);
                      setShowNuevoProducto(true);
                    }}
                    compacto={isPage}
                    // Punto B3: el formulario SIEMPRE es "Agregar"; la edición
                    // de una fila existente ocurre en línea, en la tabla.
                    buttonLabel={editando ? "Guardar cambios" : "+ Agregar otra línea"}
                    onCancelar={editando ? () => limpiarFilaInsumo() : undefined}
                    variante="compacta"
                    // Fase 4: Presentación SIEMPRE visible. Para PRODUCTOS es
                    // texto de solo lectura (la define el catálogo: "Paca
                    // x12"); para INSUMOS es el select de presentaciones
                    // (unidades compatibles + configuradas + "Otra…").
                    ocultarMedida={false}
                    // Punto 6: la Presentación de PRODUCTOS ya no es texto
                    // fijo ("Paca x12"): es el mismo select con el token
                    // válido y su Contenido editable en la línea.
                    // Punto 5: en la Nueva Compra la Medida del Contenido la
                    // define el ítem del catálogo (Recepción la deja editable).
                    medidaContenidoBloqueada
                    // IVA obligatorio (> 0) con "IVA incluido" o "IVA adicional".
                    ivaObligatorio
                    etiquetaNombre={itemTipo === "producto" ? "Producto" : "Insumo"}
                    // P14: el atajo "+ Crear insumo" sólo aplica a insumos.
                    ocultarCrearInsumo={itemTipo === "producto"}
                    // Bloque 2: el atajo "+ Crear producto" sólo aplica a
                    // productos (el insumo se crea con "+ Crear insumo").
                    ocultarCrearProducto={itemTipo !== "producto"}
                    placeholder={
                      itemTipo === "producto" ? "Buscar producto..." : "Buscar insumo..."
                    }
                    // Punto 2.6: el selector de tipo vive en el hueco de
                    // Medida SOLO en el modal; en página ya subió a la fila de
                    // título de arriba, así que no se pasa `campoExtra`.
                    campoExtra={
                      isPage ? undefined : (
                      <div className="min-w-[118px]">
                        <label className="block text-base font-semibold text-muted-foreground mb-1">
                          Tipo
                        </label>
                        <SegmentadoButtons
                          valor={itemTipo}
                          onChange={(valor) => {
                            const nuevo = valor as TipoItem;
                            if (nuevo === itemTipo) return;
                            setItemTipo(nuevo);
                            // Al cambiar de catálogo el ítem cargado ya no
                            // sirve: se limpia la fila (la Medida según el
                            // tipo NUEVO) y el buscador empieza a mirar la
                            // otra lista.
                            limpiarFilaInsumo(nuevo, editando === null);
                          }}
                          opciones={[
                            { valor: "insumo", etiqueta: "Insumo" },
                            { valor: "producto", etiqueta: "Producto" },
                          ]}
                        />
                      </div>
                      )
                    }
                  />
                  {/* Aviso de insumos/total: en pantalla completa va justo
                      debajo de la fila (solo empuja la tabla al aparecer); en
                      el modal, con el mismo margen de 20px de antes. */}
                  {(errorItems || errorTotal) && (algunoTocado || intentoGuardar) && (
                    <p className={`text-base text-red-500 ${isPage ? "mt-1 ml-0.5" : "mt-5 ml-0.5"}`}>
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
                    ? "w-full lg:w-[50%] min-w-0 min-h-0 flex flex-col gap-3 lg:border-l lg:border-border lg:pl-6 lg:h-full"
                    : "flex flex-col gap-5"
                }
              >
                {/* Cabecera de la tabla: contador y, debajo, un recordatorio
                    de la opción de precios elegida. */}
                {isPage && !isView && (
                  <div className="shrink-0">
                    <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-border">
                      <p className="text-base leading-none font-bold uppercase tracking-widest text-muted-foreground">
                        Ítems de la factura
                      </p>
                      {/* P14: el contador desglosa por tipo para que se vea
                          de insumos y de cuántos productos se trata. */}
                      <span className="text-base font-medium text-muted-foreground">
                        {items.length} {items.length === 1 ? "ítem" : "ítems"}
                        {nProductos > 0 &&
                          ` · ${nInsumos} ${nInsumos === 1 ? "insumo" : "insumos"} · ${nProductos} ${
                            nProductos === 1 ? "producto" : "productos"
                          }`}
                      </span>
                    </div>
                  </div>
                )}

              {isView ? (
                <div className="flex flex-col gap-3 shrink-0">
                  {/* Título fijo: una sola tabla para insumos y productos
                      (antes había "solicitados" / "no solicitados" / "recibidos"
                      por separado). */}
                  <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-border">
                    <p className="text-base leading-none font-bold uppercase tracking-widest text-muted-foreground">
                      Ítems de la factura
                    </p>
                    <span className="text-base font-medium text-muted-foreground">
                      {items.length} {items.length === 1 ? "ítem" : "ítems"}
                      {nProductos > 0 &&
                        ` · ${nInsumos} ${nInsumos === 1 ? "insumo" : "insumos"} · ${nProductos} ${
                          nProductos === 1 ? "producto" : "productos"
                        }`}
                    </span>
                  </div>

                  {/* Con más de ~6 filas la tabla scrollea por dentro; el
                      modal se queda con su alto natural. Sin scroll
                      horizontal: por debajo de `md` se ocultan Tipo, Medida,
                      IVA % y Monto IVA (el Tipo baja junto al nombre). */}
                  <div
                    className={
                      "rounded-xl border border-border bg-muted/30 overflow-hidden " +
                      (items.length > 6 ? "max-h-[340px] overflow-y-auto" : "")
                    }
                  >
                    <table className="table-fixed w-full text-base">
                      <thead className="text-base uppercase tracking-wider bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="px-2 py-2.5 text-left font-semibold">Nombre</th>
                          <th className="hidden md:table-cell px-2 py-2.5 text-left font-semibold w-16">Tipo</th>
                          <th className="px-2 py-2.5 text-right font-semibold w-[68px] whitespace-nowrap">CANTIDAD</th>
                          <th className="hidden md:table-cell px-2 py-2.5 text-left font-semibold w-[64px] whitespace-nowrap">MEDIDA</th>
                          <th className="px-2 py-2.5 text-right font-semibold w-[78px]">Monto unitario</th>
                          <th className="hidden md:table-cell px-2 py-2.5 text-right font-semibold w-11">IVA %</th>
                          <th className="hidden md:table-cell px-2 py-2.5 text-right font-semibold w-[78px]">Monto IVA</th>
                          <th className="px-2 py-2.5 text-right font-semibold w-[86px]">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center text-base font-medium text-muted-foreground/80 px-3 py-6">
                              Sin ítems agregados
                            </td>
                          </tr>
                        ) : (
                          items.map((row) => {
                            const l = calcularLineaIva({
                              cantidad: row.cantidad,
                              montoUnitario: row.precioUnitario,
                              porcentajeIva: row.iva,
                              modoIva: row.modoIva ?? "incluido",
                            });
                            const esProducto = (row.tipoItem ?? "insumo") === "producto";
                            // Misma regla de siempre: "solicitado" si el id está
                            // en el detalle de la OC; sin OC no se etiqueta.
                            const etiqueta = orden
                              ? idsOrden.has(row.idInsumo)
                                ? "Solicitado"
                                : "No solicitado"
                              : null;
                            return (
                              <tr key={row.rowId} className="hover:bg-muted/20 transition-colors">
                                <td className="align-middle px-2 py-2.5 min-w-0">
                                  <div className="truncate text-base font-medium text-foreground" title={row.nombre}>
                                    {row.nombre}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="md:hidden text-base text-muted-foreground">
                                      {esProducto ? "Producto" : "Insumo"}
                                    </span>
                                    {etiqueta && (
                                      <span
                                        className={`text-base font-semibold px-1.5 py-0.5 rounded-full ${
                                          etiqueta === "Solicitado"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-amber-100 text-amber-700"
                                        }`}
                                      >
                                        {etiqueta}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="hidden md:table-cell align-middle px-2 py-2.5 text-base text-muted-foreground">
                                  {esProducto ? "Producto" : "Insumo"}
                                </td>
                                <td className="align-middle px-2 py-2.5 text-base text-right">
                                  {row.cantidad}
                                  {esEmpaque(row.unidad) && (
                                    <div className="text-base text-muted-foreground break-words">
                                      {etiquetaPresentacion(row.unidad, row.factorPresentacion, row.unidadBase ?? insumos.find((i) => i.id === row.idInsumo)?.unidadMedida, insumos.find((i) => i.id === row.idInsumo)?.pesoMedida, tamanoDeFila(row))}
                                    </div>
                                  )}
                                </td>
                                <td className="hidden md:table-cell align-middle px-2 py-2.5 text-base text-muted-foreground">
                                  {!esEmpaque(row.unidad) && row.unidad}
                                </td>
                                <td className="align-middle px-2 py-2.5 text-base text-right whitespace-nowrap">
                                  {fmtCOP(row.precioUnitario)}
                                </td>
                                <td className="hidden md:table-cell align-middle px-2 py-2.5 text-base text-right text-muted-foreground">
                                  {chipIvaSinPrefijo(resolverModoIva(row, null), row.iva)}
                                </td>
                                <td className="hidden md:table-cell align-middle px-2 py-2.5 text-base text-right text-muted-foreground whitespace-nowrap">
                                  {fmtCOP(l.montoIva)}
                                </td>
                                <td className="align-middle px-2 py-2.5 text-base font-semibold text-foreground text-right whitespace-nowrap">
                                  {fmtCOP(l.subtotalConIva)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Totales pegados debajo de la tabla, a la derecha. */}
                  <div className="ml-auto w-fit grid grid-cols-[auto_7rem] gap-x-3 gap-y-1.5 pt-1">
                    <span className="text-base font-bold uppercase tracking-wider text-muted-foreground text-right">
                      Subtotal sin IVA
                    </span>
                    <span className="text-base font-semibold text-foreground text-right">
                      {fmtCOP(subtotalSinIva)}
                    </span>
                    <span className="text-base font-bold uppercase tracking-wider text-muted-foreground text-right">
                      IVA
                    </span>
                    <span className="text-base font-semibold text-foreground text-right">
                      {fmtCOP(totalIva)}
                    </span>
                    <span className="text-base font-bold uppercase tracking-wider text-muted-foreground text-right">
                      Total pagado
                    </span>
                    <span className="text-base font-bold text-foreground text-right">
                      {fmtCOP(totalPagado)}
                    </span>
                  </div>
                </div>
              ) : (
                // P14: tabla propia con la columna "Tipo": muestra insumos y
                // productos con cantidad, monto e IVA, y suma LOS DOS con la
                // misma fórmula (`calcularLineaIva`), así el total de la
                // factura nunca se queda corto.
                <TablaItemsFactura
                  items={items.map((item) => ({
                    ...item,
                    unidadBase: item.unidadBase ?? insumos.find((i) => i.id === item.idInsumo)?.unidadMedida,
                    pesoMedida: insumos.find((i) => i.id === item.idInsumo)?.pesoMedida ?? null,
                    tamanoUnidad: tamanoDeFila(item),
                  }))}
                  onEdit={editarItem}
                  onRemove={eliminarItem}
                  enPagina={isPage}
                  rowEditando={editando}
                  className={isPage ? "flex-1 min-h-0 flex flex-col" : ""}
                />
              )}

                {/* Acciones: en pantalla completa van al final de ESTA columna
                    (siempre visibles); en el modal siguen en el pie general. */}
                {isPage && !isView && (
                  <div className="flex flex-wrap gap-3 shrink-0 mt-auto pt-2">
                    <button
                      onClick={salir}
                      className="pn-boton pn-boton--normal flex-1"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={guardar}
                      disabled={!botonGuardarOk}
                      className="pn-boton pn-boton--principal flex-1"
                    >
                      <Check className="w-4 h-4" />
                      Guardar y sumar a la bodega
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
                  className="pn-boton pn-boton--normal flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={!botonGuardarOk}
                  className="pn-boton pn-boton--principal flex-1"
                >
                  <Check className="w-4 h-4" />
                  Guardar y sumar a la bodega
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
          <CrearInsumoCompraModal
            nombreInicial={itemNombre}
            insumosExistentes={insumos}
            categoriasInsumo={categoriasInsumo}
            onGuardar={(ins) => {
              setInsumos?.((prev) => [
                ins,
                ...prev.filter((existente) => existente.id !== ins.id),
              ]);
              setItemNombre(ins.nombre);
              setItemUnidad(ins.unidadMedida);
              setItemPrecio(0);
              setItemIva(undefined);
              setItemModoIva("incluido");
              setItemId(ins.id);
              setItemSugAbierto(false);
              setShowNuevoInsumo(false);
            }}
            onClose={() => setShowNuevoInsumo(false)}
          />
        )}
      </AnimatePresence>

      {/* Bloque 2: Modal de nuevo producto ("+ Crear producto"). */}
      <AnimatePresence>
        {showNuevoProducto && (
          <CrearProductoModal
            nombreInicial={itemNombre.trim()}
            productos={productos ?? []}
            categorias={categorias ?? []}
            onGuardar={async (p) => {
              const creado = await onCrearProducto?.(p);
              if (!creado) throw new Error("No se pudo crear el producto en el servidor.");
              // Queda seleccionado en la fila para seguir con cantidad,
              // monto e IVA (mismo camino que elegirlo del desplegable).
              seleccionarProducto(creado);
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
          <DialogoConfirmacion
            abierto
            onCambiarAbierto={a => { if (!a && !guardandoCompra) setShowGuardarConf(false); }}
            titulo="¿Guardar la factura y sumar lo que llegó a la bodega?"
            queVaAPasar={["Lo que llegó se suma a lo que hay en bodega", "Una vez guardada, la factura ya no se puede cambiar", "Si te equivocas, se puede anular"]}
            textoSeguro="No, volver a revisar"
            textoAccion={guardandoCompra ? "Guardando…" : "Sí, guardar y sumar"}
            onConfirmar={() => { void confirmarGuardar(); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
