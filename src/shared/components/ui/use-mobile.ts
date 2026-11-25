import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/** `breakpoint` = ancho (px) desde el cual ya NO es móvil. El panel usa 821
 *  (móvil = hasta 820px inclusive); el resto de la app usa 768 por defecto. */
export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < breakpoint);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return !!isMobile;
}
