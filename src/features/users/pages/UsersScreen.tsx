import { useState } from "react";
import { ArrowLeft, Lock, Users } from "lucide-react";
import { toast } from "sonner";
import { AvisoBanner } from "@/shared/components/panel/NoticeBanner";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";
import { BotonRuta } from "@/shared/components/buttons/BreadcrumbButton";
import { BuscadorGrande } from "@/shared/components/panel/LargeSearch";
import { DatosDetalle } from "@/shared/components/panel/DetailData";
import { DialogoConfirmacion } from "@/shared/components/panel/ConfirmDialog";
import { EncabezadoPagina } from "@/shared/components/panel/PageHeader";
import { FiltrosChips } from "@/shared/components/panel/FilterChips";
import { PaginadorGrande } from "@/shared/components/panel/LargePaginator";
import { SeccionFormulario } from "@/shared/components/panel/FormSection";
import { TarjetaFila } from "@/shared/components/panel/RowCard";
import { VacioEstado } from "@/shared/components/panel/EmptyState";
import { cambiarEstadoUsuario, eliminarUsuario } from "@/shared/services/authService";
import { useUsers } from "@/features/users/hooks/useUsers";
import type { UsuarioGestion } from "@/features/users/utils/users";
import { Avatar, RolesPills, EstadoEntrada } from "@/features/users/components/UserCells";

const SERIF = "var(--font-titulo)";
/** "1036554120" → "1.036.554.120" (si no es solo números, se deja igual). */
const documentoLegible = (tipo: string, numero: string) =>
  `${tipo ? `${tipo} ` : ""}${/^\d+$/.test(numero) ? Number(numero).toLocaleString("es-CO") : numero}`;

