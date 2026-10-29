import api from "./api";
import type { CarpetaUpload, UploadResponse } from "@/types/api";
import { validarArchivo } from "@/shared/utils/validarArchivo";
import { crearError401Checkout } from "./api";
import { obtenerToken } from "./authService";

export async function subirArchivo(
  file: File,
  carpeta: CarpetaUpload,
  opciones?: { checkoutAuth?: boolean },
): Promise<string> {
  if (opciones?.checkoutAuth && !obtenerToken()) {
    throw crearError401Checkout();
  }
  validarArchivo(file);
  const formData = new FormData();
  formData.append("archivo", file);
  formData.append("carpeta", carpeta);

  const { data } = await api.post<UploadResponse>("/uploads", formData, {
    checkoutAuth: opciones?.checkoutAuth,
  });
  return data.url;
}
