
  import { createRoot } from "react-dom/client";
  import App from "./App";
  import "./shared/styles/index.css";

  document.addEventListener(
    "wheel",
    () => {
      const el = document.activeElement as HTMLInputElement | null;
      if (el?.type === "number") el.blur();
    },
    { passive: true },
  );

  // Tras publicar una versión nueva, una pestaña abierta puede pedir un archivo que
  // ya no existe: se recarga una vez. Si vuelve a fallar, lo muestra la propia app.
  window.addEventListener("vite:preloadError", () => {
    if (!navigator.onLine) return;
    const CLAVE = "sivpro-recarga-por-version";
    if (Date.now() - Number(sessionStorage.getItem(CLAVE) ?? 0) < 30_000) return;
    sessionStorage.setItem(CLAVE, String(Date.now()));
    window.location.reload();
  });

  createRoot(document.getElementById("root")!).render(<App />);
  