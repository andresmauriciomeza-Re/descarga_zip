import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Plus,
  Check,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { MensajeError } from "@/shared/components/campo";
import { ConfirmDeleteModal } from "@/shared/components/ConfirmDeleteModal";
import { SearchInput } from "@/shared/components/SearchInput";
import { Paginador } from "@/shared/components/Paginador";
import { ActionIcons } from "@/shared/components/ActionIcons";
import {
  EstadoSelect,
  ESTADO_ACTIVO_COLOR,
  ESTADO_INACTIVO_COLOR,
  type EstadoOption,
} from "@/shared/components/EstadoSelect";
import {
  claveImagenDe,
  IMAGENES_CATEGORIA,
  esImagenContenida,
} from "@/features/categoria-productos/services/imagenesCategoria";
import { ImagenCategoria } from "@/features/categoria-productos/components/ImagenCategoria";

const SERIF = "var(--font-titulo)";

// ─────────────────────────── LOCAL CONFIRM MODAL ───────────────────────────

function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <h3
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            {title}
          </h3>
        </div>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-border rounded-xl font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors active:scale-95 cursor-pointer"
          >
            Sí, confirmar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────── CATEGORÍA PRODUCTO ───────────────────────────

export interface CategoriaProducto {
  id: string;
  nombre: string;
  /**
   * Clave "img:…" de `IMAGENES_CATEGORIA` con la que la categoría aparece en
   * el landing, en la tabla y en el detalle (§5). Es opcional a propósito:
   * solo lo llevan las categorías creadas desde acá. Las tres originales
   * conservan su imagen fija, resuelta por id en `IMAGEN_FIJA_CATEGORIA`.
   * (Antes guardaba un emoji; los datos viejos siguen pintándose como texto.)
   */
  icono?: string;
  /**
   * Activo / Inactivo. Opcional: el dato guardado antes de que existiera el
   * campo sigue siendo Activo (ver `estadoDe`). Una Inactiva sigue en este
   * listado, pero no se muestra en el landing ni en el selector de Categoría
   * de producto.
   */
  estado?: EstadoCategoria;
  /**
   * Texto libre para explicar qué agrupa la categoría (P17a). OPCIONAL y sin
   * validación: solo el nombre es obligatorio. No lo llevan las categorías
   * creadas antes de existir el campo.
   */
  descripcion?: string;
}

export type EstadoCategoria = "Activo" | "Inactivo";

/** Estado de una categoría, con el que no lo tiene todavía: Activo. */
export const estadoDe = (c?: CategoriaProducto): EstadoCategoria =>
  c?.estado ?? "Activo";

/** Opciones de la pill de estado: mismos colores que Proveedores/Usuarios. Se
    usan en el selector del listado y, en solo lectura (Ver detalle y modal de
    confirmación), con el mismo EstadoSelect deshabilitado. */
export const OPCIONES_ESTADO_CATEGORIA: EstadoOption<EstadoCategoria>[] = [
  { value: "Activo", label: "Activo", color: ESTADO_ACTIVO_COLOR },
  { value: "Inactivo", label: "Inactivo", color: ESTADO_INACTIVO_COLOR },
];

export const INITIAL_CATEGORIAS: CategoriaProducto[] = [
  { id: "CAT-001", nombre: "Pizzas", estado: "Activo" },
  { id: "CAT-002", nombre: "Lasañas", estado: "Activo" },
  { id: "CAT-003", nombre: "Bebidas", estado: "Activo" },
];

/**
 * Las tres originales no son editables: su nombre está escrito en el catálogo
 * público y su imagen en el landing, así que cambiarlos aquí dejaría la tarjeta
 * y el filtro del catálogo mostrando cosas distintas. Se pueden borrar, como
 * hoy, pero no renombrar.
 */
const CATEGORIAS_FIJAS = new Set(["CAT-001", "CAT-002", "CAT-003"]);

const MAX_NOMBRE = 30;

