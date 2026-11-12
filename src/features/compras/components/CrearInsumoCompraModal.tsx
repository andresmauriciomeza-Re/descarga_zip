import { useMemo, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import type { CategoriaInsumo, Insumo } from "@/features/insumos/pages/GestionInsumosScreen";
import { crearInsumo, mensajeErrorInsumos } from "@/features/insumos/services/insumosApi";
import { UnidadSelect } from "@/features/compras/components/UnidadSelect";
import {
  OTRA_PRESENTACION_G,
  OTRA_PRESENTACION_ML,
  PRESENTACIONES_INSUMO,
  UNIDADES_Y_PRESENTACIONES_INSUMO,
  resolverPresentacionUnidad,
} from "@/shared/utils/unidades";
import { limpiarNumeroInput, numeroDeInput } from "@/shared/utils/numeroInput";
import { mismoNombre, nombreLimpio, nombreParaGuardar } from "@/shared/utils/nombres";

const ICLS_MODAL =
  "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const formatoCantidad = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const esOtraPresentacion = (valor: string) =>
  valor === OTRA_PRESENTACION_G || valor === OTRA_PRESENTACION_ML;
const etiquetaContenido = (valor: string, contenido: number, unidadBase: "g" | "ml") =>
  PRESENTACIONES_INSUMO.find((presentacion) => presentacion.valor === valor)?.etiqueta ??
  (contenido > 0 ? `${formatoCantidad.format(contenido)} ${unidadBase}` : `… ${unidadBase}`);
const unidadBaseDeSeleccion = (valor: string): "g" | "ml" | null =>
  resolverPresentacionUnidad(valor, 1)?.unidadBase ??
  (valor === OTRA_PRESENTACION_G ? "g" : valor === OTRA_PRESENTACION_ML ? "ml" : null);

export function CrearInsumoCompraModal({
  onGuardar,
  onClose,
  nombreInicial = "",
  insumosExistentes = [],
  categoriasInsumo = [],
}: {
  onGuardar: (insumo: Insumo) => void;
  onClose: () => void;
  nombreInicial?: string;
  insumosExistentes?: Insumo[];
  categoriasInsumo?: CategoriaInsumo[];
}) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [categoriaId, setCategoriaId] = useState("");
  const [unidad, setUnidad] = useState("kg");
  const [contenidoPresentacion, setContenidoPresentacion] = useState(0);
  const [stockMinimo, setStockMinimo] = useState(0);
  /** Peso de medida (cantidad exacta en la unidad elegida, ej. 1200 g).
      Obligatorio al crear. */
  const [pesoMedida, setPesoMedida] = useState(0);
  const [tocado, setTocado] = useState({
    nombre: false,
    categoria: false,
    unidad: false,
    contenidoPresentacion: false,
    stockMinimo: false,
    pesoMedida: false,
  });
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const errores = useMemo(() => {
    const limpio = nombreLimpio(nombre);
    return {
      nombre: !limpio
        ? "El nombre es obligatorio."
        : insumosExistentes.some((insumo) => mismoNombre(insumo.nombre, limpio))
          ? "Ya existe un insumo con ese nombre"
          : undefined,
      categoria: categoriaId ? undefined : "Selecciona una categoría.",
      unidad: unidad ? undefined : "Selecciona una unidad.",
      contenidoPresentacion:
        esOtraPresentacion(unidad) && !(contenidoPresentacion > 0)
          ? "El contenido debe ser mayor a 0."
          : undefined,
      stockMinimo:
        !Number.isFinite(stockMinimo) || stockMinimo < 0
          ? "El stock mínimo no puede ser negativo."
          : undefined,
      pesoMedida:
        pesoMedida < 0
          ? "El peso de medida no puede ser negativo."
          : pesoMedida > 0
            ? undefined
            : "El peso de medida es obligatorio.",
    };
  }, [nombre, categoriaId, unidad, contenidoPresentacion, stockMinimo, pesoMedida, insumosExistentes]);

  const presentacion = resolverPresentacionUnidad(unidad, contenidoPresentacion);
  const errorDe = (campo: keyof typeof tocado, error?: string) =>
    intentoGuardar || tocado[campo] ? error : undefined;
  const campoConError = (error?: string) =>
    `${ICLS_MODAL} transition-colors ${error ? "border-red-400 focus:ring-red-300" : ""}`;
  const tocar = (campo: keyof typeof tocado) =>
    setTocado((actual) => (actual[campo] ? actual : { ...actual, [campo]: true }));

  const guardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIntentoGuardar(true);
    if (Object.values(errores).some(Boolean) || guardando) return;

    setGuardando(true);
    try {
      const creado = await crearInsumo({
        nombre: nombreParaGuardar(nombre),
        tipo: "Insumo",
        id_categoria_insumo: Number(categoriaId),
        unidad_medida: presentacion?.unidadBase ?? unidad,
        peso_medida: pesoMedida,
        stock_minimo: stockMinimo * (presentacion?.contenido ?? 1),
      });
      onGuardar(creado.insumo);
      toast.success(`Insumo "${creado.insumo.nombre}" creado`);
      onClose();
    } catch (error) {
      toast.error(mensajeErrorInsumos(error, "No se pudo crear el insumo."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4"
      >
        <form onSubmit={(event) => void guardar(event)}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-titulo)" }}>
              Crear Insumo
            </h3>
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              aria-label="Cerrar"
              className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4 max-h-[min(70dvh,34rem)] overflow-y-auto">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Nombre *
              </label>
              <input
                value={nombre}
                onChange={(event) => {
                  setNombre(event.target.value.replace(/[\r\n]+/g, " "));
                  tocar("nombre");
                }}
                onBlur={() => tocar("nombre")}
                autoFocus
                placeholder="Ej: Harina de trigo"
                disabled={guardando}
                className={campoConError(errorDe("nombre", errores.nombre))}
              />
              {errorDe("nombre", errores.nombre) && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1 leading-tight">
                  {errores.nombre}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Categoría *
                </label>
                <select
                  value={categoriaId}
                  onChange={(event) => {
                    setCategoriaId(event.target.value);
                    tocar("categoria");
                  }}
                  onBlur={() => tocar("categoria")}
                  disabled={guardando}
                  className={`${campoConError(errorDe("categoria", errores.categoria))} cursor-pointer`}
                >
                  <option value="">Selecciona una categoría</option>
                  {categoriasInsumo.filter((categoria) => categoria.estado !== false).map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                  ))}
                </select>
                {errorDe("categoria", errores.categoria) && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1 leading-tight">
                    {errores.categoria}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Unidad de Medida *
                </label>
                <div className="flex items-start gap-2">
                  <UnidadSelect
                    value={unidad}
                    onChange={(value) => {
                      setUnidad(value);
                      setContenidoPresentacion(0);
                      tocar("unidad");
                      if (esOtraPresentacion(value)) tocar("contenidoPresentacion");
                    }}
                    disabled={guardando}
                    unidades={UNIDADES_Y_PRESENTACIONES_INSUMO}
                    mostrarValorSeleccionadoCorto
                    ariaLabel="Unidad de Medida"
                    fieldClassName={ICLS_MODAL}
                  />
                  {esOtraPresentacion(unidad) && (
                    <div className="relative w-28 shrink-0">
                      <input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={contenidoPresentacion || ""}
                        placeholder="Contenido *"
                        disabled={guardando}
                        onChange={(event) => {
                          setContenidoPresentacion(
                            numeroDeInput(limpiarNumeroInput(event.target.value)),
                          );
                          tocar("contenidoPresentacion");
                        }}
                        onBlur={() => tocar("contenidoPresentacion")}
                        className="h-full min-h-[2.875rem] w-full rounded-xl border border-border bg-muted px-3 py-2.5 pr-9 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {unidad === OTRA_PRESENTACION_G ? "g" : "ml"}
                      </span>
                    </div>
                  )}
                </div>
                {errorDe("unidad", errores.unidad) && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1 leading-tight">
                    {errores.unidad}
                  </p>
                )}
                {esOtraPresentacion(unidad) && errorDe("contenidoPresentacion", errores.contenidoPresentacion) && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1 leading-tight">
                    {errores.contenidoPresentacion}
                  </p>
                )}
              </div>
            </div>

            {/* Peso de medida: cantidad exacta de una unidad del insumo
                (ej. 1200 g). Obligatorio al crear. */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Peso de medida *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={pesoMedida === 0 ? "" : pesoMedida}
                  placeholder="Ej: 1200"
                  disabled={guardando}
                  onChange={(event) => {
                    setPesoMedida(numeroDeInput(limpiarNumeroInput(event.target.value)));
                    tocar("pesoMedida");
                  }}
                  onBlur={() => tocar("pesoMedida")}
                  className={`${campoConError(errorDe("pesoMedida", errores.pesoMedida))} pr-14`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {presentacion?.unidadBase ??
                    (esOtraPresentacion(unidad)
                      ? unidad === OTRA_PRESENTACION_G
                        ? "g"
                        : "ml"
                      : unidad)}
                </span>
              </div>
              {errorDe("pesoMedida", errores.pesoMedida) && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1 leading-tight">
                  {errores.pesoMedida}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Stock Mínimo{presentacion
                  ? ` (× ${etiquetaContenido(unidad, presentacion.contenido, presentacion.unidadBase)})`
                  : esOtraPresentacion(unidad)
                    ? ` (× ${etiquetaContenido(unidad, contenidoPresentacion, unidadBaseDeSeleccion(unidad)!)})`
                    : ""} *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={presentacion || esOtraPresentacion(unidad) ? 0.01 : undefined}
                  value={stockMinimo === 0 ? "" : stockMinimo}
                  placeholder="0"
                  disabled={guardando}
                  onChange={(event) => {
                    setStockMinimo(numeroDeInput(limpiarNumeroInput(event.target.value)));
                    tocar("stockMinimo");
                  }}
                  onBlur={() => tocar("stockMinimo")}
                  className={`${campoConError(errorDe("stockMinimo", errores.stockMinimo))} ${
                    !presentacion && esOtraPresentacion(unidad) ? "pr-20" : ""
                  }`}
                />
                {!presentacion && esOtraPresentacion(unidad) && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {etiquetaContenido(unidad, contenidoPresentacion, unidadBaseDeSeleccion(unidad)!)}
                  </span>
                )}
              </div>
              {presentacion && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatoCantidad.format(stockMinimo)} ×{" "}
                  {etiquetaContenido(unidad, presentacion.contenido, presentacion.unidadBase)} ={" "}
                  {formatoCantidad.format(stockMinimo * presentacion.contenido)} {presentacion.unidadBase}
                </p>
              )}
              {errorDe("stockMinimo", errores.stockMinimo) && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1 leading-tight">
                  {errores.stockMinimo}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className={`flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 ${
                guardando
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-red-700 cursor-pointer active:scale-95"
              }`}
            >
              <Check className="w-4 h-4" />
              {guardando ? "Guardando…" : "Crear Insumo"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
