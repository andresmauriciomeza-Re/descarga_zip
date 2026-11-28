import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft as IconoVolver, Tag as IconoTag } from "lucide-react";
import { AvisoBanner } from "@/shared/components/panel/NoticeBanner";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";
import { BotonRuta } from "@/shared/components/buttons/BreadcrumbButton";
import { BuscadorGrande } from "@/shared/components/panel/LargeSearch";
import { CampoFormulario } from "@/shared/components/panel/FormField";
import { DialogoConfirmacion } from "@/shared/components/panel/ConfirmDialog";
import { EncabezadoPagina } from "@/shared/components/panel/PageHeader";
import { EstadoPill } from "@/shared/components/panel/StatusPill";
import { OpcionesBotones } from "@/shared/components/buttons/OptionButtons";
import { TarjetaFila } from "@/shared/components/panel/RowCard";
import { PaginadorGrande } from "@/shared/components/panel/LargePaginator";
import { SeccionFormulario } from "@/shared/components/panel/FormSection";
import { VacioEstado } from "@/shared/components/panel/EmptyState";
import { MensajeError } from "@/shared/components/FormInputs";
import { ConfirmDeleteModal } from "@/shared/components/ConfirmDeleteModal";
import { SearchInput } from "@/shared/components/SearchInput";
import { Paginador } from "@/shared/components/Paginator";
import { ActionIcons } from "@/shared/components/buttons/ActionIcons";
import {
  EstadoSelect,
  ESTADO_ACTIVO_COLOR,
  ESTADO_INACTIVO_COLOR,
  type EstadoOption,
} from "@/shared/components/StatusSelect";
import { GRUPOS_ICONOS } from "@/features/product-categories/services/categoryIcons";
import { useProductCategories } from "@/features/product-categories/hooks/useProductCategories";
import type { CategoriaProducto, EstadoCategoria } from "@/features/product-categories/utils/product-categories";
import { estadoDe } from "@/features/product-categories/utils/product-categories";

/** Opciones de la pill de estado: mismos colores que Proveedores/Usuarios. Se
    usan en el selector del listado y, en solo lectura (Ver detalle y modal de
    confirmación), con el mismo EstadoSelect deshabilitado. */
export const OPCIONES_ESTADO_CATEGORIA: EstadoOption<EstadoCategoria>[] = [
  { value: "Activo", label: "Activo", color: ESTADO_ACTIVO_COLOR },
  { value: "Inactivo", label: "Inactivo", color: ESTADO_INACTIVO_COLOR },
];

/**
 * Las tres originales (ids 1 Pizza, 2 Lasaña y 3 Bebidas) no cambian de nombre
 * ni de imagen: el backend y el catálogo público las reconocen por su nombre.
 * Sí se les edita la descripción y el estado, y no se pueden eliminar. El
 * backend aplica la misma regla.
 */
const CATEGORIAS_FIJAS = new Set(["1", "2", "3"]);

const MENSAJE_FIJA_ELIMINAR =
  "Las categorías originales (Pizza, Lasaña y Bebidas) no se pueden eliminar.";
const MENSAJE_CON_PRODUCTOS =
  "Esta categoría tiene productos asociados. Puedes inactivarla.";

// Longitudes de tb_categoria_productos.
const MAX_NOMBRE = 50;
const MAX_DESCRIPCION = 255;

/** Nombre tal como se guarda: sin espacios de más. */
const nombreLimpio = (valor: string) => valor.trim().replace(/\s+/g, " ");

/** ¿El error del backend es por nombre repetido? (409 del servicio o del UNIQUE). */
const esNombreRepetido = (error: unknown) =>
  (error as { status?: number } | undefined)?.status === 409 &&
  error instanceof Error &&
  /nombre/i.test(error.message);

/**
 * Clave de comparación de nombres: sin mayúsculas, sin tildes y sin espacios
 * sobrantes, para que "PARRILLADA" y "Parrillada " no se cuelen como dos
 * categorías distintas.
 */
