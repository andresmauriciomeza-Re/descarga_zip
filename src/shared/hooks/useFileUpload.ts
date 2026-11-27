import { useState } from "react";
import { toast } from "sonner";
import { subirArchivo } from "@/shared/services/uploadService";
import type { CarpetaUpload } from "@/types/api";

export function useSubirArchivo() {
  const [subiendo, setSubiendo] = useState(false);

  async function subir(
    file: File,
    carpeta: CarpetaUpload,
  ): Promise<string | null> {
    setSubiendo(true);
    try {
      return await subirArchivo(file, carpeta);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo subir el archivo.",
      );
      return null;
    } finally {
      setSubiendo(false);
    }
  }

  return { subir, subiendo };
}
