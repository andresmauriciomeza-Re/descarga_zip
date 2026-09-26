// Declaraciones de tipos para imports de assets binarios.
//
// Motivo: sin esto, Vite resuelve los .png en runtime pero TypeScript no
// encuentra el modulo y reporta ts(2307) "Cannot find module" en cada import
// (por ejemplo los 11 de src/app/App.tsx:65-75).
//
// IMPORTANTE: este archivo cubre el caso de los .png. Si en algun momento se
// agrega `/// <reference types="vite/client" />` en un vite-env.d.ts, hay que
// ELIMINAR este archivo, porque vite/client declara los mismos patrones
// ('*.png', '*.jpg', ...) y las declaraciones duplicadas producen
// "Duplicate identifier".
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.avif' {
  const src: string;
  export default src;
}

declare module '*.ico' {
  const src: string;
  export default src;
}

declare module '*.bmp' {
  const src: string;
  export default src;
}

declare module '*.mp4' {
  const src: string;
  export default src;
}

declare module '*.webm' {
  const src: string;
  export default src;
}

declare module '*.woff' {
  const src: string;
  export default src;
}

declare module '*.woff2' {
  const src: string;
  export default src;
}
