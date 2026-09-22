import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, Eye, Pencil, RefreshCw, ChevronLeft, ChevronRight, Bell, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { CalendarDropdown } from "../components/CalendarDropdown";

const SERIF = "'DM Serif Display', serif";
const MONO  = "'JetBrains Mono', monospace";

// ─────────────────────────── GESTIÓN AGENDA ───────────────────────────

type TareaEstado = "pendiente" | "en-proceso" | "completada";
interface TareaAgenda { id: string; descripcion: string; estado: TareaEstado; hora?: string; }

const EMPLEADOS_ACTIVOS = [
  { nombre: "Sebastián Gómez",    area: "Cocina"          },
  { nombre: "María González",     area: "Caja"            },
  { nombre: "Carlos Martínez",    area: "Domicilio"       },
  { nombre: "Ana Rodríguez",      area: "Domicilio"       },
  { nombre: "Gloria Inés Vargas", area: "Administración"  },
  { nombre: "Luis Herrera",       area: "Cocina"          },
  { nombre: "Patricia Soto",      area: "Servicio"        },
  { nombre: "Jorge Vargas",       area: "Cocina"          },
  { nombre: "Sandra Ríos",        area: "Caja"            },
];
interface Agenda {
  id: string; empleado: string; iniciales: string; avatarColor: string;
  fecha: string; horaEntrada: string; horaSalida: string;
  tareas: TareaAgenda[]; activo: boolean;
}

const AVATAR_COLORS = ["bg-red-500","bg-blue-500","bg-emerald-500","bg-purple-500","bg-amber-500","bg-pink-500"];
const initials = (n: string) => n.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();

const INITIAL_AGENDA: Agenda[] = [
  { id:"AGN-001", empleado:"Gloria Inés Vargas",  iniciales:"GV", avatarColor:"bg-red-500",     fecha:"2024-01-15", horaEntrada:"08:00", horaSalida:"16:00", tareas:[{id:"t1",descripcion:"Preparar masa",estado:"completada"},{id:"t2",descripcion:"Supervisar hornos",estado:"completada"}], activo:true },
  { id:"AGN-002", empleado:"Carlos Martínez",      iniciales:"CM", avatarColor:"bg-blue-500",    fecha:"2024-01-15", horaEntrada:"12:00", horaSalida:"20:00", tareas:[{id:"t3",descripcion:"Atender pedidos",estado:"en-proceso"},{id:"t4",descripcion:"Cierre caja",estado:"pendiente"}], activo:true },
  { id:"AGN-003", empleado:"Ana Rodríguez",        iniciales:"AR", avatarColor:"bg-emerald-500", fecha:"2024-01-15", horaEntrada:"08:00", horaSalida:"14:00", tareas:[{id:"t5",descripcion:"Delivery zona norte",estado:"en-proceso"}], activo:true },
  { id:"AGN-004", empleado:"Jorge Vargas",         iniciales:"JV", avatarColor:"bg-purple-500",  fecha:"2024-01-16", horaEntrada:"10:00", horaSalida:"18:00", tareas:[{id:"t6",descripcion:"Limpieza equipos",estado:"pendiente"},{id:"t7",descripcion:"Control stock",estado:"pendiente"}], activo:false },
  { id:"AGN-005", empleado:"Patricia Soto",        iniciales:"PS", avatarColor:"bg-amber-500",   fecha:"2024-01-16", horaEntrada:"14:00", horaSalida:"22:00", tareas:[{id:"t8",descripcion:"Turno noche",estado:"pendiente"}], activo:true },
  { id:"AGN-006", empleado:"Luis Herrera",         iniciales:"LH", avatarColor:"bg-pink-500",    fecha:"2024-01-17", horaEntrada:"08:00", horaSalida:"16:00", tareas:[{id:"t9",descripcion:"Producción pizzas",estado:"completada"},{id:"t10",descripcion:"Inventario insumos",estado:"en-proceso"}], activo:true },
  { id:"AGN-007", empleado:"Sandra Ríos",          iniciales:"SR", avatarColor:"bg-red-500",     fecha:"2024-01-17", horaEntrada:"16:00", horaSalida:"00:00", tareas:[{id:"t11",descripcion:"Cierre turno",estado:"pendiente"}], activo:false },
];

const TODAY = "2024-01-15";
const PER_PAGE = 5;
const iCls = "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

