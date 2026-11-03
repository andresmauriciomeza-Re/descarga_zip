
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

  createRoot(document.getElementById("root")!).render(<App />);
  