/**
 * Clave de comparación de nombres: sin mayúsculas, sin tildes y sin espacios
 * sobrantes, para que "PARRILLADA" y "Parrillada " no se cuelen como dos
 * categorías distintas.
 */
const claveNombre = (valor: string) =>
  valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Nombre legible de cada clave del catálogo, SOLO para mostrar en la
    galería agrupada del modal Crear. No toca los datos ni el orden. */
const NOMBRES_IMAGEN: Record<string, string> = {
  "img:pizza": "Pizza",
  "img:pizza-carnes": "Carnes",
  "img:pizza-canon": "Cañón",
  "img:pizza-hawaii": "Hawaii",
  "img:pizza-jamon": "Jamón",
  "img:pizza-maicitos": "Maicitos",
  "img:pizza-peperoni": "Peperoni",
  "img:pizza-pollo": "Pollo",
  "img:pizza-tocineta": "Tocineta",
  "img:lasana-carne": "Carne",
  "img:lasana-mixta": "Mixta",
  "img:lasana-pollo": "Pollo",
  "img:coca-cola": "Coca-Cola",
  "img:pepsi": "Pepsi",
  "img:premio": "Premio",
  "img:quatro": "Quatro",
};

const nombreImagen = (clave: string): string =>
  NOMBRES_IMAGEN[clave] ?? clave.replace(/^img:/, "");

const BEBIDAS_IMAGEN = [
  "img:coca-cola",
  "img:pepsi",
  "img:premio",
  "img:quatro",
];

/** Grupos de la galería del Crear: los filtros sobre Object.keys conservan
    el orden del catálogo; "OTRAS" solo se pinta si tiene elementos. */
const GRUPOS_IMAGEN: { titulo: string; claves: string[] }[] = [
  {
    titulo: "PIZZAS",
    claves: Object.keys(IMAGENES_CATEGORIA).filter((k) =>
      k.startsWith("img:pizza"),
    ),
  },
  {
    titulo: "LASAÑAS",
    claves: Object.keys(IMAGENES_CATEGORIA).filter((k) =>
      k.startsWith("img:lasana"),
    ),
  },
  {
    titulo: "BEBIDAS",
    claves: BEBIDAS_IMAGEN.filter((k) => k in IMAGENES_CATEGORIA),
  },
  {
    titulo: "OTRAS",
    claves: Object.keys(IMAGENES_CATEGORIA).filter(
      (k) =>
        !k.startsWith("img:pizza") &&
        !k.startsWith("img:lasana") &&
        !BEBIDAS_IMAGEN.includes(k),
    ),
  },
];

