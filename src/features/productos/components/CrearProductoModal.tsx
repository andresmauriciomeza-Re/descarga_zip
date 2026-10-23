import { useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import type { CategoriaProducto } from "@/features/categoria-productos/pages/CategoriaProductoScreen";
import { configDeCategoria } from "@/shared/utils/configCategoria";
import { mismoNombre, nombreLimpio } from "@/shared/utils/nombres";
import type { Producto } from "@/features/productos/pages/GestionProductosScreen";
import { mensajeErrorProductos } from "@/features/productos/services/productosApi";

const SERIF = "var(--font-titulo)";

const iCls =
  "w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

/** Datos de una bebida ("Producto terminado") que comparten el Crear de
    Gestión de Productos y el "+ Crear producto" de Compras. */
export interface DatosBebida {
  nombre: string;
  contenido: number | string;
  contenidoUnidad?: string;
  unidadCompra?: string;
  unidadesPorEmpaque?: number | string;
}

/** Errores por campo; el primero de ellos se muestra con toast. */
export interface ErroresBebida {
  nombre?: string;
  contenido?: string;
  contenidoUnidad?: string;
  empaque?: string;
}

/** Bloque 2.3: las reglas de una bebida viven en UN solo lugar — el Crear de
    Gestión de Productos y el "+ Crear producto" de Nueva Compra / Orden de
    Compra / Recepción llaman esta función, así la validación no se duplica:
    nombre único (sin tildes ni mayúsculas de más), contenido obligatorio en
    ml o L y, si se compra en paca o caja, unidades por empaque enteras >= 2.
    `nombreRepetido` lo aporta cada pantalla contra su propio catálogo. */
export function erroresBebida(
  f: DatosBebida,
  nombreRepetido?: (nombre: string) => boolean,
): ErroresBebida {
  const e: ErroresBebida = {};
  if (!nombreLimpio(f.nombre)) {
    e.nombre = "El nombre es obligatorio";
  } else if (nombreRepetido?.(f.nombre)) {
    e.nombre = "Ya existe un producto con ese nombre";
  }
  const contenido = Number(f.contenido);
  if (!Number.isFinite(contenido) || contenido <= 0) {
    e.contenido = "Indica el contenido de la bebida (ej. 400 ml o 1.5 L)";
  }
  if (f.contenidoUnidad !== "ml" && f.contenidoUnidad !== "L") {
    e.contenidoUnidad = "Selecciona la unidad del contenido (ml o L)";
  }
  const uc =
    f.unidadCompra === "paca" || f.unidadCompra === "caja" ? f.unidadCompra : "und";
  if (uc !== "und") {
    const n = Number(f.unidadesPorEmpaque);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 1) {
      e.empaque = `Indica cuántas unidades trae la ${uc === "paca" ? "paca" : "caja"} (mínimo 2)`;
    }
  }
  return e;
}

/**
 * Bloque 2: "+ Crear producto" compartido por Nueva Compra, Orden de Compra y
 * Recepción de compra. Crea un producto "Producto terminado" en memoria —nace
 * con precio 0, sin imagen y estado "No disponible"— que entra al catálogo del
 * panel por el callback `onGuardar` (en App.tsx se agrega con `setProductos`;
 * al conectar la API ese callback será el único punto a cambiar). El precio y
 * la imagen se definen después en Gestión de Productos.
 */
