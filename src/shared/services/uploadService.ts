import api from "./api";
import type { CarpetaUpload, UploadResponse } from "@/types/api";

export async function subirArchivo(
  file: File,
  carpeta: CarpetaUpload,
): Promise<string> {
  const formData = new FormData();
  formData.append("archivo", file);
  formData.append("carpeta", carpeta);

  const { data } = await api.post<UploadResponse>("/uploads", formData);
  return data.url;
}
