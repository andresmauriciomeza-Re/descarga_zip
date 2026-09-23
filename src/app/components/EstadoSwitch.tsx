export function EstadoSwitch({
  activo,
  onToggle,
}: {
  activo: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      title={activo ? "Desactivar" : "Activar"}
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 ${
        activo ? "bg-emerald-500" : "bg-gray-300 hover:bg-gray-400/70"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          activo ? "translate-x-[18px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}