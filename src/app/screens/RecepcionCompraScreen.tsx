import React, { useMemo, useRef, useState, useEffect } from "react";
import { ArrowLeft, AlertTriangle, Check, Plus, Search, Trash2, Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Insumo } from "./GestionInsumosScreen";
import type {
  OrdenCompra,
  Recepcion,
  ItemRecibido,
  GestionCompra,
  OrdenItem,
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

  const totalPedido = orden.items.reduce(
    (total, item) => total + item.cantidad * item.precioUnitario,
    0
  );

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
      usarLotes: false,
      fechaRecepcion: today,
    };

    onGuardar(recepcion);

    const itemsRecibidos: OrdenItem[] = [...items, ...itemsExtra].map(
      (item) => ({
        rowId: item.rowId,
        idInsumo: item.idInsumo,
        nombre: item.nombre,
        cantidad: item.cantidadRecibida,
        unidad: item.unidad,
        precioUnitario: item.precioUnitario,
      })
    );

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
                items: itemsRecibidos,
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
          items: itemsRecibidos,
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

      {/* CONTENIDO PRINCIPAL — dos columnas (mismo patrón que "Crear Producto") */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* =========================================================
              COLUMNA IZQUIERDA — ORDEN DE COMPRA (solo lectura)
          ========================================================= */}
          <div className="w-full lg:w-1/2 px-8 py-6">
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
                  <span className="inline-flex mt-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    Enviado
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
              COLUMNA DERECHA — FACTURA REAL DEL PROVEEDOR
          ========================================================= */}
          <div className="w-full lg:w-1/2 px-8 py-6">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Factura del proveedor
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Registra lo que trae la factura real para compararlo con la
              orden
            </p>

            <div className="space-y-5">
              {/* Datos de la factura */}
              <div className="grid grid-cols-2 gap-4">
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
                  <p className="mt-2 text-sm text-muted-foreground">
                    Proveedor: <span className="font-semibold text-foreground">{orden.proveedor}</span>
                  </p>
                </div>
              </div>

              {/* Recibido según factura */}
              <div>
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
                        {items.map((item) => (
                          <tr
                            key={item.rowId}
                            className={item.malEstado ? "bg-red-50/60" : ""}
                          >
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
                                onClick={() => togMal(item.rowId)}
                                title="Marcar mal estado"
                                className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                                  item.malEstado
                                    ? "bg-red-500 text-white"
                                    : "bg-muted text-muted-foreground hover:bg-red-100 hover:text-red-600"
                                }`}
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>
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
                    <div className="relative flex-[2] min-w-[160px]">
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
                    <div className="w-16">
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
                    <div className="w-16">
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
                    <div className="w-24">
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
                      className="inline-flex h-[34px] items-center justify-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-red-700 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar
                    </button>
                  </div>
                </div>
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
    </div>
  );
}
