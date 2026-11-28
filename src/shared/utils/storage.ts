import { INITIAL_ROLES, completarRolesSemilla } from "@/features/roles/utils/roles";
import { SUBS_CON_EXCEL } from "@/features/roles/utils/roles";
import { ACCION_EXCEL, type AccesosMap, type Rol } from "@/features/roles/utils/roles";
import { DASHBOARD_PERM_KEY } from "@/shared/utils/navigation";
import { INITIAL_PRODUCTOS } from "@/features/products/utils/products";
import type { Producto } from "@/features/products/utils/products";

// ── Persistencia de roles (TEMPORAL) ──────────────────────────────────
// Los roles viven hoy en memoria y se perdían con cada F5, lo que hacía
// inservible un rol de "Administrador sustituto". Se guardan en localStorage
// como solución puente.
//
// ATENCIÓN: esto NO es persistencia real. Es por navegador y por máquina.
// Cuando exista backend/base de datos, este bloque debe reemplazarse por una
// llamada a la API (GET/POST de roles) y el resto del código no cambia: la
// forma `Rol` / `AccesosMap` ya es JSON-serializable sin transformaciones.
// La clave incluye versión para poder invalidar el cache al cambiar el schema.
export const ROLES_STORAGE_KEY = "sivpro.roles.v1";

// Bandera de la migración ÚNICA del permiso Dashboard (ver leerRolesPersistidos).
export const MIGRACION_DASHBOARD_PERMISO_KEY = "sivpro.migracion.dashboardPermiso.v1";

export const marcarMigracionDashboard = () => {
  try { localStorage.setItem(MIGRACION_DASHBOARD_PERMISO_KEY, "1"); } catch { /* localStorage bloqueado */ }
};

export const esRolValido = (r: unknown): r is Rol => {
  if (!r || typeof r !== "object") return false;
  const rol = r as Rol;
  return (
    typeof rol.id === "string" &&
    typeof rol.nombre === "string" &&
    typeof rol.activo === "boolean" &&
    !!rol.accesos &&
    typeof rol.accesos === "object"
  );
};

// Migración de roles ya guardados: al añadir el privilegio "Descargar Excel",
// el Administrador que ya estuviera en localStorage se quedó con los 4 CRUD y
// sin la acción nueva, y perdería el botón que sí ve uno recién creado (que sale
// de `fullAccesos()`, ya con la acción). Se le devuelve.
//
// Va anclada al rol semilla `ROL-001` y NO se aplica
// a los demás roles a propósito. Los que alguien configuró a mano se guardaron
// sin esta acción porque aún no existía, así que su configuración se respeta
// tal cual: si el privilegio se añadiera a cualquier rol, recargar la página
// repondría en secreto una acción que ese usuario había quitado, y el permiso
// "Descargar Excel" no serviría para nada.
export const RESTAURAR_EXCEL_AL_ADMIN = "ROL-001";

export const restaurarDescargaExcel = (rol: Rol): Rol => {
  if (rol.id !== RESTAURAR_EXCEL_AL_ADMIN) return rol;
  const accesos: AccesosMap = {};
  let cambio = false;
  (Object.keys(rol.accesos) as string[]).forEach(k => {
    const actuales = rol.accesos[k] ?? [];
    if (SUBS_CON_EXCEL.includes(k) && !actuales.includes(ACCION_EXCEL)) {
      accesos[k] = [...actuales, ACCION_EXCEL];
      cambio = true;
    } else {
      accesos[k] = actuales;
    }
  });
  return cambio ? { ...rol, accesos } : rol;
};