export function CrearProductoModal({
  nombreInicial = "",
  productos,
  categorias,
  onGuardar,
  onClose,
}: {
  /** Texto que ya escribió el usuario en el buscador de Compras. */
  nombreInicial?: string;
  /** Catálogo completo: valida el nombre único y calcula el id PROD-###. */
  productos: Producto[];
  /** Categorías del panel; se filtran a las de tipo "Producto terminado". */
  categorias: CategoriaProducto[];
  onGuardar: (p: Producto) => Promise<Producto>;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [idCategoria, setIdCategoria] = useState("");
  const [contenido, setContenido] = useState("");
  const [contenidoUnidad, setContenidoUnidad] = useState<"ml" | "L">("ml");
  const [unidadCompra, setUnidadCompra] = useState<"und" | "paca" | "caja">("und");
  const [unidadesPorEmpaque, setUnidadesPorEmpaque] = useState("");
  const [tocado, setTocado] = useState({
    nombre: false,
    categoria: false,
    contenido: false,
    empaque: false,
  });
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState("");

  // Sólo categorías de tipo "Producto terminado" (bebidas y reventa): los
  // "Producto insumo" (Pizzas, Lasañas) se producen, no se compran.
  const categoriasTerminadas = categorias.filter(
    (c) => configDeCategoria(c.id, c.nombre)?.tipo === "Producto terminado",
  );

  const errorCategoria = idCategoria ? undefined : "Selecciona una categoría";
  const errores = erroresBebida(
    { nombre, contenido, contenidoUnidad, unidadCompra, unidadesPorEmpaque },
    (n) => productos.some((p) => mismoNombre(p.nombre, n)),
  );
  const formValido =
    !errores.nombre &&
    !errorCategoria &&
    !errores.contenido &&
    !errores.contenidoUnidad &&
    !errores.empaque;

  const marcarTocado = (campo: keyof typeof tocado) =>
    setTocado((t) => ({ ...t, [campo]: true }));

  const submit = async () => {
    setIntentoGuardar(true);
    if (!formValido) return;
    const ucFinal =
      unidadCompra === "paca" || unidadCompra === "caja" ? unidadCompra : "und";
    // Mismo patrón de id que Gestión de Productos: el MAYOR sufijo numérico + 1
    // (con `length + 1` se reutilizaba un id si se había borrado un producto
    // del medio y quedaban dos filas con la misma clave).
    const nextNum =
      productos.reduce((max, p) => {
        const n = parseInt(p.id.replace("PROD-", ""), 10) || 0;
        return Math.max(max, n);
      }, 0) + 1;
    setGuardando(true);
    setErrorServidor("");
    try {
      await onGuardar({
      id: `PROD-${String(nextNum).padStart(3, "0")}`,
      nombre: nombreLimpio(nombre),
      idCategoria,
      tipo: "Producto terminado",
      // El precio de una bebida lo define Compras al facturar la compra
      // (monto + IVA); acá nace en 0. La ganancia NO se calcula en el panel.
      costoUnitario: 0,
      precioUnitario: 0,
      unidadVenta: "und",
      // Sin imagen: se sube después desde Gestión de Productos.
      imagen: "",
      imagenes: [],
      contenido: Number(contenido),
      contenidoUnidad,
      unidadCompra: ucFinal,
      unidadesPorEmpaque:
        ucFinal === "und" ? undefined : Math.trunc(Number(unidadesPorEmpaque)),
      stockDisponible: 0,
      estado: "No disponible",
      });
    } catch (error) {
      setErrorServidor(mensajeErrorProductos(error, "No se pudo crear el producto."));
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
            <h3
              className="text-lg font-bold text-foreground"
              style={{ fontFamily: SERIF }}
            >
              Nuevo producto
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Crea un producto terminado para agregar a la compra.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Nombre *
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={() => marcarTocado("nombre")}
              autoFocus
              placeholder="Nombre del producto"
              className={`${iCls} transition-colors ${
                (tocado.nombre || intentoGuardar) && errores.nombre
                  ? "border-red-400 focus:ring-red-300"
                  : ""
              }`}
            />
            {(tocado.nombre || intentoGuardar) && errores.nombre && (
              <p className="text-xs text-red-500 mt-1 ml-0.5">{errores.nombre}</p>
            )}
            {errorServidor && <p className="text-xs text-red-500 mt-1 ml-0.5">{errorServidor}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Categoría *
            </label>
            <select
              value={idCategoria}
              onChange={(e) => {
                setIdCategoria(e.target.value);
                marcarTocado("categoria");
              }}
              onBlur={() => marcarTocado("categoria")}
              className={`${iCls} transition-colors ${
                (tocado.categoria || intentoGuardar) && errorCategoria
                  ? "border-red-400 focus:ring-red-300"
                  : ""
              }`}
            >
              <option value="">Seleccionar</option>
              {categoriasTerminadas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            {(tocado.categoria || intentoGuardar) && errorCategoria && (
              <p className="text-xs text-red-500 mt-1 ml-0.5">{errorCategoria}</p>
            )}
          </div>
          {/* Presentación (bloque 2.3): misma regla que el Crear de Gestión de
              Productos — contenido obligatorio en ml o L. */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Contenido *
              </label>
              <input
                type="number"
                min={0}
                step="any"
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                onBlur={() => marcarTocado("contenido")}
                placeholder="Ej: 400 o 1.5"
                className={`${iCls} transition-colors ${
                  (tocado.contenido || intentoGuardar) && errores.contenido
                    ? "border-red-400 focus:ring-red-300"
                    : ""
                }`}
              />
              {(tocado.contenido || intentoGuardar) && errores.contenido && (
                <p className="text-xs text-red-500 mt-1 ml-0.5">{errores.contenido}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Unidad
              </label>
              <select
                value={contenidoUnidad}
                onChange={(e) => setContenidoUnidad(e.target.value as "ml" | "L")}
                className={iCls}
              >
                <option value="ml">ml</option>
                <option value="L">L</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Se compra por *
              </label>
              <select
                value={unidadCompra}
                onChange={(e) =>
                  setUnidadCompra(e.target.value as "und" | "paca" | "caja")
                }
                className={iCls}
              >
                <option value="und">Unidad</option>
                <option value="paca">Paca</option>
                <option value="caja">Caja</option>
              </select>
            </div>
            {unidadCompra !== "und" && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Unidades por empaque *
                </label>
                <input
                  type="number"
                  min={2}
                  step={1}
                  value={unidadesPorEmpaque}
                  onChange={(e) => setUnidadesPorEmpaque(e.target.value)}
                  onBlur={() => marcarTocado("empaque")}
                  placeholder="Ej: 12"
                  className={`${iCls} transition-colors ${
                    (tocado.empaque || intentoGuardar) && errores.empaque
                      ? "border-red-400 focus:ring-red-300"
                      : ""
                  }`}
                />
                {(tocado.empaque || intentoGuardar) && errores.empaque && (
                  <p className="text-xs text-red-500 mt-1 ml-0.5">{errores.empaque}</p>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            El precio y la imagen se definen después en Gestión de Productos.
          </p>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => void submit()}
            disabled={!formValido || guardando}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary transition-all"
          >
            {guardando ? "Guardando…" : "Crear Producto"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
