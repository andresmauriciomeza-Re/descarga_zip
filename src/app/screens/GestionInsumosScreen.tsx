import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, Eye, Pencil, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";

const SERIF = "var(--font-titulo)";
const MONO  = "var(--font-texto)";
const PER_PAGE = 5;

// Categorías de insumos (Tb_Categoria_Insumos)
const CATEGORIAS_INS = [
  { id: "CINS-001", nombre: "Lácteos"         },
  { id: "CINS-002", nombre: "Carnes y Embutidos" },
  { id: "CINS-003", nombre: "Vegetales y Hierbas" },
  { id: "CINS-004", nombre: "Harinas y Masas"    },
  { id: "CINS-005", nombre: "Salsas y Condimentos" },
  { id: "CINS-006", nombre: "Frutas"             },
  { id: "CINS-007", nombre: "Bebidas"            },
  { id: "CINS-008", nombre: "Otros"              },
];

const UNIDADES = ["kg","g","lt","ml","und","paq","caja","bolsa"];

export type TipoInsumo = "Insumo" | "Insumo producto";

export interface Insumo {
  id: string;
  idCategoriaIns: string;
  nombre: string;
  unidadMedida: string;
  stockActual: number;
  stockMinimo: number;
  precioUnitario: number;
  tipo?: TipoInsumo;
  iva: number;
}

export const INITIAL_INSUMOS: Insumo[] = [
  { id:"INS-001", idCategoriaIns:"CINS-001", nombre:"Queso Mozzarella",    unidadMedida:"kg",  stockActual:25, stockMinimo:10, precioUnitario:18000, iva: 0 },
  { id:"INS-002", idCategoriaIns:"CINS-005", nombre:"Salsa de Tomate",     unidadMedida:"lt",  stockActual:30, stockMinimo:15, precioUnitario:8000,  iva: 0 },
  { id:"INS-003", idCategoriaIns:"CINS-002", nombre:"Pepperoni",            unidadMedida:"kg",  stockActual:8,  stockMinimo:5,  precioUnitario:25000, iva: 0 },
  { id:"INS-004", idCategoriaIns:"CINS-004", nombre:"Masa Pre-elaborada",   unidadMedida:"und", stockActual:50, stockMinimo:20, precioUnitario:3500,  iva: 0 },
  { id:"INS-005", idCategoriaIns:"CINS-003", nombre:"Champiñones",          unidadMedida:"kg",  stockActual:4,  stockMinimo:5,  precioUnitario:12000, iva: 0 },
  { id:"INS-006", idCategoriaIns:"CINS-003", nombre:"Albahaca Fresca",      unidadMedida:"kg",  stockActual:2,  stockMinimo:1,  precioUnitario:9000,  iva: 0 },
  { id:"INS-007", idCategoriaIns:"CINS-002", nombre:"Jamón Serrano",        unidadMedida:"kg",  stockActual:6,  stockMinimo:3,  precioUnitario:32000, iva: 0 },
  { id:"INS-008", idCategoriaIns:"CINS-006", nombre:"Piña en Trozos",       unidadMedida:"kg",  stockActual:12, stockMinimo:5,  precioUnitario:6000,  iva: 0 },
  { id:"INS-009", idCategoriaIns:"CINS-003", nombre:"Aceitunas Negras",     unidadMedida:"kg",  stockActual:3,  stockMinimo:2,  precioUnitario:14000, iva: 0 },
  { id:"INS-010", idCategoriaIns:"CINS-003", nombre:"Cebolla Morada",       unidadMedida:"kg",  stockActual:7,  stockMinimo:4,  precioUnitario:4000,  iva: 0 },
  { id:"INS-011", idCategoriaIns:"CINS-003", nombre:"Pimentón",             unidadMedida:"kg",  stockActual:5,  stockMinimo:3,  precioUnitario:5000,  iva: 0 },
  { id:"INS-012", idCategoriaIns:"CINS-007", nombre:"Bebidas 350ml",        unidadMedida:"und", stockActual:80, stockMinimo:30, precioUnitario:2500, iva: 0 },
];

const emptyForm = (): Omit<Insumo,"id"> => ({
  idCategoriaIns: "CINS-001", nombre: "", unidadMedida: "kg",
  stockActual: 0, stockMinimo: 0, precioUnitario: 0, tipo: "Insumo", iva: 0,
});

