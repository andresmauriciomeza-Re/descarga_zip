import { RefreshCw, Lock, AlertTriangle } from "lucide-react";

export function EstadoVentas({
  estado,
  error,
  textoCargando = "Cargando ventas…",
  textoError = "No fue posible cargar las ventas.",
}: {
  estado: "cargando" | "error" | "permiso";
  error?: string | null;
  textoCargando?: string;
  textoError?: string;
}) {
  const Icon = estado === "cargando" ? RefreshCw : estado === "permiso" ? Lock : AlertTriangle;
  const texto =
    estado === "cargando"
      ? textoCargando
      : estado === "permiso"
        ? "No tienes permiso para ver ventas. Solicita al administrador el permiso Ventas > Ver."
        : `${textoError}${error ? ` ${error}` : " Intenta de nuevo más tarde."}`;

  return (
    <div
      role={estado === "error" ? "alert" : "status"}
      className={`flex min-h-[72px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-lg text-center ${
        estado === "error"
          ? "bg-destructive/10 text-destructive"
          : "bg-muted/30 text-muted-foreground"
      }`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${estado === "cargando" ? "animate-spin" : ""}`} />
      <span>{texto}</span>
    </div>
  );
}
