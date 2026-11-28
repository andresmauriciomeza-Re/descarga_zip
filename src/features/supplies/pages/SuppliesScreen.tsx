import React, { useState, useMemo, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X, Check, Package, AlertTriangle, ChefHat, Download } from "lucide-react";
import { toast } from "sonner";
import { UnidadSelect } from "@/features/purchases/components/UnitSelect";
import {
  OTRA_PRESENTACION_G,
  OTRA_PRESENTACION_ML,
  PRESENTACIONES_INSUMO,
  UNIDADES_INSUMO,
  UNIDADES_Y_PRESENTACIONES_INSUMO,
  resolverPresentacionUnidad,
} from "@/shared/utils/units";
import { BotonDescargarExcel } from "@/shared/components/buttons/DownloadExcelButton";
import { exportarExcelEstilizado } from "@/shared/utils/styledExcelExport";
import { limpiarNumeroInput, numeroDeInput } from "@/shared/utils/numberInput";
// Bloque 3: limpieza y comparación de nombres compartidas con Gestión de
// Productos y el "+ Crear insumo" de Compras (una sola copia de las reglas).
import { mismoNombre, nombreLimpio, nombreParaGuardar, normalizarTexto } from "@/shared/utils/names";
import {
  EstadoSelect,
  ESTADO_ACTIVO_COLOR,
  ESTADO_INACTIVO_COLOR,
} from "@/shared/components/StatusSelect";
import { SearchInput } from "@/shared/components/SearchInput";
import { Paginador } from "@/shared/components/Paginator";
import { ActionIcons } from "@/shared/components/buttons/ActionIcons";
import { AvisoBanner } from "@/shared/components/panel/NoticeBanner";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";
import { BuscadorGrande } from "@/shared/components/panel/LargeSearch";
import { CampoFormulario } from "@/shared/components/panel/FormField";
import { DatosDetalle } from "@/shared/components/panel/DetailData";
import { DialogoConfirmacion } from "@/shared/components/panel/ConfirmDialog";
import { EncabezadoPagina } from "@/shared/components/panel/PageHeader";
import { EstadoPill } from "@/shared/components/panel/StatusPill";
import { FiltrosChips } from "@/shared/components/panel/FilterChips";
import { OpcionesBotones } from "@/shared/components/buttons/OptionButtons";
import { PaginadorGrande } from "@/shared/components/panel/LargePaginator";
import { SeccionFormulario } from "@/shared/components/panel/FormSection";
import { TarjetaFila } from "@/shared/components/panel/RowCard";
import { VacioEstado } from "@/shared/components/panel/EmptyState";
import { FichaTecnicaDetalle, FichaTecnicaEditor } from "@/shared/components/TechnicalSheetEditor";
import {
  copiarFicha,
  emptyFichaVersion,
  fichaDesdeLegacyInsumo,
  fichaTieneCambios,
  idInsumoApiDesdeFront,
  numeroNuevoFicha,
  siguienteNumeroFicha,
  type FichaVersion,
  type FichasPorProducto,
} from "@/shared/utils/technicalSheets";
import {
  actualizarInsumo,
  cambiarEstadoInsumo,
  crearInsumo,
  eliminarInsumo,
  mensajeErrorInsumos,
} from "@/features/supplies/services/suppliesApi";
import { crearFicha, mapearFichaApi, obtenerFichasDe, payloadFicha } from "@/features/products/services/technicalSheetsApi";
import {
  fmtCant,
} from "@/shared/utils/availability";
import { useSupplies } from "@/features/supplies/hooks/useSupplies";
import { estadoStock, PER_PAGE, type Insumo, type ProductoInsumoInsumo } from "@/features/supplies/utils/supplies";
import { type CategoriaInsumo, CATEGORIAS_INSUMO } from "@/features/supplies/utils/supplies";

const formatoCantidad = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const esOtraPresentacion = (valor: string) =>
  valor === OTRA_PRESENTACION_G || valor === OTRA_PRESENTACION_ML;
const etiquetaContenido = (valor: string, contenido: number, unidadBase: "g" | "ml") =>
  PRESENTACIONES_INSUMO.find((presentacion) => presentacion.valor === valor)?.etiqueta ??
  (contenido > 0 ? `${formatoCantidad.format(contenido)} ${unidadBase}` : `… ${unidadBase}`);
const unidadBaseDeSeleccion = (valor: string): "g" | "ml" | null =>
  resolverPresentacionUnidad(valor, 1)?.unidadBase ??
  (valor === OTRA_PRESENTACION_G ? "g" : valor === OTRA_PRESENTACION_ML ? "ml" : null);

/** Estilo de los inputs del modal (comparte lenguaje visual con
    FichaTecnicaEditor, cuya clase por defecto es casi idéntica). */
const ICLS_MODAL =
  "w-full px-3 py-2.5 max-md:min-h-11 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

/** Nombre de la categoría con el catálogo que se pasa por props (API). */
export const categoriaNombreEn = (categorias: CategoriaInsumo[], id: string): string =>
  categorias.find(c => c.id === id)?.nombre ?? "";

/** Categoría lista para mostrar: el nombre solo si el id EXISTE en el
    catálogo; "-" para ids inválidos (los Productos Insumo viejos traen
    "-", u otros ajenos como "CAT-001" de Pizzas). */
export const categoriaDeEn = (categorias: CategoriaInsumo[], id: string): string =>
  categorias.some(c => c.id === id) ? categoriaNombreEn(categorias, id) : "-";

// ─────────────────────────── Tipos ───────────────────────────
export interface ProductoInsumo {
  id: string;
  nombre: string;
  descripcion: string;
  insumos: ProductoInsumoInsumo[];
  tipo: "ProductoInsumo";
}

/** ¿Este Producto Insumo tiene ficha vigente? Las fichas viven en App
    (prop de este componente), no en el módulo. */
const fichaVigente = (fichas: FichasPorProducto, insumo: Insumo): boolean =>
  (fichas[insumo.id] ?? []).some((v) => !v.fechaFin);

// ─────────────────────────── Helpers ───────────────────────────
const fmtCOP = (n: number): string =>
  `$${n.toLocaleString("es-CO")}`;


// ─────────────────────────── Componente ───────────────────────────
interface Props {
  insumos: Insumo[];
  setInsumos: React.Dispatch<React.SetStateAction<Insumo[]>>;
  /** Categorías de insumos desde la API (GET /categorias-insumos). En los
      selectores solo entran las activas; en los listados se muestran todas. */
  categorias: CategoriaInsumo[];
  /** Estado de la carga inicial y su error: "Reintentar" vuelve a llamar a la
      API, nunca a datos de ejemplo. */
  cargando?: boolean;
  errorCarga?: string | null;
  onReintentar?: () => void;
  /** Fichas técnicas única por id de registro (PROD-### / PIN-###). */
  fichas: FichasPorProducto;
  setFichas: React.Dispatch<React.SetStateAction<FichasPorProducto>>;
  /** IDs de registros que pueden tener ficha (productos del menú y Productos
      Insumo): con ellos se numera la siguiente ficha sin huecos. */
  idsConFicha: string[];
  /** Productos del menú (solo id y nombre), para nombrarlos en el diálogo de
      "no se puede eliminar" cuando su ficha vigente usa un registro. */
  productosMenu?: { id: string; nombre: string }[];
  /** Navega a Orden de Producción con el modal ya abierto y este producto
      preseleccionado. */
  abrirOrdenProduccion?: (idProductoInsumo: string) => void;
  /** Recarga insumos, fichas y órdenes desde la API después de una acción que
      movió stock o creó registros (crear producto insumo, cambiar estado…). */
  recargarProduccion?: () => Promise<void>;
  /** "Ver orden" del toast: navega a Orden de Producción con el detalle de
      esa orden ya abierto. */
  verOrdenProduccion?: (idOrden: string) => void;
  /** Lleva a Orden de Compra (botón «Hacer el pedido al proveedor»). */
  abrirOrdenCompra?: () => void;
}

