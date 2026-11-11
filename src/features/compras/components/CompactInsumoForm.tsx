import React, { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { UnidadSelect, type OpcionUnidad } from "@/features/compras/components/UnidadSelect";
import { ETIQUETA_MODO_IVA, MODOS_IVA, ayudaModoIva, type ModoIva } from "@/features/compras/services/iva";
import {
  PRESENTACIONES_COMPRA,
  esEmpaque,
  factorDePresentacion,
  guardarPresentacion,
  factorUnidadDirecta,
  listarPresentaciones,
  mensajeErrorPresentaciones,
  unidadesCompatibles,
  type PresentacionConfigurada,
} from "@/features/compras/services/presentaciones";
import { UNIDADES_INSUMO } from "@/shared/utils/unidades";

const SERIF = "var(--font-titulo)";

/* Re-export (para no romper a quien lo importa desde aquí). La constante vive
   en shared/utils/unidades: leerla aquí arriba, en el ciclo
   UnidadSelect ⇄ CompactInsumoForm, lanzaba "Cannot access 'UNIDADES' before
   initialization" y dejaba la app en blanco. */
export { UNIDADES } from "@/shared/utils/unidades";

/** Labels de las guías: 13px en gris oscuro (los títulos de sección van en
 *  `seccionCls` de cada formulario). */
const labelCls = "block text-[13px] font-medium text-foreground/70 mb-1.5";

/** Mismo estilo que los inputs del formulario pero con 40px EXACTOS de alto:
 *  `px-3 py-2.5` con border da 42px, así que aquí se fija `h-10` (todos los
 *  controles de la fila miden lo mismo, incluido el botón). */
const compactInputCls =
  "w-full h-10 px-3 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const readOnlyInputCls =
  "w-full h-10 px-3 bg-muted/40 border border-border rounded-xl text-sm text-muted-foreground cursor-default";

/** Select de Medida a la misma altura (40px) que el resto de la fila. */
const unidadCampoCls = "bg-muted border border-border text-foreground h-10";

export interface InsumoSuggestion {
  id: string;
  nombre: string;
  unidadMedida: string;
  costoUnitario: number;
  /** Presentación de la bebida ("1.5 L", "400 ml"): va en la segunda línea
   *  de la sugerencia para distinguir presentaciones del mismo producto. */
  contenido?: string;
}

export interface CompactInsumoFormValues {
  cantidad: number;
  precio: number;
  iva: number;
  modoIva?: ModoIva;
  /** Presentaciones (regla 2.2): cuántas unidades base trae cada unidad de
   *  la presentación, cuando la línea se compra en un empaque configurado. */
  factorPresentacion?: number;
  precioVenta?: number;
  unidadBase?: string;
}

function fmtCompactCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

function numeroDesdeTexto(texto: string): number {
  const normalizado = texto.trim().replace(",", ".");
  return normalizado === "" ? Number.NaN : Number(normalizado);
}

export interface CompactInsumoFormProps {
  titulo: string;
  nombre: string;
  onNombreChange: (value: string) => void;
  onNombreFocus: () => void;
  cantidad: number;
  unidad: string;
  onUnidadChange: (value: string) => void;
  unidadDisabled?: boolean;
  precio: number;
  iva?: number;
  onAgregar: (values: CompactInsumoFormValues) => void | Promise<void>;
  suggestions: InsumoSuggestion[];
  showSuggestions: boolean;
  onSelectSuggestion: (suggestion: InsumoSuggestion) => void;
  onCrearInsumo?: () => void;
  containerRef?: React.Ref<HTMLDivElement>;
  readOnly?: boolean;
  /** Bloquea todo el bloque "Agregar insumo" (campos y botón). */
  disabled?: boolean;
  /** Pantalla completa: el mismo bloque con un poco menos de aire (p-3 y
   *  mb-2) para que el formulario entero quepa en 1366×768 sin scroll. */
  compacto?: boolean;
  placeholder?: string;
  buttonLabel?: string;
  /** Variante "compacta": borde punteado, campos en una fila, cantidad sin
   *  stepper y botón debajo alineado a la izquierda. Igual que la sección
   *  "Agregar insumo no solicitado" de Recepción de compra. */
  variante?: "normal" | "compacta";
  /** Modo edición (lápiz de la tabla): al pasar `onCancelar` se pinta un
   *  botón secundario "Cancelar" junto al principal; su callback limpia el
   *  formulario y sale del modo edición. Sin la prop no se pinta nada y los
   *  demás usos quedan idénticos. */
  onCancelar?: () => void;
  /** P11: en la Nueva compra la unidad NO se elige a mano: siempre es la del
   *  insumo seleccionado (o "und"), así que el select de Medida se oculta. */
  ocultarMedida?: boolean;
  /** Punto 3.3 (Orden de Compra): la Medida se muestra como texto de SOLO
   *  LECTURA — la define el ítem del catálogo y no se edita ni al agregar ni
   *  al editar una fila. Sustituye al UnidadSelect sin ocultar el campo. */
  medidaSoloLectura?: boolean;
  /** P14: control propio del formulario que ocupa el hueco de Medida (p. ej.
   *  el selector de tipo de ítem Insumo / Producto de la Nueva compra). Va sin
   *  envolver: quien lo pasa define su propio label, ancho y controles. */
  campoExtra?: React.ReactNode;
  /** Control opcional junto al título del bloque (p. ej. Insumo/Producto). */
  headerExtra?: React.ReactNode;
  /** P14: al estar agregando PRODUCTOS no tiene sentido el atajo
   *  "+ Crear insumo" del desplegable de sugerencias. */
  ocultarCrearInsumo?: boolean;
  /** Callback para crear producto desde el buscador (cuando se agrega producto). */
  onCrearProducto?: () => void;
  /** Ocultar opción de crear producto. */
  ocultarCrearProducto?: boolean;
  /** Precio de VENTA al público del producto elegido. Se muestra SOLO cuando
   *  `mostrarPrecioVenta` es true (líneas de tipo producto); la Orden de
   *  Compra no lo pasa, así que ese formulario queda intacto. Es dato
   *  informativo para el detalle: la factura sigue calculando con el monto
    *  unitario. */
   precioVenta?: number;
   /** Muestra el campo "Precio de venta" (sólo al agregar PRODUCTOS). */
  mostrarPrecioVenta?: boolean;
   /** Etiqueta del campo de nombre según el catálogo actual. */
   etiquetaNombre?: string;
  /** Punto B2: precio de venta inválido (vacío, 0 o ≤ monto unitario). Pinta
   *  el campo en rojo, muestra el mensaje bajo la fila y deshabilita el
   *  botón Agregar: un producto nunca se agrega sin precio de venta válido. */
  factorCostoUnidad?: number;
  /** Presentaciones (Fase 4): id del insumo seleccionado en el catálogo
   *  ("INS-12"). Con él se leen/guardan sus presentaciones configuradas. */
  insumoId?: string;
  /** Unidad base del insumo seleccionado: define las medidas compatibles
   *  (caso A) y la pregunta "¿Cuántas {unidad base} trae cada {presentación}?". */
  unidadBase?: string;
  /** Habilita elegir la unidad base cuando el insumo se creará al recibir. */
  unidadBaseEditable?: boolean;
  /** Factor guardado en una línea adicional que se está editando. */
  factorPresentacionInicial?: number;
  /** Presentación asociada al factor inicial. */
  presentacionInicial?: string;
  /** Etiqueta del campo de unidad. En Compras se pasa "Presentación". */
  etiquetaUnidad?: string;
  /** IVA por línea controlado por la pantalla: al elegir otro insumo la
   *  pantalla lo resetea al valor por defecto ("incluido"); con la prop el
   *  formulario no guarda estado propio del modo. */
  modoIva?: ModoIva;
  ivaAntesDeExento?: number;
  onModoIvaChange?: (modo: ModoIva) => void;
}

export function CompactInsumoForm({
  titulo,
  nombre,
  onNombreChange,
  onNombreFocus,
  cantidad,
  unidad,
  onUnidadChange,
  unidadDisabled = false,
  precio,
  iva,
  onAgregar,
  onCancelar,
  suggestions,
  showSuggestions,
  onSelectSuggestion,
  onCrearInsumo,
  onCrearProducto,
  containerRef,
  readOnly = false,
  disabled = false,
  compacto = false,
  placeholder = "Buscar insumo...",
  buttonLabel = "Agregar",
  variante = "normal",
  ocultarMedida = false,
  medidaSoloLectura = false,
  campoExtra,
  headerExtra,
  ocultarCrearInsumo = false,
  ocultarCrearProducto = false,
  precioVenta = 0,
  mostrarPrecioVenta = false,
  etiquetaNombre = "Insumo",
  factorCostoUnidad = 1,
  insumoId,
  unidadBase,
  unidadBaseEditable = false,
  factorPresentacionInicial,
  presentacionInicial,
  etiquetaUnidad = "Medida",
  modoIva: modoIvaControlado,
  ivaAntesDeExento: ivaAntesDeExentoInicial,
  onModoIvaChange,
}: CompactInsumoFormProps) {
  const esCompacta = variante === "compacta";
  const [cantidadTexto, setCantidadTexto] = useState(String(cantidad));
  const [precioTexto, setPrecioTexto] = useState(precio ? String(precio) : "");
  const [ivaTexto, setIvaTexto] = useState(iva == null ? "" : String(iva));
  const [precioVentaTexto, setPrecioVentaTexto] = useState(precioVenta ? String(precioVenta) : "");
  // IVA por línea: si la pantalla controla el modo (prop `modoIva`), éste es
  // el estado; si no, el formulario guarda el suyo (retrocompatibilidad).
  const [modoInterno, setModoInterno] = useState<ModoIva>("incluido");
  const [intentoAgregar, setIntentoAgregar] = useState(false);

  // Presentaciones configuradas del insumo seleccionado (GET presentaciones).
  const [presentaciones, setPresentaciones] = useState<PresentacionConfigurada[]>([]);
  const [contenidoTexto, setContenidoTexto] = useState("");
  const [medidaContenido, setMedidaContenido] = useState("");
  const [guardandoPresentacion, setGuardandoPresentacion] = useState(false);
  /** Bloquea los controles mientras se guarda una presentación. */
  const bloqueado = readOnly || disabled || guardandoPresentacion;

  const modoIvaActual: ModoIva = modoIvaControlado ?? modoInterno;
  const opcionesModoIva: OpcionUnidad[] = MODOS_IVA.map((value) => ({
    valor: value,
    etiqueta: ETIQUETA_MODO_IVA[value].etiqueta,
    ayuda: ayudaModoIva(value),
  }));
  /** % guardado antes de entrar en "Exento": se restaura al salir. */
  const [ivaAntesDeExento, setIvaAntesDeExento] = useState<string>(
    ivaAntesDeExentoInicial == null ? "" : String(ivaAntesDeExentoInicial),
  );

  useEffect(() => {
    setIvaAntesDeExento(
      ivaAntesDeExentoInicial == null ? "" : String(ivaAntesDeExentoInicial),
    );
  }, [ivaAntesDeExentoInicial]);

  const cambiarModo = (nuevo: ModoIva) => {
    if (nuevo === modoIvaActual) return;
    if (nuevo === "exento") {
      setIvaAntesDeExento(ivaTexto.trim() === "" ? "" : ivaTexto);
      setIvaTexto("0");
    } else if (modoIvaActual === "exento" && ivaAntesDeExento !== "") {
      setIvaTexto(ivaAntesDeExento);
      setIvaAntesDeExento("");
    }
    if (modoIvaControlado === undefined) setModoInterno(nuevo);
    onModoIvaChange?.(nuevo);
    setIntentoAgregar(false);
  };

  // Presentaciones configuradas del insumo seleccionado.
  useEffect(() => {
    let vivo = true;
    if (!insumoId) {
      setPresentaciones([]);
      return;
    }
    listarPresentaciones(insumoId)
      .then((lista) => {
        if (vivo) setPresentaciones(lista);
      })
      .catch((error: unknown) => {
        if (vivo) {
          setPresentaciones([]);
          toast.error(
            mensajeErrorPresentaciones(
              error,
              "No se pudieron cargar las presentaciones del insumo.",
            ),
          );
        }
      });
    return () => {
      vivo = false;
    };
  }, [insumoId]);

  // Unidad base del insumo seleccionado (presentaciones): se define aquí
  // arriba porque la lista de opciones del desplegable también la usa.
  const baseUnidad = (unidadBase ?? "").trim();
  const medidasBase = UNIDADES_INSUMO.filter(
    ({ valor }) => !esEmpaque(valor),
  );
  const baseUnidadLegada = Boolean(baseUnidad) && !medidasBase.some(
    ({ valor }) => valor === baseUnidad,
  );

  // Opciones del selector: unidades compatibles y los empaques permitidos.
  const opcionesUnidad: OpcionUnidad[] = (() => {
    const compatibles = baseUnidad ? unidadesCompatibles(baseUnidad) : [];
    const lista: OpcionUnidad[] = compatibles.map((u) => ({ valor: u, etiqueta: u }));
    const vistas = new Set(lista.map((o) => o.valor));
    if (unidadBaseEditable) {
      medidasBase.forEach(({ valor, etiqueta }) => {
        if (vistas.has(valor)) return;
        vistas.add(valor);
        lista.push({ valor, etiqueta });
      });
    }
    PRESENTACIONES_COMPRA.forEach((empaque) => {
      if (vistas.has(empaque)) return;
      vistas.add(empaque);
      const configurada = presentaciones.find((p) => p.presentacion === empaque);
      lista.push({
        valor: empaque,
        etiqueta: configurada
          ? `${empaque} ×${configurada.unidadesBase} ${baseUnidad}`
          : empaque,
        divisorAntes: empaque === PRESENTACIONES_COMPRA[0],
      });
    });
    // La unidad actual de la fila se conserva aunque no esté en la lista
    // (p. ej. "Paca x12" al editar una línea de producto).
    if (unidad && !vistas.has(unidad)) {
      lista.push({ valor: unidad, etiqueta: unidad, divisorAntes: lista.length > 0 });
    }
    return lista;
  })();

  const requiereContenido =
    esEmpaque(unidad) && !medidaSoloLectura && unidad !== baseUnidad;
  const opcionesMedidaContenido: OpcionUnidad[] = medidasBase.filter(({ valor }) =>
    unidadBaseEditable
      ? true
      : !baseUnidadLegada && unidadesCompatibles(baseUnidad).includes(valor),
  );

  useEffect(() => {
    if (!requiereContenido) {
      setContenidoTexto("");
      setMedidaContenido("");
      return;
    }

    const configurada = presentaciones.find((p) => p.presentacion === unidad);
    const factorInicial =
      unidad === presentacionInicial ? factorPresentacionInicial : undefined;
    const factorPrecargado = configurada?.unidadesBase ?? factorInicial;
    setContenidoTexto(factorPrecargado != null ? String(factorPrecargado) : "");
    setMedidaContenido(baseUnidad && !baseUnidadLegada ? baseUnidad : "");
  }, [
    unidad,
    baseUnidad,
    baseUnidadLegada,
    unidadBaseEditable,
    requiereContenido,
    presentaciones,
    factorPresentacionInicial,
    presentacionInicial,
  ]);

  useEffect(() => {
    setCantidadTexto(String(cantidad));
  }, [cantidad]);

  useEffect(() => {
    setPrecioTexto(precio ? String(precio) : "");
  }, [precio]);

  useEffect(() => {
    setIvaTexto(iva == null ? "" : String(iva));
  }, [iva]);

  useEffect(() => {
    setPrecioVentaTexto(precioVenta ? String(precioVenta) : "");
  }, [precioVenta]);

  const cantidadNumero = numeroDesdeTexto(cantidadTexto);
  const precioNumero = precioTexto.trim() === "" ? 0 : numeroDesdeTexto(precioTexto);
  const ivaVacio = ivaTexto.trim() === "";
  const ivaNumero = ivaVacio ? Number.NaN : numeroDesdeTexto(ivaTexto);
  const ivaParaCalculo = Number.isFinite(ivaNumero) ? ivaNumero : 0;
  const precioVentaNumero =
    precioVentaTexto.trim() === "" ? 0 : numeroDesdeTexto(precioVentaTexto);

  // ── Presentaciones (regla 2.2) ─────────────────────────────────────────────
  const medidaBaseContenido = baseUnidad || (unidadBaseEditable ? medidaContenido : "");
  const contenido = numeroDesdeTexto(contenidoTexto);
  const conversionContenido = factorUnidadDirecta(medidaContenido, medidaBaseContenido);
  const factorCalculado =
    Number.isFinite(contenido) &&
    contenido > 0 &&
    conversionContenido != null
      ? contenido * conversionContenido
      : null;
  const factorDirecto =
    baseUnidad !== "" ? factorDePresentacion(unidad, baseUnidad, presentaciones) : null;
  const factorPresentacion = requiereContenido ? factorCalculado : factorDirecto;
  // Respaldo: el empaque del producto ("Paca x12" ⇒ 12) o unidad suelta (1).
  const factorLinea =
    factorPresentacion ??
    (Number.isFinite(factorCostoUnidad) && factorCostoUnidad > 0 ? factorCostoUnidad : 1);
  const errorFactor = requiereContenido
    ? baseUnidadLegada
      ? `No se puede configurar ${unidad}: la unidad base histórica "${baseUnidad}" no es compatible con empaques nuevos.`
      : !medidaBaseContenido
        ? "Selecciona la medida del insumo."
        : !Number.isFinite(contenido) || contenido <= 0 || conversionContenido == null
          ? "Ingresa un contenido mayor que cero y una medida compatible."
          : ""
    : esEmpaque(unidad) && !baseUnidad
      ? "Selecciona la unidad base del insumo para configurar el empaque."
      : esEmpaque(unidad) && (factorPresentacion == null || factorPresentacion <= 0)
        ? `Configura el contenido de cada ${unidad}.`
        : "";
  const faltaFactor = errorFactor !== "";

  const costoConIva =
    (modoIvaActual === "mas_iva" ? precioNumero * (1 + ivaParaCalculo / 100) : precioNumero) /
    Math.max(1e-9, factorLinea);
  const errorPrecioVenta =
    mostrarPrecioVenta && nombre.trim()
      ? !Number.isFinite(precioVentaNumero) || precioVentaNumero <= 0
        ? "Ingresa el precio de venta del producto."
        : precioVentaNumero <= costoConIva
          ? "El precio de venta debe ser mayor que el costo por unidad con IVA."
          : undefined
      : undefined;
  // Validación en tiempo real: el campo vacío no grita en rojo, pero en cuanto
  // se escribe algo inválido (o se intenta agregar) se avisa.
  const errorCantidad =
    (intentoAgregar || cantidadTexto.trim() !== "") &&
    (!Number.isFinite(cantidadNumero) || cantidadNumero <= 0)
      ? "La cantidad debe ser mayor que cero."
      : "";
  const errorPrecio =
    (intentoAgregar || precioTexto.trim() !== "") &&
    (!Number.isFinite(precioNumero) || precioNumero <= 0)
      ? "El monto unitario debe ser mayor que cero."
      : "";
  const errorIva =
    modoIvaActual !== "exento" && (intentoAgregar || !ivaVacio)
      ? ivaVacio
        ? "Ingresa el IVA."
        : !Number.isFinite(ivaNumero) || ivaNumero < 0 || ivaNumero > 100
          ? "El IVA debe estar entre 0 y 100."
          : ""
      : "";
  // Ayuda bajo la fila: qué entra al inventario y a qué costo por unidad base
  // (ej. "= 20 kg al inventario · costo $2.500/kg").
  const baseTotal = Number((cantidadNumero * factorLinea).toFixed(2));
  const ayudaLinea =
    medidaBaseContenido &&
    Number.isFinite(baseTotal) &&
    baseTotal > 0 &&
    Number.isFinite(precioNumero) &&
    precioNumero > 0
      ? `= ${baseTotal.toLocaleString("es-CO", { maximumFractionDigits: 2 })} ${medidaBaseContenido} al inventario · costo ${fmtCompactCOP(precioNumero / factorLinea)}/${medidaBaseContenido}`
      : "";

  /** Requisitos de la fila; el intento muestra los errores y nunca agrega datos inválidos. */
  const puedeAgregar =
    !bloqueado &&
    Number.isFinite(cantidadNumero) &&
    cantidadNumero > 0 &&
    Number.isFinite(precioNumero) &&
    precioNumero > 0 &&
    (modoIvaActual === "exento" ||
      (!ivaVacio && Number.isFinite(ivaNumero) && ivaNumero >= 0 && ivaNumero <= 100)) &&
    !faltaFactor &&
    !(
      mostrarPrecioVenta &&
      (!Number.isFinite(precioVentaNumero) ||
        precioVentaNumero <= 0 ||
        precioVentaNumero <= costoConIva)
    );

  const agregarValidado = async () => {
    setIntentoAgregar(true);
    if (!puedeAgregar) return;
    if (
      requiereContenido &&
      insumoId &&
      /^INS-\d+$/.test(insumoId) &&
      factorPresentacion != null
    ) {
      const actual = presentaciones.find((p) => p.presentacion === unidad);
      if (actual?.unidadesBase !== factorPresentacion) {
        setGuardandoPresentacion(true);
        try {
          const guardada = await guardarPresentacion(insumoId, unidad, factorPresentacion);
          setPresentaciones((prev) => [
            ...prev.filter((p) => p.presentacion !== guardada.presentacion),
            guardada,
          ]);
        } catch (error) {
          toast.error(
            mensajeErrorPresentaciones(error, "No se pudo guardar la presentación."),
          );
          setGuardandoPresentacion(false);
          return;
        }
        setGuardandoPresentacion(false);
      }
    }

    try {
      await onAgregar({
        cantidad: cantidadNumero,
        precio: precioNumero,
        iva: modoIvaActual === "exento" ? 0 : ivaNumero,
        modoIva: modoIvaActual,
        ...(esEmpaque(unidad) && factorPresentacion != null ? { factorPresentacion } : {}),
        ...(esEmpaque(unidad)
          ? { unidadBase: baseUnidad || medidaContenido || undefined }
          : {}),
        ...(mostrarPrecioVenta ? { precioVenta: precioVentaNumero } : {}),
      });
      setIntentoAgregar(false);
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "No se pudo agregar el ítem.",
      );
    }
  };

  // Estilos para la variante compacta
  const contenedorCls = esCompacta
    ? "p-3 bg-muted/30 border border-border rounded-xl"
    : `${compacto ? "p-1.5" : "p-4"} bg-muted/40 border border-border rounded-xl`;

  const tituloCls = `font-bold text-primary-foreground m-0 ${esCompacta ? "text-xs" : "text-sm"}`;

  const inputClsCompacta = "w-full h-9 px-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30";
  const labelClsCompacta = "block text-[11px] font-semibold text-muted-foreground mb-1";
  const headerMargin = esCompacta
    ? "-mx-3 -mt-3"
    : compacto
      ? "-mx-1.5 -mt-1.5"
      : "-mx-4 -mt-4";

  return (
    <div ref={containerRef} className={contenedorCls}>
      {titulo && (
        <div
          className={`${headerMargin} mb-3 flex items-center justify-between gap-3 rounded-t-xl bg-primary px-3 py-2 text-primary-foreground`}
        >
          <h3 className={tituloCls} style={esCompacta ? undefined : { fontFamily: SERIF }}>
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              {titulo}
            </span>
          </h3>
        </div>
      )}
      {headerExtra && <div className="mb-2">{headerExtra}</div>}
      {campoExtra && <div className="mb-2">{campoExtra}</div>}

      <div className="relative">
        <div className={`flex flex-wrap items-start gap-2 ${disabled ? "opacity-50" : ""}`}>
          {/* Nombre */}
          <div className={`relative ${esCompacta ? "flex-[2_1_150px] min-w-[140px]" : "basis-[26%] min-w-[180px] grow"}`}>
            <label className={esCompacta ? labelClsCompacta : labelCls}>{etiquetaNombre}</label>

            <div className="relative">
              <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none ${esCompacta ? "" : "left-3 w-4 h-4"}`} />

              <input
                value={nombre}
                onChange={(e) => onNombreChange(e.target.value)}
                onFocus={bloqueado ? undefined : onNombreFocus}
                placeholder={readOnly ? "Solo lectura" : placeholder}
                readOnly={readOnly}
                disabled={disabled}
                className={`${readOnly ? readOnlyInputCls : esCompacta ? inputClsCompacta : compactInputCls} ${esCompacta ? "pl-8" : "pl-9"}`}
              />
            </div>

            {!readOnly && !disabled && showSuggestions && (
              <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                {/* "+ Crear insumo" es SIEMPRE la primera opción para que
                    "+" no esconda el botón de alta de insumo. */}
                {!ocultarCrearInsumo && onCrearInsumo && (
                  <button
                    type="button"
                    onMouseDown={() => onCrearInsumo()}
                    className="w-full text-left px-3 py-2.5 text-xs font-semibold text-primary hover:bg-primary/10 cursor-pointer inline-flex items-center gap-2 border-b border-border"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Crear insumo {nombre.trim() && `“${nombre.trim()}”`}
                  </button>
                )}
                {/* Bloque 2.2: si el texto no coincide con nada se avisa. */}
                {suggestions.length === 0 && (
                  <div className="px-3 py-2.5 text-xs text-muted-foreground text-center">
                    Sin resultados
                  </div>
                )}
                {suggestions.map((ins) => (
                  <button
                    key={ins.id}
                    type="button"
                    onMouseDown={() => onSelectSuggestion(ins)}
                    className="w-full text-left px-3 py-2.5 text-xs hover:bg-muted cursor-pointer border-b border-border last:border-0"
                  >
                    <p className="font-semibold text-foreground">{ins.nombre}</p>
                    {/* Contenido ("1.5 L") + medida + monto: para las bebidas
                        la medida es la presentación de compra
                        ("Paca x12") y el monto el precio de esa paca. */}
                    <p className="text-muted-foreground">
                      {[ins.contenido, ins.unidadMedida, fmtCompactCOP(ins.costoUnitario)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </button>
                ))}
                {/* Bloque 2.2: "+ Crear producto «texto»" al FINAL de la lista
                    y SÓLO cuando el texto no coincide con ningún producto —
                    crear está bien donde se escribe el nombre, pero no debe
                    tapar a los existentes. `onMouseDown` igual que los otros
                    atajos: dispara antes de que el blur cierre el desplegable. */}
                {!ocultarCrearProducto &&
                  onCrearProducto &&
                  suggestions.length === 0 &&
                  nombre.trim() !== "" && (
                    <button
                      type="button"
                      onMouseDown={() => onCrearProducto()}
                      className="w-full text-left px-3 py-2.5 text-xs font-semibold text-primary hover:bg-primary/10 cursor-pointer inline-flex items-center gap-2 border-t border-border"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Crear producto {`“${nombre.trim()}”`}
                    </button>
                  )}
              </div>
            )}
          </div>

          {/* Presentación — unidades compatibles y empaques configurables. */}
          {!ocultarMedida && (
            <div className={esCompacta ? "w-[96px] flex-none" : "w-[132px]"}>
              <label className={esCompacta ? labelClsCompacta : labelCls}>
                {etiquetaUnidad}
              </label>

              {medidaSoloLectura ? (
                /* Punto 3.3: texto de solo lectura — la medida la define el
                   ítem del catálogo, no se edita ni al agregar ni al editar. */
                <div
                  title="La medida la define el ítem del catálogo"
                  className={
                    (esCompacta
                      ? "w-full h-9 px-2.5 rounded-lg text-sm "
                      : "w-full h-10 px-3 rounded-xl text-sm ") +
                    "bg-muted/40 border border-border text-muted-foreground flex items-center cursor-default select-none"
                  }
                >
                  {unidad}
                </div>
              ) : (
                <UnidadSelect
                  value={unidad}
                  onChange={onUnidadChange}
                  disabled={bloqueado || unidadDisabled}
                  ariaLabel={etiquetaUnidad}
                  // Sin insumo seleccionado (o sin unidad base conocida) se
                  // conserva el catálogo completo de Compras.
                  unidades={
                    baseUnidad || presentaciones.length > 0 || unidadBaseEditable
                      ? opcionesUnidad
                      : undefined
                  }
                  fieldClassName={
                    readOnly
                      ? "bg-muted/40 border border-border text-foreground h-10"
                      : esCompacta
                        ? "bg-muted border border-border text-foreground h-9 rounded-lg"
                        : unidadCampoCls
                  }
                />
              )}
              {errorFactor && !requiereContenido && (
                <p className="mt-1 text-[10px] text-destructive">{errorFactor}</p>
              )}
              {factorPresentacion != null && factorPresentacion > 0 && medidaBaseContenido && (
                <p className="mt-1 text-[10px] text-muted-foreground whitespace-nowrap">
                  1 {unidad} = {factorPresentacion.toLocaleString("es-CO", { maximumFractionDigits: 4 })} {medidaBaseContenido}
                </p>
              )}
            </div>
          )}

          {/* Cantidad permanece como texto hasta que se intenta agregar. */}
          {esCompacta ? (
            <div className="w-[70px] flex-none">
              <label className={labelClsCompacta}>Cantidad</label>
              <input
                type="text"
                inputMode="decimal"
                value={cantidadTexto}
                onChange={(e) => {
                  setCantidadTexto(e.target.value);
                  setIntentoAgregar(false);
                }}
                disabled={bloqueado}
                className={`${inputClsCompacta}${errorCantidad ? " border-destructive" : ""}`}
              />
              {errorCantidad && <p className="mt-1 text-[10px] text-destructive">{errorCantidad}</p>}
            </div>
          ) : (
            <div className="w-[112px]">
              <label className={labelCls}>Cantidad</label>
              <input
                type="text"
                inputMode="decimal"
                value={cantidadTexto}
                onChange={(e) => {
                  setCantidadTexto(e.target.value);
                  setIntentoAgregar(false);
                }}
                disabled={bloqueado}
                className={`${compactInputCls} text-center${errorCantidad ? " border-destructive" : ""}`}
              />
              {errorCantidad && <p className="mt-1 text-[10px] text-destructive">{errorCantidad}</p>}
            </div>
          )}

          {requiereContenido && (
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <div className="w-[120px]">
                <label className={esCompacta ? labelClsCompacta : labelCls}>Contenido</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={contenidoTexto}
                  onChange={(event) => {
                    setContenidoTexto(event.target.value);
                    setIntentoAgregar(false);
                  }}
                  placeholder="Ej. 12"
                  disabled={bloqueado || guardandoPresentacion}
                  className={`${esCompacta ? inputClsCompacta : compactInputCls}${
                    errorFactor ? " border-destructive" : ""
                  }`}
                />
              </div>
              <div className="w-[160px]">
                <label className={esCompacta ? labelClsCompacta : labelCls}>Medida</label>
                <UnidadSelect
                  value={medidaContenido}
                  onChange={(value) => {
                    setMedidaContenido(value);
                    setIntentoAgregar(false);
                  }}
                  disabled={bloqueado || guardandoPresentacion || opcionesMedidaContenido.length === 0}
                  ariaLabel="Medida del contenido"
                  placeholder="Seleccionar..."
                  unidades={opcionesMedidaContenido}
                  fieldClassName={
                    esCompacta
                      ? "bg-muted border border-border text-foreground h-9 rounded-lg"
                      : unidadCampoCls
                  }
                />
              </div>
              {errorFactor && (
                <p className="w-full text-[10px] text-destructive">{errorFactor}</p>
              )}
            </div>
          )}

          {/* Monto unitario comienza la segunda fila. */}
          <div className={`flex-none ${esCompacta ? "w-[110px]" : "w-[116px]"}`}>
            <label className={esCompacta ? labelClsCompacta : labelCls}>Monto unitario</label>

            <input
              type="text"
              inputMode="decimal"
              value={precioTexto}
              onChange={(e) => {
                setPrecioTexto(e.target.value);
                setIntentoAgregar(false);
              }}
              placeholder="0"
              disabled={bloqueado}
              className={`${readOnly ? readOnlyInputCls : esCompacta ? inputClsCompacta : compactInputCls}${errorPrecio ? " border-destructive" : ""}`}
            />
            {errorPrecio && <p className="mt-1 text-[10px] text-destructive">{errorPrecio}</p>}
          </div>

          <div className={`${esCompacta ? "w-[160px] flex-none" : "w-[180px]"}`}>
            <label className={esCompacta ? labelClsCompacta : labelCls}>Tipo de IVA</label>
            <UnidadSelect
              value={modoIvaActual}
              onChange={(value) => {
                const modo = MODOS_IVA.find((opcion) => opcion === value);
                if (modo) cambiarModo(modo);
              }}
              disabled={bloqueado}
              ariaLabel="Tipo de IVA"
              unidades={opcionesModoIva}
              fieldClassName={
                esCompacta
                  ? "bg-muted border border-border text-foreground h-9 rounded-lg"
                  : unidadCampoCls
              }
            />
          </div>

          {modoIvaActual !== "exento" && (
            <div className={`${esCompacta ? "w-[76px] flex-none" : "w-[88px]"}`}>
              <label className={esCompacta ? labelClsCompacta : labelCls}>IVA</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={ivaTexto}
                  onChange={(e) => {
                    setIvaTexto(e.target.value);
                    setIntentoAgregar(false);
                  }}
                  placeholder="0"
                  disabled={bloqueado}
                  className={`${readOnly ? readOnlyInputCls : esCompacta ? inputClsCompacta : compactInputCls} pr-6${errorIva ? " border-destructive" : ""}`}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              {errorIva && <p className="mt-1 text-[10px] text-destructive">{errorIva}</p>}
              {!bloqueado && (
                <div className="flex gap-1 mt-1">
                  {[0, 5, 19].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setIvaTexto(String(v));
                        setIntentoAgregar(false);
                      }}
                      className={`min-w-[20px] h-5 px-1 rounded border text-[10px] font-semibold transition-colors ${
                        ivaNumero === v
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Precio de venta al público del producto: sólo se pinta al
              agregar PRODUCTOS (la Orden de Compra no lo usa). Es OBLIGATORIO
              (punto B2): con `errorPrecioVenta` el campo se pinta en rojo. */}
          {mostrarPrecioVenta && (
            <div className={`${esCompacta ? "w-[110px] flex-none" : "w-[116px]"}`}>
              <label className={esCompacta ? labelClsCompacta : labelCls}>
                Precio de venta
              </label>

              <input
                type="text"
                inputMode="decimal"
                value={precioVentaTexto}
                onChange={(e) => {
                  setPrecioVentaTexto(e.target.value);
                  setIntentoAgregar(false);
                }}
                placeholder="0"
                disabled={bloqueado}
                className={`${
                  readOnly ? readOnlyInputCls : esCompacta ? inputClsCompacta : compactInputCls
                } ${errorPrecioVenta ? "border-destructive focus:ring-destructive" : ""}`}
              />
            </div>
          )}

          <div className="ml-auto flex items-center gap-2 self-end">
            <button
              type="button"
              onClick={() => void agregarValidado()}
              disabled={bloqueado || guardandoPresentacion}
              className={`inline-flex h-9 items-center justify-center gap-1.5 px-3 bg-primary text-primary-foreground text-xs font-semibold rounded-lg transition-colors ${
                bloqueado || guardandoPresentacion ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-primary/90"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              {guardandoPresentacion ? "Guardando…" : buttonLabel}
            </button>
            {onCancelar && (
              <button
                type="button"
                onClick={onCancelar}
                className="inline-flex h-9 items-center justify-center px-3 border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>

        {/* Punto 3 + ajuste de bebidas: el costo de referencia CON IVA POR
            UNIDAD (el monto de una paca ya viene dividido en las unidades),
            contra el que se valida el precio de venta (sólo en productos,
            donde ese campo existe). */}
        {mostrarPrecioVenta && costoConIva != null && (
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Costo por unidad: {fmtCompactCOP(costoConIva)}
          </p>
        )}

        {/* Punto B2: el precio de venta inválido se avisa EN TIEMPO REAL,
            debajo de la fila (el texto va fuera de la capa con opacidad). */}
        {errorPrecioVenta && (
          <p className="text-xs font-medium text-destructive mt-1.5">{errorPrecioVenta}</p>
        )}

        {/* Ayuda de la línea: qué entra al inventario y a qué costo por
            unidad base ("= 20 kg al inventario · costo $2.500/kg"). */}
        {ayudaLinea && (
          <p className="text-[11px] text-muted-foreground mt-1.5">{ayudaLinea}</p>
        )}

      </div>

    </div>
  );
}
