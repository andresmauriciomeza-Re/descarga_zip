import { useState } from "react";
import { useSubirArchivo } from "@/shared/hooks/useFileUpload";
import { MAX_IMAGENES } from "@/features/products/utils/products";
import { toast } from "sonner";
import { getImageUrl } from "@/shared/utils/getImageUrl";
import { Plus } from "lucide-react";

/**
 * Campo de imagen única del producto: una casilla —la portada— más el alta con
 * "Subir archivo" (fila completa) y, debajo, una fila con la URL y "Agregar
 * imagen". Al llegar al límite los controles y las casillas vacías quedan
 * atenuados. Las casillas vacías son decorativas: no cargan ni quitan nada.
 * En solo lectura (Ver detalle) solo se pinta la cuadrícula; sin fotos no se
 * pinta nada.
 */
export function CampoImagenes({
  imagenes,
  onChange,
  readOnly = false,
  inputCls,
  llenarAlto = false,
  onVerImagen,
}: {
  imagenes: string[];
  onChange: (imgs: string[]) => void;
  readOnly?: boolean;
  /** Clase del input de URL (la del formulario que lo usa: Crear usa iCls y
      FormFields usa inputCls). */
  inputCls: string;
  /** Dos columnas con la ficha visible (solo Crear lo activa ahora): la
      cuadrícula crece en alto para que la tarjeta empareje el fondo con la de
      la derecha. Con columna única o en móvil no hay alto libre y las casillas
      se quedan en su mínimo (el alto actual). */
  llenarAlto?: boolean;
  /** Abre la imagen en el visor grande (lightbox). Solo lo pasa Crear: sin él
      las miniaturas no son clicables y el resto de vistas quedan igual. */
  onVerImagen?: (src: string) => void;
}) {
  // URL pendiente de agregar. Estado propio para no tener que escribir en el
  // producto mientras se teclea (antes el input escribía `imagen` en vivo).
  const [url, setUrl] = useState("");
  const { subir, subiendo } = useSubirArchivo();
  const completa = imagenes.length >= MAX_IMAGENES;

  const agregar = (valor: string) => {
    const v = valor.trim();
    if (!v) return;
    if (imagenes.includes(v)) {
      toast.error("La imagen ya está en la galería");
      return;
    }
    if (completa) {
      toast.error(`Un producto admite máximo ${MAX_IMAGENES} imágenes`);
      return;
    }
    onChange([...imagenes, v]);
    setUrl("");
  };

  // Solo lectura (Ver detalle): sin controles y sin fotos no se pinta nada.
  if (readOnly && imagenes.length === 0) return null;

  const casillas = Array.from({ length: MAX_IMAGENES }, (_, i) => i);
  // Con `llenarAlto` las casillas bajan su alto a un MÍNIMO (el actual) y
  // estiran con la rejilla; sin él, alto fijo como siempre.
  const altoCasilla = llenarAlto ? "min-h-40" : "h-40";

  return (
    <div className={llenarAlto ? "flex flex-col h-full" : ""}>
      {/* La casilla muestra la foto (portada); si está vacía es decorativa y queda atenuada en
          solo lectura o al estar el límite alcanzado. */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${llenarAlto ? "flex-1" : ""}`}>
        {casillas.map((idx) => {
          const src = imagenes[idx];
          const esPortada = idx === 0;
          if (src) {
            return (
              <div
                key={`imagen-${idx}`}
                onClick={onVerImagen ? () => onVerImagen(getImageUrl(src)) : undefined}
                className={`relative ${altoCasilla} rounded-xl overflow-hidden bg-muted border border-border ${
                  esPortada ? "ring-2 ring-primary" : ""
                } ${onVerImagen ? "cursor-pointer" : ""}`}
              >
                {/* La foto va absoluta para no aportar alto intrínseco: la
                    casilla crece solo con la rejilla (llenarAlto). */}
                <img src={getImageUrl(src)} alt={`Imagen ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                {esPortada && (
                  <span className="absolute bottom-2 left-2 px-3 py-1 rounded-lg bg-black/70 text-base font-semibold text-white">
                    Portada
                  </span>
                )}
                {!readOnly && !esPortada && (
                  <button
                    type="button"
                    disabled={subiendo}
                    onClick={(event) => {
                      event.stopPropagation();
                      onChange([src, ...imagenes.filter((_, i) => i !== idx)]);
                    }}
                    className="absolute bottom-2 left-2 rounded-lg bg-black/80 px-3 min-h-[2.75rem] text-base font-semibold text-white hover:bg-black disabled:opacity-50 cursor-pointer"
                  >
                    Hacer portada
                  </button>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    disabled={subiendo}
                    title="Quitar imagen"
                    onClick={(e) => {
                      // La X no debe abrir el visor: se come el clic antes de
                      // que burbujee al contenedor de la miniatura.
                      e.stopPropagation();
                      onChange(imagenes.filter((_, i) => i !== idx));
                    }}
                    className="absolute top-2 right-2 rounded-lg bg-white border-2 border-[var(--rojo)] px-3 min-h-[2.75rem] text-base font-semibold text-[var(--rojo)] cursor-pointer"
                  >
                    Quitar
                  </button>
                )}
              </div>
            );
          }
          return (
            <div
              key={`vacia-${idx}`}
              className={`${altoCasilla} rounded-xl flex items-center justify-center ${
                esPortada
                  ? "bg-primary/10 border border-primary/40"
                  : "border border-dashed border-border"
              } ${readOnly || completa ? "opacity-40" : ""}`}
            >
              {esPortada ? (
                <span className="px-3 py-1 rounded-lg bg-primary/15 text-base font-semibold text-primary">
                  Portada
                </span>
              ) : (
                <Plus className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>
      {!readOnly && (
        <>
          {/* Fila 1: alta desde el equipo, a ancho completo. */}
          <label
            className={`flex w-full items-center justify-center gap-1.5 mt-2 px-4 min-h-[3.5rem] bg-white border-2 border-black rounded-2xl text-lg font-semibold text-foreground hover:bg-border cursor-pointer transition-colors ${
              completa || subiendo ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            {subiendo ? "Subiendo..." : "Subir una foto"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={subiendo || completa}
              onChange={(e) => {
                const archivos = Array.from(e.target.files ?? []);
                e.target.value = "";
                // Varios archivos a la vez: se suben en orden y solo se
                // aceptan los que quepan hasta completar MAX_IMAGENES.
                void (async () => {
                  const acumuladas = [...imagenes];
                  for (const archivo of archivos) {
                    if (acumuladas.length >= MAX_IMAGENES) break;
                    const nuevaUrl = await subir(archivo, "productos");
                    if (nuevaUrl && !acumuladas.includes(nuevaUrl)) {
                      acumuladas.push(nuevaUrl);
                      onChange([...acumuladas]);
                    }
                  }
                })();
              }}
            />
          </label>
          {/* Fila 2: pegar una URL y agregarla. */}
          <div className="flex gap-2 mt-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && agregar(url)}
              placeholder="O pega el link de una foto"
              disabled={completa || subiendo}
              className={`flex-1 min-w-0 ${inputCls}`}
            />
            <button
              type="button"
              onClick={() => agregar(url)}
              disabled={completa || subiendo || !url.trim()}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 min-h-[3.5rem] bg-primary text-white rounded-2xl text-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar la foto
            </button>
          </div>
          <p className="text-base text-muted-foreground mt-2">
            {imagenes.length} de {MAX_IMAGENES} fotos · la primera es la que se ve en el menú
          </p>
          {completa && (
            <p className="text-base font-semibold text-primary mt-1">
              Se alcanzó el máximo de {MAX_IMAGENES} imágenes
            </p>
          )}
        </>
      )}
    </div>
  );
}
