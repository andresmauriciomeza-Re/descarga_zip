import { type AccesosMap, type Rol, KEY, accionesDeSub, type Accion, type Celda, subsDeCelda, MENU_TREE, COLUMNAS_MATRIZ, ETIQUETA_COLUMNA, AREAS_MATRIZ, frasePermisos } from "@/features/roles/utils/roles";
import { useState } from "react";
import { claveGeneroRol, sugerenciaGenerica, formaDobleGenerica, formatearNombreRol } from "@/shared/utils/roleName";
import { validarNombre } from "@/shared/components/FormInputs";
import * as Dialog from "@radix-ui/react-dialog";
import { SeccionFormulario } from "@/shared/components/panel/FormSection";
import { CampoFormulario } from "@/shared/components/panel/FormField";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";
import { OpcionesBotones } from "@/shared/components/buttons/OptionButtons";
import { Check, X } from "lucide-react";

// ── Formulario crear / cambiar cargo ─────────────────────────────────
export function RolModal({ title, initialNombre, initialDesc, initialActivo, initialAccesos, onClose, onSave, roles, rolId, accesosPropios }: {
  title: string;
  initialNombre: string; initialDesc: string; initialActivo: boolean; initialAccesos: AccesosMap;
  onClose: () => void;
  onSave: (nombre: string, desc: string, activo: boolean, accesos: AccesosMap) => void;
  roles: Rol[];
  rolId?: string;
  accesosPropios?: AccesosMap;
}) {
  const [nombre,     setNombre]     = useState(initialNombre);
  const [desc,       setDesc]       = useState(initialDesc);
  const [activo,     setActivo]     = useState(initialActivo);
  const [accesos,    setAccesos]    = useState<AccesosMap>({ ...initialAccesos });
  const [errors,     setErrors]     = useState<{ nombre?: string; modulos?: string }>({});

  // ── P3 — Validación en tiempo real del nombre del rol ──────────────────
  // Se deriva del valor mientras se escribe (no al enviar), igual que en los
  // demás módulos: formato razonable con `validarNombre` (letras y espacios)
  // y duplicado por CLAVE DE GÉNERO contra `roles` (un solo rol agrupa a
  // hombres y mujeres: "Mesero" y "Mesera" son el mismo rol), excluyendo el
  // rol que se está editando (`rolId`). También rechaza formas femeninas
  // (con su sugerencia genérica) y formas dobles ("Mesero o mesera").
  // El campo vacío sin tocar no muestra error: el envío (handleSave) sigue
  // siendo la red de seguridad para ese caso.
  const nombreTrim = nombre.trim();
  const claveNueva = nombreTrim ? claveGeneroRol(nombreTrim) : "";
  const rolExistente = claveNueva
    ? roles.find(r => r.id !== rolId && claveGeneroRol(r.nombre) === claveNueva)
    : undefined;
  const sugerida = nombreTrim ? sugerenciaGenerica(nombreTrim) : null;
  const errFemenina = sugerida
    ? `Usa la forma genérica del cargo: «${sugerida}»`
    : null;
  const doble = nombreTrim ? formaDobleGenerica(nombreTrim) : null;
  const nombreErrorTiempoReal =
    !nombreTrim
      ? undefined
      : validarNombre(nombreTrim)
        ? "Usa solo letras y espacios, sin espacios dobles"
        : rolExistente
          ? `Ya existe el rol «${rolExistente.nombre}». Un solo rol agrupa a hombres y mujeres.`
          : doble
            ? `Un solo nombre agrupa a todos: usa «${doble}»`
            : errFemenina ?? undefined;
  // Lo que se pinta bajo el campo: el error en tiempo real manda; si no hay,
  // el que quedó del último intento de guardar.
  const nombreError = nombreErrorTiempoReal ?? errors.nombre;
  // P3: el botón queda bloqueado mientras el nombre tenga cualquiera de estos
  // errores (formato, duplicado, forma doble o femenina); nunca sin
  // explicación visible.
  const guardarNombreBloqueado = !!nombreErrorTiempoReal || !!errors.modulos;
  /** Reemplaza el texto del campo por su forma genérica (botón "Usar «…»"). */
  const aplicarSugerencia = () => {
    if (!sugerida) return;
    setNombre(sugerida);
    setErrors(p => ({ ...p, nombre: undefined }));
  };

  const isSubOn = (m: string, s: string) => {
    const k = KEY(m, s);
    return k in accesos && accesos[k].length > 0;
  };
  // Un módulo está "completo" cuando cada sub-opción tiene TODAS las acciones
  // que le tocan, y eso depende del sub-módulo: "Descargar Excel" solo existe en
  // los 6 sub-módulos de `SUBS_CON_EXCEL`.
  const isAllMod = (m: string, subs: string[]) =>
    subs.every(s => accionesDeSub(m, s).every(a => (accesos[KEY(m, s)] ?? []).includes(a)));

  // ¿El usuario con sesión tiene este privilegio concreto? Si no, el rol no
  // puede asignárselo (evita que un rol suplente parcial conceda más de lo
  // que su propio usuario tiene). Un Administrador suplente con todos los
  // privilegios sí puede asignar cualquiera.
  const puedeAsignar = (m: string, s: string, accion: Accion) =>
    accesosPropios === undefined || (accesosPropios[KEY(m, s)] ?? []).includes(accion);

  const toggleAccion = (m: string, s: string, accion: Accion) => {
    const k = KEY(m, s);
    setErrors(p => ({ ...p, modulos: undefined }));
    if (!puedeAsignar(m, s, accion)) return;
    setAccesos(prev => {
      const cur = prev[k] ?? [];
      return { ...prev, [k]: cur.includes(accion) ? cur.filter(a => a !== accion) : [...cur, accion] };
    });
  };

  const toggleCelda = (celda: Celda) => {
    const subs = subsDeCelda(celda);
    const allOn = isAllMod(celda.modulo, subs);
    setAccesos(prev => {
      const next = { ...prev };
      subs.forEach(sub => {
        next[KEY(celda.modulo, sub)] = allOn
          ? []
          : accionesDeSub(celda.modulo, sub).filter(a => puedeAsignar(celda.modulo, sub, a));
      });
      return next;
    });
    setErrors(p => ({ ...p, modulos: undefined }));
  };

  const selectedSubs = MENU_TREE.flatMap(({ modulo, subs }) =>
    subs.filter(sub => isSubOn(modulo, sub)).map(sub => ({ modulo, sub }))
  );

  const handleSave = () => {
    const errs: { nombre?: string; modulos?: string } = {};
    const aGuardar = nombre.trim();
    if (!aGuardar) errs.nombre = "Escribe el nombre del cargo para poder guardarlo";
    else if (validarNombre(aGuardar)) errs.nombre = "Usa solo letras y espacios, sin espacios dobles";
    else if (rolExistente) errs.nombre = `Ya existe el rol «${rolExistente.nombre}». Un solo rol agrupa a hombres y mujeres.`;
    else if (doble) errs.nombre = `Un solo nombre agrupa a todos: usa «${doble}»`;
    else if (errFemenina) errs.nombre = errFemenina;
    if (selectedSubs.length === 0) errs.modulos = "Marca al menos una casilla para que el cargo pueda hacer algo.";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    // Al crear y al editar el nombre se guarda con forma genérica y
    // normalizado ("repartidor" → "Repartidor", "CAJERO " → "Cajero").
    onSave(formatearNombreRol(aGuardar), desc.trim(), activo, accesos);
  };

  return (
    <Dialog.Root open onOpenChange={abierto => { if (!abierto) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="pn-dialogo-fondo" />
        <Dialog.Content className="pn-modal" aria-describedby={undefined}>
          <div className="pn-modal__cab">
            <Dialog.Title className="pn-modal__titulo">{title}</Dialog.Title>
          </div>

          <div className="pn-cargo-form">
            <div className="pn-cargo-form__izq">
              {/* 1 · Nombre */}
              <SeccionFormulario numero={1} titulo="¿Cómo se llama el cargo?">
                <div className="grid gap-4">
                  <CampoFormulario
                    etiqueta="Nombre del cargo"
                    ayuda="Usa un nombre para todos, por ejemplo Mesero"
                    error={nombreError}
                  >
                    {(p) => (
                      <input
                        {...p}
                        value={nombre}
                        // P3: se limpia el error del envío al escribir; el error en
                        // tiempo real (formato/duplicado/forma femenina o doble) se
                        // deriva arriba y se pinta debajo del campo.
                        onChange={e => { setNombre(e.target.value); if (errors.nombre) setErrors(prev => ({ ...prev, nombre: undefined })); }}
                        placeholder="Ej: Cajero"
                      />
                    )}
                  </CampoFormulario>
                  {sugerida && nombreError === errFemenina && (
                    <div>
                      <BotonAccion variante="normal" onClick={aplicarSugerencia}>Usar «{sugerida}»</BotonAccion>
                    </div>
                  )}
                  <CampoFormulario etiqueta="Descripción" opcional ayuda="Una frase que explique para qué sirve este cargo">
                    {(p) => (
                      <textarea
                        {...p}
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        rows={3}
                        placeholder="Ej: Atiende la caja y cobra los pedidos"
                      />
                    )}
                  </CampoFormulario>
                  <div>
                    <p className="pn-etiqueta">¿El cargo queda encendido?</p>
                    {rolId ? (
                      <p className="pn-campo__ayuda">
                        Este cargo está apagado. Después de cambiarlo, enciéndelo desde la lista de cargos.
                      </p>
                    ) : (
                      <OpcionesBotones
                        etiqueta="Estado del cargo"
                        valor={activo ? "activo" : "inactivo"}
                        onChange={v => setActivo(v === "activo")}
                        opciones={[
                          { valor: "activo", etiqueta: "Encendido" },
                          { valor: "inactivo", etiqueta: "Apagado" },
                        ]}
                      />
                    )}
                  </div>
                </div>
              </SeccionFormulario>

              {/* 2 · Matriz de permisos */}
              <SeccionFormulario
                numero={2}
                titulo="¿Qué puede hacer esta persona?"
                ayuda="Marca una casilla por cada cosa que podrá hacer. Lo que no marques, no podrá hacerlo."
              >
                {errors.modulos && (
                  <p className="pn-campo__error" role="alert" style={{ marginBottom: 12 }}>
                    <span>{errors.modulos}</span>
                  </p>
                )}
                <div className="pn-matriz-caja">
                  <table className="pn-matriz">
                    <thead>
                      <tr>
                        <th scope="col">Opción del menú</th>
                        {COLUMNAS_MATRIZ.map(a => (
                          <th key={a} scope="col">{ETIQUETA_COLUMNA[a]}</th>
                        ))}
                      </tr>
                    </thead>
                    {AREAS_MATRIZ.map(({ modulo, subs }) => {
                      const todo = isAllMod(modulo, subs);
                      return (
                        <tbody key={modulo}>
                          <tr className="pn-matriz__area">
                            <th scope="rowgroup" colSpan={COLUMNAS_MATRIZ.length + 1}>
                              <span>{modulo}</span>
                              <button
                                type="button"
                                className="pn-chip"
                                onClick={() => toggleCelda({ nombre: modulo, modulo })}
                              >
                                {todo ? `Quitar todo de ${modulo}` : `Marcar todo en ${modulo}`}
                              </button>
                            </th>
                          </tr>
                          {subs.map(sub => {
                            const k = KEY(modulo, sub);
                            const marcadas = accesos[k] ?? [];
                            const disponibles = accionesDeSub(modulo, sub);
                            return (
                              <tr key={sub}>
                                <th scope="row">{sub}</th>
                                {COLUMNAS_MATRIZ.map(a => {
                                  if (!disponibles.includes(a)) {
                                    return (
                                      <td key={a} className="pn-matriz__na">
                                        <span aria-hidden="true">—</span>
                                        <span className="sr-only">{`${sub}: ${ETIQUETA_COLUMNA[a]} no aplica`}</span>
                                      </td>
                                    );
                                  }
                                  const permitido = puedeAsignar(modulo, sub, a);
                                  return (
                                    <td key={a}>
                                      <input
                                        type="checkbox"
                                        checked={marcadas.includes(a)}
                                        disabled={!permitido}
                                        onChange={() => toggleAccion(modulo, sub, a)}
                                        aria-label={`${sub}: ${ETIQUETA_COLUMNA[a]}`}
                                        title={permitido ? undefined : "No tienes este permiso para poder darlo"}
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      );
                    })}
                  </table>
                </div>
              </SeccionFormulario>
            </div>

            {/* Resumen + botones (abajo en celular) */}
            <aside className="pn-cargo-form__der">
              <section className="pn-seccion">
                <h2>Así queda el cargo</h2>
                <p className="pn-seccion__ayuda">
                  {nombreTrim ? `El cargo «${nombreTrim}»` : "Este cargo"}{" "}
                  {selectedSubs.length === 0 ? "todavía no puede hacer nada." : "podrá hacer lo siguiente:"}
                </p>
                <div className="pn-resumen">
                  {AREAS_MATRIZ.map(({ modulo, subs }) => (
                    <div key={modulo}>
                      <p className="pn-resumen__area">{modulo}</p>
                      <ul>
                        {subs.map(sub => {
                          const perms = accesos[KEY(modulo, sub)] ?? [];
                          const si = perms.length > 0;
                          return (
                            <li key={sub} className={si ? "pn-resumen__si" : "pn-resumen__no"}>
                              {si
                                ? <Check size={22} aria-hidden="true" style={{ color: "var(--verde)" }} />
                                : <X size={22} aria-hidden="true" style={{ color: "var(--gris-texto)" }} />}
                              <span>
                                <strong>{sub}</strong>
                                {si ? `: ${frasePermisos(perms)}` : ": no"}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="pn-resumen__botones">
                  <BotonAccion
                    variante="principal"
                    onClick={handleSave}
                    disabled={guardarNombreBloqueado}
                    title={guardarNombreBloqueado ? "Corrige lo que está en rojo para guardar" : undefined}
                  >
                    Guardar cargo
                  </BotonAccion>
                  <BotonAccion variante="normal" onClick={onClose}>Cancelar</BotonAccion>
                </div>
              </section>
            </aside>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
