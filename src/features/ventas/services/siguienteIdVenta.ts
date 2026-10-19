/**
 * IDs de venta (punto C1).
 *
 * El formato canónico es NUMÉRICO ("1", "2", …): así venían la semilla de
 * ventas (`INITIAL_VENTAS`) y el pedido que toma el administrador en el local
 * (`VentaModal`). El checkout del cliente generaba "VEN-###" y las órdenes de
 * demostración traen "VEN-2024-015x", con lo que convivían tres formatos y el
 * vínculo con las órdenes de producción (`ventaId`) se perdía entre uno y
 * otro. Aquí viven el generador ÚNICO y la migración que reescribe los IDs
 * viejos al cargar.
 */

/** Sufijo numérico de un ID de venta, sea cual sea su formato legacy:
 *  "10" → 10, "VEN-010" → 10, "VEN-2024-0156" → 156 (el último bloque de
 *  dígitos, no el año). Devuelve 0 si el id no trae números. */
export const numeroDeIdVenta = (id: string): number => {
  const m = /(\d+)\s*$/.exec(id.trim());
  return m ? parseInt(m[1], 10) : 0;
};

/** Siguiente ID canónico: el máximo numérico entre las ventas existentes + 1.
 *  Se calcula contra los ids REALES (no contra el largo de la lista, que se
 *  desincroniza si se borra, se importa o se migra una venta) y también mira
 *  los formatos viejos, así una base sin migrar no provoca choques. */
export const siguienteIdVenta = (ventas: { id: string }[]): string =>
  String(
    ventas.reduce((max, v) => Math.max(max, numeroDeIdVenta(v.id)), 0) + 1
  );

/** Migración única de formato al arrancar (punto C1): reescribe los IDs
 *  legacy ("VEN-001", "VEN-2024-0156") al numérico canónico y devuelve el
 *  mapa viejo → nuevo para que las referencias externas (el `ventaId` de las
 *  órdenes de producción) puedan remapearse. Si el número que tocaba ya lo
 *  ocupa otra venta se asigna el siguiente libre: nunca quedan dos iguales.
 *  Los ids que ya son numéricos se conservan tal cual. */
export const migrarIdsVenta = (
  ventas: { id: string }[]
): { ventas: { id: string }[]; mapa: Record<string, string> } => {
  const ocupados = new Set<string>();
  const mapa: Record<string, string> = {};

  const siguienteLibre = () => {
    let n = 1;
    while (ocupados.has(String(n))) n++;
    return String(n);
  };

  const migradas = ventas.map((v) => {
    const canonico = v.id.trim();
    if (/^\d+$/.test(canonico) && !ocupados.has(canonico)) {
      ocupados.add(canonico);
      return v;
    }
    // ID legacy (o numérico duplicado): se reescribe al siguiente libre.
    const nuevo = siguienteLibre();
    ocupados.add(nuevo);
    if (canonico !== nuevo) mapa[v.id] = nuevo;
    return { ...v, id: nuevo };
  });

  return { ventas: migradas, mapa };
};