export const leerRolesPersistidos = (): Rol[] => {
  try {
    const raw = localStorage.getItem(ROLES_STORAGE_KEY);
    if (!raw) {
      // Sin datos guardados: la semilla ya trae el permiso Dashboard en el rol
      // Administrador (fullAccesos) y ningún otro rol lo tiene. Se marca la
      // migración como hecha para que no toque permisos dados después por el
      // super admin.
      marcarMigracionDashboard();
      return INITIAL_ROLES;
    }
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(esRolValido)) {
      const lista = (parsed as Rol[]).map(rol => {
        const renombrado = rol.id === "ROL-003" && rol.nombre === "Usuario"
          ? { ...rol, nombre: "Empleado", descripcion: "Acceso operativo al sistema." }
          : rol;
        return restaurarDescargaExcel(renombrado);
      });
      // §2: el rol guardado "Mesera" se renombra a "Mesero" ANTES de completar
      // la semilla, o `completarRolesSemilla` agregaría un segundo rol. Se
      // compara el nombre normalizado exacto (sin tildes, minúsculas, trim);
      // NO con `claveGeneroRol`, porque "mesera" y "mesero" dan la misma clave
      // y el rol se encontraría a sí mismo. Si ya existe un "Mesero", el
      // "Mesera" se deja como está y la semilla no duplica por clave de género.
      const normalizar = (v: string) =>
        v.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const yaHayMesero = lista.some(r => normalizar(r.nombre) === "mesero");
      const listaRenombrada = yaHayMesero
        ? lista
        : lista.map(r => (normalizar(r.nombre) === "mesera" ? { ...r, nombre: "Mesero" } : r));
      // § Dashboard: migración ÚNICA (bandera "sivpro.migracion.dashboardPermiso.v1").
      // En datos viejos la clave "Dashboard::Dashboard" podía estar en cualquier
      // rol (fue una celda más del editor). La primera vez se la quita a todo
      // rol que no sea Administrador y se la agrega a Administrador si faltaba.
      // Después de esa primera ejecución NUNCA se vuelve a tocar el permiso:
      // los cambios que haga el super admin en Crear/Editar rol se conservan
      // al recargar la página.
      let migrados = listaRenombrada;
      try {
        if (!localStorage.getItem(MIGRACION_DASHBOARD_PERMISO_KEY)) {
          migrados = listaRenombrada.map(rol => {
            if (normalizar(rol.nombre) === "administrador") {
              if (rol.accesos[DASHBOARD_PERM_KEY]?.includes("Ver")) return rol;
              return { ...rol, accesos: { ...rol.accesos, [DASHBOARD_PERM_KEY]: ["Ver"] } };
            }
            if (!(DASHBOARD_PERM_KEY in rol.accesos)) return rol;
            const accesosSinDash: AccesosMap = { ...rol.accesos };
            delete accesosSinDash[DASHBOARD_PERM_KEY];
            return { ...rol, accesos: accesosSinDash };
          });
          // Se persisten los roles migrados ANTES de marcar la bandera: si la
          // escritura falla, la bandera no queda puesta y se reintenta en la
          // próxima carga.
          localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(migrados));
          marcarMigracionDashboard();
        }
      } catch {
        // localStorage bloqueado: la migración se aplica solo en memoria.
      }
      return completarRolesSemilla(migrados);
    }
  } catch {
    // Datos corruptos o localStorage bloqueado: se cae a la semilla.
    marcarMigracionDashboard();
  }
  return INITIAL_ROLES;
};

// Usuarios y clientes se cargan desde el backend en sus respectivas pantallas.

// ── Empleados (API) ──────────────────────────────────────────────────────
// Los empleados, sus cargos y su historial de contrataciones viven en la base
// (Producción > Empleados). Los datos de prueba que quedaron en el navegador NO
// se suben: se copian UNA vez a `-respaldo-empleados` (mismo patrón que
// `-respaldo-cpn`) y la clave original deja de usarse. No se borra ni se
// sobrescribe nada.
export const EMPLEADOS_STORAGE_KEY = "sivpro.empleados.v1";

export const EMPLEADOS_RESPALDO_KEY = `${EMPLEADOS_STORAGE_KEY}-respaldo-empleados`;

