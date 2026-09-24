import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Eye, X, ChevronLeft, ChevronRight,
  FileDown, Ban, CheckCircle2, AlertCircle,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import type { GestionCompra, OrdenCompra, EstadoGestion } from "./OrdenCompraScreen";

const SERIF = "'DM Serif Display', serif";
const PER_PAGE = 8;

const ESTADO_CONFIG: Record<EstadoGestion, string> = {
  "En Proceso": "bg-yellow-100 text-yellow-800",
  "Recibido":   "bg-emerald-100 text-emerald-800",
  "Anulado":    "bg-red-100 text-red-800",
};

function fmtCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
}

function EstadoBadge({ e }: { e: EstadoGestion }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ESTADO_CONFIG[e]}`}>
      {e}
    </span>
  );
}

// ─── FACTURA MODAL ────────────────────────────────────────────────────────────

function FacturaModal({ gestion, onClose, onGuardar, onAnular }: {
  gestion: GestionCompra;
  onClose: () => void;
  onGuardar: (numeroFactura: string, fechaFactura: string, valorTotal: number) => void;
  onAnular: () => void;
}) {
  const [numeroFactura, setNumeroFactura] = useState(gestion.numeroFactura);
  const [fechaFactura, setFechaFactura]   = useState(gestion.fechaFactura);
  const [valorTotal, setValorTotal]       = useState(gestion.valorTotal);
  const [showAnularConf, setShowAnularConf] = useState(false);

  const isEditable = gestion.estado === "En Proceso";
  const today = new Date().toISOString().slice(0, 10);

  const handleGuardar = () => {
    if (!numeroFactura.trim()) { toast.error("El número de factura es obligatorio."); return; }
    if (!fechaFactura) { toast.error("La fecha de factura es obligatoria."); return; }
    if (valorTotal <= 0) { toast.error("El valor total debe ser mayor a cero."); return; }
    onGuardar(numeroFactura.trim(), fechaFactura, valorTotal);
  };

  const iCls = "w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  const roCls = "w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl text-sm text-muted-foreground cursor-default";

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground" style={{ fontFamily: SERIF }}>
                  {isEditable ? "Registrar Factura" : "Detalle de Compra"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gestión {gestion.id} · OC {gestion.ordenId}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <EstadoBadge e={gestion.estado} />
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-5 py-5 space-y-4">
              {isEditable && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Registra los datos de la factura del proveedor. Al guardar, esta gestión pasará a{" "}
                    <strong>Recibido</strong>.
                  </span>
                </div>
              )}
              {!isEditable && gestion.estado === "Recibido" && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Factura registrada. Esta gestión ya no puede modificarse.
                </div>
              )}
              {!isEditable && gestion.estado === "Anulado" && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                  <Ban className="w-4 h-4 shrink-0" />
                  Esta gestión ha sido anulada.
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  N° Orden de Compra
                </label>
                <input value={gestion.ordenId} readOnly className={roCls} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  N° Factura {isEditable && <span className="text-red-500">*</span>}
                </label>
                {isEditable
                  ? <input
                      value={numeroFactura}
                      onChange={e => setNumeroFactura(e.target.value)}
                      placeholder="Ej: FAC-2024-0001"
                      className={iCls}
                      autoFocus
                    />
                  : <input value={gestion.numeroFactura || "—"} readOnly className={roCls} />}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Fecha de factura {isEditable && <span className="text-red-500">*</span>}
                </label>
                {isEditable
                  ? <input
                      type="date"
                      value={fechaFactura}
                      onChange={e => setFechaFactura(e.target.value)}
                      max={today}
                      className={iCls}
                    />
                  : <input value={gestion.fechaFactura || "—"} readOnly className={roCls} />}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Valor total {isEditable && <span className="text-red-500">*</span>}
                </label>
                {isEditable
                  ? <input
                      type="number"
                      min={1}
                      value={valorTotal || ""}
                      onChange={e => setValorTotal(Number(e.target.value))}
                      placeholder="0"
                      className={iCls}
                    />
                  : <input
                      value={gestion.valorTotal > 0 ? fmtCOP(gestion.valorTotal) : "—"}
                      readOnly
                      className={roCls}
                    />}
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                {isEditable ? "Cancelar" : "Cerrar"}
              </button>
              {isEditable && (
                <>
                  <button
                    onClick={() => setShowAnularConf(true)}
                    className="px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    Anular
                  </button>
                  <button
                    onClick={handleGuardar}
                    className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 transition-all"
                  >
                    Guardar
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showAnularConf && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border"
            >
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-3">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2" style={{ fontFamily: SERIF }}>
                Anular Gestión
              </h3>
              <p className="text-sm text-muted-foreground mb-1">
                ¿Confirmas la anulación de la gestión {gestion.id}?
              </p>
              <p className="text-sm font-semibold text-red-600 mb-5">
                Esta acción no puede revertirse.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAnularConf(false)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={onAnular}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95"
                >
                  Anular
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

interface Props {
  gestiones: GestionCompra[];
  setGestiones: React.Dispatch<React.SetStateAction<GestionCompra[]>>;
  ordenes: OrdenCompra[];
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function GestionCompraScreen({
  gestiones, setGestiones, ordenes,
}: Props) {
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [detail, setDetail]   = useState<GestionCompra | null>(null);

  const filtered = useMemo(() =>
    gestiones.filter(g => {
      const q = search.toLowerCase();
      return !q || g.id.toLowerCase().includes(q)
        || g.ordenId.toLowerCase().includes(q)
        || g.numeroFactura.toLowerCase().includes(q);
    }),
    [gestiones, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const getOrden = (oid: string) => ordenes.find(o => o.id === oid);

  const handleGuardarFactura = (
    g: GestionCompra,
    numeroFactura: string,
    fechaFactura: string,
    valorTotal: number,
  ) => {
    const updated: GestionCompra = {
      ...g, numeroFactura, fechaFactura, valorTotal, estado: "Recibido" as EstadoGestion,
    };
    setGestiones(prev => prev.map(x => x.id === g.id ? updated : x));
    setDetail(null);
    toast.success(`Factura ${numeroFactura} registrada · Gestión ${g.id} completada`);
  };

  const handleCrearCompra = (g: GestionCompra) => {
    if (!g.numeroFactura || !g.fechaFactura || g.valorTotal <= 0) {
      toast.error("Primero debes registrar la factura completa.");
      return;
    }

    setGestiones((prev) =>
      prev.map((x) =>
        x.id === g.id
          ? {
              ...x,
              compraCreada: true,
              estado: "Recibido",
            }
          : x
      )
    );

    toast.success(`Compra ${g.id} creada correctamente.`);
  };

  const handleAnular = (g: GestionCompra) => {
    setGestiones(prev => prev.map(x => x.id === g.id ? { ...x, estado: "Anulado" as EstadoGestion } : x));
    setDetail(null);
    toast.success(`Gestión ${g.id} anulada`);
  };

  const handleDownload = () => {
    const rows: string[][] = [
      ["ID Gestión", "OC Asociada", "Proveedor", "N° Factura", "Fecha Factura", "Valor Total", "Estado"],
    ];
    gestiones.forEach(g => {
      const orden = getOrden(g.ordenId);
      rows.push([
        g.id, g.ordenId, orden?.proveedor ?? "—",
        g.numeroFactura, g.fechaFactura,
        String(g.valorTotal), g.estado,
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "gestiones_compra.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV descargado");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>
            Gestión de Compras
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Registro de facturas vinculadas a órdenes completadas
          </p>
        </div>
        <button
          onClick={handleDownload}
          title="Descargar CSV"
          className="inline-flex items-center gap-2 px-3 py-2.5 border border-border text-foreground font-semibold text-sm rounded-xl hover:bg-muted cursor-pointer transition-all"
        >
          <FileDown className="w-4 h-4" /> CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por ID, OC o N° Factura..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            Las gestiones se crean automáticamente al completar la recepción de una Orden de Compra.
          </span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {["ID Gestión", "OC Asociada", "Proveedor", "N° Factura", "Fecha Factura", "Valor Total", "Estado", "Acciones"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0
                ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center text-muted-foreground">
                      <p className="text-4xl mb-3">📦</p>
                      <p className="font-medium">No hay gestiones de compra aún</p>
                      <p className="text-xs mt-1">
                        Se crean automáticamente al recibir una Orden de Compra
                      </p>
                    </td>
                  </tr>
                )
                : paged.map(g => {
                  const orden = getOrden(g.ordenId);
                  return (
                    <tr key={g.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 text-xs font-mono font-bold text-foreground">{g.id}</td>
                      <td className="px-4 py-3.5 text-xs font-mono font-semibold text-blue-600">{g.ordenId}</td>
                      <td className="px-4 py-3.5 text-sm text-foreground">{orden?.proveedor ?? "—"}</td>
                      <td className="px-4 py-3.5 text-xs">
                        {g.numeroFactura
                          ? <span className="font-mono font-semibold text-foreground">{g.numeroFactura}</span>
                          : <span className="text-amber-600 font-medium italic">Pendiente</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{g.fechaFactura || "—"}</td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-foreground">
                        {g.valorTotal > 0
                          ? fmtCOP(g.valorTotal)
                          : <span className="text-muted-foreground font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3.5"><EstadoBadge e={g.estado} /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setDetail(g)}
                            title={g.estado === "En Proceso" ? "Registrar factura" : "Ver detalle"}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {g.estado === "En Proceso" && (
                            <button
                              onClick={() => setDetail(g)}
                              className="ml-1 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-amber-400 bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 cursor-pointer transition-colors"
                            >
                              + Factura
                            </button>
                          )}
                          {g.estado === "En Proceso" &&
                            g.numeroFactura &&
                            g.fechaFactura &&
                            g.valorTotal > 0 &&
                            !g.compraCreada && (
                              <button
                                onClick={() => handleCrearCompra(g)}
                                className="ml-1 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-emerald-400 bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 cursor-pointer transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Crear compra
                              </button>
                            )}
                          {g.compraCreada && (
                            <span className="ml-1 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold">
                              <Check className="w-3.5 h-3.5" />
                              Compra creada
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center mt-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-sm font-semibold cursor-pointer ${n === page ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {detail && (
          <FacturaModal
            gestion={detail}
            onClose={() => setDetail(null)}
            onGuardar={(nf, ff, vt) => handleGuardarFactura(detail, nf, ff, vt)}
            onAnular={() => handleAnular(detail)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
