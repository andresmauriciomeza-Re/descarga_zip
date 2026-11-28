import { useState } from "react";
import { Plus, Lock, Home, Settings, Users, ShoppingBag, Layers, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { AvisoBanner } from "@/shared/components/panel/NoticeBanner";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";
import { BuscadorGrande } from "@/shared/components/panel/LargeSearch";
import { DialogoConfirmacion } from "@/shared/components/panel/ConfirmDialog";
import { EncabezadoPagina } from "@/shared/components/panel/PageHeader";
import { EstadoPill } from "@/shared/components/panel/StatusPill";
import { PaginadorGrande } from "@/shared/components/panel/LargePaginator";
import { TarjetaFila } from "@/shared/components/panel/RowCard";
import { VacioEstado } from "@/shared/components/panel/EmptyState";
import { cambiarEstadoRol as cambiarEstadoRolApi, crearRol as crearRolApi, editarRol as editarRolApi, eliminarRol as eliminarRolApi, type RolPayloadApi } from "@/shared/services/authService";
import { useRoles } from "@/features/roles/hooks/useRoles";
import { type Rol, MENU_TREE, KEY, adaptarRolApi, mensajeError, type AccesosMap } from "@/features/roles/utils/roles";
import { RolModal } from "@/features/roles/components/RoleModal";
import { DetalleCargo } from "@/features/roles/components/RoleDetail";
import { type Celda, listaY } from "@/features/roles/utils/roles";

const SERIF = "var(--font-titulo)";

const CELDAS: Celda[] = [
  { nombre: "Dashboard",     modulo: "Dashboard" },
  { nombre: "Configuración", modulo: "Configuración", subs: ["Roles"] },
  // El sidebar agrupa Usuarios y Empleados bajo una sección "Usuarios", de ahí
  // que compartan celda. Sigue siendo "un módulo simple" en permisos: cada
  // sub-opción ofrece las 4 acciones de accionesDe("Configuración").
  { nombre: "Usuarios",      modulo: "Configuración", subs: ["Usuarios"] },
  { nombre: "Compras",       modulo: "Compras" },
  { nombre: "Producción",    modulo: "Producción" },
  { nombre: "Ventas",        modulo: "Ventas" },
];

// Ícono de cada celda, indexado por nombre de celda y NO por módulo: la celda
// "Usuarios" apunta al módulo "Configuración" y debe mostrar las personas, no
// el engranaje. Son los mismos iconos que usa el sidebar. Una celda sin entrada
// aquí se sigue mostrando por su nombre, solo sin icono.
const CELDA_ICONOS: Record<string, typeof Home> = {
  Dashboard:     Home,
  Configuración: Settings,
  Usuarios:      Users,
  Compras:       ShoppingBag,
  Producción:    Layers,
  Ventas:        DollarSign,
};

// "Administrador" y "Cliente" se reconocen SIEMPRE por nombre, nunca por id:
// los ids de roles base solo sirven como ancla de migración, porque el
// administrador puede renombrarlos o restaurar datos de semilla.
// "Empleado" también es base para eliminar/inactivar (pero SÍ se edita).
export const esRolBase = (r?: Rol | null): boolean => {
  const n = (r?.nombre ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return n === "administrador" || n === "cliente" || n === "empleado";
};

// Un rol se puede editar salvo los dos fijos por simplicidad de cuenta:
// "Administrador" y "Cliente". "Empleado" y todo rol extra/creado sí se editan.
export const rolEditable = (r?: Rol | null): boolean => {
  return !esRolBase(r);
};

// "Permisos" = sub-módulos con al menos un privilegio asignado.
export const countAccesos = (accesos: AccesosMap) =>
  Object.values(accesos).filter(v => v.length > 0).length;

// "Módulos" = los que tienen al menos un permiso, para el contador
// "N permisos en M módulos" de la vista de detalle.
const countModulosConAcceso = (accesos: AccesosMap) =>
  MENU_TREE.filter(({ modulo, subs }) =>
    subs.some(sub => (accesos[KEY(modulo, sub)] ?? []).length > 0)
  ).length;

// Texto de usuarios asignados, en singular y plural.
const textoUsuariosAsignados = (n: number) =>
  n === 0
    ? "Sin usuarios asignados"
    : `${n} usuario${n === 1 ? "" : "s"} asignado${n === 1 ? "" : "s"}`;

// "15 permisos en 5 módulos". Exportado porque el detalle de usuario rotula cada
// tabla de permisos con el mismo contador que el detalle de rol.
export const textoPermisosModulos = (accesos: AccesosMap) => {
  const permisos = countAccesos(accesos);
  const modulos = countModulosConAcceso(accesos);
  return `${permisos} permiso${permisos === 1 ? "" : "s"} en ${modulos} módulo${modulos === 1 ? "" : "s"}`;
};


/** Opciones del menú en las que el cargo tiene al menos un permiso. */
const opcionesConAcceso = (accesos: AccesosMap) =>
  MENU_TREE.flatMap(({ modulo, subs }) => subs.filter(sub => (accesos[KEY(modulo, sub)] ?? []).length > 0));

const textoPuedeUsar = (accesos: AccesosMap) => {
  const o = opcionesConAcceso(accesos);
  return o.length === 0 ? "nada todavía" : listaY(o);
};

const idRolUiAApi = (id: string) => {
  const numero = Number(id.replace(/^ROL-/, ""));
  if (!Number.isSafeInteger(numero) || numero <= 0) throw new Error("El identificador del rol no es válido.");
  return String(numero);
};

const payloadRolApi = (nombre: string, descripcion: string, activo: boolean, accesos: AccesosMap): RolPayloadApi => ({
  nombre,
  descripcion,
  activo,
  accesos,
});

// ── Pantalla principal ────────────────────────────────────────────────
export function GestionConfigScreen({
  canVer = true,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  accesosPropios,
  loggedInRolId,
  onIrAEmpleados,
}: {
  canVer?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  accesosPropios?: AccesosMap;
  loggedInRolId?: string | null;
  /** Lleva a la pantalla de Empleados (botón «Ir a Empleados»). */
  onIrAEmpleados?: () => void;
}) {
  const { roles, setRoles, cargando, errorCarga, page, setPage, PER_PAGE, search, setSearch, cargarRoles, filtered, paged } = useRoles(canVer);
  const [showCreate, setShowCreate]= useState(false);
  const [editItem,   setEditItem]  = useState<Rol | null>(null);
  const [detailItem, setDetailItem]= useState<Rol | null>(null);
  const [deleteId,   setDeleteId]  = useState<string | null>(null);
  const [desactivarId, setDesactivarId] = useState<string | null>(null);
  const [estadoEnCurso, setEstadoEnCurso] = useState<string | null>(null);





  const handleCreate = async (nombre: string, desc: string, activo: boolean, accesos: AccesosMap) => {
    try {
      const creado = await crearRolApi(payloadRolApi(nombre, desc, activo, accesos));
      const rol = adaptarRolApi(creado);
      setRoles(p => [...p, rol]);
      setShowCreate(false);
      toast.success(`Rol ${rol.id} creado correctamente`);
    } catch (error) {
      toast.error(mensajeError(error, "No se pudo crear el rol."));
    }
  };

  const saveRol = async (id: string | null, nombre: string, desc: string, activo: boolean, accesos: AccesosMap) => {
    if (!id) return;
    const rol = roles.find(x => x.id === id);
    if (!rol) return;
    if (esRolBase(rol)) {
      toast.error("Este rol base no se puede editar");
      return;
    }
    if (rol.activo) {
      toast.error("Desactiva el rol antes de editarlo");
      return;
    }
    if (activo) {
      toast.error("Guarda el rol inactivo y actívalo después desde su estado.");
      return;
    }
    try {
      const actualizado = await editarRolApi(idRolUiAApi(id), payloadRolApi(nombre, desc, false, accesos));
      const nuevo = adaptarRolApi(actualizado);
      setRoles(p => p.map(x => x.id === id ? nuevo : x));
      setEditItem(null);
      toast.success("Rol actualizado correctamente");
    } catch (error) {
      toast.error(mensajeError(error, "No se pudo editar el rol."));
    }
  };

  const aplicarEstado = async (rol: Rol, activo: boolean, confirmado = false) => {
    if (esRolBase(rol) && !activo) {
      toast.error("No se puede desactivar un rol base.");
      return false;
    }
    if (rol.id === loggedInRolId) {
      toast.error("No puedes modificar tu propio rol.");
      return false;
    }
    if (rol.activo && !activo && (rol.usuariosAsignados ?? 0) > 0 && !confirmado) {
      setDesactivarId(rol.id);
      return false;
    }
    setEstadoEnCurso(rol.id);
    try {
      const actualizado = await cambiarEstadoRolApi(idRolUiAApi(rol.id), activo);
      const nuevo = adaptarRolApi(actualizado);
      setRoles(p => p.map(x => x.id === rol.id ? nuevo : x));
      setDesactivarId(null);
      toast.success(`Rol ${activo ? "activado" : "desactivado"} correctamente`);
      return true;
    } catch (error) {
      toast.error(mensajeError(error, "No se pudo cambiar el estado del rol."));
      return false;
    } finally {
      setEstadoEnCurso(null);
    }
  };

  const confirmarDesactivacion = async () => {
    const rol = roles.find(r => r.id === desactivarId);
    if (rol) await aplicarEstado(rol, false, true);
  };

  const handleDelete = async (id: string) => {
    const rol = roles.find(r => r.id === id);
    const asignados = rol?.usuariosAsignados ?? 0;
    if (esRolBase(rol) || asignados > 0) {
      toast.error(esRolBase(rol)
        ? "No se puede eliminar un rol base."
        : `No se puede eliminar el rol porque tiene ${asignados} usuario(s) asignado(s).`);
      return;
    }
    try {
      const respuesta = await eliminarRolApi(idRolUiAApi(id));
      setRoles(p => p.filter(r => r.id !== id));
      setDeleteId(null);
      toast.success(respuesta.mensaje);
    } catch (error) {
      toast.error(mensajeError(error, "No se pudo eliminar el rol."));
    }
  };

  const tarjetaCargo = (r: Rol) => {
    const fijo = esRolBase(r);
    const propio = r.id === loggedInRolId;
    const ocupado = estadoEnCurso === r.id;
    const personas = r.usuariosAsignados ?? 0;
    return (
      <TarjetaFila
        key={r.id}
        nombre={<span style={{ fontSize: "1.5rem" }}>{r.nombre}</span>}
        detalle={
          <>
            Puede usar: {textoPuedeUsar(r.accesos)}
            {propio && <><br />Es tu propio cargo: no puedes apagarlo ni borrarlo.</>}
          </>
        }
        datos={[{ etiqueta: "Personas con este cargo", valor: personas === 0 ? "Nadie" : String(personas) }]}
        estado={
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.625rem" }}>
            <EstadoPill tono={r.activo ? "verde" : "gris"}>{r.activo ? "Encendido" : "Apagado"}</EstadoPill>
            {fijo && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: "1.0625rem", fontWeight: 600, color: "var(--gris-texto)" }}>
                <Lock size={20} aria-hidden="true" /> Fijo
              </span>
            )}
          </div>
        }
        acciones={
          fijo ? (
            <BotonAccion variante="normal" onClick={() => setDetailItem(r)}>Ver qué puede hacer</BotonAccion>
          ) : r.activo ? (
            <>
              {canEdit && (
                <BotonAccion
                  variante="principal"
                  disabled={propio || ocupado}
                  onClick={() => setDesactivarId(r.id)}
                >
                  Apagar para cambiarlo
                </BotonAccion>
              )}
              <BotonAccion variante="normal" onClick={() => setDetailItem(r)}>Ver qué puede hacer</BotonAccion>
            </>
          ) : (
            <>
              {canEdit && (
                <BotonAccion variante="principal" onClick={() => setEditItem(r)}>Cambiar permisos</BotonAccion>
              )}
              {canEdit && (
                <BotonAccion variante="bien" disabled={propio || ocupado} onClick={() => void aplicarEstado(r, true)}>
                  Encender
                </BotonAccion>
              )}
              <BotonAccion variante="normal" onClick={() => setDetailItem(r)}>Ver qué puede hacer</BotonAccion>
              {canDelete && (
                <BotonAccion variante="peligro" disabled={propio} onClick={() => setDeleteId(r.id)}>
                  Borrar cargo
                </BotonAccion>
              )}
            </>
          )
        }
      />
    );
  };

  if (!canVer) {
    return (
      <div className="pn-contenido">
        <VacioEstado icono={Lock} titulo="No tienes permiso para ver los cargos">
          Pide acceso a la persona que administra el sistema.
        </VacioEstado>
      </div>
    );
  }

  const cargosSistema = paged.filter(esRolBase);
  const cargosPizzeria = paged.filter(r => !esRolBase(r));
  const rolApagar = roles.find(r => r.id === desactivarId) ?? null;
  const rolBorrar = roles.find(r => r.id === deleteId) ?? null;
  const personasApagar = rolApagar?.usuariosAsignados ?? 0;
  const personasBorrar = rolBorrar?.usuariosAsignados ?? 0;

  return (
    <div className="pn-contenido">
      <EncabezadoPagina
        titulo="Roles"
        descripcion="Cada cargo dice qué partes del sistema puede usar una persona"
        acciones={canCreate && (
          <BotonAccion variante="principal" icono={Plus} onClick={() => setShowCreate(true)}>
            Crear un cargo nuevo
          </BotonAccion>
        )}
      />

      <BuscadorGrande
        etiqueta="Buscar un cargo"
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
        placeholder="Escribe el nombre del cargo"
      />

      <div style={{ marginTop: "1.5rem" }}>
        {cargando ? (
          <p role="status" className="pn-nota">Cargando los cargos…</p>
        ) : errorCarga ? (
          <AvisoBanner
            titulo="No pudimos cargar los cargos"
            boton={<BotonAccion onClick={() => void cargarRoles()}>Intentar de nuevo</BotonAccion>}
          >
            {errorCarga}
          </AvisoBanner>
        ) : paged.length === 0 ? (
          <VacioEstado icono={Lock} titulo={search.trim() ? "No encontramos ningún cargo con ese nombre" : "Todavía no hay cargos"}>
            {search.trim() ? "Revisa cómo lo escribiste o prueba con otra palabra." : "Crea el primero con el botón «Crear un cargo nuevo»."}
          </VacioEstado>
        ) : (
          <>
            {cargosSistema.length > 0 && (
              <section style={{ marginBottom: "1.75rem" }}>
                <h2 className="pn-h2">Cargos del sistema</h2>
                <p className="pn-seccion__ayuda" style={{ margin: "0.25rem 0 0.875rem" }}>Vienen con el sistema y no se pueden cambiar.</p>
                <div className="pn-lista">{cargosSistema.map(tarjetaCargo)}</div>
              </section>
            )}
            {cargosPizzeria.length > 0 && (
              <section>
                <h2 className="pn-h2">Cargos de la pizzería</h2>
                <p className="pn-seccion__ayuda" style={{ margin: "0.25rem 0 0.875rem" }}>Los que tú creaste. Para cambiarlos, primero apágalos.</p>
                <div className="pn-lista">{cargosPizzeria.map(tarjetaCargo)}</div>
              </section>
            )}
            <PaginadorGrande pagina={page} total={filtered.length} porPagina={PER_PAGE} onCambiar={setPage} />
            <p className="pn-nota">
              Un cargo que tiene personas asignadas no se puede borrar. Primero cámbiales el cargo en Empleados.
            </p>
          </>
        )}
      </div>

      {showCreate && (
        <RolModal key="create" title="Crear un cargo nuevo"
          initialNombre="" initialDesc="" initialActivo={true} initialAccesos={{}}
          roles={roles}
          accesosPropios={accesosPropios}
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}

      {editItem && (
        <RolModal key={editItem.id} title={`Cambiar permisos del cargo ${editItem.nombre}`}
          initialNombre={editItem.nombre} initialDesc={editItem.descripcion}
          initialActivo={editItem.activo} initialAccesos={{ ...editItem.accesos }}
          roles={roles} rolId={editItem.id} accesosPropios={accesosPropios}
          onClose={() => setEditItem(null)}
          onSave={(n,d,a,acc) => saveRol(editItem.id,n,d,a,acc)}
        />
      )}

      {detailItem && (
        <DetalleCargo
          rol={detailItem}
          puedeCambiar={canEdit && rolEditable(detailItem)}
          onClose={() => setDetailItem(null)}
          onCambiar={() => { setEditItem(detailItem); setDetailItem(null); }}
          onIrAEmpleados={onIrAEmpleados}
        />
      )}

      {/* Apagar un cargo */}
      <DialogoConfirmacion
        abierto={!!rolApagar}
        onCambiarAbierto={abierto => { if (!abierto) setDesactivarId(null); }}
        titulo={`¿Apagar el cargo ${rolApagar?.nombre ?? ""}?`}
        queVaAPasar={[
          personasApagar > 0
            ? `${personasApagar === 1 ? "La persona que lo tiene no podrá" : `Las ${personasApagar} personas que lo tienen no podrán`} usar ${textoPuedeUsar(rolApagar?.accesos ?? {})} mientras esté apagado`
            : "Nadie lo tiene ahora, así que a nadie le cambia nada",
          "Mientras esté apagado podrás cambiar sus permisos",
          "Cuando termines, lo enciendes y todo vuelve a funcionar",
        ]}
        textoAccion="Sí, apagar el cargo"
        onConfirmar={() => void confirmarDesactivacion()}
      />

      {/* Borrar un cargo: sin personas se confirma; con personas se explica por qué no */}
      {rolBorrar && personasBorrar > 0 ? (
        <DialogoConfirmacion
          variante="bloqueo"
          abierto
          onCambiarAbierto={abierto => { if (!abierto) setDeleteId(null); }}
          titulo={`No se puede borrar el cargo ${rolBorrar.nombre}`}
          porQueNo={[
            personasBorrar === 1 ? "Hay 1 persona con este cargo" : `Hay ${personasBorrar} personas con este cargo`,
            "Primero cámbiales el cargo en Empleados y después podrás borrarlo",
          ]}
          textoAlternativa={onIrAEmpleados ? "Ir a Empleados" : undefined}
          onAlternativa={onIrAEmpleados}
        />
      ) : (
        <DialogoConfirmacion
          abierto={!!rolBorrar}
          onCambiarAbierto={abierto => { if (!abierto) setDeleteId(null); }}
          titulo={`¿Borrar el cargo ${rolBorrar?.nombre ?? ""}?`}
          queVaAPasar={[
            "Se borra para siempre",
            "También se borran los permisos que tenía configurados",
            "Nadie tiene este cargo, así que a ninguna persona le cambia nada",
          ]}
          textoAccion="Sí, borrar el cargo"
          onConfirmar={() => { if (rolBorrar) void handleDelete(rolBorrar.id); }}
        />
      )}
    </div>
  );
}