function SmModal({
  title,
  onClose,
  onConfirm,
  confirmLabel,
  children,
  ancho = "max-w-sm",
  scroll = false,
}: {
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  children: React.ReactNode;
  /** Ancho del modal; max-w-sm por defecto para que Editar quede igual. */
  ancho?: string;
  /** Con true el cuerpo scrollea por dentro (max-h-[90vh]) y header/pie
      quedan fijos. Solo lo usa el modal Crear. */
  scroll?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.16 }}
        className={`bg-card rounded-2xl w-full ${ancho} shadow-2xl border border-border ${
          scroll ? "max-h-[90vh] flex flex-col" : ""
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h3
            className="text-lg font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div
          className={`px-5 py-4 ${
            scroll ? "flex-1 min-h-0 overflow-y-auto" : ""
          }`}
        >
          {children}
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95"
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/** Miniatura de la galería del modal Crear: 64×64 con su nombre debajo. El
    check de la seleccionada sobresale de la esquina (el contenedor no recorta). */
function MiniaturaImagen({
  clave,
  seleccionada,
  onSelect,
}: {
  clave: string;
  seleccionada: boolean;
  onSelect: (clave: string) => void;
}) {
  const url = IMAGENES_CATEGORIA[clave];
  return (
    <div className="relative w-16">
      <button
        type="button"
        title={clave}
        aria-label={clave}
        aria-pressed={seleccionada}
        onClick={() => onSelect(clave)}
        className={`block w-16 h-16 rounded-xl border-2 overflow-hidden transition-colors cursor-pointer ${
          seleccionada
            ? "border-primary bg-primary/10"
            : "border-border bg-muted hover:bg-border"
        }`}
      >
        <img
          src={url}
          alt={clave}
          loading="lazy"
          className={`w-full h-full ${esImagenContenida(clave) ? "object-contain p-1" : "object-cover"}`}
        />
      </button>
      {seleccionada && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center pointer-events-none">
          <Check className="w-3 h-3 text-white" />
        </span>
      )}
      <span className="block mt-1 text-[11px] leading-tight text-muted-foreground text-center truncate">
        {nombreImagen(clave)}
      </span>
    </div>
  );
}

export function CategoriaProductoScreen({ categorias, setCategorias, canCreate = true, canEdit = true, canDelete = true }: { categorias: CategoriaProducto[]; setCategorias: React.Dispatch<React.SetStateAction<CategoriaProducto[]>>; canCreate?: boolean; canEdit?: boolean; canDelete?: boolean }) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] =
    useState<CategoriaProducto | null>(null);
  const [detailItem, setDetailItem] =
    useState<CategoriaProducto | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formNombre, setFormNombre] = useState("");
  // Clave "img:…" de la imagen elegida en el modal Crear (§5).
  const [formIcono, setFormIcono] = useState("");
  // Descripción del Crear (P17a): opcional y sin validación, así que vive en
  // su propio estado y se guarda tal cual (sin más reglas que trim()).
  const [formDescripcion, setFormDescripcion] = useState("");
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  // Estado que se guarda al crear: empieza en Activo. El de Editar viaja en
  // `editItem` y se confirma en el modal de la tabla, igual que el producto.
  const [formEstado, setFormEstado] = useState<EstadoCategoria>("Activo");
  const [confirmEstado, setConfirmEstado] = useState<{
    id: string;
    nombre: string;
    current: EstadoCategoria;
    next: EstadoCategoria;
  } | null>(null);

  const inputCls =
    "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  /** El mismo input de arriba, pero en el estado de error de los formularios. */
  const campoCls = (err?: string) =>
    "w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 " +
    (err ? "border-red-400 bg-red-50/30" : "bg-muted border-border");

  const [grupoPizzas, grupoLasanas, grupoBebidas, grupoOtras] = GRUPOS_IMAGEN;

  const tituloGrupo = (titulo: string, total: number) => (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
      {titulo} · {total}
    </p>
  );

  const filaMiniaturas = (claves: string[]) => (
    <div className="flex flex-wrap gap-2">
      {claves.map((clave) => (
        <MiniaturaImagen
          key={clave}
          clave={clave}
          seleccionada={formIcono === clave}
          onSelect={(k) => {
            setFormIcono(k);
            setCreateErrors((p) => ({ ...p, icono: "" }));
          }}
        />
      ))}
    </div>
  );

  /** Valida nombre e imagen contra el resto de categorías. `ignorarId` deja
      fuera al propio registro para que al editar no se detecte a sí mismo. */
  const validarCategoria = (
    nombre: string,
    icono: string,
    ignorarId?: string,
  ): Record<string, string> => {
    const errs: Record<string, string> = {};
    const limpio = nombre.trim();
    if (!limpio) errs.nombre = "El nombre es obligatorio";
    else if (limpio.length > MAX_NOMBRE)
      errs.nombre = `El nombre no puede superar ${MAX_NOMBRE} caracteres`;
    else if (
      categorias.some(
        (c) => c.id !== ignorarId && claveNombre(c.nombre) === claveNombre(limpio),
      )
    )
      errs.nombre = "Ese nombre ya está registrado";
    if (!icono) errs.icono = "Selecciona una imagen";
    return errs;
  };

  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  const filtered = useMemo(
    () =>
      categorias.filter(
        (c) =>
          c.id.toLowerCase().includes(search.toLowerCase()) ||
          c.nombre.toLowerCase().includes(search.toLowerCase()),
      ),
    [categorias, search],
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE,
  );

  // Si el buscador o un borrado reducen el total, `page` puede quedar apuntando
  // más allá de la última página: la tabla salía vacía sin mensaje de "sin
  // resultados" y "Siguiente" ya no avanzaba (hacía `min(totalPages, p + 1)`).
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  const handleCreate = () => {
    const errs = validarCategoria(formNombre, formIcono);
    setCreateErrors(errs);
    if (Object.keys(errs).length) return;
    // `length + 1` reutilizaba un id existente si se había borrado una categoría
    // del medio: quedaban dos filas con la misma clave y editar/borrar una
    // afectaba a la otra. Se toma el mayor sufijo numérico, como en Usuarios.
    const nextNum = categorias.reduce((max, c) => {
      const n = parseInt(c.id.replace("CAT-", ""), 10) || 0;
      return Math.max(max, n);
    }, 0) + 1;
    const newId = `CAT-${String(nextNum).padStart(3, "0")}`;
    setCategorias((p) => [
      ...p,
      {
        id: newId,
        nombre: formNombre.trim(),
        icono: formIcono,
        estado: formEstado,
        // Opcional (P17a): vacío = sin descripción, no se guarda ruido.
        descripcion: formDescripcion.trim() || undefined,
      },
    ]);
    setShowCreate(false);
    setFormNombre("");
    setFormIcono("");
    setFormDescripcion("");
    setFormEstado("Activo");
    toast.success("Categoría creada correctamente");
  };

  const handleEdit = () => {
    if (!editItem) return;
    const esFija = CATEGORIAS_FIJAS.has(editItem.id);
    // Las originales conservan nombre e imagen (la suya es fija por id, en
    // IMAGEN_FIJA_CATEGORIA), así que no se valida lo que no se puede tocar:
    // solo cambia su estado.
    if (!esFija) {
      const errs = validarCategoria(editItem.nombre, editItem.icono ?? "", editItem.id);
      setEditErrors(errs);
      if (Object.keys(errs).length) return;
    }
    const estado = editItem.estado ?? "Activo";
    // La descripción se guarda en las dos ramas: es un dato nuevo (P17a), así
    // que es editable también en las originales, cuyo bloqueo sigue siendo
    // solo de nombre e ícono.
    const descripcion = editItem.descripcion?.trim() || undefined;
    setCategorias((p) =>
      p.map((x) =>
        x.id === editItem.id
          ? esFija
            ? { ...x, estado, descripcion }
            : { ...x, nombre: editItem.nombre.trim(), icono: editItem.icono, estado, descripcion }
          : x,
      ),
    );
    setEditItem(null);
    toast.success("Categoría actualizada");
  };

  const handleDelete = (id: string) => {
    setCategorias((p) => p.filter((x) => x.id !== id));
    setDeleteId(null);
    toast.success("Categoría eliminada");
  };

  // Ancho amplio (igual que Proveedores/Gestión de Insumos): el listado usa
  // el ancho completo del panel en vez del antiguo max-w-3xl.
  return (
    <div className="px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            Categoría Producto
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {categorias.length} categorías registradas
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => {
              setFormNombre("");
              setFormIcono("");
              setFormDescripcion("");
              setFormEstado("Activo");
              setCreateErrors({});
              setShowCreate(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md text-sm"
          >
            <Plus className="w-4 h-4" /> Crear Categoría
          </button>
        )}
      </div>

      {/* Search */}
      <SearchInput
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Buscar por ID o nombre..."
      />

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Mismo patrón de tabla que el resto del panel (P16): cabecera
                text-xs en mayúsculas, celdas px-4 py-2.5 con texto text-sm y
                filas de 61 px, idénticas a las de Gestión de Producto. */}
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {[
                  "ID",
                  "Nombre Categoría",
                  "Descripción",
                  "Estado",
                  "Acciones",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left font-semibold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-14 text-center text-muted-foreground"
                  >
                    <p className="text-4xl mb-3">🏷️</p>
                    <p>No se encontraron categorías</p>
                  </td>
                </tr>
              ) : (
                paged.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-muted/20 transition-colors h-[61px]"
                  >
                    <td className="px-4 py-2.5 text-sm font-mono font-semibold text-foreground">
                      {/* Solo el número: de "CAT-005" muestra "005". El dato
                          `c.id` NO cambia (lo usan CATEGORIAS_FIJAS,
                          IMAGEN_FIJA_CATEGORIA, borrar/editar y el idCategoria
                          de los productos), y el buscador sigue comparando
                          contra `c.id` completo. */}
                      {c.id.replace("CAT-", "")}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-medium text-foreground">
                      <span className="inline-flex items-center gap-2">
                        {/* Imagen 32×32 (§5): la fila sigue midiendo 61 px. */}
                        <ImagenCategoria
                          clave={claveImagenDe(c)}
                          className="w-8 h-8 shrink-0"
                          alt={c.nombre}
                        />
                        {c.nombre}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">
                      {/* Descripción (P17a): campo OPCIONAL, así que sin dato
                          (undefined o en blanco) se muestra un guion en gris
                          en vez de una celda vacía. El ancho queda acotado y el
                          texto va en una sola línea con elipsis —el completo se
                          ve en el tooltip— para que una descripción larga no se
                          lleve todo el ancho de la tabla ni rompa las filas de
                          61 px; el resto del ancho lo toma la columna Nombre. */}
                      <span
                        className="block max-w-[420px] truncate"
                        title={c.descripcion?.trim() || undefined}
                      >
                        {c.descripcion?.trim() ? c.descripcion : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {/* Pill de estado (diseño de Proveedores). Elegir la opción
                          contraria pide confirmación, igual que en Gestión de
                          Producto; sin permiso de edición queda la pill sola. */}
                      <EstadoSelect
                        value={estadoDe(c)}
                        disabled={!canEdit}
                        onChange={(next) => {
                          if (next === estadoDe(c)) return;
                          setConfirmEstado({
                            id: c.id,
                            nombre: c.nombre,
                            current: estadoDe(c),
                            next,
                          });
                        }}
                        options={OPCIONES_ESTADO_CATEGORIA}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <ActionIcons
                        onView={() => setDetailItem(c)}
                        onEdit={
                          canEdit
                            ? () => {
                                setEditErrors({});
                                setEditItem({ ...c });
                              }
                            : undefined
                        }
                        onDelete={canDelete ? () => setDeleteId(c.id) : undefined}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > 0 && (
        <Paginador pagina={page} totalPaginas={totalPages} onCambio={setPage} />
      )}

      {/* ── Crear ── */}
      <AnimatePresence>
        {showCreate && (
          <SmModal
            title="Crear Categoría"
            onClose={() => setShowCreate(false)}
            onConfirm={handleCreate}
            confirmLabel="Crear"
            ancho="max-w-3xl"
            scroll
          >
            <div className="space-y-4">
              {/* Zona superior en 2 columnas (apiladas en móvil): a la
                  izquierda los campos, a la derecha la vista previa de cómo
                  quedará la categoría en el listado y en el inicio. */}
              <div className="grid grid-cols-1 md:grid-cols-[1.25fr_1fr] gap-4">
                <div className="space-y-3">
                  {/* Sin campo ID (P17a): el id lo asigna el sistema solo y ya se
                      ve en el listado y en Ver detalle; en el formulario solo
                      estorbaba. */}
                  <div>
                    <div className="flex items-baseline justify-between mb-1">
                      <label className="block text-xs font-semibold text-muted-foreground">
                        Nombre Categoría *
                      </label>
                      <span className="text-[11px] text-muted-foreground">
                        {formNombre.length}/{MAX_NOMBRE}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={formNombre}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormNombre(v);
                        setCreateErrors((p) => ({
                          ...p,
                          nombre: validarCategoria(v, formIcono).nombre,
                        }));
                      }}
                      placeholder="Ej. Parrilladas"
                      maxLength={MAX_NOMBRE}
                      className={campoCls(createErrors.nombre)}
                    />
                    <MensajeError err={createErrors.nombre} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Estado
                    </label>
                    {/* Nueva categoría: siempre empieza como Activo. */}
                    <EstadoSelect
                      value={formEstado}
                      onChange={(v) => setFormEstado(v)}
                      options={OPCIONES_ESTADO_CATEGORIA}
                    />
                  </div>
                  {/* Descripción (P17a): OPCIONAL y sin validación — la única
                      regla del formulario sigue siendo el nombre. */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Descripción <span className="font-normal">(opcional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={formDescripcion}
                      onChange={(e) => setFormDescripcion(e.target.value)}
                      placeholder="Ej: Pizzas al horno de leña, tamaño familiar…"
                      className={inputCls + " resize-y"}
                    />
                  </div>
                </div>
                <div className="bg-muted/50 border border-border rounded-xl p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Vista previa
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-card overflow-hidden shrink-0 flex items-center justify-center">
                      {formIcono && IMAGENES_CATEGORIA[formIcono] ? (
                        <img
                          src={IMAGENES_CATEGORIA[formIcono]}
                          alt={formIcono}
                          className={`w-full h-full ${
                            esImagenContenida(formIcono)
                              ? "object-contain p-0.5"
                              : "object-cover"
                          }`}
                        />
                      ) : (
                        <span className="w-full h-full rounded-full border-2 border-dashed border-border" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-sm font-bold truncate ${
                            formNombre.trim()
                              ? "text-foreground"
                              : "text-muted-foreground font-normal"
                          }`}
                        >
                          {formNombre.trim() || "Nombre de la categoría"}
                        </p>
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                            OPCIONES_ESTADO_CATEGORIA.find(
                              (o) => o.value === formEstado,
                            )?.color ?? ""
                          }`}
                        >
                          {formEstado}
                        </span>
                      </div>
                      {formDescripcion.trim() && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                          {formDescripcion}
                        </p>
                      )}
                    </div>
                  </div>
                  <div
                    className={`mt-3 w-full h-[130px] rounded-xl flex items-center justify-center ${
                      formIcono && IMAGENES_CATEGORIA[formIcono]
                        ? "bg-card border border-border p-2"
                        : "border-2 border-dashed border-border"
                    }`}
                  >
                    {formIcono && IMAGENES_CATEGORIA[formIcono] ? (
                      <img
                        src={IMAGENES_CATEGORIA[formIcono]}
                        alt={formIcono}
                        className={`w-[110px] h-[110px] ${
                          esImagenContenida(formIcono)
                            ? "object-contain"
                            : "object-cover"
                        }`}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Elige una imagen
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Así se verá en el listado y en la página de inicio
                  </p>
                </div>
              </div>
              {/* Zona inferior: la galería agrupada por tipo (§5), con las
                  mismas claves, orden y lógica de imagen que antes. */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Imagen *
                  </label>
                  <span className="text-xs text-muted-foreground">
                    Elige una de las {Object.keys(IMAGENES_CATEGORIA).length}
                  </span>
                </div>
                {grupoPizzas.claves.length > 0 && (
                  <div>
                    {tituloGrupo(
                      grupoPizzas.titulo,
                      grupoPizzas.claves.length,
                    )}
                    {filaMiniaturas(grupoPizzas.claves)}
                  </div>
                )}
                {(grupoLasanas.claves.length > 0 ||
                  grupoBebidas.claves.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {grupoLasanas.claves.length > 0 && (
                      <div>
                        {tituloGrupo(
                          grupoLasanas.titulo,
                          grupoLasanas.claves.length,
                        )}
                        {filaMiniaturas(grupoLasanas.claves)}
                      </div>
                    )}
                    {grupoBebidas.claves.length > 0 && (
                      <div>
                        {tituloGrupo(
                          grupoBebidas.titulo,
                          grupoBebidas.claves.length,
                        )}
                        {filaMiniaturas(grupoBebidas.claves)}
                      </div>
                    )}
                  </div>
                )}
                {grupoOtras.claves.length > 0 && (
                  <div>
                    {tituloGrupo(grupoOtras.titulo, grupoOtras.claves.length)}
                    {filaMiniaturas(grupoOtras.claves)}
                  </div>
                )}
                <MensajeError err={createErrors.icono} />
              </div>
            </div>
          </SmModal>
        )}
      </AnimatePresence>

      {/* ── Editar ── */}
      <AnimatePresence>
        {editItem && (
          <SmModal
            // Sin el ID en el título ni en el formulario (P17a): el código
            // se ve en el listado y en Ver detalle; aquí basta el nombre.
            title={`Editar — ${editItem.nombre}`}
            onClose={() => setEditItem(null)}
            onConfirm={handleEdit}
            confirmLabel="Guardar"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Nombre Categoría *
                  </label>
                  <input
                    type="text"
                    value={editItem.nombre}
                    disabled={CATEGORIAS_FIJAS.has(editItem.id)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditItem((x) => (x ? { ...x, nombre: v } : x));
                      setEditErrors((p) => ({
                        ...p,
                        nombre: validarCategoria(
                          v,
                          editItem.icono ?? "",
                          editItem.id,
                        ).nombre,
                      }));
                    }}
                    placeholder="Ej. Parrilladas"
                    maxLength={MAX_NOMBRE}
                    className={
                      campoCls(
                        CATEGORIAS_FIJAS.has(editItem.id)
                          ? undefined
                          : editErrors.nombre,
                      ) +
                      (CATEGORIAS_FIJAS.has(editItem.id)
                        ? " bg-muted/60 text-muted-foreground cursor-not-allowed"
                        : "")
                    }
                  />
                  <MensajeError err={editErrors.nombre} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Estado
                  </label>
                  {/* Editable también para las categorías originales: solo su
                      nombre y su ícono quedan fijos. */}
                  <EstadoSelect
                    value={estadoDe(editItem)}
                    onChange={(next) =>
                      setEditItem((x) => (x ? { ...x, estado: next } : x))
                    }
                    options={OPCIONES_ESTADO_CATEGORIA}
                  />
                </div>
              </div>
              {/* Descripción (P17a): OPCIONAL y sin validación. Se edita
                  también en las categorías originales: su bloqueo es de nombre
                  e ícono, no de este dato nuevo. */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Descripción <span className="font-normal">(opcional)</span>
                </label>
                <textarea
                  rows={2}
                  value={editItem.descripcion ?? ""}
                  onChange={(e) =>
                    setEditItem((x) => (x ? { ...x, descripcion: e.target.value } : x))
                  }
                  placeholder="Ej: Pizzas al horno de leña, tamaño familiar…"
                  className={inputCls + " resize-y"}
                />
              </div>
              {!CATEGORIAS_FIJAS.has(editItem.id) && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Imagen *
                  </label>
                  {/* Misma galería que el Crear, con la imagen actual ya
                      marcada (§5). Las categorías originales no la muestran:
                      su imagen es fija. */}
                  <div className="grid grid-cols-6 gap-2 mb-2">
                    {Object.entries(IMAGENES_CATEGORIA).map(([clave, url]) => (
                      <button
                        key={clave}
                        type="button"
                        title={clave}
                        aria-label={clave}
                        aria-pressed={editItem.icono === clave}
                        onClick={() => {
                          setEditItem((x) => (x ? { ...x, icono: clave } : x));
                          setEditErrors((p) => ({ ...p, icono: "" }));
                        }}
                        className={`shrink-0 w-14 h-14 rounded-xl border overflow-hidden transition-colors cursor-pointer ${
                          editItem.icono === clave
                            ? "border-primary bg-primary/10"
                            : "border-border bg-muted hover:bg-border"
                        }`}
                      >
                        <img
                          src={url}
                          alt={clave}
                          loading="lazy"
                          className={`w-full h-full ${esImagenContenida(clave) ? "object-contain p-1" : "object-cover"}`}
                        />
                      </button>
                    ))}
                  </div>
                  <MensajeError err={editErrors.icono} />
                </div>
              )}
            </div>
          </SmModal>
        )}
      </AnimatePresence>

      {/* ── Ver detalle ── */}
      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3
                  className="text-lg font-bold text-foreground"
                  style={{ fontFamily: SERIF }}
                >
                  Detalle — {detailItem.id}
                </h3>
                <button
                  onClick={() => setDetailItem(null)}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
                {[
                  {
                    label: "ID Categoría",
                    value: detailItem.id,
                  },
                  {
                    label: "Nombre Categoría",
                    value: detailItem.nombre,
                  },
                  {
                    label: "Descripción",
                    // Opcional (P17a): sin dato se muestra un guion, nunca un
                    // campo vacío ni el ID.
                    value: detailItem.descripcion || "—",
                  },
                  {
                    label: "Estado",
                    // La misma pill de la tabla, aquí en solo lectura.
                    value: (
                      <EstadoSelect
                        value={estadoDe(detailItem)}
                        disabled
                        options={OPCIONES_ESTADO_CATEGORIA}
                      />
                    ),
                  },
                  {
                    label: "Imagen",
                    // Imagen 48×48 (§5): presente en toda categoría, incluidas
                    // las originales, cuya imagen se resuelve por id.
                    value: (
                      <ImagenCategoria
                        clave={claveImagenDe(detailItem)}
                        className="w-12 h-12"
                        alt={detailItem.nombre}
                        emojiClassName="text-3xl"
                      />
                    ),
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-4"
                  >
                    <span className="text-sm text-muted-foreground font-medium shrink-0">
                      {label}
                    </span>
                    <span className="text-sm font-semibold text-foreground text-right">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 border-t border-border">
                <button
                  onClick={() => setDetailItem(null)}
                  className="w-full py-2.5 bg-muted rounded-xl text-sm font-semibold text-foreground hover:bg-border cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Confirmar cambio de estado ── */}
      <AnimatePresence>
        {confirmEstado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <h3
                  className="text-lg font-bold text-foreground"
                  style={{ fontFamily: SERIF }}
                >
                  ¿Desea cambiar el estado de la categoría?
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                La categoría{" "}
                <strong className="text-foreground">{confirmEstado.nombre}</strong>{" "}
                pasará de:
              </p>
              <div className="flex items-center gap-3 mb-5 px-3 py-3 rounded-xl bg-muted/50 border border-border">
                <EstadoSelect
                  value={confirmEstado.current}
                  disabled
                  options={OPCIONES_ESTADO_CATEGORIA}
                />
                <span className="text-muted-foreground text-sm">→</span>
                <EstadoSelect
                  value={confirmEstado.next}
                  disabled
                  options={OPCIONES_ESTADO_CATEGORIA}
                />
              </div>
              {confirmEstado.next === "Inactivo" && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4">
                  La categoría dejará de mostrarse en el landing y en el selector
                  de Categoría de producto.
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmEstado(null)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setCategorias((prev) =>
                      prev.map((x) =>
                        x.id === confirmEstado.id
                          ? { ...x, estado: confirmEstado.next }
                          : x,
                      ),
                    );
                    setConfirmEstado(null);
                    toast.success(`Estado cambiado a: ${confirmEstado.next}`);
                  }}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Eliminar ── */}
      <AnimatePresence>
        {deleteId && (
          <ConfirmDeleteModal
            title="Eliminar categoría"
            message={`¿Seguro que deseas eliminar la categoría ${deleteId}? Esta acción no se puede deshacer.`}
            onConfirm={() => handleDelete(deleteId)}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