const claveNombre = (valor: string) =>
  nombreLimpio(valor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Datos que la pantalla envía al guardar (`emoji` lleva el emoji elegido). */
export interface CategoriaGuardar {
  nombre?: string;
  emoji?: string;
  descripcion?: string | null;
  estado?: boolean;
}

/** Las acciones van contra la API (App.tsx): cada una resuelve con éxito o
    lanza el error del backend, que la pantalla muestra (403, 409…). */
interface Props {
  categorias: CategoriaProducto[];
  cargando?: boolean;
  errorCarga?: string | null;
  onReintentar?: () => void;
  onCrear: (datos: CategoriaGuardar) => Promise<CategoriaProducto>;
  onEditar: (id: string, datos: CategoriaGuardar) => Promise<unknown>;
  onCambiarEstado: (id: string, estado: EstadoCategoria) => Promise<unknown>;
  onEliminar: (id: string) => Promise<unknown>;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

const mensajeError = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export function CategoriaProductoScreen({ categorias, cargando = false, errorCarga, onReintentar, onCrear, onEditar, onCambiarEstado, onEliminar, canCreate = true, canEdit = true, canDelete = true }: Props) {
  const { search, setSearch, page, setPage, PER_PAGE, filtered, totalPages, paged } = useProductCategories(categorias);
  // Evita el doble envío mientras una petición está en curso (sin cambio visual).
  const [guardando, setGuardando] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] =
    useState<CategoriaProducto | null>(null);
  const [detailItem, setDetailItem] =
    useState<CategoriaProducto | null>(null);
  const [deleteItem, setDeleteItem] = useState<CategoriaProducto | null>(null);
  const [formNombre, setFormNombre] = useState("");
  // Emoji elegido en el modal Crear (se envía en el campo `emoji`).
  const [formIcono, setFormIcono] = useState("");
  const [grupoIconoSeleccionado, setGrupoIconoSeleccionado] = useState(0);
  // Grupo activo del selector de ícono del modal Editar. Es propio y
  // no reutiliza `grupoIconoSeleccionado` del Crear, para que los
  // dos modales no se pisen entre sí.
  const [grupoIconoEdicion, setGrupoIconoEdicion] = useState(0);
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
    productosMenu: number;
  } | null>(null);

  const inputCls =
    "w-full px-3 py-2.5 max-md:min-h-11 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  /** El mismo input de arriba, pero en el estado de error de los formularios. */
  const campoCls = (err?: string) =>
    "w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 " +
    (err ? "border-red-400 bg-red-50/30" : "bg-muted border-border");

  /** Valida nombre e imagen contra el resto de categorías. `ignorarId` deja
      fuera al propio registro para que al editar no se detecte a sí mismo. */
  const validarCategoria = (
    nombre: string,
    icono: string,
    ignorarId?: string,
  ): Record<string, string> => {
    const errs: Record<string, string> = {};
    const limpio = nombreLimpio(nombre);
    if (!limpio) errs.nombre = "El nombre es obligatorio";
    else if (limpio.length > MAX_NOMBRE)
      errs.nombre = `El nombre no puede superar ${MAX_NOMBRE} caracteres`;
    else if (
      categorias.some(
        (c) => c.id !== ignorarId && claveNombre(c.nombre) === claveNombre(limpio),
      )
    )
      errs.nombre = "Ese nombre ya está registrado";
    if (!icono) errs.icono = "Selecciona un ícono";
    return errs;
  };

  /** Descripción opcional: solo se limita su largo (columna de 255). */
  const validarDescripcion = (descripcion?: string): string | undefined =>
    (descripcion ?? "").trim().length > MAX_DESCRIPCION
      ? `La descripción no puede superar ${MAX_DESCRIPCION} caracteres`
      : undefined;





  const handleCreate = async () => {
    if (guardando) return;
    const errs = validarCategoria(formNombre, formIcono);
    const errDescripcion = validarDescripcion(formDescripcion);
    if (errDescripcion) errs.descripcion = errDescripcion;
    setCreateErrors(errs);
    if (Object.keys(errs).length) return;
    setGuardando(true);
    try {
      // El id lo asigna la base (id_categoria).
      const creada = await onCrear({
        nombre: nombreLimpio(formNombre),
        emoji: formIcono,
        estado: formEstado === "Activo",
        // Opcional (P17a): vacío = sin descripción, no se guarda ruido.
        descripcion: formDescripcion.trim() || null,
      });
      setShowCreate(false);
      setFormNombre("");
      setFormIcono("");
      setGrupoIconoSeleccionado(0);
      setFormDescripcion("");
      setFormEstado("Activo");
      toast.success("Categoría creada correctamente");
    } catch (error) {
      if (esNombreRepetido(error)) {
        setCreateErrors((p) => ({ ...p, nombre: "Ese nombre ya está registrado" }));
      }
      toast.error(mensajeError(error, "No se pudo crear la categoría."));
    } finally {
      setGuardando(false);
    }
  };

  const handleEdit = async () => {
    if (!editItem || guardando) return;
    const esFija = CATEGORIAS_FIJAS.has(editItem.id);
    // Las originales conservan nombre e ícono, así que no se valida lo que no
    // se puede tocar: solo cambian su descripción y su estado.
    const errs: Record<string, string> = esFija
      ? {}
      : validarCategoria(editItem.nombre, editItem.icono ?? "", editItem.id);
    const errDescripcion = validarDescripcion(editItem.descripcion);
    if (errDescripcion) errs.descripcion = errDescripcion;
    setEditErrors(errs);
    if (Object.keys(errs).length) return;
    const estado = (editItem.estado ?? "Activo") === "Activo";
    // La descripción se guarda en las dos ramas: es un dato nuevo (P17a), así
    // que es editable también en las originales, cuyo bloqueo sigue siendo
    // solo de nombre e ícono.
    const descripcion = editItem.descripcion?.trim() || null;
    setGuardando(true);
    try {
      await onEditar(
        editItem.id,
        esFija
          ? { descripcion, estado }
          : { nombre: nombreLimpio(editItem.nombre), emoji: editItem.icono, descripcion, estado },
      );
      setEditItem(null);
      toast.success("Categoría actualizada");
    } catch (error) {
      if (esNombreRepetido(error)) {
        setEditErrors((p) => ({ ...p, nombre: "Ese nombre ya está registrado" }));
      }
      toast.error(mensajeError(error, "No se pudo actualizar la categoría."));
    } finally {
      setGuardando(false);
    }
  };

  /** Abre la confirmación de borrado solo si se puede borrar; si no, avisa
      con el mismo mensaje que daría el backend. */
  const pedirEliminar = (c: CategoriaProducto) => {
    if (CATEGORIAS_FIJAS.has(c.id) || (c.totalProductos ?? 0) > 0) {
      setBloqueoBorrar(c);
      return;
    }
    setDeleteItem(c);
  };

  const handleDelete = async (id: string) => {
    if (guardando) return;
    setGuardando(true);
    try {
      await onEliminar(id);
      setDeleteItem(null);
      toast.success("Categoría eliminada");
    } catch (error) {
      setDeleteItem(null);
      toast.error(mensajeError(error, "No se pudo eliminar la categoría."));
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarEstado = async () => {
    if (!confirmEstado || guardando) return;
    setGuardando(true);
    try {
      await onCambiarEstado(confirmEstado.id, confirmEstado.next);
      setConfirmEstado(null);
      toast.success(`Estado cambiado a: ${confirmEstado.next}`);
    } catch (error) {
      setConfirmEstado(null);
      toast.error(mensajeError(error, "No se pudo cambiar el estado de la categoría."));
    } finally {
      setGuardando(false);
    }
  };

  const cuentaMenu = (c: CategoriaProducto) =>
    `${c.productosMenu ?? 0} de ${c.totalProductos ?? 0} ${(c.totalProductos ?? 0) === 1 ? "producto está" : "productos están"} en el menú`;
  const apagada = (c: CategoriaProducto) => estadoDe(c) === "Inactivo";
  const pedirCambioEstado = (c: CategoriaProducto) =>
    setConfirmEstado({
      id: c.id,
      nombre: c.nombre,
      current: estadoDe(c),
      next: apagada(c) ? "Activo" : "Inactivo",
      productosMenu: c.productosMenu ?? 0,
    });
  const abrirEditar = (c: CategoriaProducto) => {
    setEditErrors({});
    setEditItem({ ...c });
    // Grupo del selector donde vive el emoji actual (0 si no se encuentra).
    setGrupoIconoEdicion(Math.max(0, GRUPOS_ICONOS.findIndex((g) => g.iconos.includes(c.icono ?? ""))));
  };
  const abrirCrear = () => {
    setFormNombre("");
    setFormIcono("");
    setGrupoIconoSeleccionado(0);
    setFormDescripcion("");
    setFormEstado("Activo");
    setCreateErrors({});
    setShowCreate(true);
  };

  // Estado que la gente ve: «Se ve en el menú» / «Apagada».
  const PillEstado = ({ c }: { c: CategoriaProducto }) => (
    <EstadoPill tono={apagada(c) ? "gris" : "verde"}>{apagada(c) ? "Apagada" : "Se ve en el menú"}</EstadoPill>
  );

  // Cuando no se puede borrar, se explica en un diálogo (antes era un aviso pasajero).
  const [bloqueoBorrar, setBloqueoBorrar] = useState<CategoriaProducto | null>(null);
  const motivosBloqueo = (c: CategoriaProducto) =>
    CATEGORIAS_FIJAS.has(c.id)
      ? ["Es una de las categorías originales (Pizza, Lasaña y Bebidas)", "Esas vienen con el sistema y no se borran"]
      : [`Tiene ${c.totalProductos ?? 0} ${(c.totalProductos ?? 0) === 1 ? "producto" : "productos"}`, "Primero hay que pasarlos a otra categoría o borrarlos"];

  /** Un solo formulario para crear y para cambiar. */
  const formulario = (modo: "crear" | "editar") => {
    const e = modo === "editar" ? editItem : null;
    if (modo === "editar" && !e) return null;
    const fija = !!e && CATEGORIAS_FIJAS.has(e.id);
    const nombre = e ? e.nombre : formNombre;
    const descripcion = e ? e.descripcion ?? "" : formDescripcion;
    const estado: EstadoCategoria = e ? estadoDe(e) : formEstado;
    const icono = e ? e.icono ?? "" : formIcono;
    const errs = e ? editErrors : createErrors;
    const grupo = e ? grupoIconoEdicion : grupoIconoSeleccionado;
    const setGrupo = e ? setGrupoIconoEdicion : setGrupoIconoSeleccionado;
    const cerrar = () => (e ? setEditItem(null) : setShowCreate(false));
    return (
      <Dialog.Root open onOpenChange={a => { if (!a) cerrar(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="pn-dialogo-fondo" />
          <Dialog.Content className="pn-modal pn-modal--medio" aria-describedby={undefined}>
            <div className="pn-modal__cab">
              <Dialog.Title className="pn-modal__titulo">{e ? `Cambiar «${e.nombre}»` : "Agregar una categoría"}</Dialog.Title>
            </div>
            <div className="grid gap-5">
              <SeccionFormulario titulo="Datos de la categoría">
                <div className="grid gap-4">
                  <CampoFormulario etiqueta="Nombre" ayuda={fija ? "Las categorías originales no cambian de nombre" : "Así sale en el menú"} error={errs.nombre}>
                    {(p) => (
                      <input
                        {...p}
                        value={nombre}
                        disabled={fija}
                        maxLength={MAX_NOMBRE}
                        placeholder="Ej: Postres"
                        onChange={ev => (e ? setEditItem(x => x && ({ ...x, nombre: ev.target.value })) : setFormNombre(ev.target.value))}
                      />
                    )}
                  </CampoFormulario>
                  <div>
                    <p className="pn-etiqueta">¿Se ve en el menú?</p>
                    <OpcionesBotones
                      etiqueta="Se ve en el menú"
                      valor={estado}
                      onChange={v => (e ? setEditItem(x => x && ({ ...x, estado: v as EstadoCategoria })) : setFormEstado(v as EstadoCategoria))}
                      opciones={[{ valor: "Activo", etiqueta: "Sí, mostrarla" }, { valor: "Inactivo", etiqueta: "Todavía no" }]}
                    />
                  </div>
                  <CampoFormulario etiqueta="Descripción" opcional error={errs.descripcion}>
                    {(p) => (
                      <textarea
                        {...p}
                        rows={3}
                        value={descripcion}
                        placeholder="Ej: Postres y dulces para cerrar la comida"
                        onChange={ev => (e ? setEditItem(x => x && ({ ...x, descripcion: ev.target.value })) : setFormDescripcion(ev.target.value))}
                      />
                    )}
                  </CampoFormulario>
                </div>
              </SeccionFormulario>

              <SeccionFormulario
                titulo="Dibujo que la acompaña"
                ayuda={fija ? "Las categorías originales no cambian de dibujo." : "Escoge un grupo y después el dibujo."}
              >
                <div className="flex items-center gap-4 mb-4">
                  <span aria-hidden="true" style={{ fontSize: "4rem", lineHeight: 1 }}>{icono || "·"}</span>
                  <span style={{ fontSize: "1.125rem", color: "var(--gris-texto)" }}>{icono ? "Así se verá en el menú" : "Todavía no escoges ninguno"}</span>
                </div>
                {!fija && (
                  <>
                    <div className="pn-opciones" role="group" aria-label="Grupo de dibujos" style={{ marginBottom: "0.875rem" }}>
                      {GRUPOS_ICONOS.map((g, idx) => (
                        <button key={g.nombre} type="button" className="pn-chip" aria-pressed={grupo === idx} onClick={() => setGrupo(idx)}>
                          {g.nombre}
                        </button>
                      ))}
                    </div>
                    <div className="pn-dibujos" role="group" aria-label="Dibujos del grupo">
                      {GRUPOS_ICONOS[grupo].iconos.map(ic => (
                        <button
                          key={ic}
                          type="button"
                          aria-label={`Dibujo ${ic}`}
                          aria-pressed={icono === ic}
                          className="pn-dibujo"
                          onClick={() => {
                            if (e) { setEditItem(x => x && ({ ...x, icono: ic })); setEditErrors(p => ({ ...p, icono: "" })); }
                            else { setFormIcono(ic); setCreateErrors(p => ({ ...p, icono: "" })); }
                          }}
                        >
                          {ic}
                        </button>
                      ))}
                    </div>
                    {errs.icono && <p className="pn-campo__error" role="alert"><span>Escoge un dibujo para la categoría</span></p>}
                  </>
                )}
              </SeccionFormulario>

              <div className="pn-dialogo__botones" style={{ justifyContent: "flex-start" }}>
                <BotonAccion variante="normal" onClick={cerrar}>Cancelar</BotonAccion>
                <BotonAccion variante="principal" disabled={guardando} onClick={() => void (e ? handleEdit() : handleCreate())}>
                  {guardando ? "Guardando…" : e ? "Guardar cambios" : "Agregar la categoría"}
                </BotonAccion>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  };

  const dialogos = (
    <>
      {showCreate && formulario("crear")}
      {editItem && formulario("editar")}
      <DialogoConfirmacion
        abierto={!!confirmEstado}
        onCambiarAbierto={a => { if (!a) setConfirmEstado(null); }}
        titulo={confirmEstado?.next === "Inactivo" ? `¿Apagar la categoría ${confirmEstado?.nombre ?? ""}?` : `¿Volver a mostrar la categoría ${confirmEstado?.nombre ?? ""}?`}
        queVaAPasar={confirmEstado?.next === "Inactivo"
          ? [
              (confirmEstado?.productosMenu ?? 0) === 1 ? "Su producto se esconde del menú" : `Sus ${confirmEstado?.productosMenu ?? 0} productos se esconden del menú`,
              "No se borra nada",
              "La puedes volver a prender",
            ]
          : ["Sus productos vuelven a salir en el menú de la página", "Los que estén agotados siguen sin poder pedirse"]}
        textoSeguro={confirmEstado?.next === "Inactivo" ? "No, dejarla como está" : "No, dejarla apagada"}
        textoAccion={confirmEstado?.next === "Inactivo" ? "Sí, apagarla" : "Sí, mostrarla"}
        onConfirmar={() => { void handleCambiarEstado(); }}
      />
      {bloqueoBorrar ? (
        <DialogoConfirmacion
          variante="bloqueo"
          abierto
          onCambiarAbierto={a => { if (!a) setBloqueoBorrar(null); }}
          titulo={`No se puede borrar la categoría ${bloqueoBorrar.nombre}`}
          porQueNo={motivosBloqueo(bloqueoBorrar)}
          textoAlternativa={!apagada(bloqueoBorrar) && canEdit ? "Apagarla" : undefined}
          onAlternativa={() => pedirCambioEstado(bloqueoBorrar)}
        />
      ) : (
        <DialogoConfirmacion
          abierto={!!deleteItem}
          onCambiarAbierto={a => { if (!a) setDeleteItem(null); }}
          titulo={`¿Borrar la categoría ${deleteItem?.nombre ?? ""}?`}
          queVaAPasar={["No tiene productos, así que no se pierde nada más", "No se puede deshacer"]}
          textoAccion="Sí, borrarla"
          onConfirmar={() => { if (deleteItem) void handleDelete(deleteItem.id); }}
        />
      )}
    </>
  );

  // ── Detalle ──
  if (detailItem) {
    const c = categorias.find(x => x.id === detailItem.id) ?? detailItem;
    return (
      <div className="pn-contenido pn-detalle">
        <BotonRuta>
          <BotonAccion icono={IconoVolver} onClick={() => setDetailItem(null)}>Volver a la lista</BotonAccion>
        </BotonRuta>
        <div className="flex flex-wrap items-center gap-4 mb-2">
          <span aria-hidden="true" style={{ fontSize: "4rem", lineHeight: 1 }}>{c.icono}</span>
          <h1 style={{ font: "700 2.125rem/1.15 var(--font-titulo)", margin: 0 }}>Categoría: {c.nombre}</h1>
          <PillEstado c={c} />
        </div>
        <p className="pn-seccion__ayuda" style={{ marginBottom: "1.25rem" }}>{c.descripcion?.trim() || "Todavía no tiene descripción"}</p>
        <SeccionFormulario titulo="Sus productos">
          <p style={{ fontSize: "1.375rem", fontWeight: 600, margin: 0 }}>{cuentaMenu(c)}</p>
          <p className="pn-seccion__ayuda" style={{ margin: "0.5rem 0 0" }}>Para ver y cambiar cada producto, entra a Productos.</p>
        </SeccionFormulario>
        <div className="pn-dialogo__botones" style={{ marginTop: "1.125rem", justifyContent: "flex-start" }}>
          {canEdit && <BotonAccion variante="principal" onClick={() => abrirEditar(c)}>Cambiar nombre o dibujo</BotonAccion>}
          {canEdit && (
            <BotonAccion variante={apagada(c) ? "bien" : "normal"} onClick={() => pedirCambioEstado(c)}>{apagada(c) ? "Encender" : "Apagar"}</BotonAccion>
          )}
          {canDelete && <BotonAccion variante="peligro" onClick={() => pedirEliminar(c)}>Borrar</BotonAccion>}
        </div>
        {dialogos}
      </div>
    );
  }

  // ── Lista ──
  return (
    <div className="pn-contenido">
      <EncabezadoPagina
        titulo="Categoría Productos"
        descripcion="Los grupos en que se ordena el menú de la página: pizzas, lasañas, bebidas…"
        acciones={canCreate && <BotonAccion variante="principal" icono={Plus} onClick={abrirCrear}>Agregar una categoría</BotonAccion>}
      />

      {cargando ? (
        <p role="status" className="pn-nota">Cargando las categorías…</p>
      ) : errorCarga ? (
        <AvisoBanner
          titulo="No pudimos cargar las categorías"
          boton={onReintentar ? <BotonAccion onClick={onReintentar}>Intentar de nuevo</BotonAccion> : undefined}
        >
          {errorCarga}
        </AvisoBanner>
      ) : (
        <>
          <div style={{ marginBottom: "1.5rem" }}>
            <BuscadorGrande
              etiqueta="Buscar una categoría"
              value={search}
              onChange={ev => { setSearch(ev.target.value); setPage(1); }}
              placeholder="Escribe el nombre de la categoría"
            />
          </div>

          {filtered.length === 0 ? (
            <VacioEstado icono={IconoTag} titulo="No encontramos ninguna categoría">
              Revisa cómo lo escribiste o agrega una nueva.
            </VacioEstado>
          ) : (
            <div className="pn-lista">
              {paged.map(c => (
                <TarjetaFila
                  key={c.id}
                  avatar={<span aria-hidden="true" style={{ fontSize: "2.5rem", lineHeight: 1 }}>{c.icono}</span>}
                  nombre={c.nombre}
                  detalle={c.descripcion?.trim() || "Todavía no tiene descripción"}
                  datos={[{ etiqueta: "En el menú", valor: cuentaMenu(c) }]}
                  estado={<PillEstado c={c} />}
                  acciones={
                    <>
                      <BotonAccion variante="normal" onClick={() => setDetailItem(c)}>Ver sus productos</BotonAccion>
                      {canEdit && <BotonAccion variante="normal" onClick={() => abrirEditar(c)}>Cambiar nombre</BotonAccion>}
                    </>
                  }
                />
              ))}
            </div>
          )}

          <PaginadorGrande pagina={Math.min(page, Math.max(1, totalPages))} total={filtered.length} porPagina={PER_PAGE} onCambiar={setPage} />
          <p className="pn-nota">Si apagas una categoría, sus productos se esconden del menú de la página. No se borra nada.</p>
        </>
      )}
      {dialogos}
    </div>
  );
}
