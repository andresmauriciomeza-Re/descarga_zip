import React from "react";
import { Plus, Search, Minus } from "lucide-react";
import { UnidadSelect } from "@/features/compras/components/UnidadSelect";

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

function fmtCompactCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

export interface CompactInsumoFormProps {
  titulo: string;
  nombre: string;
  onNombreChange: (value: string) => void;
  onNombreFocus: () => void;
  cantidad: number;
  onCantidadChange: (value: number) => void;
  unidad: string;
  onUnidadChange: (value: string) => void;
  unidadDisabled?: boolean;
  precio: number;
  onPrecioChange: (value: number) => void;
  iva: number;
  onIvaChange: (value: number) => void;
  onAgregar: () => void;
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
  onPrecioVentaChange?: (value: number) => void;
  /** Muestra el campo "Precio de venta" (sólo al agregar PRODUCTOS). */
  mostrarPrecioVenta?: boolean;
  /** Punto B2: precio de venta inválido (vacío, 0 o ≤ monto unitario). Pinta
   *  el campo en rojo, muestra el mensaje bajo la fila y deshabilita el
   *  botón Agregar: un producto nunca se agrega sin precio de venta válido. */
  errorPrecioVenta?: string;
  /** Punto 3: costo de referencia CON IVA, POR UNIDAD (con paca/caja el
   *  monto de la factura es por presentación y la pantalla que lo pasa ya lo
   *  dividió). Es contra él que se valida el precio de venta; se muestra
   *  debajo de la fila. */
  costoConIva?: number;
}

export function CompactInsumoForm({
  titulo,
  nombre,
  onNombreChange,
  onNombreFocus,
  cantidad,
  onCantidadChange,
  unidad,
  onUnidadChange,
  unidadDisabled = false,
  precio,
  onPrecioChange,
  iva,
  onIvaChange,
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
  onPrecioVentaChange,
  mostrarPrecioVenta = false,
  errorPrecioVenta,
  costoConIva,
}: CompactInsumoFormProps) {
  /** `readOnly` y `disabled` bloquean los controles; el primero es solo lectura
      visual, el segundo deshabilita por completo (p. ej. falta elegir el IVA). */
  const bloqueado = readOnly || disabled;
  const esCompacta = variante === "compacta";

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
        <div className={`flex flex-wrap items-end gap-2 ${disabled ? "opacity-50" : ""}`}>
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

          {/* Cantidad — stepper con botones +/- (normal) o input simple (compacta) */}
          {esCompacta ? (
            <div className="w-[70px] flex-none">
              <label className={labelClsCompacta}>Cantidad</label>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => onCantidadChange(Math.max(1, Number(e.target.value)))}
                disabled={bloqueado}
                className={inputClsCompacta}
              />
            </div>
          ) : (
            <div className="w-[112px]">
              <label className={labelCls}>Cantidad</label>

              <div className="flex items-stretch h-10">
                <button
                  type="button"
                  onClick={() => onCantidadChange(Math.max(1, cantidad - 1))}
                  disabled={bloqueado}
                  className="flex items-center justify-center w-9 bg-muted border border-border rounded-l-xl text-muted-foreground hover:bg-border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={1}
                  value={cantidad}
                  onChange={(e) => onCantidadChange(Math.max(1, Number(e.target.value)))}
                  disabled={bloqueado}
                  className="w-full min-w-0 px-1 bg-muted border-y border-border text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => onCantidadChange(cantidad + 1)}
                  disabled={bloqueado}
                  className="flex items-center justify-center w-9 bg-muted border border-border rounded-r-xl text-muted-foreground hover:bg-border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Medida — select redondeado personalizado (Radix), NO nativo.
              P11: se oculta en la Nueva compra (la unidad sale del insumo). */}
          {!ocultarMedida && (
            <div className={esCompacta ? "w-[80px] flex-none" : "w-[96px]"}>
              <label className={esCompacta ? labelClsCompacta : labelCls}>Medida</label>

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
                  ariaLabel="Medida"
                  fieldClassName={
                    readOnly
                      ? "bg-muted/40 border border-border text-foreground h-10"
                      : esCompacta
                        ? "bg-muted border border-border text-foreground h-9 rounded-lg"
                        : unidadCampoCls
                  }
                />
              )}
            </div>
          )}

          {/* P14: hueco de Medida para el control propio del formulario. */}
          {campoExtra}

          {/* Precio */}
          <div className={esCompacta ? "w-[110px] flex-none" : "w-[116px]"}>
            <label className={esCompacta ? labelClsCompacta : labelCls}>Monto unitario</label>

            <input
              type="number"
              min={0}
              value={precio || ""}
              onChange={(e) => onPrecioChange(Number(e.target.value))}
              placeholder="0"
              disabled={bloqueado}
              className={readOnly ? readOnlyInputCls : esCompacta ? inputClsCompacta : compactInputCls}
            />
          </div>

          {/* IVA */}
          <div className={esCompacta ? "w-[70px] flex-none" : "w-[76px]"}>
            <label className={esCompacta ? labelClsCompacta : labelCls}>IVA %</label>

            <input
              type="number"
              min={0}
              max={100}
              // FIX: el IVA arranca en 0 y `value={iva}` hacía que el campo
              // mostrara "0" fijo; al escribir "19" el resultado visual era
              // "019" (y al borrarlo no se podía dejar vacío). Con `iva || ""`
              // el campo queda vacío cuando vale 0 (mismo patrón que Monto
              // unitario) y al dejarlo en blanco el onChange ya deja 0
              // implícito al agregar la línea. Se propaga a Compra, Orden de
              // Compra y Recepción, que usan este mismo componente.
              value={iva || ""}
              onChange={(e) => onIvaChange(Math.min(100, Math.max(0, Number(e.target.value))))}
              placeholder="0"
              disabled={bloqueado}
              className={readOnly ? readOnlyInputCls : esCompacta ? inputClsCompacta : compactInputCls}
            />
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
                type="number"
                min={0}
                value={precioVenta || ""}
                onChange={(e) =>
                  onPrecioVentaChange?.(Math.max(0, Number(e.target.value)))
                }
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
              onClick={onAgregar}
              disabled={bloqueado || !!errorPrecioVenta}
              className={`ml-auto inline-flex h-10 items-center justify-center gap-1.5 px-4 bg-primary text-white text-sm font-semibold rounded-xl transition-colors ${
                bloqueado || errorPrecioVenta
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:bg-red-700"
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

        {/* Sin elegir el IVA: la fila queda al 50% y encima, en gris, avisa
            qué falta. El texto va FUERA de la capa con opacidad. */}
        {disabled && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <span className="px-3 py-2 rounded-xl bg-background/90 border border-border text-xs font-semibold text-muted-foreground shadow-sm">
              Primero indica si los montos de la factura incluyen IVA
            </span>
          </div>
        )}
      </div>

      {/* Botón Agregar para variante compacta: debajo, alineado a la izquierda */}
      {esCompacta && (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onAgregar}
            disabled={bloqueado || !!errorPrecioVenta}
            className={`inline-flex h-9 items-center justify-center gap-1.5 px-3 bg-primary text-white text-xs font-semibold rounded-lg transition-colors ${
              bloqueado || errorPrecioVenta
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer hover:bg-red-700"
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
