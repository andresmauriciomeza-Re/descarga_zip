import { type OrdenCompra, type ProveedorRef, type OrdenFormData, type OrdenItem, type EstadoOrden, iPaginaCls, iCls, FORM_MAXW_PAGINA, FORM_MAXW, SERIF, opcionesEstado, fmtCOP } from "@/features/purchase-orders/utils/purchase-orders";
import type { Insumo } from "@/features/supplies/utils/supplies";
import type { Producto } from "@/features/products/utils/products";
import type { CategoriaProducto } from "@/features/product-categories/utils/product-categories";
import type { CategoriaInsumo } from "@/features/supplies/utils/supplies";
import { useState, useRef, useMemo, useEffect } from "react";
import { UNIDADES, type InsumoSuggestion, type CompactInsumoFormValues, CompactInsumoForm, irAlFormularioDeLinea } from "@/features/purchases/components/CompactSupplyForm";
import type { ModoIva } from "@/features/purchases/services/vat";
import { nombreBuscable, contenidoDe, presentacionCompra, empaqueDe, medidaCompra } from "@/shared/utils/presentation";
import { historialCompraDe } from "@/features/purchases/services/inventory";
import { toast } from "sonner";
import { esEmpaque } from "@/shared/utils/units";
import { type InsumoSolicitadoRow, InsumosSolicitadosTable, totalDeLineas } from "@/features/purchases/components/RequestedSuppliesTable";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, X, CheckCircle2, AlertCircle, Ban, Search, Plus, Check, Send } from "lucide-react";
import { EstadoBadge } from "@/features/purchase-orders/components/StatusBadge";
import { formatearFechaHora } from "@/shared/utils/time";
import { EstadoSelect } from "@/shared/components/StatusSelect";
import { SegmentadoButtons } from "@/shared/components/buttons/SegmentedButtons";
import { NuevoProveedorModal } from "@/features/purchase-orders/components/NewSupplierModal";
import { CrearInsumoCompraModal } from "@/features/purchases/components/CreatePurchaseSupplyModal";
import { CrearProductoModal } from "@/features/products/components/CreateProductModal";
import { ConfirmModal } from "@/features/purchase-orders/components/ConfirmModal";

