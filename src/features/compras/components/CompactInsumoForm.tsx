import React, { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { UnidadSelect, type OpcionUnidad } from "@/features/compras/components/UnidadSelect";
import { MODOS_IVA, type ModoIva } from "@/features/compras/services/iva";
import {
  OTRA_PRESENTACION,
  esEmpaque,
  factorDePresentacion,
  guardarPresentacion,
  factorUnidadDirecta,
  listarPresentaciones,
  mensajeErrorPresentaciones,
  unidadesCompatibles,
  type PresentacionConfigurada,
} from "@/features/compras/services/presentaciones";

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
  iva: number;
  onAgregar: (values: CompactInsumoFormValues) => void;
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
  /** Etiqueta del campo de unidad. En Compras se pasa "Presentación". */
  etiquetaUnidad?: string;
  /** IVA por línea controlado por la pantalla: al elegir otro insumo la
   *  pantalla lo resetea al valor por defecto ("incluido"); con la prop el
   *  formulario no guarda estado propio del modo. */
  modoIva?: ModoIva;
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
  ocultarCrearInsumo = false,
  ocultarCrearProducto = false,
  precioVenta = 0,
  mostrarPrecioVenta = false,
  factorCostoUnidad = 1,
  insumoId,
  unidadBase,
  etiquetaUnidad = "Medida",
  modoIva: modoIvaControlado,
  onModoIvaChange,
}: CompactInsumoFormProps) {
  /** `readOnly` y `disabled` bloquean los controles; el primero es solo lectura
      visual, el segundo deshabilita por completo. */
  const bloqueado = readOnly || disabled;
  const esCompacta = variante === "compacta";
  const [cantidadTexto, setCantidadTexto] = useState(String(cantidad));
  const [precioTexto, setPrecioTexto] = useState(precio ? String(precio) : "");
  const [ivaTexto, setIvaTexto] = useState(iva ? String(iva) : "");
  const [precioVentaTexto, setPrecioVentaTexto] = useState(precioVenta ? String(precioVenta) : "");
  // IVA por línea: si la pantalla controla el modo (prop `modoIva`), éste es
  // el estado; si no, el formulario guarda el suyo (retrocompatibilidad).
  const [modoInterno, setModoInterno] = useState<ModoIva>("incluido");
  const [intentoAgregar, setIntentoAgregar] = useState(false);

  // Presentaciones configuradas del insumo seleccionado (GET presentaciones).
  const [presentaciones, setPresentaciones] = useState<PresentacionConfigurada[]>([]);
  // "Otra presentación…": diálogo de factor ("¿Cuántas {base} trae cada…?").
  const [otraAbierta, setOtraAbierta] = useState(false);
  const [otraValor, setOtraValor] = useState<string>("paca");
  const [otraCantidadProductosTexto, setOtraCantidadProductosTexto] = useState("1");
  const [otraMedidaTexto, setOtraMedidaTexto] = useState("1");
  const [otraUnidad, setOtraUnidad] = useState("");
  const [otraError, setOtraError] = useState("");
  const [guardandoPresentacion, setGuardandoPresentacion] = useState(false);

  const modoIvaActual: ModoIva = modoIvaControlado ?? modoInterno;
  const etiquetasModoIva: Record<ModoIva, string> = {
    incluido: "Con IVA",
    mas_iva: "Sin IVA",
    exento: "Exento",
  };
  const opcionesModoIva: Array<{ value: ModoIva; label: string; tag?: string }> = MODOS_IVA.map(
    (value) => ({
      value,
      label: etiquetasModoIva[value],
      tag: value === "incluido" ? "Más común" : undefined,
    }),
  );
  const ayudaModoIva =
    "Con IVA: el monto ya trae el IVA · Sin IVA: el monto no trae IVA; se suma al final · Exento: no lleva IVA (0 %)";
  /** % guardado antes de entrar en "Exento": se restaura al salir. */
  const [ivaAntesDeExento, setIvaAntesDeExento] = useState<string>("");

  const cambiarModo = (nuevo: ModoIva) => {
    if (nuevo === modoIvaActual) return;
    if (nuevo === "exento") {
      setIvaAntesDeExento(ivaTexto.trim() === "" || ivaTexto.trim() === "0" ? "" : ivaTexto);
      setIvaTexto("0");
    } else if (modoIvaActual === "exento" && ivaAntesDeExento !== "") {
      setIvaTexto(ivaAntesDeExento);
      setIvaAntesDeExento("");
    }
    if (modoIvaControlado === undefined) setModoInterno(nuevo);
    onModoIvaChange?.(nuevo);
    setIntentoAgregar(false);
  };

  // Presentaciones configuradas del insumo seleccionado: se recargan al
  // cambiar de ítem (y después de guardar una nueva con "Otra presentación…").
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
      .catch(() => {
        // Sin permisos o sin red: la fila sigue usable con las unidades
        // compatibles; el empaque sin factor simplemente no podrá agregarse.
        if (vivo) setPresentaciones([]);
      });
    return () => {
      vivo = false;
    };
  }, [insumoId]);

  // Unidad base del insumo seleccionado (presentaciones): se define aquí
  // arriba porque la lista de opciones del desplegable también la usa.
  const baseUnidad = (unidadBase ?? "").trim();

  // Opciones del desplegable de Presentación: unidades compatibles con la base
  // (kg↔g, lt↔ml, la propia base) + presentaciones configuradas del insumo +
  // "Otra presentación…" (alta vía POST presentaciones).
  const opcionesUnidad: OpcionUnidad[] = (() => {
    const compatibles = baseUnidad ? unidadesCompatibles(baseUnidad) : [];
    const lista: OpcionUnidad[] = compatibles.map((u) => ({ valor: u, etiqueta: u }));
    const vistas = new Set(lista.map((o) => o.valor));
    presentaciones.forEach((p, i) => {
      if (vistas.has(p.presentacion)) return;
      vistas.add(p.presentacion);
      lista.push({
        valor: p.presentacion,
        etiqueta: `${p.presentacion} ×${p.unidadesBase} ${baseUnidad}`,
        divisorAntes: i === 0,
      });
    });
    // La unidad actual de la fila se conserva aunque no esté en la lista
    // (p. ej. "Paca x12" al editar una línea de producto).
    if (unidad && !vistas.has(unidad)) {
      lista.push({ valor: unidad, etiqueta: unidad, divisorAntes: lista.length > 0 });
    }
    if (insumoId) {
      lista.push({
        valor: OTRA_PRESENTACION,
        etiqueta: "Otra presentación…",
        divisorAntes: true,
      });
    }
    return lista;
  })();

  /** Selecciona una presentación; si es "Otra…" abre el diálogo de factor. */
  const cambiarUnidad = (valor: string) => {
    if (valor === OTRA_PRESENTACION) {
      const primera = (["paq", "paca", "caja", "bolsa", "sixpack"] as const).find(
        (p) => !presentaciones.some((c) => c.presentacion === p),
      );
      setOtraValor(primera ?? "paca");
      setOtraCantidadProductosTexto("1");
      setOtraMedidaTexto("1");
      setOtraUnidad(baseUnidad || unidadesCompatibles(baseUnidad)[0] || "");
      setOtraError("");
      setOtraAbierta(true);
      return;
    }
    onUnidadChange(valor);
  };

  /** Guarda la presentación nueva (POST presentaciones) y la selecciona. */
  const confirmarOtraPresentacion = async () => {
    const cantidadProductos = numeroDesdeTexto(otraCantidadProductosTexto);
    const medida = numeroDesdeTexto(otraMedidaTexto);
    const factorConversion = factorUnidadDirecta(otraUnidad, baseUnidad);
    if (!Number.isInteger(cantidadProductos) || cantidadProductos <= 0) {
      setOtraError("La cantidad de productos debe ser un entero mayor que cero.");
      return;
    }
    if (!Number.isFinite(medida) || medida <= 0 || factorConversion == null) {
      setOtraError("Ingresa una medida exacta mayor que cero y compatible con la unidad base.");
      return;
    }
    if (!insumoId) {
      setOtraError("Selecciona primero un insumo del catálogo.");
      return;
    }
    const factor = cantidadProductos * medida * factorConversion;
    setGuardandoPresentacion(true);
    try {
      const guardada = await guardarPresentacion(insumoId, otraValor, factor);
      setPresentaciones((prev) => [
        ...prev.filter((p) => p.presentacion !== guardada.presentacion),
        guardada,
      ]);
      onUnidadChange(guardada.presentacion);
      setOtraAbierta(false);
      toast.success(`Presentación "${guardada.presentacion}" guardada`);
    } catch (error) {
      setOtraError(mensajeErrorPresentaciones(error, "No se pudo guardar la presentación."));
    } finally {
      setGuardandoPresentacion(false);
    }
  };

  useEffect(() => {
    setCantidadTexto(String(cantidad));
  }, [cantidad]);

  useEffect(() => {
    setPrecioTexto(precio ? String(precio) : "");
  }, [precio]);

  useEffect(() => {
    setIvaTexto(iva ? String(iva) : "");
  }, [iva]);

  useEffect(() => {
    setPrecioVentaTexto(precioVenta ? String(precioVenta) : "");
  }, [precioVenta]);

  const cantidadNumero = numeroDesdeTexto(cantidadTexto);
  const precioNumero = precioTexto.trim() === "" ? 0 : numeroDesdeTexto(precioTexto);
  const ivaNumero = ivaTexto.trim() === "" ? 0 : numeroDesdeTexto(ivaTexto);
  const precioVentaNumero =
    precioVentaTexto.trim() === "" ? 0 : numeroDesdeTexto(precioVentaTexto);

  // ── Presentaciones (regla 2.2) ─────────────────────────────────────────────
  // Unidades base que trae UNA unidad de la presentación elegida. `null` en un
  // empaque sin configurar: la línea NO se puede agregar hasta darlo de alta
  // con "Otra presentación…" (POST presentaciones).
  const factorPresentacion =
    baseUnidad !== "" ? factorDePresentacion(unidad, baseUnidad, presentaciones) : null;
  // Respaldo: el empaque del producto ("Paca x12" ⇒ 12) o unidad suelta (1).
  const factorLinea =
    factorPresentacion ??
    (Number.isFinite(factorCostoUnidad) && factorCostoUnidad > 0 ? factorCostoUnidad : 1);
  const faltaFactor = esEmpaque(unidad) && (factorPresentacion == null || factorPresentacion <= 0);

  const costoConIva =
    (modoIvaActual === "mas_iva" ? precioNumero * (1 + ivaNumero / 100) : precioNumero) /
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
    (intentoAgregar || ivaTexto.trim() !== "") &&
    (!Number.isFinite(ivaNumero) || ivaNumero < 0 || ivaNumero > 100)
      ? "El IVA debe estar entre 0 y 100."
      : "";
  const errorFactor = faltaFactor
    ? `Configura cuántas ${baseUnidad || "unidades base"} trae cada ${unidad}.`
    : "";

  // Ayuda bajo la fila: qué entra al inventario y a qué costo por unidad base
  // (ej. "= 20 kg al inventario · costo $2.500/kg").
  const baseTotal = Number((cantidadNumero * factorLinea).toFixed(2));
  const ayudaLinea =
    baseUnidad &&
    Number.isFinite(baseTotal) &&
    baseTotal > 0 &&
    Number.isFinite(precioNumero) &&
    precioNumero > 0
      ? `= ${baseTotal.toLocaleString("es-CO", { maximumFractionDigits: 2 })} ${baseUnidad} al inventario · costo ${fmtCompactCOP(precioNumero / factorLinea)}/${baseUnidad}`
      : "";

  /** Todo lo que la fila exige para poder agregarse (bloquea el botón). */
  const puedeAgregar =
    !bloqueado &&
    Number.isFinite(cantidadNumero) &&
    cantidadNumero > 0 &&
    Number.isFinite(precioNumero) &&
    precioNumero > 0 &&
    Number.isFinite(ivaNumero) &&
    ivaNumero >= 0 &&
    ivaNumero <= 100 &&
    !faltaFactor &&
    !(
      mostrarPrecioVenta &&
      (!Number.isFinite(precioVentaNumero) ||
        precioVentaNumero <= 0 ||
        precioVentaNumero <= costoConIva)
    );

  const agregarValidado = () => {
    setIntentoAgregar(true);
    if (!puedeAgregar) return;
    onAgregar({
      cantidad: cantidadNumero,
      precio: precioNumero,
      iva: modoIvaActual === "exento" ? 0 : ivaNumero,
      modoIva: modoIvaActual,
      ...(esEmpaque(unidad) && factorPresentacion != null ? { factorPresentacion } : {}),
      ...(mostrarPrecioVenta ? { precioVenta: precioVentaNumero } : {}),
    });
    setIntentoAgregar(false);
  };

  // Estilos para la variante compacta
  const contenedorCls = esCompacta
    ? "p-3 bg-muted/30 border border-dashed border-border rounded-xl"
    : `${compacto ? "p-1.5" : "p-4"} bg-muted/40 border border-border rounded-xl`;

  const tituloCls = esCompacta
    ? "text-xs font-bold text-muted-foreground mb-2"
    : `text-sm font-bold text-foreground ${compacto ? "mb-0.5" : "mb-3"}`;

  const inputClsCompacta = "w-full h-9 px-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30";
  const labelClsCompacta = "block text-[11px] font-semibold text-muted-foreground mb-1";

  return (
    <div ref={containerRef} className={contenedorCls}>
      <h3 className={tituloCls} style={esCompacta ? undefined : { fontFamily: SERIF }}>
        {titulo}
      </h3>

      {/* La fila va en UNA sola línea (si no, el botón salta a otra fila y la
          tarjeta crece): Nombre ~35% con `grow` y el resto con anchos fijos
          que también entran en el modal de Editar OC (max-w-4xl). */}
      <div className="relative">
        <div className={`flex flex-wrap items-start gap-2 ${disabled ? "opacity-50" : ""}`}>
          {/* Nombre */}
          <div className={`relative ${esCompacta ? "flex-1 min-w-[140px]" : "basis-[26%] min-w-[180px] grow"}`}>
            <label className={esCompacta ? labelClsCompacta : labelCls}>Nombre</label>

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
                className={`${inputClsCompacta}${errorCantidad ? " border-red-400" : ""}`}
              />
              {errorCantidad && <p className="mt-1 text-[10px] text-red-500">{errorCantidad}</p>}
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
                className={`${compactInputCls} text-center${errorCantidad ? " border-red-400" : ""}`}
              />
              {errorCantidad && <p className="mt-1 text-[10px] text-red-500">{errorCantidad}</p>}
            </div>
          )}

          {/* Presentación — select redondeado personalizado (Radix), NO nativo.
              Fase 4: lista las unidades compatibles con la base del insumo,
              las presentaciones configuradas y "Otra presentación…". Para
              productos sigue mostrando la presentación de compra en solo
              lectura (la define el catálogo). */}
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
                  onChange={cambiarUnidad}
                  disabled={bloqueado || unidadDisabled}
                  ariaLabel={etiquetaUnidad}
                  // Sin insumo seleccionado (o sin unidad base conocida) se
                  // conserva el catálogo completo de Compras.
                  unidades={baseUnidad || presentaciones.length > 0 ? opcionesUnidad : undefined}
                  fieldClassName={
                    readOnly
                      ? "bg-muted/40 border border-border text-foreground h-10"
                      : esCompacta
                        ? "bg-muted border border-border text-foreground h-9 rounded-lg"
                        : unidadCampoCls
                  }
                />
              )}
              {errorFactor && (
                <p className="mt-1 text-[10px] text-red-500">{errorFactor}</p>
              )}
              {factorPresentacion != null && factorPresentacion > 0 && baseUnidad && (
                <p className="mt-1 text-[10px] text-muted-foreground whitespace-nowrap">
                  1 {unidad} = {factorPresentacion.toLocaleString("es-CO", { maximumFractionDigits: 4 })} {baseUnidad}
                </p>
              )}
            </div>
          )}

          {/* P14: hueco de Medida para el control propio del formulario. */}
          {campoExtra}

          {/* Precio */}
          <div className={esCompacta ? "w-[110px] flex-none" : "w-[116px]"}>
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
              className={`${readOnly ? readOnlyInputCls : esCompacta ? inputClsCompacta : compactInputCls}${errorPrecio ? " border-red-400" : ""}`}
            />
            {errorPrecio && <p className="mt-1 text-[10px] text-red-500">{errorPrecio}</p>}
          </div>

          {/* IVA % — atajos 0 / 5 / 19 y bloqueo en Exento (tarifa 0). */}
          <div className={esCompacta ? "w-[70px] flex-none" : "w-[76px]"}>
            <label className={esCompacta ? labelClsCompacta : labelCls}>IVA %</label>

            <input
              type="text"
              inputMode="decimal"
              // FIX: el IVA arranca en 0 y `value={iva}` hacía que el campo
              // mostrara "0" fijo; al escribir "19" el resultado visual era
              // "019" (y al borrarlo no se podía dejar vacío). Con `iva || ""`
              // el campo queda vacío cuando vale 0 (mismo patrón que Monto
              // unitario); el valor se interpreta al agregar la línea.
              // Se propaga a Compra, Orden de
              // Compra y Recepción, que usan este mismo componente.
              value={ivaTexto}
              onChange={(e) => {
                setIvaTexto(e.target.value);
                setIntentoAgregar(false);
              }}
              placeholder="0"
              disabled={bloqueado || modoIvaActual === "exento"}
              className={`${readOnly ? readOnlyInputCls : esCompacta ? inputClsCompacta : compactInputCls}${errorIva ? " border-red-400" : ""}`}
            />
            {errorIva && <p className="mt-1 text-[10px] text-red-500">{errorIva}</p>}
            {!bloqueado && modoIvaActual !== "exento" && (
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

          {/* Precio de venta al público del producto: sólo se pinta al
              agregar PRODUCTOS (la Orden de Compra no lo usa). Es OBLIGATORIO
              (punto B2): con `errorPrecioVenta` el campo se pinta en rojo. */}
          {mostrarPrecioVenta && (
            <div className={esCompacta ? "w-[110px] flex-none" : "w-[116px]"}>
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
                } ${errorPrecioVenta ? "border-red-400 focus:ring-red-300" : ""}`}
              />
            </div>
          )}

          {/* Botón Agregar: en variante compacta va debajo, alineado a la izquierda */}
          {!esCompacta && (
            <button
              type="button"
              onClick={agregarValidado}
              disabled={!puedeAgregar}
              className={`ml-auto inline-flex h-10 items-center justify-center gap-1.5 px-4 bg-primary text-white text-sm font-semibold rounded-xl transition-colors ${
                puedeAgregar ? "cursor-pointer hover:bg-red-700" : "opacity-50 cursor-not-allowed"
              }`}
            >
              <Plus className="w-4 h-4" />
              {buttonLabel}
            </button>
          )}
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
          <p className="text-xs font-medium text-red-500 mt-1.5">{errorPrecioVenta}</p>
        )}

        {/* Ayuda de la línea: qué entra al inventario y a qué costo por
            unidad base ("= 20 kg al inventario · costo $2.500/kg"). */}
        {ayudaLinea && (
          <p className="text-[11px] text-muted-foreground mt-1.5">{ayudaLinea}</p>
        )}

        {/* Tratamiento de IVA por línea: segmentado de 3 opciones con la
            marca "Más común" en IVA incluido. Exento fuerza IVA % a 0 y lo
            bloquea (arriba); al salir se restaura el % anterior. */}
        {!readOnly && !disabled && (
          <div className="mt-2">
            <div
              className="inline-flex rounded-xl border border-border bg-muted p-0.5"
              title={ayudaModoIva}
            >
              {opcionesModoIva.map(({ value, label, tag }) => {
                const activo = modoIvaActual === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => cambiarModo(value)}
                    aria-pressed={activo}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                      activo
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:bg-background/60"
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      {tag && (
                        <span
                          className={`text-[8px] font-bold uppercase tracking-wide px-1 py-px rounded-full ${
                            activo ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                          }`}
                        >
                          {tag}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* "Otra presentación…": pregunta cuántas unidades base trae cada
          presentación y la guarda con POST presentaciones (upsert). */}
      {otraAbierta && (
        <div className="mt-3 p-3 bg-background border border-border rounded-xl">
          <p className="text-xs font-semibold text-foreground mb-2">
            Configura el contenido de cada {otraValor}.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-[110px]">
              <label className={labelClsCompacta}>Presentación</label>
              <select
                value={otraValor}
                onChange={(e) => {
                  setOtraValor(e.target.value);
                  setOtraError("");
                }}
                className={inputClsCompacta}
              >
                {(["paq", "paca", "caja", "bolsa", "sixpack"] as const).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-[110px]">
              <label className={labelClsCompacta}>Cantidad de productos</label>
              <input
                type="text"
                inputMode="numeric"
                value={otraCantidadProductosTexto}
                onChange={(e) => {
                  setOtraCantidadProductosTexto(e.target.value);
                  setOtraError("");
                }}
                placeholder="1"
                disabled={guardandoPresentacion}
                className={`${inputClsCompacta}${otraError ? " border-red-400" : ""}`}
              />
            </div>
            <div className="w-[160px]">
              <label className={labelClsCompacta}>Medida exacta del producto</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={otraMedidaTexto}
                  onChange={(e) => {
                    setOtraMedidaTexto(e.target.value);
                    setOtraError("");
                  }}
                  placeholder="1"
                  disabled={guardandoPresentacion}
                  className={`${inputClsCompacta}${otraError ? " border-red-400" : ""}`}
                />
                <select
                  value={otraUnidad}
                  onChange={(e) => {
                    setOtraUnidad(e.target.value);
                    setOtraError("");
                  }}
                  disabled={guardandoPresentacion}
                  className="h-9 px-2 bg-muted border border-border rounded-lg text-sm"
                  aria-label="Unidad de la medida exacta"
                >
                  {unidadesCompatibles(baseUnidad).map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void confirmarOtraPresentacion()}
                disabled={guardandoPresentacion}
                className="inline-flex h-9 items-center px-3 bg-primary text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {guardandoPresentacion ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => setOtraAbierta(false)}
                disabled={guardandoPresentacion}
                className="inline-flex h-9 items-center px-3 border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
          {(() => {
            const cantidadProductos = numeroDesdeTexto(otraCantidadProductosTexto);
            const medida = numeroDesdeTexto(otraMedidaTexto);
            const conversion = factorUnidadDirecta(otraUnidad, baseUnidad);
            const factor =
              Number.isInteger(cantidadProductos) &&
              cantidadProductos > 0 &&
              Number.isFinite(medida) &&
              medida > 0 &&
              conversion != null
                ? cantidadProductos * medida * conversion
                : null;
            return factor != null ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                1 {otraValor} = {factor.toLocaleString("es-CO", { maximumFractionDigits: 4 })} {baseUnidad}
              </p>
            ) : null;
          })()}
          {otraError && <p className="mt-1.5 text-[11px] text-red-500">{otraError}</p>}
        </div>
      )}

      {/* Botón Agregar para variante compacta: debajo, alineado a la izquierda */}
      {esCompacta && (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={agregarValidado}
            disabled={!puedeAgregar}
            className={`inline-flex h-9 items-center justify-center gap-1.5 px-3 bg-primary text-white text-xs font-semibold rounded-lg transition-colors ${
              puedeAgregar ? "cursor-pointer hover:bg-red-700" : "opacity-50 cursor-not-allowed"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            {buttonLabel}
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
      )}
    </div>
  );
}
