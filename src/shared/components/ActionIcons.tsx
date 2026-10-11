import { Eye, Pencil, Trash2 } from "lucide-react";

/**
 * Iconos de acción de fila unificados (diseño de Gestión Proveedor):
 * ver detalle → editar → eliminar, en ese orden, con lucide-react a 16px
 * (`w-4 h-4`), botón `p-1.5 rounded-lg`, gris por defecto y hover con fondo
 * muy suave (azul / neutro / rojo).
 *
 * Cada acción se muestra sólo si su callback existe; los flags `*Disabled`
 * la muestran atenuada con `cursor-not-allowed` (sin hover y sin disparar la
 * acción), conservando el tooltip del módulo vía `*Title`. Los nombres
 * accesibles son siempre "Ver detalle", "Editar" y "Eliminar".
 *
 * Las acciones de dominio de cada módulo (Verificar, Anular, Imprimir,
 * Dar de baja, etc.) quedan fuera de este componente y se pintan a mano
 * junto a él, respetando el orden que cada pantalla ya tenga hoy.
 */
interface ActionIconsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  viewDisabled?: boolean;
  editDisabled?: boolean;
  deleteDisabled?: boolean;
  /** Tooltip específico (p. ej. el motivo por el que está deshabilitado). */
  viewTitle?: string;
  editTitle?: string;
  deleteTitle?: string;
}

const CLASE_BASE = "p-1.5 rounded-lg transition-colors";

function claseHover(tipo: "ver" | "editar" | "eliminar") {
  if (tipo === "ver") return "text-muted-foreground hover:bg-blue-50 hover:text-blue-600 cursor-pointer";
  if (tipo === "editar") return "text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer";
  return "text-muted-foreground hover:bg-red-50 hover:text-red-600 cursor-pointer";
}

/** Atenuado, sin hover y sin acción: mismo aspecto en todos los módulos. */
const CLASE_DISABLED = "text-muted-foreground/40 cursor-not-allowed";

export function ActionIcons({
  onView,
  onEdit,
  onDelete,
  viewDisabled = false,
  editDisabled = false,
  deleteDisabled = false,
  viewTitle,
  editTitle,
  deleteTitle,
}: ActionIconsProps) {
  return (
    <div className="flex items-center gap-1.5">
      {onView && (
        <button
          type="button"
          onClick={viewDisabled ? undefined : onView}
          disabled={viewDisabled}
          aria-label="Ver detalle"
          title={viewTitle ?? "Ver detalle"}
          className={`${CLASE_BASE} ${viewDisabled ? CLASE_DISABLED : claseHover("ver")}`}
        >
          <Eye className="w-4 h-4" />
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          onClick={editDisabled ? undefined : onEdit}
          disabled={editDisabled}
          aria-label="Editar"
          title={editTitle ?? "Editar"}
          className={`${CLASE_BASE} ${editDisabled ? CLASE_DISABLED : claseHover("editar")}`}
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={deleteDisabled ? undefined : onDelete}
          disabled={deleteDisabled}
          aria-label="Eliminar"
          title={deleteTitle ?? "Eliminar"}
          className={`${CLASE_BASE} ${deleteDisabled ? CLASE_DISABLED : claseHover("eliminar")}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