export function GestionInsumosScreen({ insumos, setInsumos, categorias, cargando, errorCarga, onReintentar, fichas, setFichas, idsConFicha, productosMenu = [], abrirOrdenProduccion, recargarProduccion, verOrdenProduccion, abrirOrdenCompra }: Props) {
  // Categorías con las que trabajan el buscador y los selectores: las de la
  // API (por props) o, si la pantalla se abre sin API, el catálogo local.
  const cats = categorias.length > 0 ? categorias : CATEGORIAS_INSUMO;
  const categoriaNombre = (id: string) => categoriaNombreEn(cats, id);
  const categoriaDe = (id: string) => categoriaDeEn(cats, id);
  /** Solo las categorías activas entran en los selectores. */
  const categoriasActivas = cats.filter((c) => c.estado !== false);
  /** id_insumo de la API de una fila de ficha que no trae `insumoId` (fichas
      viejas): resuelve por nombre normalizado contra el catálogo. */
  const idInsumoDeNombre = (nombreFila: string): number | null => {
    const clave = normalizarTexto(nombreFila);
    const ins = insumos.find((i) => normalizarTexto(i.nombre) === clave);
    return ins ? idInsumoApiDesdeFront(ins.id) : null;
  };
  const { search, setSearch, page, setPage, filtroEstado, setFiltroEstado, filtroTipo, setFiltroTipo, filtroStockBajo, setFiltroStockBajo, filtroCategoria, setFiltroCategoria, filtered, paged, insumosStockBajo } = useSupplies(insumos, categoriaNombre);
  const [showModal, setShowModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [detalleItem, setDetalleItem] = useState<Insumo | ProductoInsumo | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  /** Borrado rechazado por el servidor (tiene historial): se explica en un diálogo. */
  const [bloqueoBorrado, setBloqueoBorrado] = useState<{ id: string; nombre: string; mensaje: string } | null>(null);
  /** true = el registro en edición es un Producto Insumo (el tipo del
      formulario queda bloqueado y solo se modifica la ficha técnica). */
  const [editandoProducto, setEditandoProducto] = useState(false);

  // Tipo del formulario del modal: "Insumo" o "Producto insumo".
  const [tipoForm, setTipoForm] = useState<"insumo" | "producto-insumo">("insumo");

  // Form state - compartidos por los dos tipos del modal. La categoría
  // arranca VACÍA y es obligatoria (A5.1): antes venía "Lácteos" ya elegida
  // y se guardaba sin que nadie la eligiera.
  const [nombre, setNombre] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [stockMinimo, setStockMinimo] = useState(0);

  // Form state - solo Insumo
  const [unidad, setUnidad] = useState(UNIDADES_INSUMO[0].valor);
  const [contenidoPresentacion, setContenidoPresentacion] = useState(0);
  const [stockActual, setStockActual] = useState(0);
  /** Peso de medida (cantidad exacta en la unidad elegida, ej. 1200 g).
      0 = vacío. Obligatorio al crear; los insumos antiguos lo traen en
      NULL y se completan al editar. */
  const [pesoMedida, setPesoMedida] = useState(0);

  // Form state - solo Producto Insumo. La ficha técnica única (la comparte
  // con Producción > Productos y con Orden de Producción) es donde vive todo
  // lo editable del PI: tiempo, cantidad a hacer e insumos. La unidad de la
  // ficha es la unidadMedida del registro.
  const [piFicha, setPiFicha] = useState<FichaVersion>(emptyFichaVersion(1));
  const [piUnidadMedida, setPiUnidadMedida] = useState("");

  // Validación en tiempo real: qué campos ya tocó el operador y si ya intentó
  // guardar. Los mensajes se muestran al tocar o al intentar guardar, nunca
  // al abrir el modal con todo vacío.
  const [tocado, setTocado] = useState<Record<string, boolean>>({});
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  // Confirmación
  const [confirmState, setConfirmState] = useState<{
    tipo: "crear-producto" | "cancelar-producto" | "cambiar-estado" | "eliminar" | "no-eliminar" | null;
    mensaje: string;
    id?: string;
    nuevoEstado?: "activo" | "inactivo";
    /** Nombres de los registros (productos del menú o productos insumo) cuya
        ficha VIGENTE usa al registro: solo en el diálogo "no-eliminar". */
    usadosEn?: string[];
  }>({ tipo: null, mensaje: "" });
  /** "Guardando…" mientras habla la API: bloquea el doble clic. */
  const [guardando, setGuardando] = useState(false);

  // Alerta de stock bajo al cargar (A5.5): solo activos, contando los que
  // están en 0 ("Sin stock") y los que llegaron al mínimo ("Stock bajo").
  useEffect(() => {
    const bajos = insumos.filter(i => i.estado === "activo" && estadoStock(i) !== "ok");
    if (bajos.length > 0) {
      const nombres = bajos.map(b => b.nombre).join(", ");
      toast.warning(
        bajos.length === 1
          ? `1 insumo con stock bajo: ${nombres}`
          : `${bajos.length} insumos con stock bajo: ${nombres}`,
        { duration: 2000, icon: <AlertTriangle className="w-4 h-4" /> }
      );
    }
  }, []);




  // Descarga del listado completo (buscador + estado + tipo, sin importar
  // la página actual del paginador).
  const exportExcel = async () => {
    if (filtered.length === 0) {
      toast.error("No hay datos para exportar.");
      return;
    }
    const archivo = await exportarExcelEstilizado({
      datos: filtered,
      nombreHoja: "Insumos",
      nombreArchivo: "insumos",
      titulo: "Insumos",
      columnas: [
        { header: "ID", valor: (i) => i.id },
        { header: "Tipo", valor: (i) => (i.tipo === "ProductoInsumo" ? "Producto insumo" : "Insumo") },
        { header: "Categoría", valor: (i) => categoriaDe(i.categoriaId) },
        { header: "Nombre", valor: (i) => i.nombre },
        { header: "Unidad", valor: (i) => i.unidadMedida },
        { header: "Stock Actual", valor: (i) => i.stockActual, alineacion: "right" },
        { header: "Stock Mínimo", valor: (i) => i.stockMinimo, alineacion: "right" },
        { header: "Costo Unitario", valor: (i) => (i.tipo === "ProductoInsumo" ? "-" : i.costoUnitario), numFmt: "$#,##0", alineacion: "right" },
        { header: "Estado", valor: (i) => (i.estado === "activo" ? "Activo" : "Inactivo"), esEstado: true },
      ],
    });
    void archivo;
    toast.success("Archivo Excel descargado");
  };

  // ─────────────────────────── Validación en tiempo real ───────────────────
  /** ¿Existe ya un insumo o producto insumo con este nombre? Compara con el
      nombre LIMPIO (sin dobles espacios) y sin mayúsculas ni tildes, y
      excluye el registro que se está editando. No usa `resolverInsumo` porque
      ese solo hace trim y no detecta "Salsa  de tomate" como duplicado. */
  const nombreDuplicado = (limpio: string): boolean => {
    const clave = normalizarTexto(limpio);
    if (!clave) return false;
    return insumos.some(
      i => i.id !== editingId && normalizarTexto(i.nombre) === clave,
    );
  };

  /** Errores del formulario del modal, recalculados en cada cambio. */
  const errores = useMemo(() => {
    const e: {
      nombre?: string;
      categoria?: string;
      stockMinimo?: string;
      tiempo?: string;
      cantidad?: string;
      unidad?: string;
      contenidoPresentacion?: string;
      insumos?: string;
      pesoMedida?: string;
    } = {};
    const limpio = nombreLimpio(nombre);
    if (!limpio) e.nombre = "El nombre es obligatorio.";
    else if (nombreDuplicado(limpio))
      e.nombre = "Ya existe un insumo con ese nombre";
    // A5.1: la categoría arranca vacía y hay que elegirla. En edición el
    // campo viene bloqueado con la categoría del registro, así que nunca
    // queda vacío ahí.
    if (!categoriaId) e.categoria = "Selecciona una categoría.";
    if (!Number.isFinite(stockMinimo) || stockMinimo < 0)
      e.stockMinimo = "El stock mínimo no puede ser negativo.";
    if (tipoForm === "producto-insumo") {
      if (!(piFicha.tiempoPreparacion > 0))
        e.tiempo = "El tiempo de preparación debe ser mayor a 0.";
      if (!(piFicha.rendimiento && piFicha.rendimiento > 0))
        e.cantidad = "La cantidad a hacer debe ser mayor a 0.";
      if (!piUnidadMedida) e.unidad = "Selecciona una unidad de medida.";
      if (esOtraPresentacion(piUnidadMedida) && !(contenidoPresentacion > 0))
        e.contenidoPresentacion = "El contenido debe ser mayor a 0.";
      if (!piFicha.insumos.some(r => r.cantidad > 0))
        e.insumos = "Agrega al menos un insumo con cantidad mayor a 0.";
    } else {
      if (esOtraPresentacion(unidad) && !(contenidoPresentacion > 0))
        e.contenidoPresentacion = "El contenido debe ser mayor a 0.";
      // Peso de medida: obligatorio al crear. En edición se tolera vacío
      // SOLO si el registro ya tenía NULL (insumos antiguos) y no se cambió.
      if (pesoMedida < 0) e.pesoMedida = "El peso de medida no puede ser negativo.";
      else if (!(pesoMedida > 0)) {
        const pesoOriginal = editingId
          ? insumos.find(i => i.id === editingId)?.pesoMedida ?? null
          : null;
        if (!(editingId && pesoOriginal == null))
          e.pesoMedida = "El peso de medida es obligatorio.";
      }
    }
    return e;
  }, [nombre, categoriaId, editingId, stockMinimo, tipoForm, piFicha, piUnidadMedida, unidad, contenidoPresentacion, pesoMedida, insumos]);

  /** Marca un campo como tocado en los formularios que validan al salir del campo. */
  const tocar = (campo: string) =>
    setTocado(t => (t[campo] ? t : { ...t, [campo]: true }));

  /** Para Producto Insumo los errores solo aparecen después de intentar guardar. */
  const errorDe = (campo: string, msg?: string): string | undefined =>
    tipoForm === "producto-insumo"
      ? intentoGuardar ? msg : undefined
      : intentoGuardar || tocado[campo] ? msg : undefined;

  const presentacionUnidad = resolverPresentacionUnidad(unidad, contenidoPresentacion);
  const presentacionProducto = resolverPresentacionUnidad(piUnidadMedida, contenidoPresentacion);
  /** Sufijo del campo "Peso de medida": la unidad corta en la que se
      expresa (g/ml cuando es presentación, si no la unidad elegida). */
  const unidadPeso =
    presentacionUnidad?.unidadBase ??
    (esOtraPresentacion(unidad) ? (unidad === OTRA_PRESENTACION_G ? "g" : "ml") : unidad);
  const unidadProductoGuardada = presentacionProducto?.unidadBase ?? piUnidadMedida;
  const cantidadProductoGuardada =
    piFicha.rendimiento && piFicha.rendimiento > 0
      ? piFicha.rendimiento * (presentacionProducto?.contenido ?? 1)
      : 1;
  const etiquetaContenidoProducto = presentacionProducto
    ? etiquetaContenido(piUnidadMedida, presentacionProducto.contenido, presentacionProducto.unidadBase)
    : "";
  const presentacionProductoParaFicha = presentacionProducto
    ? {
        contenido: presentacionProducto.contenido,
        unidadBase: presentacionProducto.unidadBase,
        etiquetaContenido: etiquetaContenidoProducto,
      }
    : undefined;

  const cambiarFichaPI = (sig: FichaVersion) => setPiFicha(sig);

  /** Escribe el nombre sin saltos de línea (tampoco al pegar texto). */
  const escribirNombre = (valor: string) => {
    setNombre(valor.replace(/[\r\n]+/g, " "));
    tocar("nombre");
  };

  // ─────────────────────────── Insumo CRUD (API) ───────────────────────────
  /** Limpia por completo el formulario del modal (al abrir en blanco, al
      guardar y al cancelar el flujo del Producto Insumo). */
  const limpiarFormulario = () => {
    setEditingId(null);
    setEditandoProducto(false);
    setTipoForm("insumo");
    setNombre("");
    setCategoriaId("");
    setStockMinimo(0);
    setUnidad(UNIDADES_INSUMO[0].valor);
    setContenidoPresentacion(0);
    setStockActual(0);
    setPesoMedida(0);
    setPiFicha(emptyFichaVersion(1));
    setPiUnidadMedida("");
    setTocado({});
    setIntentoGuardar(false);
  };

  const openCreate = () => {
    limpiarFormulario();
    setShowModal(true);
  };

  const openEdit = (insumo: Insumo) => {
    if (insumo.estado === "inactivo") {
      toast.error("Activa el insumo para editarlo.");
      return;
    }
    limpiarFormulario();
    setEditingId(insumo.id);
    setNombre(insumo.nombre);
    setStockMinimo(insumo.stockMinimo);
    if (insumo.tipo === "ProductoInsumo") {
      // Editar producto insumo: el modal abre con el Tipo bloqueado y solo
      // se modifica la ficha técnica (tiempo, cantidad a hacer e insumos).
      setEditandoProducto(true);
      setTipoForm("producto-insumo");
      // Los registros viejos traen categoriaId "-" (u otra ajena al catálogo
      // de insumos): se muestra la primera categoría. En edición no se guarda.
      setCategoriaId(
        cats.some(c => c.id === insumo.categoriaId)
          ? insumo.categoriaId
          : cats[0].id,
      );
      // La ficha sale de las versiones guardadas (borrador = copia de la
      // última) o, si aún no existe, de los campos legacy del propio insumo.
      const guardadas = (fichas[insumo.id] ?? []).map(copiarFicha);
      const ultima = guardadas[guardadas.length - 1];
      const base = ultima ?? fichaDesdeLegacyInsumo(insumo);
      const borrador: FichaVersion = base
        ? { ...base, destino: { tipo: "producto-insumo", insumoId: insumo.id } }
        : { ...emptyFichaVersion(1), destino: { tipo: "producto-insumo", insumoId: insumo.id } };
      setPiFicha(borrador);
      setPiUnidadMedida(insumo.unidadMedida);
      setContenidoPresentacion(0);
    } else {
      // Editar insumo normal. Los registros viejos pueden traer un
      // categoriaId ajeno al catálogo: en edición solo se MUESTRA (no se
      // guarda), así que se pinta el primero en vez de un vacío.
      setCategoriaId(
        cats.some(c => c.id === insumo.categoriaId)
          ? insumo.categoriaId
          : cats[0].id,
      );
      setUnidad(insumo.unidadMedida);
      setContenidoPresentacion(0);
      setStockActual(insumo.stockActual);
      setPesoMedida(insumo.pesoMedida ?? 0);
    }
    setShowModal(true);
  };

  /** Cierra el modal y olvida el formulario. */
  const cerrarModal = () => {
    setShowModal(false);
    limpiarFormulario();
  };

  // Bloque 2.4: el historial de versiones de la ficha se pide a la API al abrir
  // el detalle (el estado solo trae la vigente de GET /fichas/vigentes).
  useEffect(() => {
    if (!detalleItem || detalleItem.tipo !== "ProductoInsumo") return;
    const id = detalleItem.id;
    if (!id || !id.startsWith("INS-")) return;
    let cancelado = false;
    void (async () => {
      try {
        const filas = await obtenerFichasDe({ id_insumo: idInsumoApiDesdeFront(id) });
        const versiones = filas
          .map((f) => mapearFichaApi(f, null))
          .sort((a, b) => a.version - b.version);
        if (cancelado || versiones.length === 0) return;
        setFichas((prev) => ({ ...prev, [id]: versiones }));
      } catch {
        // Sin historial se queda con la vigente del estado.
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [detalleItem]);

  const handleSave = async () => {
    setIntentoGuardar(true);
    // Peso de medida: vacío permitido solo si se está editando un insumo
    // antiguo que ya tenía NULL (no se tocó el campo).
    const pesoOriginal = editingId
      ? insumos.find(i => i.id === editingId)?.pesoMedida ?? null
      : null;
    const pesoVacioPermitido = !!editingId && pesoOriginal == null;
    // Si hay errores no se guarda: quedan visibles bajo cada campo.
    if (
      !nombreLimpio(nombre) ||
      !categoriaId ||
      nombreDuplicado(nombreLimpio(nombre)) ||
      !(stockMinimo >= 0) ||
      (esOtraPresentacion(unidad) && !(contenidoPresentacion > 0)) ||
      (tipoForm === "insumo" && !(pesoMedida > 0) && !pesoVacioPermitido)
    ) return;
    if (guardando) return;

    if (editingId) {
      // PUT con nombre, categoría, stock mínimo y descripción (+ IVA
      // si es Insumo). El stock actual lo mueven Compras (suma) y Producción
      // (resta), nunca este formulario. Descripción e IVA no tienen campo en
      // el modal: viajan con su valor actual.
      const original = insumos.find(i => i.id === editingId);
      if (!original) return;
      setGuardando(true);
      try {
        const actualizado = await actualizarInsumo(editingId, {
          nombre: nombreParaGuardar(nombre),
          id_categoria_insumo: Number(categoriaId),
          stock_minimo: stockMinimo,
          descripcion: original.descripcion ?? null,
          ...(original.tipo === "Insumo"
            ? {
                iva: original.iva ?? 0,
                // Se omite si queda vacío (insumo antiguo con NULL): no cambia.
                ...(pesoMedida > 0 ? { peso_medida: pesoMedida } : {}),
              }
            : {}),
        });
        setInsumos(prev => prev.map(i => (i.id === editingId ? actualizado : i)));
        if (estadoStock(actualizado) !== "ok") {
          toast.warning(`Alerta: el stock de ${actualizado.nombre} está bajo (${actualizado.stockActual} ${actualizado.unidadMedida}, mínimo ${actualizado.stockMinimo} ${actualizado.unidadMedida})`, { duration: 2000 });
        } else {
          toast.success(`Insumo "${actualizado.nombre}" actualizado`);
        }
        cerrarModal();
      } catch (error) {
        toast.error(mensajeErrorInsumos(error, "No se pudo actualizar el insumo."));
      } finally {
        setGuardando(false);
      }
      return;
    }

    // Crear insumo normal: el stock nace en 0 (el formulario ya no lo pide) y
    // el registro se arma con la RESPUESTA del servidor.
    setGuardando(true);
    try {
      const creado = await crearInsumo({
        nombre: nombreParaGuardar(nombre),
        tipo: "Insumo",
        id_categoria_insumo: Number(categoriaId),
        unidad_medida: resolverPresentacionUnidad(unidad, contenidoPresentacion)?.unidadBase ?? unidad,
        peso_medida: pesoMedida,
        stock_minimo: stockMinimo * (resolverPresentacionUnidad(unidad, contenidoPresentacion)?.contenido ?? 1),
      });
      setInsumos(prev => [creado.insumo, ...prev]);
      // El stock nace en 0 por diseño, así que solo se avisa si el stock
      // MÍNIMO pedido queda por encima; el aviso permanente es el badge del
      // listado.
      if (creado.insumo.stockActual < creado.insumo.stockMinimo) {
        toast.warning(`Alerta: el stock de ${creado.insumo.nombre} está bajo (${creado.insumo.stockActual} ${creado.insumo.unidadMedida}, mínimo ${creado.insumo.stockMinimo} ${creado.insumo.unidadMedida})`, { duration: 2000 });
      } else {
        toast.success(`Insumo "${creado.insumo.nombre}" creado`);
      }
      cerrarModal();
    } catch (error) {
      // 409 (nombre repetido) o 400: el mensaje del servidor se muestra en el
      // modal y el formulario queda abierto para corregir.
      toast.error(mensajeErrorInsumos(error, "No se pudo crear el insumo."));
    } finally {
      setGuardando(false);
    }
  };

  const handleDelete = async (id: string) => {
    const reg = insumos.find(i => i.id === id);
    try {
      await eliminarInsumo(id);
    } catch (error) {
      // Con historial el servidor responde 409 ("…tiene historial. Desactívalo."):
      // se explica en un diálogo en vez de un aviso que desaparece.
      setBloqueoBorrado({
        id,
        nombre: reg?.nombre ?? "",
        mensaje: mensajeErrorInsumos(error, "No se pudo eliminar el insumo."),
      });
      return;
    }
    setInsumos(prev => {
      const next = prev.filter(i => i.id !== id);
      // Si la página actual queda vacía, retroceder
      const totalPagesAfter = Math.ceil(next.length / PER_PAGE);
      if (page > totalPagesAfter && totalPagesAfter > 0) {
        setPage(totalPagesAfter);
      }
      return next;
    });
    toast.success(
      reg?.tipo === "ProductoInsumo"
        ? "Producto insumo eliminado correctamente"
        : "Insumo eliminado correctamente",
    );
  };

  // ─────────────────────────── Estado Activo/Inactivo ───────────────────────────
  const toggleEstado = (id: string) => {
    const insumo = insumos.find(i => i.id === id);
    if (!insumo) return;
    const nuevoEstado = insumo.estado === "activo" ? "inactivo" : "activo";
    setConfirmState({
      tipo: "cambiar-estado",
      mensaje: nuevoEstado === "inactivo"
        ? `¿Deseas inactivar el insumo "${insumo.nombre}"?`
        : `¿Deseas activar el insumo "${insumo.nombre}"?`,
      id,
      nuevoEstado,
    });
  };

  // ─────────────────────────── Producto Insumo ───────────────────────────
  /** Cambia el tipo del formulario del modal. Conserva el Nombre escrito (y
      la categoría y el stock mínimo, que son comunes a los dos tipos) y
      limpia los campos propios del tipo que se abandona. */
  const cambiarTipo = (siguiente: string) => {
    if (editingId) return; // al editar el tipo queda bloqueado
    const tipo = siguiente as "insumo" | "producto-insumo";
    if (tipo === tipoForm) return;
    if (tipo === "producto-insumo") {
      // Campos propios del insumo normal que no aplican aquí.
      setUnidad(UNIDADES_INSUMO[0].valor);
      setStockActual(0);
      // La unidad de la ficha arranca vacía: es un campo obligatorio.
      setPiUnidadMedida("");
      setContenidoPresentacion(0);
    } else {
      // Campos propios del producto insumo que no aplican aquí.
      setPiFicha(emptyFichaVersion(1));
      setPiUnidadMedida("");
      setContenidoPresentacion(0);
    }
    setTipoForm(tipo);
    setTocado({});
    setIntentoGuardar(false);
  };

  const handleGuardarProducto = () => {
    setIntentoGuardar(true);
    // Los errores se muestran solo después de intentar guardar la ficha.
    const e = errores;
    const primerError = [
      { mensaje: e.nombre, selector: '[data-producto-insumo-campo="nombre"]' },
      { mensaje: e.categoria, selector: '[data-producto-insumo-campo="categoria"]' },
      { mensaje: e.unidad, selector: '[data-producto-insumo-campo="unidad"]' },
      { mensaje: e.contenidoPresentacion, selector: '[data-producto-insumo-campo="contenidoPresentacion"]' },
      { mensaje: e.stockMinimo, selector: '[data-producto-insumo-campo="stockMinimo"]' },
      { mensaje: e.tiempo, selector: '[data-producto-insumo-campo="tiempo"]' },
      { mensaje: e.cantidad, selector: '[data-producto-insumo-campo="cantidad"]' },
      { mensaje: e.insumos, selector: '[data-producto-insumo-campo="insumos"]' },
    ].find((campo) => Boolean(campo.mensaje));
    if (primerError) {
      document.querySelector<HTMLElement>(primerError.selector)?.focus();
      return;
    }
    setConfirmState({
      tipo: "crear-producto",
      mensaje: editandoProducto ? "¿Deseas guardar los cambios?" : "¿Deseas crear este producto insumo?",
    });
  };

  const handleCancelarProducto = () => {
    setConfirmState({
      tipo: "cancelar-producto",
      mensaje: "¿Deseas cancelar? Se perderán los datos ingresados.",
    });
  };

  const ejecutarConfirmacion = async () => {
    if (confirmState.tipo === "crear-producto") {
      if (guardando) return;
      if (editandoProducto) {
        if (!editingId) return;
        // Editar producto insumo: la ficha técnica se guarda contra la API
        // como VERSIÓN NUEVA (el servidor responde `sinCambios` si el
        // contenido era el mismo y entonces no hay versión que mostrar).
        const original = insumos.find(i => i.id === editingId);
        if (!original) return;
        setGuardando(true);
        try {
          const fichaNueva = await crearFicha(
            payloadFicha(
              piFicha,
              { id_insumo: idInsumoApiDesdeFront(editingId), unidadMedida: piUnidadMedida },
              (fila) =>
                fila.insumoId?.startsWith("INS-")
                  ? idInsumoApiDesdeFront(fila.insumoId)
                  : idInsumoDeNombre(fila.nombre),
            ),
          );
          setFichas(prev => ({ ...prev, [editingId]: [mapearFichaApi(fichaNueva, null)] }));
          toast.success(
            fichaNueva.sinCambios
              ? `Producto Insumo "${original.nombre}" actualizado (la ficha no cambió)`
              : `Producto Insumo "${original.nombre}" actualizado`,
          );
          cerrarModal();
        } catch (error) {
          toast.error(mensajeErrorInsumos(error, "No se pudo guardar la ficha técnica."));
        } finally {
          setGuardando(false);
        }
      } else {
        // Crear producto insumo: la receta y la orden Pendiente se guardan
        // aunque el stock actual no alcance; la disponibilidad se valida al iniciar.
        setGuardando(true);
        try {
          const creado = await crearInsumo({
            nombre: nombreParaGuardar(nombre),
            tipo: "Producto insumo",
            id_categoria_insumo: Number(categoriaId),
            unidad_medida: unidadProductoGuardada,
            stock_minimo: stockMinimo * (presentacionProducto?.contenido ?? 1),
            ficha: {
              cantidad: cantidadProductoGuardada,
              tiempo_preparacion: piFicha.tiempoPreparacion,
              pasos: piFicha.pasos,
              insumos: piFicha.insumos
                .filter((r) => r.cantidad > 0)
                .map((r) => ({
                  id_insumo: idInsumoDeNombre(r.nombre) ?? (r.insumoId ? idInsumoApiDesdeFront(r.insumoId) : 0),
                  cantidad: r.cantidad,
                  medida: r.unidad,
                })),
            },
            crear_orden_produccion: true,
          });
          setInsumos(prev => [creado.insumo, ...prev]);
          if (creado.ficha) {
            const fichaV1 = creado.ficha;
            setFichas(prev => ({ ...prev, [creado.insumo.id]: [fichaV1] }));
          }
          // Las órdenes cambiaron (nació la de este producto insumo).
          await recargarProduccion?.();
          toast.success(
            creado.ordenId
              ? `Producto insumo «${creado.insumo.nombre}» creado y enviado a Orden de Producción (${creado.ordenId})`
              : `Producto Insumo "${creado.insumo.nombre}" creado`,
            creado.ordenId
              ? {
                  action: {
                    label: "Ver orden",
                    onClick: () => verOrdenProduccion?.(creado.ordenId!),
                  },
                }
              : {
                  action: {
                    label: "Programar producción",
                    onClick: () => abrirOrdenProduccion?.(creado.insumo.id),
                  },
                },
          );
          cerrarModal();
        } catch (error) {
          toast.error(mensajeErrorInsumos(error, "No se pudo crear el producto insumo."));
        } finally {
          setGuardando(false);
        }
      }
    } else if (confirmState.tipo === "cancelar-producto") {
      cerrarModal();
    } else if (confirmState.tipo === "cambiar-estado" && confirmState.id && confirmState.nuevoEstado) {
      const id = confirmState.id;
      const nuevoEstado = confirmState.nuevoEstado;
      setGuardando(true);
      try {
        const actualizado = await cambiarEstadoInsumo(id, nuevoEstado === "activo");
        setInsumos(prev => prev.map(i => (i.id === id ? actualizado : i)));
        toast.success(`Estado actualizado`);
      } catch (error) {
        toast.error(mensajeErrorInsumos(error, "No se pudo actualizar el estado."));
      } finally {
        setGuardando(false);
      }
    } else if (confirmState.tipo === "eliminar" && confirmState.id) {
      // Reutiliza handleDelete: mantiene el retroceso de página si queda
      // vacía, filtros y buscador intactos, y el recálculo de stock bajo.
      await handleDelete(confirmState.id);
    }
    setConfirmState({ tipo: null, mensaje: "" });
  };

  const cancelarConfirmacion = () => {
    setConfirmState({ tipo: null, mensaje: "" });
  };

  /** Al hacer clic en el basurero: si el registro está en ALGUNA ficha
      técnica VIGENTE (versión con fechaFin === null, de un producto insumo o
      de un producto del menú) NO se puede eliminar: se abre el diálogo
      informativo "no-eliminar" con los nombres reales de los que lo usan.
      Una fila de ficha "usa" al registro por insumoId; las fichas viejas sin
      insumoId comparan por nombre normalizado (`normalizarTexto`, mismo
      criterio que `mismoNombre`). */
  const intentarEliminar = (id: string) => {
    const reg = insumos.find(i => i.id === id);
    if (!reg) return;
    const clave = normalizarTexto(reg.nombre);
    const usadosEn: string[] = [];
    for (const [idRegistro, versiones] of Object.entries(fichas)) {
      const vigente = versiones.find(v => v.fechaFin === null);
      if (!vigente) continue;
      const loUsa = vigente.insumos.some(r =>
        r.insumoId ? r.insumoId === id : normalizarTexto(r.nombre) === clave,
      );
      if (!loUsa) continue;
      const nombreDueno =
        insumos.find(i => i.id === idRegistro)?.nombre ??
        productosMenu.find(p => p.id === idRegistro)?.nombre;
      if (nombreDueno && !usadosEn.includes(nombreDueno)) usadosEn.push(nombreDueno);
    }
    if (usadosEn.length > 0) {
      setConfirmState({ tipo: "no-eliminar", mensaje: "", id, usadosEn });
      return;
    }
    setConfirmState({ tipo: "eliminar", mensaje: "", id });
  };

  // Registro que espera el diálogo de "eliminar" (si ese es el flujo activo).
  const regAEliminar =
    confirmState.tipo === "eliminar" && confirmState.id
      ? insumos.find(i => i.id === confirmState.id) ?? null
      : null;

  // ─────────────────────────── Render ───────────────────────────
  const etiquetaTipo = (i: Insumo) => (i.tipo === "ProductoInsumo" ? "Lo preparamos aquí" : "Se compra");

  /** Barra de stock: roja si hay que comprar, verde si alcanza y gris si está apagado. */
  const barraStock = (insumo: Insumo) => {
    const stock = estadoStock(insumo);
    const apagado = insumo.estado === "inactivo";
    const color = apagado ? "var(--borde-campo)" : stock === "ok" ? "var(--verde)" : "var(--rojo)";
    const relleno = insumo.stockMinimo > 0
      ? Math.max(0, Math.min(1, insumo.stockActual / insumo.stockMinimo))
      : insumo.stockActual > 0 ? 1 : 0;
    const frase = apagado
      ? "Apagado · no se cuenta para comprar"
      : stock === "sin-stock" ? "Se acabó · comprar"
        : stock === "bajo" ? "Por debajo del mínimo · comprar"
          : "Alcanza bien";
    return (
      <div className="pn-stock">
        <div className="pn-stock__nums">
          <span>Hay {fmtCant(insumo.stockActual, insumo.unidadMedida)}</span>
          <span>Mínimo {fmtCant(insumo.stockMinimo, insumo.unidadMedida)}</span>
        </div>
        <div
          className="pn-stock__barra"
          role="img"
          aria-label={`Hay ${fmtCant(insumo.stockActual, insumo.unidadMedida)} y el mínimo es ${fmtCant(insumo.stockMinimo, insumo.unidadMedida)}`}
        >
          <div style={{ width: `${Math.round(relleno * 100)}%`, background: color }} />
        </div>
        <p className="pn-stock__frase" style={{ color: apagado ? "var(--gris-texto)" : stock === "ok" ? "var(--verde-texto)" : "var(--rojo-texto)" }}>
          {frase}
        </p>
      </div>
    );
  };

  // Un solo grupo de botones para los filtros de siempre (estado, tipo, aviso de
  // stock bajo) más la categoría.
  const chip = filtroStockBajo ? "comprar"
    : filtroEstado === "inactivos" ? "apagados"
      : filtroTipo === "insumos" ? "compra"
        : filtroTipo === "productos" ? "preparamos"
          : filtroCategoria ? `cat:${filtroCategoria}` : "todos";
  const cambiarChip = (v: string) => {
    setPage(1);
    setFiltroStockBajo(v === "comprar");
    setFiltroEstado(v === "apagados" ? "inactivos" : "todos");
    setFiltroTipo(v === "compra" ? "insumos" : v === "preparamos" ? "productos" : "todos");
    setFiltroCategoria(v.startsWith("cat:") ? v.slice(4) : "");
  };

  const cerrarDetalle = () => setShowDetalleModal(false);
  const nombresAComprar = insumosStockBajo.slice(0, 4).map(i => i.nombre).join(", ")
    + (insumosStockBajo.length > 4 ? ` y ${insumosStockBajo.length - 4} más` : "");

  // Qué dialogo de confirmación toca (apagar, encender, borrar, salir sin guardar…).
  const regConfirm = confirmState.id ? insumos.find(i => i.id === confirmState.id) ?? null : null;
  const nombreConfirm = regConfirm?.nombre ?? "";
  const bloqueo =
    confirmState.tipo === "no-eliminar"
      ? {
          id: confirmState.id,
          nombre: nombreConfirm,
          razones: [`Se usa en las recetas de: ${(confirmState.usadosEn ?? []).join(", ")}`],
        }
      : bloqueoBorrado
        ? { id: bloqueoBorrado.id, nombre: bloqueoBorrado.nombre, razones: [bloqueoBorrado.mensaje] }
        : null;
  const cerrarBloqueo = () => { setBloqueoBorrado(null); cancelarConfirmacion(); };
  const regBloqueo = bloqueo?.id ? insumos.find(i => i.id === bloqueo.id) ?? null : null;

  const sufijoMinimo = tipoForm === "producto-insumo"
    ? (presentacionProducto
        ? ` (× ${etiquetaContenidoProducto})`
        : esOtraPresentacion(piUnidadMedida)
          ? ` (× ${etiquetaContenido(piUnidadMedida, contenidoPresentacion, unidadBaseDeSeleccion(piUnidadMedida)!)})`
          : piUnidadMedida ? ` (${piUnidadMedida})` : "")
    : (presentacionUnidad
        ? ` (× ${etiquetaContenido(unidad, presentacionUnidad.contenido, presentacionUnidad.unidadBase)})`
        : esOtraPresentacion(unidad)
          ? ` (× ${etiquetaContenido(unidad, contenidoPresentacion, unidadBaseDeSeleccion(unidad)!)})`
          : "");

  const esPI = tipoForm === "producto-insumo";
  const unidadForm = esPI ? piUnidadMedida : unidad;
  const presentacionForm = esPI ? presentacionProducto : presentacionUnidad;
  const campoBloqueado = "bg-muted/50 text-muted-foreground cursor-not-allowed";

  return (
    <div className="pn-contenido">
      <EncabezadoPagina
        titulo="Insumos"
        descripcion="Lo que hay en la bodega para cocinar y cuánto queda de cada cosa"
        acciones={
          <>
            <BotonAccion icono={Download} onClick={exportExcel}>Descargar en Excel</BotonAccion>
            <BotonAccion variante="principal" icono={Plus} onClick={openCreate}>Agregar un insumo</BotonAccion>
          </>
        }
      />

      {insumosStockBajo.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <AvisoBanner
            titulo={`Hay que comprar ${insumosStockBajo.length} ${insumosStockBajo.length === 1 ? "insumo" : "insumos"}`}
            boton={abrirOrdenCompra ? <BotonAccion onClick={abrirOrdenCompra}>Hacer el pedido al proveedor</BotonAccion> : undefined}
          >
            {nombresAComprar}
          </AvisoBanner>
        </div>
      )}

      <div className="grid gap-4 mb-6">
        <BuscadorGrande
          etiqueta="Buscar un insumo"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Escribe el nombre o la categoría"
        />
        <FiltrosChips
          valor={chip}
          onChange={cambiarChip}
          opciones={[
            { valor: "todos", etiqueta: "Todos" },
            ...(insumosStockBajo.length > 0 ? [{ valor: "comprar", etiqueta: "Hay que comprar", contador: insumosStockBajo.length }] : []),
            ...categoriasActivas.map(c => ({ valor: `cat:${c.id}`, etiqueta: c.nombre })),
            { valor: "compra", etiqueta: "Se compra" },
            { valor: "preparamos", etiqueta: "Lo preparamos aquí" },
            { valor: "apagados", etiqueta: "Apagados" },
          ]}
        />
      </div>

      {cargando ? (
        <p role="status" className="pn-nota">Cargando los insumos…</p>
      ) : errorCarga ? (
        <AvisoBanner
          titulo="No pudimos cargar los insumos"
          boton={onReintentar ? <BotonAccion onClick={onReintentar}>Intentar de nuevo</BotonAccion> : undefined}
        >
          {errorCarga}
        </AvisoBanner>
      ) : paged.length === 0 ? (
        <VacioEstado icono={Package} titulo="No encontramos ningún insumo">
          Revisa cómo lo escribiste, cambia el filtro o agrega uno nuevo con «Agregar un insumo».
        </VacioEstado>
      ) : (
        <div className="pn-lista">
          {paged.map(insumo => {
            const apagado = insumo.estado === "inactivo";
            return (
              <TarjetaFila
                key={insumo.id}
                resaltada={!apagado && estadoStock(insumo) !== "ok" ? "rojo" : undefined}
                nombre={insumo.nombre}
                detalle={`${categoriaDe(insumo.categoriaId)} · ${etiquetaTipo(insumo)}`}
                centro={barraStock(insumo)}
                estado={<EstadoPill tono={apagado ? "gris" : "verde"}>{apagado ? "Apagado" : "Activo"}</EstadoPill>}
                acciones={
                  <BotonAccion variante="normal" onClick={() => { setDetalleItem(insumo); setShowDetalleModal(true); }}>
                    Ver y cambiar
                  </BotonAccion>
                }
              />
            );
          })}
        </div>
      )}

      <PaginadorGrande pagina={page} total={filtered.length} porPagina={PER_PAGE} onCambiar={setPage} />

      {/* ───────────── Formulario crear / cambiar (el mismo para los dos) ───────────── */}
      {showModal && (
        <Dialog.Root open onOpenChange={abierto => { if (!abierto) (esPI ? handleCancelarProducto() : cerrarModal()); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="pn-dialogo-fondo" />
            <Dialog.Content className="pn-modal" aria-describedby={undefined} onInteractOutside={e => e.preventDefault()}>
              <div className="pn-modal__cab">
                <Dialog.Title className="pn-modal__titulo">
                  {editingId ? `Cambiar «${nombre}»` : "Agregar un insumo"}
                </Dialog.Title>
              </div>

              <div className="grid gap-5" style={{ maxWidth: "61.25rem" }}>
                <SeccionFormulario numero={1} titulo="¿Cómo se consigue?" ayuda={editingId ? "Esto no se puede cambiar después de creado." : undefined}>
                  <OpcionesBotones
                    etiqueta="Cómo se consigue"
                    valor={tipoForm}
                    onChange={cambiarTipo}
                    deshabilitado={!!editingId}
                    opciones={[
                      { valor: "insumo", etiqueta: "Se compra" },
                      { valor: "producto-insumo", etiqueta: "Lo preparamos aquí" },
                    ]}
                  />
                </SeccionFormulario>

                <SeccionFormulario numero={2} titulo="Sus datos" ayuda={editingId ? (editandoProducto ? "Aquí solo se puede cambiar la receta." : "Aquí solo se puede cambiar cuánto trae cada paquete y el mínimo.") : undefined}>
                  <div className="pn-grilla">
                    <CampoFormulario etiqueta="Nombre" error={errorDe("nombre", errores.nombre)}>
                      {(p) => (
                        <input
                          {...p}
                          data-producto-insumo-campo="nombre"
                          value={nombre}
                          onChange={e => escribirNombre(e.target.value)}
                          placeholder={esPI ? "Ej: Guacamole" : "Ej: Queso mozzarella"}
                          disabled={!!editingId}
                        />
                      )}
                    </CampoFormulario>

                    <CampoFormulario etiqueta="Categoría" error={errorDe("categoria", errores.categoria)}>
                      {(p) => (
                        <select
                          {...p}
                          data-producto-insumo-campo="categoria"
                          value={categoriaId}
                          onChange={e => { setCategoriaId(e.target.value); tocar("categoria"); }}
                          onBlur={() => tocar("categoria")}
                          disabled={!!editingId}
                        >
                          <option value="">Escoge una categoría</option>
                          {categoriasActivas.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>
                      )}
                    </CampoFormulario>

                    <CampoFormulario
                      etiqueta="Se mide en"
                      error={esPI ? errorDe("unidad", errores.unidad) : undefined}
                    >
                      <div className="flex items-start gap-2">
                        <UnidadSelect
                          value={unidadForm}
                          onChange={(value) => {
                            if (esPI) setPiUnidadMedida(value); else setUnidad(value);
                            setContenidoPresentacion(0);
                          }}
                          disabled={!!editingId}
                          unidades={UNIDADES_Y_PRESENTACIONES_INSUMO}
                          placeholder="Escoge la unidad"
                          ariaLabel="Se mide en"
                          dataField={esPI ? "unidad" : undefined}
                          mostrarValorSeleccionadoCorto
                          fieldClassName={`h-[3.75rem] border-2 border-[var(--borde-campo)] rounded-[0.875rem] text-[1.25rem] ${editingId ? campoBloqueado : "bg-white text-foreground"}`}
                        />
                        {esOtraPresentacion(unidadForm) && (
                          <div className="relative w-40 shrink-0">
                            <input
                              type="number"
                              min={0.01}
                              step={0.01}
                              data-producto-insumo-campo="contenidoPresentacion"
                              value={contenidoPresentacion || ""}
                              placeholder="¿Cuánto trae?"
                              aria-label="Contenido"
                              onChange={(e) => setContenidoPresentacion(numeroDeInput(limpiarNumeroInput(e.target.value)))}
                              style={{ paddingRight: "2.75rem" }}
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground">
                              {unidadForm === OTRA_PRESENTACION_G ? "g" : "ml"}
                            </span>
                          </div>
                        )}
                      </div>
                      {esOtraPresentacion(unidadForm) && errorDe("contenidoPresentacion", errores.contenidoPresentacion) && (
                        <p className="pn-campo__error" role="alert"><span>{errores.contenidoPresentacion}</span></p>
                      )}
                    </CampoFormulario>

                    {!esPI && (
                      <CampoFormulario
                        etiqueta="¿Cuánto trae cada paquete?"
                        ayuda={`En ${unidadPeso === "g" ? "gramos" : unidadPeso === "ml" ? "mililitros" : unidadPeso}. Ej.: una bolsa de 500 g`}
                        error={errorDe("pesoMedida", errores.pesoMedida)}
                      >
                        {(p) => (
                          <div className="relative">
                            <input
                              {...p}
                              type="number"
                              min={0.01}
                              step={0.01}
                              value={pesoMedida === 0 ? "" : pesoMedida}
                              placeholder="Ej: 500"
                              onChange={e => {
                                setPesoMedida(numeroDeInput(limpiarNumeroInput(e.target.value)));
                                tocar("pesoMedida");
                              }}
                              onBlur={() => tocar("pesoMedida")}
                              style={{ paddingRight: "3.5rem" }}
                            />
                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base text-muted-foreground">
                              {unidadPeso}
                            </span>
                          </div>
                        )}
                      </CampoFormulario>
                    )}

                    <CampoFormulario
                      etiqueta={`Avísame cuando quede menos de${sufijoMinimo}`}
                      ayuda={presentacionForm ? `${formatoCantidad.format(stockMinimo)} × ${esPI ? etiquetaContenidoProducto : etiquetaContenido(unidad, presentacionForm.contenido, presentacionForm.unidadBase)} = ${formatoCantidad.format(stockMinimo * presentacionForm.contenido)} ${presentacionForm.unidadBase}` : undefined}
                      error={errorDe("stockMinimo", errores.stockMinimo)}
                    >
                      {(p) => (
                        <input
                          {...p}
                          type="number"
                          data-producto-insumo-campo="stockMinimo"
                          min={0}
                          step={presentacionForm || esOtraPresentacion(unidadForm) ? 0.01 : undefined}
                          value={stockMinimo === 0 ? "" : stockMinimo}
                          placeholder="0"
                          onChange={e => {
                            setStockMinimo(numeroDeInput(limpiarNumeroInput(e.target.value)));
                            tocar("stockMinimo");
                          }}
                          onBlur={() => tocar("stockMinimo")}
                          disabled={esPI && !!editingId}
                        />
                      )}
                    </CampoFormulario>

                    {!esPI && editingId && (
                      <CampoFormulario etiqueta="Hay ahora en bodega" ayuda="Esto lo mueven las compras y la cocina, no se cambia aquí.">
                        {(p) => <input {...p} type="number" value={stockActual === 0 ? "" : stockActual} placeholder="0" disabled />}
                      </CampoFormulario>
                    )}
                  </div>
                </SeccionFormulario>

                {esPI && (
                  <SeccionFormulario
                    numero={3}
                    titulo="Receta (ficha técnica)"
                    ayuda="Cuánto sale de cada tanda, cuánto se demora y qué insumos lleva."
                  >
                    <div className="pn-ficha">
                      <FichaTecnicaEditor
                        ficha={piFicha}
                        onChange={cambiarFichaPI}
                        insumos={insumos}
                        modo="insumo"
                        inputCls={ICLS_MODAL}
                        /* La cantidad a hacer se expresa en la unidad elegida
                           aquí al lado (la del propio Producto Insumo). */
                        unidadCantidad={
                          presentacionProducto
                            ? undefined
                            : esOtraPresentacion(piUnidadMedida)
                              ? undefined
                              : piUnidadMedida || undefined
                        }
                        presentacionCantidad={presentacionProductoParaFicha}
                        errorTiempo={errorDe("tiempo", errores.tiempo)}
                        errorCantidad={errorDe("cantidad", errores.cantidad)}
                        errorInsumos={errorDe("insumos", errores.insumos)}
                      />
                    </div>
                  </SeccionFormulario>
                )}

                <div className="pn-dialogo__botones" style={{ justifyContent: "flex-start" }}>
                  <BotonAccion variante="normal" onClick={esPI ? handleCancelarProducto : cerrarModal}>Cancelar</BotonAccion>
                  <BotonAccion
                    variante="principal"
                    icono={Check}
                    disabled={guardando}
                    onClick={esPI ? handleGuardarProducto : handleSave}
                  >
                    {guardando ? "Guardando…" : editingId ? "Guardar cambios" : "Agregar el insumo"}
                  </BotonAccion>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {/* ───────────── Ver y cambiar (detalle) ───────────── */}
      {showDetalleModal && detalleItem && (() => {
        const d = detalleItem as Insumo;
        const esProd = d.tipo === "ProductoInsumo";
        const apagado = d.estado === "inactivo";
        const stock = estadoStock(d);
        const guardadas = esProd ? (fichas[d.id] ?? []) : [];
        const fv = esProd ? (guardadas.length > 0 ? guardadas[guardadas.length - 1] : fichaDesdeLegacyInsumo(d)) : null;
        return (
          <Dialog.Root open onOpenChange={abierto => { if (!abierto) cerrarDetalle(); }}>
            <Dialog.Portal>
              <Dialog.Overlay className="pn-dialogo-fondo" />
              <Dialog.Content className="pn-modal pn-modal--medio" aria-describedby={undefined}>
                <div className="pn-modal__cab">
                  <Dialog.Title className="pn-modal__titulo">{d.nombre}</Dialog.Title>
                  {apagado
                    ? <EstadoPill tono="gris">Apagado</EstadoPill>
                    : <EstadoPill tono={stock === "ok" ? "verde" : "rojo"}>{stock === "ok" ? "Alcanza bien" : "Hay que comprar"}</EstadoPill>}
                </div>
                <p className="pn-seccion__ayuda" style={{ marginTop: "-0.375rem" }}>{categoriaDe(d.categoriaId)} · {etiquetaTipo(d)}</p>

                <div className="grid gap-4">
                  <SeccionFormulario titulo="Cuánto hay">
                    <DatosDetalle datos={[
                      { etiqueta: "Hay en bodega", valor: fmtCant(d.stockActual, d.unidadMedida) },
                      { etiqueta: "Mínimo en bodega", valor: fmtCant(d.stockMinimo, d.unidadMedida) },
                      ...(!esProd ? [
                        { etiqueta: "Cada paquete trae", valor: d.pesoMedida != null ? `${formatoCantidad.format(d.pesoMedida)} ${d.unidadMedida}` : "—" },
                        { etiqueta: "Costo", valor: fmtCOP(d.costoUnitario) },
                        { etiqueta: "IVA", valor: d.iva !== null ? `${d.iva}%` : "—" },
                      ] : [
                        { etiqueta: "Rinde cada tanda", valor: fv?.rendimiento && fv.rendimiento > 0 ? `${formatoCantidad.format(fv.rendimiento)} ${d.unidadMedida}` : "—" },
                        { etiqueta: "Se demora", valor: fv && fv.tiempoPreparacion > 0 ? `${fv.tiempoPreparacion} min` : "—" },
                      ]),
                    ]} />
                  </SeccionFormulario>

                  {esProd && (
                    <SeccionFormulario titulo="Receta (ficha técnica)">
                      {fv && fv.insumos.length > 0 ? (
                        <div className="pn-permisos">
                          {fv.insumos.map((r, i) => (
                            <div key={`${r.nombre}-${i}`} className="pn-permisos__fila" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                              <strong>{r.nombre}</strong>
                              <span>{formatoCantidad.format(r.cantidad)} {r.unidad}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="pn-seccion__ayuda">Todavía no tiene receta. Regístrala con «Cambiar datos».</p>
                      )}
                    </SeccionFormulario>
                  )}
                </div>

                <div className="pn-dialogo__botones" style={{ marginTop: "1.125rem", justifyContent: "flex-start" }}>
                  {esProd && (
                    <BotonAccion
                      variante="principal"
                      icono={ChefHat}
                      disabled={!fichaVigente(fichas, d) || apagado}
                      title={apagado ? "Está apagado" : !fichaVigente(fichas, d) ? "Registra su receta primero" : undefined}
                      onClick={() => { cerrarDetalle(); abrirOrdenProduccion?.(d.id); }}
                    >
                      Programar una tanda
                    </BotonAccion>
                  )}
                  <BotonAccion
                    variante="normal"
                    disabled={apagado}
                    title={apagado ? "Enciéndelo para poder cambiarlo" : undefined}
                    onClick={() => { cerrarDetalle(); openEdit(d); }}
                  >
                    Cambiar datos
                  </BotonAccion>
                  <BotonAccion variante="normal" onClick={() => { cerrarDetalle(); toggleEstado(d.id); }}>
                    {apagado ? "Encender" : "Apagar"}
                  </BotonAccion>
                  <BotonAccion variante="peligro" onClick={() => { cerrarDetalle(); intentarEliminar(d.id); }}>Borrar</BotonAccion>
                  <BotonAccion variante="oscuro" onClick={cerrarDetalle}>Cerrar</BotonAccion>
                </div>
                {apagado && <p className="pn-campo__ayuda" style={{ marginTop: "0.625rem" }}>Para cambiar sus datos, primero enciéndelo.</p>}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        );
      })()}

      {/* ───────────── Confirmaciones ───────────── */}
      {bloqueo ? (
        <DialogoConfirmacion
          variante="bloqueo"
          abierto
          onCambiarAbierto={a => { if (!a) cerrarBloqueo(); }}
          titulo={`No se puede borrar «${bloqueo.nombre}»`}
          porQueNo={[...bloqueo.razones, "Lo que ya tiene movimientos no se borra: se apaga y queda guardado"]}
          textoAlternativa={regBloqueo?.estado === "activo" ? "Apagarlo en vez de borrarlo" : undefined}
          onAlternativa={() => { if (bloqueo.id) toggleEstado(bloqueo.id); }}
        />
      ) : confirmState.tipo === "eliminar" ? (
        <DialogoConfirmacion
          abierto
          onCambiarAbierto={a => { if (!a) cancelarConfirmacion(); }}
          titulo={`¿Borrar «${nombreConfirm}»?`}
          queVaAPasar={["Se borra para siempre", "No se puede deshacer"]}
          textoAccion="Sí, borrar"
          onConfirmar={() => { if (!guardando) void ejecutarConfirmacion(); }}
        />
      ) : confirmState.tipo === "cambiar-estado" ? (
        confirmState.nuevoEstado === "inactivo" ? (
          <DialogoConfirmacion
            abierto
            onCambiarAbierto={a => { if (!a) cancelarConfirmacion(); }}
            titulo={`¿Apagar «${nombreConfirm}»?`}
            queVaAPasar={["Deja de salir en las listas y en las recetas nuevas", "Lo que hay en bodega no se borra", "Lo puedes volver a encender cuando quieras"]}
            textoAccion="Sí, apagar"
            onConfirmar={() => { if (!guardando) void ejecutarConfirmacion(); }}
          />
        ) : (
          <DialogoConfirmacion
            abierto
            onCambiarAbierto={a => { if (!a) cancelarConfirmacion(); }}
            titulo={`¿Volver a encender «${nombreConfirm}»?`}
            queVaAPasar={["Vuelve a salir en las listas y en las recetas nuevas", "Se cuenta de nuevo para saber qué hay que comprar"]}
            textoSeguro="No, dejarlo apagado"
            textoAccion="Sí, encender"
            onConfirmar={() => { if (!guardando) void ejecutarConfirmacion(); }}
          />
        )
      ) : confirmState.tipo === "crear-producto" ? (
        <DialogoConfirmacion
          abierto
          onCambiarAbierto={a => { if (!a) cancelarConfirmacion(); }}
          titulo={editandoProducto ? "¿Guardar los cambios de la receta?" : "¿Agregar este insumo con su receta?"}
          queVaAPasar={editandoProducto
            ? ["Se guarda la receta nueva", "Las tandas ya hechas no cambian"]
            : ["Se guarda el insumo con su receta", "Se manda una orden a la cocina para preparar la primera tanda"]}
          textoSeguro="No, volver a revisar"
          textoAccion={editandoProducto ? "Sí, guardar" : "Sí, agregarlo"}
          onConfirmar={() => { if (!guardando) void ejecutarConfirmacion(); }}
        />
      ) : confirmState.tipo === "cancelar-producto" ? (
        <DialogoConfirmacion
          abierto
          onCambiarAbierto={a => { if (!a) cancelarConfirmacion(); }}
          titulo="¿Salir sin guardar?"
          queVaAPasar={["Se pierde lo que escribiste", "El insumo no se guarda"]}
          textoSeguro="No, seguir escribiendo"
          textoAccion="Sí, salir sin guardar"
          onConfirmar={() => void ejecutarConfirmacion()}
        />
      ) : null}
    </div>
  );
}
