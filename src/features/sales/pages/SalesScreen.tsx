import { ArrowLeft as IconoVolver, Download as IconoBajar, Plus as IconoMas, ShoppingCart as IconoCarro } from "lucide-react";
import { AvisoBanner } from "@/shared/components/panel/NoticeBanner";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";
import { DatosDetalle, Historial } from "@/shared/components/panel/DetailData";
import { OpcionesBotones } from "@/shared/components/buttons/OptionButtons";
import { SeccionFormulario } from "@/shared/components/panel/FormSection";
import { BuscadorGrande } from "@/shared/components/panel/LargeSearch";
import { DialogoConfirmacion } from "@/shared/components/panel/ConfirmDialog";
import { EncabezadoPagina } from "@/shared/components/panel/PageHeader";
import { EstadoPill, type TonoPill } from "@/shared/components/panel/StatusPill";
import { FiltrosChips } from "@/shared/components/panel/FilterChips";
import { PaginadorGrande } from "@/shared/components/panel/LargePaginator";
import { TarjetaFila } from "@/shared/components/panel/RowCard";
import { VacioEstado } from "@/shared/components/panel/EmptyState";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { formatearFechaHora, formatearHora } from "@/shared/utils/time";
import { tiempoRestante, useRefrescarAlVencer } from "@/shared/hooks/useRefreshOnExpire";
import { disponiblePizza } from "@/shared/utils/pizzaStock";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, ChevronDown, ChevronLeft, Check, CheckCircle2, Clock, AlertCircle, ShieldCheck, ShieldX, Printer, FileText, ImageIcon, Undo2, CalendarDays, Ban } from "lucide-react";
import { toast } from "sonner";
import { normalizarTexto } from "@/shared/utils/names";
import { esComprobantePdf } from "@/shared/utils/receipt";
import { BotonDescargarExcel } from "@/shared/components/buttons/DownloadExcelButton";
import { filtrarDocumento, MarcaObligatorio, normalizarNombre, validarDocumento } from "@/shared/components/FormInputs";
import { OPCIONES_TIPO_DOCUMENTO } from "@/shared/utils/documentTypes";
import { VisorImagen } from "@/shared/components/ImageViewer";
import { SearchInput } from "@/shared/components/SearchInput";
import { Paginador } from "@/shared/components/Paginator";
import { ActionIcons } from "@/shared/components/buttons/ActionIcons";
import { ConfirmDeleteModal } from "@/shared/components/ConfirmDeleteModal";
import type { OrdenProduccion } from "@/features/production-orders/utils/production-orders";
import { buscarClientePorDocumento, buscarClientesPorNombre, listarClientes, type ClienteListadoApi, type ClientePorNombreApi } from "@/shared/services/authService";
import type { ApiErrorConEstado } from "@/types/api";
import { hoyISO } from "@/shared/utils/dates";
import { imprimirFactura } from "@/features/sales/services/saleInvoice";
import { exportToExcel } from "@/features/sales/services/exportExcel";
import { CampoTiempoPreparacion, minutosPreparacionValidos } from "@/shared/components/PrepTimeField";
import { adelantarVentaApi, crearVentaPanel, anularVentaApi, marcarDevolucionApi, marcarVentaListaApi, obtenerVentaPanel, obtenerVentasPanel, verificarVentaApi, confirmarPagoVenta, obtenerPagosVenta, type ResumenPagosVenta } from "@/features/sales/services/salesApi";
import { useSubirArchivo } from "@/shared/hooks/useFileUpload";
import { ESTADOS_ANULABLES } from "@/features/sales/services/saleStatuses";
import { useSales } from "@/features/sales/hooks/useSales";
import { type Venta, type VentaStatus, type DetalleProd, type MetodoPago, type ComprobanteVenta, type MotivoRechazo, METODO_PAGO_ADMIN } from "@/features/sales/utils/sales";
import { etiquetaEstadoVenta, VENTA_STATUS_LABEL } from "@/features/sales/utils/sales";
import { ConfirmModal } from "@/features/sales/components/ConfirmModal";
import { CampoComprobante } from "@/features/sales/components/ReceiptField";
import { PagoPill } from "@/features/sales/components/PaymentPill";

const SERIF = "var(--font-titulo)";
const MONO = "var(--font-texto)";

// ─────────────────────────── CATÁLOGO DEL SISTEMA ───────────────────────────

// El pedido nuevo usa el mismo catálogo que el resto de la aplicación, recibido
// por prop desde `App.tsx`. Antes esta pantalla traía su propia copia local con
// seis pizzas inventadas, así que era imposible pedir una lasaña o una bebida
// aunque el menú ya las tuviera.
interface ProductoMenu {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  sizes: { label: string; price: number }[];
  extras: { label: string; price: number }[];
  status: "disponible" | "no disponible";
  rating: number;
  sales: number;
  stockMediana?: number;
  stockGrande?: number;
  stockPartes?: number;
}

const esPizzaVenta = (producto: { category?: string; tamaño?: string }) =>
  producto.tamaño === "Mediana" ||
  producto.tamaño === "Grande" ||
  producto.category?.toLowerCase().includes("pizza") === true;

// ─────────────────────────── VENTAS TYPES & DATA ───────────────────────────


/** Opciones que ofrece el panel al rechazar un pago. El backend valida la
    misma lista (más "Otro: <texto>"): ver `validarMotivoRechazo`. */
export type MotivoRechazoOpcion =
  | "Comprobante falso"
  | "La imagen no corresponde a un comprobante"
  | "Comprobante borroso"
  | "Otro";

export const MOTIVOS_RECHAZO: { value: MotivoRechazoOpcion; label: string }[] = [
  { value: "Comprobante falso", label: "Comprobante falso" },
  { value: "La imagen no corresponde a un comprobante", label: "La imagen no corresponde a un comprobante" },
  { value: "Comprobante borroso", label: "Comprobante borroso" },
  { value: "Otro", label: "Otro" },
];

/** Máximo de caracteres del texto que acompaña al motivo "Otro" (el backend
    valida el mismo tope antes de guardar "Otro: <texto>" en motivo_rechazo). */
export const MOTIVO_OTRO_MAX = 80;

export const etiquetaMotivoRechazo = (motivo?: MotivoRechazo) => motivo || "—";

/** Motivo de anulación: el literal que queda en `tb_venta.motivo_rechazo`
    cuando se anula desde el listado del panel. La misma lista la valida el
    backend (`validarMotivoAnulacion`). */
export type MotivoAnulacion =
  | "Cliente canceló el pedido"
  | "Error al registrar el pedido"
  | "Producto no disponible"
  | "Otro";

export const MOTIVOS_ANULACION: { value: MotivoAnulacion; label: string }[] = [
  { value: "Cliente canceló el pedido", label: "Cliente canceló el pedido" },
  { value: "Error al registrar el pedido", label: "Error al registrar el pedido" },
  { value: "Producto no disponible", label: "Producto no disponible" },
  { value: "Otro", label: "Otro" },
];

/** Porcentaje del total que la pizzería devuelve al anular según el motivo:
    "Cliente canceló el pedido" deja el 20 % (se devuelve el 80 %); el resto
    de los motivos, incluido "Otro", devuelven el 100 %. El backend calcula lo
    mismo para guardar `tb_venta.monto_reembolso`. */
export const porcentajeReembolsoAnulacion = (motivo: MotivoAnulacion | "") =>
  motivo === "Cliente canceló el pedido" ? 0.8 : 1;

/** Devuelve los comprobantes de una venta en orden (pago inicial primero).
    Es compatible con ventas viejas que solo traen `comprobante` (un string):
    en ese caso se trata como un único comprobante de pago. */
export const comprobantesDe = (v: Venta): ComprobanteVenta[] => {
  if (v.comprobantes && v.comprobantes.length > 0) return v.comprobantes;
  if (v.comprobante) return [{ url: v.comprobante, tipo: "pago", fecha: v.fecha, hora: "" }];
  return [];
};

/** Colores de estado de la venta, con variante dark (fondo translúcido
    oscuro y texto claro del mismo tono) para el pill de la tabla y los
    badges de detalle/historial. */
const VENTA_STATUS_COLOR: Record<VentaStatus, string> = {
  "Por entregar": "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  Devolucion: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
  "Por verificar": "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  Completado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  Anulado: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  "En espera": "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300",
};


const nowHora = () =>
  formatearHora(new Date());