const fmtCOP = (n: number) => `$${n.toLocaleString("es-CO")}`;
const catNombre = (id: string) => CATEGORIAS_INS.find(c => c.id === id)?.nombre ?? id;

const stockBadge = (actual: number, minimo: number) => {
  if (actual <= 0)          return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Agotado</span>;
  if (actual <= minimo)     return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Stock bajo</span>;
  return                           <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">OK</span>;
};

interface GInsumosProps {
  insumos: Insumo[];
  setInsumos: React.Dispatch<React.SetStateAction<Insumo[]>>;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function GestionInsumosScreen({ insumos, setInsumos, canCreate = true, canEdit = true, canDelete = true }: GInsumosProps) {
  const [search,     setSearch]     = useState("");
  const [filterCat,  setFilterCat]  = useState("todos");
  const [page,       setPage]       = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem,   setEditItem]   = useState<Insumo | null>(null);
  const [detailItem, setDetailItem] = useState<Insumo | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [form,       setForm]       = useState(emptyForm());

  const iCls = "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  // Metrics
  const totalStock  = insumos.length;
  const bajoCritico = insumos.filter(i => i.stockActual <= i.stockMinimo).length;
  const agotados    = insumos.filter(i => i.stockActual <= 0).length;

  const filtered = useMemo(() =>
    insumos.filter(i =>
      (filterCat === "todos" || i.idCategoriaIns === filterCat) &&
      (i.id.toLowerCase().includes(search.toLowerCase()) ||
       i.nombre.toLowerCase().includes(search.toLowerCase()) ||
       catNombre(i.idCategoriaIns).toLowerCase().includes(search.toLowerCase()))
    ), [insumos, search, filterCat]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const handleCreate = () => {
    if (!form.nombre.trim()) { toast.error("El nombre del insumo es obligatorio"); return; }
    // `length + 1` reutilizaba un id existente si se había borrado un insumo del
    // medio: quedaban dos filas con la misma clave y editar/borrar una afectaba a
    // la otra. Se toma el mayor sufijo numérico, como en Usuarios.
    const nextNum = insumos.reduce((max, i) => {
      const n = parseInt(i.id.replace("INS-", ""), 10) || 0;
      return Math.max(max, n);
    }, 0) + 1;
    const newId = `INS-${String(nextNum).padStart(3,"0")}`;
    setInsumos(p => [...p, { id: newId, ...form }]);
    setShowCreate(false); setForm(emptyForm());
    toast.success("Insumo creado correctamente");
  };

  const handleEdit = () => {
    if (!editItem) return;
    setInsumos(p => p.map(i => i.id === editItem.id
      ? { ...editItem, nombre: i.nombre, idCategoriaIns: i.idCategoriaIns }
      : i));
    setEditItem(null);
    toast.success("Insumo actualizado");
  };

  const handleDelete = (id: string) => {
    setInsumos(p => p.filter(i => i.id !== id));
    setDeleteId(null);
    toast.success("Insumo eliminado");
  };

  const FormFields = ({ v, set, editando = false }: {
    v: Omit<Insumo,"id">; set:(f: Omit<Insumo,"id">)=>void; editando?: boolean;
  }) => {
    const lock = editando ? " opacity-60 cursor-not-allowed" : "";
    const lbl = "block text-xs font-semibold text-muted-foreground mb-1";
    return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className={lbl}>Nombre *</label>
        <input value={v.nombre} readOnly={editando} onChange={e=>set({...v,nombre:e.target.value})}
          placeholder="Ej: Queso Mozzarella" className={iCls+lock} />
        {editando && <p className="text-[11px] text-muted-foreground mt-1">El nombre no se puede modificar.</p>}
      </div>
      <div>
        <label className={lbl}>ID Categoría Insumo</label>
        <select value={v.idCategoriaIns} disabled={editando} onChange={e=>set({...v,idCategoriaIns:e.target.value})}
          className={iCls+(editando ? lock : " cursor-pointer")}>
          {CATEGORIAS_INS.map(c=>(<option key={c.id} value={c.id}>{c.id} {c.nombre}</option>))}
        </select>
      </div>
      <div>
        <label className={lbl}>Tipo</label>
        <select value={v.tipo ?? "Insumo"} onChange={e=>set({...v,tipo:e.target.value as TipoInsumo})}
          className={iCls+" cursor-pointer"}>
          <option value="Insumo">Insumo</option>
          <option value="Insumo producto">Insumo producto</option>
        </select>
      </div>
      {/* Unidad medida */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Unidad de Medida</label>
        <select value={v.unidadMedida} onChange={e=>set({...v,unidadMedida:e.target.value})}
          className={iCls+" cursor-pointer"}>
          {UNIDADES.map(u=><option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>IVA (%)</label>
        <input type="number" min={0} max={100} value={v.iva}
          onChange={e=>set({...v,iva:Number(e.target.value)})} className={iCls} />
      </div>
      {/* Stock actual */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Stock Actual</label>
        <input type="number" min={0} value={v.stockActual}
          onChange={e=>set({...v,stockActual:Number(e.target.value)})} className={iCls} />
      </div>
      {/* Stock mínimo */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Stock Mínimo</label>
        <input type="number" min={0} value={v.stockMinimo}
          onChange={e=>set({...v,stockMinimo:Number(e.target.value)})} className={iCls} />
      </div>
      {/* Precio unitario */}
      <div className="sm:col-span-2">
        <label className={lbl}>Precio Unitario máximo (COP)</label>
        <input type="number" min={0} value={v.precioUnitario}
          onChange={e=>set({...v,precioUnitario:Number(e.target.value)})} className={iCls} />
        <p className="text-[11px] text-muted-foreground mt-1">Se actualiza solo con el precio más alto pagado en las compras.</p>
      </div>
    </div>
    );
  };

  const Modal = ({ title, onClose, onConfirm, label, children }: {
    title:string; onClose:()=>void; onConfirm:()=>void; label:string; children:React.ReactNode;
  }) => (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div initial={{scale:.95,opacity:0}} animate={{scale:1,opacity:1}}
          exit={{scale:.95,opacity:0}} transition={{duration:.15}}
          className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border my-4">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-lg font-bold text-foreground" style={{fontFamily:SERIF}}>{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4"/></button>
          </div>
          <div className="px-5 py-4">{children}</div>
          <div className="flex gap-3 px-5 py-4 border-t border-border">
            <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">Cancelar</button>
            <button onClick={onConfirm} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">{label}</button>
          </div>
        </motion.div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{fontFamily:SERIF}}>Gestión Insumos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{insumos.length} insumos registrados</p>
        </div>
        {canCreate && (
          <button onClick={()=>{setForm(emptyForm());setShowCreate(true);}}
            className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md text-sm">
            <Plus className="w-4 h-4"/> Crear Insumo
          </button>
        )}
      </div>

      {/* Metric pills */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl">
          <span className="text-lg font-bold text-foreground">{totalStock}</span>
          <span className="text-xs text-muted-foreground">Total insumos</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl">
          <span className="text-lg font-bold text-amber-700">{bajoCritico}</span>
          <span className="text-xs text-amber-700">Stock bajo</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-xl">
          <span className="text-lg font-bold text-red-700">{agotados}</span>
          <span className="text-xs text-red-700">Agotados</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
            placeholder="Buscar por ID, nombre o categoría..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"/>
        </div>
        <select value={filterCat} onChange={e=>{setFilterCat(e.target.value);setPage(1);}}
          className="px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none cursor-pointer">
          <option value="todos">Todas las categorías</option>
          {CATEGORIAS_INS.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {["ID Insumo","ID Cat. Insumo","Nombre","Unidad","Stock Actual","Stock Mín.","Precio Unit.","Acciones"].map(h=>(
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length===0?(
                <tr><td colSpan={8} className="px-4 py-14 text-center text-muted-foreground">
                  <p className="text-4xl mb-3">📦</p><p>No se encontraron insumos</p>
                </td></tr>
              ):paged.map(i=>(
                <tr key={i.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3.5 text-sm font-mono font-semibold text-foreground">{i.id}</td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs font-mono font-semibold text-foreground">{i.idCategoriaIns}</p>
                    <p className="text-xs text-muted-foreground">{catNombre(i.idCategoriaIns)}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-medium text-foreground">{i.nombre}</p>
                    <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${i.tipo === "Insumo producto" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-700"}`}>
                      {i.tipo ?? "Insumo"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{i.unidadMedida}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground" style={{fontFamily:MONO}}>{i.stockActual}</span>
                      {stockBadge(i.stockActual, i.stockMinimo)}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground" style={{fontFamily:MONO}}>{i.stockMinimo}</td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-bold text-foreground" style={{fontFamily:MONO}}>{fmtCOP(i.precioUnitario)}</p>
                    <p className="text-[11px] text-muted-foreground">IVA {i.iva}%</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={()=>setDetailItem(i)} title="Ver detalle"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors cursor-pointer"><Eye className="w-4 h-4"/></button>
                      {canEdit && <button onClick={()=>setEditItem({...i})} title="Editar"
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"><Pencil className="w-4 h-4"/></button>}
                      {canDelete && <button onClick={()=>setDeleteId(i.id)} title="Eliminar"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"><Trash2 className="w-4 h-4"/></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filtered.length>0&&(
        <div className="flex items-center justify-center">
          {totalPages>1&&(
            <div className="flex items-center gap-1">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"><ChevronLeft className="w-4 h-4"/></button>
              {Array.from({length:totalPages},(_,i)=>i+1).map(n=>(
                <button key={n} onClick={()=>setPage(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold cursor-pointer ${n===page?"bg-primary text-white":"hover:bg-muted text-muted-foreground"}`}>{n}</button>
              ))}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"><ChevronRight className="w-4 h-4"/></button>
            </div>
          )}
        </div>
      )}

      {/* Modal: Crear */}
      <AnimatePresence>
        {showCreate&&(
          Modal({ title: "Crear Insumo", onClose: ()=>setShowCreate(false), onConfirm: handleCreate, label: "Crear Insumo",
            children: FormFields({ v: form, set: setForm }) })
        )}
      </AnimatePresence>

      {/* Modal: Editar */}
      <AnimatePresence>
        {editItem&&(
          Modal({ title: `Editar — ${editItem.id}`, onClose: ()=>setEditItem(null), onConfirm: handleEdit, label: "Guardar",
            children: FormFields({ v: editItem, set: v=>setEditItem({...editItem,...v}), editando: true }) })
        )}
      </AnimatePresence>

      {/* Modal: Ver detalle */}
      <AnimatePresence>
        {detailItem&&(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{scale:.95,opacity:0}} animate={{scale:1,opacity:1}}
              exit={{scale:.95,opacity:0}} transition={{duration:.15}}
              className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground" style={{fontFamily:SERIF}}>Detalle — {detailItem.id}</h3>
                <button onClick={()=>setDetailItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4"/></button>
              </div>
              <div className="px-5 py-4 space-y-2">
                {[
                  {l:"ID Insumo",       v:detailItem.id},
                  {l:"ID Cat. Insumo",  v:`${detailItem.idCategoriaIns} — ${catNombre(detailItem.idCategoriaIns)}`},
                  {l:"Nombre",          v:detailItem.nombre},
                  {l:"Tipo",             v:detailItem.tipo ?? "Insumo"},
                  {l:"IVA",              v:`${detailItem.iva}%`},
                  {l:"Unidad Medida",   v:detailItem.unidadMedida},
                  {l:"Stock Actual",    v:`${detailItem.stockActual} ${detailItem.unidadMedida}`},
                  {l:"Stock Mínimo",    v:`${detailItem.stockMinimo} ${detailItem.unidadMedida}`},
                  {l:"Precio Unitario (máx.)", v:fmtCOP(detailItem.precioUnitario)},
                ].map(({l,v})=>(
                  <div key={l} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-4">
                    <span className="text-sm text-muted-foreground font-medium shrink-0">{l}</span>
                    <span className="text-sm font-semibold text-foreground text-right">{v}</span>
                  </div>
                ))}
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground font-medium">Estado stock</span>
                  {stockBadge(detailItem.stockActual, detailItem.stockMinimo)}
                </div>
              </div>
              <div className="px-5 py-4 border-t border-border">
                <button onClick={()=>setDetailItem(null)} className="w-full py-2.5 bg-muted rounded-xl text-sm font-semibold text-foreground hover:bg-border cursor-pointer transition-colors">Cerrar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm delete */}
      <AnimatePresence>
        {deleteId&&(
          <ConfirmDeleteModal
            title="Eliminar insumo"
            message={<>¿Seguro que deseas eliminar el insumo <strong>{deleteId}</strong>? Esta acción no se puede deshacer.</>}
            onConfirm={()=>handleDelete(deleteId)}
            onCancel={()=>setDeleteId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
