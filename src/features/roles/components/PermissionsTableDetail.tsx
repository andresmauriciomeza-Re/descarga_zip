import { type AccesosMap, MENU_TREE, KEY, ACCIONES, accionColors, ACCION_EXCEL } from "@/features/roles/utils/roles";

// Vista de SOLO LECTURA de los permisos de un rol. A diferencia del acordeón
// (`PermissionCategoryAccordion`), que es para editar, esto no tiene nada
// desplegable: todos los módulos, sub-módulos y privilegios se ven de una vez,
// sin un solo clic, y solo se hace scroll en el contenedor que la envuelve.
// Una fila de título por módulo y una fila por sub-módulo; las columnas de
// privilegio quedan alineadas para poder comparar de arriba abajo.
export function PermisosTablaDetalle({ accesos }: { accesos: AccesosMap }) {
  // Solo los módulos con al menos un sub-módulo con privilegios, y dentro de
  // ellos solo los sub-módulos con privilegios: lo demás no se lista.
  const grupos = MENU_TREE
    .map(({ modulo, subs }) => ({
      modulo,
      subs: subs
        .map(sub => ({ sub, perms: accesos[KEY(modulo, sub)] ?? [] }))
        .filter(({ perms }) => perms.length > 0),
    }))
    .filter(({ subs }) => subs.length > 0);

  if (grupos.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Sin accesos configurados</p>;
  }

  return (
    <>
    {/* Menos de 768 px: lista por sub-módulo con sus privilegios (la tabla de 5 columnas no cabe). */}
    <div className="md:hidden space-y-3">
      {grupos.map(({ modulo, subs }) => (
        <div key={modulo}>
          <p className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted rounded-lg">{modulo}</p>
          <div className="divide-y divide-border">
            {subs.map(({ sub, perms }) => (
              <div key={sub} className="px-2 py-2.5">
                <p className="text-sm font-medium text-foreground">{sub}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {ACCIONES.filter(accion => perms.includes(accion)).map(accion => (
                    <span key={accion} className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${accionColors[accion]}`}>{accion}</span>
                  ))}
                  {perms.includes(ACCION_EXCEL) && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${accionColors[ACCION_EXCEL]}`}>{ACCION_EXCEL}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    <table className="w-full border-separate border-spacing-0 max-md:hidden">
      <thead>
        <tr>
          <th className="sticky top-0 z-10 bg-card px-2 py-2 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
            Permiso
          </th>
          {ACCIONES.map(accion => (
            <th key={accion} className="sticky top-0 z-10 bg-card w-20 px-1 py-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
              {accion}
            </th>
          ))}
        </tr>
      </thead>
      {grupos.map(({ modulo, subs }) => (
        <tbody key={modulo}>
          <tr>
            <td colSpan={ACCIONES.length + 1} className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted border-y border-border">
              {modulo}
            </td>
          </tr>
          {subs.map(({ sub, perms }) => (
            <tr key={sub} className="hover:bg-muted/20">
              <td className="px-2 py-2 text-sm font-medium text-foreground">
                <span className="flex flex-wrap items-center gap-1.5">
                  {sub}
                  {/* "Descargar Excel" no es una columna: viaja con el
                      sub-módulo para que el privilegio siga siendo visible. */}
                  {perms.includes(ACCION_EXCEL) && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${accionColors[ACCION_EXCEL]}`}>
                      {ACCION_EXCEL}
                    </span>
                  )}
                </span>
              </td>
              {ACCIONES.map(accion => (
                <td key={accion} className="w-20 px-1 py-2 text-center">
                  {perms.includes(accion) ? (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${accionColors[accion]}`}>{accion}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground/60">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      ))}
    </table>
    </>
  );
}
