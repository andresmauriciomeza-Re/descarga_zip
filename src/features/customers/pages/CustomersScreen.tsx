import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { AvisoBanner } from "@/shared/components/panel/NoticeBanner";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";
import { BotonRuta } from "@/shared/components/buttons/BreadcrumbButton";
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
import { DOC_TIPOS, fmtDoc } from "@/features/users/utils/users";
import type { Usuario } from "@/features/users/utils/users";
import type { Rol } from "@/features/roles/utils/roles";
import { filtrarCorreo, filtrarDocumento, filtrarNombre, normalizarNombre, soloDigitos, validarCorreoBasico, validarDocumento, validarNombre, validarTelefono } from "@/shared/components/FormInputs";
import { cambiarEstadoCliente, crearCliente } from "@/shared/services/authService";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import type { Cliente } from "@/features/customers/utils/customers";

const SERIF = "var(--font-titulo)";
const MONO  = "var(--font-texto)";


export function GestionClientesScreen({ canCreate = true, canEdit = true, canDelete: _canDelete = true, clientes: _clientes, setClientes: _setClientes, usuarios, roles = [], sesionCorreo = "" }: {
  canCreate?: boolean; canEdit?: boolean; canDelete?: boolean;
  clientes: Cliente[];
  setClientes: React.Dispatch<React.SetStateAction<Cliente[]>>;
  usuarios: Usuario[];
  /** Roles del sistema: con ellos se dice quién es Administrador. */
  roles?: Rol[];
  /** Correo de la cuenta con la que se abrió la sesión (su propio cliente). */
  sesionCorreo?: string;
}) {
  const { clientes, cargando, errorCarga, cargarClientes, search, setSearch, filterEstado, setFiltro, sortBy, setSortBy, setPage, total, inact, filtered, PER_PAGE, pageActual, paged } = useCustomers();
  const [detailItem,   setDetailItem] = useState<Cliente | null>(null);
  const [showCreate,   setShowCreate] = useState(false);
  const [newNombre,    setNewNombre]  = useState("");
  const [newCorreo,    setNewCorreo]  = useState("");
  const [newTelefono,  setNewTelefono]= useState("");
  const [newTipoDoc,   setNewTipoDoc] = useState("CC");
  const [newDocumento, setNewDocumento] = useState("");
  const [newActivo,    setNewActivo]  = useState(true);
  const [createErrors, setCreateErrors] = useState<{ nombre?: string; correo?: string; tipoDocumento?: string; numeroDocumento?: string; telefono?: string }>({});





  // ── Bloqueos del estado de un cliente ─────────────────────────────────
  // Dos cuentas no se pueden apagar: la del administrador (si no, nadie
  // entraría al panel) y la propia (el usuario se dejaría fuera de su sesión).
  const rolDeCorreo = (correo: string): Rol | null => {
    const em = correo.trim().toLowerCase();
    // Un correo vacío nunca coincide con otro vacío: si no, todos los clientes
    // sin correo (p. ej. los creados desde una venta) tomarían el rol del
    // primer usuario también sin correo.
    if (!em) return null;
    const u = usuarios.find((x) => x.correo.trim().toLowerCase() === em);
    if (!u) return null;
    return roles.find((r) => r.id === u.rolId) ?? null;
  };
  /** ¿El cliente es una cuenta con rol "Administrador"? Se compara por el
      NOMBRE del rol y no por su id, porque el módulo de Roles permite
      renombrar los roles: si mañana "Administrador" se llama distinto, el
      id fijo ya no significaría nada. */
  const esAdministrador = (c: Cliente) => rolDeCorreo(c.correo)?.nombre === "Administrador";
  /** ¿Es la cuenta con la que se abrió la sesión? */
  const esCuentaPropia = (c: Cliente) =>
    !!sesionCorreo &&
    c.correo.trim().toLowerCase() === sesionCorreo.trim().toLowerCase();
  /** Mensaje de error si el estado de este cliente no se puede tocar. */
  const bloqueoEstado = (c: Cliente): string | null =>
    esAdministrador(c)
      ? "No es posible cambiar el estado del administrador"
      : esCuentaPropia(c)
        ? "No es posible cambiar el estado de tu propia cuenta"
        : null;
  /** Tooltip del control de la lista: el del administrador explica la regla. */
  const tooltipEstado = (c: Cliente) =>
    esAdministrador(c) ? "El administrador no puede ser inactivado" : bloqueoEstado(c);

  const toggleEstado = async (id: string) => {
    const cliente = clientes.find(c => c.id === id);
    const motivo = cliente ? bloqueoEstado(cliente) : null;
    if (motivo) { toast.error(motivo); return; }
    if (!cliente) return;
    try {
      await cambiarEstadoCliente(cliente.numeroDocumento, !cliente.activo);
      await cargarClientes();
      toast.success("Estado del cliente actualizado");
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo cambiar el estado."); }
  };

  const resetCreate = () => {
    setNewNombre(""); setNewCorreo(""); setNewTelefono(""); setNewTipoDoc("CC"); setNewDocumento("");
    setNewActivo(true); setCreateErrors({});
  };

  // ── P1 — Validación en tiempo real del alta de cliente ─────────────────
  // Mientras se escribe ya se comprueba el formato (con los helpers de
  // `campo.tsx`) Y que el dato no pertenezca ya a otra persona: el duplicado
  // se busca en las tres colecciones (clientes, empleados y usuarios), igual
  // que en el envío, para que el botón quede bloqueado en cuanto el usuario
  // pega un documento o correo ya registrado. Se usan las MISMAS funciones en
  // onChange y en handleCreate, así no puede existir un duplicado que el
  // envío detecte pero el tiempo real no.
  const correoDuplicado = (correo: string): boolean => {
    const em = correo.trim().toLowerCase();
    // Un correo vacío nunca coincide con otro correo vacío.
    if (!em) return false;
    return (
      clientes.some(c => c.correo.trim() !== "" && c.correo.trim().toLowerCase() === em) ||
      usuarios.some(u => u.correo.trim() !== "" && u.correo.trim().toLowerCase() === em)
    );
  };
  const documentoDuplicado = (tipo: string, numero: string): boolean => {
    const clave = `${tipo}||${numero}`.toLowerCase();
    return (
      clientes.some(c => `${c.tipoDocumento}||${c.numeroDocumento}`.toLowerCase() === clave) ||
      usuarios.some(u => `${u.tipoDocumento}||${u.numeroDocumento}`.toLowerCase() === clave)
    );
  };
  // Devuelve el error del campo, o undefined si está válido (o vacío: el
  // vacío solo se marca en el envío, para no gritar "obligatorio" al abrir
  // el modal).
  const errorCorreoAlta = (correo: string): string | undefined => {
    if (!correo.trim()) return undefined;
    const formato = validarCorreoBasico(correo);
    if (formato) return formato;
    return correoDuplicado(correo) ? "Ya existe un cliente con este correo" : undefined;
  };
  const errorDocumentoAlta = (tipo: string, numero: string): string | undefined => {
    if (!numero.trim()) return undefined;
    const formato = validarDocumento(numero, tipo);
    if (formato) return formato;
    return documentoDuplicado(tipo, numero) ? "Ya existe un cliente con este documento" : undefined;
  };
  // P1: el botón queda bloqueado mientras haya CUALQUIER error en el alta
  // (formato inválido O duplicado de documento/correo).
  const createBloqueado = Object.values(createErrors).some(v => !!v);

  const handleCreate = async () => {
    const errs: { nombre?: string; correo?: string; tipoDocumento?: string; numeroDocumento?: string; telefono?: string } = {};
    if (!newNombre.trim()) errs.nombre = "El nombre es obligatorio";
    else { const v = validarNombre(newNombre); if (v) errs.nombre = v; }
    if (!newCorreo.trim()) {
      errs.correo = "El correo es obligatorio";
    } else {
      // Reutiliza las mismas funciones del tiempo real: formato + duplicado.
      const v = errorCorreoAlta(newCorreo);
      if (v) errs.correo = v;
    }
    const et = validarTelefono(newTelefono);
    if (et) errs.telefono = et;
    if (!newTipoDoc.trim()) {
      errs.tipoDocumento = "Selecciona el tipo de documento";
    }
    const dm = newDocumento.trim();
    if (!dm) {
      errs.numeroDocumento = "El número de documento es obligatorio";
    } else {
      const v = errorDocumentoAlta(newTipoDoc, dm);
      if (v) errs.numeroDocumento = v;
    }
    if (Object.keys(errs).length) { setCreateErrors(errs); return; }

    try {
      await crearCliente({ tipoDocumento: newTipoDoc, numeroDocumento: dm, nombre: normalizarNombre(newNombre), correo: newCorreo.trim(), telefono: newTelefono, estado: newActivo });
      await cargarClientes();
      setShowCreate(false); resetCreate();
      toast.success(`Cliente ${newNombre.trim()} creado correctamente`);
    } catch (error) { const mensaje = error instanceof Error ? error.message : "No se pudo crear el cliente."; if (mensaje.toLowerCase().includes("correo ya está registrado")) setCreateErrors(p => ({ ...p, correo: "Este correo ya está registrado" })); else toast.error(mensaje); }
  };

  const documentoLegible = (tipo: string, numero: string) =>
    `${tipo ? `${tipo} ` : ""}${/^\d+$/.test(numero) ? Number(numero).toLocaleString("es-CO") : numero}`;
  const Avatar = ({ c, tam }: { c: Cliente; tam: number }) => (
    <div
      className={`${c.avatarColor} text-white font-bold shrink-0 flex items-center justify-center rounded-full`}
      style={{ width: tam, height: tam, fontSize: tam * 0.36 }}
      aria-hidden="true"
    >
      {c.iniciales}
    </div>
  );
  const EstadoCompra = ({ activo }: { activo: boolean }) => (
    <EstadoPill tono={activo ? "verde" : "gris"}>
      {activo ? "Activo · puede comprar" : "Inactivo · no puede comprar"}
    </EstadoPill>
  );

  const [desactivarItem, setDesactivarItem] = useState<Cliente | null>(null);
  const cerrarCrear = () => { setShowCreate(false); resetCreate(); };
  const chipEstado = filterEstado === "inactivo" ? "inactivo" : "todos";

  /** Botón de estado de un cliente: «Desactivar» pide confirmación; «Volver a activar» se hace directo. */
  const botonEstado = (c: Cliente) => {
    if (!canEdit) return null;
    const bloqueo = bloqueoEstado(c);
    return (
      <BotonAccion
        variante={c.activo ? "peligro" : "bien"}
        disabled={!!bloqueo}
        title={tooltipEstado(c) ?? undefined}
        onClick={() => (c.activo ? setDesactivarItem(c) : void toggleEstado(c.id))}
      >
        {c.activo ? "Desactivar" : "Volver a activar"}
      </BotonAccion>
    );
  };

  const dialogoDesactivar = (
    <DialogoConfirmacion
      abierto={!!desactivarItem}
      onCambiarAbierto={a => { if (!a) setDesactivarItem(null); }}
      titulo={`¿Desactivar a ${desactivarItem?.nombre ?? ""}?`}
      queVaAPasar={[
        "Ya no podrá entrar ni comprar por la página",
        "Sus pedidos anteriores no se borran",
        "Lo puedes volver a activar cuando quieras",
      ]}
      textoAccion="Sí, desactivar"
      onConfirmar={() => { if (desactivarItem) void toggleEstado(desactivarItem.id); }}
    />
  );

  // ── Detalle de un cliente ──
  if (detailItem) {
    // La lista se recarga al cambiar el estado: se toma la versión más nueva.
    const c = clientes.find(x => x.id === detailItem.id) ?? detailItem;
    return (
      <div className="pn-contenido" style={{ maxWidth: "56.25rem" }}>
        <BotonRuta>
          <BotonAccion icono={ArrowLeft} onClick={() => setDetailItem(null)}>Volver a la lista</BotonAccion>
        </BotonRuta>
        <div className="flex flex-wrap items-center gap-5 mb-6">
          <Avatar c={c} tam={80} />
          <div className="min-w-0">
            <h1 style={{ font: "700 2.125rem/1.15 var(--font-titulo)", margin: 0, overflowWrap: "anywhere" }}>{c.nombre}</h1>
            <div className="mt-2"><EstadoCompra activo={c.activo} /></div>
          </div>
        </div>
        <div className="grid gap-5">
          <SeccionFormulario titulo="Sus datos">
            <DatosDetalle datos={[
              { etiqueta: "Documento", valor: documentoLegible(c.tipoDocumento, c.numeroDocumento) },
              { etiqueta: "Correo", valor: c.correo || "—" },
              { etiqueta: "Celular", valor: c.telefono || "—" },
            ]} />
            <p className="pn-campo__ayuda" style={{ fontSize: "1.0625rem", marginTop: "1rem" }}>
              Los datos los cambia cada persona desde su perfil.
            </p>
          </SeccionFormulario>
          <SeccionFormulario titulo="Resumen">
            <DatosDetalle datos={[
              { etiqueta: "Pedidos hechos", valor: <span style={{ font: "700 1.625rem var(--font-titulo)" }}>{c.pedidos}</span> },
            ]} />
          </SeccionFormulario>
          <div className="pn-dialogo__botones" style={{ justifyContent: "flex-start" }}>{botonEstado(c)}</div>
        </div>
        {dialogoDesactivar}
      </div>
    );
  }

  // ── Lista ──
  return (
    <div className="pn-contenido">
      <EncabezadoPagina
        titulo="Clientes"
        descripcion="Las personas que compran en La Sirena. Sus datos los cambia cada cliente desde su perfil"
        acciones={canCreate && (
          <BotonAccion variante="principal" icono={UserPlus} onClick={() => setShowCreate(true)}>Agregar un cliente</BotonAccion>
        )}
      />

      <div className="grid gap-4 mb-6">
        <BuscadorGrande
          etiqueta="Buscar un cliente"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Escribe el nombre, la cédula o el correo"
        />
        <FiltrosChips
          valor={chipEstado}
          onChange={v => { setFiltro(v); setPage(1); }}
          opciones={[
            { valor: "todos", etiqueta: "Todos", contador: total },
            { valor: "inactivo", etiqueta: "Inactivos", contador: inact },
          ]}
        />
        <FiltrosChips
          titulo="Ordenar por:"
          valor={sortBy}
          onChange={v => { setSortBy(v); setPage(1); }}
          opciones={[
            { valor: "id", etiqueta: "Los más nuevos" },
            { valor: "nombre", etiqueta: "Nombre" },
            { valor: "pedidos", etiqueta: "Los que más compran" },
          ]}
        />
      </div>

      {cargando ? (
        <p role="status" className="pn-nota">Cargando los clientes…</p>
      ) : errorCarga ? (
        <AvisoBanner
          titulo="No pudimos cargar los clientes"
          boton={<BotonAccion onClick={() => void cargarClientes()}>Intentar de nuevo</BotonAccion>}
        >
          {errorCarga}
        </AvisoBanner>
      ) : paged.length === 0 ? (
        <VacioEstado icono={Users} titulo="No encontramos ningún cliente">
          Revisa cómo lo escribiste o cambia el filtro.
        </VacioEstado>
      ) : (
        <div className="pn-lista">
          {paged.map(c => (
            <TarjetaFila
              key={c.id}
              avatar={<Avatar c={c} tam={56} />}
              nombre={c.nombre}
              detalle={
                <>
                  {documentoLegible(c.tipoDocumento, c.numeroDocumento)}{c.telefono ? ` · ${c.telefono}` : ""}
                  <br />{c.correo || "Sin correo"}
                </>
              }
              datos={[{ etiqueta: "Pedidos", valor: <span style={{ font: "700 1.625rem var(--font-titulo)" }}>{c.pedidos}</span> }]}
              estado={<EstadoCompra activo={c.activo} />}
              acciones={
                <>
                  <BotonAccion variante="normal" onClick={() => setDetailItem(c)}>Ver datos y pedidos</BotonAccion>
                  {botonEstado(c)}
                </>
              }
            />
          ))}
        </div>
      )}

      <PaginadorGrande pagina={pageActual} total={filtered.length} porPagina={PER_PAGE} onCambiar={setPage} />
      {dialogoDesactivar}

      {/* Formulario: Agregar un cliente */}
      {showCreate && (
        <Dialog.Root open onOpenChange={a => { if (!a) cerrarCrear(); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="pn-dialogo-fondo" />
            <Dialog.Content className="pn-modal pn-modal--medio" aria-describedby={undefined}>
              <div className="pn-modal__cab">
                <Dialog.Title className="pn-modal__titulo">Agregar un cliente</Dialog.Title>
              </div>
              <SeccionFormulario titulo="Datos del cliente">
                <div className="pn-grilla">
                  <CampoFormulario etiqueta="Tipo de documento" error={createErrors.tipoDocumento}>
                    {(p) => (
                      <select
                        {...p}
                        value={newTipoDoc}
                        // P1: al cambiar el tipo se revalida el documento en
                        // tiempo real, porque el formato y el duplicado
                        // dependen del tipo (CC 6-10, CE/PP 6-12).
                        onChange={e => { setNewTipoDoc(e.target.value); setCreateErrors(prev => ({ ...prev, tipoDocumento: undefined, numeroDocumento: errorDocumentoAlta(e.target.value, newDocumento) })); }}
                      >
                        {DOC_TIPOS.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                      </select>
                    )}
                  </CampoFormulario>
                  <CampoFormulario etiqueta="Número de documento" ayuda="Solo números, sin puntos" error={createErrors.numeroDocumento}>
                    {(p) => (
                      <input
                        {...p}
                        type="text"
                        inputMode="numeric"
                        value={newDocumento}
                        autoComplete="off"
                        // P1 — tiempo real: solo dígitos y como máximo 10 (CC) o 12.
                        onChange={e => { const v = soloDigitos(e.target.value).slice(0, newTipoDoc === "CC" ? 10 : 12); setNewDocumento(v); setCreateErrors(prev => ({ ...prev, numeroDocumento: errorDocumentoAlta(newTipoDoc, v) })); }}
                        placeholder="12345678"
                      />
                    )}
                  </CampoFormulario>
                  <CampoFormulario etiqueta="Nombre completo" ayuda="Solo letras y espacios" error={createErrors.nombre}>
                    {(p) => (
                      <input
                        {...p}
                        type="text"
                        value={newNombre}
                        onChange={e => { const v = filtrarNombre(e.target.value); setNewNombre(v); setCreateErrors(prev => ({ ...prev, nombre: validarNombre(v) ?? undefined })); }}
                        onBlur={() => setNewNombre(normalizarNombre(newNombre))}
                        placeholder="Ej: Laura Martínez"
                        autoFocus
                      />
                    )}
                  </CampoFormulario>
                  <CampoFormulario etiqueta="Correo" error={createErrors.correo}>
                    {(p) => (
                      <input
                        {...p}
                        type="email"
                        value={newCorreo}
                        autoComplete="off"
                        onChange={e => { const v = filtrarCorreo(e.target.value); setNewCorreo(v); setCreateErrors(prev => ({ ...prev, correo: undefined })); }}
                        placeholder="correo@gmail.com"
                      />
                    )}
                  </CampoFormulario>
                  <CampoFormulario etiqueta="Celular" ayuda="10 números" error={createErrors.telefono}>
                    {(p) => (
                      <input
                        {...p}
                        type="tel"
                        inputMode="numeric"
                        value={newTelefono}
                        autoComplete="off"
                        onChange={e => {
                          const v = soloDigitos(e.target.value);
                          setNewTelefono(v);
                          setCreateErrors(prev => ({ ...prev, telefono: v ? validarTelefono(v) ?? undefined : undefined }));
                        }}
                        placeholder="3001234567"
                      />
                    )}
                  </CampoFormulario>
                  <div>
                    <p className="pn-etiqueta">¿Puede comprar desde ya?</p>
                    <OpcionesBotones
                      etiqueta="Estado del cliente"
                      valor={newActivo ? "activo" : "inactivo"}
                      onChange={valor => setNewActivo(valor === "activo")}
                      opciones={[{ valor: "activo", etiqueta: "Sí, activo" }, { valor: "inactivo", etiqueta: "No, inactivo" }]}
                    />
                  </div>
                </div>
              </SeccionFormulario>
              <div className="pn-dialogo__botones" style={{ marginTop: "1.125rem", justifyContent: "flex-start" }}>
                <BotonAccion variante="normal" onClick={cerrarCrear}>Cancelar</BotonAccion>
                <BotonAccion
                  variante="principal"
                  // P1: bloqueado mientras haya error de formato o un
                  // documento/correo duplicado.
                  disabled={createBloqueado}
                  title={createBloqueado ? "Corrige lo que está en rojo para poder agregarlo" : undefined}
                  onClick={handleCreate}
                >
                  Agregar el cliente
                </BotonAccion>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}