export function OrdenModal({
  mode, orden, proveedores, insumos, productos, categorias, tipo = "orden", fullPage = false, onClose, onGuardar, onNuevoProveedor,
  onCrearInsumo,
  onCrearProducto,
  categoriasInsumo,
  initialItems,
}: {
  mode: "create" | "edit" | "view";
  orden?: OrdenCompra;
  proveedores: ProveedorRef[];
  insumos: Insumo[];
  /** Punto 3.3: catálogo de productos del módulo de Productos — la otra mitad
   *  del selector "Tipo" (Insumo | Producto) del formulario. */
  productos?: Producto[];
  /** Bloque 2: categorías del panel para el "+ Crear producto" (sólo las de
   *  tipo "Producto terminado" se ofrecen). */
  categorias?: CategoriaProducto[];
  /** "orden" = Orden de Compra · "compra" = Compra (Gestión de Compra) */
  tipo?: "orden" | "compra";
  /** Renderiza el formulario como una página independiente en vez de modal. */
  fullPage?: boolean;
  onClose: () => void;
  onGuardar: (d: OrdenFormData) => void | Promise<void>;
  onNuevoProveedor: (p: ProveedorRef) => string;
  /** Punto 5: crea el insumo en el catálogo (tipo "Insumo") desde "+ Crear insumo". */
  onCrearInsumo?: (ins: Insumo) => void;
  /** Bloque 2.2: categorías de insumos desde la API para el modal de alta. */
  categoriasInsumo?: CategoriaInsumo[];
  /** Crea el producto en el catálogo (tipo "Producto terminado") desde
   *  "+ Crear producto" (bloque 2): recibe el Producto COMPLETO que arma
   *  CrearProductoModal (precio 0, sin imagen, "No disponible"). */
  onCrearProducto?: (prod: Producto) => Promise<Producto>;
  initialItems?: OrdenItem[];
}) {
  const isView = mode === "view";
  const isCompra = tipo === "compra";
  const isPage = fullPage;
  // Fecha local, no UTC: `toISOString()` en Colombia (UTC-5) después de las 19:00
  // daba el día siguiente, y `today` es el `max` del date-picker de vencimiento.
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

  const [form, setForm] = useState<OrdenFormData>({
    proveedor: orden?.proveedor ?? "",
    fecha: orden?.fecha ?? today,
    estado: isCompra
      ? "Recibido"
      : (orden?.estado === "Enviado" ? "Enviado" : "Borrador"),
    items: orden?.items.map(i => ({ ...i })) ?? initialItems?.map(i => ({ ...i })) ?? [],
    numeroFactura: "",
  });
  const pf = (p: Partial<OrdenFormData>) => setForm(f => ({ ...f, ...p }));

  const [showNuevoProv, setShowNuevoProv] = useState(false);
  const [showNuevoInsumo, setShowNuevoInsumo] = useState(false);
  const [showNuevoProducto, setShowNuevoProducto] = useState(false);
  const [showSendConf, setShowSendConf] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Historial de cambios de estado
  const [estadoHistorial, setEstadoHistorial] = useState<{ estado: EstadoOrden; fecha: string }[]>(() => {
    if (orden?.estado) {
      return [{ estado: orden.estado, fecha: orden.fecha }];
    }
    return [{ estado: "Borrador" as EstadoOrden, fecha: today }];
  });

  // Buscador de proveedor (autocomplete por nombre, NIT, asesor o email)
  const [provQuery, setProvQuery] = useState(mode === "create" ? "" : (orden?.proveedor ?? ""));
  const [showProvSug, setShowProvSug] = useState(false);
  const provRef = useRef<HTMLDivElement>(null);

  /** Cerrar: vuelve directo al listado sin confirmación. */
  const salir = () => {
    onClose();
  };

  const provSugs = useMemo(() => {
    const q = provQuery.trim().toLowerCase();
    const base = q
      ? proveedores.filter(p =>
          p.nombre.toLowerCase().includes(q) ||
          p.nit.toLowerCase().includes(q) ||
          p.asesorComercial.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
        )
      : proveedores;
    return base.slice(0, 3);
  }, [proveedores, provQuery]);

  const provExiste = useMemo(
    () => provSugs.length > 0,
    [provSugs]
  );

  const [aNombre, setANombre] = useState("");
  const [aCant, setACant] = useState(1);
  const [aUnidad, setAUnidad] = useState(UNIDADES[0]);
  // Ajuste de bebidas: unidades por paca/caja de la línea que se está
  // agregando (undefined = unidad suelta). Se carga del producto elegido y
  // se guarda en `OrdenItem.unidadesPorEmpaque`.
  const [aEmpaque, setAEmpaque] = useState<number | undefined>(undefined);
  const [aPrecio, setAPrecio] = useState(0);
  const [aIva, setAIva] = useState<number | undefined>(undefined);
  const [aModoIva, setAModoIva] = useState<ModoIva>("incluido");
  const [aFromCat, setAFromCat] = useState(false);
  // Punto 3.3: tipo de ítem del formulario (botones Insumo | Producto). Por
  // defecto "insumo", como manda el plan.
  const [aTipoItem, setATipoItem] = useState<"insumo" | "producto">("insumo");
  // Id del insumo elegido del catálogo. Antes `addItem` fabricaba
  // `idInsumo: INS-${Date.now()}`, un id que no existía en el catálogo: se perdía
  // el enlace que Recepción usa para no volver a ofrecer un insumo ya recibido y
  // para agrupar las líneas por insumo.
  const [aInsumoId, setAInsumoId] = useState("");
  const [aShowSug, setAShowSug] = useState(false);
  const sugRef = useRef<HTMLDivElement>(null);

  // Estado para edición de fila (lápiz de la tabla en modo pantalla completa)
  const [editando, setEditando] = useState<string | null>(null);
  const nombreRef = useRef<HTMLInputElement>(null);

  // ������ Validación en tiempo real (patrón de MiPerfilScreen) ������������������������������������������������������
  const [tocado, setTocado] = useState({ proveedor: false, fecha: false });
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  // En "compra" el estado siempre trae un valor por defecto.
  const errorProveedor = form.proveedor.trim()
    ? undefined
    : "Selecciona o crea un proveedor.";
  const errorFecha = form.fecha ? undefined : "Selecciona la fecha de la orden.";
  const errorNumeroFactura =
    isCompra && !form.numeroFactura?.trim()
      ? "El número de factura es obligatorio."
      : undefined;
  const errorItems = form.items.length > 0 ? undefined : "Agrega al menos un ítem a la orden.";

  const formValido =
    !errorProveedor && !errorFecha && !errorNumeroFactura && !errorItems && !!form.estado;
  const algunoTocado = tocado.proveedor || tocado.fecha;
  const marcarTocado = (campo: "proveedor" | "fecha") =>
    setTocado((t) => ({ ...t, [campo]: true }));

  /** Labels: 13px en gris oscuro en pantalla completa; xs gris en el modal. */
  const labelCls = isPage
    ? "block text-[0.8125rem] leading-tight font-medium text-foreground/70 mb-1"
    : "block text-xs font-semibold text-muted-foreground mb-1.5";

  /** Clase del input: resalta en rojo cuando el campo visible es inválido. */
  const campoCls = (error?: string) =>
    `${isPage ? iPaginaCls : iCls} transition-colors ${error ? "border-red-400 focus:ring-red-300" : ""}`;

  const suggestions = useMemo<InsumoSuggestion[]>(() => {
    const q = aNombre.trim().toLowerCase();

    // Punto 3.3: el buscador mira un catálogo u otro según el tipo de ítem
    // elegido (mismo criterio que la Nueva compra).
    if (aTipoItem === "producto") {
      // Punto 3.2: sólo se compran "Producto terminado" (bebidas y reventa).
      // Con sólo `estado === "Disponible"` entraban también Pizzas y Lasañas,
      // que son "Producto insumo" (se producen, no se compran al proveedor).
      // Bloque 2.5: se compran productos aunque estén "No disponible" (los
      // recién creados con "+ Crear producto" nacen así); sólo se excluyen
      // los DESCONTINUADOS, que ya no vuelven a comprarse.
      const base = (productos ?? []).filter(
        (p) => p.estado !== "Descontinuado" && p.tipo === "Producto terminado",
      );
      // El buscador mira también el contenido ("coca 1.5") para distinguir
      // presentaciones del mismo producto.
      const filtrados = q
        ? base.filter((p) => nombreBuscable(p).toLowerCase().includes(q))
        : base;
      // Corrección 4 (punto B1) + ajuste: el monto de un producto en la OC es
      // su `costoUnitario` (POR UNIDAD en el catálogo) por las unidades de la
      // presentación: con "Paca x12" se pide el precio de la paca. Si viene
      // en 0 queda vacío y el usuario lo escribe. NUNCA se usa el precio de
      // venta como monto.
      return filtrados.slice(0, 3).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        contenido: contenidoDe(p) || undefined,
        unidadMedida: presentacionCompra(p),
        costoUnitario: Number(p.costoUnitario || 0) * empaqueDe(p),
      }));
    }

    const soloInsumos = insumos.filter(i => (i.tipo ?? "Insumo") === "Insumo" && i.estado === "activo");
    if (q.length === 0) return soloInsumos.slice(0, 3);
    return soloInsumos.filter(i => i.nombre.toLowerCase().includes(q)).slice(0, 3);
  }, [insumos, productos, aNombre, aTipoItem]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (sugRef.current && !sugRef.current.contains(e.target as Node)) setAShowSug(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (provRef.current && !provRef.current.contains(e.target as Node)) setShowProvSug(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const selectSug = (ins: Insumo) => {
    // Punto 2: el precio del catálogo viene en `costoUnitario` (number), que es
    // el mismo que muestra la lista desplegable. `precioUnitario` es null en las
    // semillas, por eso el Monto unitario quedaba en 0.
    setANombre(ins.nombre);
    setAUnidad(UNIDADES.includes(ins.unidadMedida) ? ins.unidadMedida : UNIDADES[0]);
    setAPrecio(Number(ins.costoUnitario ?? ins.precioUnitario ?? 0));
    setAIva(ins.iva == null ? undefined : Number(ins.iva));
    setAModoIva("incluido");
    setAInsumoId(ins.id);
    setAFromCat(true);
    setAShowSug(false);
  };

  /** Punto 3.3: catálogo de productos. Igual que con el insumo, se copian
   *  nombre, unidad de venta y monto; el producto no tiene IVA propio, así
   *  que sin historial la línea queda en 0 % y el usuario puede ajustarlo en
   *  el formulario (con historial de compra se trae ese %).
   *  Corrección 4: el monto es `costoUnitario` (o 0 = vacío para escribirlo);
   *  el precio de venta NUNCA se usa como monto. */
  const seleccionarProducto = (p: Producto) => {
    setANombre(p.nombre);
    // Punto 6: la Medida guarda el TOKEN que el backend acepta en `medida`
    // ("caja", "paca" o "und"); "Paca x12" no está en UNIDADES_COMPRA y la
    // orden respondía 400. La etiqueta visible ("Caja x6") se arma en la
    // tabla con etiquetaPresentacion(unidad, factor, unidadBase).
    setAUnidad(medidaCompra(p));
    const factor = empaqueDe(p);
    setAEmpaque(factor > 1 ? factor : undefined);
    // Corrección 4: el monto es `costoUnitario` (POR UNIDAD) por las
    // unidades de la presentación — con "Paca x12" el precio de la paca —
    // o 0 = vacío para escribirlo; el precio de venta NUNCA es el monto.
    // Ajuste: con historial de compra se precarga el último monto SIN IVA y
    // su % (la OC no suma IVA); sin historial (productos viejos) manda el
    // costo del catálogo por presentación, como siempre.
    // Punto C2: si existe `montoDigitado` (el monto TAL CUAL digitado, sin
    // convertir) manda ÉL; `montoSinIva` queda como fallback.
    const hist = historialCompraDe(p);
    setAPrecio(
      hist ? (hist.montoDigitado ?? hist.montoSinIva) : Number(p.costoUnitario || 0) * factor
    );
    setAIva(hist?.iva);
    setAModoIva("incluido");
    setAInsumoId(p.id);
    setAFromCat(true);
    setAShowSug(false);
  };

  // Punto 5: "+ Crear insumo" (primera opción del combo). Crea el insumo en el
  // catálogo vía el padre y lo selecciona en "Agregar insumo" con su unidad,
  // monto e IVA — igual que si se hubiera elegido una sugerencia existente.
  const handleNuevoInsumo = (ins: Insumo) => {
    onCrearInsumo?.(ins);
    setANombre(ins.nombre);
    setAUnidad(ins.unidadMedida);
    setAPrecio(0);
    setAIva(undefined);
    setAModoIva("incluido");
    setAInsumoId(ins.id);
    setAFromCat(true);
    setAShowSug(false);
    setShowNuevoInsumo(false);
  };

  const handleNuevoProducto = async (prod: Producto) => {
    const creado = await onCrearProducto?.(prod);
    if (!creado) throw new Error("No se pudo crear el producto en el servidor.");
    // Bloque 2: se selecciona como si viniera del desplegable — presentación,
    // empaque y monto salen del propio producto y queda listo para la fila.
    seleccionarProducto(creado);
    setAShowSug(false);
    setShowNuevoProducto(false);
    toast.success(`Producto "${creado.nombre}" creado`);
    return creado;
  };

  /** Fila cargada con el lápiz: su Contenido/Presentación se recargan en el
   *  formulario (punto 6) sin pisarlos con el factor del catálogo. */
  const filaEditando = editando
    ? form.items.find((item) => item.rowId === editando)
    : undefined;

  /** Bebidas: tamaño de una unidad del producto ("400 ml") o undefined. */
  const tamanoDeProducto = (id: string) => {
    const p = productos?.find((x) => x.id === id);
    return (p && contenidoDe(p)) || undefined;
  };

  const addItem = ({
    cantidad,
    precio,
    iva,
    modoIva,
    factorPresentacion,
    unidadBase,
  }: CompactInsumoFormValues) => {
    // Modo edición (lápiz de la tabla): la fila está cargada arriba, así que
    // solo se reemplaza y se deja el formulario listo para el siguiente.
    if (editando) {
      if (!aNombre.trim()) { toast.error("Ingresa el nombre del ítem."); return; }
      if (form.items.some(i => i.rowId !== editando && (i.tipoItem ?? "insumo") === aTipoItem && i.nombre.toLowerCase() === aNombre.trim().toLowerCase())) {
        toast.error("Este ítem ya está en la orden.");
        return;
      }
      actualizarItem(editando, {
        nombre: aNombre.trim(),
        cantidad,
        // Unidad de la fila: "und" si la medida quedó vacía (producto sin
        // elegir); con presentación cargada va el token ("caja", "paca").
        unidad: aUnidad.trim() || "und",
        precioUnitario: precio,
        iva: modoIva === "exento" ? 0 : iva,
        modoIva: modoIva ?? aModoIva,
        // Punto 3.3: el ítem puede haber cambiado de catálogo (insumo ↔
        // producto) mientras estaba cargado en el formulario.
        tipoItem: aTipoItem,
        // Punto 6: para productos el Contenido de la LÍNEA manda sobre el
        // empaque del catálogo; sin Contenido se conserva el del catálogo.
        unidadesPorEmpaque:
          aTipoItem === "producto"
            ? factorPresentacion != null && factorPresentacion > 0
              ? factorPresentacion
              : esEmpaque(aUnidad) && aEmpaque && aEmpaque > 1
                ? aEmpaque
                : undefined
            : undefined,
        factorPresentacion:
          factorPresentacion != null && factorPresentacion > 0
            ? factorPresentacion
            : undefined,
        // Unidad base de la línea: la tabla arma "caja × 6 und" con ella.
        ...(unidadBase != null && unidadBase.trim() ? { unidadBase } : {}),
        ...(aInsumoId ? { idInsumo: aInsumoId } : {}),
      });
      limpiarFilaInsumo();
      return;
    }

    if (!aNombre.trim()) { toast.error("Ingresa el nombre del ítem."); return; }
    if (form.items.some(i => (i.tipoItem ?? "insumo") === aTipoItem && i.nombre.toLowerCase() === aNombre.trim().toLowerCase())) {
      toast.error("Este ítem ya está en la orden.");
      return;
    }
    // Se conserva el id del catálogo cuando la línea viene de una sugerencia; si
    // el nombre se escribió a mano se genera uno secuencial. `Date.now()` no sirve
    // como id de fila: dos additions en el mismo milisegundo colisionaban.
    const nextRow = form.items.reduce((max, i) => {
      const n = parseInt(i.rowId.replace(/^r/, ""), 10);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0) + 1;
    pf({
      items: [...form.items, {
        rowId: `r${nextRow}`,
        idInsumo: aInsumoId || `INS-M-${nextRow}`,
        nombre: aNombre.trim(),
        cantidad,
        // Medida: "und" si no se eligió nada (producto a mano); con un ítem
        // del catálogo elegido trae su unidad / presentación de compra.
        unidad: aUnidad.trim() || "und",
        costoUnitario: precio,
        precioUnitario: precio,
        iva: modoIva === "exento" ? 0 : iva,
        modoIva: modoIva ?? aModoIva,
        // Punto 3.3: la fila guarda de qué catálogo salió (insumo/producto).
        tipoItem: aTipoItem,
        // Punto 6: para productos el Contenido de la LÍNEA manda sobre el
        // empaque del catálogo; sin Contenido se conserva el del catálogo
        // (unidad suelta ⇒ sin el dato, se lee como 1).
        ...(aTipoItem === "producto"
          ? {
              unidadesPorEmpaque:
                factorPresentacion != null && factorPresentacion > 0
                  ? factorPresentacion
                  : esEmpaque(aUnidad) && aEmpaque && aEmpaque > 1
                    ? aEmpaque
                    : undefined,
            }
          : {}),
        // Presentaciones: el Contenido de la línea viaja al backend como
        // `factor_presentacion` (insumos y productos).
        ...(factorPresentacion != null && factorPresentacion > 0
          ? { factorPresentacion }
          : {}),
        // Unidad base de la línea: la tabla arma "caja × 6 und" con ella.
        ...(unidadBase != null && unidadBase.trim() ? { unidadBase } : {}),
      }],
    });
    limpiarFilaInsumo();
  };

  /** Deja la fila "Agregar insumo" lista para el siguiente insumo: campos en
   *  cero, sin modo edición y foco de vuelta en el buscador de Nombre.
   *  Ajuste: la Medida (solo lectura) vuelve a vacía para producto y a
   *  `UNIDADES[0]` para insumo — igual que al abrir el formulario — y el
   *  empaque se limpia siempre. El tipo que se guarda por closure puede ser
   *  el VIEJO al cambiar Insumo/Producto, así que quien cambia el tipo pasa
   *  el nuevo EXPLÍCITO (nunca se usa como callback directo). */
  const limpiarFilaInsumo = (tipo: "insumo" | "producto" = aTipoItem) => {
    setANombre(""); setACant(1); setAPrecio(0); setAIva(undefined); setAModoIva("incluido");
    setAUnidad(tipo === "producto" ? "und" : UNIDADES[0]);
    setAEmpaque(undefined);
    setAFromCat(false); setAInsumoId(""); setAShowSug(false);
    setEditando(null);
    nombreRef.current?.focus();
  };

  /** Lápiz de la tabla: carga el ítem en el formulario "Agregar ítem" de la
   *  izquierda (con su tipo y su empaque de paca/caja, para poder
   *  actualizarlos). El botón pasa a "Guardar cambios" y la fila queda
   *  resaltada en la tabla hasta guardar o cancelar. */
  const editarItem = (row: InsumoSolicitadoRow) => {
    setEditando(row.rowId);
    setATipoItem(row.tipoItem ?? "insumo");
    setANombre(row.nombre);
    setACant(row.cantidad);
    setAUnidad(row.unidad);
    setAEmpaque(row.unidadesPorEmpaque && row.unidadesPorEmpaque > 1 ? row.unidadesPorEmpaque : undefined);
    setAInsumoId(row.idInsumo);
    setAPrecio(row.precioUnitario);
    setAIva(row.iva);
    setAModoIva(row.modoIva ?? "incluido");
    setAFromCat(false);
    setAShowSug(false);
    // El foco abre las sugerencias: se cierran enseguida.
    setTimeout(() => { irAlFormularioDeLinea(sugRef.current); setAShowSug(false); }, 0);
  };

  /** Patch de la línea en edición: conserva TODOS los datos de la fila (id,
   *  nombre, idInsumo, costo...) y sólo pisa los campos del formulario. */
  const actualizarItem = (rowId: string, patch: Partial<OrdenItem>) => {
    pf({
      items: form.items.map((i) =>
        i.rowId === rowId
          ? {
              ...i,
              ...patch,
              // `costoUnitario` es el precio que usan calcTotal, el PDF y las
              // facturas: se mueve junto con `precioUnitario`.
              costoUnitario: patch.precioUnitario ?? i.costoUnitario,
            }
          : i
      ),
    });
  };

  const selectProv = (p: ProveedorRef) => {
    setProvQuery(p.nombre);
    pf({ proveedor: p.nombre });
    setShowProvSug(false);
  };

  const handleNuevoProv = (p: ProveedorRef) => {
    const nombre = onNuevoProveedor(p);
    setProvQuery(nombre);
    pf({ proveedor: nombre });
    setShowNuevoProv(false);
    toast.success(`Proveedor "${nombre}" creado`);
  };

  const handleGuardar = async () => {
    if (guardando) return;
    setIntentoGuardar(true);

    if (!form.proveedor.trim()) { toast.error("Selecciona o crea un proveedor."); return; }
    if (!form.fecha) { toast.error("Selecciona la fecha de la orden."); return; }
    if (isCompra && !form.numeroFactura?.trim()) { toast.error("El número de factura es obligatorio."); return; }
    if (form.items.length === 0) { toast.error("Agrega al menos un ítem."); return; }
    const ivaInvalido = form.items.find(
      (item) =>
        (item.modoIva ?? "incluido") !== "exento" &&
        (item.iva == null || !Number.isFinite(item.iva) || item.iva < 0 || item.iva > 100),
    );
    if (ivaInvalido) {
      toast.error(ivaInvalido.iva == null ? "Ingresa el IVA." : "El IVA debe estar entre 0 y 100.");
      return;
    }
    setGuardando(true);
    try {
      await onGuardar(form);
    } finally {
      setGuardando(false);
    }
  };

  /** Subtítulo de la cabecera (solo cuando aporta algo). */
  const subtitulo =
    isView || mode === "edit"
      ? orden
        ? `${orden.proveedor} · ${orden.fecha}`
        : ""
      : isPage
        ? isCompra
          ? "Registra una factura de proveedor"
          : "Crea una orden de compra para un proveedor"
        : "";

  return (
    <>
      <div
        className={
          isPage
            ? `w-full px-4 pt-4 ${FORM_MAXW_PAGINA} mx-auto ${isView ? "pb-4" : "pn-pagina-con-barra"}`
            : "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-hidden"
        }
      >
        <div
          className={
            isPage
              ? "w-full"
              : "h-full flex items-center justify-center p-4"
          }
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`flex flex-col w-full ${isPage ? FORM_MAXW_PAGINA : FORM_MAXW}${
              isPage
                ? ""
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
                    {mode === "create"
                      ? (isCompra ? "Nueva Compra" : "Hacer un pedido")
                      : mode === "edit" ? `Cambiar el pedido ${orden?.id}` : `Orden ${orden?.id}`}
                  </h3>
                  {subtitulo && (
                    <p className="text-base text-muted-foreground mt-0.5 truncate">{subtitulo}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isView && orden && <EstadoBadge e={orden.estado} />}
                {!isPage && (
                  <button onClick={salir} className="p-1.5 max-md:p-3.5 max-md:-m-2 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                    <X className="w-4 h-4" aria-hidden="true" /> Cerrar
                  </button>
                )}
              </div>
            </div>

            <div
              className={
                isPage
                  ? "px-5 pt-3 pb-4 flex flex-col gap-4"
                  : "flex-1 min-h-0 px-5 py-5 flex flex-col gap-5 overflow-y-auto"
              }
            >
              {/* Columna IZQUIERDA — formulario (50 %). En el modal es solo un
                  grupo vertical: mantiene el mismo flujo de antes. */}
              <div
                className={
                  isPage
                    ? "w-full min-w-0 flex flex-col gap-6"
                    : "flex flex-col gap-5"
                }
              >
              {/* Status banners */}
              {isView && orden?.estado === "Completado" && orden.recepcion && (
                <div className="flex items-center gap-2 px-4 py-3 max-md:min-h-11 bg-emerald-50 border border-emerald-200 rounded-xl text-base text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Recepción guardada el <strong className="ml-1">{orden.recepcion.fechaRecepcion}</strong>. Esta orden ya no es editable.
                </div>
              )}
              {isView && orden?.estado === "Enviado" && (
                <div className="flex items-center gap-2 px-4 py-3 max-md:min-h-11 bg-blue-50 border border-blue-200 rounded-xl text-base text-blue-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Orden enviada al proveedor. Pendiente de Recepción.
                </div>
              )}
              {isView && orden?.estado === "Anulado" && (
                <div className="flex items-center gap-2 px-4 py-3 max-md:min-h-11 bg-red-50 border border-red-200 rounded-xl text-base text-red-800">
                  <Ban className="w-4 h-4 shrink-0" />
                  Esta orden ha sido anulada.
                </div>
              )}

              {/* Sección 1 — "Datos de la orden" (el título solo existe en
                  pantalla completa; en el modal el `<section>` solo agrupa
                  para mantener el mismo espaciado de antes). */}
              <section className={`flex flex-col ${isPage ? "gap-2 shrink-0" : "gap-5"}`}>
                {!isView && <h2 className="text-xl font-bold">1 · ¿A quién le pedimos?</h2>}

                {/* Detalle (vista): 3 columnas. Creación en pantalla completa:
                    Fila 1: Proveedor * (ancho completo)
                    Fila 2: Fecha * | Estado *
                    En el modal se conserva la rejilla de 2/3. */}
                <div
                  className={`grid gap-4 shrink-0 ${
                    isView
                      ? "grid-cols-2 md:grid-cols-3"
                      : isPage
                        ? "grid-cols-1"
                        : "grid-cols-2"
                  }`}
                >
                  <div className="relative col-span-2">
                    <label className={labelCls}>Proveedor {!isView && <span className="text-red-500">*</span>}</label>
                    {isView
                      ? <p className="text-base font-semibold text-foreground py-2">{form.proveedor}</p>
                      : (
                        <div className="relative" ref={provRef}>
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <input
                            value={provQuery}
                            onChange={e => {
                              setProvQuery(e.target.value);
                              pf({ proveedor: e.target.value });
                              setShowProvSug(true);
                            }}
                            onFocus={() => setShowProvSug(true)}
                            onBlur={() => marcarTocado("proveedor")}
                            placeholder="Buscar por nombre, NIT, asesor o email..."
                            className={`${campoCls((tocado.proveedor || intentoGuardar) ? errorProveedor : undefined)} min-h-14 pl-10 text-lg`}
                            aria-invalid={!!((tocado.proveedor || intentoGuardar) && errorProveedor)}
                          />
                          {/* Punto 6: el desplegable va por encima de todo el
                              formulario (z-50), para que el badge de Estado no
                              se monte sobre la lista. */}
                          {showProvSug && (
                            <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                              {/* Opción "+ Crear proveedor" PRIMERA */}
                              <button
                                type="button"
                                onMouseDown={e => { e.preventDefault(); setShowProvSug(false); setShowNuevoProv(true); }}
                                className="w-full text-left px-3 py-2.5 text-base font-semibold text-primary hover:bg-primary/10 cursor-pointer inline-flex items-center gap-2 border-b border-border"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Nuevo proveedor {provQuery.trim() && `"${provQuery.trim()}"`}
                              </button>
                              <hr className="my-0.5 border-border" />
                              {/* Resultados - máximo 3 */}
                              {provSugs.slice(0, 3).map(p => (
                                <button
                                  key={p.nit}
                                  type="button"
                                  onMouseDown={() => selectProv(p)}
                                  className={`w-full text-left px-3 py-2.5 text-base hover:bg-muted cursor-pointer border-b border-border last:border-0 ${form.proveedor === p.nombre ? "bg-muted/60" : ""}`}
                                >
                                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                                    {p.nombre}
                                    {form.proveedor === p.nombre && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                  </p>
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
                    {!isView && (tocado.proveedor || intentoGuardar) && errorProveedor && (
                      <p className={isPage ? "absolute left-0 top-full text-base text-red-500" : "text-base text-red-500 mt-1 ml-0.5"}>{errorProveedor}</p>
                    )}
                  </div>

                  {!isView && isPage && (
                    <>
                      <div className="relative">
                        <label className={labelCls}>Fecha <span className="text-red-500">*</span></label>
                        <input
                          type="date"
                          value={form.fecha}
                          onChange={e => pf({ fecha: e.target.value })}
                          onBlur={() => marcarTocado("fecha")}
                          readOnly
                          className={campoCls((tocado.fecha || intentoGuardar) ? errorFecha : undefined)}
                          aria-invalid={!!((tocado.fecha || intentoGuardar) && errorFecha)}
                        />
                        {(tocado.fecha || intentoGuardar) && errorFecha && (
                          <p className="absolute left-0 top-full text-base text-red-500">{errorFecha}</p>
                        )}
                        {/* Fecha con hora en gris pequeño debajo del input */}
                        <p className="text-base text-muted-foreground mt-1">
                          {/* Fecha y hora real en zona America/Bogota */}
                          {formatearFechaHora(orden?.historialEstados?.[0]?.fechaHora ?? orden?.fecha ?? new Date().toISOString())}
                        </p>
                      </div>

                      <div className="relative">
                        <label className={labelCls}>Estado <span className="text-red-500">*</span></label>
                        {/* EstadoSelect (Radix) con portal z-[100] */}
                        <EstadoSelect
                          value={form.estado}
                          onChange={(nuevoEstado) => {
                            setEstadoHistorial(prev => [...prev, { estado: nuevoEstado as EstadoOrden, fecha: today }]);
                            pf({ estado: nuevoEstado });
                          }}
                          options={opcionesEstado(form.estado as EstadoOrden)}
                          disabled={mode === "create"}
                        />
                        {estadoHistorial.length > 0 && (
                          <p className="text-base text-muted-foreground mt-1">
                            {estadoHistorial[estadoHistorial.length - 1].fecha}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {!isView && !isPage && (
                    <>
                      <div className="relative">
                        <label className={labelCls}>Fecha <span className="text-red-500">*</span></label>
                        <input
                          type="date"
                          value={form.fecha}
                          onChange={e => pf({ fecha: e.target.value })}
                          onBlur={() => marcarTocado("fecha")}
                          readOnly
                          className={campoCls((tocado.fecha || intentoGuardar) ? errorFecha : undefined)}
                          aria-invalid={!!((tocado.fecha || intentoGuardar) && errorFecha)}
                        />
                        {(tocado.fecha || intentoGuardar) && errorFecha && (
                          <p className="text-base text-red-500 mt-1 ml-0.5">{errorFecha}</p>
                        )}
                      </div>
                      <div onMouseDown={() => setShowProvSug(false)}>
                        <label className={labelCls}>Estado <span className="text-red-500">*</span></label>
                        {/* Punto 6: el trigger va SIN z-index ni position con z. Con
                            `relative z-40` el badge "Borrador" se montaba sobre el
                            desplegable del Proveedor (z-50) y tapaba los resultados.
                            El menú va en portal (z-[100]) y sigue por encima de todo. */}
                        <EstadoSelect
                          value={form.estado}
                          onChange={(nuevoEstado) => {
                            setEstadoHistorial(prev => [...prev, { estado: nuevoEstado as EstadoOrden, fecha: today }]);
                            pf({ estado: nuevoEstado });
                          }}
                          options={opcionesEstado(form.estado as EstadoOrden)}
                          disabled={mode === "create"}
                        />
                        {estadoHistorial.length > 0 && (
                          <p className="text-base text-muted-foreground mt-1">
                            {estadoHistorial[estadoHistorial.length - 1].fecha}
                          </p>
                        )}
                        {mode !== "create" && (
                          <button
                            type="button"
                            onClick={() => {
                              // Mostrar historial completo
                              alert(estadoHistorial.map(h => `${h.estado} - ${h.fecha}`).join('\n'));
                            }}
                            className="text-base text-primary hover:underline mt-0.5"
                          >
                            Ver historial
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* Sección 2 — "Agregar ítem": fila con buscador, stepper y
                  botón en una sola línea. En pantalla completa es el ÚLTIMO
                  bloque de la columna izquierda (la tabla vive en la derecha). */}
              {!isView && (
                <section className={`flex flex-col ${isPage ? "gap-3 shrink-0" : "gap-5"}`}>
                  <CompactInsumoForm
                    containerRef={sugRef}
                    titulo="2 · ¿Qué le pedimos?"
                    headerExtra={
                      isPage ? (
                      <div className="flex items-center gap-2">
                        <label className="block text-base font-semibold text-muted-foreground">
                          Tipo
                        </label>
                        <SegmentadoButtons
                          valor={aTipoItem}
                          onChange={(valor) => {
                            const nuevo = valor as "insumo" | "producto";
                            if (nuevo === aTipoItem) return;
                            setATipoItem(nuevo);
                            // Al cambiar de catálogo el ítem cargado ya no
                            // sirve: se limpia la fila (la Medida según el
                            // tipo NUEVO) y el buscador empieza a mirar la
                            // otra lista.
                            limpiarFilaInsumo(nuevo);
                          }}
                          opciones={[
                            { valor: "insumo", etiqueta: "Insumo" },
                            { valor: "producto", etiqueta: "Producto" },
                          ]}
                        />
                      </div>
                      ) : undefined
                    }
                    nombre={aNombre}
                    onNombreChange={(value) => {
                      setANombre(value);
                      setAFromCat(false);
                      setAInsumoId("");
                      // En producto, escribir a mano suelta la presentación:
                      // la Medida queda vacía y el empaque se limpia.
                      if (aTipoItem === "producto") {
                        setAUnidad("und");
                        setAEmpaque(undefined);
                      }
                      setAShowSug(true);
                    }}
                    onNombreFocus={() => setAShowSug(true)}
                    // Punto 7: el desplegable se cierra al salir del BUSCADOR
                    // (otro campo del formulario, Tab, Esc o clic afuera).
                    onCerrarSugerencias={() => setAShowSug(false)}
                    cantidad={aCant}
                    unidad={aUnidad}
                    onUnidadChange={setAUnidad}
                    // Punto 6: la Presentación de PRODUCTOS ya no es texto
                    // fijo ("Paca x12"): es el mismo select con el token
                    // válido y su Contenido editable en la línea.
                    // Punto 5: en la Nueva Orden la Medida del Contenido la
                    // define el ítem del catálogo.
                    medidaContenidoBloqueada
                    // IVA obligatorio (> 0) con "IVA incluido" o "IVA adicional".
                    ivaObligatorio
                    etiquetaNombre={aTipoItem === "producto" ? "Producto" : "Insumo"}
                    insumoId={
                      aTipoItem === "insumo" && /^INS-\d+$/.test(aInsumoId)
                        ? aInsumoId
                        : undefined
                    }
                    unidadBase={
                      aTipoItem === "insumo"
                        ? insumos.find((ins) => ins.id === aInsumoId)?.unidadMedida
                        : // Punto 6: en PRODUCTOS la unidad base es su
                          // unidad de venta ("und"): contra ella se lee y
                          // calcula el Contenido de la caja/paca de ESTA
                          // línea.
                          productos?.find((x) => x.id === aInsumoId)?.unidadVenta?.trim() ||
                          undefined
                    }
                    // Punto 6: al editar, el Contenido/Presentación de la
                    // FILA recargados mandan sobre el factor del catálogo; al
                    // agregar un producto nuevo se precarga su empaque.
                    factorPresentacionInicial={
                      editando
                        ? filaEditando?.factorPresentacion ??
                          filaEditando?.unidadesPorEmpaque
                        : aTipoItem === "producto"
                          ? aEmpaque
                          : undefined
                    }
                    presentacionInicial={
                      editando
                        ? filaEditando?.unidad
                        : aTipoItem === "producto"
                          ? // La presentación del CATÁLOGO (no la elegida): su
                            // empaque sólo se sugiere para esa presentación.
                            (() => {
                              const p = productos?.find((x) => x.id === aInsumoId);
                              return p ? medidaCompra(p) : undefined;
                            })()
                          : undefined
                    }
                    // Peso de medida del insumo elegido (si lo tiene): se
                    // muestra como ayuda bajo la línea del formulario.
                    pesoMedida={
                      aTipoItem === "insumo"
                        ? insumos.find((ins) => ins.id === aInsumoId)?.pesoMedida ?? null
                        : null
                    }
                    // Bebidas: tamaño de una unidad ("400 ml") en Medida y en
                    // la ayuda (el stock sigue contando unidades).
                    tamanoUnidad={
                      aTipoItem === "producto" ? tamanoDeProducto(aInsumoId) : undefined
                    }
                    etiquetaUnidad="Presentación"
                    precio={aPrecio}
                    iva={aIva}
                    modoIva={aModoIva}
                    onModoIvaChange={setAModoIva}
                    onAgregar={addItem}
                    suggestions={suggestions}
                    showSuggestions={aShowSug}
                    onSelectSuggestion={(suggestion) => {
                      if (aTipoItem === "producto") {
                        const p = (productos ?? []).find((x) => x.id === suggestion.id);
                        // Guarda por si el catálogo cambió mientras estaba
                        // abierto el desplegable.
                        if (p) seleccionarProducto(p);
                        return;
                      }
                      selectSug(suggestion as Insumo);
                    }}
                    onCrearInsumo={() => {
                      setAShowSug(false);
                      setShowNuevoInsumo(true);
                    }}
                    onCrearProducto={() => {
                      setAShowSug(false);
                      setShowNuevoProducto(true);
                    }}
                    compacto={isPage}
                    buttonLabel={editando ? "Guardar cambios" : "Agregar otro insumo o producto"}
                    onCancelar={editando ? () => limpiarFilaInsumo() : undefined}
                    variante="compacta"
                    // Punto 3.3: el atajo "+ Crear insumo/producto" según tipo.
                    ocultarCrearInsumo={aTipoItem === "producto"}
                    ocultarCrearProducto={aTipoItem === "insumo"}
                    placeholder={
                      aTipoItem === "producto" ? "Buscar producto..." : "Buscar insumo..."
                    }
                    // Punto 2.6: el selector de tipo vive en el hueco de
                    // Medida SOLO en el modal; en página ya subió a la fila de
                    // título de arriba, así que no se pasa `campoExtra`.
                    campoExtra={
                      isPage ? undefined : (
                      <div className="min-w-[7.375rem]">
                        <label className="block text-base font-semibold text-muted-foreground mb-1">
                          Tipo
                        </label>
                        <SegmentadoButtons
                          valor={aTipoItem}
                          onChange={(valor) => {
                            const nuevo = valor as "insumo" | "producto";
                            if (nuevo === aTipoItem) return;
                            setATipoItem(nuevo);
                            // Al cambiar de catálogo el ítem cargado ya no
                            // sirve: se limpia la fila (la Medida según el
                            // tipo NUEVO) y el buscador empieza a mirar la
                            // otra lista.
                            limpiarFilaInsumo(nuevo);
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
                  {/* Aviso de insumos: en pantalla completa va justo debajo de
                      la fila (solo empuja la tabla al aparecer); en el modal,
                      con el mismo margen de 20px de antes. */}
                  {!isView && errorItems && (algunoTocado || intentoGuardar) && (
                    <p className={`text-base text-red-500 ${isPage ? "mt-1 ml-0.5" : "mt-5 ml-0.5"}`}>
                      {errorItems}
                    </p>
                  )}
                </section>
              )}
              </div>

              {/* Columna DERECHA (50 %) — ítems de la orden, totales y
                  botones. Separada de la izquierda por una línea vertical. */}
              <div
                className={
                  isPage
                    ? "w-full min-w-0 flex flex-col gap-3 border-t border-border pt-4"
                    : "flex flex-col gap-5"
                }
              >
                {/* Cabecera de la tabla: contador. Punto 3.3: la orden admite
                    insumos Y productos, así que se habla de "ítems". */}
                {isPage && !isView && (
                  <div className="shrink-0">
                    <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-border">
                      <p className="text-base leading-none font-bold uppercase tracking-widest text-muted-foreground">
                        Ítems de la orden
                      </p>
                      <span className="text-base font-medium text-muted-foreground">
                        {form.items.length} {form.items.length === 1 ? "ítem" : "ítems"}
                      </span>
                    </div>
                  </div>
                )}

              {isView ? (
                <div className="flex flex-col gap-4">
                  {/* Recepcion detail — acumulado de todas las facturas de la OC */}
                  {orden?.recepcion && (
                    <div className="bg-emerald-50/40 rounded-xl border border-emerald-200 overflow-hidden">
                      <div className="px-3 py-2 border-b border-emerald-200 bg-emerald-100/60">
                        <p className="text-base font-bold uppercase tracking-wider text-emerald-800">Insumos recibidos</p>
                      </div>
                      <table className="pn-tabla-adapta w-full text-base break-words">
                        <thead className="text-base text-muted-foreground uppercase tracking-wider">
                          <tr>
                            {["Nombre", "Solicitado", "Recibido", "Unidad", "P. real", "Subtotal"].map(h => (
                              <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-100">
                          {[...orden.recepcion.items, ...orden.recepcion.itemsExtra].map(item => (
                            <tr key={item.rowId}>
                              <td className="px-3 py-2 font-medium text-foreground">
                                {item.nombre}
                                {item.cantidadSolicitada === 0 && (
                                  <span className="ml-2 text-base font-semibold px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full">
                                    No solicitado
                                  </span>
                                )}
                              </td>
                              <td data-etiqueta="Solicitado" className="px-3 py-2 text-muted-foreground text-base">{item.cantidadSolicitada || "—"}</td>
                              <td data-etiqueta="Recibido" className="px-3 py-2 font-semibold">{item.cantidadRecibida}</td>
                              <td data-etiqueta="Unidad" className="px-3 py-2 text-base text-muted-foreground">{item.unidad}</td>
                              <td data-etiqueta="P. real" className="px-3 py-2">{fmtCOP(item.costoUnitario)}</td>
                              <td data-etiqueta="Subtotal" className="px-3 py-2 font-semibold">{fmtCOP(item.cantidadRecibida * item.costoUnitario)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-emerald-100/60 border-t border-emerald-200">
                          <tr>
                            <td colSpan={5} className="px-3 py-2 text-base font-bold text-muted-foreground text-right uppercase">
                              Total recibido
                            </td>
                            <td className="px-3 py-2 text-base font-bold text-foreground">
                              {fmtCOP([...orden.recepcion.items, ...orden.recepcion.itemsExtra].reduce(
                                (s, i) => s + i.cantidadRecibida * i.costoUnitario, 0
                              ))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                  <InsumosSolicitadosTable
                    items={form.items.map((item) => ({
                      ...item,
                      unidadBase: item.unidadBase ?? insumos.find((i) => i.id === item.idInsumo)?.unidadMedida,
                      pesoMedida: insumos.find((i) => i.id === item.idInsumo)?.pesoMedida ?? null,
                      tamanoUnidad: item.tipoItem === "producto" ? tamanoDeProducto(item.idInsumo) : undefined,
                    }))}
                    showActions={false}
                    enPagina={isPage}
                    className=""
                  />
                </div>
              ) : (
                <>
                  <InsumosSolicitadosTable
                    items={form.items.map((item) => ({
                      ...item,
                      unidadBase: item.unidadBase ?? insumos.find((i) => i.id === item.idInsumo)?.unidadMedida,
                      pesoMedida: insumos.find((i) => i.id === item.idInsumo)?.pesoMedida ?? null,
                      tamanoUnidad: item.tipoItem === "producto" ? tamanoDeProducto(item.idInsumo) : undefined,
                    }))}
                    showActions
                    onRemove={(rowId) => {
                      if (editando === rowId) limpiarFilaInsumo();
                      pf({ items: form.items.filter((i) => i.rowId !== rowId) });
                    }}
                    onEdit={editarItem}
                    rowEditando={editando}
                    sinScrollX
                    totalLabel="Total estimado"
                    mostrarTotal={!isPage}
                    enPagina={isPage}
                    className=""
                    // Usa las mismas columnas que Nueva Compra; la orden admite
                    // insumos y productos.
                    titulo="Lo que vamos a pedir"
                    textoVacioPagina="Aún no has agregado ítems"
                  />
                </>
              )}
              </div>
            </div>

            {/* Pantalla completa: barra fija abajo con el total y las acciones. */}
            {isPage && !isView && (
              <div className="pn-barra-guardar">
                <p className="pn-barra-guardar__total">
                  <span>Total estimado</span>
                  <strong>{fmtCOP(totalDeLineas(form.items))}</strong>
                </p>
                <div className="pn-barra-guardar__botones">
                  <button onClick={salir} className="pn-boton pn-boton--normal">
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardar}
                    disabled={!formValido || guardando}
                    className="pn-boton pn-boton--principal"
                  >
                    <Check className="w-4 h-4" />
                    {guardando ? "Guardando…" : mode === "edit" ? "Guardar cambios" : isCompra ? "Guardar" : "Guardar como borrador"}
                  </button>
                </div>
              </div>
            )}

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
                  onClick={handleGuardar}
                  disabled={!formValido || guardando}
                  className="pn-boton pn-boton--principal flex-1"
                >
                  <Check className="w-4 h-4" />
                  {guardando ? "Guardando…" : mode === "edit" ? "Guardar cambios" : isCompra ? "Guardar" : "Guardar como borrador"}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showNuevoProv && (
          <NuevoProveedorModal
            nombreInicial={provQuery.trim()}
            existentes={proveedores}
            onGuardar={handleNuevoProv}
            onClose={() => setShowNuevoProv(false)}
          />
        )}
      </AnimatePresence>
      {/* Punto 5: "+ Crear insumo" abre el modal de alta y, al guardar, el
          insumo queda en el catálogo y seleccionado en "Agregar insumo". */}
      <AnimatePresence>
        {showNuevoInsumo && (
          <CrearInsumoCompraModal
            nombreInicial={aNombre.trim()}
            insumosExistentes={insumos}
            onGuardar={handleNuevoInsumo}
            categoriasInsumo={categoriasInsumo}
            onClose={() => setShowNuevoInsumo(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showNuevoProducto && (
          <CrearProductoModal
            onClose={() => setShowNuevoProducto(false)}
            onGuardar={handleNuevoProducto}
            nombreInicial={aNombre.trim()}
            productos={productos ?? []}
            categorias={categorias ?? []}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSendConf && (
          <ConfirmModal
            title="¿Confirmas el envío?"
            body={`Enviar OC a ${form.proveedor}.`}
            detail="No podrás editarla después del envío."
            confirmLabel="Enviar"
            icon={
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
            }
            onConfirm={() => { onGuardar(form); setShowSendConf(false); }}
            onCancel={() => setShowSendConf(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
