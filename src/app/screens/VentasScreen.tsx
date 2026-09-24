import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Eye,
  Trash2,
  AlertCircle,
  ShieldCheck,
  ShieldX,
  ImageIcon,
  RefreshCw,
  Banknote,
  PackageCheck,
  CircleCheck,
} from "lucide-react";
import { toast } from "sonner";
import { CalendarDropdown } from "../components/CalendarDropdown";

const SERIF = "'DM Serif Display', serif";
const MONO = "'JetBrains Mono', monospace";

// ─────────────────────────── LOCAL PRODUCT TYPE + DATA ───────────────────────────

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  sizes: { label: string; price: number }[];
  extras: { label: string; price: number }[];
  status: "activo" | "agotado" | "pausado";
  rating: number;
  sales: number;
}

const SIZES_DEFAULT = [
  { label: "Mediano", price: 14000 },
  { label: "Grande", price: 16000 },
];

const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Margarita Clásica",
    description:
      "Salsa de tomate casera, mozzarella fresca y albahaca del jardín. La pizza que nos hizo famosos en Medellín desde 1994.",
    price: 14000,
    image:
      "https://images.unsplash.com/photo-1664309641932-0e03e0771b97?w=600&h=600&fit=crop&auto=format",
    category: "Pizzas",
    sizes: SIZES_DEFAULT,
    extras: [],
    status: "activo",
    rating: 4.9,
    sales: 1240,
  },
  {
    id: 2,
    name: "Pepperoni Suprema",
    description:
      "Generosa porción de pepperoni importado, queso mozzarella derretido y la salsa secreta de La Sirena.",
    price: 14000,
    image:
      "https://images.unsplash.com/photo-1573821663912-6df460f9c684?w=600&h=600&fit=crop&auto=format",
    category: "Pizzas",
    sizes: SIZES_DEFAULT,
    extras: [],
    status: "activo",
    rating: 4.8,
    sales: 980,
  },
  {
    id: 3,
    name: "La Sirena Especial",
    description:
      "Nuestra pizza insignia. Camarones al ajillo, queso crema, mozzarella, tomate cherry y rúcula fresca.",
    price: 14000,
    image:
      "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600&h=600&fit=crop&auto=format",
    category: "Pizzas",
    sizes: SIZES_DEFAULT,
    extras: [],
    status: "activo",
    rating: 4.95,
    sales: 756,
  },
  {
    id: 4,
    name: "Cuatro Quesos",
    description:
      "Mozzarella, provolone, queso azul y parmesano reggiano. Para los verdaderos amantes del queso.",
    price: 14000,
    image:
      "https://images.unsplash.com/photo-1680405620826-83b0f0f61b28?w=600&h=600&fit=crop&auto=format",
    category: "Pizzas",
    sizes: SIZES_DEFAULT,
    extras: [],
    status: "activo",
    rating: 4.7,
    sales: 620,
  },
  {
    id: 5,
    name: "Hawaiana Tropical",
    description:
      "Piña caramelizada, jamón serrano, mozzarella y salsa BBQ. Dulce y salada en perfecta armonía.",
    price: 14000,
    image:
      "https://images.unsplash.com/photo-1607811253515-57ef7723099d?w=600&h=600&fit=crop&auto=format",
    category: "Pizzas",
    sizes: SIZES_DEFAULT,
    extras: [],
    status: "activo",
    rating: 4.6,
    sales: 540,
  },
  {
    id: 6,
    name: "Veggie Mediterránea",
    description:
      "Pimentones de colores, aceitunas kalamata, queso feta, espinaca fresca y tomates cherry.",
    price: 14000,
    image:
      "https://images.unsplash.com/photo-1702716059239-385baacdabdc?w=600&h=600&fit=crop&auto=format",
    category: "Pizzas",
    sizes: SIZES_DEFAULT,
    extras: [],
    status: "pausado",
    rating: 4.5,
    sales: 380,
  },
];

// ─────────────────────────── LOCAL CONFIRM MODAL ───────────────────────────

function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <h3
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            {title}
          </h3>
        </div>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-border rounded-xl font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors active:scale-95 cursor-pointer"
          >
            Sí, confirmar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────── VENTAS TYPES & DATA ───────────────────────────

export type VentaStatus = "venta" | "perdida" | "por-verificar" | "completado";

export interface HistorialEntry { estado: VentaStatus; hora: string; }

interface DetalleProd {
  nombre: string;
  precio: number;
  cantidad: number;
  imagen?: string;
  tamaño?: string;
  extras?: string[];
}

export type DevolucionTipo = "producto" | "dinero";

export interface Venta {
  id: string;
  usuario: string;
  fecha: string;
  productos: string;
  cantidad: number;
  total: number;
  estado: VentaStatus;
  detalle?: DetalleProd[];
  metodoPago?: string;
  comprobante?: string;
  horaRecogida?: string;
  historial?: HistorialEntry[];
  devolucionTipo?: DevolucionTipo;
  devolucionResuelta?: boolean;
  devolucionNota?: string;
}

const VENTA_STATUS_COLOR: Record<VentaStatus, string> = {
  venta:           "bg-blue-100 text-blue-800",
  perdida:         "bg-orange-100 text-orange-800",
  "por-verificar": "bg-amber-100 text-amber-800",
  completado:      "bg-emerald-100 text-emerald-800",
};

const VENTA_STATUS_LABEL: Record<VentaStatus, string> = {
  venta:           "Por entregar",
  perdida:         "Devolución",
  "por-verificar": "Por verificar",
  completado:      "Completado",
};

const nowHora = () =>
  new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

