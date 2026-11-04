export function compararIdsDesc(a: string | number, b: string | number): number {
  const idA = String(a);
  const idB = String(b);
  const numeroA = idA.match(/(\d+)(?!.*\d)/)?.[1];
  const numeroB = idB.match(/(\d+)(?!.*\d)/)?.[1];

  if (numeroA !== undefined && numeroB !== undefined) {
    const diferencia = BigInt(numeroB) - BigInt(numeroA);
    if (diferencia < 0n) return -1;
    if (diferencia > 0n) return 1;
    return idB.localeCompare(idA, undefined, { numeric: true });
  }

  return idB.localeCompare(idA, undefined, { numeric: true });
}

export function ordenarPorIdDescendente<T>(
  lista: readonly T[],
  getId: (item: T) => string | number,
): T[] {
  return [...lista].sort((a, b) => compararIdsDesc(getId(a), getId(b)));
}