/** Fecha local en formato YYYY-MM-DD (el que espera CalendarDropdown). */
const hoyFecha = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

  // Interfaz para productos seleccionados en el picker
  interface ProductoSeleccionado {
    id: number;
    nombre: string;
    precio: number;
    cantidad: number;
    tamaño: string;
  }

  /** Modal exclusivo del panel de administrador: el pedido se toma en el local,
      frente al cliente, así que no se pide estado ni comprobante. La fecha se
      carga sola con el día en que se hace el pedido y la hora de recogida se
      auto-asigna en el backend (25 minutos de preparación).
      Vive a nivel de módulo (no dentro del render de `VentasScreen`) para que
      los re-renders del panel no lo desmonten y pierda lo que se está
      escribiendo. */
  function VentaModal({
    onClose,
    onConfirm,
    productos,
  }: {
    onClose: () => void;
    onConfirm: (v: Omit<Venta, "id">) => Promise<boolean>;
    productos: ProductoMenu[];
  }) {
    const [documento, setDocumento] = useState("");
    const [tipoDocumento, setTipoDocumento] = useState("CC");
    const [usuario, setUsuario] = useState("");
    // La fecha no es un campo: el pedido se toma hoy, así que se calcula al
    // guardar. Sin estado no hay forma de editarla.
    const fecha = hoyFecha();
    const [minutosPreparacion, setMinutosPreparacion] = useState("25");
    const [metodoPago, setMetodoPago] = useState<MetodoPago>("");
    const [selProductos, setSelProductos] = useState<ProductoSeleccionado[]>(
      [],
    );
    /** Estado "guardando": bloquea el botón Comprar mientras la venta se
        registra. El `ref` es la barrera real anti doble clic (el `disabled`
        del botón no alcanza si llegan dos clics en el mismo tick). */
    const [guardando, setGuardando] = useState(false);
    const guardandoRef = useRef(false);
    useEffect(() => {
      const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
      window.addEventListener("keydown", alTeclear);
      return () => window.removeEventListener("keydown", alTeclear);
    }, [onClose]);

    type EstadoBusquedaDocumento = "inactivo" | "pendiente" | "buscando" | "registrado" | "no-encontrado" | "error";
    const [estadoBusqueda, setEstadoBusqueda] = useState<EstadoBusquedaDocumento>("inactivo");
    const [clienteInactivo, setClienteInactivo] = useState(false);
    const busquedaId = useRef(0);
    const [clientes, setClientes] = useState<ClienteListadoApi[]>([]);
    const [estadoCargaClientes, setEstadoCargaClientes] = useState<"cargando" | "listo" | "sin-permiso" | "error">("cargando");
    const [resultadosAlternativos, setResultadosAlternativos] = useState<ClientePorNombreApi[]>([]);
    const [estadoAlternativo, setEstadoAlternativo] = useState<"esperando" | "buscando" | "listo" | "error">("esperando");
    const [terminoAlternativo, setTerminoAlternativo] = useState("");
    const [intentoCarga, setIntentoCarga] = useState(0);
    const [busquedaCliente, setBusquedaCliente] = useState("");
    const [clienteElegido, setClienteElegido] = useState(false);
    const [crearCliente, setCrearCliente] = useState(false);
    const [errorCliente, setErrorCliente] = useState(false);
    const [documentoTocado, setDocumentoTocado] = useState(false);
    const [nombreTocado, setNombreTocado] = useState(false);
    const [listaNombreAbierta, setListaNombreAbierta] = useState(false);
    const [indiceNombreActivo, setIndiceNombreActivo] = useState(-1);
    const campoBusquedaRef = useRef<HTMLInputElement>(null);
    const documentoActual = useRef(documento);
    const tipoActual = useRef(tipoDocumento);
    const usuarioActual = useRef(usuario);
    const digitosDe = (valor: string) => valor.replace(/\D/g, "");

    useEffect(() => {
      let vigente = true;
      setEstadoCargaClientes("cargando");
      void listarClientes().then((resultado) => {
        if (!vigente) return;
        setClientes(resultado);
        setEstadoCargaClientes("listo");
      }).catch((error: ApiErrorConEstado) => {
        if (vigente) setEstadoCargaClientes(error.status === 403 ? "sin-permiso" : "error");
      });
      return () => { vigente = false; };
    }, [intentoCarga]);

    const terminoCliente = busquedaCliente.trim();
    const busquedaNumerica = /^\d+$/.test(terminoCliente);
    const puedeBuscar = busquedaNumerica
      ? terminoCliente.length >= 3
      : (terminoCliente.match(/\p{L}/gu)?.length ?? 0) >= 2;
    const resultadosClientes = useMemo(() => {
      if (!puedeBuscar) return [];
      const termino = normalizarTexto(terminoCliente);
      return clientes.filter((cliente) => busquedaNumerica
        ? String(cliente.id_usuario).includes(terminoCliente)
        : normalizarTexto(cliente.nombre).includes(termino))
        .slice(0, 5)
        .map((cliente) => ({
          documento: cliente.id_usuario,
          tipoDocumento: cliente.tipo_documento ?? "CC",
          nombre: cliente.nombre,
          estado: cliente.cliente_estado && cliente.usuario_estado,
        }));
    }, [clientes, puedeBuscar, busquedaNumerica, terminoCliente]);

    useEffect(() => {
      if (estadoCargaClientes !== "sin-permiso" || clienteElegido || crearCliente) return;
      let vigente = true;
      setTerminoAlternativo(terminoCliente);
      setResultadosAlternativos([]);
      if (!puedeBuscar || (busquedaNumerica ? terminoCliente.length < 6 : terminoCliente.length < 3)) {
        setEstadoAlternativo("esperando");
        return () => { vigente = false; };
      }
      setEstadoAlternativo("buscando");
      const timer = window.setTimeout(() => {
        const consulta = busquedaNumerica
          ? buscarClientePorDocumento(terminoCliente).then((cliente) => [cliente]).catch((error: ApiErrorConEstado) => {
              if (error.status === 404) return [];
              throw error;
            })
          : buscarClientesPorNombre(terminoCliente);
        void consulta.then((resultados) => {
          if (!vigente) return;
          setResultadosAlternativos(resultados.slice(0, 5));
          setEstadoAlternativo("listo");
        }).catch(() => {
          if (vigente) setEstadoAlternativo("error");
        });
      }, 300);
      return () => { vigente = false; window.clearTimeout(timer); };
    }, [estadoCargaClientes, clienteElegido, crearCliente, puedeBuscar, busquedaNumerica, terminoCliente]);

    const resultados = estadoCargaClientes === "sin-permiso"
      ? terminoAlternativo === terminoCliente ? resultadosAlternativos : []
      : resultadosClientes;

    const consultarDocumento = async (
      valor = documentoActual.current,
      tipo = tipoActual.current,
    ): Promise<EstadoBusquedaDocumento | "obsoleto"> => {
      const numero = valor.trim();
      if (digitosDe(numero).length < 6) return "inactivo";
      const id = ++busquedaId.current;
      setEstadoBusqueda("buscando");
      try {
        const resultado = await buscarClientePorDocumento(numero, tipo);
        if (
          id !== busquedaId.current ||
          numero !== documentoActual.current.trim() ||
          tipo !== tipoActual.current
        ) return "obsoleto";
        usuarioActual.current = resultado.nombre;
        setUsuario(resultado.nombre);
        setClienteInactivo(!resultado.estado);
        setEstadoBusqueda("registrado");
        setTipoDocumento(resultado.tipoDocumento);
        tipoActual.current = resultado.tipoDocumento;
        setBusquedaCliente(`${resultado.nombre} · ${resultado.tipoDocumento} ${numero}`);
        setClienteElegido(true);
        setCrearCliente(false);
        setErrorCliente(false);
        return "registrado";
      } catch (error) {
        if (
          id !== busquedaId.current ||
          numero !== documentoActual.current.trim() ||
          tipo !== tipoActual.current
        ) return "obsoleto";
        const status = (error as ApiErrorConEstado).status;
        setClienteInactivo(false);
        if (status === 404) {
          setEstadoBusqueda("no-encontrado");
          return "no-encontrado";
        }
        setEstadoBusqueda("error");
        return "error";
      }
    };

    useEffect(() => {
      const numero = documento.trim();
      if (!crearCliente) return;
      if (digitosDe(numero).length < 6) {
        setEstadoBusqueda("inactivo");
        return;
      }
      setEstadoBusqueda("pendiente");
      const id = busquedaId.current;
      const timer = window.setTimeout(() => {
        if (id === busquedaId.current) void consultarDocumento(numero, tipoDocumento);
      }, 500);
      return () => {
        window.clearTimeout(timer);
        busquedaId.current += 1;
      };
    }, [documento, tipoDocumento, crearCliente]);

    const elegirClientePorNombre = (cliente: ClientePorNombreApi) => {
      busquedaId.current += 1;
      const numero = String(cliente.documento);
      documentoActual.current = numero;
      tipoActual.current = cliente.tipoDocumento;
      setDocumento(numero);
      setTipoDocumento(cliente.tipoDocumento);
      usuarioActual.current = cliente.nombre;
      setUsuario(cliente.nombre);
      setClienteInactivo(!cliente.estado);
      setEstadoBusqueda("registrado");
      setBusquedaCliente(`${cliente.nombre} · ${cliente.tipoDocumento} ${numero}`);
      setClienteElegido(true);
      setCrearCliente(false);
      setErrorCliente(false);
      setListaNombreAbierta(false);
    };

    const manejarTeclasNombre = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        setListaNombreAbierta(false);
        return;
      }
      if (!listaNombreAbierta || resultados.length === 0) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setIndiceNombreActivo(indice => (indice + 1) % resultados.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setIndiceNombreActivo(indice => (indice <= 0 ? resultados.length - 1 : indice - 1));
      } else if (event.key === "Enter" && indiceNombreActivo >= 0) {
        event.preventDefault();
        elegirClientePorNombre(resultados[indiceNombreActivo]);
      }
    };

    const borrarCliente = () => {
      busquedaId.current += 1;
      documentoActual.current = "";
      tipoActual.current = "CC";
      setDocumento("");
      setTipoDocumento("CC");
      usuarioActual.current = "";
      setUsuario("");
      setBusquedaCliente("");
      setClienteElegido(false);
      setCrearCliente(false);
      setErrorCliente(false);
      setDocumentoTocado(false);
      setNombreTocado(false);
      setClienteInactivo(false);
      setEstadoBusqueda("inactivo");
      setListaNombreAbierta(false);
      window.requestAnimationFrame(() => campoBusquedaRef.current?.focus());
    };

    const cambiarDocumento = (valor: string) => {
      busquedaId.current += 1;
      documentoActual.current = valor;
      setDocumento(valor);
      setEstadoBusqueda(digitosDe(valor).length >= 6 ? "pendiente" : "inactivo");
      setClienteInactivo(false);
    };


    // Product picker state
    const [showPicker, setShowPicker] = useState(false);
    const [prodSearch, setProdSearch] = useState("");
    // Categoría activa del selector. Filtrar por categoría es lo que deja ver
    // todos los productos de una vez, sin barra de desplazamiento.
    const [catPicker, setCatPicker] = useState("Todas");

    // Las bebidas del menú llegan sin tamaños: se venden de una sola
    // presentación. Sin esto, el picker leería `sizes[0]` de un arreglo vacío
    // y reventaría al pedir una gaseosa.
    const variantesDe = (p: ProductoMenu) =>
      p.category.toLowerCase().includes("pizza")
        ? ["Mediana", "Grande"].map((label) =>
            p.sizes.find((size) => size.label === label) ?? { label, price: 0 })
        : p.sizes.length > 0 ? p.sizes : [{ label: "Única", price: p.price }];
    const stockPizzaDe = (p: ProductoMenu, tamaño: string): number | undefined => {
      if (tamaño === "Mediana") return p.stockMediana;
      if (tamaño === "Grande") return p.stockGrande;
      return undefined;
    };
    const disponibleParaVenta = (p: ProductoMenu, tamaño: string) => {
      if (p.category.toLowerCase().includes("pizza") && p.stockPartes != null) {
        return disponiblePizza(p.stockPartes, tamaño, selProductos
          .filter((linea) => linea.id === p.id && linea.tamaño !== tamaño)
          .map((linea) => ({ tamano: linea.tamaño, cantidad: linea.cantidad })));
      }
      const stock = stockPizzaDe(p, tamaño);
      if (!p.category.toLowerCase().includes("pizza") || stock == null) return undefined;
      return Math.max(0, Math.floor(stock));
    };

    const disponiblesMenu = useMemo(
      () => productos.filter((p) => p.status === "disponible"),
      [productos],
    );
    const categoriasPicker = useMemo(
      () => ["Todas", ...new Set(disponiblesMenu.map((p) => p.category))],
      [disponiblesMenu],
    );
    const filteredProds = disponiblesMenu.filter(
      (p) =>
        p.name
          .toLowerCase()
          .includes(prodSearch.toLowerCase()) &&
        (catPicker === "Todas" || p.category === catPicker),
    );

    const toggleProduct = (p: ProductoMenu) => {
      const exists = selProductos.find((x) => x.id === p.id);
      if (!exists && p.category.toLowerCase().includes("pizza")) {
        const tamaño = variantesDe(p).find((s) => s.price > 0 && disponibleParaVenta(p, s.label) !== 0);
        if (tamaño) agregarTamanoPizza(p, tamaño.label);
        return;
      }
      setSelProductos((prev) => {
        if (exists) return prev.filter((x) => x.id !== p.id);
        const defaultSize = variantesDe(p)[0];
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

    const agregarTamanoPizza = (producto: ProductoMenu, tamaño: string) => {
      const variante = variantesDe(producto).find((s) => s.label === tamaño);
      if (!variante || variante.price <= 0) return;
      const max = disponibleParaVenta(producto, tamaño);
      setSelProductos((prev) => {
        const linea = prev.find((x) => x.id === producto.id && x.tamaño === tamaño);
        if (max !== undefined && (linea?.cantidad ?? 0) >= max) return prev;
        if (linea) {
          return prev.map((x) => x.id === producto.id && x.tamaño === tamaño
            ? { ...x, cantidad: x.cantidad + 1 }
            : x);
        }
        return [...prev, {
          id: producto.id, nombre: producto.name, precio: variante.price, cantidad: 1, tamaño,
        }];
      });
    };

    const updateQty = (id: number, tamaño: string, qty: number) => {
      if (qty < 1) {
        setSelProductos((p) => p.filter((x) => x.id !== id || x.tamaño !== tamaño));
        return;
      }
      const linea = selProductos.find((x) => x.id === id && x.tamaño === tamaño);
      const producto = productos.find((p) => p.id === id);
      const max = linea && producto && producto.category.toLowerCase().includes("pizza")
        ? disponibleParaVenta(producto, linea.tamaño)
        : undefined;
      const cantidad = max === undefined ? qty : Math.min(qty, max);
      if (max !== undefined && qty > max) toast.warning(`Solo quedan ${max} porciones de ${linea?.tamaño} disponibles`);
      if (cantidad === 0) {
        toast.warning(`No hay stock disponible de ${linea?.tamaño}`);
        return;
      }
      setSelProductos((p) => p.map((x) => x.id === id && x.tamaño === tamaño ? { ...x, cantidad } : x));
    };

    const updateTamaño = (id: number, tamaño: string) => {
      const prod = productos.find((p) => p.id === id);
      const sizeObj = prod
        ? variantesDe(prod).find((s) => s.label === tamaño)
        : undefined;
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
    const cantidadPorciones = selProductos.reduce(
      (s, linea) => s + (esPizzaVenta({ category: productos.find((p) => p.id === linea.id)?.category, tamaño: linea.tamaño }) ? linea.cantidad : 0),
      0,
    );
    const cantidadUnidades = cantidadTotal - cantidadPorciones;
    const productosStr = selProductos
      .map((p) => {
        const producto = productos.find((x) => x.id === p.id);
          return producto && esPizzaVenta({ category: producto.category, tamaño: p.tamaño })
          ? `${p.nombre} · ${p.cantidad} ${p.cantidad === 1 ? "porción" : "porciones"} — ${p.tamaño}`
          : `${p.nombre} (${p.tamaño}) x${p.cantidad}`;
      })
      .join(", ");

    /** Valida el formulario y devuelve los datos del pedido. `false` = no se
        puede guardar (falta un dato o la consulta del cliente falló). */
    const prepararPedido = async (): Promise<Omit<Venta, "id"> | null> => {
      if (!minutosPreparacionValidos(minutosPreparacion)) return null;
      if (!clienteElegido && !crearCliente) {
        setErrorCliente(true);
        return null;
      }
      if (!usuario.trim()) {
        setNombreTocado(true);
        toast.error("El nombre del cliente es obligatorio");
        return null;
      }
      const errDoc = validarDocumento(documento, tipoDocumento);
      if (errDoc) {
        setDocumentoTocado(true);
        toast.error(errDoc);
        return null;
      }
      if (selProductos.length === 0) {
        toast.error("Agrega al menos un producto");
        return null;
      }
      const sinStock = selProductos.find((linea) => {
        const producto = productos.find((p) => p.id === linea.id);
        const disponible = producto && producto.category.toLowerCase().includes("pizza")
          ? disponibleParaVenta(producto, linea.tamaño)
          : undefined;
        return disponible !== undefined && linea.cantidad > disponible;
      });
      if (sinStock) {
        toast.error(`No hay suficientes porciones de ${sinStock.tamaño} para ${sinStock.nombre}`);
        return null;
      }
      if (!metodoPago) {
        toast.error("Selecciona el método de pago");
        return null;
      }
      let estadoCliente: EstadoBusquedaDocumento | "obsoleto" = estadoBusqueda;
      if (digitosDe(documento).length >= 6 && estadoCliente !== "registrado" && estadoCliente !== "no-encontrado") {
        estadoCliente = await consultarDocumento(documento, tipoDocumento);
      }
      if (estadoCliente === "error" || estadoCliente === "obsoleto") {
        toast.error("No se pudo verificar el documento. Intenta de nuevo antes de guardar.");
        return null;
      }
      if (digitosDe(documento).length >= 6 && estadoCliente !== "registrado" && estadoCliente !== "no-encontrado") {
        toast.error("Espera a que termine la búsqueda del cliente.");
        return null;
      }
      // Solo la respuesta 404 confirma que se debe crear la ficha local. Un
      // resultado registrado en PostgreSQL nunca pasa por este callback.
      // Punto C2: el pago se recibe en el momento (nada que verificar), pero
      // la pizza todavía hay que hacerla, así que TODOS los pedidos tomados en
      // el local nacen "Por verificar" y el flujo los va avanzando.
      const finalEstado: VentaStatus = "Por verificar";
      const detalle: DetalleProd[] = selProductos.map((p) => ({
        nombre: p.nombre,
        precio: p.precio,
        cantidad: p.cantidad,
        imagen: productos.find((x) => x.id === p.id)?.image,
        tamaño: p.tamaño === "Única" ? undefined : p.tamaño,
        productoId: String(p.id),
      }));
      return {
        usuario: normalizarNombre(usuarioActual.current),
        documento: documento.trim(),
        tipoDocumento: tipoActual.current,
        fecha,
        estado: finalEstado,
        productos: productosStr,
        cantidad: cantidadTotal,
        total: totalCalculado,
        detalle,
        metodoPago,
        tiempoPreparacionMin: Number(minutosPreparacion),
        historial: [{ estado: finalEstado, hora: nowHora() }],
      };
    };

    const handleSave = async () => {
      // Barrera anti doble clic: el segundo clic no llega a la API.
      if (guardandoRef.current) return;
      guardandoRef.current = true;
      setGuardando(true);
      try {
        const pedido = await prepararPedido();
        if (!pedido) {
          guardandoRef.current = false;
          setGuardando(false);
          return;
        }
        const ok = await onConfirm(pedido);
        if (!ok) {
          // El guardado falló: el botón vuelve a estar disponible.
          guardandoRef.current = false;
          setGuardando(false);
        }
      } catch {
        guardandoRef.current = false;
        setGuardando(false);
      }
    };

    const iCls =
      "w-full px-3 py-2.5 max-md:min-h-11 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

    return (
      <>
        <div className="pn-dialogo-fondo" onClick={onClose} />
        <div className="pn-modal pn-modal--formulario" role="dialog" aria-modal="true" aria-labelledby="titulo-venta-local">
          <div className="pn-modal__cab">
            <h2 id="titulo-venta-local" className="pn-modal__titulo">Registrar venta del local</h2>
          </div>
          <div className="grid gap-5">
            <SeccionFormulario numero={1} titulo="¿Quién compra?">
              <div className="pn-campo space-y-4">
            <div className="min-w-0">
              <label htmlFor="buscar-cliente-venta" className="pn-etiqueta">
                Cliente
              </label>
              <div className="relative">
                <input
                  id="buscar-cliente-venta"
                  ref={campoBusquedaRef}
                  value={busquedaCliente}
                  readOnly={clienteElegido || crearCliente}
                  onChange={(e) => {
                    setBusquedaCliente(e.target.value);
                    setListaNombreAbierta(true);
                    setIndiceNombreActivo(-1);
                    setErrorCliente(false);
                  }}
                  onFocus={() => { if (!clienteElegido && !crearCliente) setListaNombreAbierta(true); }}
                  onBlur={(e) => {
                    if (!e.currentTarget.parentElement?.parentElement?.contains(e.relatedTarget)) setListaNombreAbierta(false);
                  }}
                  onKeyDown={manejarTeclasNombre}
                  placeholder="Busca por nombre o número de documento…"
                  className={`${iCls} ${busquedaCliente || clienteElegido || crearCliente ? "pr-10" : ""} ${errorCliente ? "border-red-400 bg-red-50/30" : ""}`}
                  autoComplete="off"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={listaNombreAbierta && puedeBuscar && !clienteElegido && !crearCliente}
                  aria-controls="resultados-clientes-venta"
                  aria-invalid={errorCliente}
                  aria-describedby={errorCliente ? "error-cliente-venta" : undefined}
                />
                {(busquedaCliente || clienteElegido || crearCliente) && (
                  <button type="button" aria-label="Quitar cliente y buscar otro" onClick={borrarCliente}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {errorCliente && <p id="error-cliente-venta" role="alert" className="text-base mt-1 text-red-500 dark:text-red-400">Selecciona un cliente o créalo.</p>}
              {clienteElegido && (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <p role="status" style={{ color: "var(--verde-texto)", fontWeight: 600, fontSize: "1.125rem", margin: 0 }}>✓ Es {usuario}</p>
                  <BotonAccion variante="normal" onClick={borrarCliente}>Buscar otro cliente</BotonAccion>
                </div>
              )}
              {clienteElegido && clienteInactivo && <p role="status" className="text-base mt-1 font-medium text-amber-600">⚠ Cliente inactivo</p>}
              {estadoCargaClientes === "sin-permiso" && !clienteElegido && !crearCliente && (
                <p className="text-base mt-1 text-amber-600">Sin permiso para listar clientes: busca con al menos 3 caracteres del nombre o el documento completo.</p>
              )}
              {listaNombreAbierta && puedeBuscar && !clienteElegido && !crearCliente && (
                <div className="mt-1 w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                  {estadoCargaClientes === "cargando" || (estadoCargaClientes === "sin-permiso" && (terminoAlternativo !== terminoCliente || estadoAlternativo === "buscando")) ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Cargando clientes…</p>
                  ) : estadoCargaClientes === "error" || (estadoCargaClientes === "sin-permiso" && estadoAlternativo === "error") ? (
                    <div className="px-3 py-2 text-sm text-red-600" role="alert">
                      No se pudieron cargar los clientes. Revisa la conexión y los permisos.
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setIntentoCarga(n => n + 1)} className="max-md:min-h-11 max-md:inline-flex max-md:items-center max-md:justify-center ml-2 font-semibold underline">Reintentar</button>
                    </div>
                  ) : estadoCargaClientes === "sin-permiso" && estadoAlternativo === "esperando" ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Escribe más caracteres para buscar.</p>
                  ) : resultados.length > 0 ? (
                    <div id="resultados-clientes-venta" role="listbox">
                      {resultados.map((cliente, indice) => (
                        <button key={String(cliente.documento)} type="button" role="option"
                          aria-selected={indice === indiceNombreActivo}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => elegirClientePorNombre(cliente)}
                          className={`w-full min-w-0 px-3 py-2 text-left text-sm hover:bg-muted ${indice === indiceNombreActivo ? "bg-muted" : ""}`}>
                          <span className="block break-words text-foreground">{cliente.nombre}</span>
                          <span className="block break-words text-base text-muted-foreground">{cliente.tipoDocumento} {cliente.documento}{!cliente.estado && " · Inactivo"}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-sm">
                      <p className="text-muted-foreground">No se encontró el cliente</p>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => {
                        const numero = busquedaNumerica ? terminoCliente : "";
                        const nombre = busquedaNumerica ? "" : terminoCliente;
                        documentoActual.current = numero;
                        usuarioActual.current = nombre;
                        setDocumento(numero);
                        setUsuario(nombre);
                        setDocumentoTocado(Boolean(numero));
                        setCrearCliente(true);
                        setErrorCliente(false);
                        setListaNombreAbierta(false);
                      }} className="mt-1 font-semibold text-primary hover:underline">Crear este cliente nuevo</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {crearCliente && (
              <>
                <div>
                  <label htmlFor="tipo-documento-venta" className="pn-etiqueta">Tipo de documento </label>
                  <select id="tipo-documento-venta" value={tipoDocumento} onChange={(e) => {
                    busquedaId.current += 1;
                    tipoActual.current = e.target.value;
                    setTipoDocumento(e.target.value);
                  }} className={iCls}>
                    {OPCIONES_TIPO_DOCUMENTO.filter(t => ["CC", "CE", "PP", "Pasaporte"].includes(t.code)).map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="documento-cliente-venta" className="pn-etiqueta">Número de documento </label>
                  <input id="documento-cliente-venta" value={documento}
                    onChange={(e) => { setDocumentoTocado(true); cambiarDocumento(filtrarDocumento(e.target.value, tipoDocumento)); }}
                    onBlur={() => setDocumentoTocado(true)}
                    inputMode="numeric" autoComplete="off"
                    className={`${iCls} ${documentoTocado && validarDocumento(documento, tipoDocumento) ? "border-red-400 bg-red-50/30" : ""}`}
                    aria-invalid={documentoTocado && !!validarDocumento(documento, tipoDocumento)}
                  />
                  {documentoTocado && validarDocumento(documento, tipoDocumento) && <p className="text-base mt-1 text-red-500 dark:text-red-400">{validarDocumento(documento, tipoDocumento)}</p>}
                  {estadoBusqueda === "no-encontrado" && <p className="text-base mt-1 text-muted-foreground">Documento no registrado — se creará un cliente nuevo</p>}
                  {estadoBusqueda === "pendiente" && <p className="text-base mt-1 text-muted-foreground">Esperando documento completo…</p>}
                  {estadoBusqueda === "buscando" && <p className="text-base mt-1 text-muted-foreground">Buscando cliente…</p>}
                  {estadoBusqueda === "error" && <p role="alert" className="text-base mt-1 font-medium text-red-600">No se pudo verificar el documento. Revisa la conexión e inténtalo de nuevo.</p>}
                </div>
                <div>
                  <label htmlFor="nombre-cliente-venta" className="pn-etiqueta">Nombre del cliente </label>
                  <input id="nombre-cliente-venta" value={usuario} autoComplete="off"
                    onChange={(e) => { usuarioActual.current = e.target.value; setUsuario(e.target.value); setNombreTocado(true); }}
                    onBlur={() => { const nombre = normalizarNombre(usuario); usuarioActual.current = nombre; setUsuario(nombre); setNombreTocado(true); }}
                    className={`${iCls} ${nombreTocado && !usuario.trim() ? "border-red-400 bg-red-50/30" : ""}`}
                    aria-invalid={nombreTocado && !usuario.trim()}
                  />
                  {nombreTocado && !usuario.trim() && <p className="text-base mt-1 text-red-500 dark:text-red-400">El nombre del cliente es obligatorio</p>}
                </div>
              </>
            )}

              </div>
            </SeccionFormulario>
            <SeccionFormulario numero={2} titulo="¿Qué lleva?">
              <div className="space-y-4">
            {/* Selector de productos */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-base font-semibold text-muted-foreground">
                   Lo que lleva
                </label>
                {selProductos.length > 0 && (
                  <span className="text-base text-primary font-semibold">
                    {selProductos.length} seleccionados
                  </span>
                )}
              </div>

              {/* Productos seleccionados */}
              {selProductos.length > 0 && (
                <div className="mb-2 space-y-2 max-h-72 overflow-y-auto">
                  {selProductos.map((p) => {
                    const prodData = productos.find(
                      (x) => x.id === p.id,
                    );
                    const esPizza = prodData?.category.toLowerCase().includes("pizza") ?? false;
                    const disponible = prodData && esPizza
                      ? disponibleParaVenta(prodData, p.tamaño)
                      : undefined;
                    const otroTamano = prodData && esPizza
                      ? variantesDe(prodData).find((s) => s.label !== p.tamaño &&
                          !selProductos.some((linea) => linea.id === p.id && linea.tamaño === s.label))
                      : undefined;
                    return (
                      <div
                        key={`${p.id}-${p.tamaño}`}
                        className="bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5"
                      >
                        {/* Fila 1: nombre + eliminar */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {p.nombre}{esPizza ? ` — ${p.tamaño}` : ""}
                          </span>
                          <button
                            onClick={() =>
                              setSelProductos((prev) =>
                                prev.filter(
                                  (x) => x.id !== p.id || x.tamaño !== p.tamaño,
                                ),
                              )
                            }
                            type="button"
                            aria-label={`Quitar ${p.nombre}${esPizza ? ` ${p.tamaño}` : ""}`}
                            className="text-muted-foreground hover:text-red-500 cursor-pointer shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {/* Fila 2: tamaño + cantidad + precio */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Selector de tamaño. Los productos de una sola
                              presentación (bebidas) no muestran este grupo. */}
                          {prodData && !esPizza && prodData.sizes.length > 0 && (
                          <div className="flex rounded-lg overflow-hidden border border-border shrink-0">
                            {prodData.sizes.map(
                              (s) => (
                                <button
                                  key={s.label}
                                  type="button"
                                  onClick={() =>
                                    updateTamaño(p.id, s.label)
                                  }
                                  className={`px-3 py-1 text-base font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${p.tamaño === s.label ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-border"}`}
                                >
                                  {s.label}
                                </button>
                              ),
                            )}
                          </div>
                          )}
                          {/* Cantidad */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() =>
                                updateQty(p.id, p.tamaño, p.cantidad - 1)
                              }
                              className="w-6 h-6 rounded bg-muted flex items-center justify-center cursor-pointer hover:bg-border text-foreground font-bold text-base"
                            >
                              −
                            </button>
                            <span className="w-5 text-center text-sm font-bold text-foreground">
                              {p.cantidad}
                            </span>
                            {esPizza && (
                              <span className="text-base text-muted-foreground">porc.</span>
                            )}
                            <button
                              onClick={() =>
                                updateQty(p.id, p.tamaño, p.cantidad + 1)
                              }
                              disabled={disponible !== undefined && p.cantidad >= disponible}
                              className="w-6 h-6 rounded bg-muted flex items-center justify-center cursor-pointer hover:bg-border text-foreground font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                          {esPizza && (
                            <span className="text-base font-semibold text-muted-foreground">
                              {disponible === undefined
                                ? "Disponibilidad no informada"
                                : `Disponibles para agregar: ${Math.max(0, disponible - p.cantidad)} porciones`}
                            </span>
                          )}
                          {/* Precio unitario + total */}
                          <span
                            className="ml-auto flex items-baseline gap-1.5"
                          >
                            <span
                              className="text-base text-muted-foreground"
                              style={{ fontFamily: MONO }}
                            >
                              ${p.precio.toLocaleString("es-CO")}
                              {prodData?.category.toLowerCase().includes("pizza") ? " / porción" : " c/u"}
                            </span>
                            <span
                              className="text-base font-bold text-primary"
                              style={{ fontFamily: MONO }}
                            >
                              $
                              {(
                                p.precio * p.cantidad
                              ).toLocaleString("es-CO")}
                            </span>
                          </span>
                        </div>
                        {otroTamano && prodData && (
                          <button
                            type="button"
                            onClick={() => agregarTamanoPizza(prodData, otroTamano.label)}
                            disabled={(disponibleParaVenta(prodData, otroTamano.label) ?? 0) <= (selProductos.find((x) => x.id === prodData.id && x.tamaño === otroTamano.label)?.cantidad ?? 0) || otroTamano.price <= 0}
                            className="mt-2 text-base font-semibold text-primary hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            + Agregar {otroTamano.label}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Botón abrir picker. El catálogo se muestra aparte, a todo el
                  ancho del modal, para que quepan los productos sin scroll. */}
              <button
                type="button"
                onClick={() => {
                  setProdSearch("");
                  setShowPicker((p) => !p);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 max-md:min-h-11 bg-muted border border-border rounded-xl text-sm text-muted-foreground hover:border-primary/40 cursor-pointer transition-colors"
              >
                <span>
                  {selProductos.length === 0
                    ? "+ Agregar un producto"
                    : "+ Agregar otro producto"}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showPicker ? "rotate-180" : ""}`}
                />
              </button>

              {/* Catálogo: vive dentro de la columna derecha para que el modal
                  siga teniendo sus dos mitades. La rejilla scrollea por dentro
                  para no empujar nada hacia abajo. */}
              {showPicker && (
                <div className="mt-2 border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-3 py-2.5 border-b border-border bg-muted/30 flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-32">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        value={prodSearch}
                        onChange={(e) => setProdSearch(e.target.value)}
                        placeholder="Buscar producto..."
                        className="w-full pl-8 pr-3 py-1.5 bg-card rounded-lg border border-border text-base text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {categoriasPicker.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCatPicker(c)}
                          className={`px-2.5 py-1 rounded-lg text-base font-semibold border transition-colors cursor-pointer ${
                            catPicker === c
                              ? "bg-primary text-white border-transparent"
                              : "bg-card text-foreground border-border hover:border-primary/40"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
                      {filteredProds.map((p) => {
                        const selItem = selProductos.find((x) => x.id === p.id);
                        const sel = !!selItem;
                        const esPizza = p.category.toLowerCase().includes("pizza");
                        return (
                          <div
                            key={p.id}
                            className={`rounded-xl border p-2 flex flex-col gap-1.5 transition-colors ${
                              sel
                                ? "border-primary/40 bg-primary/5"
                                : "border-border bg-card"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleProduct(p)}
                                disabled={esPizza && !sel && !variantesDe(p).some((s) => s.price > 0 && disponibleParaVenta(p, s.label) !== 0)}
                                aria-label={`${sel ? "Quitar" : "Seleccionar"} ${p.name}`}
                                aria-pressed={sel}
                                className="shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <div
                                  className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                                    sel ? "bg-primary border-primary" : "border-border"
                                  }`}
                                >
                                  {sel && <Check className="w-3 h-3 text-white" />}
                                </div>
                              </button>
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-8 h-8 rounded-lg object-cover bg-muted shrink-0"
                              />
                              <p className="text-base font-semibold text-foreground leading-tight line-clamp-2">
                                {p.name}
                              </p>
                            </div>

                            <div className="flex gap-1.5">
                              {variantesDe(p).map((s) => {
                                if (esPizza) {
                                  const active = selProductos.some((x) => x.id === p.id && x.tamaño === s.label);
                                  const maximo = disponibleParaVenta(p, s.label);
                                  const elegidas = selProductos.find((x) => x.id === p.id && x.tamaño === s.label)?.cantidad ?? 0;
                                  const stock = maximo === undefined ? undefined : Math.max(0, maximo - elegidas);
                                  return (
                                    <button
                                      key={s.label}
                                      type="button"
                                      disabled={stock === 0 || s.price <= 0}
                                      onClick={() => {
                                        if (!active) agregarTamanoPizza(p, s.label);
                                      }}
                                      aria-pressed={active}
                                      className={`flex-1 min-w-0 rounded-lg border px-1.5 py-1 text-left transition-colors cursor-pointer ${
                                        active
                                          ? "border-primary bg-primary text-white"
                                          : "border-border bg-muted/40 hover:border-primary/40"
                                      } ${stock === 0 || s.price <= 0 ? "opacity-40 cursor-not-allowed" : ""}`}
                                    >
                                      <span className="block text-base font-semibold truncate">{s.label}</span>
                                      <span className={`block text-base truncate ${active ? "opacity-80" : "text-muted-foreground"}`} style={{ fontFamily: MONO }}>
                                        {s.price > 0 ? `$${(s.price / 1000).toFixed(0)}k` : "Sin precio"}
                                      </span>
                                      <span className={`block text-base ${active ? "opacity-80" : "text-muted-foreground"}`}>
                                        {stock === undefined ? "porción · stock —" : stock === 0 ? "Agotado" : `Disponibles: ${stock} porc.`}
                                      </span>
                                    </button>
                                  );
                                }
                                const active = sel && selItem?.tamaño === s.label;
                                return (
                                  <button
                                    key={s.label}
                                    type="button"
                                    onClick={() => {
                                      if (!sel) {
                                        setSelProductos((prev) => [
                                          ...prev,
                                          { id: p.id, nombre: p.name, precio: s.price, cantidad: 1, tamaño: s.label },
                                        ]);
                                      } else {
                                        updateTamaño(p.id, s.label);
                                      }
                                    }}
                                    className={`flex-1 min-w-0 rounded-lg border px-1.5 py-1 text-left transition-colors cursor-pointer ${
                                      active
                                        ? "border-primary bg-primary text-white"
                                        : "border-border bg-muted/40 hover:border-primary/40"
                                    }`}
                                  >
                                    <span className="block text-base font-semibold truncate">
                                      {s.label}
                                    </span>
                                    <span
                                      className={`block text-base truncate ${
                                        active ? "opacity-80" : "text-muted-foreground"
                                      }`}
                                      style={{ fontFamily: MONO }}
                                    >
                                      ${(s.price / 1000).toFixed(0)}k
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {filteredProds.length === 0 && (
                      <p className="px-3 py-4 text-base text-muted-foreground italic">
                        Sin productos en esta categoría.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Resumen total */}
            {selProductos.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-xl border border-border">
                <span className="text-sm text-muted-foreground font-medium">
                  {[
                    cantidadPorciones > 0 ? `${cantidadPorciones} ${cantidadPorciones === 1 ? "porción" : "porciones"}` : "",
                    cantidadUnidades > 0 ? `${cantidadUnidades} und` : "",
                  ].filter(Boolean).join(" · ")} · Total a cobrar
                </span>
                <span style={{ font: "700 1.875rem var(--font-titulo)", color: "var(--texto)" }}>
                  ${totalCalculado.toLocaleString("es-CO")}
                </span>
              </div>
            )}
              </div>
            </SeccionFormulario>
            <SeccionFormulario numero={3} titulo="¿Cómo paga?">
              <div className="pn-campo space-y-4">
            {/* Fecha — informative. El pedido se toma hoy y no se puede cambiar. */}
            <div>
              <label className="pn-etiqueta">
                Fecha del pedido
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/50 rounded-xl border border-dashed border-border">
                <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold text-foreground">
                  {new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CO", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="ml-auto text-base text-muted-foreground shrink-0">
                  Automática
                </span>
              </div>
            </div>

            <CampoTiempoPreparacion valor={minutosPreparacion} onChange={setMinutosPreparacion} />

            {/* Método de pago — incluye Efectivo, exclusivo del administrador */}
            <div>
              <label className="pn-etiqueta">
                 Método de pago
              </label>
              <OpcionesBotones
                etiqueta="Método de pago"
                valor={metodoPago}
                onChange={(v) => setMetodoPago(v as MetodoPago)}
                opciones={METODO_PAGO_ADMIN.map((m) => ({ valor: m, etiqueta: m }))}
              />
            </div>
              </div>
            </SeccionFormulario>
            <div className="pn-dialogo__botones" style={{ justifyContent: "flex-start" }}>
              <BotonAccion variante="normal" onClick={onClose}>Cancelar</BotonAccion>
              <BotonAccion
                variante="principal"
                disabled={guardando || !minutosPreparacionValidos(minutosPreparacion)}
                onClick={() => void handleSave()}
              >
                {guardando ? "Registrando…" : "Registrar la venta"}
              </BotonAccion>
            </div>
          </div>
        </div>
      </>
    );
  }
// ─────────────────────────── VENTAS SCREEN ───────────────────────────

export function VentasScreen({
  pedidos,
  setPedidos,
  productos,
  onInventarioCambiado,
  onVentaPanelCambiada,
  onPedidoListo,
  onGestionarDevolucion,
  canCreate: _canCreate = true,
  canEdit = true,
  canExportExcel = true,
}: {
  pedidos: Venta[];
  setPedidos: React.Dispatch<React.SetStateAction<Venta[]>>;
  productos: ProductoMenu[];
  onInventarioCambiado?: () => Promise<unknown>;
  onVentaPanelCambiada?: () => Promise<boolean>;
  onPedidoListo?: (orden: OrdenProduccion) => void;
  /** Lleva a la pantalla de devoluciones con esa venta ya seleccionada. */
  onGestionarDevolucion: (id: string) => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canExportExcel?: boolean;
}) {
  const { search, setSearch, estadoFiltro, setEstadoFiltro, page, setPage, PER_PAGE, filtered, paged } = useSales(pedidos);
  const [showCreate, setShowCreate] = useState(false);
  const [detailItem, setDetailItem] = useState<Venta | null>(
    null,
  );
  // ── Verificación de pago ──
  // Motivo elegido en el modal de rechazo (vacío = ninguno todavía).
  const [motivoSel, setMotivoSel] = useState<MotivoRechazoOpcion | "">("");
  // Texto escrito cuando el motivo es "Otro": obligatorio, máx. 80 caracteres.
  const [motivoOtroTexto, setMotivoOtroTexto] = useState("");
  // Confirmación de verificación: aprobar el pago o rechazar con motivo.
  const [confirmVerif, setConfirmVerif] = useState<"aprobar" | "rechazar" | null>(null);
  // Modal "Pedir dinero faltante" (estado En espera).
  const [modalFaltante, setModalFaltante] = useState(false);
  const [resumenPagos, setResumenPagos] = useState<ResumenPagosVenta | null>(null);
  const [errorPagos, setErrorPagos] = useState(false);
  const [montosPago, setMontosPago] = useState<Record<number, string>>({});
  const [operacionPago, setOperacionPago] = useState(false);
  const operacionPagoRef = useRef(false);
  const versionPagos = useRef(0);
  const detalleId = detailItem?.id;
  const enVerificacion = detailItem?.estado === "Por verificar" || detailItem?.estado === "En espera";
  const falta = resumenPagos?.falta;
  const puedePedirFaltante = canEdit && !operacionPago && !errorPagos && enVerificacion && falta !== undefined && falta > 0;
  const puedeAceptarPago = canEdit && !operacionPago && !errorPagos && enVerificacion && resumenPagos?.falta === 0;
  const resultadoPago = (id: string, resumen: ResumenPagosVenta) => {
    setResumenPagos(resumen);
    setErrorPagos(false);
    setPedidos((ventas) => ventas.map((venta) => venta.id === id
      ? { ...venta, montoPagado: resumen.recibido, montoFaltante: resumen.falta }
      : venta));
  };

  useEffect(() => {
    if (!detalleId) return;
    const controller = new AbortController();
    let consultando = false;
    const actualizar = async () => {
      if (consultando || operacionPagoRef.current || document.hidden) return;
      consultando = true;
      const version = versionPagos.current;
      const vigente = () => !controller.signal.aborted && version === versionPagos.current;
      try {
        const detalle = await obtenerVentaPanel(detalleId, controller.signal);
        if (!vigente()) return;
        setDetailItem(detalle);
        setPedidos((ventas) => ventas.map((venta) => venta.id === detalleId
          ? { ...venta, estado: detalle.estado, estadoCliente: detalle.estadoCliente,
              estadoOrden: detalle.estadoOrden, historial: detalle.historial,
              montoPagado: detalle.montoPagado, montoFaltante: detalle.montoFaltante }
          : venta));
        if (detalle.estado === "Por verificar" || detalle.estado === "En espera") {
          const resumen = await obtenerPagosVenta(detalleId, controller.signal);
          if (vigente()) resultadoPago(detalleId, resumen);
        }
      } catch (error) {
        if (!vigente()) return;
        setErrorPagos(true);
        if (!enVerificacion) toast.error(error instanceof Error ? error.message : "No se pudo cargar el detalle de la venta.");
      } finally {
        consultando = false;
      }
    };
    void actualizar();
    const intervalo = enVerificacion ? window.setInterval(actualizar, 20_000) : undefined;
    window.addEventListener("focus", actualizar);
    document.addEventListener("visibilitychange", actualizar);
    return () => {
      controller.abort();
      window.clearInterval(intervalo);
      window.removeEventListener("focus", actualizar);
      document.removeEventListener("visibilitychange", actualizar);
    };
  }, [detalleId, enVerificacion, setPedidos]);

  const iniciarOperacionPago = () => {
    if (operacionPagoRef.current) return false;
    operacionPagoRef.current = true;
    versionPagos.current += 1;
    setOperacionPago(true);
    return true;
  };

  const terminarOperacionPago = () => {
    operacionPagoRef.current = false;
    setOperacionPago(false);
  };

  const confirmarMonto = async (id: string, idPago: number, monto: number) => {
    if (!iniciarOperacionPago()) return;
    try {
      resultadoPago(id, await confirmarPagoVenta(id, idPago, monto));
      toast.success("Monto confirmado");
    } catch (error) {
      if (error instanceof Error) {
        const { status, cause } = error as ApiErrorConEstado & { cause?: unknown };
        const detalle = status == null && cause instanceof Error ? cause.message : error.message;
        toast.error(status == null ? detalle : `${detalle} (HTTP ${status})`);
      } else {
        toast.error(String(error));
      }
    } finally {
      terminarOperacionPago();
    }
  };
  // ── Anulación desde el listado (primeros 10 minutos) ──
  /** Venta que se va a anular (null = modal cerrado). */
  const [ventaAnular, setVentaAnular] = useState<Venta | null>(null);
  const [ventaLista, setVentaLista] = useState<Venta | null>(null);
  const [marcandoLista, setMarcandoLista] = useState(false);
  const [ventaAdelantar, setVentaAdelantar] = useState<Venta | null>(null);
  const [adelantando, setAdelantando] = useState(false);
  const adelantoEnCurso = useRef(false);
  const [anularMotivoSel, setAnularMotivoSel] = useState<MotivoAnulacion | "">("");
  const [anularOtroTexto, setAnularOtroTexto] = useState("");
  const [anularUrl, setAnularUrl] = useState<string | null>(null);
  const { subir: subirAnulacion, subiendo: subiendoAnulacion } = useSubirArchivo();
  const anularFileRef = useRef<HTMLInputElement | null>(null);
  /** Imagen abierta en el visor ampliado (comprobante u otro). */
  const [visorSrc, setVisorSrc] = useState<string | null>(null);
  /** Venta cuya factura se va a emitir. */
  const [facturaVenta, setFacturaVenta] = useState<Venta | null>(null);

  /** Última hora registrada en el historial: es la hora en que se colocó el
      estado actual y la que se muestra a la derecha de la columna Estado. */
  const horaEstado = (p: Venta) =>
    formatearHora(p.historial?.[p.historial.length - 1]?.hora) || "—";

  // ── Flujo de verificación de pago (Fase 3) ──

  /** Limpia todo el estado transitorio del panel/modal de verificación. */
  const resetVerificacion = () => {
    setMotivoSel("");
    setMotivoOtroTexto("");
    setConfirmVerif(null);
    setModalFaltante(false);
    versionPagos.current += 1;
    setResumenPagos(null);
    setErrorPagos(false);
    setMontosPago({});
  };

  const abrirDetalle = (v: Venta) => {
    if (operacionPagoRef.current) return;
    resetVerificacion();
    setDetailItem(v);
  };
  const cerrarDetalle = () => {
    if (operacionPagoRef.current) return;
    resetVerificacion();
    setDetailItem(null);
  };

  /** Aprobar el pago (punto C2): la venta pasa a "En preparación" y su orden
      de producción se crea sola (la escucha el efecto de App). Sólo cuando la
      orden se completa vuelve a avanzar, a "Por entregar". */
  const ejecutarVerificacion = async (id: string, payload: Parameters<typeof verificarVentaApi>[1]) => {
    if (!iniciarOperacionPago()) return;
    try {
      await verificarVentaApi(id, payload);
      const respuesta = await obtenerVentasPanel();
      setPedidos(respuesta);
      if (payload.accion === "aceptar") await onInventarioCambiado?.();
      toast.success(payload.accion === "aceptar" ? "Pago aprobado — orden de producción creada" : payload.accion === "monto_faltante" ? "Se notificó el saldo pendiente al cliente" : "Venta rechazada");
      resetVerificacion();
      setDetailItem(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la venta.");
    } finally {
      terminarOperacionPago();
    }
  };

  const aprobarPago = (id: string) => {
    if (!puedeAceptarPago) return;
    void ejecutarVerificacion(id, { accion: "aceptar" });
  };

  // ── Anulación desde el listado: ventana de 10 minutos ──
  // El backend calcula, al cargar la lista, cuántos segundos quedaban de la
  // ventana. Aquí se descuenta lo transcurrido desde esa carga para que el
  // botón se deshabilite solo; el límite real lo aplica siempre el servidor.
  const [ahora, setAhora] = useState(() => Date.now());
  useRefrescarAlVencer(
    pedidos.filter((p) => p.ventaLocal && p.estado === "Por entregar").map((p) => p.finVentaLocalMs),
    async () => { setPedidos(await obtenerVentasPanel()); },
  );
  useEffect(() => {
    setDetailItem((actual) => {
      if (!actual) return null;
      const actualizada = pedidos.find((p) => p.id === actual.id);
      return actualizada ? {
        ...actual,
        estado: actualizada.estado,
        estadoCliente: actualizada.estadoCliente,
        estadoOrden: actualizada.estadoOrden,
        finVentaLocalMs: actualizada.finVentaLocalMs,
      } : actual;
    });
  }, [pedidos]);
  const cargadoEnRef = useRef(Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    cargadoEnRef.current = Date.now();
    setAhora(Date.now());
  }, [pedidos]);

  /** Segundos que aún quedan de la ventana de anulación de una venta. */
  const segundosAnulacion = (p: Venta) =>
    Math.max(0, (p.segundosRestantesAnulacion ?? 0) - Math.floor((ahora - cargadoEnRef.current) / 1000));

  /** ¿El botón "Anular" aplica a la fila? Sólo en estados anulables y
      mientras corran los primeros 10 minutos. */
  const puedeAnular = (p: Venta) =>
    ESTADOS_ANULABLES.includes(p.estado) && segundosAnulacion(p) > 0;

  /** Abre el modal de anulación ya limpio. */
  const abrirAnular = (v: Venta) => {
    setAnularMotivoSel("");
    setAnularOtroTexto("");
    setAnularUrl(null);
    setVentaAnular(v);
  };
  const cerrarAnular = () => setVentaAnular(null);

  const confirmarVentaLista = async () => {
    if (!ventaLista || marcandoLista) return;
    setMarcandoLista(true);
    try {
      const resultado = await marcarVentaListaApi(ventaLista.id);
      if (resultado.orden) onPedidoListo?.(resultado.orden);
      setPedidos((prev) => prev.map((p) => p.id === ventaLista.id ? {
        ...p,
        estado: resultado.estado,
        estadoCliente: resultado.estado === "Completado" ? "Completado"
          : resultado.estado === "Por entregar" ? "Por entregar" : p.estadoCliente,
        estadoOrden: resultado.estado_orden ?? undefined,
      } : p));
      setVentaLista(null);
      toast.success(`Pedido listo${resultado.estado === "Completado" ? ` · venta ${ventaLista.id} completada` : resultado.estado === "Por entregar" && !resultado.venta_local ? " · la venta se completará a la hora de recogida" : ""}`);
      try {
        setPedidos(await obtenerVentasPanel());
      } catch {
        toast.warning("El pedido está listo, pero no se pudo actualizar toda la información de ventas.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo marcar el pedido como listo.");
    } finally {
      setMarcandoLista(false);
    }
  };

  const confirmarAdelanto = async () => {
    if (!ventaAdelantar || adelantoEnCurso.current) return;
    adelantoEnCurso.current = true;
    setAdelantando(true);
    try {
      const resultado = await adelantarVentaApi(ventaAdelantar.id);
      setPedidos((prev) => prev.map((p) => p.id === ventaAdelantar.id ? {
        ...p,
        ...resultado,
        estadoCliente: "Completado",
        historial: [...(p.historial ?? []), { estado: resultado.estado, hora: resultado.horaCompletado }],
      } : p));
      setVentaAdelantar(null);
      toast.success(`Venta #${ventaAdelantar.id} completada.`);
    } catch (error) {
      setVentaAdelantar(null);
      toast.error(error instanceof Error ? error.message : "No se pudo completar la venta.");
    } finally {
      adelantoEnCurso.current = false;
      setAdelantando(false);
    }
  };

  /** Motivo que se envía: los fijos tal cual y "Otro" como "Otro: <texto>"
      (mismo formato que espera `validarMotivoAnulacion` en el servidor). */
  const motivoAnulacionFinal = () =>
    anularMotivoSel === "Otro" ? `Otro: ${anularOtroTexto.trim()}` : anularMotivoSel;

  const puedeConfirmarAnulacion =
    anularMotivoSel !== "" &&
    (anularMotivoSel !== "Otro" ||
      (anularOtroTexto.trim() !== "" && anularOtroTexto.trim().length <= MOTIVO_OTRO_MAX));

  /** Anula la venta elegida (motivo obligatorio, comprobante opcional) y
      recarga la lista. Si el backend rechaza la operación (por ejemplo, si se
      pasaron los 10 minutos), sólo avisa y la pantalla no cambia. */
  const anularVentaSeleccionada = async () => {
    const venta = ventaAnular;
    if (!venta || !puedeConfirmarAnulacion) return;
    try {
      await anularVentaApi(venta.id, {
        motivo: motivoAnulacionFinal(),
        comprobante: anularUrl ?? undefined,
      });
      setPedidos(await obtenerVentasPanel());
      cerrarAnular();
      toast.success(`Venta #${venta.id} anulada`);
      try {
        if (onVentaPanelCambiada && !await onVentaPanelCambiada()) {
          toast.warning("La venta se anuló, pero no se pudieron actualizar todos los datos de producción e inventario.");
        }
      } catch {
        toast.warning("La venta se anuló, pero no se pudieron actualizar todos los datos de producción e inventario.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo anular la venta.");
    }
  };

  // ── Devolución desde el listado ──
  /** Venta que se va a marcar como devolución (null = sin modal). */
  const [ventaDevolver, setVentaDevolver] = useState<Venta | null>(null);
  const devolviendoRef = useRef(false);

  /** Marca la venta como devolución en el backend (Completado → Devolucion,
      con fila pendiente en tb_devolucion) y lleva a la pantalla de
      Devoluciones para gestionar el canje o la devolución del dinero. Si el
      backend rechaza la transición, sólo se avisa y la lista no cambia. */
  const confirmarDevolucionVenta = async () => {
    const venta = ventaDevolver;
    if (!venta || devolviendoRef.current) return;
    devolviendoRef.current = true;
    try {
      await marcarDevolucionApi(venta.id);
      setPedidos(await obtenerVentasPanel());
      setVentaDevolver(null);
      onGestionarDevolucion(venta.id);
      toast.success(`Venta #${venta.id} marcada como devolución`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar la devolución.");
    } finally {
      devolviendoRef.current = false;
    }
  };

  /** Motivo de rechazo que se envía al backend: los motivos fijos viajan tal
      cual y "Otro" se guarda con el texto escrito, como "Otro: <texto>"
      (mismo formato que espera `validarMotivoRechazo` en el servidor). */
  const motivoRechazoFinal = () =>
    motivoSel === "Otro" ? `Otro: ${motivoOtroTexto.trim()}` : motivoSel;

  /** ¿Se puede confirmar el rechazo? Exige motivo y, si es "Otro", un texto
      obligatorio de hasta MOTIVO_OTRO_MAX caracteres. */
  const puedeConfirmarRechazo =
    motivoSel !== "" &&
    (motivoSel !== "Otro" || (motivoOtroTexto.trim() !== "" && motivoOtroTexto.trim().length <= MOTIVO_OTRO_MAX));

  /** Rechazar el pago: estado final "Rechazado", con el motivo elegido en el
      modal de confirmación. No pide comprobante ni devuelve dinero. */
  const rechazarPago = (id: string) => {
    if (!puedeConfirmarRechazo) return;
    void ejecutarVerificacion(id, { accion: "rechazar", motivo_rechazo: motivoRechazoFinal() });
  };

  /** Pedir el dinero faltante: la venta pasa a "En espera" con el monto. */
  const pedirFaltante = (id: string) => {
    if (!puedePedirFaltante) return;
    void ejecutarVerificacion(id, { accion: "monto_faltante" });
  };

  /** Cambio de estado: YA NO existe desde la tabla (punto C2). La columna es
      de solo lectura y cada avance sale de `estadosVenta.ts` (verificación,
      orden de producción y la hora de recogida). */

  const fmtPago = (n: number) => `$ ${n.toLocaleString("es-CO")}`;
  const fmtCOP = (n: number) => `$${n.toLocaleString("es-CO")}`;

  const exportExcel = async () => {
    await exportToExcel(
      pedidos.map((p) => ({
        id: p.id,
        cliente: p.usuario,
        documento: p.documento ?? "",
        fecha: formatearFechaHora(p.fecha),
        horaRecogida: formatearHora(p.horaRecogida),
        productos: p.detalle?.length
          ? p.detalle.map((d) =>
              esPizzaVenta({ tamaño: d.tamaño })
                ? `${d.nombre} · ${d.cantidad} ${d.cantidad === 1 ? "porción" : "porciones"} — ${d.tamaño} · ${fmtCOP(d.precio)} / porción`
                : `${d.nombre}${d.tamaño ? ` (${d.tamaño})` : ""} x${d.cantidad} · ${fmtCOP(d.precio)}`,
            ).join(", ")
          : p.productos,
        cantidad: p.cantidad,
        total: fmtCOP(p.total),
        estado: etiquetaEstadoVenta(p),
        horaEstado: horaEstado(p),
        metodoPago: p.metodoPago,
      })),
      [
        { key: "id", label: "ID" },
        { key: "cliente", label: "Cliente" },
        { key: "documento", label: "Documento" },
        { key: "fecha", label: "Fecha del pedido" },
        { key: "horaRecogida", label: "Hora de recogida" },
        { key: "productos", label: "Productos" },
        { key: "cantidad", label: "Cantidad" },
        { key: "total", label: "Total" },
        { key: "estado", label: "Estado" },
        { key: "horaEstado", label: "Hora del estado" },
        { key: "metodoPago", label: "Método de Pago" },
      ],
      "ventas"
    );
    toast.success("Excel descargado");
  };






  // Piezas de una fila de venta. Las usan la tabla (desde 768 px) y las tarjetas
  // (menos de 768 px) para mostrar exactamente los mismos botones y acciones.
  const claseFilaVenta = (p: Venta) =>
    p.estado === "Por verificar"
      ? "bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-500/5 dark:hover:bg-amber-500/10"
      : p.estado === "En espera"
        ? "bg-violet-50/60 hover:bg-violet-50 dark:bg-violet-500/5 dark:hover:bg-violet-500/10"
        : "hover:bg-muted/20";
  const idVenta = (p: Venta) => (
    <div className="flex items-center gap-2">
                        {p.id}
                        {p.estado === "Por verificar" && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        )}
                      </div>
  );
  const horaRecogidaVenta = (p: Venta) => (
    <>{p.horaRecogida ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                          {formatearHora(p.horaRecogida)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          —
                        </span>
                      )}</>
  );
  const estadoVenta = (p: Venta) => (
    <><span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${VENTA_STATUS_COLOR[p.estado]}`}
                      >
                        {etiquetaEstadoVenta(p)}
                      </span>
                      {p.estado === "En espera" && (
                        <p className="mt-1 text-xs font-semibold text-foreground">Falta {fmtPago(p.montoFaltante ?? 0)}</p>
                      )}
                      {p.ventaLocal && p.estado === "Por entregar" && p.finVentaLocalMs != null && (
                        <p className="mt-1 text-xs text-muted-foreground whitespace-nowrap tabular-nums">⏱ {tiempoRestante(p.finVentaLocalMs, ahora)}</p>
                      )}</>
  );
  const accionesVenta = (p: Venta) => (
    <div className="flex flex-wrap items-center gap-1.5">
                        {(p.estado === "Por verificar" || p.estado === "En espera") && (
                          <button
                            onClick={() => abrirDetalle(p)}
                            title="Verificar pago"
                            className="flex items-center gap-1 px-2.5 py-1.5 max-md:min-h-11 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer text-xs font-semibold"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Verificar
                          </button>
                        )}
                        {canEdit && p.estado === "Por entregar" && (
                          p.ventaLocal && p.finVentaLocalMs != null && (p.estadoOrden === "En proceso" || !p.estadoOrden) ? (
                            <button type="button" onClick={() => setVentaLista(p)} disabled={marcandoLista}
                              title="Marcar como listo" aria-label="Marcar como listo"
                              className="p-1.5 max-md:p-3.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                              <Check className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              title="Adelantar"
                              aria-label="Adelantar"
                              onClick={() => {
                                if (p.estadoOrden && p.estadoOrden !== "Completada") {
                                  toast.error("La cocina aún no termina este pedido");
                                  return;
                                }
                                setVentaAdelantar(p);
                              }}
                              className="p-1.5 max-md:p-3.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )
                        )}
                        <ActionIcons onView={() => abrirDetalle(p)} />
                        {/* "Anular": sólo en estados anulables y dentro de los
                            primeros 10 minutos. Fuera de la ventana queda
                            atenuado y explica por qué. */}
                        {canEdit && ESTADOS_ANULABLES.includes(p.estado) && (
                          <button
                            onClick={() => { if (puedeAnular(p)) abrirAnular(p); }}
                            title={puedeAnular(p) ? "Anular venta" : "Solo se puede anular en los primeros 10 minutos"}
                            aria-label={puedeAnular(p) ? "Anular venta" : "Solo se puede anular en los primeros 10 minutos"}
                            className={`p-1.5 max-md:p-3.5 rounded-lg transition-colors ${
                              puedeAnular(p)
                                ? "text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                                : "text-muted-foreground/50 cursor-not-allowed"
                            }`}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        {/* Devolución: marca la venta como devuelta en el
                            backend y abre su gestión (canje o dinero). */}
                        {p.estado === "Completado" && (
                          <button
                            onClick={() => setVentaDevolver(p)}
                            title="Registrar devolución"
                            aria-label="Registrar devolución"
                            className="p-1.5 max-md:p-3.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Undo2 className="w-4 h-4" />
                          </button>
                        )}
                        {/* Acciones de factura. */}
                        {!["Por verificar", "En espera", "Anulado", "Devolucion"].includes(p.estado) && (
                          <button
                            onClick={() => setFacturaVenta(p)}
                            title="Imprimir factura"
                            className="p-1.5 max-md:p-3.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                      </div>
  );

  // ── Lista con tarjetas ──
  const TONO_VENTA: Record<Venta["estado"], TonoPill> = {
    "Por verificar": "ambar",
    "En espera": "rojo",
    "Por entregar": "azul",
    Completado: "verde",
    Devolucion: "morado",
    Anulado: "gris",
  };
  const fraseEstado = (p: Venta): string => {
    switch (p.estado) {
      case "Por verificar":
        return "Llegó un comprobante. Míralo y acepta o rechaza el pago";
      case "En espera":
        return `Le faltan ${fmtCOP(p.montoFaltante ?? 0)}`;
      case "Por entregar":
        return p.ventaLocal && p.finVentaLocalMs != null && (p.estadoOrden === "En proceso" || !p.estadoOrden)
          ? `En la cocina · listo en ${tiempoRestante(p.finVentaLocalMs, ahora)}`
          : "Listo para recoger";
      case "Completado":
        return `Entregado a las ${horaEstado(p)}`;
      case "Devolucion":
        return "El cliente devolvió algo";
      default:
        return p.anuladoPor ? `Anulado por ${p.anuladoPor}` : etiquetaMotivoRechazo(p.motivoRechazo);
    }
  };
  const esperandoGloria = (p: Venta) => p.estado === "Por verificar" || p.estado === "En espera";
  const botonPrincipalVenta = (p: Venta) => {
    if (esperandoGloria(p)) return <BotonAccion variante="principal" onClick={() => abrirDetalle(p)}>Revisar el pago</BotonAccion>;
    if (canEdit && p.estado === "Por entregar") {
      return p.ventaLocal && p.finVentaLocalMs != null && (p.estadoOrden === "En proceso" || !p.estadoOrden) ? (
        <BotonAccion variante="bien" disabled={marcandoLista} onClick={() => setVentaLista(p)}>Marcar como listo</BotonAccion>
      ) : (
        <BotonAccion
          variante="principal"
          onClick={() => {
            if (p.estadoOrden && p.estadoOrden !== "Completada") {
              toast.error("La cocina aún no termina este pedido");
              return;
            }
            setVentaAdelantar(p);
          }}
        >
          {p.estadoOrden === "Completada" ? "Entregar ya" : "Ya lo recogió"}
        </BotonAccion>
      );
    }
    if (p.estado === "Completado") return <BotonAccion variante="principal" onClick={() => setFacturaVenta(p)}>Imprimir factura</BotonAccion>;
    if (p.estado === "Devolucion") return <BotonAccion variante="principal" onClick={() => onGestionarDevolucion(p.id)}>Ir a la devolución</BotonAccion>;
    if (p.estado === "Anulado") return <BotonAccion variante="principal" onClick={() => abrirDetalle(p)}>Ver por qué</BotonAccion>;
    return null;
  };
  const conteoEstado = (e: string) => pedidos.filter((p) => p.estado === e).length;
  const porVerificar = conteoEstado("Por verificar");

  const ventaTexto = (p: Venta) =>
    p.detalle?.length
      ? p.detalle.map((d) => (esPizzaVenta({ tamaño: d.tamaño }) ? `${d.cantidad} ${d.cantidad === 1 ? "porción" : "porciones"} de ${d.nombre}` : `${d.cantidad} ${d.nombre}`)).join(", ")
      : p.productos;

  const significados: { estado: Venta["estado"]; texto: string; frase: string }[] = [
    { estado: "Por verificar", texto: "Por verificar", frase: "Llegó un comprobante. Míralo y acepta o rechaza el pago." },
    { estado: "En espera", texto: "En espera", frase: "Faltó plata. Ya se le pidió al cliente lo que falta." },
    { estado: "Por entregar", texto: "Por entregar", frase: "Pago aceptado. La cocina lo prepara o ya está listo para recoger." },
    { estado: "Completado", texto: "Completado", frase: "El cliente ya lo recibió." },
    { estado: "Devolucion", texto: "Devolución", frase: "El cliente devolvió algo y se resuelve en Devoluciones." },
    { estado: "Anulado", texto: "Anulado / Rechazado", frase: "No se hizo: se anuló o no se aceptó el pago." },
  ];

  return (
    <div className="pn-contenido">
      <DialogoConfirmacion
        abierto={!!ventaLista}
        onCambiarAbierto={(a) => { if (!a && !marcandoLista) setVentaLista(null); }}
        titulo={`¿El pedido #${ventaLista?.id ?? ""} ya está listo?`}
        queVaAPasar={["La cocina lo da por terminado", "Queda listo para entregar al cliente"]}
        textoSeguro="No, todavía no"
        textoAccion={marcandoLista ? "Guardando…" : "Sí, ya está listo"}
        onConfirmar={() => void confirmarVentaLista()}
      />
      <DialogoConfirmacion
        abierto={!!ventaAdelantar}
        onCambiarAbierto={(a) => { if (!a && !adelantando) setVentaAdelantar(null); }}
        titulo={`¿${ventaAdelantar?.usuario ?? "El cliente"} ya recogió el pedido #${ventaAdelantar?.id ?? ""}?`}
        queVaAPasar={["La venta queda cerrada como completada", "Si la cocina ya lo terminó, se cierra sin esperar el tiempo"]}
        textoSeguro="No, volver"
        textoAccion={adelantando ? "Guardando…" : "Sí, ya lo recogió"}
        onConfirmar={() => void confirmarAdelanto()}
      />

      <EncabezadoPagina
        titulo="Ventas"
        descripcion="Los pedidos de la página y las ventas del local. Los más nuevos van primero"
        acciones={
          <>
            {canExportExcel && <BotonAccion icono={IconoBajar} onClick={exportExcel}>Descargar en Excel</BotonAccion>}
            {_canCreate && <BotonAccion variante="principal" icono={IconoMas} onClick={() => setShowCreate(true)}>Registrar venta del local</BotonAccion>}
          </>
        }
      />

      {porVerificar > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <AvisoBanner
            titulo={`Tienes ${porVerificar} ${porVerificar === 1 ? "pedido esperando" : "pedidos esperando"} por ti`}
            boton={<BotonAccion onClick={() => { setEstadoFiltro("Por verificar"); setPage(1); }}>Ver esos pedidos</BotonAccion>}
          >
            Mientras no los revises, la cocina no empieza.
          </AvisoBanner>
        </div>
      )}

      <div className="grid gap-4 mb-6">
        <BuscadorGrande
          etiqueta="Buscar un pedido"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Escribe el número, el cliente o el producto"
        />
        <FiltrosChips
          valor={estadoFiltro}
          onChange={(v) => { setEstadoFiltro(v); setPage(1); }}
          opciones={[
            { valor: "", etiqueta: "Todos" },
            { valor: "Por verificar", etiqueta: "Revisar pago", contador: conteoEstado("Por verificar") },
            { valor: "En espera", etiqueta: "Le falta plata", contador: conteoEstado("En espera") },
            { valor: "Por entregar", etiqueta: "En cocina o listos", contador: conteoEstado("Por entregar") },
            { valor: "Completado", etiqueta: "Entregados" },
            { valor: "Devolucion", etiqueta: "Devoluciones" },
            { valor: "Anulado", etiqueta: "Anulados" },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <VacioEstado icono={IconoCarro} titulo="No encontramos ningún pedido">
          Revisa cómo lo escribiste o cambia el filtro.
        </VacioEstado>
      ) : (
        <div className="pn-lista">
          {paged.map((p) => (
            <TarjetaFila
              key={p.id}
              resaltada={p.estado === "Por verificar" ? "ambar" : p.estado === "En espera" ? "rojo" : undefined}
              pre={
                <span className="inline-flex items-center gap-2">
                  Pedido #{p.id} · {p.ventaLocal ? "Local" : "Página"}
                  {p.estado === "Por verificar" && <span aria-label="Nuevo" title="Nuevo" style={{ width: "0.75rem", height: "0.75rem", borderRadius: "62.4375rem", background: "#F97316" }} className="animate-pulse" />}
                </span>
              }
              nombre={p.usuario}
              detalle={ventaTexto(p)}
              datos={[
                { etiqueta: "Recoge", valor: p.horaRecogida ? formatearHora(p.horaRecogida) : "—" },
                { etiqueta: "Pago", valor: p.metodoPago ? `Pagó con ${p.metodoPago}` : "—" },
                { etiqueta: "Total", valor: <span style={{ font: "700 1.5rem var(--font-titulo)" }}>{fmtCOP(p.total)}</span> },
              ]}
              estado={
                <div className="grid gap-1 justify-items-start" style={{ maxWidth: "16.25rem" }}>
                  <EstadoPill tono={TONO_VENTA[p.estado]}>{etiquetaEstadoVenta(p)}</EstadoPill>
                  <span style={{ fontSize: "1rem", color: "var(--gris-texto)" }}>{fraseEstado(p)}</span>
                </div>
              }
              acciones={
                <>
                  {botonPrincipalVenta(p)}
                  <BotonAccion variante="normal" onClick={() => abrirDetalle(p)}>Ver pedido</BotonAccion>
                </>
              }
            />
          ))}
        </div>
      )}

      <PaginadorGrande pagina={page} total={filtered.length} porPagina={PER_PAGE} onCambiar={setPage} />

      <section className="pn-seccion" style={{ marginTop: "1.75rem" }}>
        <h2>Qué significa cada estado</h2>
        <div className="grid gap-3" style={{ marginTop: "0.875rem" }}>
          {significados.map((s) => (
            <div key={s.estado} className="flex flex-wrap items-center gap-3">
              <EstadoPill tono={TONO_VENTA[s.estado]}>{s.texto}</EstadoPill>
              <span style={{ fontSize: "1.125rem" }}>{s.frase}</span>
            </div>
          ))}
        </div>
      </section>

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
              {/* Volver + estado */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <BotonAccion icono={IconoVolver} onClick={cerrarDetalle}>Volver a ventas</BotonAccion>
                <EstadoPill tono={TONO_VENTA[detailItem.estado]}>{etiquetaEstadoVenta(detailItem)}</EstadoPill>
              </div>
              {detailItem.ventaLocal && detailItem.estado === "Por entregar" && detailItem.finVentaLocalMs != null && (
                <p className="mb-2 tabular-nums" style={{ fontSize: "1.125rem" }}>⏱ {tiempoRestante(detailItem.finVentaLocalMs, ahora)}</p>
              )}

              <h1 className="mb-1" style={{ font: "700 2.125rem/1.15 var(--font-titulo)" }}>
                Pedido #{detailItem.id} · {detailItem.usuario}
              </h1>
              <p className="pn-seccion__ayuda" style={{ marginBottom: "1rem" }}>
                {detailItem.ventaLocal ? "Venta del local" : "Pedido de la página"} · {detailItem.fecha}
              </p>

              {/* Lo que se puede hacer con el pedido (anular y devolución viven aquí) */}
              <div className="pn-dialogo__botones" style={{ justifyContent: "flex-start", marginBottom: "1.25rem" }}>
                {!["Por verificar", "En espera", "Anulado", "Devolucion"].includes(detailItem.estado) && (
                  <BotonAccion variante="normal" onClick={() => setFacturaVenta(detailItem)}>Imprimir factura</BotonAccion>
                )}
                {canEdit && detailItem.estado === "Completado" && (
                  <BotonAccion variante="normal" onClick={() => setVentaDevolver(detailItem)}>El cliente devolvió algo</BotonAccion>
                )}
                {canEdit && ESTADOS_ANULABLES.includes(detailItem.estado) && (
                  <BotonAccion
                    variante="peligro"
                    disabled={!puedeAnular(detailItem)}
                    title={puedeAnular(detailItem) ? undefined : "Solo se puede anular en los primeros 10 minutos"}
                    onClick={() => { if (puedeAnular(detailItem)) abrirAnular(detailItem); }}
                  >
                    {puedeAnular(detailItem) ? `Anular (te quedan ${Math.ceil(segundosAnulacion(detailItem) / 60)} min)` : "Anular"}
                  </BotonAccion>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* COL 1 — Lo que pidió + cómo fue el pedido */}
                <div className="grid gap-5 content-start">
                  <SeccionFormulario titulo="Lo que pidió">
                    {detailItem.detalle && detailItem.detalle.length > 0 ? (
                      <>
                        <div className="pn-permisos">
                          {detailItem.detalle.map((d, i) => (
                            <div key={i} className="pn-permisos__fila" style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,2fr) auto" }}>
                              <strong>{d.nombre}</strong>
                              <span>
                                {esPizzaVenta({ tamaño: d.tamaño })
                                  ? `${d.cantidad} ${d.cantidad === 1 ? "porción" : "porciones"} · ${fmtCOP(d.precio)} cada una · ${d.tamaño}`
                                  : `${d.cantidad} · ${fmtCOP(d.precio)} cada una`}
                              </span>
                              <strong>{fmtCOP(d.precio * d.cantidad)}</strong>
                            </div>
                          ))}
                        </div>
                        <p style={{ font: "700 1.625rem var(--font-titulo)", margin: "0.875rem 0 0", textAlign: "right" }}>
                          Total: {fmtCOP(detailItem.detalle.reduce((s, d) => s + d.precio * d.cantidad, 0))}
                        </p>
                      </>
                    ) : (
                      <p className="pn-seccion__ayuda" style={{ margin: 0 }}>{detailItem.productos}</p>
                    )}
                  </SeccionFormulario>

                  <SeccionFormulario titulo="Datos del pedido">
                    <DatosDetalle datos={[
                      { etiqueta: "Cliente", valor: detailItem.usuario },
                      ...(detailItem.documento ? [{ etiqueta: "Documento", valor: detailItem.documento }] : []),
                      { etiqueta: "Fecha del pedido", valor: detailItem.fecha },
                      ...(detailItem.horaRecogida ? [{ etiqueta: "Recoge", valor: formatearHora(detailItem.horaRecogida) }] : []),
                      { etiqueta: "Pagó con", valor: detailItem.metodoPago ? <PagoPill metodo={detailItem.metodoPago} /> : "No registrado" },
                    ]} />
                  </SeccionFormulario>

                  {detailItem.historial && detailItem.historial.length > 0 && (
                    <SeccionFormulario titulo="Cómo fue el pedido">
                      <Historial
                        pasos={detailItem.historial.map((h, i, lista) => ({
                          titulo: VENTA_STATUS_LABEL[h.estado],
                          hora: formatearHora(h.hora),
                          hecho: i <= lista.length - 1,
                        }))}
                      />
                    </SeccionFormulario>
                  )}
                </div>

                {/* COL 3 — Comprobante + verificación */}
                <div className="space-y-5">
                  {/* Comprobante(s) de transferencia: si hay más de uno (pago
                      inicial + dinero faltante), se muestran rotulados. */}
                  {!enVerificacion && (() => {
                    const comps = comprobantesDe(detailItem);
                    const etiquetas = ["Comprobante 1 — Pago inicial", "Comprobante 2 — Dinero faltante"];
                    return (
                      <div className="bg-card border border-border rounded-2xl p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                          Pagos · comprobante
                        </p>
                        {comps.length > 0 ? (
                          <div className="space-y-3">
                            {comps.map((c, i) => (
                              <div key={i}>
                                {comps.length > 1 && (
                                  <p className="text-[0.6875rem] font-semibold text-foreground mb-1">
                                    {etiquetas[i] ?? `Comprobante ${i + 1}`}
                                    {(c.fecha || c.hora) && (
                                      <span className="text-muted-foreground font-normal">
                                        {" · "}
                                        {formatearFechaHora(c.fecha, c.hora)}
                                      </span>
                                    )}
                                  </p>
                                )}
                                {esComprobantePdf(c.url) ? (
                                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm text-foreground hover:bg-muted">
                                    <FileText className="w-4 h-4" /> Abrir comprobante (PDF)
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setVisorSrc(c.url)}
                                    title="Ampliar comprobante"
                                    className="block w-full rounded-xl overflow-hidden border border-border bg-muted cursor-zoom-in hover:border-primary/40 transition-colors"
                                  >
                                    <img src={c.url} alt="Comprobante" className="w-full object-contain max-h-60" />
                                    <span className="block text-[0.6875rem] text-muted-foreground py-1">Clic para ampliar</span>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-2 border-dashed border-border text-center">
                            <ImageIcon className="w-7 h-7 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">Sin comprobante</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Anulado: quién la anuló, el motivo, el valor a devolver y
                      el comprobante si lo hay. Un rechazo de verificación no
                      tiene `montoReembolso`, así que conserva su rótulo. */}
                  {detailItem.estado === "Anulado" && (() => {
                    const esAnulacion = detailItem.montoReembolso !== undefined;
                    const comprobante = detailItem.comprobanteAnulacion ?? detailItem.comprobanteDevolucion;
                    const titulo = detailItem.anuladoPor === "Cliente"
                      ? "Cancelado por el cliente"
                      : esAnulacion
                        ? "Venta anulada"
                        : "Pago rechazado";
                    return (
                      <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <ShieldX className="w-4 h-4 text-red-600 shrink-0" />
                          <p className="text-sm font-semibold text-red-900">{titulo}</p>
                        </div>
                        {detailItem.anuladoPor && (
                          <p className="text-sm text-red-800 mb-1">
                            Anulada por:{" "}
                            <span className="font-semibold">{detailItem.anuladoPor}</span>
                          </p>
                        )}
                        <p className="text-sm text-red-800 mb-1">
                          Motivo:{" "}
                          <span className="font-semibold">
                            {etiquetaMotivoRechazo(detailItem.motivoRechazo)}
                          </span>
                        </p>
                        {esAnulacion && (
                          <p className="text-sm text-red-800 mb-1">
                            Valor a devolver:{" "}
                            <span className="font-bold" style={{ fontFamily: MONO }}>
                              {fmtCOP(detailItem.montoReembolso ?? 0)}
                            </span>
                          </p>
                        )}
                        {comprobante && (
                          <div className="mt-3">
                            <p className="text-[0.6875rem] font-semibold text-red-800 mb-1">Comprobante de devolución</p>
                            {esComprobantePdf(comprobante) ? (
                              <a
                                href={comprobante}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-semibold text-red-700 hover:border-red-400 transition-colors"
                              >
                                <FileText className="w-4 h-4 shrink-0" /> Abrir comprobante (PDF)
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setVisorSrc(comprobante)}
                                title="Ampliar comprobante de devolución"
                                className="block w-full rounded-xl overflow-hidden border border-red-200 bg-white cursor-zoom-in hover:border-red-400 transition-colors"
                              >
                                <img src={comprobante} alt="Comprobante de devolución" className="w-full object-contain max-h-56" />
                                <span className="block text-[0.6875rem] text-red-700 py-1">Clic para ampliar</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {enVerificacion && (
                    <div className="grid gap-4">
                      <section className="pn-seccion">
                        <h2>Paso 1 · ¿Cuánta plata llegó?</h2>
                        <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1" style={{ marginTop: "0.875rem" }} aria-live="polite">
                          <div className="pn-dialogo__caja" style={{ marginBottom: 0 }}>
                            <strong style={{ fontWeight: 500, fontSize: "1rem" }}>Total del pedido</strong>
                            <span style={{ font: "700 1.375rem var(--font-titulo)" }}>{fmtPago(resumenPagos?.total ?? detailItem.total)}</span>
                          </div>
                          <div className="pn-dialogo__caja" style={{ marginBottom: 0 }}>
                            <strong style={{ fontWeight: 500, fontSize: "1rem" }}>Llegó</strong>
                            <span style={{ font: "700 1.375rem var(--font-titulo)" }}>{resumenPagos ? fmtPago(resumenPagos.recibido) : "—"}</span>
                          </div>
                          <div className="pn-dialogo__caja" style={{ marginBottom: 0, background: "var(--rojo-suave)", borderColor: "var(--rojo)" }}>
                            <strong style={{ fontWeight: 500, fontSize: "1rem", color: "var(--rojo-texto)" }}>Falta</strong>
                            <span style={{ font: "700 1.375rem var(--font-titulo)", color: "var(--rojo-texto)" }}>{resumenPagos ? fmtPago(resumenPagos.falta) : "—"}</span>
                          </div>
                        </div>
                        {resumenPagos && resumenPagos.en_revision > 0 && (
                          <p className="pn-campo__ayuda">Hay {fmtPago(resumenPagos.en_revision)} en revisión: confirma abajo cuánto llegó en cada comprobante.</p>
                        )}
                        {errorPagos ? (
                          <p role="alert" className="pn-campo__error"><span>No se pudo actualizar el resumen de pagos. Intenta de nuevo en un momento.</span></p>
                        ) : !resumenPagos && <p role="status" className="pn-nota" style={{ margin: "0.75rem 0 0" }}>Cargando los pagos…</p>}
                        {resumenPagos?.pagos.length === 0 && <p className="pn-nota" style={{ margin: "0.75rem 0 0" }}>Todavía no hay comprobantes.</p>}
                        <div className="grid gap-3" style={{ marginTop: "0.875rem" }}>
                          {resumenPagos?.pagos.map((pago) => {
                            const valor = montosPago[pago.id_pago] ?? String(pago.monto_declarado ?? "");
                            const monto = Number(valor);
                            const puedeConfirmar = Number.isSafeInteger(monto) && monto > 0;
                            return (
                              <article key={pago.id_pago} className="pn-fila" style={{ display: "grid", gap: "0.625rem" }}>
                                <p style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>{formatearFechaHora(pago.fecha)}</p>
                                {pago.comprobante && (esComprobantePdf(pago.comprobante) ? (
                                  <div><BotonAccion href={pago.comprobante} target="_blank" rel="noreferrer">Abrir el comprobante (PDF)</BotonAccion></div>
                                ) : (
                                  <div className="grid gap-2 justify-items-start">
                                    <img src={pago.comprobante} alt="Comprobante" style={{ maxHeight: "12.5rem", borderRadius: "0.75rem", border: "2px solid var(--borde-suave)" }} />
                                    <BotonAccion onClick={() => setVisorSrc(pago.comprobante)}>Ver el comprobante más grande</BotonAccion>
                                  </div>
                                ))}
                                <p style={{ fontSize: "1.0625rem", margin: 0 }}>
                                  Dijo que pagó: <strong>{pago.monto_declarado == null ? "no dijo cuánto" : fmtPago(pago.monto_declarado)}</strong>
                                  {" · "}Tú confirmaste: <strong>{pago.monto_confirmado == null ? "todavía nada" : fmtPago(pago.monto_confirmado)}</strong>
                                </p>
                                {canEdit && pago.monto_confirmado == null && pago.estado !== "Rechazado" && (
                                  <div className="pn-campo">
                                    <label className="pn-etiqueta">¿Cuánto llegó en este comprobante?</label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={valor}
                                      disabled={operacionPago}
                                      onChange={(e) => {
                                        const entrada = e.target.value.replace(/\D/g, "");
                                        setMontosPago((actuales) => ({ ...actuales, [pago.id_pago]: entrada }));
                                      }}
                                    />
                                    <div style={{ marginTop: "0.625rem" }}>
                                      <BotonAccion
                                        variante="principal"
                                        disabled={!puedeConfirmar || operacionPago || errorPagos}
                                        onClick={() => void confirmarMonto(detailItem.id, pago.id_pago, monto)}
                                      >
                                        Confirmar monto
                                      </BotonAccion>
                                    </div>
                                  </div>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      </section>

                      <section className="pn-seccion">
                        <h2>Paso 2 · ¿Qué hacemos?</h2>
                        <div className="grid gap-5" style={{ marginTop: "0.875rem" }}>
                          <div>
                            <BotonAccion
                              variante="principal"
                              className="pn-boton--grande"
                              disabled={!puedePedirFaltante}
                              onClick={() => setModalFaltante(true)}
                            >
                              {falta !== undefined && falta > 0 ? `Pedirle los ${fmtPago(falta)} que faltan` : "Pedirle lo que falta"}
                            </BotonAccion>
                            <p className="pn-campo__ayuda">Le llega un correo. El pedido queda esperando.</p>
                          </div>
                          <div>
                            <BotonAccion
                              variante="bien"
                              className="pn-boton--grande"
                              disabled={!puedeAceptarPago}
                              onClick={() => setConfirmVerif("aprobar")}
                            >
                              Aceptar el pago y mandarlo a la cocina
                            </BotonAccion>
                            <p className="pn-campo__ayuda">
                              {puedeAceptarPago
                                ? "La cocina empieza a preparar el pedido."
                                : "Se activa cuando la plata que llegó cubre todo el pedido."}
                            </p>
                          </div>
                          <div>
                            <BotonAccion
                              variante="peligro"
                              className="pn-boton--grande"
                              disabled={!canEdit || operacionPago}
                              onClick={() => setConfirmVerif("rechazar")}
                            >
                              Rechazar el pago
                            </BotonAccion>
                            <p className="pn-campo__ayuda">Si el comprobante es falso o no es de este pedido.</p>
                          </div>
                        </div>
                      </section>
                    </div>
                  )}
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
            productos={productos}
            onClose={() => setShowCreate(false)}
            onConfirm={async (v) => {
              try {
                const { id } = await crearVentaPanel({
                  cliente: {
                    tipo_documento: (v as Venta).tipoDocumento ?? "CC",
                    numero_documento: v.documento ?? "",
                    nombre: v.usuario,
                  },
                  tiempo_preparacion_min: v.tiempoPreparacionMin,
                  productos: (v.detalle ?? []).map((detalle) => ({
                    id_producto: Number(detalle.productoId),
                    cantidad: detalle.cantidad,
                    tamano: detalle.tamaño ?? null,
                  })),
                  pago: { tipo: v.metodoPago ?? "" },
                });
                const ventasActualizadas = await obtenerVentasPanel();
                setPedidos(ventasActualizadas);
                setShowCreate(false);
                toast.success(`Venta #${id} registrada — Por entregar`);
                try {
                  if (onVentaPanelCambiada && !await onVentaPanelCambiada()) {
                    toast.warning("La venta se registró, pero no se pudieron actualizar todos los datos de producción e inventario.");
                  }
                } catch {
                  toast.warning("La venta se registró, pero no se pudieron actualizar todos los datos de producción e inventario.");
                }
                return true;
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "No se pudo registrar el pedido.");
                return false;
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Verificación: confirmar Aprobar / Rechazar (el motivo se elige
             aquí mismo, en un modal que exige al menos una opción) ── */}
      <AnimatePresence>
        {confirmVerif && enVerificacion && detailItem && (() => {
          const esRechazo = confirmVerif === "rechazar";
          const motivoFinal = esRechazo && puedeConfirmarRechazo ? motivoRechazoFinal() : "";
          return (
            <ConfirmModal
              title={esRechazo ? `¿Rechazar el pago del pedido #${detailItem.id}?` : `¿Aceptar el pago del pedido #${detailItem.id}?`}
              tone={esRechazo ? "peligro" : "aviso"}
              message={
                esRechazo
                  ? `El pedido queda rechazado${motivoFinal ? ` (${motivoFinal})` : ""} y la cocina no lo prepara.`
                  : "Se crea la orden para la cocina y el pedido queda Por entregar."
              }
              confirmLabel={esRechazo ? "Sí, rechazar el pago" : "Sí, aceptar el pago"}
              confirmDisabled={esRechazo ? !puedeConfirmarRechazo || operacionPago || !canEdit : !puedeAceptarPago}
              onConfirm={() => {
                if (esRechazo) rechazarPago(detailItem.id);
                else aprobarPago(detailItem.id);
                setConfirmVerif(null);
              }}
              onCancel={() => setConfirmVerif(null)}
            >
              {esRechazo && (
                <div className="mb-5 space-y-3">
                  <p className="text-base font-bold uppercase tracking-wide text-muted-foreground">
                    ¿Por qué se rechaza?
                  </p>
                  <div className="space-y-1.5">
                    {MOTIVOS_RECHAZO.map((m) => (
                      <label
                        key={m.value}
                        className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                          motivoSel === m.value
                            ? "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <input
                          type="radio"
                          name="motivo-rechazo-verificacion"
                          value={m.value}
                          checked={motivoSel === m.value}
                          onChange={() => setMotivoSel(m.value)}
                          className="mt-0.5 accent-red-600 cursor-pointer"
                        />
                        <span className="text-lg text-foreground leading-snug">{m.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* "Otro": exige el texto que quedará como "Otro: <texto>". */}
                  {motivoSel === "Otro" && (
                    <div>
                      <label
                        htmlFor="motivo-rechazo-otro"
                        className="block text-base font-semibold text-muted-foreground mb-1"
                      >
                        Describe el motivo
                      </label>
                      <textarea
                        id="motivo-rechazo-otro"
                        value={motivoOtroTexto}
                        onChange={(e) => setMotivoOtroTexto(e.target.value.slice(0, MOTIVO_OTRO_MAX))}
                        maxLength={MOTIVO_OTRO_MAX}
                        rows={2}
                        placeholder="Ej.: el cliente envió una foto de otro pedido"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-red-400"
                      />
                      <div className="flex justify-between gap-3 mt-1">
                        <p className="text-base text-red-600">
                          {motivoOtroTexto.trim() === "" ? "El texto es obligatorio." : ""}
                        </p>
                        <p className="text-base text-muted-foreground shrink-0" style={{ fontFamily: MONO }}>
                          {motivoOtroTexto.length}/{MOTIVO_OTRO_MAX}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ConfirmModal>
          );
        })()}
      </AnimatePresence>

      {/* ── Pedir dinero faltante (→ En espera) ── */}
      <DialogoConfirmacion
        abierto={modalFaltante && enVerificacion && !!detailItem && !!resumenPagos}
        onCambiarAbierto={(a) => { if (!a) setModalFaltante(false); }}
        titulo={`¿Pedirle ${fmtPago(resumenPagos?.falta ?? 0)} a ${detailItem?.usuario ?? "el cliente"}?`}
        queVaAPasar={["Le llega un correo", "Queda En espera", "Cuando mande el comprobante de lo que falta, lo revisas aquí"]}
        textoAccion="Sí, pedirle lo que falta"
        onConfirmar={() => { if (detailItem && puedePedirFaltante) pedirFaltante(detailItem.id); }}
      />

      {/* ── Registrar devolución (venta Completado → Devolucion): aviso, no
             confirmación destructiva — la gestión real (canje/dinero) ocurre
             en la pantalla de Devoluciones ── */}
      <AnimatePresence>
        {ventaDevolver && (
          <ConfirmModal
            title={`¿Mandar el pedido #${ventaDevolver.id} a Devoluciones?`}
            tone="aviso"
            message={`El pedido de ${ventaDevolver.usuario} queda como devolución y ahí se decide si se le cambia el producto o se le devuelve la plata.`}
            confirmLabel="Sí, mandarlo a Devoluciones"
            onCancel={() => setVentaDevolver(null)}
            onConfirm={() => void confirmarDevolucionVenta()}
          />
        )}
      </AnimatePresence>

      {/* ── Anular venta (sólo los primeros 10 minutos): motivo obligatorio,
             comprobante opcional y valor a devolver según el motivo ── */}
      <AnimatePresence>
        {ventaAnular && (() => {
          const porcentaje = porcentajeReembolsoAnulacion(anularMotivoSel);
          const total = ventaAnular.total;
          return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                      <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-bold text-foreground" style={{ fontFamily: SERIF }}>¿Anular el pedido #{ventaAnular.id}?</p>
                      <p className="text-base text-muted-foreground truncate">
                        Pedido #{ventaAnular.id} · {ventaAnular.usuario}
                      </p>
                    </div>
                  </div>
                  <button onClick={cerrarAnular} className="p-1 max-md:p-3.5 max-md:-m-2.5 rounded-lg hover:bg-muted cursor-pointer" aria-label="Cerrar">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  <p className="text-lg text-muted-foreground">
                    La cocina no lo prepara. Si ya pagó, hay que devolverle la plata y subir el comprobante.{" "}
                    <span className="font-semibold">Te quedan {Math.ceil(segundosAnulacion(ventaAnular) / 60)} minutos</span> para anularlo.
                  </p>

                  {/* Motivo obligatorio: la misma lista que valida el backend. */}
                  <div>
                    <p className="text-base font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                      ¿Por qué se anula?
                    </p>
                    <div className="space-y-1.5">
                      {MOTIVOS_ANULACION.map((m) => (
                        <label
                          key={m.value}
                          className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                            anularMotivoSel === m.value
                              ? "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10"
                              : "border-border hover:bg-muted"
                          }`}
                        >
                          <input
                            type="radio"
                            name="motivo-anulacion"
                            value={m.value}
                            checked={anularMotivoSel === m.value}
                            onChange={() => setAnularMotivoSel(m.value)}
                            className="mt-0.5 accent-red-600 cursor-pointer"
                          />
                          <span className="text-lg text-foreground leading-snug">{m.label}</span>
                        </label>
                      ))}
                    </div>

                    {/* "Otro": exige el texto que quedará como "Otro: <texto>". */}
                    {anularMotivoSel === "Otro" && (
                      <div className="mt-2">
                        <label
                          htmlFor="motivo-anulacion-otro"
                          className="block text-base font-semibold text-muted-foreground mb-1"
                        >
                          Describe el motivo
                        </label>
                        <textarea
                          id="motivo-anulacion-otro"
                          value={anularOtroTexto}
                          onChange={(e) => setAnularOtroTexto(e.target.value.slice(0, MOTIVO_OTRO_MAX))}
                          maxLength={MOTIVO_OTRO_MAX}
                          rows={2}
                          placeholder="Ej.: el cliente pidió cambiar la hora de recogida"
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-lg text-foreground focus:outline-none focus:border-red-400"
                        />
                        <div className="flex justify-between gap-3 mt-1">
                          <p className="text-base text-red-600">
                            {anularOtroTexto.trim() === "" ? "El texto es obligatorio." : ""}
                          </p>
                          <p className="text-base text-muted-foreground shrink-0" style={{ fontFamily: MONO }}>
                            {anularOtroTexto.length}/{MOTIVO_OTRO_MAX}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Comprobante de la devolución: OPCIONAL. */}
                  <div>
                    <p className="text-base font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                      Comprobante de la devolución (si ya le devolviste la plata)
                    </p>
                    <CampoComprobante
                      fileRef={anularFileRef}
                      url={anularUrl}
                      onQuitar={() => setAnularUrl(null)}
                      subiendo={subiendoAnulacion}
                      onSubir={(file) => {
                        void subirAnulacion(file, "comprobantes").then((url) => {
                          if (url) setAnularUrl(url);
                        });
                      }}
                      etiquetaBoton="Adjuntar comprobante"
                    />
                  </div>

                  {/* Valor a devolver según el motivo. */}
                  <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-lg">
                      <span className="text-muted-foreground">Total del pedido</span>
                      <span className="font-semibold" style={{ fontFamily: MONO }}>{fmtCOP(total)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-lg">
                      <span className="text-muted-foreground">Motivo</span>
                      <span className="font-semibold text-right">
                        {anularMotivoSel
                          ? anularMotivoSel === "Otro"
                            ? anularOtroTexto.trim() || "Otro"
                            : anularMotivoSel
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-lg border-t border-border pt-1.5">
                      <span className="font-semibold text-foreground">
                        Valor a devolver ({Math.round(porcentaje * 100)} %)
                      </span>
                      <span className="font-bold text-red-600" style={{ fontFamily: MONO }}>
                        {fmtCOP(Math.round(total * porcentaje))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 px-5 pb-5">
                  <button
                    onClick={cerrarAnular}
                    className="flex-1 py-2.5 max-md:min-h-11 rounded-2xl min-h-[3.5rem] border-2 border-black text-lg font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                  >
                    No, dejarlo como está
                  </button>
                  <button
                    onClick={() => void anularVentaSeleccionada()}
                    disabled={!puedeConfirmarAnulacion}
                    className={`flex-1 py-2.5 max-md:min-h-11 rounded-xl text-lg font-semibold text-white transition-colors ${
                      puedeConfirmarAnulacion
                        ? "bg-red-600 hover:bg-red-700 cursor-pointer"
                        : "bg-red-600/50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    Sí, anular el pedido
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ── Elegir cómo emitir la factura ── */}
      <AnimatePresence>
        {facturaVenta && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Printer className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">Imprimir factura</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Pedido #{facturaVenta.id} · {facturaVenta.usuario}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setFacturaVenta(null)}
                  className="p-1.5 max-md:p-3.5 max-md:-m-2 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    toast.error("El envío de facturas por correo aún no está disponible.");
                  }}
                  className="w-full flex items-center gap-3 p-3.5 text-left bg-card border border-border rounded-xl hover:border-sky-400 hover:bg-sky-500/5 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      Enviar factura al correo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Envío por correo no disponible
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    imprimirFactura(facturaVenta);
                    toast.success("Enviando a la impresora");
                    setFacturaVenta(null);
                  }}
                  className="w-full flex items-center gap-3 p-3.5 text-left bg-card border border-border rounded-xl hover:border-emerald-400 hover:bg-emerald-500/5 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Printer className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">Imprimir factura</p>
                    <p className="text-xs text-muted-foreground">
                      Ticket de 80 mm para la impresora del sistema
                    </p>
                  </div>
                </button>

                <p className="pt-1 text-[0.6875rem] text-muted-foreground text-center">
                  Total a facturar:{" "}
                  <span className="font-bold text-foreground">
                    {fmtCOP(facturaVenta.total)}
                  </span>
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Visor ampliado del comprobante (clic en la miniatura del detalle). */}
      <VisorImagen
        src={visorSrc}
        alt="Comprobante de pago"
        onClose={() => setVisorSrc(null)}
      />
    </div>
  );
}