export const INITIAL_VENTAS: Venta[] = [
  {
    id: "1",
    usuario: "María González",
    fecha: "2024-01-15",
    productos: "Margarita Clásica x2",
    cantidad: 2,
    total: 56000,
    estado: "venta",
    metodoPago: "Nequi",
    historial: [{ estado: "por-verificar", hora: "4:10 PM" }, { estado: "venta", hora: "4:15 PM" }],
    detalle: [
      {
        nombre: "Margarita Clásica",
        precio: 28000,
        cantidad: 2,
        imagen:
          "https://images.unsplash.com/photo-1564936281403-5cc7543df8e2?w=80&h=80&fit=crop&auto=format",
      },
    ],
  },
  {
    id: "2",
    historial: [{ estado: "venta" as VentaStatus, hora: "5:02 PM" }],
    usuario: "Carlos Martínez",
    fecha: "2024-01-15",
    productos: "Pepperoni Premium x1",
    cantidad: 1,
    total: 28000,
    estado: "venta",
    metodoPago: "Bancolombia",
    detalle: [
      {
        nombre: "Pepperoni Premium",
        precio: 28000,
        cantidad: 1,
        imagen:
          "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=80&h=80&fit=crop&auto=format",
      },
    ],
  },
  {
    id: "3",
    historial: [{ estado: "por-verificar" as VentaStatus, hora: "6:30 PM" }, { estado: "venta" as VentaStatus, hora: "6:45 PM" }],
    usuario: "Ana Rodríguez",
    fecha: "2024-01-16",
    productos: "Cuatro Quesos x3",
    cantidad: 3,
    total: 90000,
    estado: "venta",
    metodoPago: "Nequi",
    detalle: [
      {
        nombre: "Cuatro Quesos",
        precio: 30000,
        cantidad: 3,
        imagen:
          "https://images.unsplash.com/photo-1571407970349-bc81e71e5080?w=80&h=80&fit=crop&auto=format",
      },
    ],
  },
  {
    id: "4",
    historial: [{ estado: "por-verificar" as VentaStatus, hora: "7:00 PM" }, { estado: "perdida" as VentaStatus, hora: "7:20 PM" }],
    usuario: "Jorge Vargas",
    fecha: "2024-01-16",
    productos: "Especial La Sirena x1",
    cantidad: 1,
    total: 32000,
    estado: "perdida",
    metodoPago: "Bancolombia",
    detalle: [
      {
        nombre: "Especial La Sirena",
        precio: 32000,
        cantidad: 1,
        imagen:
          "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=80&h=80&fit=crop&auto=format",
      },
    ],
  },
  {
    id: "5",
    historial: [{ estado: "venta" as VentaStatus, hora: "8:05 PM" }],
    usuario: "Patricia Soto",
    fecha: "2024-01-17",
    productos: "Hawaiana x2, Pepperoni x1",
    cantidad: 3,
    total: 54000,
    estado: "venta",
    metodoPago: "Nequi",
    detalle: [
      {
        nombre: "Hawaiana",
        precio: 26000,
        cantidad: 2,
        imagen:
          "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=80&h=80&fit=crop&auto=format",
      },
      {
        nombre: "Pepperoni Premium",
        precio: 28000,
        cantidad: 1,
        imagen:
          "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=80&h=80&fit=crop&auto=format",
      },
    ],
  },
  {
    id: "6",
    historial: [{ estado: "perdida" as VentaStatus, hora: "9:10 PM" }],
    usuario: "Luis Herrera",
    fecha: "2024-01-17",
    productos: "Cuatro Quesos x2",
    cantidad: 2,
    total: 70000,
    estado: "perdida",
    metodoPago: "Bancolombia",
    detalle: [
      {
        nombre: "Cuatro Quesos",
        precio: 35000,
        cantidad: 2,
        imagen:
          "https://images.unsplash.com/photo-1571407970349-bc81e71e5080?w=80&h=80&fit=crop&auto=format",
      },
    ],
  },
  {
    id: "7",
    historial: [{ estado: "perdida" as VentaStatus, hora: "9:45 PM" }],
    usuario: "Sandra Ríos",
    fecha: "2024-01-18",
    productos: "Pepperoni Premium x1",
    cantidad: 1,
    total: 28000,
    estado: "perdida",
    metodoPago: "Nequi",
    detalle: [
      {
        nombre: "Pepperoni Premium",
        precio: 28000,
        cantidad: 1,
        imagen:
          "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=80&h=80&fit=crop&auto=format",
      },
    ],
  },
  {
    id: "8",
    historial: [{ estado: "perdida" as VentaStatus, hora: "8:30 PM" }],
    usuario: "Jorge Vargas",
    fecha: "2024-01-16",
    productos: "Especial La Sirena x1",
    cantidad: 1,
    total: 32000,
    estado: "perdida",
    metodoPago: "Bancolombia",
    detalle: [
      {
        nombre: "Especial La Sirena",
        precio: 32000,
        cantidad: 1,
        imagen:
          "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=80&h=80&fit=crop&auto=format",
      },
    ],
  },
  {
    id: "9",
    usuario: "Sebastián Gómez",
    fecha: "2024-01-14",
    productos: "Pepperoni Premium x1",
    cantidad: 1,
    total: 28000,
    estado: "completado",
    metodoPago: "Nequi",
    horaRecogida: "18:30",
    historial: [
      { estado: "por-verificar", hora: "5:40 PM" },
      { estado: "venta", hora: "5:46 PM" },
      { estado: "completado", hora: "6:35 PM" },
    ],
    detalle: [
      { nombre: "Pepperoni Premium — Mediano", precio: 28000, cantidad: 1 },
    ],
  },
];

// ─────────────────────────── VENTAS SCREEN ───────────────────────────

