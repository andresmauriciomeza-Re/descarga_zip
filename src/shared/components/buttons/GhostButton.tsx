import type React from "react";

export function GhostBtn({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-xl border border-border text-foreground hover:bg-muted active:scale-95 transition-all duration-150 cursor-pointer px-5 py-3 text-base min-h-[48px] ${className}`}
    >
      {children}
    </button>
  );
}