type AgendaFormData = Omit<Agenda, "id" | "iniciales" | "avatarColor">;

// ── Modal "Nueva agenda" (solo Crear) ──
const NuevaAgendaModal = ({ onClose, onOk, form, setForm }: {
  onClose: () => void; onOk: () => void;
  form: AgendaFormData; setForm: (f: AgendaFormData) => void;
}) => {
  const [emp, setEmp]       = useState(form.empleado);
  const [fecha, setFecha]   = useState(form.fecha);
  const [entrada, setEnt]   = useState(form.horaEntrada);
  const [salida, setSal]    = useState(form.horaSalida);
  const [tareas, setTareas] = useState<TareaAgenda[]>(form.tareas);
  const [ntDesc, setNtDesc] = useState("");
  const [ntHora, setNtHora] = useState("08:00");

  const addTarea = () => {
    if (!ntDesc.trim()) return;
    setTareas(p=>[...p,{id:`t-${Date.now()}`,descripcion:ntDesc.trim(),estado:"pendiente",hora:ntHora}]);
    setNtDesc(""); setNtHora("08:00");
  };

  const handleSave = () => {
    if (!emp)            { toast.error("Selecciona un empleado"); return; }
    if (!fecha)          { toast.error("Selecciona la fecha del turno"); return; }
    if (tareas.length===0){ toast.error("Debe existir al menos una tarea para guardar el turno"); return; }
    setForm({...form, empleado:emp, fecha, horaEntrada:entrada, horaSalida:salida, tareas});
    onOk();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
      <motion.div initial={{scale:.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.95,opacity:0}} transition={{duration:.15}}
        className="bg-card rounded-2xl w-full max-w-xl shadow-2xl border border-border my-4">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border">
          <div>
            <h3 className="text-xl font-bold text-foreground" style={{fontFamily:SERIF}}>Nueva agenda</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Asigna el turno y las tareas que debe realizar el empleado</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground mt-0.5"><X className="w-4 h-4"/></button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* ── Datos del turno ── */}
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Datos del turno</p>

            {/* Empleado select */}
            <select value={emp} onChange={e=>setEmp(e.target.value)} className={iCls+" cursor-pointer"}>
              <option value="">Selecciona un empleado activo</option>
              {EMPLEADOS_ACTIVOS.map(e=>(
                <option key={e.nombre} value={e.nombre}>{e.nombre} — {e.area}</option>
              ))}
            </select>

            {/* Fecha + Horas en una fila */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha del turno</label>
                <CalendarDropdown value={fecha} onChange={setFecha}/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Hora de entrada</label>
                <input type="time" value={entrada} onChange={e=>setEnt(e.target.value)} className={iCls}/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Hora de salida</label>
                <input type="time" value={salida} onChange={e=>setSal(e.target.value)} className={iCls}/>
              </div>
            </div>
          </div>

          {/* ── Tareas asignadas ── */}
          <div className="border-t border-border pt-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tareas asignadas</p>
                <p className="text-xs text-muted-foreground mt-0.5">Debe existir al menos una tarea para guardar el turno</p>
              </div>
              <button onClick={addTarea}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-red-700 active:scale-95 transition-all cursor-pointer shrink-0">
                <Plus className="w-3.5 h-3.5"/> Agregar tarea
              </button>
            </div>

            {/* Existing tasks */}
            {tareas.length > 0 && (
              <div className="space-y-2">
                {tareas.map(t=>(
                  <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 bg-muted/60 rounded-xl">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 shrink-0">Pendiente</span>
                    <span className="flex-1 text-sm text-foreground truncate">{t.descripcion}</span>
                    {t.hora && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Bell className="w-3 h-3"/>{t.hora}
                      </span>
                    )}
                    <button onClick={()=>setTareas(p=>p.filter(x=>x.id!==t.id))}
                      className="text-muted-foreground hover:text-red-500 cursor-pointer shrink-0 transition-colors">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new task row */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-2 border-dashed border-border rounded-xl">
              <input value={ntDesc} onChange={e=>setNtDesc(e.target.value)}
                placeholder="Descripción de la nueva tarea"
                onKeyDown={e=>{ if(e.key==="Enter") addTarea(); }}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"/>
              <input type="time" value={ntHora} onChange={e=>setNtHora(e.target.value)}
                className="px-2 py-1 bg-muted rounded-lg border border-border text-xs text-foreground focus:outline-none w-24 shrink-0"/>
              <button onClick={addTarea}
                className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-red-700 active:scale-95 transition-all cursor-pointer shrink-0">
                Agregar
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose}
            className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
            Guardar agenda
          </button>
        </div>
      </motion.div>
      </div>
    </div>
  );
};

// ── Shared modal wrapper ──
const AgendaModal = ({title,v,setV,tareas,setTareas,onClose,onOk}:{
  title:string; v:Omit<Agenda,"id"|"iniciales"|"avatarColor">; setV:(x:typeof v)=>void;
  tareas:TareaAgenda[]; setTareas:(t:TareaAgenda[])=>void; onClose:()=>void; onOk:()=>void;
})=>{
  const [nt,setNt]=useState("");
  return(
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
      <motion.div initial={{scale:.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.95,opacity:0}} transition={{duration:.15}}
        className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border my-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-lg font-bold text-foreground" style={{fontFamily:SERIF}}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4"/></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Empleado *</label>
              <input value={v.empleado} onChange={e=>setV({...v,empleado:e.target.value})} placeholder="Nombre completo" className={iCls}/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha *</label>
              <CalendarDropdown value={v.fecha} onChange={f=>setV({...v,fecha:f})}/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
              <select value={v.activo?"activo":"inactivo"} onChange={e=>setV({...v,activo:e.target.value==="activo"})} className={iCls+" cursor-pointer"}>
                <option value="activo">Activo</option><option value="inactivo">Inactivo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Hora entrada</label>
              <input type="time" value={v.horaEntrada} onChange={e=>setV({...v,horaEntrada:e.target.value})} className={iCls}/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Hora salida</label>
              <input type="time" value={v.horaSalida} onChange={e=>setV({...v,horaSalida:e.target.value})} className={iCls}/>
            </div>
          </div>
          {/* Tareas */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">Tareas ({tareas.length})</label>
            <div className="space-y-1.5 mb-2 max-h-36 overflow-y-auto">
              {tareas.map(t=>(
                <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-xl">
                  <span className="flex-1 text-sm text-foreground truncate">{t.descripcion}</span>
                  <select value={t.estado} onChange={e=>setTareas(tareas.map(x=>x.id===t.id?{...x,estado:e.target.value as TareaEstado}:x))}
                    className="text-xs border-0 bg-transparent cursor-pointer text-muted-foreground focus:outline-none">
                    <option value="pendiente">Pendiente</option>
                    <option value="en-proceso">En proceso</option>
                    <option value="completada">Completada</option>
                  </select>
                  <button onClick={()=>setTareas(tareas.filter(x=>x.id!==t.id))} className="text-muted-foreground hover:text-red-500 cursor-pointer"><X className="w-3.5 h-3.5"/></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={nt} onChange={e=>setNt(e.target.value)} placeholder="Nueva tarea..." className={iCls} onKeyDown={e=>{
                if(e.key==="Enter"&&nt.trim()){setTareas([...tareas,{id:`t-${Date.now()}`,descripcion:nt.trim(),estado:"pendiente"}]);setNt("");}
              }}/>
              <button onClick={()=>{if(nt.trim()){setTareas([...tareas,{id:`t-${Date.now()}`,descripcion:nt.trim(),estado:"pendiente"}]);setNt("");}}}
                className="px-3 py-2.5 bg-primary text-white rounded-xl hover:bg-red-700 cursor-pointer active:scale-95 transition-all shrink-0">
                <Plus className="w-4 h-4"/>
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer">Cancelar</button>
          <button onClick={onOk} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95">Guardar</button>
        </div>
      </motion.div>
      </div>
    </div>
  );
};

export function GestionAgendaScreen() {
  const [agendas, setAgendas] = useState<Agenda[]>(INITIAL_AGENDA);
  const [search, setSearch] = useState("");
  const [filterFecha, setFilterFecha] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [sortBy, setSortBy] = useState("fecha");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Agenda | null>(null);
  const [detailItem, setDetailItem] = useState<Agenda | null>(null);

  // Form state
  const emptyForm = (): Omit<Agenda,"id"|"iniciales"|"avatarColor"> => ({
    empleado:"", fecha:"", horaEntrada:"08:00", horaSalida:"16:00", tareas:[], activo:true,
  });
  const [form, setForm] = useState(emptyForm());
  const [newTarea, setNewTarea] = useState("");

  // Metrics
  const turnoshoy  = agendas.filter(a=>a.fecha===TODAY).length;
  const activos    = agendas.filter(a=>a.activo).length;
  const inactivos  = agendas.filter(a=>!a.activo).length;
  const pendientes = agendas.reduce((s,a)=>s+a.tareas.filter(t=>t.estado==="pendiente").length,0);

  // Filtering + sorting
  const filtered = useMemo(()=>{
    let r = agendas.filter(a=>{
      const q = search.toLowerCase();
      const matchQ = !q || a.empleado.toLowerCase().includes(q) || a.fecha.includes(q);
      const matchF = !filterFecha || a.fecha===filterFecha;
      const matchE = filterEstado==="todos" || (filterEstado==="activo"?a.activo:!a.activo);
      return matchQ && matchF && matchE;
    });
    if (sortBy==="empleado") r=[...r].sort((a,b)=>a.empleado.localeCompare(b.empleado));
    else if (sortBy==="estado") r=[...r].sort((a,b)=>Number(b.activo)-Number(a.activo));
    else r=[...r].sort((a,b)=>a.fecha.localeCompare(b.fecha));
    return r;
  },[agendas,search,filterFecha,filterEstado,sortBy]);

  const totalPages = Math.ceil(filtered.length/PER_PAGE);
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  // Tareas badge
  const tareasBadge = (tareas: TareaAgenda[]) => {
    const pend = tareas.filter(t=>t.estado==="pendiente").length;
    const proc = tareas.filter(t=>t.estado==="en-proceso").length;
    const comp = tareas.filter(t=>t.estado==="completada").length;
    if (pend>0) return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">{pend} pendiente{pend>1?"s":""}</span>;
    if (proc>0) return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">{proc} en proceso</span>;
    if (comp>0) return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">{comp} completada{comp>1?"s":""}</span>;
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">Sin tareas</span>;
  };

  const handleCreate = () => {
    if (!form.empleado||!form.fecha){toast.error("Empleado y fecha son obligatorios");return;}
    const idx = agendas.length % AVATAR_COLORS.length;
    const newA: Agenda = { id:`AGN-${String(agendas.length+1).padStart(3,"0")}`, iniciales:initials(form.empleado), avatarColor:AVATAR_COLORS[idx], ...form };
    setAgendas(p=>[...p,newA]); setShowCreate(false); setForm(emptyForm()); toast.success("Agenda creada");
  };

  const handleEdit = () => {
    if(!editItem){return;}
    setAgendas(p=>p.map(a=>a.id===editItem.id?editItem:a)); setEditItem(null); toast.success("Agenda actualizada");
  };

  const toggleEstado = (id:string) => {
    setAgendas(p=>p.map(a=>a.id===id?{...a,activo:!a.activo}:a));
    toast.success("Estado actualizado");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{fontFamily:SERIF}}>Agenda de turnos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{agendas.length} turnos registrados</p>
        </div>
        <button onClick={()=>{setForm(emptyForm());setShowCreate(true);}}
          className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md text-sm">
          <Plus className="w-4 h-4"/> Crear agenda
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label:"Turnos hoy",       value:turnoshoy,  cls:"text-foreground",         bg:"bg-card" },
          { label:"Activos",          value:activos,    cls:"text-emerald-600",         bg:"bg-emerald-50" },
          { label:"Tareas pendientes",value:pendientes, cls:"text-amber-600",           bg:"bg-amber-50" },
          { label:"Inactivos",        value:inactivos,  cls:"text-muted-foreground",   bg:"bg-muted" },
        ].map(({label,value,cls,bg})=>(
          <div key={label} className={`${bg} border border-border rounded-2xl p-4`}>
            <p className={`text-3xl font-bold ${cls}`}>{value}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Buscar empleado..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"/>
        </div>
        <input type="date" value={filterFecha} onChange={e=>{setFilterFecha(e.target.value);setPage(1);}}
          className="px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none cursor-pointer"/>
        <select value={filterEstado} onChange={e=>{setFilterEstado(e.target.value);setPage(1);}}
          className="px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none cursor-pointer">
          <option value="todos">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
          className="px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none cursor-pointer">
          <option value="fecha">Ordenar por fecha</option>
          <option value="empleado">Ordenar por empleado</option>
          <option value="estado">Ordenar por estado</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>{["Empleado","Fecha","Horario","Tareas","Estado","Acciones"].map(h=>(
                <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length===0?(
                <tr><td colSpan={6} className="px-4 py-14 text-center text-muted-foreground">
                  <p className="text-4xl mb-3">📅</p><p>No se encontraron agendas</p>
                </td></tr>
              ):paged.map(a=>(
                <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                  {/* Empleado */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${a.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {a.iniciales}
                      </div>
                      <span className="text-sm font-medium text-foreground">{a.empleado}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{a.fecha}</td>
                  <td className="px-4 py-3.5 text-sm font-mono text-foreground">{a.horaEntrada} – {a.horaSalida}</td>
                  <td className="px-4 py-3.5">{tareasBadge(a.tareas)}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${a.activo?"bg-emerald-100 text-emerald-800":"bg-gray-100 text-gray-600"}`}>
                      {a.activo?"Activo":"Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={()=>setDetailItem(a)} title="Ver detalle"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors cursor-pointer"><Eye className="w-4 h-4"/></button>
                      <button onClick={()=>setEditItem({...a,tareas:[...a.tareas]})} title="Editar"
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"><Pencil className="w-4 h-4"/></button>
                      <button onClick={()=>toggleEstado(a.id)} title="Cambiar estado"
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-muted-foreground hover:text-amber-600 transition-colors cursor-pointer"><RefreshCw className="w-4 h-4"/></button>
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

      {/* Crear */}
      <AnimatePresence>
        {showCreate && (
          <NuevaAgendaModal onClose={()=>setShowCreate(false)} onOk={handleCreate} form={form} setForm={setForm}/>
        )}
      </AnimatePresence>

      {/* Editar */}
      <AnimatePresence>
        {editItem&&(
          <AgendaModal title={`Editar — ${editItem.id}`} v={editItem} setV={v=>setEditItem({...editItem,...v})}
            tareas={editItem.tareas} setTareas={t=>setEditItem({...editItem,tareas:t})}
            onClose={()=>setEditItem(null)} onOk={handleEdit}/>
        )}
      </AnimatePresence>

      {/* Ver detalle */}
      <AnimatePresence>
        {detailItem&&(
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
            <motion.div initial={{scale:.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.95,opacity:0}} transition={{duration:.15}}
              className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground" style={{fontFamily:SERIF}}>Detalle — {detailItem.id}</h3>
                <button onClick={()=>setDetailItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4"/></button>
              </div>
              <div className="px-5 py-4 space-y-3">
                {/* Avatar + nombre */}
                <div className="flex items-center gap-3 pb-3 border-b border-border">
                  <div className={`w-12 h-12 rounded-full ${detailItem.avatarColor} flex items-center justify-center text-white font-bold`}>{detailItem.iniciales}</div>
                  <div>
                    <p className="font-bold text-foreground">{detailItem.empleado}</p>
                    <p className="text-xs text-muted-foreground">{detailItem.id}</p>
                  </div>
                </div>
                {[
                  {l:"Fecha",    v:detailItem.fecha},
                  {l:"Horario",  v:`${detailItem.horaEntrada} – ${detailItem.horaSalida}`},
                  {l:"Estado",   v:detailItem.activo?"Activo":"Inactivo"},
                ].map(({l,v})=>(
                  <div key={l} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground font-medium">{l}</span>
                    <span className="text-sm font-semibold text-foreground">{v}</span>
                  </div>
                ))}
                {/* Tareas */}
                {detailItem.tareas.length>0&&(
                  <div className="pt-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Tareas ({detailItem.tareas.length})</p>
                    <div className="space-y-1.5">
                      {detailItem.tareas.map(t=>(
                        <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-muted rounded-xl">
                          <span className="text-sm text-foreground">{t.descripcion}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            t.estado==="completada"?"bg-emerald-100 text-emerald-800":
                            t.estado==="en-proceso"?"bg-blue-100 text-blue-800":
                            "bg-amber-100 text-amber-800"
                          }`}>{t.estado}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 border-t border-border">
                <button onClick={()=>setDetailItem(null)} className="w-full py-2.5 bg-muted rounded-xl text-sm font-semibold text-foreground hover:bg-border cursor-pointer">Cerrar</button>
              </div>
            </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
