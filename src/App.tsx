import { AlertTriangle, Archive, Banknote, CircleCheck, ClipboardList, Eye, ImageIcon, Lock, PackageCheck, QrCode, RefreshCw, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Component, Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import { useIsMobile } from "@/shared/components/ui/use-mobile";

import { esRutaLicencias } from "@/features/legal/navigation";
import { BrowserRouter } from "react-router";
import { AppRoutes, leerRuta } from "@/AppRoutes";
import { useRouteSync } from "@/shared/hooks/useRouteSync";
import { formatearHora } from "@/shared/utils/time";
import { agregarDias, fechaISO, type Periodo } from "@/shared/utils/dates";
import { crearVentaCliente, obtenerVentasPanel, verificarVentaApi, ventaApiAVenta } from "@/features/sales/services/salesApi";
import type { Screen } from "@/shared/utils/screen";
import { esPantalla } from "@/shared/utils/screen";
import { SECCIONES_MENU, productoACatalogo, productoApiAProducto, limiteStockDe, categoriaApiACategoria, type Product } from "@/shared/utils/catalog";
import { disponiblePizza } from "@/shared/utils/pizzaStock";
import { obtenerCatalogo } from "@/shared/services/catalogService";
import { actualizarPerfil, borrarToken, obtenerPerfil, obtenerToken } from "@/shared/services/authService";
import { crearError401Checkout, registrarManejadorCierreSesion } from "@/shared/services/api";
import type { ApiErrorConEstado } from "@/types/api";
import { CategoriaProductoScreen, type CategoriaGuardar } from "@/features/product-categories/pages/ProductCategoriesScreen";
import type { CategoriaProducto, EstadoCategoria } from "@/features/product-categories/utils/product-categories";
import type { Cliente } from "@/features/customers/utils/customers";
import { GestionCompraScreen, NuevaCompraPage } from "@/features/purchases/pages/PurchasesScreen";
import { GestionConfigScreen, fullAccesos } from "@/features/roles/pages/RolesScreen";
import { KEY, ACCION_EXCEL, type AccesosMap, type Rol } from "@/features/roles/utils/roles";
import { GestionEmpleadosScreen } from "@/features/employees/pages/EmployeesScreen";
import type { Contratacion } from "@/features/employees/utils/employees";
import { obtenerMiContratacion } from "@/shared/services/employeesService";
import type { CategoriaInsumo } from "@/features/supplies/pages/SuppliesScreen";
import type { Insumo } from "@/features/supplies/utils/supplies";
import {
  GestionInsumosScreen,
  INITIAL_INSUMOS,
} from "@/features/supplies/pages/SuppliesScreen";
import { GestionProductosScreen, INITIAL_PRODUCTOS, INITIAL_FICHAS, imagenesDe, normalizarIdsFicha, TIPOS_PRODUCTO, tipoDe, type Producto, type FichasPorProducto, type FichaVersion } from "@/features/products/pages/ProductsScreen";
import { migrarFichasLegacy } from "@/shared/utils/technicalSheets";
import { listarGestion, crearProducto, editarProducto, cambiarEstadoProducto, productoPanelACreacion, productoPanelAEdicion, mensajeErrorProductos, type EstadoProductoManual } from "@/features/products/services/productsApi";
import { listarCategoriasInsumo, listarInsumos, mensajeErrorInsumos } from "@/features/supplies/services/suppliesApi";
import { mapearFichasApi, obtenerFichasVigentes } from "@/features/products/services/technicalSheetsApi";
import { listarOrdenesProduccion, mensajeErrorOrdenes } from "@/features/production-orders/services/productionOrdersApi";
import { listarProveedores, mensajeErrorProveedores } from "@/features/suppliers/services/suppliersApi";
import { listarOrdenesCompra, mensajeErrorOrdenesCompra } from "@/features/purchase-orders/services/purchaseOrdersApi";
import { listarCompras, mensajeErrorCompras } from "@/features/purchases/services/purchasesApi";
import { configDeCategoria, type ConfigCategoria } from "@/shared/utils/categoryConfig";
import { mismoNombre } from "@/shared/utils/names";
import { GestionUsuariosScreen, claveDoc, docValida, idRolCliente, type Usuario } from "@/features/users/pages/UsersScreen";
import { ActivarCuentaModal } from "@/shared/components/ActivateAccountModal";
import { verificarCorreo } from "@/shared/services/verificationService";
import type { GestionCompra, OrdenCompra, OrdenItem, ProveedorRef } from "@/features/purchase-orders/utils/purchase-orders";
import {
  INITIAL_GESTIONES,
  INITIAL_ORDENES,
  NuevaOrdenCompraPage,
  OrdenCompraScreen,
  OrdenDetallePage,
  PROVEEDORES_INIT,
} from "@/features/purchase-orders/pages/PurchaseOrdersScreen";
import { OrdenProduccionScreen, INITIAL_ORDENES as INITIAL_ORDENES_PRODUCCION, crearOrdenPedido, crearOrdenPreparacion, crearOrdenReemplazo, siguienteOrdenId, normalizarNombre, type Faltante } from "@/features/production-orders/pages/ProductionOrdersScreen";
import type { OrdenProduccion } from "@/features/production-orders/utils/production-orders";
import { ProductosPerecederosScreen } from "@/features/non-conforming-products/pages/NonConformingProductsScreen";
import type { NoConformidad } from "@/features/non-conforming-products/utils/non-conforming-products";
import { listarNoConformidades, mensajeErrorNoConformes } from "@/features/non-conforming-products/services/nonConformingApi";
import { cambiarEstadoCategoria, crearCategoria, editarCategoria, eliminarCategoria, listarCategoriasGestion, mensajeErrorCategorias } from "@/features/product-categories/services/categoriesApi";
import { PagoPill, VentasScreen } from "@/features/sales/pages/SalesScreen";
import type { DevolucionTipo, Venta } from "@/features/sales/utils/sales";
import type { CartItem } from "@/types/cart";
import { DASHBOARD_PERM_KEY, canViewPermission } from "@/shared/utils/navigation";
import { PublicNav } from "@/layout/components/Header";
import { Sidebar } from "@/layout/components/Sidebar";
import { AdminTopBar } from "@/layout/components/AdminTopBar";
import { BottomNav } from "@/layout/components/BottomNav";
import { Landing } from "@/layout/pages/Landing";
import { AuthProvider, useAuth } from "@/shared/contexts/AuthContext";
import { CartProvider, useCart } from "@/shared/contexts/CartContext";
import { normalizarNombreRol } from "@/shared/utils/roleName";
import { AVATAR_PALETTE } from "@/shared/utils/avatar";
import { LoginScreen } from "@/features/auth/pages/LoginScreen";
import { RegisterScreen } from "@/features/auth/pages/RegisterScreen";
import { esRolCliente, armarRolesSesion, clavePersona, escribirRolActivo, SESION_STORAGE_KEY, INACTIVIDAD_MS, ACTIVIDAD_THROTTLE_MS, type SesionGuardada, leerSesionGuardada, escribirSesionGuardada, borrarSesionGuardada } from "@/features/auth/hooks/useSession";
import { sizeDe, PRODUCTS } from "@/features/catalog/data/products";
import { type LineaLimiteRef, type LimiteLinea, mensajeMaximoDe, ajustarCantidad } from "@/features/catalog/utils/lineLimits";
import { CatalogScreen } from "@/features/catalog/pages/CatalogScreen";
import { ProductDetailScreen } from "@/features/catalog/pages/ProductDetailScreen";
import { type PendingOrder, type PedidoResumen } from "@/types/cart";
import { guardarRetornoCheckout, consumirRetornoCheckout, borrarRetornoCheckout, hayIdsProductoLegacyEnCarritos, leerCarritoGuardado, escribirCarritoGuardado, borrarCarritoGuardado, leerCarritosDeUsuarios, escribirCarritosDeUsuarios, mismaConfig, fusionarCarritos } from "@/features/cart/utils/cartStorage";
import { CartScreen } from "@/features/cart/pages/CartScreen";
import { ClientProfileScreen } from "@/features/customers/pages/CustomerProfileScreen";
import { SCREEN_META } from "@/shared/utils/navigation";
import { ManageProductsScreen } from "@/features/products/pages/ManageProductsScreen";
import { GenericAdmin } from "@/features/products/components/GenericAdmin";
import { ROLES_STORAGE_KEY, leerRolesPersistidos, respaldarEmpleadosLocales, respaldarCategoriasLocales, respaldarDatosComprasFase3, respaldarDatosProduccionFase2, respaldarNoConformidadesLocales, MIGRACION_FICHAS_FASE1_KEY, leerProductosParaMigracion, respaldarDatosProductosFase1, AUTH_STORAGE_KEYS } from "@/shared/utils/storage";
import { ADMIN_SCREENS, SCREEN_PERM_KEY } from "@/shared/utils/navigation";

// ─── Code splitting (React.lazy) ───
// Estas pantallas se importan SOLO como componente (no comparten constants ni
// funciones con App), así que se cargan bajo demanda para reducir el bundle
// inicial. Cada wrapper resuelve el export nominal correspondiente como `default`.
const ProductoTerminadoScreen = lazy(() => import("@/features/products/pages/FinishedProductScreen").then((m) => ({ default: m.ProductoTerminadoScreen })));
const RecepcionCompraScreen = lazy(() => import("@/features/purchase-orders/pages/PurchaseReceptionScreen").then((m) => ({ default: m.RecepcionCompraScreen })));
const SalesChartScreen = lazy(() => import("@/features/dashboard/pages/SalesChartScreen").then((m) => ({ default: m.SalesChartScreen })));
const DashboardScreen = lazy(() => import("@/features/dashboard/pages/DashboardScreen").then((m) => ({ default: m.DashboardScreen })));
const SuppliersScreen = lazy(() => import("@/features/suppliers/pages/SuppliersScreen").then((m) => ({ default: m.SuppliersScreen })));
const DevolucionesScreen = lazy(() => import("@/features/returns/pages/ReturnsScreen").then((m) => ({ default: m.DevolucionesScreen })));
const MisPedidosScreen = lazy(() => import("@/features/sales/pages/MyOrdersScreen").then((m) => ({ default: m.MisPedidosScreen })));
const LicenciasScreen = lazy(() => import("@/features/legal/pages/LicensesScreen").then((m) => ({ default: m.LicenciasScreen })));
const MiPerfilScreen = lazy(() => import("@/features/users/pages/MyProfileScreen").then((m) => ({ default: m.MiPerfilScreen })));
const GestionClientesScreen = lazy(() => import("@/features/customers/pages/CustomersScreen").then((m) => ({ default: m.GestionClientesScreen })));

// ─────────────────────────── APP ROOT ───────────────────────────

respaldarEmpleadosLocales();

respaldarCategoriasLocales();

respaldarDatosComprasFase3();

respaldarDatosProduccionFase2();




respaldarNoConformidadesLocales();

class LandingErrorBoundary extends Component<
  { resetKey: Screen; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[LandingErrorBoundary] Error al renderizar una ruta pública", error, info);
  }

  componentDidUpdate(prevProps: { resetKey: Screen }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <h1 className="text-2xl font-bold text-foreground">No se pudo cargar esta sección</h1>
          <p className="mt-2 text-muted-foreground">
            Intenta volver al inicio y abrirla nuevamente.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // Antes de montar los providers: la copia de respaldo se hace antes de leer
  // el estado guardado.
  respaldarDatosProductosFase1();
  return (
    <AuthProvider>
      <CartProvider>
        {/* Sin transiciones: las redirecciones de `AppContent` esperan que la
            ruta cambie junto con el resto del estado. */}
        <BrowserRouter useTransitions={false}>
          <AppRoutes shell={<AppContent />} />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

function AppContent() {
  respaldarDatosProductosFase1();
  const {
    sesionArranque, sesionActiva, isLoggedIn, setIsLoggedIn,
    restauracionSesionLista, setRestauracionSesionLista, userRole, setUserRole,
    loggedInUserId, setLoggedInUserId, rolActivoId, setRolActivoId,
  } = useAuth();
  const { cart, setCart } = useCart();
  /** Pantalla que se restaura desde la sesión (si era válida) o "landing". */
  const [facturaPedidoId] = useState(() => {
    const id = new URLSearchParams(window.location.search).get("factura");
    return id && /^[1-9]\d*$/.test(id) ? id : null;
  });
  // /licencias es pública y tiene URL propia: no espera a restaurar la sesión.
  const [arrancaEnLicencias] = useState(esRutaLicencias);
  // Pantalla pedida en la URL. "/" no cuenta: ahí se restaura la última
  // pantalla de la sesión, como antes.
  const [rutaInicial] = useState(() => {
    const ruta = leerRuta(window.location.pathname);
    if (!ruta || ruta.screen === "landing") return null;
    if (sesionActiva && (ruta.screen === "login" || ruta.screen === "register")) return null;
    return ruta;
  });
  const [pantallaPendiente, setPantallaPendiente] = useState(
    facturaPedidoId || arrancaEnLicencias ? null : sesionActiva ? rutaInicial?.screen ?? sesionActiva.screen : null,
  );
  const [screen, setScreen] = useState<Screen>(() => {
    if (arrancaEnLicencias) return "licencias";
    if (facturaPedidoId) return sesionActiva ? "mis-pedidos" : "login";
    if (sesionActiva) return "inicio";
    if (!rutaInicial) return "landing";
    const privada = ADMIN_SCREENS.includes(rutaInicial.screen) ||
      ["mis-pedidos", "client-profile", "store-profile"].includes(rutaInicial.screen);
    return privada ? "login" : rutaInicial.screen;
  });
  /** Registro pedido por la URL que falta buscar en los datos cargados. */
  const [idPendiente, setIdPendiente] = useState<{ screen: Screen; id: string } | null>(() =>
    rutaInicial?.id ? { screen: rutaInicial.screen, id: rutaInicial.id } : null,
  );
  const reemplazarRutaRef = useRef(false);
  /** Venta cuya devolución se debe abrir ya lista. La pone el botón "Gestionar"
      de la tabla de ventas para no obligar a buscarla otra vez en el módulo. */
  const [devolucionAAbrir, setDevolucionAAbrir] = useState<string | null>(null);
  const [ordenAAbrir, setOrdenAAbrir] = useState<string | null>(null);
  /** Orden de producción cuyo DETALLE hay que abrir (A2.3): la pone el toast
      "Ver orden" de Insumos tras crear la orden automática de un producto
      insumo nuevo. */
  const [ordenDetalleAAbrir, setOrdenDetalleAAbrir] = useState<string | null>(null);
  const [ordenRecepcion, setOrdenRecepcion] =
    useState<OrdenCompra | null>(null);
  const [ordenDetalle, setOrdenDetalle] = useState<OrdenCompra | null>(null);
  const [ordenAEditar, setOrdenAEditar] = useState<OrdenCompra | null>(null);
  const [ordenCompraItemsIniciales, setOrdenCompraItemsIniciales] = useState<OrdenItem[]>([]);
  const [ordenCompraPage, setOrdenCompraPage] = useState(1);
  // Sesión restaurándose (F5): hay sesión guardada y GET /auth/me todavía no
  // terminó, así que los roles de la sesión aún no llegan. Mientras dure NO se
  // pinta el inicio/dashboard (ni el chip "sin rol" ni el bloque "Sin rol
  // asignado"/"Sin módulos asignados"): solo un indicador de carga. La sesión
  // NO se cierra por recargar; si /auth/me responde 401 el flujo de restauración
  // la cierra como siempre.
  const sesionRestaurandose =
    isLoggedIn && sesionActiva !== null && !restauracionSesionLista;
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [ventasCargando, setVentasCargando] = useState(true);
  const [ventasError, setVentasError] = useState<string | null>(null);
  const ventasSolicitudIdRef = useRef(0);
  const ventasFallosConsecutivosRef = useRef(0);
  // The legacy guest auto-submit branch is retained but has no producer.
  const pendingOrder: PendingOrder | null = null;
  const [abrirCheckoutTrasLogin, setAbrirCheckoutTrasLogin] = useState(false);
  const [validandoStockCheckout, setValidandoStockCheckout] = useState(false);
  const validacionStockCheckoutRef = useRef(false);
  const [orderConfirmation, setOrderConfirmation] = useState<PedidoResumen | null>(null);
  const [loginNotice, setLoginNotice] = useState(false);
  // Correo que queda precargado en "Iniciar sesión" cuando se llega desde el
  // cambio de contraseña: la sesión acaba de cerrarse y así el usuario solo
  // tiene que escribir la clave nueva. Vive aquí (y no dentro de LoginScreen)
  // porque quien lo conoce es el flujo que cierra la sesión.
  const [loginEmailPre, setLoginEmailPre] = useState("");
  // Mensaje verde que se pinta en "Iniciar sesión" (p. ej. "Contraseña creada.
  // Ya puedes iniciar sesión." al llegar desde la invitación de empleado).
  const [loginMensajeExito, setLoginMensajeExito] = useState("");
  // Token de la invitación de empleado (?activar=<token>). Al leerlo se limpia
  // la URL de inmediato, aunque el enlace resulte inválido.
  const [activacionToken, setActivacionToken] = useState<string | null>(null);
  // Periodo del INICIO del empleado (Diario por defecto; el Dashboard del admin
  // sigue en Semanal). Vive aquí y no en DashboardScreen para que se conserve
  // al cambiar de rol con el selector del encabezado: el componente puede
  // desmontarse al cambiar de pantalla y perdería su estado interno.
  const [periodoInicio, setPeriodoInicio] = useState<Periodo>("dia");
  // Catálogo de Productos del panel: solo se llena desde /productos/gestion
  // con sesión activa; un error no se reemplaza por datos de ejemplo.
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosCargando, setProductosCargando] = useState(false);
  const [errorCargaProductos, setErrorCargaProductos] = useState<string | null>(null);
  const [productosGestionCargados, setProductosGestionCargados] = useState(false);
  // Catálogo público independiente del almacenamiento local de Gestión de Productos.
  const [productosCatalogo, setProductosCatalogo] = useState<Producto[]>([]);
  const [categoriasCatalogo, setCategoriasCatalogo] = useState<CategoriaProducto[]>([]);
  // Estado de la carga del catálogo público (landing / Ver Menú). Si la API no
  // responde, el aviso fijo informa al usuario y ofrece reintentar sin que la
  // página se rompa ni cambie de diseño en el caso normal.
  const [catalogoCargando, setCatalogoCargando] = useState(true);
  const [catalogoError, setCatalogoError] = useState<string | null>(null);
  // Fichas técnicas por producto. Las crea Gestión de Productos y las lee
  // Orden de Producción para saber qué insumos (y Productos Insumo) consume
  // cada plato de un pedido. Desde la fase 2 viven en la API: el estado arranca
  // vacío y lo llena `cargarInsumosFichas` (GET /fichas/vigentes).
  const [fichasPorProducto, setFichasPorProducto] = useState<FichasPorProducto>({});
  // Órdenes de producción (API). Antes vivían dentro de OrdenProduccionScreen y
  // después en localStorage; ahora la lista viene de GET /ordenes-produccion.
  const [ordenesProduccion, setOrdenesProduccion] = useState<OrdenProduccion[]>([]);
  // Productos no conformes (API, GET /productos-no-conformes). Viven en App
  // porque los leen CPN, el detalle de Orden de Producción y el Dashboard.
  const [noConformidades, setNoConformidades] = useState<NoConformidad[]>([]);
  const [noConformesCargando, setNoConformesCargando] = useState(false);
  const [errorNoConformes, setErrorNoConformes] = useState<string | null>(null);
  const [noConformesCargados, setNoConformesCargados] = useState(false);
  // Categorías de producto de la gestión (API, GET /categorias-productos/gestion):
  // activas e inactivas, con sus productos asociados. Solo las usa la pantalla
  // de Categoría Producto; el resto de la app usa `categoriasCatalogo`.
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
  const [categoriasCargando, setCategoriasCargando] = useState(false);
  const [errorCategorias, setErrorCategorias] = useState<string | null>(null);
  // Catálogo del picker de pedidos (VentasScreen) y del canje de devoluciones,
  // armado con el estado `productos` en vez del mock `PRODUCTS`: los nombres
  // ("Pizza Jamon") son los del panel, así el detalle de la venta resuelve el
  // Producto real (id y stock) al crear la orden de producción.
  const productosMenu = useMemo(
    () => productos.map((p) => productoACatalogo(p, categoriasCatalogo)),
    [productos, categoriasCatalogo],
  );
  const recargarCatalogo = async ({ conservarCarrito = false } = {}) => {
    setCatalogoCargando(true);
    setCatalogoError(null);
    try {
      const { productos: filasProductos, categorias: filasCategorias } = await obtenerCatalogo();
      const teniaIdsAntiguos = hayIdsProductoLegacyEnCarritos();
      const productosApi = filasProductos.map(productoApiAProducto);
      const categoriasApi = filasCategorias.map(categoriaApiACategoria);
      setProductosCatalogo(productosApi);
      setCategoriasCatalogo(categoriasApi);
      const idsValidos = new Set(productosApi.map((p) => Number(p.id)));
      setCart((actuales) => {
        const validos = actuales
          .filter((item) => conservarCarrito || idsValidos.has(item.product.id))
          .map((item) => {
            const actualizado = productosApi.find((p) => Number(p.id) === item.product.id);
            if (actualizado) return { ...item, product: productoACatalogo(actualizado, categoriasApi) };
            return {
              ...item,
              product: { ...item.product, estado: "No disponible" as const, status: "no disponible" as const },
            };
          });
        if (validos.length < actuales.length) {
          toast.info("Se quitaron del carrito productos que ya no están disponibles en el catálogo.");
        }
        return validos;
      });
      if (teniaIdsAntiguos) toast.info("Se quitaron del carrito productos antiguos que ya no existen en el catálogo.");
    } catch (error) {
      console.error("No se pudo cargar el catálogo público:", error);
      const mensaje =
        error instanceof Error && error.message ? error.message : "No se pudo cargar el catálogo público.";
      setCatalogoError(mensaje);
      toast.error(mensaje);
      throw error;
    } finally {
      setCatalogoCargando(false);
    }
  };

  const cargarProductosGestion = async (): Promise<Producto[] | null> => {
    setProductosCargando(true);
    setErrorCargaProductos(null);
    try {
      const listado = await listarGestion();
      setProductos(listado);
      setProductosGestionCargados(true);
      return listado;
    } catch (error) {
      setErrorCargaProductos(mensajeErrorProductos(error, "No se pudieron cargar los productos."));
      setProductosGestionCargados(false);
      return null;
    } finally {
      setProductosCargando(false);
    }
  };

  /** Configuración de la categoría de un producto (tamaños de su ficha), con
      el catálogo que se pasa como argumento: las fichas de la API sólo traen
      las porciones del PRIMER tamaño y el resto se arma desde aquí. */
  const configDeProducto = (
    idProducto: string,
    productosCargados: Producto[],
  ): ConfigCategoria | null => {
    const p = productosCargados.find((x) => x.id === idProducto);
    return p ? configDeCategoria(p.idCategoria, p.categoriaNombre) : null;
  };

  /** Insumos, categorías de insumos y fichas vigentes (API). `productosCargados`
      es el catálogo ya leído: hace falta para derivar los tamaños de cada
      ficha. Si falla NO se vuelve a datos de ejemplo: queda el error con
      "Reintentar". */
  const cargarInsumosFichas = async (productosCargados?: Producto[]): Promise<boolean> => {
    setInsumosCargando(true);
    setErrorInsumos(null);
    try {
      const [categorias, datosInsumos, fichasVigentes] = await Promise.all([
        listarCategoriasInsumo(),
        listarInsumos(),
        obtenerFichasVigentes(),
      ]);
      setCategoriasInsumo(categorias);
      setInsumos(datosInsumos.insumos);
      // Las fichas de producto insumo ya vienen dentro de cada insumo; las de
      // producto (pizzas, lasañas) llegan por su cuenta y aquí se les añaden
      // sus "Porciones por tamaño".
      const base = productosCargados ?? productos;
      const fichasDeProducto = mapearFichasApi(
        fichasVigentes.filter((f) => f.id_insumo == null || f.id_insumo === ""),
        (id) => configDeProducto(id, base),
      );
      setFichasPorProducto({ ...datosInsumos.fichas, ...fichasDeProducto });
      return true;
    } catch (error) {
      setErrorInsumos(mensajeErrorInsumos(error, "No se pudieron cargar los insumos."));
      return false;
    } finally {
      setInsumosCargando(false);
    }
  };

  /** Órdenes de producción (API). */
  const cargarOrdenes = async (): Promise<boolean> => {
    setOrdenesCargando(true);
    setErrorOrdenes(null);
    try {
      setOrdenesProduccion(await listarOrdenesProduccion());
      return true;
    } catch (error) {
      setErrorOrdenes(mensajeErrorOrdenes(error, "No se pudieron cargar las órdenes de producción."));
      return false;
    } finally {
      setOrdenesCargando(false);
    }
  };

  /** Productos no conformes (API). */
  const cargarNoConformes = async (): Promise<boolean> => {
    setNoConformesCargando(true);
    setNoConformesCargados(false);
    setErrorNoConformes(null);
    try {
      setNoConformidades(await listarNoConformidades());
      return true;
    } catch (error) {
      setErrorNoConformes(mensajeErrorNoConformes(error, "No se pudieron cargar los productos no conformes."));
      return false;
    } finally {
      setNoConformesCargando(false);
      setNoConformesCargados(true);
    }
  };

  /** Categorías de producto de la gestión (API). */
  const cargarCategoriasGestion = async () => {
    setCategoriasCargando(true);
    setErrorCategorias(null);
    try {
      setCategorias(await listarCategoriasGestion());
    } catch (error) {
      setErrorCategorias(mensajeErrorCategorias(error, "No se pudieron cargar las categorías."));
    } finally {
      setCategoriasCargando(false);
    }
  };

  /** Proveedores (API, fase 3). */
  const cargarProveedores = async () => {
    setProveedoresCargando(true);
    setErrorProveedores(null);
    try {
      setProveedores(await listarProveedores());
    } catch (error) {
      setErrorProveedores(mensajeErrorProveedores(error, "No se pudieron cargar los proveedores."));
    } finally {
      setProveedoresCargando(false);
    }
  };

  /** Órdenes de compra (API, fase 3). */
  const cargarOrdenesCompra = async () => {
    setOrdenesCompraCargando(true);
    setOrdenesCompraCargadas(false);
    setErrorOrdenesCompra(null);
    try {
      setOrdenes(await listarOrdenesCompra());
    } catch (error) {
      setErrorOrdenesCompra(mensajeErrorOrdenesCompra(error, "No se pudieron cargar las órdenes de compra."));
    } finally {
      setOrdenesCompraCargando(false);
      setOrdenesCompraCargadas(true);
    }
  };

  /** Compras (API, fase 3). */
  const cargarCompras = async () => {
    setComprasCargando(true);
    setComprasCargadas(false);
    setErrorCompras(null);
    try {
      setGestiones(await listarCompras());
    } catch (error) {
      setErrorCompras(mensajeErrorCompras(error, "No se pudieron cargar las compras."));
    } finally {
      setComprasCargando(false);
      setComprasCargadas(true);
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !restauracionSesionLista) return;
    void (async () => {
      // Primero los productos: las fichas necesitan su categoría para armar
      // los tamaños de "Porciones por tamaño".
      const productosCargados = await cargarProductosGestion();
      await Promise.all([
        cargarInsumosFichas(productosCargados ?? productos),
        cargarOrdenes(),
        cargarNoConformes(),
        cargarProveedores(),
        cargarOrdenesCompra(),
        cargarCompras(),
      ]);
    })();
  }, [isLoggedIn, restauracionSesionLista]);

  // Las categorías de la gestión se cargan al entrar a su pantalla: el backend
  // exige el permiso "Ver" de Categoría de Producto y así nadie sin él recibe
  // un 403 de fondo.
  useEffect(() => {
    if (!isLoggedIn || !restauracionSesionLista || screen !== "cat-producto") return;
    void cargarCategoriasGestion();
  }, [isLoggedIn, restauracionSesionLista, screen]);

  useEffect(() => {
    if (!productosGestionCargados) return;
    try {
      if (localStorage.getItem(MIGRACION_FICHAS_FASE1_KEY) === "hecha") return;
      const legacy = leerProductosParaMigracion();
      const porIdLegacy = new Map(legacy.map((p) => [p.id, p.nombre]));
      const resultado: FichasPorProducto = { ...fichasPorProducto };
      const avisos: string[] = [];
      let cambio = false;
      for (const [idViejo, versiones] of Object.entries(fichasPorProducto)) {
        if (!/^PROD-/i.test(idViejo)) continue;
        const nombre = porIdLegacy.get(idViejo) ?? INITIAL_PRODUCTOS.find((p) => p.id === idViejo)?.nombre;
        const destino = nombre
          ? productos.find((p) => mismoNombre(p.nombre, nombre))
          : undefined;
        if (!destino) {
          avisos.push(nombre ?? idViejo);
          continue;
        }
        if (resultado[destino.id]) {
          avisos.push(`${nombre} (ya existe ficha para el ID ${destino.id})`);
          continue;
        }
        resultado[destino.id] = versiones.map((v) => ({
          ...v,
          destino: v.destino?.tipo === "producto" ? { ...v.destino, productoId: destino.id } : v.destino,
        }));
        delete resultado[idViejo];
        cambio = true;
      }
      if (cambio) setFichasPorProducto(resultado);
      localStorage.setItem(MIGRACION_FICHAS_FASE1_KEY, "hecha");
      if (avisos.length) toast.warning(`Fichas conservadas sin migrar: ${[...new Set(avisos)].join(", ")}`);
    } catch (error) {
      console.error("No se pudo completar la migración local de fichas:", error);
      toast.error("No se pudo migrar una parte de las fichas. Los datos originales se conservaron.");
    }
  }, [productosGestionCargados, productos]);

  useEffect(() => {
    void recargarCatalogo().catch(() => { });
  }, []);

  // SEO: título único por pantalla (sin librerías). Se actualiza al cambiar de
  // vista. Las pantallas públicas tienen título propio; las del panel usan el
  // de SCREEN_META; si no hay, se mantiene el título general del sistema.
  useEffect(() => {
    const titulosPublicos: Partial<Record<Screen, string>> = {
      landing: "La Sirena Pizza | Pizzas artesanales en Medellín",
      catalog: "Menú del restaurante | La Sirena Pizza",
      cart: "Tu carrito | La Sirena Pizza",
      "product-detail": "Detalle del producto | La Sirena Pizza",
      "mis-pedidos": "Mis pedidos | La Sirena Pizza",
      login: "Iniciar sesión | S.I.V.PRO",
      register: "Crear cuenta | La Sirena Pizza",
      licencias: "Licencias y reconocimientos | S.I.V.PRO",
      "client-profile": "Mi perfil | La Sirena Pizza",
    };
    const meta =
      titulosPublicos[screen] ??
      (SCREEN_META[screen] ? `${SCREEN_META[screen].title} | S.I.V.PRO` : undefined);
    document.title =
      meta ?? "S.I.V.PRO | Sistema de Ventas y Producción - La Sirena Pizza";
  }, [screen]);

  const aplicarProductoRespuesta = (producto: Producto, crear = false) => {
    setProductos((prev) => crear
      ? [producto, ...prev.filter((p) => p.id !== producto.id)]
      : prev.map((p) => p.id === producto.id ? producto : p));
  };

  const recargarCatalogoTrasCambio = async () => {
    try {
      await recargarCatalogo();
    } catch {
      // El guardado ya fue confirmado por el backend de Productos; el error
      // del catálogo público se muestra por recargarCatalogo y no lo revierte.
    }
  };

  const crearProductoEnServidor = async (producto: Producto) => {
    const creado = await crearProducto(productoPanelACreacion(producto));
    aplicarProductoRespuesta(creado, true);
    await recargarCatalogoTrasCambio();
    return creado;
  };

  const editarProductoEnServidor = async (producto: Producto) => {
    const anterior = productos.find((item) => item.id === producto.id);
    const guardarGaleria = !anterior ||
      JSON.stringify(imagenesDe(anterior)) !== JSON.stringify(imagenesDe(producto));
    const actualizado = await editarProducto(producto.id, productoPanelAEdicion(producto, guardarGaleria));
    aplicarProductoRespuesta(actualizado);
    await recargarCatalogoTrasCambio();
    return actualizado;
  };

  const cambiarEstadoEnServidor = async (id: string, estado: EstadoProductoManual) => {
    const resultado = await cambiarEstadoProducto(id, estado);
    aplicarProductoRespuesta(resultado.producto);
    await recargarCatalogoTrasCambio();
    return resultado;
  };

  // Categorías de producto: cada cambio confirmado por el backend actualiza la
  // lista de la gestión y refresca el catálogo público, para que landing,
  // Productos y Ventas lo vean sin F5.
  const aplicarCategoriaRespuesta = (categoria: CategoriaProducto) => {
    setCategorias((prev) => prev.some((c) => c.id === categoria.id)
      ? prev.map((c) => c.id === categoria.id ? categoria : c)
      : [...prev, categoria]);
  };

  const crearCategoriaEnServidor = async (datos: CategoriaGuardar) => {
    const creada = await crearCategoria(datos);
    aplicarCategoriaRespuesta(creada);
    await recargarCatalogoTrasCambio();
    return creada;
  };

  const editarCategoriaEnServidor = async (id: string, datos: CategoriaGuardar) => {
    const actualizada = await editarCategoria(id, datos);
    aplicarCategoriaRespuesta(actualizada);
    await recargarCatalogoTrasCambio();
    return actualizada;
  };

  const cambiarEstadoCategoriaEnServidor = async (id: string, estado: EstadoCategoria) => {
    const actualizada = await cambiarEstadoCategoria(id, estado === "Activo");
    aplicarCategoriaRespuesta(actualizada);
    await recargarCatalogoTrasCambio();
    return actualizada;
  };

  const eliminarCategoriaEnServidor = async (id: string) => {
    await eliminarCategoria(id);
    setCategorias((prev) => prev.filter((c) => c.id !== id));
    await recargarCatalogoTrasCambio();
  };

  const descontinuarProductoEnServidor = async (id: string) =>
    (await cambiarEstadoEnServidor(id, "Descontinuado")).producto;
  const [roles, setRoles] = useState<Rol[]>(leerRolesPersistidos);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // Mantiene el listado general como la unión de las cuentas de empleados y
  // clientes. Los perfiles que coinciden por tipo y número de documento
  // (`clavePersona`) son una sola cuenta.
  useEffect(() => {
    setUsuarios(prev => {
      const next = [...prev];
      const porClave = new Map(
        next.map(usuario => [clavePersona(usuario.tipoDocumento, usuario.numeroDocumento, usuario.correo), usuario]),
      );
      let changed = false;
      const siguienteId = () => {
        const max = next.reduce((value, usuario) => {
          const numero = parseInt(usuario.id.replace("USR-", ""), 10) || 0;
          return Math.max(value, numero);
        }, 0);
        return `USR-${String(max + 1).padStart(3, "0")}`;
      };

      clientes.forEach(cliente => {
        const clave = clavePersona(cliente.tipoDocumento, cliente.numeroDocumento, cliente.correo);
        const existente = porClave.get(clave);
        // Personal del panel (rol distinto de Cliente) no se pisa con su perfil de cliente.
        if (existente && existente.rolId && existente.rolId !== idRolCliente(roles)) return;
        const base = {
          nombre: cliente.nombre,
          iniciales: cliente.iniciales,
          avatarColor: cliente.avatarColor,
          correo: cliente.correo,
          telefono: existente?.telefono ?? "",
          tipoDocumento: cliente.tipoDocumento,
          numeroDocumento: cliente.numeroDocumento,
          rolIds: [idRolCliente(roles)],
          rolId: idRolCliente(roles),
          activo: cliente.activo,
        };
        if (existente) {
          const actualizado = { ...existente, ...base };
          if (JSON.stringify(actualizado) !== JSON.stringify(existente)) {
            const indice = next.findIndex(usuario => usuario.id === existente.id);
            next[indice] = actualizado;
            porClave.set(clave, actualizado);
            changed = true;
          }
        } else {
          const nuevo = { id: siguienteId(), ...base };
          next.push(nuevo);
          porClave.set(clave, nuevo);
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [clientes, roles]);

  // Fuente de lectura del listado general: combina cualquier cuenta existente
  // con los perfiles de Clientes y Empleados, sin repetir personas (por
  // documento via `clavePersona`).
  const usuariosUnificados = useMemo(() => {
    const next = [...usuarios];
    const porClave = new Map(
      next.map(usuario => [clavePersona(usuario.tipoDocumento, usuario.numeroDocumento, usuario.correo), usuario]),
    );
    const siguienteId = () => {
      const max = next.reduce((value, usuario) => {
        const numero = parseInt(usuario.id.replace("USR-", ""), 10) || 0;
        return Math.max(value, numero);
      }, 0);
      return `USR-${String(max + 1).padStart(3, "0")}`;
    };

    clientes.forEach(cliente => {
      const clave = clavePersona(cliente.tipoDocumento, cliente.numeroDocumento, cliente.correo);
      const existente = porClave.get(clave);
      if (existente && existente.rolId && existente.rolId !== idRolCliente(roles)) return;
      const base = {
        nombre: cliente.nombre,
        iniciales: cliente.iniciales,
        avatarColor: cliente.avatarColor,
        correo: cliente.correo,
        telefono: existente?.telefono ?? "",
        tipoDocumento: cliente.tipoDocumento,
        numeroDocumento: cliente.numeroDocumento,
        rolIds: [idRolCliente(roles)],
        rolId: idRolCliente(roles),
        activo: cliente.activo,
      };
      if (existente) {
        const actualizado = { ...existente, ...base };
        const indice = next.findIndex(usuario => usuario.id === existente.id);
        next[indice] = actualizado;
        porClave.set(clave, actualizado);
      } else {
        const nuevo = { id: siguienteId(), ...base };
        next.push(nuevo);
        porClave.set(clave, nuevo);
      }
    });

    return next;
  }, [usuarios, clientes, roles]);

  // Derived display values for top bar and sidebar permissions
  const loggedInUser = loggedInUserId ? usuarios.find(u => u.id === loggedInUserId) ?? null : null;
  const avatarGuardado = sesionActiva?.userId === loggedInUserId
    ? sesionActiva
    : null;
  const avatarParaHeader = sesionRestaurandose
    ? (avatarGuardado?.avatarInicial && avatarGuardado.avatarColor
      ? { iniciales: avatarGuardado.avatarInicial, avatarColor: avatarGuardado.avatarColor }
      : null)
    : loggedInUser
      ? { iniciales: loggedInUser.iniciales, avatarColor: loggedInUser.avatarColor }
      : null;
  const loggedInUserName = loggedInUser?.nombre ?? "Gloria";
  // Nombre con el que se guardan y se buscan los pedidos del usuario en sesión
  const pedidosUsuarioNombre =
    loggedInUser?.nombre ??
    (userRole === "Cliente" ? "Sebastián Gómez" : "Gloria Inés Vargas");
  // ── Sesión multi-rol ───────────────────────────────────────────────
  // La ficha de empleado de la cuenta de sesión, por DOCUMENTO (el correo es
  // editable; el documento no). `null` si la persona no tiene ficha.
  const correoSesion = loggedInUser?.correo.trim().toLowerCase() ?? "";

  // La autorización proviene de usuario.roles del backend. El catálogo local
  // solo aporta presentación; un rol que la API manda y la copia local no tiene
  // (p. ej. creado en otro PC) entra igual con sus permisos.
  const rolesSesion: Rol[] = armarRolesSesion(loggedInUser?.rolesSesionApi, roles);
  const esRolBaseSesion = (rol: Rol) => ["administrador", "cliente", "empleado"].includes(normalizarNombreRol(rol.nombre));
  const rolesDeTrabajo = rolesSesion.filter(rol => !esRolBaseSesion(rol));

  // Rol activo de sesión. El valor persistido por usuario se carga únicamente
  // al restaurar la sesión (F5); durante un login nuevo manda el rol inicial
  // decidido en handleLogin y los cambios manuales viven en el estado.
  const rolActivoIdValido =
    rolActivoId && rolesSesion.some(r => r.id === rolActivoId)
      ? rolActivoId
      : rolesSesion[0]?.id ?? null;
  const loggedInRol = rolesSesion.find(r => r.id === rolActivoIdValido) ?? null;
  const loggedInRoleName = loggedInRol?.nombre ?? userRole;
  // Permisos SOLO del rol activo: la sesión ya no fusiona los mapas de todos
  // los roles de la persona.
  const loggedInAccesos: AccesosMap = loggedInUser?.esSuperAdmin === true
    ? fullAccesos()
    : loggedInRol?.accesos ?? {};

  // § Dashboard por PERMISO, no por nombre de rol: la cuenta super admin
  // marcada por la API; los demás únicamente con
  // el privilegio "Ver" de "Dashboard::Dashboard" del rol activo. El rol
  // "Administrador" lo conserva porque su semilla (fullAccesos) ya incluye la
  // clave y la migración única "sivpro.migracion.dashboardPermiso.v1" se la
  // agrega a los datos viejos; si super admin se la quita, deja de verlo.
  const esSuperAdminSesion = loggedInUser?.esSuperAdmin === true;
  const hasDashboardAccess =
    esSuperAdminSesion || (loggedInAccesos[DASHBOARD_PERM_KEY]?.includes("Ver") ?? false);
  const adminHomeScreen: Screen = hasDashboardAccess ? "dashboard" : "inicio";

  // Cliente público = solo el rol "Cliente". Un empleado activo con contratación
  // vigente también trae Empleado y sus cargos, así que va al panel y ofrece el
  // cambio de rol; si está inactivo o sin contratación vigente, la API solo le
  // manda Cliente y entra como cliente.
  const esClientePublicoSesion =
    rolesSesion.length > 0 && rolesSesion.every(esRolCliente);
  const isStaff = isLoggedIn && loggedInUser !== null && !esClientePublicoSesion;

  // Historial de contrataciones de la sesión (Mi perfil). Sale de la API, no de
  // una lista local: `undefined` mientras carga o si la persona no es empleada.
  const [contratacionesSesion, setContratacionesSesion] = useState<Contratacion[] | undefined>(undefined);
  const [nombresRolesContratacion, setNombresRolesContratacion] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (!isLoggedIn || !restauracionSesionLista || !loggedInUserId || esClientePublicoSesion) {
      setContratacionesSesion(undefined);
      return;
    }
    let cancelado = false;
    void obtenerMiContratacion()
      .then(({ contrataciones }) => {
        if (cancelado) return;
        const nombres = new Map<string, string>();
        for (const c of contrataciones) for (const r of c.roles) nombres.set(String(r.idRol), r.nombre);
        setNombresRolesContratacion(nombres);
        setContratacionesSesion(contrataciones.length === 0 ? undefined : contrataciones.map(c => ({
          id: String(c.idContrato),
          rolIds: c.roles.map(r => String(r.idRol)),
          fechaInicio: c.fechaInicio,
          fechaFinal: c.fechaFinal ?? "",
        })));
      })
      .catch(() => { if (!cancelado) setContratacionesSesion(undefined); });
    return () => { cancelado = true; };
  }, [isLoggedIn, restauracionSesionLista, loggedInUserId, esClientePublicoSesion]);
  const rolNombreDeContrato = (rolId: string) =>
    nombresRolesContratacion.get(rolId) ?? roles.find(r => r.id === rolId)?.nombre ?? rolId;

  // El selector refleja exactamente los otros roles asignados y activos que
  // llegaron en la respuesta de autenticación/perfil.
  const rolesParaCambiar = rolesDeTrabajo.filter(r => r.id !== loggedInRol?.id);

  const cambiarRolActivo = (rolId: string) => {
    const siguiente = rolesSesion.find(r => r.id === rolId && r.activo) ?? null;
    if (!siguiente) return;
    setRolActivoId(siguiente.id);
    if (loggedInUser) escribirRolActivo(loggedInUser.id, siguiente.id);
    setUserRole(siguiente.nombre);
    toast.success(`Ahora estás como ${siguiente.nombre}`);
    // Si la pantalla actual ya no está permitida por el rol nuevo, vuelve a la
    // primera pantalla que ese rol sí permite. "dashboard" solo lo es si el rol
    // siguiente tiene el permiso Dashboard (o la sesión es super admin).
    const dashSiguiente =
      esSuperAdminSesion || (siguiente.accesos[DASHBOARD_PERM_KEY]?.includes("Ver") ?? false);
    const permKeyActual = SCREEN_PERM_KEY[screen];
    const permitida =
      screen === "dashboard"
        ? dashSiguiente
        : permKeyActual
          ? (siguiente.accesos[permKeyActual]?.includes("Ver") ?? false)
          : true; // "inicio" y pantallas sin permKey siempre son un fallback seguro
    if (!permitida) {
      navigate(dashSiguiente ? "dashboard" : "inicio");
    }
  };

  // Returns action permissions for a given screen based on the logged-in user's role
  const getPerms = (s: Screen) => {
    const key = SCREEN_PERM_KEY[s];
    if (!key) return { canCreate: true, canEdit: true, canDelete: true, canExportExcel: true };
    const acts = loggedInAccesos[key] ?? [];
    return {
      canCreate: acts.includes("Crear"),
      canEdit: acts.includes("Editar"),
      canDelete: acts.includes("Eliminar"),
      // Aparte del CRUD: sin este permiso no se monta el botón "Descargar
      // Excel", así que el `.xlsx` no se puede generar desde la interfaz.
      canExportExcel: acts.includes(ACCION_EXCEL),
    };
  };

  // Un solo estado para escritorio: true = menú completo visible,
  // false = menú totalmente oculto (sin franja de íconos). Se persiste en
  // localStorage; en celular no se guarda (el drawer siempre arranca cerrado).
  const [menuAbierto, setMenuAbierto] = useState(() => {
    try {
      const v = localStorage.getItem("sivpro.menuAbierto.v1");
      return v === null ? true : v !== "false";
    } catch {
      return true;
    }
  });
  // En celular/tablet el sidebar no cabe (240px fijos sobre ~375px de ancho):
  // se oculta y el botón del topbar lo abre como panel deslizante.
  const esMovil = useIsMobile(821);
  const [sidebarMovilAbierto, setSidebarMovilAbierto] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstNavRef = useRef<HTMLButtonElement | null>(null);

  // Un usuario sin ficha o sin rol activo no es una sesión válida. La cuenta
  // legacy de cliente es la única excepción porque no tiene ficha en usuarios.
  const hasValidSession = isLoggedIn && (
    (sesionActiva !== null && !restauracionSesionLista) ||
    userRole === "Cliente" || (loggedInUser !== null && loggedInRol !== null)
  );

  // Un cliente público (rol "Cliente" y sin ficha de empleado) es el único que no
  // entra al panel. Cualquier otro rol —incluidos los ROL-00X personalizados—
  // entra según SUS permisos, sin programarlos nombre por nombre: antes esta
  // línea comparaba `userRole === "Administrador"`, así que un rol personalizado
  // caía en `false` y el guard de abajo lo expulsaba a la landing. Es el mismo
  // criterio de "cliente público" que ya usa el `goPublic` del login.
  const esClientePublico = esClientePublicoSesion;
  const isAdminRole = hasValidSession && !esClientePublico;
  const isAdmin = ADMIN_SCREENS.includes(screen) && isAdminRole;

  const puedeVerPantallaPanel = (pantalla: Screen) => {
    if (pantalla === "dashboard" || pantalla === "sales-chart") return hasDashboardAccess;
    if (pantalla === "inicio") return !hasDashboardAccess;
    const permiso = SCREEN_PERM_KEY[pantalla];
    return !permiso || esSuperAdminSesion || canViewPermission(loggedInAccesos, permiso);
  };

  // Resuelve la pantalla antes de montarla, con los permisos del rol ya cargados.
  if (pantallaPendiente !== null && restauracionSesionLista && isLoggedIn) {
    const inicioSesion = isAdminRole ? adminHomeScreen : "landing";
    const pantalla = esPantalla(pantallaPendiente) ? pantallaPendiente : inicioSesion;
    // Estas vistas necesitan una orden seleccionada, que vive en memoria.
    // Con el id en la URL sí se puede: se busca al cargar las órdenes.
    const requiereOrden = (pantalla === "recepcion-compra" || pantalla === "orden-detalle") &&
      idPendiente?.screen !== pantalla;
    const panelSinAcceso = ADMIN_SCREENS.includes(pantalla) &&
      (!isAdminRole || !puedeVerPantallaPanel(pantalla));
    setScreen(requiereOrden || panelSinAcceso ? inicioSesion : pantalla);
    setPantallaPendiente(null);
  }

  // Guardar la preferencia de menú en escritorio (no en celular).
  useEffect(() => {
    if (esMovil) return;
    try {
      localStorage.setItem("sivpro.menuAbierto.v1", String(menuAbierto));
    } catch {
      // almacenamiento no disponible (modo privado, cuota llena, etc.)
    }
  }, [menuAbierto, esMovil]);

  // Si la ventana pasa de móvil a escritorio con el drawer abierto, se cierra.
  useEffect(() => {
    if (!esMovil) setSidebarMovilAbierto(false);
  }, [esMovil]);

  // Mientras el drawer móvil está abierto la página de fondo no se desplaza.
  // El cleanup también restaura el overflow al desmontar.
  useEffect(() => {
    if (!isAdmin || !esMovil || !sidebarMovilAbierto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isAdmin, esMovil, sidebarMovilAbierto]);

  // Escape cierra el drawer móvil y devuelve el foco al botón hamburguesa.
  useEffect(() => {
    if (!isAdmin || !esMovil || !sidebarMovilAbierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSidebarMovilAbierto(false);
        setTimeout(() => menuButtonRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAdmin, esMovil, sidebarMovilAbierto]);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<Product>(PRODUCTS[0]);
  const [catalogCat, setCatalogCat] = useState<string | null>(null);
  // La página del catálogo vive aquí, igual que la categoría: si viviera dentro
  // de CatalogScreen se perdería al abrir el detalle de un producto (la pantalla
  // se desmonta) y al volver se restauraría el scroll guardado de la página 2
  // sobre el grid de la página 1, que es otra tanda de productos.
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [detalleOrigen, setDetalleOrigen] = useState<Screen>("landing");
  const [productoOrigenCatalogo, setProductoOrigenCatalogo] = useState<number>();
  // Órdenes de compra y compras (API, fase 3). Sin semillas: las cargan
  // `cargarOrdenesCompra`/`cargarCompras`; si falla queda el error con
  // "Reintentar" y no se vuelve a datos de ejemplo.
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [ordenesCompraCargando, setOrdenesCompraCargando] = useState(false);
  const [errorOrdenesCompra, setErrorOrdenesCompra] = useState<string | null>(null);
  const [ordenesCompraCargadas, setOrdenesCompraCargadas] = useState(false);
  const [gestiones, setGestiones] = useState<GestionCompra[]>([]);
  const [comprasCargando, setComprasCargando] = useState(false);
  const [errorCompras, setErrorCompras] = useState<string | null>(null);
  const [comprasCargadas, setComprasCargadas] = useState(false);
  // Catálogo de insumos (API). Sin semilla local: lo llena
  // `cargarInsumosFichas`; si falla se muestra el error con "Reintentar" y no
  // se vuelve a datos de ejemplo.
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [insumosCargando, setInsumosCargando] = useState(false);
  const [errorInsumos, setErrorInsumos] = useState<string | null>(null);
  // Categorías de insumos (API). Las usan Gestión de Insumos y el
  // "+ Crear insumo" de Compras; en los selectores solo entran las activas.
  const [categoriasInsumo, setCategoriasInsumo] = useState<CategoriaInsumo[]>([]);
  // Estado de carga de las órdenes de producción (API).
  const [ordenesCargando, setOrdenesCargando] = useState(false);
  const [errorOrdenes, setErrorOrdenes] = useState<string | null>(null);
  // Proveedores (API, fase 3). Sin semilla: los carga `cargarProveedores`.
  const [proveedores, setProveedores] = useState<ProveedorRef[]>([]);
  const [proveedoresCargando, setProveedoresCargando] = useState(false);
  const [errorProveedores, setErrorProveedores] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Cada cambio del carrito se guarda donde corresponde: en la clave de
  // invitado mientras no hay sesión, y en el registro del usuario en cuanto la
  // hay. Al abrirse la sesión la clave de invitado se borra porque su contenido
  // ya quedó absorbido en el carrito de la cuenta, y dejarla ahí lo volvería a
  // sumar en el próximo inicio de sesión de ese mismo usuario.
  useEffect(() => {
    if (loggedInUserId) {
      const carritos = leerCarritosDeUsuarios();
      carritos[loggedInUserId] = cart;
      escribirCarritosDeUsuarios(carritos);
      borrarCarritoGuardado();
      return;
    }
    escribirCarritoGuardado(cart);
  }, [cart, loggedInUserId]);

  // Mitad que faltaba del par leer/escribir de los roles: `leerRolesPersistidos`
  // lee `sivpro.roles.v1`, pero nada la escribía, así que cualquier rol creado
  // en "Gestión de Usuarios" desaparecía con el F5 (y el permiso que alguien
  // le había dado dejaba de servir al recargar). Ningún dato de credencial
  // entra aquí: solo id, nombre, descripción, activo y accesos.
  useEffect(() => {
    try {
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
    } catch {
      // Almacenamiento bloqueado o sin cuota: los roles siguen en memoria.
    }
  }, [roles]);

  // Las órdenes de producción, los insumos y los productos no conformes ya NO
  // se guardan en localStorage: viven en la API (respaldos locales en las
  // claves `-respaldo-fase2` y `-respaldo-cpn`).

  // Las ventas se cargan al entrar a Ventas, al Dashboard, al Inicio y a
  // Estadísticas. El backend exige el permiso "Ver" de Ventas, salvo en la
  // pantalla de Ventas, que conserva su manejo de acceso existente.
  const puedeVerVentas =
    loggedInUser?.esSuperAdmin === true ||
    canViewPermission(loggedInAccesos, KEY("Ventas", "Ventas"));
  useEffect(() => {
    if (
      screen !== "ventas-pedidos" &&
      screen !== "dashboard" &&
      screen !== "inicio" &&
      screen !== "sales-chart"
    ) return;
    if (screen !== "ventas-pedidos" && !puedeVerVentas) return;
    let cargaEnCurso = false;
    setVentasCargando(true);
    setVentasError(null);

    const cargarVentas = async (cargaInicial: boolean) => {
      if (cargaEnCurso) return;
      cargaEnCurso = true;
      const solicitudId = ++ventasSolicitudIdRef.current;
      try {
        const filas = await obtenerVentasPanel();
        if (solicitudId !== ventasSolicitudIdRef.current) return;
        setVentas(filas);
        ventasFallosConsecutivosRef.current = 0;
        setVentasError(null);
      } catch (error) {
        if (solicitudId !== ventasSolicitudIdRef.current) return;
        ventasFallosConsecutivosRef.current += 1;
        console.error("[Ventas] No se pudieron cargar las ventas.", error);
        if (cargaInicial || ventasFallosConsecutivosRef.current >= 3) {
          const detalle = error instanceof Error ? error.message : "Intenta de nuevo más tarde.";
          setVentasError(detalle);
          if (cargaInicial) {
            toast.error(detalle || "No se pudieron cargar las ventas.");
          } else if (ventasFallosConsecutivosRef.current === 3) {
            toast.error("No se han podido actualizar las ventas tras varios intentos.");
          }
        }
      } finally {
        cargaEnCurso = false;
        if (solicitudId === ventasSolicitudIdRef.current && cargaInicial) setVentasCargando(false);
      }
    };

    void cargarVentas(true);
    // El backend puede completar automáticamente las ventas "Por entregar"
    // cuando llega su hora de recogida; el refresco mantiene la lista al día.
    const id = setInterval(() => void cargarVentas(false), 60_000);
    return () => clearInterval(id);
  }, [screen, puedeVerVentas]);

  // Las fichas técnicas tampoco se guardan en localStorage: se leen y escriben
  // en la API (`-respaldo-fase2` conserva la copia local de la fase 1).

  // ── Ventas → órdenes de producción (todo lo hace la API) ──
  // La orden de una venta la crea el backend al aceptarla (tipo "Pedido") y la
  // cancela al anularla. Los dos efectos locales que replicaban ese flujo
  // desaparecen; lo único que queda es recargar las órdenes cuando el ESTADO
  // de alguna venta cambia (aceptar, anular, pasar a devolución…),
  // comparándolo contra el valor anterior para no llamar en cada render ni en
  // cada cambio de la lista.
  const estadoVentasRef = useRef<Record<string, Venta["estado"]> | null>(null);
  useEffect(() => {
    const anterior = estadoVentasRef.current;
    const actual: Record<string, Venta["estado"]> = {};
    for (const v of ventas) actual[v.id] = v.estado;
    estadoVentasRef.current = actual;
    // La primera ejecución es la carga inicial, no un cambio de estado.
    if (anterior === null) return;
    const cambio = ventas.some((v) => anterior[v.id] !== undefined && anterior[v.id] !== v.estado);
    if (!cambio) return;
    void cargarOrdenes();
  }, [ventas]);

  // Al abrir el detalle de un producto se guarda dónde estaba el catálogo. Como
  // la navegación es un simple `setScreen`, al volver el grid se rearmaba desde
  // arriba (el `scrollTo(0)` de más abajo) y el cliente perdía la sección y el
  // producto que estaba mirando. Se guarda por pantalla y se restaura al
  // regresar, sin tocar el resto de navegaciones que sí deben ir arriba.
  const scrollPorPantalla = useRef<Partial<Record<Screen, number>>>({});

  const navigate = (
    s: Screen,
    options?: { replace?: boolean; restaurar?: boolean },
  ) => {
    if (!options?.restaurar) {
      scrollPorPantalla.current[screen] = window.scrollY;
    }
    if (options?.replace && s !== screen) reemplazarRutaRef.current = true;
    setScreen(s);
    if (options?.restaurar) {
      const top = scrollPorPantalla.current[s] ?? 0;
      // Punto 2.3: la pantalla entrante tarda en montarse (`AnimatePresence
      // mode="wait"`), y al montarse las imágenes del landing aún no han
      // cargado, así que el documento puede estar más bajo que `top` y el
      // scroll se limita al máximo disponible (quedaba en otra sección).
      // Se reintenta con rAF + `setTimeout` hasta llegar al tope guardado o
      // agotar el tiempo (~3 s): cuando el documento crece por la carga de
      // imágenes, el siguiente intento ya alcanza la posición. Antes se
      // cortaba en cuanto el scroll llegaba al fondo del documento TEMPORAL
      // (imágenes sin cargar), que era mucho más arriba que el tope guardado.
      const MAX_INTENTOS = 60;
      let intentos = 0;
      const intentar = () => {
        intentos += 1;
        const doc = document.documentElement;
        const alcanzable = Math.min(
          top,
          Math.max(0, doc.scrollHeight - window.innerHeight),
        );
        window.scrollTo({ top: alcanzable, behavior: "auto" });
        if (window.scrollY !== top && intentos < MAX_INTENTOS) {
          window.setTimeout(intentar, 50);
        }
      };
      // Un doble frame para que el DOM de la pantalla entrante exista al menos.
      requestAnimationFrame(() => window.requestAnimationFrame(intentar));
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /** Desde la tabla de ventas, "Gestionar" salta al módulo de devoluciones con el
      modal de esa venta ya abierto. */
  const abrirGestionDevolucion = (id: string) => {
    setDevolucionAAbrir(id);
    navigate("devoluciones");
  };

  /** Desde Insumos, "Programar producción" salta a Orden de Producción con el
      modal de crear ya abierto y el Producto Insumo preseleccionado. */
  const abrirOrdenProduccion = (idProductoInsumo: string) => {
    setOrdenAAbrir(idProductoInsumo);
    navigate("production-orders");
  };

  /** Recarga insumos, fichas y órdenes desde la API tras una acción del módulo
      de Producción (crear un producto insumo, iniciar o completar una orden…):
      el stock de los insumos cambió en la base. */
  const recargarProduccion = async (): Promise<boolean> => {
    // CPN también: completar una preparación con merma crea su registro.
    const productosCargados = await recargarInventarioProductos();
    const resultados = await Promise.all([
      cargarInsumosFichas(productosCargados ?? productos),
      cargarOrdenes(),
      cargarNoConformes(),
    ]);
    return productosCargados !== null && resultados.every(Boolean);
  };

  const recargarInventarioProductos = async () => {
    const productosCargados = await cargarProductosGestion();
    await recargarCatalogoTrasCambio();
    return productosCargados;
  };

  /** Crear o eliminar un producto no conforme manual mueve stock en la base
      (producto de reventa o insumo): se recargan productos e insumos. */
  const recargarInventarioCpn = async () => {
    const productosCargados = await recargarInventarioProductos();
    await cargarInsumosFichas(productosCargados ?? productos);
  };

  /** "Ver orden" del toast de Insumos: salta a Orden de Producción con el
      detalle de la orden creada ya abierto. */
  const verOrdenProduccion = (idOrden: string) => {
    setOrdenDetalleAAbrir(idOrden);
    navigate("production-orders");
  };

  const openLogin = () => {
    setLoginNotice(false);
    setLoginEmailPre("");
    setLoginMensajeExito("");
    navigate("login");
  };

  // ── Invitación de empleado (?activar=<token>) ──────────────────────────
  // El enlace del correo abre la app con el token en la URL. Se lee UNA vez al
  // cargar y la URL se limpia al instante (history.replaceState), aunque el
  // enlace resulte vencido o ya usado: el token ya está en memoria. Detrás del
  // modal queda el INICIO DE SESIÓN (no la landing), que es a donde va el
  // empleado en cuanto termine de crear su contraseña.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("activar");
    if (!token) return;
    window.history.replaceState(window.history.state, "", "/");
    setActivacionToken(token);
    navigate("login");
  }, []);

  // ── Verificación de correo del registro (?verificar=<token>) ───────────
  // Igual que ?activar: se lee UNA vez, la URL se limpia al instante y se
  // confirma contra la API. Bien → login con el correo escrito y el aviso
  // verde; mal (vencido, ya usado) → login con el mensaje del backend.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("verificar");
    if (!token) return;
    window.history.replaceState(window.history.state, "", "/");
    // Se navega al login cuando responde la API: LoginScreen toma el correo
    // precargado solo al montarse.
    void verificarCorreo(token)
      .then(({ correo }) => {
        setLoginEmailPre(correo ?? "");
        setLoginMensajeExito("Correo verificado. Ya puedes iniciar sesión");
        toast.success("Correo verificado. Ya puedes iniciar sesión");
      })
      .catch((error) => {
        toast.error(
          error instanceof Error && error.message
            ? error.message
            : "No se pudo verificar el correo.",
        );
      })
      .finally(() => navigate("login"));
  }, []);

  // ── URL ↔ pantalla ─────────────────────────────────────────────────
  const idDeRuta = idPendiente?.screen === screen ? idPendiente.id
    : screen === "product-detail" ? selectedProduct.id
      : screen === "orden-detalle" ? ordenDetalle?.id
        : screen === "recepcion-compra" ? ordenRecepcion?.id
          : null;

  useRouteSync({
    screen,
    id: idDeRuta,
    pausado: pantallaPendiente !== null && isLoggedIn,
    reemplazarRef: reemplazarRutaRef,
    // Atrás / adelante del navegador.
    alVolver: ({ screen: pedida, id }) => {
      let destino = pedida;
      if (isLoggedIn && (destino === "login" || destino === "register")) {
        destino = isAdminRole ? adminHomeScreen : "landing";
      } else if (!isLoggedIn && ADMIN_SCREENS.includes(destino)) {
        destino = "login";
      }
      setIdPendiente(id && destino === pedida ? { screen: destino, id } : null);
      if (destino !== screen) navigate(destino, { restaurar: true });
    },
  });

  // Busca el producto u orden que pide la URL cuando sus datos ya llegaron.
  useEffect(() => {
    if (!idPendiente || pantallaPendiente !== null) return;
    if (screen !== idPendiente.screen) {
      setIdPendiente(null);
      return;
    }
    if (idPendiente.screen === "product-detail") {
      if (catalogoCargando) return;
      const producto = productosCatalogo
        .map((p) => productoACatalogo(p, categoriasCatalogo))
        .find((p) => String(p.id) === idPendiente.id);
      if (producto) setSelectedProduct(producto);
      else navigate("catalog", { replace: true });
    } else if (idPendiente.screen === "orden-detalle" || idPendiente.screen === "recepcion-compra") {
      if (!ordenesCompraCargadas) return;
      const orden = ordenes.find((o) => String(o.id) === idPendiente.id);
      if (!orden) navigate("orden-compra", { replace: true });
      else if (idPendiente.screen === "orden-detalle") setOrdenDetalle(orden);
      else setOrdenRecepcion(orden);
    }
    setIdPendiente(null);
  }, [idPendiente, pantallaPendiente, screen, catalogoCargando, productosCatalogo, categoriasCatalogo, ordenesCompraCargadas, ordenes]);

  /** Fin del registro público: la cuenta queda pendiente de confirmar el
      correo, así que se va al login con el correo escrito y el aviso. */
  const trasRegistrarse = (correo: string, correoEnviado: boolean) => {
    const aviso = correoEnviado
      ? "Te enviamos un correo para confirmar tu cuenta"
      : "Tu cuenta quedó creada, pero no pudimos enviar el correo. Inicia sesión y usa «Reenviar correo de confirmación»";
    setLoginEmailPre(correo);
    setLoginMensajeExito(aviso);
    if (correoEnviado) toast.success(aviso);
    else toast.warning(aviso);
    navigate("login");
  };

  /** Fin de la activación: login con el correo ya escrito y el aviso verde. */
  const trasActivarCuenta = (correo: string) => {
    setActivacionToken(null);
    setLoginEmailPre(correo);
    setLoginMensajeExito("Contraseña creada. Ya puedes iniciar sesión");
    toast.success("Contraseña creada. Ya puedes iniciar sesión");
    navigate("login");
  };

  /** El enlace no sirve (vencido, ya usado o mal formado): salida al login. */
  const irALoginDesdeActivacion = () => {
    setActivacionToken(null);
    openLogin();
  };

  /** Puente API → estado local: la ficha que arma el login cuando el correo
      no existía en el listado. Sin estar en `usuarios`, `loggedInUser` no
      resolvería y la sesión se cerraría sola. Un correo vacío nunca compara
      igual a otro vacío: si no, todos los usuarios sin correo serían "el
      mismo". */
  const agregarUsuarioLocal = (nuevo: Usuario) => {
    const em = (v: string) => v.trim().toLowerCase();
    setUsuarios((prev) =>
      prev.some(
        (u) =>
          u.id === nuevo.id ||
          (em(u.correo) !== "" && em(u.correo) === em(nuevo.correo)),
      )
        ? prev
        : [...prev, nuevo],
    );
  };

  const cierreSesionApiRef = useRef(false);
  const verificarStockYContinuar = async () => {
    const token = obtenerToken();
    if (!token || validacionStockCheckoutRef.current) return;
    validacionStockCheckoutRef.current = true;
    setValidandoStockCheckout(true);
    try {
      await recargarCatalogo({ conservarCarrito: true });
      if (obtenerToken() === token) setAbrirCheckoutTrasLogin(true);
    } catch {
      // El catálogo ya muestra el error. El cliente puede reintentar desde el carrito.
    } finally {
      validacionStockCheckoutRef.current = false;
      setValidandoStockCheckout(false);
    }
  };

  const handleLogin = (user: Usuario): { ok: boolean; mensaje?: string } => {
    setUsuarios(prev => prev.map(u => u.id === user.id ? {
      ...u,
      esSuperAdmin: user.esSuperAdmin === true,
      rolesSesionApi: user.rolesSesionApi ?? [],
    } : u));
    // Los roles de la sesión salen de lo que manda la API, aunque el rol no
    // exista en la copia local del catálogo.
    const rolesActivos: Rol[] = armarRolesSesion(user.rolesSesionApi, roles);
    // Cliente público: solo el rol Cliente → landing (portal público, nunca el
    // panel). Un empleado inactivo o sin contratación vigente llega aquí porque
    // el backend ya solo le devuelve el rol Cliente: entra y compra como cliente.
    const esClientePublico = rolesActivos.length > 0 && rolesActivos.every(esRolCliente);

    if (!esClientePublico) {
      if (rolesActivos.length === 0) {
        return { ok: false, mensaje: "Tu cuenta no tiene roles activos. Contacta al administrador." };
      }
      // El bloqueo "sin pantallas" ya NO aplica: Inicio siempre está disponible
      // para cualquiera con cuenta válida. El bloqueo restante es por cuenta
      // inactiva.
      if (!user.activo) {
        return { ok: false, mensaje: "Tu cuenta no tiene roles activos. Contacta al administrador." };
      }
    }

    cierreSesionApiRef.current = false;
    const volverAlCheckout = consumirRetornoCheckout();
    setIsLoggedIn(true);
    setLoginNotice(false);
    setLoginEmailPre("");

    const orderToResume = pendingOrder;
    if (orderToResume) {
      // El nombre que queda registrado es el del invitado (si lo
      // llegó a escribir) o el de la cuenta que inicia sesión.
      const nombrePedido = orderToResume.nombre?.trim() || user.nombre;
      void registrarPedido(
        orderToResume.metodoPago,
        orderToResume.comprobante,
        orderToResume.items,
        orderToResume.horaRecogida,
        nombrePedido,
        orderToResume.documento,
      ).then(({ id, total }) => {
        setCart([]);
        setOrderConfirmation({
          id,
          hora: formatearHora(orderToResume.horaRecogida),
          nombre: nombrePedido,
          documento: orderToResume.documento?.trim(),
          items: orderToResume.items,
          total,
        });
        window.setTimeout(() => navigate("cart"), 0);
      }).catch((error) => toast.error(error instanceof Error ? error.message : "No se pudo registrar el pedido."));
    }

    setLoggedInUserId(user.id);
    const guardado = leerCarritosDeUsuarios()[user.id] ?? [];
    setCart((prev) => fusionarCarritos(prev, guardado));

    // El backend devuelve primero el rol principal; no se infiere el rol desde
    // el nombre de cuenta ni desde las fichas locales.
    const rolesTrabajo = rolesActivos.filter(r => !["administrador", "cliente", "empleado"].includes(normalizarNombreRol(r.nombre)));
    const rolAdministrador = rolesActivos.find(r => normalizarNombreRol(r.nombre) === "administrador");
    const rolEmpleado = rolesActivos.find(r => normalizarNombreRol(r.nombre) === "empleado");
    const rolCliente = rolesActivos.find(r => normalizarNombreRol(r.nombre) === "cliente");
    // Rol activo por defecto: el primer cargo CON permisos. Un cargo sin
    // permisos (o "Empleado", que no tiene ninguno) dejaría la pantalla sin
    // módulos, así que "Empleado" es solo el ÚLTIMO recurso. La decisión toma
    // únicamente los roles que trae el API: no depende de la ficha local del
    // navegador (que en el equipo del empleado ni siquiera existe).
    const primerCargoConPermisos =
      rolesTrabajo.find(r => Object.keys(r.accesos ?? {}).length > 0) ?? null;
    const rolInicial = rolAdministrador
      ?? (esClientePublico ? rolCliente : null)
      ?? primerCargoConPermisos
      ?? rolesTrabajo[0]
      ?? rolEmpleado
      ?? rolesActivos[0]
      ?? null;
    const inicialId = rolInicial?.id ?? null;
    setRolActivoId(inicialId);
    escribirRolActivo(user.id, inicialId);
    const nextRole = rolInicial?.nombre ?? "Empleado";
    // P9: el cliente público SIEMPRE cae en la landing; un empleado NUNCA:
    // Dashboard solo si la sesión es super admin o el rol activo tiene el
    // permiso "Dashboard::Dashboard"; si no, "Inicio" (siempre disponible).
    const userEsSuperAdmin = user.esSuperAdmin === true;
    const hasDashRolInicial =
      userEsSuperAdmin || !!(rolInicial && rolInicial.accesos[DASHBOARD_PERM_KEY]?.includes("Ver"));
    const nextScreen = esClientePublico
      ? "landing"
      : hasDashRolInicial
        ? "dashboard"
        : "inicio";

    setUserRole(nextRole);
    if (volverAlCheckout) {
      navigate("cart");
      void verificarStockYContinuar();
    } else if (!orderToResume) {
      navigate(facturaPedidoId ? "mis-pedidos" : nextScreen);
    }
    return { ok: true };
  };

  /** Bloque 5 — Tope de UNA línea del carrito considerando TODO lo que ya
      hay en el carrito (punto 2):
      · Producto que NO está en el catálogo público (ningún nombre casa, está
        borrado/renombrado o el catálogo aún no cargó): sin límite.
      · Pizza: stock de porciones del tamaño de la línea. Lasaña y bebida:
        stock físico del producto. En todos los casos se descuentan las
        unidades del mismo producto/tamaño que ya hay en otras líneas.
      `max` es el TOTAL que la línea puede tener: la propia línea se excluye
      de los consumos ajenos por id; sin id —tarjeta y detalle— todo el
      carrito cuenta. El mínimo sigue siendo 1 (lo aplican los puntos que
      usan este tope).
      NO lee `productos` (Gestión de Productos): esa lista solo se carga con
      sesión, así que sin login el tope salía siempre `undefined` y las
      pizzas/lasañas con stock 0 se podían agregar. Stock y tipo salen del
      CATÁLOGO PÚBLICO, cargado igual para todos los roles. */
  const limiteDeLinea = (
    linea: LineaLimiteRef,
    carrito: CartItem[],
  ): LimiteLinea => {
    const nombre = linea.product.name;
    const mismoNombre = (n?: string) =>
      normalizarNombre(n ?? "") === normalizarNombre(nombre);
    const enCatalogo = productosCatalogo.find((p) => mismoNombre(p.nombre));
    if (!enCatalogo) return { max: undefined, elaborado: false };
    const enCategoria = categoriasCatalogo.find(
      (c) => c.id === enCatalogo.idCategoria,
    )?.nombre;
    const elaborado = tipoDe(enCatalogo, enCategoria) === "Producto insumo";
    // Lo que ya consumen las OTRAS líneas (la propia no se cuenta dos veces).
    const otras = carrito.filter((l) => l.id !== linea.id);

    // Pizzas consumen stock por tamaño; los otros productos mantienen su stock
    // habitual. El menú nunca vende más porciones de las que hay preparadas.
    const esPizza =
      enCatalogo.idCategoria === "1" ||
      enCatalogo.idCategoria === "CAT-001" ||
      enCategoria?.toLowerCase().includes("pizza") === true;
    const stock = limiteStockDe(enCatalogo, linea.size);
    if (esPizza && enCatalogo.stockPartes != null) {
      const consumo = otras.filter((l) => mismoNombre(l.product.name))
        .map((l) => ({ tamano: l.size, cantidad: l.quantity }));
      return { max: disponiblePizza(enCatalogo.stockPartes, linea.size, consumo), elaborado, stock };
    }
    if (stock === undefined || !Number.isFinite(stock)) {
      return { max: undefined, elaborado };
    }
    const enOtras = otras
      .filter((l) => mismoNombre(l.product.name) && (!esPizza || l.size === linea.size))
      .reduce((s, l) => s + (l.quantity || 0), 0);
    return { max: Math.max(0, Math.floor(stock - enOtras)), elaborado, stock };
  };

  /** Bloque 5 — Agregar 1 unidad desde la tarjeta. Devuelve si algo se
      agregó: si la línea ya está en su máximo NO se agrega nada y trae el
      mensaje de máximo, para que el toast nunca diga "agregada al carrito"
      sin que se haya agregado nada (punto 4). */
  const quickAdd = (
    product: Product,
  ): { agregado: boolean; mensaje?: string } => {
    const size = sizeDe(product, 0);
    // El botón suma 1 con el tamaño por defecto, pero si ya hay una línea
    // sin extras de ESTE producto el +1 se acumula en ella: el tope es el
    // de ESA línea (la propia no se cuenta dos veces como consumo ajeno).
    const existente = cart.find(
      (i) => i.product.id === product.id && i.size === size.label && i.selectedExtras.length === 0,
    );
    const objetivo = limiteDeLinea(
      existente ?? { product, size: size.label },
      cart,
    );
    const max = objetivo.max;
    const adicional =
      max === undefined ? undefined : max - (existente?.quantity ?? 0);
    if (max !== undefined && (adicional ?? 0) <= 0) {
      return {
        agregado: false,
        mensaje: mensajeMaximoDe(
          product.name,
          max,
          existente?.size ?? size.label,
          objetivo.elaborado,
        ),
      };
    }
    setCart((prev) => {
      if (existente) {
        return prev.map((i) =>
          i.id === existente.id
            // Si ya está en el máximo, el clic no suma (la cantidad se
            // ajusta sola); las líneas nuevas siempre entran con 1.
            ? { ...i, quantity: ajustarCantidad(i.quantity + 1, max) }
            : i,
        );
      }
      return [
        ...prev,
        {
          id: `${product.id}-${Date.now()}`,
          product,
          quantity: 1,
          size: size.label,
          sizePrice: size.price,
          selectedExtras: [],
          extrasPrice: 0,
        },
      ];
    });
    return { agregado: true };
  };

  // Punto 2.4: agregar desde el detalle acumulaba unidades en líneas separadas
  // aunque el producto, el tamaño y los extras fueran idénticos (quickAdd y
  // fusionarCarritos ya lo hacían). Se reutiliza `mismaConfig`: si la misma
  // configuración ya está en el carrito, se suman las unidades a esa línea (la
  // primera que entró); si no, se agrega al final.
  /** Bloque 5 — Agregar desde el detalle. El ítem todavía no está en el
      carrito (id nuevo): todas las líneas cuentan como ajenas, así `max`
      son las unidades que se pueden AGREGAR ahora. Devuelve si algo se
      agregó y, si no, el mensaje de máximo (punto 4: el toast jamás dice
      "agregada" sin agregar nada). */
  const addDetailed = (
    item: CartItem,
  ): { agregado: boolean; mensaje?: string } => {
    const objetivo = limiteDeLinea(item, cart);
    const max = objetivo.max;
    const existente = cart.find((x) => mismaConfig(x, item));
    const actual = existente?.quantity ?? 0;
    const disponible =
      max === undefined
        ? item.quantity
        : Math.max(0, Math.min(item.quantity, max));
    if (disponible <= 0) {
      return {
        agregado: false,
        mensaje: mensajeMaximoDe(
          item.product.name,
          max ?? 0,
          (existente ?? item).size,
          objetivo.elaborado,
        ),
      };
    }
    setCart((p) => {
      const i = p.findIndex((x) => mismaConfig(x, item));
      if (i === -1) return [...p, { ...item, quantity: disponible }];
      return p.map((x, idx) =>
        idx === i
          // El tope de la línea fusionada es el `max` (que ya descuenta lo
          // que había en el carrito) más lo que había en ESTA línea.
          ? {
            ...x,
            quantity: ajustarCantidad(
              x.quantity + disponible,
              max === undefined ? undefined : max + actual,
            ),
          }
          : x,
      );
    });
    return { agregado: true };
  };

  /** Bloque 2: "+ Crear producto" desde Nueva Compra / Orden de Compra /
      Recepción. El producto entra al catálogo del panel por el MISMO setter
      que usa Gestión de Productos, vía callback: al conectar la API este será
      el único punto a cambiar (una sola llamada de creación). */
  const crearProductoDesdeCompras = async (p: Producto) => crearProductoEnServidor({
    ...p,
    tipo: TIPOS_PRODUCTO[1],
    precioUnitario: 0,
    estado: "No disponible",
    unidadVenta: "und",
  });

  const registrarPedido = async (
    metodoPago: string,
    comprobante: string,
    items: CartItem[],
    horaRecogida: string,
    clienteNombre?: string,
    clienteDocumento?: string,
    clienteTelefono?: string,
  ): Promise<{ id: string; total: number }> => {
    const itemsConId = items.map((item) => {
      const producto = productosCatalogo.find((p) => normalizarNombre(p.nombre) === normalizarNombre(item.product.name));
      return { item, id: producto ? Number(producto.id) : NaN };
    });
    if (itemsConId.some(({ id }) => !Number.isSafeInteger(id) || id <= 0)) {
      throw new Error("No se pudo identificar uno de los productos del catálogo. Actualiza la página e intenta de nuevo.");
    }
    const creada = await crearVentaCliente({
      hora_recogida: horaRecogida,
      productos: itemsConId.map(({ item, id }) => ({
        id_producto: id,
        cantidad: item.quantity,
        tamano: /bebida/i.test(item.product.category ?? "") ? null : item.size,
      })),
      pago: { tipo: metodoPago, comprobante },
    });
    setVentas((prev) => [creada.venta, ...prev]);
    return { id: creada.id, total: creada.total };
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setCart((p) => p.filter((i) => i.id !== id));
      return;
    }
    setCart((p) =>
      p.map((i) =>
        i.id === id
          ? {
            ...i,
            // Bloque 5: máximo el tope de ESTA línea con todo el resto
            // del carrito (la propia no se cuenta dos veces); si quien
            // edita se pasa, la cantidad se ajusta sola. El mínimo sigue
            // siendo 1 y el − en 1 sigue quitando la línea (como siempre).
            quantity: ajustarCantidad(qty, limiteDeLinea(i, p).max),
          }
          : i,
      ),
    );
  };

  const remove = (id: string) => {
    setCart((p) => p.filter((i) => i.id !== id));
    toast.success("Producto eliminado del carrito");
  };

  const clearAuthStorage = () => {
    for (const storage of [window.localStorage, window.sessionStorage]) {
      try {
        for (const key of AUTH_STORAGE_KEYS) storage.removeItem(key);
      } catch {
        // El almacenamiento puede estar bloqueado por el navegador.
      }
    }

    // Solo se pueden eliminar cookies accesibles desde JavaScript.
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=", 1)[0]?.trim();
      if (name) document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  };

  // El frontend actual no tiene endpoint de logout. Si se configura uno para
  // una integración futura, la limpieza local sigue ocurriendo en finally.
  /** Cierra la sesión.
   *
   * `silenciarAviso` evita el toast "Has cerrado sesión correctamente" cuando
   * el cierre es un paso interno (p. ej. tras cambiar la contraseña, donde el
   * aviso es otro y dos toasts seguidos solo enredan).
   * `aviso` permite reemplazar el mensaje de cierre (p. ej. inactividad).
   * `destino` permite ir directo a "login" sin pasar por la landing. */
  const logout = async (opciones?: {
    silenciarAviso?: boolean;
    aviso?: string;
    destino?: Screen;
    conservarCarrito?: boolean;
  }) => {
    const silenciarAviso = opciones?.silenciarAviso ?? false;
    const aviso = opciones?.aviso ?? "Has cerrado sesión correctamente";
    const destino: Screen = esRutaLicencias() ? "licencias" : opciones?.destino ?? "landing";
    try {
      const endpoint = import.meta.env.VITE_AUTH_LOGOUT_URL;
      if (endpoint) {
        await fetch(endpoint, { method: "POST", credentials: "include" });
      }
    } catch {
      // La sesión local debe cerrarse aunque el servidor no responda.
    } finally {
      clearAuthStorage();
      borrarToken();
      borrarSesionGuardada();
      borrarRetornoCheckout();
      setIsLoggedIn(false);
      setUserRole("");
      setLoggedInUserId(null);
      setAbrirCheckoutTrasLogin(false);
      if (!opciones?.conservarCarrito) setCart(leerCarritoGuardado());
      setRolActivoId(null);
      setPantallaPendiente(null);
      navigate(destino, { replace: true });
      if (!silenciarAviso) {
        toast.success(aviso);
      }
    }
  };

  const requerirLoginCheckout = () => {
    guardarRetornoCheckout();
    openLogin();
    setLoginNotice(true);
  };

  const checkoutUnauthorized = async () => {
    if (isLoggedIn) {
      await logout({ silenciarAviso: true, destino: "login", conservarCarrito: true });
    }
    requerirLoginCheckout();
  };

  useEffect(() => registrarManejadorCierreSesion((mensaje) => {
    cierreSesionApiRef.current = true;
    void logout({ silenciarAviso: true, destino: "login" }).then(() => {
      toast.error(mensaje);
    });
  }), [logout]);

  useEffect(() => {
    if (!isLoggedIn || !obtenerToken()) return;

    let activa = true;
    let validando = false;
    const validarSesion = async () => {
      if (!activa || validando || !obtenerToken()) return;
      validando = true;
      try {
        await obtenerPerfil();
      } catch (error) {
        const status = (error as ApiErrorConEstado).status;
        if (status !== 401) {
          console.error("No se pudo validar la sesión con el servidor.", error);
        }
      } finally {
        validando = false;
      }
    };

    const intervalo = window.setInterval(() => void validarSesion(), 30 * 1000);
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "visible") void validarSesion();
    };
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    window.addEventListener("focus", validarSesion);

    return () => {
      activa = false;
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      window.removeEventListener("focus", validarSesion);
    };
  }, [isLoggedIn, loggedInUserId]);

  /** Refresca el perfil del usuario de la sesión desde GET /auth/me y hace
   *  merge en la lista local `usuarios` (nombre, correo, teléfono, tipo y
   *  número de documento). Se usa al restaurar la sesión (F5) y al entrar a
   *  las pantallas de perfil: así el teléfono y el documento no dependen de
   *  lo que haya quedado en el estado local. */
  const [perfilEstado, setPerfilEstado] = useState<"idle" | "cargando" | "error">("idle");
  const [perfilErrorMsg, setPerfilErrorMsg] = useState<string | null>(null);

  const refrescarPerfil = async (): Promise<boolean> => {
    if (!obtenerToken() || !loggedInUserId) return false;
    setPerfilEstado("cargando");
    try {
      const perfil = await obtenerPerfil();
      const id = String(perfil.id);
      const clavePerfil = clavePersona(
        perfil.tipoDocumento ?? "",
        perfil.numeroDocumento ?? "",
        perfil.correo ?? "",
      );
      const puedeCruzarPorIdentidad =
        docValida(claveDoc(perfil.tipoDocumento ?? "", perfil.numeroDocumento ?? "")) ||
        Boolean(perfil.correo?.trim());
      if (loggedInUserId !== id) setLoggedInUserId(id);
      setUsuarios(prev => {
        const existente = prev.find(u => u.id === id) ?? (
          puedeCruzarPorIdentidad
            ? prev.find(u =>
              clavePersona(u.tipoDocumento, u.numeroDocumento, u.correo) === clavePerfil,
            )
            : undefined
        );
        const rolIdsApi = (perfil.roles ?? []).flatMap(rolApi => {
          const local = roles.find(r => normalizarNombreRol(r.nombre) === normalizarNombreRol(rolApi.nombre));
          return local ? [local.id] : [];
        });
        const nombre = perfil.nombre || existente?.nombre || "";
        const base: Usuario = {
          ...(existente ?? {} as Usuario),
          id,
          nombre,
          iniciales: existente?.iniciales ?? nombre.trim().split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join("").toUpperCase(),
          avatarColor: existente?.avatarColor ?? AVATAR_PALETTE[0],
          correo: (perfil.correo || existente?.correo || "").trim().toLowerCase(),
          telefono: perfil.telefono || existente?.telefono || "",
          tipoDocumento: perfil.tipoDocumento || existente?.tipoDocumento || "",
          numeroDocumento: perfil.numeroDocumento || existente?.numeroDocumento || "",
          rolIds: rolIdsApi.length ? rolIdsApi : existente?.rolIds ?? [],
          rolId: rolIdsApi[0] ?? existente?.rolId ?? "",
          activo: existente?.activo ?? true,
          esSuperAdmin: perfil.esSuperAdmin === true,
          rolCuentaApi: perfil.rol,
          rolesSesionApi: perfil.roles ?? [],
        };
        return existente
          ? prev.map(u => u.id === existente.id ? base : u)
          : [...prev, base];
      });
      setPerfilEstado("idle");
      setPerfilErrorMsg(null);
      return true;
    } catch (error) {
      setPerfilEstado("error");
      setPerfilErrorMsg(
        error instanceof Error
          ? `No pudimos cargar tu información del servidor: ${error.message}`
          : "No pudimos cargar tu información del servidor. Inténtalo de nuevo.",
      );
      return false;
    }
  };

  /** Guarda SOLO correo y teléfono contra PUT /auth/perfil y actualiza la
   *  lista local con la respuesta del servidor. */
  const guardarPerfilBackend = async (datos: {
    correo: string;
    telefono: string;
  }): Promise<{ ok: boolean; campo?: "correo" | "telefono" | "general"; mensaje?: string }> => {
    try {
      const perfil = await actualizarPerfil(datos);
      const id = String(perfil.id);
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
              ...u,
              correo: (perfil.correo || datos.correo).trim().toLowerCase(),
              telefono: perfil.telefono || datos.telefono,
            }
            : u,
        ),
      );
      if (id === loggedInUserId && loggedInUser) {
        const sesion = leerSesionGuardada();
        if (sesion?.userId === id) {
            escribirSesionGuardada({
              ...sesion,
              avatarInicial: loggedInUser.iniciales.charAt(0).toUpperCase(),
              avatarColor: loggedInUser.avatarColor,
            });
        }
      }
      return { ok: true };
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : "No se pudo guardar el perfil.";
      const status = (error as { status?: number }).status;
      // 409 = correo ya registrado (lo dice el backend para el campo correo).
      if (status === 409 || /correo/i.test(mensaje)) {
        return { ok: false, campo: "correo", mensaje };
      }
      return { ok: false, campo: "general", mensaje };
    }
  };

  /** Refresca el perfil al restaurar la sesión (F5) y cada vez que se entra a
   *  una pantalla de perfil. El estado de carga/error lo pintan las pantallas. */
  useEffect(() => {
    if (sesionActiva && !restauracionSesionLista) return;
    if (!isLoggedIn || !loggedInUserId) return;
    if (
      screen === "client-profile" ||
      screen === "store-profile" ||
      screen === "profile"
    ) {
      void refrescarPerfil();
    }
  }, [screen, isLoggedIn, loggedInUserId, restauracionSesionLista]);

  useEffect(() => {
    if (!sesionActiva) return;
    let cancelado = false;
    let reintento: number | undefined;
    const restaurar = async () => {
      if (!obtenerToken()) {
        if (!cancelado && !cierreSesionApiRef.current) void logout();
        return;
      }
      const correcto = await refrescarPerfil();
      if (cancelado) return;
      if (correcto) {
        setRestauracionSesionLista(true);
        return;
      }
      if (!obtenerToken()) {
        if (!cierreSesionApiRef.current) void logout();
        return;
      }
      // Un fallo de red no prueba que el token sea inválido ni que falten roles.
      reintento = window.setTimeout(() => void restaurar(), 5000);
    };
    void restaurar();
    return () => {
      cancelado = true;
      if (reintento !== undefined) window.clearTimeout(reintento);
    };
    // La restauración solo debe iniciarse una vez por sesión persistida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesionActiva?.userId]);

  /** Final del cambio de contraseña desde "Mi perfil": aviso, cierre de
   *  sesión con la MISMA función del botón "Cerrar sesión" (el carrito se
   *  conserva) y llegada a "Iniciar sesión" con el correo ya escrito. */
  const trasCambiarContrasena = async (correo: string) => {
    toast.success(
      "Contraseña actualizada. Inicia sesión con tu nueva contraseña.",
    );
    // El correo se fija ANTES de navegar: si se hiciera después, LoginScreen
    // ya se habría montado con `initialEmail` vacío y `useState` no lo tomaría.
    setLoginEmailPre(correo);
    await logout({ silenciarAviso: true, destino: "login" });
  };

  const isAuth = screen === "login" || screen === "register";

  useEffect(() => {
    if (isLoggedIn && !hasValidSession && !pendingOrder) void logout();
  }, [isLoggedIn, hasValidSession, pendingOrder]);

  // ── Sesión persistente y cierre por inactividad ─────────────────────
  // Marca de tiempo de la última actividad del usuario (mouse, tecla, clic,
  // scroll o toque). Vive en un ref para no re-renderizar en cada evento.
  const ultimaActividadRef = useRef<number>(
    sesionActiva?.ultimaActividad ?? Date.now(),
  );

  // Aviso si la sesión se borró por haber pasado más de 15 min sin actividad.
  useEffect(() => {
    if (sesionArranque.estado === "expirada") {
      toast("Tu sesión se cerró por inactividad");
    }
  }, [sesionArranque.estado]);

  // Persiste la sesión (usuario + rol activo + pantalla) mientras haya login.
  // Al cerrar sesión, `logout` ya borra la clave.
  useEffect(() => {
    if (!isLoggedIn || !loggedInUserId || pantallaPendiente !== null) return;
    escribirSesionGuardada({
      userId: loggedInUserId,
      rolActivo: rolActivoId,
      screen: screen === "licencias" ? leerSesionGuardada()?.screen ?? "landing" : screen,
      ultimaActividad: ultimaActividadRef.current,
      avatarInicial: avatarParaHeader?.iniciales.charAt(0).toUpperCase(),
      avatarColor: avatarParaHeader?.avatarColor,
    });
  }, [isLoggedIn, loggedInUserId, rolActivoId, screen, pantallaPendiente, avatarParaHeader?.iniciales, avatarParaHeader?.avatarColor]);

  // Inactividad: escucha de eventos de actividad con throttle (máx. una vez
  // cada 30 s) y un intervalo que revisa cada 30 s si pasaron 15 min. Usa refs
  // para no depender de valores que cambian en cada render (si no, el intervalo
  // se re-crearía sin cesar y nunca detectaría la inactividad).
  const logoutRef = useRef(logout);
  useEffect(() => {
    logoutRef.current = logout;
  });
  const sesionActualRef = useRef({
    loggedInUserId,
    rolActivoId,
    screen: pantallaPendiente ?? screen,
    avatarInicial: avatarParaHeader?.iniciales.charAt(0).toUpperCase(),
    avatarColor: avatarParaHeader?.avatarColor,
  });
  useEffect(() => {
    sesionActualRef.current = {
      loggedInUserId,
      rolActivoId,
      screen: pantallaPendiente ?? screen,
      avatarInicial: avatarParaHeader?.iniciales.charAt(0).toUpperCase(),
      avatarColor: avatarParaHeader?.avatarColor,
    };
  }, [loggedInUserId, rolActivoId, screen, pantallaPendiente, avatarParaHeader?.iniciales, avatarParaHeader?.avatarColor]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const registrarActividad = () => {
      const ahora = Date.now();
      if (ahora - ultimaActividadRef.current < ACTIVIDAD_THROTTLE_MS) return;
      ultimaActividadRef.current = ahora;
      // Mantener viva la sesión en localStorage (valor compartido entre
      // pestañas) para que la actividad de esta alimente el chequeo global.
      const {
        loggedInUserId: uid,
        rolActivoId: rid,
        screen: scr,
        avatarInicial,
        avatarColor,
      } = sesionActualRef.current;
      if (uid) {
        escribirSesionGuardada({
          userId: uid,
          rolActivo: rid,
          screen: scr === "licencias" ? leerSesionGuardada()?.screen ?? "landing" : scr,
          ultimaActividad: ahora,
          avatarInicial,
          avatarColor,
        });
      }
    };

    const eventos: (keyof WindowEventMap)[] = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];
    for (const ev of eventos) window.addEventListener(ev, registrarActividad, { passive: true });

    const intervalo = window.setInterval(() => {
      // Revisar la marca guardada (que otras pestañas pudieron refrescar).
      const guardada = leerSesionGuardada();
      const ultima = Math.max(
        ultimaActividadRef.current,
        guardada?.ultimaActividad ?? 0,
      );
      if (Date.now() - ultima >= INACTIVIDAD_MS) {
        void logoutRef.current({ silenciarAviso: true, aviso: "Tu sesión se cerró por inactividad" });
      }
    }, 30 * 1000);

    return () => {
      for (const ev of eventos) window.removeEventListener(ev, registrarActividad);
      window.clearInterval(intervalo);
    };
  }, [isLoggedIn]);

  // Sincronización entre pestañas: cerrar sesión en una la cierra en todas, y
  // la actividad de otra pestaña mantiene viva la de esta.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SESION_STORAGE_KEY) return;
      if (e.newValue === null) {
        // Otra pestaña cerró sesión.
        if (isLoggedIn) void logoutRef.current({ silenciarAviso: true, aviso: "Se cerró la sesión en otra pestaña" });
        return;
      }
      // Otra pestaña refrescó la actividad: adoptar la marca más reciente.
      try {
        const s = JSON.parse(e.newValue) as SesionGuardada;
        if (typeof s.ultimaActividad === "number" && s.ultimaActividad > ultimaActividadRef.current) {
          ultimaActividadRef.current = s.ultimaActividad;
        }
      } catch {
        // Dato corrupto: se ignora.
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [isLoggedIn]);

  // La confirmación de pedido solo vive mientras se ve el carrito:
  // antes se asignaba (en el login y al enviar) y jamás se limpiaba,
  // así que volver al carrito después de un pedido volvía a mostrar
  // "¡Pedido recibido!". Al cambiar de pantalla se borra; los botones
  // de la propia confirmación también la limpian antes de navegar.
  useEffect(() => {
    if (screen !== "cart") setOrderConfirmation(null);
  }, [screen]);

  // P9 — guard de rutas del panel: un cliente público (`esClientePublico`) NO
  // es `isAdminRole`, así que si de algún modo aterriza en una pantalla del
  // panel (`ADMIN_SCREENS`, que cubre todos los módulos del back-office) se le
  // manda de vuelta a la landing. Lo mismo aplica a una sesión inválida. El
  // rol "Cliente" solo da acceso al portal público (landing / catálogo /
  // mis-pedidos), nunca al panel.
  if (
    pantallaPendiente === null && (!hasValidSession || !isAdminRole) &&
    ADMIN_SCREENS.includes(screen)
  ) {
    setTimeout(() => navigate("landing", { replace: true }), 0);
  }

  // "Mis pedidos" requiere sesión válida. Antes este guard navegaba
  // desde el render (setTimeout dentro del cuerpo del componente);
  // ahora corre como efecto, después de pintar. Un cliente logueado
  // (rol "Cliente" o con ficha en usuarios) tiene sesión válida y
  // NO es redirigido a la landing.
  useEffect(() => {
    if (!hasValidSession && screen === "mis-pedidos") {
      if (facturaPedidoId) navigate("login");
      else navigate("landing", { replace: true });
    }
  }, [facturaPedidoId, hasValidSession, screen, navigate]);

  if (pantallaPendiente === null && isAdminRole && !puedeVerPantallaPanel(screen)) {
    setTimeout(() => navigate(adminHomeScreen), 0);
  }

  const cargandoPantalla = (
    <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Cargando">
      <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );

  const alternarMenu = () => {
    if (esMovil) {
      if (!sidebarMovilAbierto) {
        setSidebarMovilAbierto(true);
        requestAnimationFrame(() => firstNavRef.current?.focus());
      } else {
        setSidebarMovilAbierto(false);
      }
    } else if (!menuAbierto) {
      setMenuAbierto(true);
      requestAnimationFrame(() => firstNavRef.current?.focus());
    } else {
      setMenuAbierto(false);
    }
  };

  const sideW = isAdmin
    ? esMovil
      ? ""
      : menuAbierto
        ? "ml-[280px]"
        : "ml-0"
    : "";

  const isLockedScreen = isAdmin && (
    screen === "clientes" || screen === "users" || screen === "empleados" ||
    // Módulo de Compra / Orden de Compra: ocupa el viewport y scrollea por dentro
    screen === "orden-compra" || screen === "nueva-orden-compra" ||
    screen === "recepcion-compra" || screen === "gestion-compra" ||
    screen === "nueva-compra" || screen === "orden-detalle" ||
    // Proveedores: ocupa el viewport y sin scroll de página (la tabla se
    // pagina en bloques de 5 en vez de crecer hasta hacer scroll).
    screen === "suppliers"
  );

  return (
    <div
      className={`min-h-screen bg-background text-foreground${isAdmin ? " panel-admin" : " app-publica"}`}
      data-panel-texto-grande={isAdmin ? "" : undefined}
      style={{ fontFamily: "var(--font-texto)" }}
    >
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          // Todas las alertas del sistema (landing y panel) duran 2 segundos.
          duration: 2000,
          // En celular el botón de acción del toast ("Ver carrito") llega a 44 px.
          classNames: { actionButton: "max-md:!h-11 max-md:!px-4 max-md:!text-sm" },
          style: {
            fontFamily: "var(--font-texto)",
            fontSize: isAdmin ? "16px" : "15px",
          },
        }}
      />

      {/* Invitación de empleado: el modal "Crea tu contraseña" se abre sobre
          cualquier pantalla mientras el token de ?activar siga en memoria. */}
      {activacionToken && (
        <ActivarCuentaModal
          token={activacionToken}
          onActivada={trasActivarCuenta}
          onCerrar={() => setActivacionToken(null)}
          onIrALogin={irALoginDesdeActivacion}
        />
      )}

      {/* Sidebar */}
      {isAdmin && (
        <Sidebar
          current={screen}
          navigate={navigate}
          abierto={esMovil ? sidebarMovilAbierto : menuAbierto}
          userName={sesionRestaurandose ? "" : loggedInUserName}
          menuButtonRef={menuButtonRef}
          onToggleMenu={alternarMenu}
          accesos={loggedInAccesos}
          esSuperAdminSesion={esSuperAdminSesion}
          hasDashboardAccess={hasDashboardAccess}
          esMovil={esMovil}
          onCerrarMovil={() => {
            setSidebarMovilAbierto(false);
            setTimeout(() => menuButtonRef.current?.focus(), 0);
          }}
          firstNavRef={firstNavRef}
        />
      )}

      <div
        className={`transition-[margin] duration-200 motion-reduce:transition-none ${sideW} flex flex-col min-h-screen${isLockedScreen ? " h-dvh min-h-dvh overflow-hidden max-[820px]:h-[calc(100dvh-4rem)] max-[820px]:min-h-0" : ""}`}
      >
        {/* Public navbar */}
        {!isAdmin && !isAuth && (
          <PublicNav
            navigate={navigate}
            onLogin={openLogin}
            cart={cart}
            isLoggedIn={isLoggedIn}
            isStaff={isStaff}
            loggedInUser={avatarParaHeader}
            perfilPendiente={sesionRestaurandose && Boolean(sesionActiva?.userId)}
            onLogout={logout}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        )}

        {/* Admin topbar */}
        {isAdmin && (
          <AdminTopBar
            current={screen}
            onToggleSidebar={alternarMenu}
            esMovil={esMovil}
            menuVisible={esMovil ? sidebarMovilAbierto : menuAbierto}
            menuButtonRef={menuButtonRef} ordenAEditar={ordenAEditar}
            navigate={navigate}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            userName={sesionRestaurandose ? "" : loggedInUserName}
            roleName={sesionRestaurandose ? "" : loggedInRoleName}
            homeScreen={adminHomeScreen}
            rolesParaCambiar={rolesParaCambiar}
            onCambiarRol={rolesDeTrabajo.length > 0 && normalizarNombreRol(loggedInRoleName) !== "administrador" ? cambiarRolActivo : undefined}
          />
        )}

        {/* Screen content */}
        <main
          className={[
            !isAdmin && !isAuth ? "pb-20 md:pb-0" : "",
            !isAdmin && !isAuth && screen !== "landing"
              ? "pt-20"
              : "",
            isLockedScreen ? " flex-1 min-h-0" : "",
            isLockedScreen ? " overflow-y-auto" : "",
          ].join(" ")}
        >
          {/* Aviso fijo del catálogo público: solo aparece si la API no respondió.
              Va con posición fija para no desplazar ni alterar el layout existente
              (evita CLS y no cambia el diseño en el caso normal de éxito). */}
          {catalogoError && (
            <div
              role="alert"
              className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[min(92vw,26rem)] rounded-2xl border border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-950/80 p-4 shadow-xl backdrop-blur"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-300 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                    No pudimos cargar el menú
                  </p>
                  <p className="mt-1 text-xs text-red-700/90 dark:text-red-200/80">
                    Revisa tu conexión o inténtalo de nuevo en unos segundos.
                  </p>
                  <button
                    type="button"
                    onClick={() => void recargarCatalogo().catch(() => { })}
                    disabled={catalogoCargando}
                    className="max-md:min-h-11 max-md:inline-flex max-md:items-center max-md:justify-center mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${catalogoCargando ? "animate-spin" : ""}`} />
                    {catalogoCargando ? "Reintentando…" : "Reintentar"}
                  </button>
                </div>
              </div>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              className="h-full"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Suspense fallback={cargandoPantalla}>
                <LandingErrorBoundary resetKey={screen}>
                  {screen === "landing" && (
                    <Landing
                      navigate={navigate}
                      setProduct={setSelectedProduct}
                      onCategoryNavigate={(cat) => {
                        setCatalogCat(cat);
                        navigate("catalog");
                      }}
                      categorias={categoriasCatalogo}
                      productos={productosCatalogo}
                      onOpenDetail={(p) => {
                        setDetalleOrigen("landing");
                        setSelectedProduct(p);
                        navigate("product-detail");
                      }}
                    />
                  )}
                  {screen === "catalog" && (
                    <CatalogScreen
                      navigate={navigate}
                      setProduct={setSelectedProduct}
                      quickAdd={quickAdd}
                      categoria={catalogCat}
                      setCategoria={setCatalogCat}
                      page={catalogPage}
                      setPage={setCatalogPage}
                      search={catalogSearch}
                      setSearch={setCatalogSearch}
                      onOpenDetail={(p) => {
                        setDetalleOrigen("catalog");
                        setProductoOrigenCatalogo(p.id);
                        setSelectedProduct(p);
                        navigate("product-detail");
                      }}
                      cart={cart}
                      updateQty={updateQty}
                      limiteDe={(linea) => limiteDeLinea(linea, cart)}
                      categorias={categoriasCatalogo}
                      productos={productosCatalogo.map((p) => productoACatalogo(p, categoriasCatalogo))}
                    />
                  )}
                  {idPendiente?.screen === screen && cargandoPantalla}
                  {screen === "product-detail" && !idPendiente && (
                    <ProductDetailScreen
                      key={selectedProduct.id}
                      product={selectedProduct}
                      catalogProducts={productosCatalogo.map((p) => productoACatalogo(p, categoriasCatalogo))}
                      onOpenRelated={(p) => {
                        setSelectedProduct(p);
                        window.scrollTo({ top: 0, behavior: "instant" });
                      }}
                      navigate={navigate}
                      addDetailed={addDetailed}
                      limiteDe={(linea) => limiteDeLinea(linea, cart)}
                      onBack={() => {
                        navigate(detalleOrigen, { restaurar: true });
                        // Al volver al catálogo, hace scroll a la tarjeta del producto
                        // que se abrió (data-producto-id en ProductCard). Mismo criterio
                        // de reintentos que `navigate(restaurar)`: la tarjeta tarda en
                        // montarse por la transición de salida (AnimatePresence).
                        if (detalleOrigen === "catalog" && productoOrigenCatalogo !== undefined) {
                          let intentosCard = 0;
                          const buscarTarjeta = () => {
                            intentosCard += 1;
                            const el = document.querySelector(`[data-producto-id="${productoOrigenCatalogo}"]`);
                            if (!el) {
                              // Mismo presupuesto amplio que `navigate(restaurar)`:
                              // la tarjeta tarda en montarse por la transición de
                              // salida (AnimatePresence) y en aparecer las imágenes.
                              if (intentosCard < 40) window.setTimeout(buscarTarjeta, 50);
                              return;
                            }
                            el.scrollIntoView({ block: "center" });
                          };
                          requestAnimationFrame(buscarTarjeta);
                        }
                      }}
                      backLabel={detalleOrigen === "catalog" ? "Volver al menú" : "Volver al inicio"}
                    />
                  )}
                  {screen === "cart" && (
                    <CartScreen
                      cart={cart}
                      navigate={navigate}
                      updateQty={updateQty}
                      limiteDe={(linea) => limiteDeLinea(linea, cart)}
                      remove={remove}
                      clear={() => setCart([])}
                      onOrder={registrarPedido}
                      isLoggedIn={isLoggedIn}
                      onRequireCheckoutLogin={requerirLoginCheckout}
                      onCheckoutUnauthorized={() => void checkoutUnauthorized()}
                      abrirCheckoutTrasLogin={abrirCheckoutTrasLogin}
                      onCheckoutAbierto={() => setAbrirCheckoutTrasLogin(false)}
                      validandoStockCheckout={validandoStockCheckout}
                      onVerificarStock={() => void verificarStockYContinuar()}
                      confirmationData={orderConfirmation ?? undefined}
                      onClearConfirmation={() => setOrderConfirmation(null)}
                      clienteSesion={loggedInUser?.nombre}
                    />
                  )}
                  {screen === "mis-pedidos" && (
                    <MisPedidosScreen
                      pedidos={ventas}
                      usuarioNombre={pedidosUsuarioNombre}
                      facturaPedidoId={facturaPedidoId}
                      onVerMenu={() => navigate("catalog")}
                    />
                  )}
                  {screen === "login" && (
                    <LoginScreen
                      navigate={navigate}
                      usuarios={usuarios}
                      roles={roles}
                      onUsuarioNuevo={agregarUsuarioLocal}
                      darkMode={darkMode}
                      loginNotice={loginNotice}
                      initialEmail={loginEmailPre}
                      mensajeExito={loginMensajeExito}
                      onLogin={handleLogin}
                    />
                  )}
                  {screen === "register" && (
                    <RegisterScreen
                      navigate={navigate}
                      usuarios={usuarios}
                      setUsuarios={setUsuarios}
                      clientes={clientes}
                      setClientes={setClientes}
                      darkMode={darkMode}
                      onRegistrado={trasRegistrarse}
                    />
                  )}
                  {screen === "licencias" && (
                    <LicenciasScreen onVolver={() => navigate("landing")} />
                  )}
                  {screen === "client-profile" && (
                    <ClientProfileScreen
                      navigate={navigate}
                      onLogout={logout}
                      perfilPendiente={sesionRestaurandose && Boolean(sesionActiva?.userId)}
                      loggedInUser={loggedInUser ? {
                        id: loggedInUser.id,
                        nombre: loggedInUser.nombre,
                        iniciales: loggedInUser.iniciales,
                        avatarColor: loggedInUser.avatarColor,
                        correo: loggedInUser.correo,
                        telefono: loggedInUser.telefono,
                        tipoDocumento: loggedInUser.tipoDocumento,
                        numeroDocumento: loggedInUser.numeroDocumento,
                      } : null}
                      loggedInRoleName={loggedInRoleName}
                      isStaff={isStaff}
                      adminHomeScreen={adminHomeScreen}
                      onGuardarPerfil={guardarPerfilBackend}
                      onPasswordSaved={trasCambiarContrasena}
                      perfilCargando={perfilEstado === "cargando"}
                      perfilError={perfilEstado === "error" ? perfilErrorMsg : null}
                      onReintentarPerfil={() => void refrescarPerfil()}
                    />
                  )}
                  {sesionRestaurandose && (screen === "dashboard" || screen === "inicio") ? (
                    /* Sesión restaurándose (F5): /auth/me todavía no responde y los
                       roles de la sesión no están cargados. En vez de parpadear
                       "sin rol" / "Sin rol asignado" (o "Empleado / Sin módulos
                       asignados" en el empleado), se muestra un indicador de carga
                       con el estilo de la app. */
                    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                      <RefreshCw className="w-8 h-8 text-primary animate-spin mb-4" />
                      <p className="text-sm text-muted-foreground">Cargando tu sesión…</p>
                    </div>
                  ) : (
                    ((screen === "dashboard" && hasDashboardAccess) || (screen === "inicio" && !hasDashboardAccess)) && (
                      <DashboardScreen
                        navigate={navigate}
                        ventas={ventas}
                        ventasCargando={ventasCargando}
                        ventasError={ventasError}
                        puedeVerVentas={puedeVerVentas}
                        ordenesCompraCargando={ordenesCompraCargando || !ordenesCompraCargadas}
                        errorOrdenesCompra={errorOrdenesCompra}
                        comprasCargando={comprasCargando || !comprasCargadas}
                        errorCompras={errorCompras}
                        noConformesCargando={noConformesCargando || !noConformesCargados}
                        errorNoConformes={errorNoConformes}
                        gestiones={gestiones}
                        ordenes={ordenes}
                        noConformidades={noConformidades}
                        productos={productos}
                        insumos={insumos}
                        proveedores={proveedores}
                        ordenesProduccion={ordenesProduccion}
                        clientes={clientes}
                        loggedInUser={loggedInUser}
                        loggedInRoleName={loggedInRoleName}
                        tieneRolActivo={loggedInRol !== null}
                        hasDashboardAccess={hasDashboardAccess}
                        accesos={loggedInAccesos}
                        periodoInicio={periodoInicio}
                        onPeriodoInicio={setPeriodoInicio}
                      />
                    )
                  )}
                  {screen === "manage-products" && (
                    <ManageProductsScreen />
                  )}
                  {screen === "perecederos" && (
                    <ProductosPerecederosScreen
                      {...getPerms("perecederos")}
                      ventasSugeridas={ventas.map((v) => ({ id: v.id, usuario: v.usuario }))}
                      insumos={insumos}
                      productos={productos}
                      ordenesProduccion={ordenesProduccion}
                      noConformidades={noConformidades}
                      setNoConformidades={setNoConformidades}
                      cargando={noConformesCargando}
                      errorCarga={errorNoConformes}
                      onReintentar={() => void cargarNoConformes()}
                      // El stock lo mueve el backend (reventa o insumo): se
                      // recargan productos e insumos tras crear o eliminar.
                      onInventarioCambiado={() => void recargarInventarioCpn()}
                    />
                  )}
                  {screen === "orden-compra" && (
                    <OrdenCompraScreen
                      {...getPerms("orden-compra")}
                      ordenes={ordenes}
                      setOrdenes={setOrdenes}
                      cargando={ordenesCompraCargando}
                      errorCarga={errorOrdenesCompra}
                      onReintentar={() => void cargarOrdenesCompra()}
                      gestiones={gestiones}
                      setGestiones={setGestiones}
                      proveedores={proveedores}
                      setProveedores={setProveedores}
                      insumos={insumos}
                      setInsumos={setInsumos}
                      // Punto 3.2: el modal que abre este listado necesita el
                      // catálogo para buscar por tipo "Producto".
                      productos={productos}
                      // Punto B7: al anular la OC se devuelve también el stock
                      // de las líneas de producto de sus facturas.
                      setProductos={setProductos}
                      // Bloque 2: el "+ Crear producto" del OrdenModal necesita
                      // las categorías del panel y el alta en el catálogo.
                      categorias={categoriasCatalogo}
                      onCrearProducto={crearProductoDesdeCompras}
                      categoriasInsumo={categoriasInsumo}
                      onRecargarCatalogo={recargarInventarioCpn}
                      // Cambios de estado (p. ej. marcar Completado a mano):
                      // la lista completa se resincroniza con el backend.
                      onRecargarOrdenes={() => void cargarOrdenesCompra()}
                      onAbrirRecepcion={(orden) => {
                        setOrdenRecepcion(orden);
                        setScreen("recepcion-compra");
                      }}
                      onNuevaOrden={() => {
                        setOrdenAEditar(null);
                        setOrdenCompraItemsIniciales([]);
                        navigate("nueva-orden-compra");
                      }}
                      onEditarOrden={(orden) => {
                        setOrdenAEditar(orden);
                        setOrdenCompraItemsIniciales([]);
                        navigate("nueva-orden-compra");
                      }}
                      page={ordenCompraPage}
                      setPage={setOrdenCompraPage}
                      onVerDetalle={(orden) => {
                        setOrdenDetalle(orden);
                        setScreen("orden-detalle");
                      }}
                    />
                  )}
                  {/* Nueva Orden de Compra: PANTALLA COMPLETA dentro del panel
                  (igual que Recepción y Ver detalle), sin modal y sin scroll
                  de página. El listado queda desmontado mientras se crea. */}
                  {screen === "nueva-orden-compra" && (
                    <NuevaOrdenCompraPage
                      ordenes={ordenes}
                      setOrdenes={setOrdenes}
                      proveedores={proveedores}
                      setProveedores={setProveedores}
                      insumos={insumos}
                      productos={productos}
                      // Bloque 2: "+ Crear producto" con las categorías del panel.
                      categorias={categoriasCatalogo}
                      onCrearProducto={crearProductoDesdeCompras}
                      categoriasInsumo={categoriasInsumo}
                      setInsumos={setInsumos}
                      onBack={() => {
                        setOrdenAEditar(null);
                        setOrdenCompraItemsIniciales([]);
                        navigate("orden-compra");
                      }}
                      orden={ordenAEditar}
                      initialItems={ordenCompraItemsIniciales}
                    />
                  )}
                  {screen === "recepcion-compra" && !idPendiente && ordenRecepcion && (
                    <RecepcionCompraScreen
                      orden={ordenRecepcion}
                      insumos={insumos}
                      setInsumos={setInsumos}
                      // P14: catálogo de productos para el selector de tipo de los
                      // "no solicitados". Punto B5: con `setProductos` la
                      // recepción además suma stock y escribe precios de venta.
                      productos={productos}
                      setProductos={setProductos}
                      // Bloque 2: "+ Crear producto" del desplegable de no
                      // solicitados (categorías del panel y alta en el catálogo).
                      categorias={categoriasCatalogo}
                      onCrearProducto={crearProductoDesdeCompras}
                      categoriasInsumo={categoriasInsumo}
                      onRecargarCatalogo={recargarCatalogoTrasCambio}
                      gestiones={gestiones}
                      setGestiones={setGestiones}
                      proveedores={proveedores}
                      onGuardar={async (recepcion, estado) => {
                        setOrdenes((prev) =>
                          prev.map((o) => {
                            if (o.id !== ordenRecepcion.id) return o;
                            const base = { ...o, estado, recepcion };
                            // Deja fecha y hora del cambio: es la que muestra el
                            // detalle de la orden al lado del badge de estado.
                            return estado === o.estado
                              ? base
                              : {
                                ...base,
                                historialEstados: [
                                  ...(o.historialEstados ?? []),
                                  { estado, fechaHora: new Date().toISOString() },
                                ],
                              };
                          })
                        );

                        setOrdenRecepcion(null);
                        // 5.2: después de la recepción el backend cambió el stock
                        // y los precios: se recargan la OC, las compras, los
                        // insumos y los productos.
                        await Promise.all([
                          cargarOrdenesCompra(),
                          cargarCompras(),
                          cargarInsumosFichas(productos),
                          cargarProductosGestion(),
                        ]);
                      }}
                      onBack={() => {
                        setOrdenRecepcion(null);
                        setScreen("orden-compra");
                      }}
                    />
                  )}
                  {screen === "orden-detalle" && !idPendiente && ordenDetalle && (
                    <OrdenDetallePage
                      orden={ordenDetalle}
                      gestiones={gestiones}
                      onBack={() => {
                        setOrdenDetalle(null);
                        setScreen("orden-compra");
                      }}
                      onEditar={() => { }}
                      onAbrirRecepcion={() => { }}
                    />
                  )}
                  {screen === "gestion-compra" && (
                    <GestionCompraScreen
                      {...getPerms("gestion-compra")}
                      gestiones={gestiones}
                      setGestiones={setGestiones}
                      cargando={comprasCargando}
                      errorCarga={errorCompras}
                      onReintentar={() => void cargarCompras()}
                      ordenes={ordenes}
                      setOrdenes={setOrdenes}
                      insumos={insumos}
                      proveedores={proveedores}
                      setProveedores={setProveedores}
                      // Control de inventario: al anular una compra hay que
                      // devolver al stock lo que ella sumó (productos incluidos).
                      productos={productos}
                      setInsumos={setInsumos}
                      setProductos={setProductos}
                      // Bloque 2: se pasan a CompraForm (el detalle es de sólo
                      // lectura, pero ambas pantallas quedan iguales).
                      categorias={categoriasCatalogo}
                      onCrearProducto={crearProductoDesdeCompras}
                      categoriasInsumo={categoriasInsumo}
                      onRecargarCatalogo={recargarInventarioCpn}
                      // Tras anular una compra asociada a una OC se recarga
                      // la lista COMPLETA de órdenes: el badge (Completado ↔
                      // Enviado) y el botón "OC" salen del backend.
                      onRecargarOrdenes={() => void cargarOrdenesCompra()}
                      onNuevaCompra={() => navigate("nueva-compra")}
                    />
                  )}
                  {/* Nueva Compra: PANTALLA COMPLETA dentro del panel (igual que
                  Recepción), sin modal y sin scroll de página. */}
                  {screen === "nueva-compra" && (
                    <NuevaCompraPage
                      gestiones={gestiones}
                      setGestiones={setGestiones}
                      proveedores={proveedores}
                      setProveedores={setProveedores}
                      insumos={insumos}
                      productos={productos}
                      // Al guardar, los ítems comprados suman su stock (son
                      // opcionales: sin ellos la compra se guarda igual).
                      setInsumos={setInsumos}
                      setProductos={setProductos}
                      // Bloque 2: "+ Crear producto" del desplegable de ítems
                      // (categorías del panel y alta en el catálogo).
                      categorias={categoriasCatalogo}
                      onCrearProducto={crearProductoDesdeCompras}
                      categoriasInsumo={categoriasInsumo}
                      onRecargarCatalogo={recargarInventarioCpn}
                      onBack={() => navigate("gestion-compra")}
                    />
                  )}
                  {screen === "suppliers" && (
                    <SuppliersScreen
                      {...getPerms("suppliers")}
                      cargando={proveedoresCargando}
                      errorCarga={errorProveedores}
                      onReintentar={() => void cargarProveedores()}
                      ordenes={ordenes}
                      gestiones={gestiones}
                      proveedores={proveedores}
                      setProveedores={setProveedores}
                    />
                  )}
                  {screen === "ventas-pedidos" && (
                    // La caja solo ofrece productos que hoy están Disponibles: si
                    // el backend marca uno como "No disponible" o "Descontinuado"
                    // desaparece del picker sin tocar VentasScreen.
                    <VentasScreen
                      {...getPerms("ventas-pedidos")}
                      pedidos={ventas}
                      setPedidos={setVentas}
                      onInventarioCambiado={recargarInventarioProductos}
                      onVentaPanelCambiada={async () => {
                        const [inventario, ordenesActualizadas] = await Promise.all([
                          recargarInventarioProductos(),
                          cargarOrdenes(),
                        ]);
                        return inventario !== null && ordenesActualizadas;
                      }}
                      onPedidoListo={(orden) => setOrdenesProduccion((prev) =>
                        prev.map((actual) => actual.id === orden.id ? orden : actual)
                      )}
                      productos={productosCatalogo
                        .filter((producto) => producto.estado === "Disponible")
                        .map((producto) => productoACatalogo(producto, categoriasCatalogo))}
                      onGestionarDevolucion={abrirGestionDevolucion}
                    />
                  )}
                  {screen === "devoluciones" && (
                    <DevolucionesScreen
                      pedidos={ventas}
                      setPedidos={setVentas}
                      productos={productos}
                      setProductos={setProductos}
                      ordenes={ordenesProduccion}
                      setOrdenes={setOrdenesProduccion}
                      fichasPorProducto={fichasPorProducto}
                      insumos={insumos}
                      categorias={categoriasCatalogo}
                      catalogoCanje={productosCatalogo.map((producto) => productoACatalogo(producto, categoriasCatalogo))}
                      abrirDevolucionId={devolucionAAbrir}
                      onAbierta={() => setDevolucionAAbrir(null)}
                      onRecargarOrdenes={async () => { await cargarOrdenes(); }}
                      onRecargarNoConformes={async () => { await cargarNoConformes(); }}
                      onRecargarInventario={async () => { await recargarInventarioProductos(); }}
                    />
                  )}
                  {screen === "gestion-productos" && (
                    <GestionProductosScreen
                      {...getPerms("gestion-productos")}
                      productos={productos}
                      setProductos={setProductos}
                      insumos={insumos}
                      fichas={fichasPorProducto}
                      setFichas={setFichasPorProducto}
                      categorias={categoriasCatalogo}
                      cargandoProductos={productosCargando || (isLoggedIn && !productosGestionCargados && !errorCargaProductos)}
                      errorProductos={errorCargaProductos}
                      onReintentarCarga={() => void cargarProductosGestion()}
                      onCrearEnServidor={crearProductoEnServidor}
                      onEditarEnServidor={editarProductoEnServidor}
                      onCambiarEstadoEnServidor={cambiarEstadoEnServidor}
                      onDescontinuarEnServidor={descontinuarProductoEnServidor}
                      recargarProduccion={recargarProduccion}
                      verOrdenProduccion={verOrdenProduccion}
                      abrirOrdenCompra={() => navigate("orden-compra")}
                    />
                  )}
                  {screen === "cat-producto" && (
                    <CategoriaProductoScreen
                      categorias={categorias}
                      cargando={categoriasCargando}
                      errorCarga={errorCategorias}
                      onReintentar={() => void cargarCategoriasGestion()}
                      onCrear={crearCategoriaEnServidor}
                      onEditar={editarCategoriaEnServidor}
                      onCambiarEstado={cambiarEstadoCategoriaEnServidor}
                      onEliminar={eliminarCategoriaEnServidor}
                      {...getPerms("cat-producto")}
                    />
                  )}
                  {screen === "gestion-roles" && (
                    <GestionConfigScreen
                      canVer={esSuperAdminSesion || (loggedInAccesos[KEY("Configuración", "Roles")] ?? []).includes("Ver")}
                      canCreate={getPerms("gestion-roles").canCreate}
                      canEdit={getPerms("gestion-roles").canEdit}
                      canDelete={getPerms("gestion-roles").canDelete}
                      accesosPropios={loggedInAccesos}
                      loggedInRolId={loggedInRol?.id ?? null}
                      onIrAEmpleados={() => navigate("empleados")}
                    />
                  )}
                  {screen === "sales-chart" && (
                    <SalesChartScreen
                      ventas={ventas}
                      gestiones={gestiones}
                      ordenes={ordenes}
                      onBack={() => navigate(adminHomeScreen)}
                    />
                  )}
                  {screen === "clientes" && (
                    <GestionClientesScreen
                      {...getPerms("clientes")}
                      clientes={clientes}
                      setClientes={setClientes}
                      usuarios={usuarios}
                      roles={roles}
                      sesionCorreo={correoSesion}
                    />
                  )}
                  {screen === "users" && (
                    <GestionUsuariosScreen
                      canVer={esSuperAdminSesion || (loggedInAccesos[KEY("Configuración", "Usuarios")] ?? []).includes("Ver")}
                      canEdit={getPerms("users").canEdit}
                      canDelete={getPerms("users").canDelete}
                      onIrAClientes={() => navigate("clientes")}
                      onIrAEmpleados={() => navigate("empleados")}
                    />
                  )}
                  {screen === "empleados" && (
                    <GestionEmpleadosScreen
                      clientes={clientes}
                    />
                  )}
                  {screen === "production-orders" && (
                    <OrdenProduccionScreen
                      {...getPerms("production-orders")}
                      productos={productos}
                      insumos={insumos}
                      setInsumos={setInsumos}
                      ventas={ventas}
                      fichasPorProducto={fichasPorProducto}
                      ordenes={ordenesProduccion}
                      setOrdenes={setOrdenesProduccion}
                      noConformidades={noConformidades}
                      cargando={ordenesCargando}
                      errorCarga={errorOrdenes}
                      onReintentar={() => void cargarOrdenes()}
                      recargarProduccion={recargarProduccion}
                      onPedidoListo={(orden) => {
                        setVentas((prev) => prev.map((venta) => {
                          if (venta.id !== orden.ventaId || !orden.estadoVenta) return venta;
                          return {
                            ...venta,
                            estado: orden.estadoVenta,
                            estadoCliente: orden.estadoVenta === "Completado"
                              ? "Completado"
                              : orden.estadoVenta === "Por entregar" ? "Por entregar" : venta.estadoCliente,
                            estadoOrden: "Completada",
                          };
                        }));
                      }}
                      esAdministradorSesion={normalizarNombreRol(loggedInRoleName) === "administrador"}
                      onNavigateTo={(destino, faltantes) => {
                        if (destino === "supplies") {
                          navigate("supplies");
                          return;
                        }
                        const items = (faltantes ?? []).map((faltante, index) => {
                          const insumo = insumos.find((item) => item.id === faltante.insumoId);
                          const precio = Number(insumo?.costoUnitario ?? insumo?.precioUnitario ?? 0);
                          return {
                            rowId: `r${index + 1}`,
                            idInsumo: faltante.insumoId,
                            nombre: faltante.nombre,
                            cantidad: faltante.falta,
                            unidad: faltante.unidad,
                            costoUnitario: precio,
                            precioUnitario: precio,
                            ...(insumo?.iva == null ? {} : { iva: Number(insumo.iva) }),
                            tipoItem: "insumo" as const,
                          };
                        });
                        setOrdenAEditar(null);
                        setOrdenCompraItemsIniciales(items);
                        navigate("nueva-orden-compra");
                      }}
                      abrirOrdenId={ordenAAbrir}
                      setOrdenAAbrir={setOrdenAAbrir}
                      detalleOrdenId={ordenDetalleAAbrir}
                      setDetalleOrdenAAbrir={setOrdenDetalleAAbrir}
                    />
                  )}
                  {screen === "finished-products" && (
                    <ProductoTerminadoScreen
                      pizzas={productosCatalogo
                        .filter((producto) => producto.categoriaNombre?.toLowerCase().includes("pizza"))
                        .map((producto) => ({
                          id: String(producto.id),
                          nombre: producto.nombre,
                          stockMediana: producto.stockMediana ?? 0,
                          stockGrande: producto.stockGrande ?? 0,
                        }))}
                    />
                  )}
                  {screen === "store-profile" && (
                    <MiPerfilScreen
                      userRole={userRole}
                      navigate={navigate as (s: string) => void}
                      onLogout={logout}
                      isStaff={isStaff}
                      loggedInUser={loggedInUser ? {
                        id: loggedInUser.id,
                        nombre: loggedInUser.nombre,
                        iniciales: loggedInUser.iniciales,
                        avatarColor: loggedInUser.avatarColor,
                        correo: loggedInUser.correo,
                        telefono: loggedInUser.telefono,
                        tipoDocumento: loggedInUser.tipoDocumento,
                        numeroDocumento: loggedInUser.numeroDocumento,
                      } : null}
                      loggedInRoleName={loggedInRoleName}
                      adminHomeScreen={adminHomeScreen}
                      onGuardarPerfil={guardarPerfilBackend}
                      onPasswordSaved={trasCambiarContrasena}
                      perfilCargando={perfilEstado === "cargando"}
                      perfilError={perfilEstado === "error" ? perfilErrorMsg : null}
                      onReintentarPerfil={() => void refrescarPerfil()}
                      contrataciones={contratacionesSesion}
                      rolNombreDe={rolNombreDeContrato}
                      rolesParaCambiar={rolesParaCambiar}
                      onCambiarRol={rolesDeTrabajo.length > 0 && normalizarNombreRol(loggedInRoleName) !== "administrador" ? cambiarRolActivo : undefined}
                      inStore
                    />
                  )}
                  {screen === "profile" && (
                    <MiPerfilScreen
                      userRole={userRole}
                      navigate={navigate as (s: string) => void}
                      onLogout={logout}
                      isStaff={isStaff}
                      loggedInUser={loggedInUser ? {
                        id: loggedInUser.id,
                        nombre: loggedInUser.nombre,
                        iniciales: loggedInUser.iniciales,
                        avatarColor: loggedInUser.avatarColor,
                        correo: loggedInUser.correo,
                        telefono: loggedInUser.telefono,
                        tipoDocumento: loggedInUser.tipoDocumento,
                        numeroDocumento: loggedInUser.numeroDocumento,
                      } : null}
                      loggedInRoleName={loggedInRoleName}
                      adminHomeScreen={adminHomeScreen}
                      onGuardarPerfil={guardarPerfilBackend}
                      onPasswordSaved={trasCambiarContrasena}
                      perfilCargando={perfilEstado === "cargando"}
                      perfilError={perfilEstado === "error" ? perfilErrorMsg : null}
                      onReintentarPerfil={() => void refrescarPerfil()}
                      contrataciones={contratacionesSesion}
                      rolNombreDe={rolNombreDeContrato}
                      rolesParaCambiar={rolesParaCambiar}
                      onCambiarRol={rolesDeTrabajo.length > 0 && normalizarNombreRol(loggedInRoleName) !== "administrador" ? cambiarRolActivo : undefined}
                    />
                  )}
                  {screen === "supplies" && (
                    <GestionInsumosScreen
                      {...getPerms("supplies")}
                      insumos={insumos}
                      setInsumos={setInsumos}
                      categorias={categoriasInsumo}
                      cargando={insumosCargando}
                      errorCarga={errorInsumos}
                      onReintentar={() => void cargarInsumosFichas(productos)}
                      fichas={fichasPorProducto}
                      setFichas={setFichasPorProducto}
                      idsConFicha={[
                        ...productos.map((p) => p.id),
                        ...insumos.map((i) => i.id),
                      ]}
                      productosMenu={productos.map((p) => ({ id: p.id, nombre: p.nombre }))}
                      abrirOrdenProduccion={abrirOrdenProduccion}
                      /* A2: al crear un producto insumo la API crea su orden
                         automática y el toast ofrece "Ver orden". */
                      recargarProduccion={async () => { await recargarProduccion(); }}
                      verOrdenProduccion={verOrdenProduccion}
                      abrirOrdenCompra={() => navigate("orden-compra")}
                    />
                  )}
                  {isAdmin &&
                    ![
                      "dashboard",
                      "inicio",
                      "manage-products",
                      "suppliers",
                      "ventas-pedidos",
                      "gestion-productos",
                      "cat-producto",
                      "gestion-roles",
                      "clientes",
                      "users",
                      "empleados",
                      "production-orders",
                      "finished-products",
                      "profile",
                      "supplies",
                      "sales-chart",
                      "perecederos",
                      "orden-compra",
                      "nueva-orden-compra",
                      "recepcion-compra",
                      "gestion-compra",
                      "nueva-compra",
                      // El detalle real se pinta arriba (screen === "orden-detalle");
                      // sin estar acá, GenericAdmin se sumaba debajo y repetía el
                      // placeholder "En desarrollo · Volver al inicio".
                      "orden-detalle",
                      "devoluciones",
                    ].includes(screen) && (
                      <GenericAdmin
                        screen={screen}
                        navigate={navigate}
                        homeScreen={adminHomeScreen}
                      />
                    )}
                </LandingErrorBoundary>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>

        {/* P12: se eliminó el footer de administración ("S.I.V.PRO — Panel
            Administrativo") para que no se muestre en ningún módulo del panel.
            El footer público del landing no se toca. `isLockedScreen` sigue
            vivo porque lo usa el contenedor de arriba (alto fijo del viewport). */}

        {/* Mobile bottom nav */}
        {!isAdmin && !isAuth && (
          <BottomNav
            navigate={navigate}
            current={screen}
            isLoggedIn={isLoggedIn}
            isStaff={isStaff}
            loggedInUser={loggedInUser ? {
              iniciales: loggedInUser.iniciales,
              avatarColor: loggedInUser.avatarColor,
            } : null}
            onLogin={openLogin}
          />
        )}
      </div>

      {/* Fondo del sidebar deslizante en celular/tablet: va DESPUÉS del contenido
          (mismo z-index que el topbar) para quedar por encima de él, y por debajo
          del aside (z-30), que sigue siendo el elemento visible. */}
      {isAdmin && esMovil && sidebarMovilAbierto && (
        <div
          className="fixed inset-0 z-20 bg-black/50"
          onClick={() => setSidebarMovilAbierto(false)}
          aria-hidden
        />
      )}

      <style>{`
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }

        /* 4.5 — Contenedores de tabla: scrollbar fina SIEMPRE visible, aunque
           el resto de la app oculte la suya. Las reglas por clase ganan en
           especificidad a las globales de arriba. */
        .overflow-x-auto, .overflow-auto {
          -ms-overflow-style: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(117, 117, 117, 0.55) transparent;
        }
        .overflow-x-auto::-webkit-scrollbar,
        .overflow-auto::-webkit-scrollbar {
          display: block;
          width: 6px;
          height: 6px;
        }
        .overflow-x-auto::-webkit-scrollbar-track,
        .overflow-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb,
        .overflow-auto::-webkit-scrollbar-thumb {
          background-color: rgba(117, 117, 117, 0.55);
          border-radius: 9999px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb:hover,
        .overflow-auto::-webkit-scrollbar-thumb:hover {
          background-color: rgba(117, 117, 117, 0.85);
        }

        /* Scroll sin barra visible (mantiene el desplazamiento). */
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