export const respaldarEmpleadosLocales = () => {
  try {
    if (localStorage.getItem(EMPLEADOS_RESPALDO_KEY) === null) {
      const legado = localStorage.getItem(EMPLEADOS_STORAGE_KEY);
      if (legado !== null) localStorage.setItem(EMPLEADOS_RESPALDO_KEY, legado);
    }
  } catch {
    // Almacenamiento bloqueado: no se borra ni se sobrescribe nada.
  }
};

// ── Categorías de producto (API) ─────────────────────────────────────────
// Desde la conexión a la API, la pantalla de Categoría Producto lee y escribe
// en tb_categoria_productos (GET /categorias-productos/gestion). La lista que
// vivía en localStorage (`sivpro.categorias.v1`, ids "CAT-00x") NO se sube a
// la base: se copia UNA vez a `-respaldo-categorias` (mismo patrón que
// `-respaldo-cpn`) y la clave original deja de usarse.
export const CATEGORIAS_STORAGE_KEY = "sivpro.categorias.v1";

export const CATEGORIAS_RESPALDO_KEY = `${CATEGORIAS_STORAGE_KEY}-respaldo-categorias`;

export const respaldarCategoriasLocales = () => {
  try {
    if (localStorage.getItem(CATEGORIAS_RESPALDO_KEY) === null) {
      const legado = localStorage.getItem(CATEGORIAS_STORAGE_KEY);
      if (legado !== null) localStorage.setItem(CATEGORIAS_RESPALDO_KEY, legado);
    }
  } catch {
    // Almacenamiento bloqueado: no se borra ni se sobrescribe nada.
  }
};

// ── Persistencia de producción (cocina) ─────────────────────────────────
// Las órdenes de producción, los insumos, las ventas y las fichas técnicas
// vivían solo en el `useState` del módulo: al salir y volver se perdía todo, y
// en el caso de las órdenes tampoco había forma de que el pedido se creara
// solo. Ahora cada lista se guarda entera en localStorage.
//
// Igual que categorías: es por navegador, no compartida entre equipos, y basta
// con quitar la clave para volver a la semilla.
//   sivpro.ordenesProduccion.v1 → órdenes de producción
//   sivpro.insumos.v1          → catálogo de insumos (con Producto Insumo)
//   sivpro.fichasProductos.v1  → fichas técnicas por producto
export const ORDENES_PRODUCCION_STORAGE_KEY = "sivpro.ordenesProduccion.v1";

export const INSUMOS_STORAGE_KEY = "sivpro.insumos.v1";

export const FICHAS_STORAGE_KEY = "sivpro.fichasProductos.v1";

export const NO_CONFORMIDADES_STORAGE_KEY = "sivpro.noConformidades.v1";

// Respaldo único de la fase 2 (insumos, fichas y órdenes pasan a la API).
export const INSUMOS_RESPALDO_FASE2_KEY = `${INSUMOS_STORAGE_KEY}-respaldo-fase2`;

export const FICHAS_RESPALDO_FASE2_KEY = `${FICHAS_STORAGE_KEY}-respaldo-fase2`;

export const ORDENES_RESPALDO_FASE2_KEY = `${ORDENES_PRODUCCION_STORAGE_KEY}-respaldo-fase2`;

// Respaldo único de la fase 3 (proveedores, órdenes de compra y compras pasan
// a la API). Estas tres listas nunca se persistieron en el navegador (vivían
// en semillas en memoria), así que el respaldo copia SOLO si alguna clave
// legada llegara a existir: nunca borra nada ni sobrescribe un respaldo.
export const PROVEEDORES_RESPALDO_FASE3_KEY = "sivpro.proveedores.v1-respaldo-fase3";

export const ORDENES_COMPRA_RESPALDO_FASE3_KEY = "sivpro.ordenesCompra.v1-respaldo-fase3";

export const COMPRAS_RESPALDO_FASE3_KEY = "sivpro.compras.v1-respaldo-fase3";

