/** Precio de venta: un 0 no se muestra (evitaba el "06767" del valor inicial
    con `type="number"`) y ocupa su lugar el placeholder "$ 0". El dato sigue
    siendo un número al guardar: vaciar el campo escribe 0. */
export function CampoPrecio({
  valor,
  onCambio,
  readOnly = false,
  cls,
}: {
  valor: number;
  onCambio: (n: number) => void;
  readOnly?: boolean;
  cls: string;
}) {
  return (
    <input
      type="number"
      value={valor === 0 ? "" : valor}
      placeholder="$ 0"
      onChange={(e) => onCambio(Number(e.target.value))}
      readOnly={readOnly}
      className={cls}
    />
  );
}