export function VentasScreen({
  pedidos,
  setPedidos,
  canCreate: _canCreate = true,
  canEdit: _canEdit = true,
  canDelete = true,
}: {
  pedidos: Venta[];
  setPedidos: React.Dispatch<React.SetStateAction<Venta[]>>;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Venta | null>(null);
  const [detailItem, setDetailItem] = useState<Venta | null>(
    null,
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [montoRecibido, setMontoRecibido] = useState("");
  const [confirmEstadoV, setConfirmEstadoV] = useState<{
    id: string;
    current: VentaStatus;
    next: VentaStatus;
  } | null>(null);


  const applyEstadoVenta = (id: string, next: VentaStatus) => {
    const entry: HistorialEntry = { estado: next, hora: nowHora() };
    setPedidos((prev) =>
      prev.map((x) =>
        x.id === id
          ? { ...x, estado: next, historial: [...(x.historial ?? []), entry] }
          : x,
      ),
    );
    toast.success(`Estado cambiado a: ${VENTA_STATUS_LABEL[next]}`);
  };

  const emptyForm = () => ({
    usuario: "",
    fecha: "",
    productos: "",
    cantidad: 1,
    total: 0,
    estado: "venta" as VentaStatus,
  });
  const [form, setForm] = useState(emptyForm());

  const fmtCOP = (n: number) => `$${n.toLocaleString("es-CO")}`;
  const inputCls =
    "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  const filtered = useMemo(
    () =>
      pedidos.filter(
        (p) =>
          p.id.toLowerCase().includes(search.toLowerCase()) ||
          p.usuario
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          p.productos
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [pedidos, search],
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE,
  );

  const handleCreate = () => {
    if (!form.usuario || !form.fecha || !form.productos) {
      toast.error(
        "Usuario, fecha y productos son obligatorios",
      );
      return;
    }
    const maxId = Math.max(0, ...pedidos.map((p) => parseInt(p.id) || 0));
    const newId = String(maxId + 1);
    const initHistorial: HistorialEntry[] = [{ estado: form.estado, hora: nowHora() }];
    setPedidos((p) => [{ id: newId, ...form, historial: initHistorial }, ...p]);
    setShowCreate(false);
    setForm(emptyForm());
    toast.success("Venta creada correctamente");
  };

  const handleEdit = () => {
    if (!editItem) return;
    setPedidos((p) =>
      p.map((x) => (x.id === editItem.id ? editItem : x)),
    );
    setEditItem(null);
    toast.success("Venta actualizada");
  };

  const handleDelete = (id: string) => {
    setPedidos((p) => p.filter((x) => x.id !== id));
    setDeleteId(null);
    toast.success("Venta eliminada");
  };

  // Lista de usuarios registrados para el autocomplete
  const USUARIOS_LISTA = [
    "Gloria Inés Vargas",
    "Sebastián Gómez",
    "María González",
    "Carlos Martínez",
    "Ana Rodríguez",
    "Jorge Vargas",
    "Patricia Soto",
    "Luis Herrera",
    "Sandra Ríos",
    "Tomás Jiménez",
    "Valentina Mora",
    "Andrés Castillo",
  ];

  // Interfaz para productos seleccionados en el picker
  interface ProductoSeleccionado {
    id: number;
    nombre: string;
    precio: number;
    cantidad: number;
    tamaño: string;
  }

  const VentaModal = ({
    title,
    initial,
    onClose,
    onConfirm,
    mode = "edit",
  }: {
    title: string;
    initial: Omit<Venta, "id">;
    onClose: () => void;
    onConfirm: (v: Omit<Venta, "id">) => void;
    mode?: "create" | "edit";
  }) => {
    const [usuario, setUsuario] = useState(initial.usuario);
    const [fecha, setFecha] = useState(initial.fecha);
    const [estado, setEstado] = useState<VentaStatus>(
      initial.estado,
    );
    const [metodoPago, setMetodoPago] = useState<"Nequi" | "Bancolombia" | "">(
      (initial.metodoPago as "Nequi" | "Bancolombia" | "") ?? "",
    );
    const [comprobante, setComprobante] = useState<string>(initial.comprobante ?? "");
    const [horaRecogida, setHoraRecogida] = useState<string>(initial.horaRecogida ?? "");
    const [selProductos, setSelProductos] = useState<
      ProductoSeleccionado[]
    >(() => {
      return PRODUCTS.filter((p) =>
        initial.productos.includes(p.name),
      ).map((p) => ({
        id: p.id,
        nombre: p.name,
        precio: 14000,
        cantidad: 1,
        tamaño: "Mediano",
      }));
    });

    // Autocomplete state
    const [uQuery, setUQuery] = useState(initial.usuario);
    const [showSugg, setShowSugg] = useState(false);
    const suggestions =
      uQuery.length > 0
        ? USUARIOS_LISTA.filter(
            (u) =>
              u.toLowerCase().includes(uQuery.toLowerCase()) &&
              u !== uQuery,
          )
        : [];

    // Product picker state
    const [showPicker, setShowPicker] = useState(false);
    const [prodSearch, setProdSearch] = useState("");
    const filteredProds = PRODUCTS.filter(
      (p) =>
        p.name
          .toLowerCase()
          .includes(prodSearch.toLowerCase()) &&
        p.status === "activo",
    );

    const TAMAÑOS = PRODUCTS[0]?.sizes ?? [
      { label: "Mediano", price: 14000 },
      { label: "Grande", price: 16000 },
    ];

    const toggleProduct = (p: (typeof PRODUCTS)[number]) => {
      setSelProductos((prev) => {
        const exists = prev.find((x) => x.id === p.id);
        if (exists) return prev.filter((x) => x.id !== p.id);
        const defaultSize = p.sizes[0];
        return [
          ...prev,
          {
            id: p.id,
            nombre: p.name,
            precio: defaultSize.price,
            cantidad: 1,
            tamaño: defaultSize.label,
          },
        ];
      });
    };

    const updateQty = (id: number, qty: number) => {
      if (qty < 1) {
        setSelProductos((p) => p.filter((x) => x.id !== id));
        return;
      }
      setSelProductos((p) =>
        p.map((x) =>
          x.id === id ? { ...x, cantidad: qty } : x,
        ),
      );
    };

    const updateTamaño = (id: number, tamaño: string) => {
      const prod = PRODUCTS.find((p) => p.id === id);
      const sizeObj = prod?.sizes.find(
        (s) => s.label === tamaño,
      );
      setSelProductos((p) =>
        p.map((x) =>
          x.id === id
            ? {
                ...x,
                tamaño,
                precio: sizeObj?.price ?? x.precio,
              }
            : x,
        ),
      );
    };

    const totalCalculado = selProductos.reduce(
      (s, p) => s + p.precio * p.cantidad,
      0,
    );
    const cantidadTotal = selProductos.reduce(
      (s, p) => s + p.cantidad,
      0,
    );
    const productosStr = selProductos
      .map((p) => `${p.nombre} (${p.tamaño}) x${p.cantidad}`)
      .join(", ");

    const handleSave = () => {
      if (!usuario || !fecha) {
        toast.error("Usuario y fecha son obligatorios");
        return;
      }
      if (selProductos.length === 0) {
        toast.error("Agrega al menos un producto");
        return;
      }
      if (!metodoPago) {
        toast.error("Selecciona el método de pago");
        return;
      }
      const finalEstado: VentaStatus = mode === "create" ? "por-verificar" : estado;
      const detalle: DetalleProd[] = selProductos.map((p) => ({
        nombre: `${p.nombre} — ${p.tamaño}`,
        precio: p.precio,
        cantidad: p.cantidad,
        imagen: PRODUCTS.find((x) => x.id === p.id)?.image,
      }));
      onConfirm({
        usuario,
        fecha,
        estado: finalEstado,
        productos: productosStr,
        cantidad: cantidadTotal,
        total: totalCalculado,
        detalle,
        metodoPago,
        comprobante,
        horaRecogida,
        historial: [{ estado: finalEstado, hora: nowHora() }],
      });
    };

    const iCls =
      "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border my-4"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3
              className="text-lg font-bold text-foreground"
              style={{ fontFamily: SERIF }}
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Usuario con autocomplete */}
            <div className="relative">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Usuario *
              </label>
              <input
                value={uQuery}
                onChange={(e) => {
                  setUQuery(e.target.value);
                  setUsuario(e.target.value);
                  setShowSugg(true);
                }}
                onFocus={() => setShowSugg(true)}
                onBlur={() =>
                  setTimeout(() => setShowSugg(false), 150)
                }
                placeholder="Escribe el nombre del usuario..."
                className={iCls}
                autoComplete="off"
              />
              {showSugg && suggestions.length > 0 && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                  {suggestions.slice(0, 6).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onMouseDown={() => {
                        setUQuery(u);
                        setUsuario(u);
                        setShowSugg(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer border-b border-border last:border-0 flex items-center gap-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {u
                          .split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      {u}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Fecha *
              </label>
              <CalendarDropdown
                value={fecha}
                onChange={setFecha}
              />
            </div>

            {/* Selector de productos */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-muted-foreground">
                  Productos *
                </label>
                {selProductos.length > 0 && (
                  <span className="text-xs text-primary font-semibold">
                    {selProductos.length} seleccionados
                  </span>
                )}
              </div>

              {/* Productos seleccionados */}
              {selProductos.length > 0 && (
                <div className="mb-2 space-y-2 max-h-48 overflow-y-auto">
                  {selProductos.map((p) => {
                    const prodData = PRODUCTS.find(
                      (x) => x.id === p.id,
                    );
                    return (
                      <div
                        key={p.id}
                        className="bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5"
                      >
                        {/* Fila 1: nombre + eliminar */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {p.nombre}
                          </span>
                          <button
                            onClick={() =>
                              setSelProductos((prev) =>
                                prev.filter(
                                  (x) => x.id !== p.id,
                                ),
                              )
                            }
                            className="text-muted-foreground hover:text-red-500 cursor-pointer shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {/* Fila 2: tamaño + cantidad + precio */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Selector de tamaño */}
                          <div className="flex rounded-lg overflow-hidden border border-border shrink-0">
                            {(prodData?.sizes ?? TAMAÑOS).map(
                              (s) => (
                                <button
                                  key={s.label}
                                  type="button"
                                  onClick={() =>
                                    updateTamaño(p.id, s.label)
                                  }
                                  className={`px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${p.tamaño === s.label ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-border"}`}
                                >
                                  {s.label}
                                </button>
                              ),
                            )}
                          </div>
                          {/* Cantidad */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() =>
                                updateQty(p.id, p.cantidad - 1)
                              }
                              className="w-6 h-6 rounded bg-muted flex items-center justify-center cursor-pointer hover:bg-border text-foreground font-bold text-xs"
                            >
                              −
                            </button>
                            <span className="w-5 text-center text-sm font-bold text-foreground">
                              {p.cantidad}
                            </span>
                            <button
                              onClick={() =>
                                updateQty(p.id, p.cantidad + 1)
                              }
                              className="w-6 h-6 rounded bg-muted flex items-center justify-center cursor-pointer hover:bg-border text-foreground font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
                          {/* Precio */}
                          <span
                            className="ml-auto text-xs font-bold text-primary"
                            style={{ fontFamily: MONO }}
                          >
                            $
                            {(
                              p.precio * p.cantidad
                            ).toLocaleString("es-CO")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Botón abrir picker */}
              <button
                type="button"
                onClick={() => {
                  setProdSearch("");
                  setShowPicker((p) => !p);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-muted-foreground hover:border-primary/40 cursor-pointer transition-colors"
              >
                <span>
                  {selProductos.length === 0
                    ? "Seleccionar productos del catálogo..."
                    : "Agregar más productos..."}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showPicker ? "rotate-180" : ""}`}
                />
              </button>

              {/* Lista de productos */}
              {showPicker && (
                <div className="mt-1 border border-border rounded-xl overflow-hidden shadow-sm">
                  <div className="px-3 py-2 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        value={prodSearch}
                        onChange={(e) =>
                          setProdSearch(e.target.value)
                        }
                        placeholder="Buscar producto..."
                        className="w-full pl-8 pr-3 py-1.5 bg-muted rounded-lg border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {filteredProds.map((p) => {
                      const selItem = selProductos.find((x) => x.id === p.id);
                      const sel = !!selItem;
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 transition-colors ${sel ? "bg-primary/5" : "hover:bg-muted/50"}`}
                        >
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={() => toggleProduct(p)}
                            className="shrink-0 cursor-pointer"
                          >
                            <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${sel ? "bg-primary border-primary" : "border-border"}`}>
                              {sel && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </button>
                          {/* Imagen + nombre */}
                          <img src={p.image} alt={p.name} className="w-8 h-8 rounded-lg object-cover bg-muted shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.category}</p>
                          </div>
                          {/* Botones de tamaño */}
                          <div className="flex rounded-lg overflow-hidden border border-border shrink-0">
                            {p.sizes.map((s) => {
                              const active = sel && selItem?.tamaño === s.label;
                              return (
                                <button
                                  key={s.label}
                                  type="button"
                                  onClick={() => {
                                    if (!sel) {
                                      // Agregar con este tamaño
                                      setSelProductos((prev) => [
                                        ...prev,
                                        { id: p.id, nombre: p.name, precio: s.price, cantidad: 1, tamaño: s.label },
                                      ]);
                                    } else {
                                      // Cambiar tamaño
                                      updateTamaño(p.id, s.label);
                                    }
                                  }}
                                  className={`px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                                    active
                                      ? "bg-primary text-white"
                                      : "bg-muted text-muted-foreground hover:bg-border"
                                  }`}
                                >
                                  {s.label}
                                  <span className="ml-1 opacity-70">${(s.price / 1000).toFixed(0)}k</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Estado */}
            {mode === "create" ? (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-sm font-semibold text-amber-800">Por verificar</span>
                  <span className="ml-auto text-xs text-amber-600">Se asigna automáticamente</span>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as VentaStatus)}
                  className={iCls + " cursor-pointer"}
                >
                  {(Object.keys(VENTA_STATUS_LABEL) as VentaStatus[]).map((s) => (
                    <option key={s} value={s}>{VENTA_STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Método de pago */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Método de pago *
              </label>
              <div className="flex gap-2">
                {(["Nequi", "Bancolombia"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMetodoPago(m)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                      metodoPago === m
                        ? m === "Nequi"
                          ? "bg-purple-600 border-purple-600 text-white"
                          : "bg-yellow-500 border-yellow-500 text-white"
                        : "bg-muted border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <span>{m === "Nequi" ? "💜" : "🏦"}</span>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Hora de recogida */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Hora de recogida
              </label>
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 mb-2 w-fit">
                <span>🟢</span>
                Atendemos de <strong>4:00 PM</strong> a <strong>10:00 PM</strong>
              </div>
              <input
                type="time"
                value={horaRecogida}
                onChange={(e) => setHoraRecogida(e.target.value)}
                className={iCls}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ej: <span className="font-semibold text-foreground">06:30 PM</span> — opcional
              </p>
            </div>

            {/* Comprobante de pago */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Comprobante de transferencia
              </label>
              {comprobante ? (
                <div className="relative rounded-xl overflow-hidden border border-border bg-muted">
                  <img src={comprobante} alt="Comprobante" className="w-full max-h-48 object-contain" />
                  <button
                    type="button"
                    onClick={() => setComprobante("")}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 py-7 rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:border-primary/40 hover:bg-muted/50 transition-colors">
                  <ImageIcon className="w-7 h-7 text-muted-foreground/40" />
                  <span className="text-sm text-muted-foreground font-medium">Subir imagen del comprobante</span>
                  <span className="text-xs text-muted-foreground/60">PNG, JPG, WEBP</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => setComprobante(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              )}
            </div>

            {/* Resumen total */}
            {selProductos.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-xl border border-border">
                <span className="text-sm text-muted-foreground font-medium">
                  {cantidadTotal} producto
                  {cantidadTotal !== 1 ? "s" : ""} · Total
                </span>
                <span
                  className="text-base font-bold text-primary"
                  style={{ fontFamily: MONO }}
                >
                  ${totalCalculado.toLocaleString("es-CO")}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3 px-5 py-4 border-t border-border">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95"
            >
              Guardar
            </button>
          </div>
        </motion.div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            Gestión Ventas
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {pedidos.length} ventas registradas
          </p>
        </div>
        {_canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
          >
            <span className="text-lg leading-none">+</span>
            Nuevo pedido
          </button>
        )}
      </div>

      {/* Banner — pagos por verificar */}
      {(() => {
        const pendientes = pedidos.filter(
          (p) => p.estado === "por-verificar",
        );
        if (pendientes.length === 0) return null;
        return (
          <div className="flex items-center gap-4 px-5 py-4 mb-5 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900">
                {pendientes.length}{" "}
                {pendientes.length === 1
                  ? "pedido pendiente de verificación"
                  : "pedidos pendientes de verificación"}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Revisa el comprobante de pago y aprueba o
                rechaza cada pedido.
              </p>
            </div>
            <span className="shrink-0 text-xs font-bold px-3 py-1 rounded-full bg-amber-200 text-amber-900 animate-pulse">
              ● Requiere acción
            </span>
          </div>
        );
      })()}

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por #, cliente o producto..."
          className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {[
                  "ID",
                  "Cliente",
                  "Fecha",
                  "Método de Pago",
                  "Total",
                  "Estado",
                  "Acciones",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-14 text-center text-muted-foreground"
                  >
                    <p className="text-4xl mb-3">📋</p>
                    <p>No se encontraron ventas</p>
                  </td>
                </tr>
              ) : (
                paged.map((p) => (
                  <tr
                    key={p.id}
                    className={`transition-colors ${p.estado === "por-verificar" ? "bg-amber-50/60 hover:bg-amber-50" : "hover:bg-muted/20"}`}
                  >
                    <td className="px-4 py-3.5 text-sm font-mono font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        {p.id}
                        {p.estado === "por-verificar" && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium text-foreground">
                      {p.usuario}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">
                      {p.fecha}
                    </td>
                    <td className="px-4 py-3.5">
                      {p.metodoPago ? (
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${p.metodoPago === "Nequi" ? "bg-purple-100 text-purple-800" : "bg-yellow-100 text-yellow-800"}`}
                        >
                          {p.metodoPago === "Nequi"
                            ? "💜"
                            : "🏦"}{" "}
                          {p.metodoPago}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>
                      {fmtCOP(p.total)}
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={p.estado}
                        onChange={(e) => {
                          const next = e.target
                            .value as VentaStatus;
                          if (next === p.estado) return;
                          e.target.value = p.estado;
                          setConfirmEstadoV({
                            id: p.id,
                            current: p.estado,
                            next,
                          });
                        }}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${VENTA_STATUS_COLOR[p.estado]}`}
                      >
                        {(
                          Object.keys(
                            VENTA_STATUS_LABEL,
                          ) as VentaStatus[]
                        ).map((s) => (
                          <option key={s} value={s}>
                            {VENTA_STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {p.estado === "por-verificar" && (
                          <button
                            onClick={() => { setDetailItem(p); setMontoRecibido(""); }}
                            title="Verificar pago"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer text-xs font-semibold"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Verificar
                          </button>
                        )}
                        <button
                          onClick={() => { setDetailItem(p); setMontoRecibido(""); }}
                          title="Ver detalle"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => setDeleteId(p.id)}
                            title="Eliminar"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-center mt-4">
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setPage((p) => Math.max(1, p - 1))
                }
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from(
                { length: totalPages },
                (_, i) => i + 1,
              ).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold cursor-pointer ${n === page ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Gestión de Devoluciones — movida a su propia pantalla ── */}
      {false && (() => {
        const devoluciones = pedidos.filter((p) => p.estado === "perdida");
        if (devoluciones.length === 0) return null;
        return (
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                <RefreshCw className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>
                  Gestión de Devoluciones
                </h2>
                <p className="text-xs text-muted-foreground">
                  {devoluciones.filter((d) => !d.devolucionResuelta).length} pendiente(s) de resolución
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {devoluciones.map((dev) => {
                const isActive = devolucionActiva?.id === dev.id;
                const totalDev = dev.total || dev.detalle?.reduce((s, d) => s + d.precio * d.cantidad, 0) || 0;

                return (
                  <div
                    key={dev.id}
                    className={`bg-card border rounded-2xl overflow-hidden transition-colors ${
                      dev.devolucionResuelta
                        ? "border-emerald-200 bg-emerald-50/30"
                        : "border-orange-200"
                    }`}
                  >
                    {/* Fila de resumen */}
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-muted-foreground">#{dev.id}</span>
                          <span className="text-sm font-semibold text-foreground">{dev.usuario}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{dev.fecha}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>
                            {fmtCOP(totalDev)}
                          </span>
                          {dev.metodoPago && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${dev.metodoPago === "Nequi" ? "bg-purple-100 text-purple-800" : "bg-yellow-100 text-yellow-800"}`}>
                              {dev.metodoPago === "Nequi" ? "💜" : "🏦"} {dev.metodoPago}
                            </span>
                          )}
                          {dev.devolucionResuelta && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <CircleCheck className="w-3 h-3" />
                              {dev.devolucionTipo === "dinero" ? "Devuelto en dinero" : "Canjeado por producto"}
                            </span>
                          )}
                        </div>
                        {dev.devolucionNota && (
                          <p className="text-xs text-muted-foreground mt-1 italic">"{dev.devolucionNota}"</p>
                        )}
                      </div>
                      {!dev.devolucionResuelta && (
                        <button
                          onClick={() =>
                            setDevolucionActiva(isActive ? null : {
                              id: dev.id,
                              tipo: null,
                              notaDinero: "",
                              productosReemplazo: [],
                            })
                          }
                          className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-xl border cursor-pointer transition-all ${
                            isActive
                              ? "bg-muted border-border text-muted-foreground"
                              : "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                          }`}
                        >
                          {isActive ? "Cerrar" : "Gestionar"}
                        </button>
                      )}
                    </div>

                    {/* Panel de gestión expandible */}
                    <AnimatePresence>
                      {isActive && !dev.devolucionResuelta && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-orange-100 px-5 py-5 bg-orange-50/40">
                            {/* Selector de tipo */}
                            {!devolucionActiva?.tipo && (
                              <>
                                <p className="text-sm font-semibold text-foreground mb-3">
                                  ¿Cómo se resuelve esta devolución?
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {/* Opción A — Producto por producto */}
                                  <button
                                    onClick={() =>
                                      setDevolucionActiva((prev) =>
                                        prev ? { ...prev, tipo: "producto" } : null,
                                      )
                                    }
                                    className="flex flex-col items-start gap-2 p-4 bg-white border-2 border-blue-200 hover:border-blue-400 rounded-2xl cursor-pointer transition-all group text-left"
                                  >
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                                      <PackageCheck className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-foreground">Producto por producto</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        El cliente devuelve el pedido y recibe un nuevo producto como reemplazo.
                                      </p>
                                    </div>
                                  </button>

                                  {/* Opción B — Producto por dinero */}
                                  <button
                                    onClick={() =>
                                      setDevolucionActiva((prev) =>
                                        prev ? { ...prev, tipo: "dinero" } : null,
                                      )
                                    }
                                    className="flex flex-col items-start gap-2 p-4 bg-white border-2 border-emerald-200 hover:border-emerald-400 rounded-2xl cursor-pointer transition-all group text-left"
                                  >
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors">
                                      <Banknote className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-foreground">Producto por dinero</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        El cliente devuelve el pedido y se le reembolsa el dinero pagado.
                                      </p>
                                    </div>
                                  </button>
                                </div>
                              </>
                            )}

                            {/* ─── Flujo: Producto por producto ─── */}
                            {devolucionActiva?.tipo === "producto" && (
                              <div>
                                <div className="flex items-center gap-2 mb-4">
                                  <button
                                    onClick={() => setDevolucionActiva((prev) => prev ? { ...prev, tipo: null } : null)}
                                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </button>
                                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <PackageCheck className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <p className="text-sm font-bold text-foreground">Canje por producto</p>
                                </div>

                                <p className="text-xs text-muted-foreground mb-3">
                                  Selecciona el(los) producto(s) de reemplazo que el cliente recibirá:
                                </p>

                                {/* Productos del catálogo para elegir */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto mb-4 pr-1">
                                  {PRODUCTS.filter((p) => p.status === "activo").map((prod) => {
                                    const sel = devolucionActiva.productosReemplazo.find((x) => x.id === prod.id);
                                    return (
                                      <button
                                        key={prod.id}
                                        type="button"
                                        onClick={() =>
                                          setDevolucionActiva((prev) => {
                                            if (!prev) return prev;
                                            const exists = prev.productosReemplazo.find((x) => x.id === prod.id);
                                            return {
                                              ...prev,
                                              productosReemplazo: exists
                                                ? prev.productosReemplazo.filter((x) => x.id !== prod.id)
                                                : [
                                                    ...prev.productosReemplazo,
                                                    {
                                                      id: prod.id,
                                                      nombre: prod.name,
                                                      cantidad: 1,
                                                      precio: prod.sizes[0].price,
                                                      tamaño: prod.sizes[0].label,
                                                    },
                                                  ],
                                            };
                                          })
                                        }
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                                          sel
                                            ? "bg-blue-50 border-blue-400"
                                            : "bg-white border-border hover:border-blue-200"
                                        }`}
                                      >
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${sel ? "bg-blue-500 border-blue-500" : "border-border"}`}>
                                          {sel && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <img src={prod.image} alt={prod.name} className="w-10 h-10 rounded-lg object-cover bg-muted shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-semibold text-foreground truncate">{prod.name}</p>
                                          <p className="text-xs text-muted-foreground">{fmtCOP(prod.sizes[0].price)}</p>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>

                                {devolucionActiva.productosReemplazo.length > 0 && (
                                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4">
                                    <p className="text-xs font-semibold text-blue-800 mb-2">Productos seleccionados para canje:</p>
                                    {devolucionActiva.productosReemplazo.map((r) => (
                                      <div key={r.id} className="flex items-center justify-between text-xs text-blue-900 py-0.5">
                                        <span>• {r.nombre} ({r.tamaño})</span>
                                        <span className="font-bold">{fmtCOP(r.precio)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <button
                                  disabled={devolucionActiva.productosReemplazo.length === 0}
                                  onClick={() => {
                                    const nota = `Canje: ${devolucionActiva.productosReemplazo.map((r) => `${r.nombre} (${r.tamaño})`).join(", ")}`;
                                    setPedidos((prev) =>
                                      prev.map((x) =>
                                        x.id === dev.id
                                          ? {
                                              ...x,
                                              devolucionTipo: "producto" as DevolucionTipo,
                                              devolucionResuelta: true,
                                              devolucionNota: nota,
                                              historial: [
                                                ...(x.historial ?? []),
                                                { estado: "perdida" as VentaStatus, hora: nowHora() },
                                              ],
                                            }
                                          : x,
                                      ),
                                    );
                                    setDevolucionActiva(null);
                                    toast.success("Devolución resuelta — canje por producto registrado");
                                  }}
                                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <PackageCheck className="w-4 h-4" />
                                  Confirmar canje
                                </button>
                              </div>
                            )}

                            {/* ─── Flujo: Producto por dinero ─── */}
                            {devolucionActiva?.tipo === "dinero" && (
                              <div>
                                <div className="flex items-center gap-2 mb-4">
                                  <button
                                    onClick={() => setDevolucionActiva((prev) => prev ? { ...prev, tipo: null } : null)}
                                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </button>
                                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                                    <Banknote className="w-4 h-4 text-emerald-600" />
                                  </div>
                                  <p className="text-sm font-bold text-foreground">Reembolso en dinero</p>
                                </div>

                                <div className="bg-white border border-emerald-200 rounded-2xl p-4 mb-4">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Monto a reembolsar</p>
                                  <p className="text-2xl font-bold text-emerald-700" style={{ fontFamily: MONO }}>
                                    {fmtCOP(totalDev)}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Método original: <span className="font-semibold">{dev.metodoPago || "No registrado"}</span>
                                  </p>
                                </div>

                                <div className="mb-4">
                                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                                    Nota del reembolso (opcional)
                                  </label>
                                  <input
                                    type="text"
                                    value={devolucionActiva.notaDinero}
                                    onChange={(e) =>
                                      setDevolucionActiva((prev) =>
                                        prev ? { ...prev, notaDinero: e.target.value } : null,
                                      )
                                    }
                                    placeholder="Ej: Reembolso enviado por Nequi el 10/09..."
                                    className="w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                  />
                                </div>

                                <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
                                  <CircleCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                  <p className="text-xs text-emerald-800">
                                    Al confirmar, la devolución quedará marcada como resuelta. Asegúrate de haber
                                    realizado la transferencia antes de continuar.
                                  </p>
                                </div>

                                <button
                                  onClick={() => {
                                    const nota = devolucionActiva.notaDinero.trim()
                                      ? `Reembolso: ${fmtCOP(totalDev)} — ${devolucionActiva.notaDinero.trim()}`
                                      : `Reembolso de ${fmtCOP(totalDev)} procesado`;
                                    setPedidos((prev) =>
                                      prev.map((x) =>
                                        x.id === dev.id
                                          ? {
                                              ...x,
                                              devolucionTipo: "dinero" as DevolucionTipo,
                                              devolucionResuelta: true,
                                              devolucionNota: nota,
                                              historial: [
                                                ...(x.historial ?? []),
                                                { estado: "perdida" as VentaStatus, hora: nowHora() },
                                              ],
                                            }
                                          : x,
                                      ),
                                    );
                                    setDevolucionActiva(null);
                                    toast.success("Devolución resuelta — reembolso en dinero registrado");
                                  }}
                                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                                >
                                  <Banknote className="w-4 h-4" />
                                  Confirmar reembolso
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Ver detalle — pantalla completa ── */}
      <AnimatePresence>
        {detailItem && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-background overflow-y-auto"
          >
            <div className="max-w-4xl mx-auto px-6 py-6">
              {/* Top bar */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => { setDetailItem(null); setMontoRecibido(""); }}
                  className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Volver a ventas
                </button>
                <span className="text-border">·</span>
                <span className="text-sm text-muted-foreground">Venta {detailItem.id}</span>
                <span className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full ${VENTA_STATUS_COLOR[detailItem.estado]}`}>
                  {VENTA_STATUS_LABEL[detailItem.estado]}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-foreground mb-6" style={{ fontFamily: SERIF }}>
                Detalle de venta — ID {detailItem.id}
              </h1>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* COL 1 — Info + historial */}
                <div className="space-y-5">
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                      Información
                    </p>
                    <div className="space-y-3">
                      {[
                        { label: "ID Venta", value: detailItem.id },
                        { label: "Cliente",  value: detailItem.usuario },
                        { label: "Fecha",    value: detailItem.fecha },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
                          <p className="text-sm font-semibold text-foreground">{value}</p>
                        </div>
                      ))}
                      {detailItem.horaRecogida && (
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-0.5">Hora de recogida</p>
                          <p className="text-sm font-semibold text-foreground">🕐 {detailItem.horaRecogida}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-0.5">Método de pago</p>
                        {detailItem.metodoPago ? (
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${detailItem.metodoPago === "Nequi" ? "bg-purple-100 text-purple-800" : "bg-yellow-100 text-yellow-800"}`}>
                            {detailItem.metodoPago === "Nequi" ? "💜" : "🏦"} {detailItem.metodoPago}
                          </span>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No registrado</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Historial */}
                  {detailItem.historial && detailItem.historial.length > 0 && (
                    <div className="bg-card border border-border rounded-2xl p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                        Historial de estados
                      </p>
                      <div className="space-y-3">
                        {detailItem.historial.map((h, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="flex flex-col items-center shrink-0">
                              <div className={`w-2.5 h-2.5 rounded-full ${i === detailItem.historial!.length - 1 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                              {i < detailItem.historial!.length - 1 && (
                                <div className="w-px flex-1 min-h-[20px] bg-border mt-1" />
                              )}
                            </div>
                            <div className="flex-1 flex items-center gap-2 pb-2">
                              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${VENTA_STATUS_COLOR[h.estado]}`}>
                                {VENTA_STATUS_LABEL[h.estado]}
                              </span>
                              <span className="text-xs text-muted-foreground ml-auto">{h.hora}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* COL 2 — Productos */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                    Productos del pedido
                  </p>
                  {detailItem.detalle && detailItem.detalle.length > 0 ? (
                    <div className="space-y-2">
                      {detailItem.detalle.map((d, i) => (
                        <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                          {d.imagen && (
                            <img src={d.imagen} alt={d.nombre} className="w-12 h-12 rounded-xl object-cover bg-muted shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{d.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {fmtCOP(d.precio)} × {d.cantidad}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-primary shrink-0" style={{ fontFamily: MONO }}>
                            {fmtCOP(d.precio * d.cantidad)}
                          </p>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-3 border-t border-border mt-1">
                        <span className="text-sm font-bold text-foreground">Total</span>
                        <span className="text-lg font-bold text-primary" style={{ fontFamily: MONO }}>
                          {fmtCOP(detailItem.detalle.reduce((s, d) => s + d.precio * d.cantidad, 0))}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">{detailItem.productos}</p>
                  )}
                </div>

                {/* COL 3 — Comprobante + verificación */}
                <div className="space-y-5">
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      Comprobante de transferencia
                    </p>
                    {detailItem.comprobante ? (
                      <div className="rounded-xl overflow-hidden border border-border bg-muted">
                        <img src={detailItem.comprobante} alt="Comprobante" className="w-full object-contain max-h-60" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-2 border-dashed border-border text-center">
                        <ImageIcon className="w-7 h-7 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">Sin comprobante</p>
                      </div>
                    )}
                  </div>

                  {/* Verificación de pago */}
                  {detailItem.estado === "por-verificar" && (() => {
                    const totalVenta = detailItem.total ||
                      (detailItem.detalle?.reduce((s, d) => s + d.precio * d.cantidad, 0) ?? 0);
                    const recibido = parseInt(montoRecibido.replace(/\D/g, "")) || 0;
                    const diferencia = recibido - totalVenta;
                    const coincide = recibido > 0 && diferencia === 0;
                    const excede   = recibido > 0 && diferencia > 0;
                    const falta    = recibido > 0 && diferencia < 0;
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <p className="text-sm font-semibold text-amber-900">Verificación de pago</p>
                        </div>
                        <div className="space-y-3 mb-4">
                          <div className="bg-white rounded-xl border border-amber-200 px-4 py-3">
                            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-0.5">Total a cobrar</p>
                            <p className="text-xl font-bold text-foreground" style={{ fontFamily: MONO }}>{fmtCOP(totalVenta)}</p>
                          </div>
                          <div className={`rounded-xl border px-4 py-3 ${coincide ? "bg-emerald-50 border-emerald-200" : excede ? "bg-blue-50 border-blue-200" : falta ? "bg-red-50 border-red-200" : "bg-white border-amber-200"}`}>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Monto recibido</p>
                            <input
                              type="number" min="0"
                              placeholder="Ingresa el valor..."
                              value={montoRecibido}
                              onChange={(e) => setMontoRecibido(e.target.value)}
                              className="w-full bg-transparent text-xl font-bold text-foreground focus:outline-none placeholder:text-muted-foreground/50 placeholder:text-sm placeholder:font-normal"
                              style={{ fontFamily: MONO }}
                            />
                          </div>
                          {recibido > 0 && (
                            <p className={`text-xs font-semibold flex items-center gap-1.5 ${coincide ? "text-emerald-700" : excede ? "text-blue-700" : "text-red-600"}`}>
                              {coincide && "✓ El monto coincide exactamente"}
                              {excede   && `↑ Sobran ${fmtCOP(diferencia)} — verifique si hay vuelto`}
                              {falta    && `✗ Faltan ${fmtCOP(-diferencia)} — el pago está incompleto`}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const entry: HistorialEntry = { estado: "perdida", hora: nowHora() };
                              setPedidos((prev) => prev.map((x) => x.id === detailItem.id ? { ...x, estado: "perdida" as VentaStatus, historial: [...(x.historial ?? []), entry] } : x));
                              toast.error("Pago rechazado — marcado como Devolución");
                              setDetailItem(null); setMontoRecibido("");
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 cursor-pointer transition-colors active:scale-95"
                          >
                            <ShieldX className="w-3.5 h-3.5" /> Rechazar
                          </button>
                          <button
                            onClick={() => {
                              const entry: HistorialEntry = { estado: "venta", hora: nowHora() };
                              setPedidos((prev) => prev.map((x) => x.id === detailItem.id ? { ...x, estado: "venta" as VentaStatus, historial: [...(x.historial ?? []), entry] } : x));
                              toast.success("Pago aprobado — listo para entregar");
                              setDetailItem(null); setMontoRecibido("");
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer transition-colors active:scale-95"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Aprobar
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Crear pedido ── */}
      <AnimatePresence>
        {showCreate && (
          <VentaModal
            title="Nuevo pedido"
            mode="create"
            initial={{
              usuario: "", fecha: "", productos: "", cantidad: 0, total: 0,
              estado: "por-verificar", detalle: [], metodoPago: "", comprobante: "", horaRecogida: "",
            }}
            onClose={() => setShowCreate(false)}
            onConfirm={(v) => {
              const maxId = Math.max(0, ...pedidos.map((p) => parseInt(p.id) || 0));
              const newId = String(maxId + 1);
              const initHistorial: HistorialEntry[] = [{ estado: v.estado, hora: nowHora() }];
              setPedidos((prev) => [{ id: newId, ...v, historial: initHistorial }, ...prev]);
              setShowCreate(false);
              toast.success(`Pedido #${newId} creado correctamente`);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Eliminar ── */}
      <AnimatePresence>
        {deleteId && (
          <ConfirmModal
            title="Eliminar venta"
            message={`¿Seguro que deseas eliminar la venta ${deleteId}? Esta acción no se puede deshacer.`}
            onConfirm={() => handleDelete(deleteId)}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Confirmar cambio de estado ── */}
      <AnimatePresence>
        {confirmEstadoV && (
          <ConfirmModal
            title="Cambiar estado"
            message={`¿Estás seguro de cambiar el estado de "${VENTA_STATUS_LABEL[confirmEstadoV.current]}" a "${VENTA_STATUS_LABEL[confirmEstadoV.next]}"?`}
            onConfirm={() => {
              applyEstadoVenta(
                confirmEstadoV.id,
                confirmEstadoV.next,
              );
              setConfirmEstadoV(null);
            }}
            onCancel={() => setConfirmEstadoV(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
