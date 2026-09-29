import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Plus, Pencil, Trash2, X, Check, Package } from "lucide-react";
import { toast } from "sonner";

const SERIF = "var(--font-titulo)";
const PER_PAGE = 10;

export interface Insumo {
  id: string;
  nombre: string;
  unidadMedida: string;
  costoUnitario: number;
  precioUnitario: number;
  iva: number;
  tipo: string;
  stockActual: number;
}

export const INITIAL_INSUMOS: Insumo[] = [
  { id: "INS-001", nombre: "Harina de trigo", unidadMedida: "kg", costoUnitario: 2500, precioUnitario: 3000, iva: 0, tipo: "Insumo", stockActual: 500 },
  { id: "INS-002", nombre: "Queso mozzarella", unidadMedida: "kg", costoUnitario: 15000, precioUnitario: 18000, iva: 19, tipo: "Insumo", stockActual: 50 },
  { id: "INS-003", nombre: "Tomate", unidadMedida: "kg", costoUnitario: 3500, precioUnitario: 4200, iva: 0, tipo: "Insumo", stockActual: 200 },
  { id: "INS-004", nombre: "Cebolla", unidadMedida: "kg", costoUnitario: 2800, precioUnitario: 3400, iva: 0, tipo: "Insumo", stockActual: 150 },
  { id: "INS-005", nombre: "Aceite vegetal", unidadMedida: "lt", costoUnitario: 8000, precioUnitario: 9600, iva: 19, tipo: "Insumo", stockActual: 80 },
  { id: "INS-006", nombre: "Sal", unidadMedida: "kg", costoUnitario: 1800, precioUnitario: 2200, iva: 0, tipo: "Insumo", stockActual: 300 },
  { id: "INS-007", nombre: "Pasta", unidadMedida: "kg", costoUnitario: 4500, precioUnitario: 5400, iva: 19, tipo: "Insumo", stockActual: 100 },
  { id: "INS-008", nombre: "Salsa de tomate", unidadMedida: "lt", costoUnitario: 6000, precioUnitario: 7200, iva: 19, tipo: "Insumo", stockActual: 60 },
];

const UNIDADES = ["kg", "g", "lt", "ml", "und", "paq", "caja", "bolsa"];

interface Props {
  insumos: Insumo[];
  setInsumos: React.Dispatch<React.SetStateAction<Insumo[]>>;
}

export function GestionInsumosScreen({ insumos, setInsumos }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [nombre, setNombre] = useState("");
  const [unidad, setUnidad] = useState(UNIDADES[0]);
  const [costoUnitario, setCostoUnitario] = useState(0);
  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [iva, setIva] = useState(0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return insumos;
    return insumos.filter(i =>
      i.nombre.toLowerCase().includes(q) ||
      i.id.toLowerCase().includes(q)
    );
  }, [insumos, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openCreate = () => {
    setEditingId(null);
    setNombre("");
    setUnidad(UNIDADES[0]);
    setCostoUnitario(0);
    setPrecioUnitario(0);
    setIva(0);
    setShowModal(true);
  };

  const openEdit = (insumo: Insumo) => {
    setEditingId(insumo.id);
    setNombre(insumo.nombre);
    setUnidad(insumo.unidadMedida);
    setCostoUnitario(insumo.costoUnitario);
    setPrecioUnitario(insumo.precioUnitario);
    setIva(insumo.iva);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!nombre.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }

    if (editingId) {
      setInsumos(prev => prev.map(i =>
        i.id === editingId
          ? { ...i, nombre: nombre.trim(), unidadMedida: unidad, costoUnitario, precioUnitario, iva }
          : i
      ));
      toast.success(`Insumo "${nombre}" actualizado`);
    } else {
      const newId = `INS-${String(Date.now()).slice(-6)}`;
      setInsumos(prev => [
        { id: newId, nombre: nombre.trim(), unidadMedida: unidad, costoUnitario, precioUnitario, iva, tipo: "Insumo", stockActual: 0 },
        ...prev
      ]);
      toast.success(`Insumo "${nombre}" creado`);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    setInsumos(prev => prev.filter(i => i.id !== id));
    toast.success("Insumo eliminado");
  };

  return (
    <div className="px-6 pt-5 pb-4 max-w-5xl mx-auto h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-4 mb-5 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>
            Gestión de Insumos
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Catálogo de insumos disponibles
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo Insumo
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 shrink-0">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre o ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-3">
        <div className="overflow-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {["ID", "Nombre", "Unidad", "Costo", "Precio", "IVA", "Acciones"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No hay insumos registrados</p>
                  </td>
                </tr>
              ) : paged.map(insumo => (
                <tr key={insumo.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{insumo.id}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-foreground">{insumo.nombre}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{insumo.unidadMedida}</td>
                  <td className="px-4 py-3 text-sm text-foreground">${insumo.costoUnitario.toLocaleString("es-CO")}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-foreground">${insumo.precioUnitario.toLocaleString("es-CO")}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{insumo.iva}%</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(insumo)}
                        title="Editar"
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(insumo.id)}
                        title="Eliminar"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"
            >
              ‹
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
              ›
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>
                  {editingId ? "Editar Insumo" : "Nuevo Insumo"}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Nombre *</label>
                  <input
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Nombre del insumo"
                    className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Unidad</label>
                    <select
                      value={unidad}
                      onChange={e => setUnidad(e.target.value)}
                      className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none cursor-pointer"
                    >
                      {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">IVA (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={iva}
                      onChange={e => setIva(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Costo unitario</label>
                    <input
                      type="number"
                      min={0}
                      value={costoUnitario || ""}
                      onChange={e => setCostoUnitario(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Precio unitario</label>
                    <input
                      type="number"
                      min={0}
                      value={precioUnitario || ""}
                      onChange={e => setPrecioUnitario(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-border">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 transition-all inline-flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