export function GestionUsuariosScreen({
  canVer = true,
  canEdit = true,
  canDelete = true,
  onIrAClientes,
  onIrAEmpleados,
}: {
  canVer?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onIrAClientes?: () => void;
  onIrAEmpleados?: () => void;
}) {
  const { cargando, errorCarga, search, setSearch, filterRol, setFilterRol, filterEstado, setFilterEstado, setPage, cargarUsuarios, filtrados, porPagina, paginaActual, paginados } = useUsers(canVer);
  const [detail, setDetail] = useState<UsuarioGestion | null>(null);
  const [deleteItem, setDeleteItem] = useState<UsuarioGestion | null>(null);
  const [quitarItem, setQuitarItem] = useState<UsuarioGestion | null>(null);
  /** Cuenta que el backend no pudo borrar (la desactivó): se muestra su mensaje. */
  const [noBorrada, setNoBorrada] = useState<{ nombre: string; mensaje: string } | null>(null);
  const [actualizando, setActualizando] = useState<string | null>(null);




  const cambiarEstado = async (u: UsuarioGestion, nuevoEstado: boolean) => {
    if (nuevoEstado === u.estado) return;
    setActualizando(u.id);
    try {
      const respuesta = await cambiarEstadoUsuario(String(u.id_usuario), nuevoEstado);
      await cargarUsuarios();
      setDetail(current => current?.id === u.id ? { ...current, estado: nuevoEstado } : current);
      toast.success(respuesta.mensaje);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar el estado del usuario.");
    } finally { setActualizando(null); }
  };

  const eliminar = async () => {
    if (!deleteItem) return;
    const nombreBorrado = deleteItem.nombre;
    try {
      const respuesta = await eliminarUsuario(String(deleteItem.id_usuario));
      await cargarUsuarios();
      setDeleteItem(null);
      setDetail(null);
      // Si tenía registros, el backend no la borra: la desactiva y lo explica.
      if (respuesta.accion === "desactivado") setNoBorrada({ nombre: nombreBorrado, mensaje: respuesta.mensaje });
      else toast.success(respuesta.mensaje);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el usuario.");
    }
  };

  if (!canVer) {
    return (
      <div className="pn-contenido">
        <VacioEstado icono={Lock} titulo="No tienes permiso para ver los usuarios">
          Pide acceso a la persona que administra el sistema.
        </VacioEstado>
      </div>
    );
  }

  const chip = filterEstado === "inactivo" ? "inactivos" : filterRol === "Cliente" ? "clientes" : filterRol === "Empleado" ? "empleados" : "todos";
  const cambiarChip = (v: string) => {
    setPage(1);
    setFilterRol(v === "clientes" ? "Cliente" : v === "empleados" ? "Empleado" : "todos");
    setFilterEstado(v === "inactivos" ? "inactivo" : "todos");
  };

  // ── Detalle de una persona ──
  if (detail) {
    const u = detail;
    const nombreCorto = u.nombre;
    return (
      <div className="pn-contenido">
        <BotonRuta>
          <BotonAccion icono={ArrowLeft} onClick={() => setDetail(null)}>Volver a la lista</BotonAccion>
        </BotonRuta>

        <div className="flex flex-wrap items-center gap-5 mb-6">
          <Avatar u={u} tam={80} />
          <div className="min-w-0">
            <h1 style={{ font: "700 34px/1.15 var(--font-titulo)", margin: 0, overflowWrap: "anywhere" }}>{u.nombre}</h1>
            <div className="mt-2"><EstadoEntrada activo={u.estado} /></div>
          </div>
        </div>

        <div className="grid gap-5" style={{ maxWidth: 900 }}>
          <SeccionFormulario titulo="Sus datos">
            <DatosDetalle datos={[
              { etiqueta: "Documento", valor: documentoLegible(u.tipo_documento, String(u.id_usuario)) },
              { etiqueta: "Correo", valor: u.correo || "—" },
              { etiqueta: "Teléfono", valor: u.telefono || "—" },
            ]} />
            <p className="pn-campo__ayuda" style={{ fontSize: 17, marginTop: 16 }}>
              Los datos personales los cambia cada persona desde su perfil.
            </p>
          </SeccionFormulario>

          <SeccionFormulario titulo="Qué es en la pizzería">
            <RolesPills usuario={u} />
            <p className="pn-seccion__ayuda" style={{ margin: "14px 0 12px" }}>
              Los cargos de un empleado se cambian en Empleados
            </p>
            {onIrAEmpleados && <BotonAccion onClick={onIrAEmpleados}>Ir a Empleados</BotonAccion>}
          </SeccionFormulario>

          <div className="pn-dialogo__botones" style={{ justifyContent: "flex-start" }}>
            {canEdit && (
              u.estado ? (
                <BotonAccion
                  variante="normal"
                  disabled={Boolean(u.esSuperAdmin) || actualizando === u.id}
                  onClick={() => setQuitarItem(u)}
                >
                  Quitarle la entrada
                </BotonAccion>
              ) : (
                <BotonAccion
                  variante="bien"
                  disabled={Boolean(u.esSuperAdmin) || actualizando === u.id}
                  onClick={() => void cambiarEstado(u, true)}
                >
                  Devolverle la entrada
                </BotonAccion>
              )
            )}
            {canDelete && (
              <BotonAccion
                variante="peligro"
                disabled={Boolean(u.esSuperAdmin)}
                title={u.esSuperAdmin ? "Cuenta de super administrador" : undefined}
                onClick={() => setDeleteItem(u)}
              >
                Borrar
              </BotonAccion>
            )}
          </div>
        </div>

        <DialogoConfirmacion
          abierto={!!quitarItem}
          onCambiarAbierto={a => { if (!a) setQuitarItem(null); }}
          titulo={`¿Quitarle la entrada a ${quitarItem?.nombre ?? nombreCorto}?`}
          queVaAPasar={[
            "Ya no podrá entrar al panel ni usar su cargo",
            "Sí podrá seguir comprando por la página, como cliente",
            "Puedes devolverle la entrada cuando quieras",
          ]}
          textoAccion="Sí, quitarle la entrada"
          onConfirmar={() => { if (quitarItem) void cambiarEstado(quitarItem, false); }}
        />
        <DialogoConfirmacion
          abierto={!!deleteItem}
          onCambiarAbierto={a => { if (!a) setDeleteItem(null); }}
          titulo={`¿Borrar la cuenta de ${deleteItem?.nombre ?? ""}?`}
          queVaAPasar={[
            "Se borra para siempre y no se puede deshacer",
            "Si la cuenta ya tiene registros, no se borra: se le quita la entrada y te lo avisamos",
          ]}
          textoAccion="Sí, borrar la cuenta"
          onConfirmar={() => void eliminar()}
        />
      </div>
    );
  }

  // ── Lista ──
  return (
    <div className="pn-contenido">
      <EncabezadoPagina
        titulo="Usuarios"
        descripcion="Todas las personas que tienen una cuenta en el sistema: clientes, empleados y administrador"
      />

      <div className="grid gap-4 mb-6">
        <BuscadorGrande
          etiqueta="Buscar a una persona"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Escribe el nombre, la cédula o el correo"
        />
        <FiltrosChips
          valor={chip}
          onChange={cambiarChip}
          opciones={[
            { valor: "todos", etiqueta: "Todos" },
            { valor: "clientes", etiqueta: "Clientes" },
            { valor: "empleados", etiqueta: "Empleados" },
            { valor: "inactivos", etiqueta: "Inactivos" },
          ]}
        />
      </div>

      {cargando ? (
        <p role="status" className="pn-nota">Cargando las personas…</p>
      ) : errorCarga ? (
        <AvisoBanner
          titulo="No pudimos cargar a las personas"
          boton={<BotonAccion onClick={() => void cargarUsuarios()}>Intentar de nuevo</BotonAccion>}
        >
          {errorCarga}
        </AvisoBanner>
      ) : paginados.length === 0 ? (
        <VacioEstado icono={Users} titulo="No encontramos a nadie con eso">
          Revisa cómo lo escribiste o prueba con otro nombre, cédula o correo.
        </VacioEstado>
      ) : (
        <div className="pn-lista">
          {paginados.map(u => (
            <TarjetaFila
              key={u.id_usuario}
              avatar={<Avatar u={u} tam={56} />}
              nombre={u.nombre}
              detalle={`${documentoLegible(u.tipo_documento, String(u.id_usuario))}${u.correo ? ` · ${u.correo}` : ""}`}
              estado={
                <div className="grid gap-2 justify-items-start">
                  <RolesPills usuario={u} />
                  <EstadoEntrada activo={u.estado} />
                </div>
              }
              acciones={<BotonAccion variante="normal" onClick={() => setDetail(u)}>Ver datos</BotonAccion>}
            />
          ))}
        </div>
      )}

      <PaginadorGrande pagina={paginaActual} total={filtrados.length} porPagina={porPagina} onCambiar={setPage} />

      <section className="pn-aviso" style={{ marginTop: 28, background: "#fff", borderColor: "var(--borde-suave)", color: "var(--texto)" }}>
        <div className="pn-aviso__texto">
          <h2>¿Quieres agregar a alguien?</h2>
          <p>Los clientes se agregan en Clientes y los trabajadores en Empleados. Ahí mismo se les crea la cuenta.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {onIrAClientes && <BotonAccion onClick={onIrAClientes} style={{ background: "#fff", color: "var(--texto)", borderColor: "#1a1a1a" }}>Ir a Clientes</BotonAccion>}
          {onIrAEmpleados && <BotonAccion onClick={onIrAEmpleados} style={{ background: "#fff", color: "var(--texto)", borderColor: "#1a1a1a" }}>Ir a Empleados</BotonAccion>}
        </div>
      </section>

      <DialogoConfirmacion
        variante="bloqueo"
        abierto={!!noBorrada}
        onCambiarAbierto={a => { if (!a) setNoBorrada(null); }}
        titulo={`La cuenta de ${noBorrada?.nombre ?? ""} no se puede borrar`}
        porQueNo={[noBorrada?.mensaje ?? ""]}
      />
    </div>
  );
}
