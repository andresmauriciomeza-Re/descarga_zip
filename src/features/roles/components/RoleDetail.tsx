import { type Rol, AREAS_MATRIZ, KEY, frasePermisos, textoPersonas } from "@/features/roles/utils/roles";
import * as Dialog from "@radix-ui/react-dialog";
import { EstadoPill } from "@/shared/components/panel/StatusPill";
import { DatosDetalle } from "@/shared/components/panel/DetailData";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";

// ── Ver qué puede hacer un cargo ──────────────────────────────────────
export function DetalleCargo({ rol, onClose, onCambiar, onIrAEmpleados, puedeCambiar }: {
  rol: Rol;
  onClose: () => void;
  onCambiar: () => void;
  onIrAEmpleados?: () => void;
  puedeCambiar: boolean;
}) {
  const personas = rol.usuariosAsignados ?? 0;
  return (
    <Dialog.Root open onOpenChange={abierto => { if (!abierto) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="pn-dialogo-fondo" />
        <Dialog.Content className="pn-modal pn-modal--medio" aria-describedby={undefined}>
          <div className="pn-modal__cab">
            <Dialog.Title className="pn-modal__titulo">Cargo: {rol.nombre}</Dialog.Title>
            <EstadoPill tono={rol.activo ? "verde" : "gris"}>{rol.activo ? "Encendido" : "Apagado"}</EstadoPill>
          </div>
          {rol.descripcion && <DatosDetalle datos={[{ etiqueta: "Para qué sirve", valor: rol.descripcion }]} />}

          <div className="pn-cargo-detalle">
            <section className="pn-seccion">
              <h2>Qué puede hacer</h2>
              {AREAS_MATRIZ.map(({ modulo, subs }) => (
                <div key={modulo} style={{ marginTop: "0.875rem" }}>
                  <p className="pn-resumen__area">{modulo}</p>
                  <div className="pn-permisos">
                    {subs.map(sub => {
                      const perms = rol.accesos[KEY(modulo, sub)] ?? [];
                      const n = perms.length;
                      return (
                        <div key={sub} className={`pn-permisos__fila${n === 0 ? " pn-permisos__fila--no" : ""}`}>
                          <strong>{sub}</strong>
                          <span>{n === 0 ? "No puede hacer nada aquí" : frasePermisos(perms)}</span>
                          <EstadoPill tono={n === 0 ? "gris" : "verde"}>
                            {n === 0 ? "No" : `${n} ${n === 1 ? "acción" : "acciones"}`}
                          </EstadoPill>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>

            <aside className="pn-seccion" style={{ alignSelf: "start" }}>
              <h2>Quiénes lo tienen</h2>
              <p className="pn-seccion__ayuda">{textoPersonas(personas)}</p>
              {onIrAEmpleados && (
                <BotonAccion variante="normal" onClick={() => { onClose(); onIrAEmpleados(); }}>
                  Ir a Empleados
                </BotonAccion>
              )}
            </aside>
          </div>

          <div className="pn-dialogo__botones" style={{ marginTop: "1.125rem" }}>
            {puedeCambiar && !rol.activo && (
              <BotonAccion variante="principal" onClick={onCambiar}>Cambiar permisos</BotonAccion>
            )}
            <BotonAccion variante="oscuro" onClick={onClose}>Cerrar</BotonAccion>
          </div>
          {puedeCambiar && rol.activo && (
            <p className="pn-campo__ayuda" style={{ marginTop: "0.625rem" }}>
              Para cambiar lo que puede hacer, primero apágalo desde la lista de cargos.
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