export const respaldarDatosComprasFase3 = () => {
  try {
    const parejas: [string, string[]][] = [
      [PROVEEDORES_RESPALDO_FASE3_KEY, ["sivpro.proveedores.v1"]],
      [ORDENES_COMPRA_RESPALDO_FASE3_KEY, ["sivpro.ordenesCompra.v1", "sivpro.ordenCompra.v1"]],
      [COMPRAS_RESPALDO_FASE3_KEY, ["sivpro.compras.v1", "sivpro.gestiones.v1"]],
    ];
    for (const [respaldo, originales] of parejas) {
      if (localStorage.getItem(respaldo) !== null) continue;
      for (const original of originales) {
        const legado = localStorage.getItem(original);
        if (legado !== null) {
          localStorage.setItem(respaldo, legado);
          break;
        }
      }
    }
  } catch {
    // Almacenamiento bloqueado: no se borra ni se sobrescribe nada.
  }
};

/** Copia los datos locales de insumos, fichas y órdenes antes de que dejen de
    leerse del navegador. Una sola vez, sin borrar nada y sin sobrescribir un
    respaldo existente (mismo criterio que `respaldarDatosProductosFase1`). */
export const respaldarDatosProduccionFase2 = () => {
  try {
    const parejas: [string, string][] = [
      [INSUMOS_RESPALDO_FASE2_KEY, INSUMOS_STORAGE_KEY],
      [FICHAS_RESPALDO_FASE2_KEY, FICHAS_STORAGE_KEY],
      [ORDENES_RESPALDO_FASE2_KEY, ORDENES_PRODUCCION_STORAGE_KEY],
    ];
    for (const [respaldo, original] of parejas) {
      if (localStorage.getItem(respaldo) === null) {
        const legado = localStorage.getItem(original);
        if (legado !== null) localStorage.setItem(respaldo, legado);
      }
    }
  } catch {
    // Almacenamiento bloqueado: no se borra ni se sobrescribe nada.
  }
};

/** Lectura genérica: si no hay nada guardado, o hay algo corrupto o con otra
    forma, se usa la semilla en vez de romper el arranque. */
export const leerListaPersistida = <T,>(clave: string, semilla: T[], esValida: (x: unknown) => boolean): T[] => {
  try {
    const raw = localStorage.getItem(clave);
    if (!raw) return semilla;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(esValida)) return parsed as T[];
  } catch {
    // Datos corruptos o localStorage bloqueado: se cae a la semilla.
  }
  return semilla;
};

export const esObjeto = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);

/** Las órdenes guardadas pueden ser de una versión anterior del rediseño: solo
    se acepta lo que tiene la forma nueva, así que una lista vieja se descarta
    entera y vuelve la semilla en vez de mezclar modelos. */
export const esOrdenProduccionValida = (x: unknown) =>
  esObjeto(x) &&
  typeof x.id === "string" &&
  typeof x.tipo === "string" &&
  typeof x.estadoOrden === "string" &&
  Array.isArray(x.lineas) &&
  Array.isArray(x.insumosRequeridos);

export const esInsumoValido = (x: unknown) =>
  esObjeto(x) && typeof x.id === "string" && typeof x.nombre === "string";

export const esFichasValidas = (x: unknown) =>
  esObjeto(x) && Object.values(x).every((v) => Array.isArray(v));

// Productos no conformes: desde la conexión a la API ya no se leen ni se
// escriben en el navegador. Los registros locales eran de prueba y NO se suben
// a la base: se copian UNA vez a `-respaldo-cpn` (mismo patrón que la fase 2)
// y la clave original deja de usarse.
export const NO_CONFORMIDADES_RESPALDO_KEY = `${NO_CONFORMIDADES_STORAGE_KEY}-respaldo-cpn`;

export const respaldarNoConformidadesLocales = () => {
  try {
    if (localStorage.getItem(NO_CONFORMIDADES_RESPALDO_KEY) === null) {
      const legado = localStorage.getItem(NO_CONFORMIDADES_STORAGE_KEY);
      if (legado !== null) localStorage.setItem(NO_CONFORMIDADES_RESPALDO_KEY, legado);
    }
  } catch {
    // Almacenamiento bloqueado: no se borra ni se sobrescribe nada.
  }
};

