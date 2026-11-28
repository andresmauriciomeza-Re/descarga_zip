import { CATEGORIAS_INSUMO, type CategoriaInsumo } from "@/features/supplies/utils/supplies";
import { type NuevoInsumoCreado, SERIF, iCls } from "@/features/purchase-orders/utils/purchase-orders";
import { useState } from "react";
import { UNIDADES_INSUMO } from "@/shared/utils/units";
import { nombreLimpio, mismoNombre, nombreParaGuardar } from "@/shared/utils/names";
import { crearInsumo, mensajeErrorInsumos } from "@/features/supplies/services/suppliesApi";
import { toast } from "sonner";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { UnidadSelect } from "@/features/purchases/components/UnitSelect";
import { numeroDeInput, limpiarNumeroInput } from "@/shared/utils/numberInput";

// ─── NUEVO INSUMO MODAL ───────────────────────────────────────────────────────

export function NuevoInsumoModal({
  onGuardar, onClose, nombreInicial = "", insumosExistentes = [],
  categoriasInsumo = CATEGORIAS_INSUMO,
  persistirEnApi = true,
}: {
  onGuardar: (ins: NuevoInsumoCreado) => void;
  onClose: () => void;
  nombreInicial?: string;
  insumosExistentes?: { nombre: string }[];
  persistirEnApi?: boolean;
  /** Bloque 3: categorías de insumos (A5.1: la categoría es OBLIGATORIA,
   *  igual que en Crear Insumo de Gestión de Insumos). Por defecto el mismo
   *  catálogo `CATEGORIAS_INSUMO`; cada pantalla puede pasar el suyo. */
  categoriasInsumo?: CategoriaInsumo[];
}) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [categoriaId, setCategoriaId] = useState("");
  const [unidad, setUnidad] = useState(UNIDADES_INSUMO[0].valor);
  const [precio, setPrecio] = useState(0);
  const [iva, setIva] = useState(0);
  const [tocado, setTocado] = useState({ nombre: false, categoria: false, unidad: false, precio: false, iva: false });
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  /** "Guardando…" mientras habla la API: bloquea el doble clic. */
  const [guardando, setGuardando] = useState(false);

  // Bloque 3: mismas reglas que Gestión de Insumos — nombre único comparando
  // sin tildes ni mayúsculas de más (`mismoNombre`) y categoría obligatoria.
  const errorNombre = nombreLimpio(nombre)
    ? (insumosExistentes.some(i => mismoNombre(i.nombre, nombre))
      ? "Ya existe un insumo con ese nombre"
      : undefined)
    : "El nombre es obligatorio.";
  const errorCategoria = categoriaId ? undefined : "Selecciona una categoría.";
  const errorUnidad = unidad ? undefined : "Selecciona una unidad.";
  const errorPrecio = precio > 0 ? undefined : "El monto debe ser mayor que cero.";
  const errorIva = iva >= 0 && iva <= 100 ? undefined : "El IVA debe estar entre 0 y 100.";

  const formValido = !errorNombre && !errorCategoria && !errorUnidad && !errorPrecio && !errorIva;

  const marcarTocado = (campo: "nombre" | "categoria" | "unidad" | "precio" | "iva") =>
    setTocado((t) => ({ ...t, [campo]: true }));

  const submit = async () => {
    setIntentoGuardar(true);
    if (!formValido || guardando) return;
    if (!persistirEnApi) {
      onGuardar({
        id: `INS-NUEVO-${Date.now()}`,
        nombre: nombreParaGuardar(nombre),
        unidadMedida: unidad,
        precioUnitario: precio,
        iva,
        categoriaId,
      });
      return;
    }
    setGuardando(true);
    try {
      // 3.4: el insumo se da de alta contra la API (tipo "Insumo", con el
      // costo y el IVA del modal) y el payload que sale es el del SERVIDOR:
      // así el catálogo recibe el id real ("INS-###") y no uno inventado.
      const creado = await crearInsumo({
        nombre: nombreParaGuardar(nombre),
        tipo: "Insumo",
        id_categoria_insumo: Number(categoriaId),
        unidad_medida: unidad,
        costo_unitario: precio,
        iva,
      });
      onGuardar({
        id: creado.insumo.id,
        nombre: creado.insumo.nombre,
        unidadMedida: creado.insumo.unidadMedida,
        precioUnitario: creado.insumo.costoUnitario,
        iva: creado.insumo.iva ?? iva,
        categoriaId: creado.insumo.categoriaId,
      });
    } catch (error) {
      // 409 (nombre repetido) o 400: mensaje del servidor, modal abierto.
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Crear Insumo</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Completa los datos del insumo para agregarlo a la orden.</p>
          </div>
          <button onClick={onClose} className="p-1.5 max-md:p-3.5 max-md:-m-2 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Nombre *</label>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onBlur={() => marcarTocado("nombre")}
              autoFocus
              placeholder="Nombre del insumo"
              className={`${iCls} transition-colors ${(tocado.nombre || intentoGuardar) && errorNombre ? "border-red-400 focus:ring-red-300" : ""}`}
            />
            {(tocado.nombre || intentoGuardar) && errorNombre && (
              <p className="text-xs text-red-500 mt-1 ml-0.5">{errorNombre}</p>
            )}
          </div>
          {/* Bloque 3 (A5.1): la categoría es obligatoria, igual que en
              Crear Insumo de Gestión de Insumos — sin ella el insumo queda
              sin clasificar en el catálogo. */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Categoría *</label>
            <select
              value={categoriaId}
              onChange={e => { setCategoriaId(e.target.value); marcarTocado("categoria"); }}
              onBlur={() => marcarTocado("categoria")}
              className={`${iCls} transition-colors ${(tocado.categoria || intentoGuardar) && errorCategoria ? "border-red-400 focus:ring-red-300" : ""}`}
            >
              <option value="">Seleccionar</option>
              {/* Solo categorías activas (las de la API traen `estado`). */}
              {categoriasInsumo.filter(c => c.estado !== false).map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            {(tocado.categoria || intentoGuardar) && errorCategoria && (
              <p className="text-xs text-red-500 mt-1 ml-0.5">{errorCategoria}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Unidad de Medida</label>
              {/* Select personalizado (Radix, igual que los estados): el
                  `<select>` nativo desplegaba la lista CUADRADA y con el azul
                  del navegador. Bloque 3 (A5.2): con la lista compartida
                  UNIDADES_INSUMO (etiqueta larga, mismo valor guardado). */}
              <UnidadSelect
                value={unidad}
                unidades={UNIDADES_INSUMO}
                onChange={(v) => {
                  setUnidad(v);
                  marcarTocado("unidad");
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">IVA (%)</label>
              {/* Vacío = 0 % al guardar (punto B1); el 0 es un valor válido. */}
              <input
                type="number"
                min={0}
                max={100}
                value={iva === 0 ? "" : iva}
                placeholder="0"
                onChange={e => setIva(numeroDeInput(limpiarNumeroInput(e.target.value)))}
                onBlur={() => marcarTocado("iva")}
                className={iCls}
              />
              {(tocado.iva || intentoGuardar) && errorIva && (
                <p className="text-xs text-red-500 mt-1 ml-0.5">{errorIva}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Monto unitario *</label>
            <input
              type="number"
              min={0}
              value={precio || ""}
              onChange={e => setPrecio(Number(e.target.value))}
              onBlur={() => marcarTocado("precio")}
              className={iCls}
            />
            {(tocado.precio || intentoGuardar) && errorPrecio && (
              <p className="text-xs text-red-500 mt-1 ml-0.5">{errorPrecio}</p>
            )}
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 max-md:min-h-11 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => void submit()}
            disabled={!formValido || guardando}
            className="flex-1 py-2.5 max-md:min-h-11 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary transition-all"
          >
            {guardando ? "Guardando…" : "Crear Insumo"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
