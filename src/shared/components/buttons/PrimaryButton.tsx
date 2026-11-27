import type React from "react";

export function PrimaryBtn({
  children,
  onClick,
  type = "button",
  size = "md",
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
}) {
  const s = {
    sm: "px-4 py-2 text-sm min-h-[38px] max-md:min-h-11",
    md: "px-5 py-3 text-base min-h-[48px]",
    lg: "px-7 py-4 text-lg min-h-[56px]",
  }[size];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-red-700 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md hover:shadow-lg ${s} ${className}`}
    >
      {children}
    </button>
  );
}
