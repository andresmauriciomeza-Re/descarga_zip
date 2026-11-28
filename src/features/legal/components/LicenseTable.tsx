import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import type { TablaDatos } from "@/features/legal/types/licenses.types";

export function TablaLicencias({ titulo, columnas, filas }: TablaDatos) {
  return (
    <div className="mt-6">
      <h3 className="text-base font-bold text-foreground">{titulo}</h3>
      <div className="mt-3 rounded-xl border border-border bg-card">
        <Table aria-label={titulo} className="max-sm:text-xs">
          <TableHeader>
            <TableRow>
              {columnas.map((columna) => (
                <TableHead
                  key={columna}
                  scope="col"
                  className="h-auto py-2.5 px-2 sm:px-3 whitespace-normal align-bottom font-semibold"
                >
                  {columna}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map(([nombre, ...resto]) => (
              <TableRow key={nombre}>
                <th scope="row" className="px-2 sm:px-3 py-2.5 text-left align-top font-medium break-words">
                  {nombre}
                </th>
                {resto.map((celda, i) => (
                  <TableCell
                    key={columnas[i + 1]}
                    className="px-2 sm:px-3 py-2.5 align-top whitespace-normal break-words text-muted-foreground"
                  >
                    {celda}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