// ── Persistencia del stock de Productos (por SESIÓN) ──────────────────
// A diferencia del resto, este va en `sessionStorage`: el descuento de stock
// sobrevive al F5 (recargas y las 45 → 40 siguen ahí) pero se borra al cerrar
// la pestaña/navegación del navegador. Así, al volver a arrancar `npm run` el
// stock vuelve a la semilla (45 pizzas de jamón, 50 peperoni, …), que es el
// comportamiento pedido sin backend.
// §6: la clave sube a v2 porque el vocabulario de tipos de producto cambió
// ("Producto terminado"/"Producto de reventa" → "Producto insumo"/"Producto
// terminado"): los productos guardados en v1 se descartan y vuelven a la
// semilla, evitando que un "Producto terminado" viejo (con ficha) se lea como
// el nuevo "Producto terminado" (sin ficha).
export const PRODUCTOS_STORAGE_KEY = "sivpro.productos.v2";

export const PRODUCTOS_RESPALDO_FASE1_KEY = `${PRODUCTOS_STORAGE_KEY}-respaldo-fase1`;

export const FICHAS_RESPALDO_FASE1_KEY = `${FICHAS_STORAGE_KEY}-respaldo-fase1`;

export const MIGRACION_FICHAS_FASE1_KEY = "sivpro.migracion.fichasProductos.fase1";

export const esProductoValido = (x: unknown) =>
  esObjeto(x) &&
  typeof x.id === "string" &&
  typeof x.nombre === "string" &&
  typeof x.stockDisponible === "number";

export const leerProductosParaMigracion = (): Producto[] => {
  try {
    const raw = localStorage.getItem(PRODUCTOS_RESPALDO_FASE1_KEY)
      ?? sessionStorage.getItem(PRODUCTOS_STORAGE_KEY);
    if (!raw) return INITIAL_PRODUCTOS;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(esProductoValido)) {
      return parsed as Producto[];
    }
  } catch {
    // Datos corruptos o sessionStorage bloqueado: se cae a la semilla.
  }
  return INITIAL_PRODUCTOS;
};

/** Copia la información legada antes de inicializar cualquier estado nuevo.
    Nunca elimina datos del navegador y no sobrescribe un respaldo existente. */
export const respaldarDatosProductosFase1 = () => {
  try {
    if (localStorage.getItem(PRODUCTOS_RESPALDO_FASE1_KEY) === null) {
      const productosLegados = sessionStorage.getItem(PRODUCTOS_STORAGE_KEY);
      if (productosLegados !== null) localStorage.setItem(PRODUCTOS_RESPALDO_FASE1_KEY, productosLegados);
    }
    if (localStorage.getItem(FICHAS_RESPALDO_FASE1_KEY) === null) {
      const fichasLegadas = localStorage.getItem(FICHAS_STORAGE_KEY);
      if (fichasLegadas !== null) localStorage.setItem(FICHAS_RESPALDO_FASE1_KEY, fichasLegadas);
    }
  } catch {
    // Si el almacenamiento está bloqueado no se elimina ni sobrescribe nada;
    // la carga desde API sigue separada y mostrará sus errores normalmente.
  }
};

// No hay credenciales persistidas en esta build, pero se limpian también las
// claves que usa el contrato de autenticación para evitar sesiones parciales
// si el backend se habilita o una versión anterior dejó datos en el navegador.
export const AUTH_STORAGE_KEYS = [
  "token",
  "accessToken",
  "refreshToken",
  "authToken",
  "user",
  "currentUser",
  "userRole",
  "role",
  "permissions",
  "sivpro.token",
  "sivpro.token.v1",
  "sivpro.user",
  "sivpro.role",
  "sivpro.permissions",
];
