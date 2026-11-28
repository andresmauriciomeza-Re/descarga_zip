import React from "react";
import { CampoImagenes } from "@/features/products/components/ImageField";

/** Sección con estilo de tarjeta (Opción A): fondo `bg-card`, borde y esquinas
    redondeadas, con el título a la izquierda y un slot opcional a la derecha
    (`acciones`: pastillas de versión, badges…). El contenido scrollea dentro
    de la tarjeta solo con `scrollInterno` (columna derecha); `footer` queda
    FUERA de ese scroll, siempre visible. En la columna izquierda las tarjetas
    se apilan sin scroll propio (scrollea la columna). */
export function Tarjeta({
  titulo,
  acciones,
  children,
  footer,
  scrollInterno = false,
  className = "",
}: {
  titulo: string;
  acciones?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scrollInterno?: boolean;
  className?: string;
}) {
  return (
    <section className={`bg-card border-2 border-border rounded-[20px] flex flex-col ${className}`}>
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-5 pt-4 pb-3">
        <h2 style={{ font: "700 22px/1.2 var(--font-titulo)", margin: 0 }}>{titulo}</h2>
        {acciones}
      </div>
      {/* `flex-1` siempre: en tarjetas de alto natural no cambia nada (el
          mínimo automático la fija al contenido) y en la tarjeta estirada
          (Imágenes con `llenarAlto`) permite que el contenido llene el fondo. */}
      <div className={`px-4 sm:px-5 pb-4 flex-1 ${scrollInterno ? "min-h-0 overflow-y-auto pt-3" : ""}`}>
        {children}
      </div>
      {footer && <div className="shrink-0 border-t border-border px-4 sm:px-5 py-3">{footer}</div>}
    </section>
  );
}

/** Tarjeta "Imágenes del producto": le da a `CampoImagenes` el mismo marco que
    el resto de secciones. En solo lectura (Ver detalle) solo se pinta cuando
    hay al menos una imagen: decide el que la llama. */
export function TarjetaImagenes({
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
  inputCls: string;
  /** Dos columnas con ficha visible (solo Crear ahora): la tarjeta crece
      (grow, sin encogerse) hasta el fondo y las casillas estiran su alto. */
  llenarAlto?: boolean;
  /** Abre la imagen en el visor grande. Solo lo pasa Crear. */
  onVerImagen?: (src: string) => void;
}) {
  return (
    <Tarjeta titulo="Fotos del producto" className={llenarAlto ? "grow shrink-0" : ""}>
      <CampoImagenes
        imagenes={imagenes}
        onChange={onChange}
        readOnly={readOnly}
        inputCls={inputCls}
        llenarAlto={llenarAlto}
        onVerImagen={onVerImagen}
      />
    </Tarjeta>
  );
}
