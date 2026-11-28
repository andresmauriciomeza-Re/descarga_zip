import { toast } from "sonner";

let cargasEnCurso = 0;

/** `main.tsx` no recarga la página si falla una de estas cargas. */
export const hayCargaOpcional = () => cargasEnCurso > 0;

/** `import()` de algo que, si falla, no obliga a recargar la página. */
export async function cargarOpcional<T>(importar: () => Promise<T>): Promise<T> {
  cargasEnCurso++;
  try {
    return await importar();
  } finally {
    cargasEnCurso--;
  }
}

/** Librería que se pide al descargar un archivo: si no llega, avisa. */
export async function cargarParaDescarga<T>(importar: () => Promise<T>): Promise<T> {
  try {
    return await cargarOpcional(importar);
  } catch (error) {
    toast.error("No se pudo preparar la descarga. Revisa tu conexión y recarga la página.");
    throw error;
  }
}
