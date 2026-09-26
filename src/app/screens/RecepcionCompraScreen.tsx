import React, { useMemo, useRef, useState, useEffect } from "react";
import { ArrowLeft, Check, Plus, Search, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Insumo } from "./GestionInsumosScreen";
import type {
  OrdenCompra,
  Recepcion,
  ItemRecibido,
  GestionCompra,
  OrdenItem,
  EstadoOrden,
} from "./OrdenCompraScreen";

const SERIF = "'DM Serif Display', serif";

const UNIDADES = ["kg", "g", "lt", "ml", "und", "paq", "caja", "bolsa"];

const iCls =
  "w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const compactInputCls =
  "w-full px-2.5 py-2 bg-muted border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30";

function fmtCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

interface Props {
  orden: OrdenCompra;
  insumos: Insumo[];
  gestiones: GestionCompra[];
  setGestiones: React.Dispatch<React.SetStateAction<GestionCompra[]>>;
  onGuardar: (recepcion: Recepcion, estado: EstadoOrden) => void;
  onBack: () => void;
}

/**
 * Ids de los insumos que ya se registraron en alguna factura de la OC. Esos
 * insumos no vuelven a ofrecerse al capturar otra factura de la misma orden,
 * aunque les sobre cantidad pendiente.
 */
function registradosEnOrden(gestiones: GestionCompra[], ordenId: string) {
  const set = new Set<string>();

  for (const g of gestiones) {
    if (g.ordenId !== ordenId) continue;

    for (const it of g.items ?? []) set.add(it.idInsumo);
  }

  return set;
}

