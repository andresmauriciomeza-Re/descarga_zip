/** Nombres de roles con forma genérica según la gramática española (RAE):
 *  UN solo rol agrupa a hombres y mujeres ("Mesero", nunca "Mesera" ni
 *  "Mesero/a"). Estas utilidades alimentan el validador de RolModal, la
 *  semilla de roles y las migraciones de datos guardados. */

/** Sin tildes. */
const quitarTildes = (v: string): string =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Nombre del rol normalizado para mostrar: sin espacios sobrantes, todo en
 *  minúscula y solo la primera letra en mayúscula.
 *  "CAJERO" → "Cajero", "auxiliar de COCINA" → "Auxiliar de cocina". */
export const formatearNombreRol = (v: string): string => {
  const limpio = v.replace(/\s+/g, " ").trim().toLowerCase();
  if (!limpio) return "";
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
};

/** Clave de comparación por género: sin tildes, en minúscula y quitando la
 *  vocal final (a/o/e) y la "s" del plural de cada palabra. Así "Mesera" y
 *  "Mesero" dan la misma clave, igual que "Administradora"/"Administrador" y
 *  "Jefa"/"Jefe". */
export const claveGeneroRol = (v: string): string =>
  quitarTildes(v)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.replace(/s$/, "").replace(/[aeo]$/, ""))
    .join(" ");

/** Femeninos frecuentes → su forma genérica. Es el respaldo de
 *  `sugerenciaGenerica` para las palabras que no se arreglan solo quitando la
 *  vocal final. */
export const FORMAS_GENERICAS: Record<string, string> = {
  mesera: "Mesero",
  cajera: "Cajero",
  cocinera: "Cocinero",
  domiciliaria: "Domiciliario",
  administradora: "Administrador",
  repartidora: "Repartidor",
  panadera: "Panadero",
  pizzera: "Pizzero",
  jefa: "Jefe",
  supervisora: "Supervisor",
  encargada: "Encargado",
  empleada: "Empleado",
  operaria: "Operario",
  vendedora: "Vendedor",
  contadora: "Contador",
  aseadora: "Aseador",
  asistenta: "Asistente",
  gerenta: "Gerente",
  ayudanta: "Ayudante",
};

/** Si la primera palabra es femenina (está en el diccionario o termina en
 *  "-ora"), devuelve el nombre con la forma genérica:
 *  "Mesera de sala" → "Mesero de sala". Si no hay nada que corregir, `null`. */
export const sugerenciaGenerica = (nombre: string): string | null => {
  const limpio = nombre.trim();
  if (!limpio) return null;
  const [primera, ...resto] = limpio.split(/\s+/);
  const clavePrimera = quitarTildes(primera).toLowerCase();
  const enDiccionario = FORMAS_GENERICAS[clavePrimera];
  if (enDiccionario) {
    return formatearNombreRol([enDiccionario, ...resto].join(" "));
  }
  if (clavePrimera.endsWith("ora")) {
    return formatearNombreRol(
      [clavePrimera.replace(/a$/, ""), ...resto].join(" "),
    );
  }
  return null;
};

/** Detecta formas dobles unidas por " o " / " y " con la misma clave de género
 *  ("Mesero o mesera") y devuelve la forma genérica con la que debería quedar
 *  el rol ("Mesero"); si no hay doble, `null`. */
export const formaDobleGenerica = (nombre: string): string | null => {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  for (let i = 1; i < palabras.length - 1; i++) {
    const conector = palabras[i].toLowerCase();
    if (conector !== "o" && conector !== "y") continue;
    const a = palabras[i - 1];
    const b = palabras[i + 1];
    const claveA = claveGeneroRol(a);
    if (claveA && claveA === claveGeneroRol(b)) {
      const generica = sugerenciaGenerica(b) ? a : b;
      return formatearNombreRol(sugerenciaGenerica(generica) ?? generica);
    }
  }
  return null;
};
