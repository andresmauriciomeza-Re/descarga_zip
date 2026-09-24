import React, { useMemo, useRef, useState, useEffect } from "react";
import { ArrowLeft, Check, Plus, Search, Trash2, Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Insumo } from "./GestionInsumosScreen";
import type {
  OrdenCompra,
  Recepcion,
  ItemRecibido,
  GestionCompra,
} from "./OrdenCompraScreen";

const SERIF = "'DM Serif Display', serif";

const UNIDADES = ["kg", "g", "lt", "ml", "und", "paq", "caja", "bolsa"];

const iCls =
  "w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

function fmtCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

function addDays(d: string, days: number) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
}

interface Props {
  orden: OrdenCompra;
  insumos: Insumo[];
  gestiones: GestionCompra[];
  setGestiones: React.Dispatch<React.SetStateAction<GestionCompra[]>>;
  onGuardar: (recepcion: Recepcion) => void;
  onAnular: () => void;
  onBack: () => void;
}

export function RecepcionCompraScreen({
  orden,
  insumos,
  gestiones,
  setGestiones,
  onGuardar,
  onAnular,
  onBack,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);

  type ItemRow = ItemRecibido & {
    malEstado: boolean;
  };

  const [items, setItems] = useState<ItemRow[]>(() =>
    orden.items.map((i) => ({
      rowId: i.rowId,
      idInsumo: i.idInsumo,
      nombre: i.nombre,
      cantidadSolicitada: i.cantidad,
      cantidadRecibida: i.cantidad,
      unidad: i.unidad,
      precioReferencia: i.precioUnitario,
      precioUnitario: i.precioUnitario,
      malEstado: false,
    }))
  );

  const [itemsExtra, setItemsExtra] = useState<ItemRecibido[]>([]);

  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaFactura, setFechaFactura] = useState(today);

  const [usarLotes, setUsarLotes] = useState(false);

  const [exNombre, setExNombre] = useState("");
  const [exCant, setExCant] = useState(1);
  const [exUnidad, setExUnidad] = useState(UNIDADES[0]);
  const [exPrecio, setExPrecio] = useState(0);
  const [exShowSug, setExShowSug] = useState(false);

  const exRef = useRef<HTMLDivElement>(null);

  const exSugs = useMemo(
    () =>
      exNombre.trim().length >= 1
        ? insumos
            .filter((i) =>
              i.nombre.toLowerCase().includes(exNombre.toLowerCase())
            )
            .slice(0, 6)
        : [],
    [insumos, exNombre]
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

  const updPrice = (rowId: string, value: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.rowId === rowId
          ? { ...item, precioUnitario: Math.max(0, value) }
          : item
      )
    );
  };

  const togMal = (rowId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.rowId === rowId
          ? { ...item, malEstado: !item.malEstado }
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

  const totalRec = [...items, ...itemsExtra].reduce(
    (total, item) =>
      total + item.cantidadRecibida * item.precioUnitario,
    0
  );

  const hayMal = items.some((item) => item.malEstado);

  const guardarRecepcion = () => {
    if (!numeroFactura.trim()) {
      toast.error("Ingresa el número de factura.");
      return;
    }

    if (!fechaFactura) {
      toast.error("Selecciona la fecha de la factura.");
      return;
    }

    const recepcion: Recepcion = {
      items: items.map(({ malEstado: _malEstado, ...rest }) => rest),
      itemsExtra,
      usarLotes,
      fechaRecepcion: today,
    };

    onGuardar(recepcion);

    const gestionExistente = gestiones.find(
      (g) => g.ordenId === orden.id
    );

    if (gestionExistente) {
      setGestiones((prev) =>
        prev.map((g) =>
          g.id === gestionExistente.id
            ? {
                ...g,
                numeroFactura: numeroFactura.trim(),
                fechaFactura,
                valorTotal: totalRec,
                estado: "Recibido",
              }
            : g
        )
      );
    } else {
      const nuevoId = String(
        Math.max(
          0,
          ...gestiones.map((g) => Number(g.id) || 0)
        ) + 1
      ).padStart(3, "0");

      setGestiones((prev) => [
        ...prev,
        {
          id: nuevoId,
          ordenId: orden.id,
          numeroFactura: numeroFactura.trim(),
          fechaFactura,
          valorTotal: totalRec,
          estado: "Recibido",
        },
      ]);
    }

    toast.success(
      `Recepción y factura de la OC ${orden.id} guardadas.`
    );

    onBack();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
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

      {/* CONTENIDO PRINCIPAL */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* =========================================================
            LADO IZQUIERDO — ORDEN DE COMPRA
        ========================================================= */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">
              Orden de compra
            </h2>

            <p className="text-xs text-muted-foreground mt-1">
              Insumos solicitados al proveedor
            </p>
          </div>

          <div className="p-5 space-y-5">
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
                <span className="inline-flex mt-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  Enviado
                </span>
              </div>
            </div>

            {/* Tabla */}
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">
                Insumos solicitados
              </h3>

              <div className="border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs">
                          Insumo
                        </th>

                        <th className="px-3 py-3 text-left text-xs">
                          Solicitado
                        </th>

                        <th className="px-3 py-3 text-left text-xs">
                          Recibido
                        </th>

                        <th className="px-3 py-3 text-left text-xs">
                          P. Unit.
                        </th>

                        <th className="px-3 py-3 text-left text-xs">
                          Estado
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-border">
                      {items.map((item) => (
                        <tr key={item.rowId}>
                          <td className="px-3 py-3">
                            <p className="font-semibold">
                              {item.nombre}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {item.unidad}
                            </p>
                          </td>

                          <td className="px-3 py-3">
                            {item.cantidadSolicitada}
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
                              className="w-20 px-2 py-1.5 bg-muted border border-border rounded-lg text-xs"
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
                              className="w-24 px-2 py-1.5 bg-muted border border-border rounded-lg text-xs"
                            />
                          </td>

                          <td className="px-3 py-3">
                            <button
                              onClick={() => togMal(item.rowId)}
                              className={`px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                                item.malEstado
                                  ? "bg-red-100 text-red-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {item.malEstado
                                ? "Mal estado"
                                : "Correcto"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* INSUMOS EXTRA */}
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">
                Insumos no solicitados
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
                className="border border-dashed border-border rounded-xl p-4 bg-muted/30"
              >
                <p className="text-xs font-bold text-muted-foreground mb-3">
                  Agregar insumo no solicitado
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Nombre */}
                  <div className="relative sm:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      Nombre
                    </label>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                      <input
                        value={exNombre}
                        onChange={(e) => {
                          setExNombre(e.target.value);
                          setExShowSug(true);
                        }}
                        onFocus={() => setExShowSug(true)}
                        placeholder="Buscar insumo..."
                        className={`${iCls} pl-10`}
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
                                UNIDADES.includes(
                                  ins.unidadMedida
                                )
                                  ? ins.unidadMedida
                                  : UNIDADES[0]
                              );
                              setExPrecio(
                                ins.precioUnitario
                              );
                              setExShowSug(false);
                            }}
                            className="w-full text-left px-3 py-2.5 hover:bg-muted cursor-pointer border-b border-border last:border-0"
                          >
                            <p className="text-sm font-semibold">
                              {ins.nombre}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {ins.unidadMedida} ·{" "}
                              {fmtCOP(ins.precioUnitario)}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cantidad */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      Cantidad
                    </label>

                    <input
                      type="number"
                      min={1}
                      value={exCant}
                      onChange={(e) =>
                        setExCant(Number(e.target.value))
                      }
                      className={iCls}
                    />
                  </div>

                  {/* Medida */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      Medida
                    </label>

                    <select
                      value={exUnidad}
                      onChange={(e) =>
                        setExUnidad(e.target.value)
                      }
                      className={iCls}
                    >
                      {UNIDADES.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Precio */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      Precio unitario
                    </label>

                    <input
                      type="number"
                      min={0}
                      value={exPrecio || ""}
                      onChange={(e) =>
                        setExPrecio(Number(e.target.value))
                      }
                      className={iCls}
                    />
                  </div>

                  {/* Subtotal */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      Subtotal
                    </label>

                    <div className={`${iCls} bg-muted/60 font-bold`}>
                      {fmtCOP(exCant * exPrecio)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={addExtra}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-red-700 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Agregar insumo
                </button>
              </div>
            </div>

            {/* LOTES */}
            <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-xl">
              <div>
                <p className="text-sm font-semibold">
                  Usar lotes
                </p>

                <p className="text-xs text-muted-foreground mt-0.5">
                  Vencimiento automático a 7 días.
                </p>
              </div>

              <button
                onClick={() => setUsarLotes((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer ${
                  usarLotes
                    ? "bg-primary"
                    : "bg-muted border border-border"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    usarLotes
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {usarLotes && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-800">
                  Fecha de recepción: {today}
                </p>

                <p className="text-xs text-amber-700 mt-1">
                  Vencimiento automático:{" "}
                  {addDays(today, 7)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================
            LADO DERECHO — FACTURA
        ========================================================= */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden h-fit">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">
              Factura
            </h2>

            <p className="text-xs text-muted-foreground mt-1">
              Registra la factura correspondiente a esta orden.
            </p>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Número de factura *
              </label>

              <input
                value={numeroFactura}
                onChange={(e) =>
                  setNumeroFactura(e.target.value)
                }
                placeholder="Ej: FAC-000123"
                className={iCls}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Fecha de factura *
              </label>

              <input
                type="date"
                value={fechaFactura}
                onChange={(e) =>
                  setFechaFactura(e.target.value)
                }
                max={today}
                className={iCls}
              />
            </div>

            <div className="border border-border rounded-xl p-4 bg-muted/30">
              <p className="text-xs text-muted-foreground">
                Total de la recepción
              </p>

              <p className="text-3xl font-bold text-foreground mt-1">
                {fmtCOP(totalRec)}
              </p>
            </div>

            {hayMal && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <Ban className="w-4 h-4 text-red-600 mt-0.5" />

                <p className="text-xs text-red-800">
                  Hay insumos marcados como recibidos en mal
                  estado. Revisa las cantidades antes de guardar.
                </p>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />

              <p className="text-xs text-emerald-800">
                Al guardar, la orden pasará a completada y la
                factura quedará asociada a la compra.
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
                onClick={onAnular}
                className="px-4 py-3 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 cursor-pointer"
              >
                Anular
              </button>

              <button
                onClick={guardarRecepcion}
                className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Guardar recepción
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}