export function RecepcionCompraScreen({
  orden,
  insumos,
  gestiones,
  setGestiones,
  onGuardar,
  onBack,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const registrados = useMemo(
    () => registradosEnOrden(gestiones, orden.id),
    [gestiones, orden.id]
  );

  // Los insumos no solicitados se guardan con un id propio, así que también se
  // comparan por nombre para no ofrecer lo que ya llegó en otra factura.
  const nombresRegistrados = useMemo(() => {
    const set = new Set<string>();

    for (const g of gestiones) {
      if (g.ordenId !== orden.id) continue;

      for (const it of g.items ?? []) set.add(it.nombre.toLowerCase().trim());
    }

    return set;
  }, [gestiones, orden.id]);

  // Solo se ofrecen los insumos que aún no se han facturado en esta OC.
  const [items, setItems] = useState<ItemRecibido[]>(() => {
    const previos = registradosEnOrden(gestiones, orden.id);

    return orden.items
      .filter((i) => !previos.has(i.idInsumo))
      .map((i) => ({
        rowId: i.rowId,
        idInsumo: i.idInsumo,
        nombre: i.nombre,
        cantidadSolicitada: i.cantidad,
        cantidadRecibida: i.cantidad,
        unidad: i.unidad,
        precioReferencia: i.precioUnitario,
        precioUnitario: i.precioUnitario,
      }));
  });

  const [itemsExtra, setItemsExtra] = useState<ItemRecibido[]>([]);

  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaFactura, setFechaFactura] = useState(today);

  const [exNombre, setExNombre] = useState("");
  const [exCant, setExCant] = useState(1);
  const [exUnidad, setExUnidad] = useState(UNIDADES[0]);
  const [exPrecio, setExPrecio] = useState(0);
  const [exShowSug, setExShowSug] = useState(false);

  const exRef = useRef<HTMLDivElement>(null);

  // ── Validación en tiempo real (patrón de MiPerfilScreen) ──────────────────
  const [tocado, setTocado] = useState({ numeroFactura: false, fechaFactura: false });
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  const errorNumeroFactura = numeroFactura.trim()
    ? undefined
    : "Ingresa el número de factura.";
  const errorFechaFactura = fechaFactura
    ? undefined
    : "Selecciona la fecha de la factura.";
  const errorProveedor = orden.proveedor.trim()
    ? undefined
    : "La orden no tiene proveedor asignado.";
  // Debe haber al menos un insumo con cantidad mayor que cero.
  const errorItems =
    [...items, ...itemsExtra].some((i) => i.cantidadRecibida > 0)
      ? undefined
      : "Registra al menos un insumo con cantidad mayor que cero.";

  const formValido =
    !errorNumeroFactura &&
    !errorFechaFactura &&
    !errorProveedor &&
    !errorItems;
  const algunoTocado = tocado.numeroFactura || tocado.fechaFactura;
  const marcarTocado = (campo: "numeroFactura" | "fechaFactura") =>
    setTocado((t) => ({ ...t, [campo]: true }));

  /** Clase del input: resalta en rojo cuando el campo visible es inválido. */
  const campoCls = (error?: string) =>
    `${iCls} transition-colors ${error ? "border-red-400 focus:ring-red-300" : ""}`;

  const exSugs = useMemo(
    () =>
      exNombre.trim().length >= 1
        ? insumos
            .filter(
              (i) =>
                !registrados.has(i.id) &&
                !nombresRegistrados.has(i.nombre.toLowerCase().trim()) &&
                i.nombre.toLowerCase().includes(exNombre.toLowerCase())
            )
            .slice(0, 6)
        : [],
    [insumos, exNombre, registrados, nombresRegistrados]
  );

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (
        exRef.current &&
        !exRef.current.contains(e.target as Node)
      ) {
        setExShowSug(false);
      }
    };

    document.addEventListener("mousedown", fn);

    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const updRec = (rowId: string, value: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              cantidadRecibida: Math.max(
                0,
                Math.min(value, item.cantidadSolicitada)
              ),
            }
          : item
      )
    );
  };

  /**
   * Quita el insumo de esta factura. Solo afecta a la lista local: el pedido de
   * la OC no cambia, así que el insumo sigue pendiente para una factura futura.
   */
  const quitarItem = (rowId: string, nombre: string) => {
    setItems((prev) => prev.filter((item) => item.rowId !== rowId));

    toast.success(`"${nombre}" no viene en esta factura. Queda pendiente.`);
  };

  const updPrice = (rowId: string, value: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.rowId === rowId
          ? { ...item, precioUnitario: Math.max(0, value) }
          : item
      )
    );
  };

  const addExtra = () => {
    if (!exNombre.trim()) {
      toast.error("Ingresa el nombre del insumo.");
      return;
    }

    if (exCant <= 0) {
      toast.error("La cantidad debe ser mayor que 0.");
      return;
    }

    if (exPrecio < 0) {
      toast.error("El precio unitario no puede ser negativo.");
      return;
    }

    setItemsExtra((prev) => [
      ...prev,
      {
        rowId: `ex-${Date.now()}`,
        idInsumo: `INS-EX-${Date.now()}`,
        nombre: exNombre.trim(),
        cantidadSolicitada: 0,
        cantidadRecibida: exCant,
        unidad: exUnidad,
        precioReferencia: exPrecio,
        precioUnitario: exPrecio,
      },
    ]);

    setExNombre("");
    setExCant(1);
    setExPrecio(0);
    setExShowSug(false);

    toast.success("Insumo adicional agregado.");
  };

  const totalPedido = orden.items.reduce(
    (total, item) => total + item.cantidad * item.precioUnitario,
    0
  );

  const totalRec = [...items, ...itemsExtra].reduce(
    (total, item) =>
      total + item.cantidadRecibida * item.precioUnitario,
    0
  );

  /** Suma una factura al acumulado de lo recibido en la OC. */
  const acumular = (
    mapa: Map<string, { nombre: string; unidad: string; cantidad: number; precioUnitario: number }>,
    item: OrdenItem
  ) => {
    const previo = mapa.get(item.idInsumo);

    if (previo) {
      previo.cantidad += item.cantidad;
      previo.precioUnitario = item.precioUnitario;
    } else {
      mapa.set(item.idInsumo, {
        nombre: item.nombre,
        unidad: item.unidad,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
      });
    }
  };

  const guardarRecepcion = () => {
    setIntentoGuardar(true);

    if (!numeroFactura.trim()) {
      toast.error("Ingresa el número de factura.");
      return;
    }

    if (!fechaFactura) {
      toast.error("Selecciona la fecha de la factura.");
      return;
    }

    if (!orden.proveedor.trim()) {
      toast.error("La orden no tiene proveedor asignado.");
      return;
    }

    const filasRecibidas = items.filter((item) => item.cantidadRecibida > 0);

    if (filasRecibidas.length === 0 && itemsExtra.length === 0) {
      toast.error("Registra al menos un insumo recibido en la factura.");
      return;
    }

    // Esta factura: solo lo que trae, con su número, fecha y total propios.
    const itemsFactura: OrdenItem[] = [...filasRecibidas, ...itemsExtra].map(
      (item) => ({
        rowId: item.rowId,
        idInsumo: item.idInsumo,
        nombre: item.nombre,
        cantidad: item.cantidadRecibida,
        unidad: item.unidad,
        precioUnitario: item.precioUnitario,
      })
    );

    const valorTotal = itemsFactura.reduce(
      (total, item) => total + item.cantidad * item.precioUnitario,
      0
    );

    // 1) Una compra nueva por factura: las facturas anteriores no se tocan.
    const nuevoId = String(
      Math.max(0, ...gestiones.map((g) => Number(g.id) || 0)) + 1
    ).padStart(3, "0");

    setGestiones((prev) => [
      {
        id: nuevoId,
        ordenId: orden.id,
        proveedor: orden.proveedor,
        numeroFactura: numeroFactura.trim(),
        fechaFactura,
        valorTotal,
        estado: "Recibido",
        items: itemsFactura,
      },
      ...prev,
    ]);

    // 2) Acumulado de la OC: facturas anteriores + esta.
    const acum = new Map<
      string,
      { nombre: string; unidad: string; cantidad: number; precioUnitario: number }
    >();

    for (const g of gestiones) {
      if (g.ordenId !== orden.id) continue;

      for (const it of g.items ?? []) acumular(acum, it);
    }

    itemsFactura.forEach((it) => acumular(acum, it));

    // Un insumo queda cubierto en cuanto se registra en alguna factura: la orden
    // se completa cuando ninguna factura deja insumos sin registrar.
    const registradosAhora = new Set(registrados);

    itemsFactura.forEach((it) => registradosAhora.add(it.idInsumo));

    const pendientes = orden.items.filter(
      (item) => !registradosAhora.has(item.idInsumo)
    );

    const idsOrden = new Set(orden.items.map((item) => item.idInsumo));

    const recepcion: Recepcion = {
      items: orden.items
        .map((pedido) => {
          const a = acum.get(pedido.idInsumo);
          if (!a) return null;

          return {
            rowId: pedido.rowId,
            idInsumo: pedido.idInsumo,
            nombre: pedido.nombre,
            cantidadSolicitada: pedido.cantidad,
            cantidadRecibida: a.cantidad,
            unidad: pedido.unidad,
            precioReferencia: pedido.precioUnitario,
            precioUnitario: a.precioUnitario,
          } as ItemRecibido;
        })
        .filter((x): x is ItemRecibido => x !== null),
      itemsExtra: [...acum.entries()]
        .filter(([idInsumo]) => !idsOrden.has(idInsumo))
        .map(([idInsumo, a]) => ({
          rowId: `ex-${idInsumo}`,
          idInsumo,
          nombre: a.nombre,
          cantidadSolicitada: 0,
          cantidadRecibida: a.cantidad,
          unidad: a.unidad,
          precioReferencia: a.precioUnitario,
          precioUnitario: a.precioUnitario,
        })),
      usarLotes: false,
      fechaRecepcion: today,
    };

    // La orden solo se completa cuando ninguna factura deja insumos pendientes.
    onGuardar(recepcion, pendientes.length === 0 ? "Completado" : "Enviado");

    toast.success(
      pendientes.length === 0
        ? `Factura ${numeroFactura.trim()} guardada · OC ${orden.id} completada`
        : `Factura ${numeroFactura.trim()} guardada · ${pendientes.length} insumo(s) pendiente(s) en la OC ${orden.id}`
    );

    onBack();
  };

  return (
    <div className="px-6 pt-5 pb-4 max-w-7xl mx-auto h-full flex flex-col overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-5 pb-5 border-b border-border shrink-0">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          title="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            Recepción de compra
          </h1>

          <p className="text-sm text-muted-foreground mt-0.5">
            OC {orden.id} · {orden.proveedor} · {today}
          </p>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL — dos columnas (mismo patrón que "Crear Producto") */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-8 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* =========================================================
              COLUMNA IZQUIERDA — ORDEN DE COMPRA (solo lectura)
          ========================================================= */}
          <div className="w-full lg:w-1/2 overflow-y-auto pr-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Orden de compra
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Insumos pedidos · solo lectura
            </p>

            <div className="space-y-5">
              {/* Información */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    N° Orden
                  </p>
                  <p className="text-sm font-bold mt-1">
                    {orden.id}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Proveedor
                  </p>
                  <p className="text-sm font-bold mt-1">
                    {orden.proveedor}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Fecha
                  </p>
                  <p className="text-sm font-semibold mt-1">
                    {orden.fecha}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Estado
                  </p>
                  <span
                    className={`inline-flex mt-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      orden.estado === "Completado"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {orden.estado}
                  </span>
                </div>
              </div>

              {/* Tabla — insumos pedidos (solo lectura) */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">
                  Insumos solicitados
                </h3>

                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
                        <tr>
                          <th className="px-3 py-3 text-left font-semibold">
                            Insumo
                          </th>

                          <th className="px-3 py-3 text-left font-semibold">
                            Cantidad
                          </th>

                          <th className="px-3 py-3 text-left font-semibold">
                            Unidad
                          </th>

                          <th className="px-3 py-3 text-left font-semibold">
                            P. referencia
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-border">
                        {orden.items.map((item) => (
                          <tr key={item.rowId}>
                            <td className="px-3 py-3 font-semibold">
                              {item.nombre}
                            </td>

                            <td className="px-3 py-3">
                              {item.cantidad}
                            </td>

                            <td className="px-3 py-3 text-xs text-muted-foreground">
                              {item.unidad}
                            </td>

                            <td className="px-3 py-3">
                              {fmtCOP(item.precioUnitario)}
                            </td>
                          </tr>
                        ))}
                      </tbody>

                      <tfoot className="bg-muted/50 border-t border-border">
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-2 text-xs font-bold text-muted-foreground text-right uppercase tracking-wider"
                          >
                            Total pedido
                          </td>
                          <td className="px-3 py-2 text-sm font-bold text-foreground">
                            {fmtCOP(totalPedido)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================
              COLUMNA DERECHA — COMPRA (factura del proveedor)
          ========================================================= */}
          <div className="w-full lg:w-1/2 overflow-y-auto pr-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Compra
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Compara factura y orden.
            </p>

            <div className="space-y-5">
              {/* Datos de la factura */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Número de factura <span className="text-red-500">*</span>
                  </label>

                  <input
                    value={numeroFactura}
                    onChange={(e) =>
                      setNumeroFactura(e.target.value)
                    }
                    onBlur={() => marcarTocado("numeroFactura")}
                    placeholder="Ej: FAC-000123"
                    className={campoCls(
                      (tocado.numeroFactura || intentoGuardar)
                        ? errorNumeroFactura
                        : undefined
                    )}
                    aria-invalid={!!((tocado.numeroFactura || intentoGuardar) && errorNumeroFactura)}
                  />
                  {(tocado.numeroFactura || intentoGuardar) && errorNumeroFactura && (
                    <p className="text-xs text-red-500 mt-1 ml-0.5">
                      {errorNumeroFactura}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Fecha de factura <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="date"
                    value={fechaFactura}
                    onChange={(e) =>
                      setFechaFactura(e.target.value)
                    }
                    onBlur={() => marcarTocado("fechaFactura")}
                    max={today}
                    className={campoCls(
                      (tocado.fechaFactura || intentoGuardar)
                        ? errorFechaFactura
                        : undefined
                    )}
                    aria-invalid={!!((tocado.fechaFactura || intentoGuardar) && errorFechaFactura)}
                  />
                  {(tocado.fechaFactura || intentoGuardar) && errorFechaFactura && (
                    <p className="text-xs text-red-500 mt-1 ml-0.5">
                      {errorFechaFactura}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-muted-foreground">
                    Proveedor:{" "}
                    <span
                      className={`font-semibold ${
                        errorProveedor ? "text-red-500" : "text-foreground"
                      }`}
                    >
                      {orden.proveedor || "Sin proveedor"}
                    </span>
                  </p>
                  {errorProveedor && (
                    <p className="text-xs text-red-500 mt-1 ml-0.5">
                      {errorProveedor}
                    </p>
                  )}
                </div>
              </div>

              {/* Recibido según factura */}
              <div>
                {errorItems && (algunoTocado || intentoGuardar) && (
                  <p className="text-xs text-red-500 mb-2 ml-0.5">
                    {errorItems}
                  </p>
                )}

                <h3 className="text-sm font-bold text-foreground mb-3">
                  Recibido según factura
                </h3>

                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
                        <tr>
                          <th className="px-3 py-3 text-left font-semibold">
                            Insumo
                          </th>

                          <th className="px-3 py-3 text-left font-semibold">
                            Cant. recibida
                          </th>

                          <th className="px-3 py-3 text-left font-semibold">
                            P. real
                          </th>

                          <th className="px-3 py-3 text-left font-semibold">
                            Subtotal
                          </th>

                          <th />
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-border">
                        {items.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-3 py-8 text-center text-xs text-muted-foreground"
                            >
                              Todos los insumos de la OC {orden.id} ya
                              se registraron en facturas anteriores
                            </td>
                          </tr>
                        ) : (
                          items.map((item) => (
                          <tr key={item.rowId}>
                            <td className="px-3 py-3">
                              <p className="font-semibold">
                                {item.nombre}
                              </p>

                              <p className="text-[11px] text-muted-foreground">
                                Pedido: {item.cantidadSolicitada}{" "}
                                {item.unidad}
                              </p>
                            </td>

                            <td className="px-3 py-3">
                              <input
                                type="number"
                                min={0}
                                max={item.cantidadSolicitada}
                                value={item.cantidadRecibida}
                                onChange={(e) =>
                                  updRec(
                                    item.rowId,
                                    Number(e.target.value)
                                  )
                                }
                                className="w-20 px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary/30"
                              />
                            </td>

                            <td className="px-3 py-3">
                              <input
                                type="number"
                                min={0}
                                value={item.precioUnitario}
                                onChange={(e) =>
                                  updPrice(
                                    item.rowId,
                                    Number(e.target.value)
                                  )
                                }
                                className="w-24 px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary/30"
                              />
                            </td>

                            <td className="px-3 py-3 text-xs font-semibold whitespace-nowrap">
                              {fmtCOP(
                                item.cantidadRecibida *
                                  item.precioUnitario
                              )}
                            </td>

                            <td className="px-3 py-3">
                              <button
                                onClick={() =>
                                  quitarItem(item.rowId, item.nombre)
                                }
                                title="Quitar de esta factura"
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                          ))
                        )}
                      </tbody>

                      <tfoot className="bg-muted/50 border-t border-border">
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-2 text-xs font-bold text-muted-foreground text-right uppercase tracking-wider"
                          >
                            Total recibido
                          </td>
                          <td
                            colSpan={2}
                            className="px-3 py-2 text-sm font-bold text-foreground"
                          >
                            {fmtCOP(totalRec)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              {/* INSUMOS EXTRA */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">
                  Insumos adicionales recibidos
                </h3>

                {itemsExtra.length > 0 && (
                  <div className="border border-border rounded-xl overflow-hidden mb-3">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs">
                            Nombre
                          </th>

                          <th className="px-3 py-2 text-left text-xs">
                            Cantidad
                          </th>

                          <th className="px-3 py-2 text-left text-xs">
                            Precio
                          </th>

                          <th className="px-3 py-2 text-left text-xs">
                            Subtotal
                          </th>

                          <th />
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-border">
                        {itemsExtra.map((item) => (
                          <tr key={item.rowId}>
                            <td className="px-3 py-2 font-semibold">
                              {item.nombre}
                            </td>

                            <td className="px-3 py-2">
                              {item.cantidadRecibida} {item.unidad}
                            </td>

                            <td className="px-3 py-2">
                              {fmtCOP(item.precioUnitario)}
                            </td>

                            <td className="px-3 py-2 font-semibold">
                              {fmtCOP(
                                item.cantidadRecibida *
                                  item.precioUnitario
                              )}
                            </td>

                            <td className="px-3 py-2">
                              <button
                                onClick={() =>
                                  setItemsExtra((prev) =>
                                    prev.filter(
                                      (x) =>
                                        x.rowId !== item.rowId
                                    )
                                  )
                                }
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div
                  ref={exRef}
                  className="border border-dashed border-border rounded-xl p-3 bg-muted/30"
                >
                  <p className="text-xs font-bold text-muted-foreground mb-3">
                    Agregar insumo no solicitado
                  </p>

                  <div className="flex flex-wrap items-end gap-2">
                    {/* Nombre */}
                    <div className="relative w-[160px] flex-none">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Nombre
                      </label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        <input
                          value={exNombre}
                          onChange={(e) => {
                            setExNombre(e.target.value);
                            setExShowSug(true);
                          }}
                          onFocus={() => setExShowSug(true)}
                          placeholder="Buscar insumo..."
                          className={`${compactInputCls} pl-8`}
                        />
                      </div>
                      {exShowSug && exSugs.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-30 overflow-hidden">
                          {exSugs.map((ins) => (
                            <button
                              key={ins.id}
                              type="button"
                              onMouseDown={() => {
                                setExNombre(ins.nombre);
                                setExUnidad(
                                  UNIDADES.includes(ins.unidadMedida)
                                    ? ins.unidadMedida
                                    : UNIDADES[0]
                                );
                                setExPrecio(ins.precioUnitario);
                                setExShowSug(false);
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-muted cursor-pointer border-b border-border last:border-0"
                            >
                              <p className="text-sm font-semibold">{ins.nombre}</p>
                              <p className="text-xs text-muted-foreground">
                                {ins.unidadMedida} · {fmtCOP(ins.precioUnitario)}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Cantidad */}
                    <div className="w-16 flex-none">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={exCant}
                        onChange={(e) => setExCant(Number(e.target.value))}
                        className={compactInputCls}
                      />
                    </div>

                    {/* Medida */}
                    <div className="w-16 flex-none">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Medida
                      </label>
                      <select
                        value={exUnidad}
                        onChange={(e) => setExUnidad(e.target.value)}
                        className={`${compactInputCls} cursor-pointer`}
                      >
                        {UNIDADES.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    {/* Precio */}
                    <div className="w-24 flex-none">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Precio unitario
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={exPrecio || ""}
                        onChange={(e) => setExPrecio(Number(e.target.value))}
                        className={compactInputCls}
                      />
                    </div>

                    <button
                      onClick={addExtra}
                      className="flex-none inline-flex h-[34px] items-center justify-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-red-700 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />

                <p className="text-xs text-emerald-800">
                  Al guardar se creará la factura{" "}
                  {numeroFactura.trim() ? `${numeroFactura.trim()} ` : ""}
                  en Gestión de Compras con lo recibido aquí. La OC{" "}
                  {orden.id} seguirá Enviada hasta registrar todos los
                  insumos.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onBack}
                  className="flex-1 py-3 border border-border rounded-xl text-sm font-semibold hover:bg-muted cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  onClick={guardarRecepcion}
                  disabled={!formValido}
                  className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
                >
                  <Check className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
