import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Banknote, Check, CircleCheck, Eye, FileText, Minus, PackageCheck, Plus, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

import { ActionIcons } from "@/shared/components/ActionIcons";
import { EstadoSelect } from "@/shared/components/EstadoSelect";
import { SearchInput } from "@/shared/components/SearchInput";
import { normalizarTexto } from "@/shared/utils/nombres";
import { productoDisponible, type Product, SECCIONES_MENU, verImagenCompleta } from "@/shared/utils/catalogo";
import type { CategoriaProducto } from "@/features/categoria-productos/pages/CategoriaProductoScreen";
import type { Insumo } from "@/features/insumos/pages/GestionInsumosScreen";
import type { FichasPorProducto, Producto } from "@/features/productos/pages/GestionProductosScreen";
import { normalizarNombre, type OrdenProduccion } from "@/features/orden-produccion/pages/OrdenProduccionScreen";
import { type DevolucionTipo, PagoPill, type Venta, type VentaStatus } from "@/features/ventas/pages/VentasScreen";
import { marcarDevolucionApi, obtenerVentasPanel, resolverDevolucionApi } from "@/features/ventas/services/ventasApi";

// ─────────────────────────── DEVOLUCIONES SCREEN ───────────────────────────

const SERIF_DEV = "var(--font-titulo)";
const MONO_DEV  = "var(--font-texto)";
const fmtCOPDev = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const nowHoraDev = () =>
  new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

/** Etiqueta del estado que se ve en la fila — y con la que también busca el
    buscador: "Pendiente" o "Resuelta · <tipo de la devolución>". */
const etiquetaEstadoDev = (dev: Venta): string =>
  !dev.devolucionResuelta
    ? "Pendiente"
    : dev.devolucionTipo === "dinero"
      ? "Resuelta · Dinero"
      : dev.devolucionTipo === "producto"
        ? "Resuelta · Canje"
        : "Resuelta · Mixta";

// Producto del menú elegido como canje de la devolución. `tamaño` forma parte de
// la identidad: la misma pizza puede canjearse en Mediana o en Grande, y cada
// tamaño tiene su propio precio.
type Reemplazo = { id: number; nombre: string; precio: number; cantidad: number; imagen?: string; tamaño?: string };

/** Motivo por el que se devuelve un producto. Va por línea del pedido: cada
    producto que entra puede tener una razón distinta. */
type MotivoDevolucion = { motivo: string; descripcion: string };

/** Opciones del selector "Por qué". "Otro" habilita el campo de descripción. */
const MOTIVOS_DEVOLUCION = [
  "Producto malo",
  "Producto incorrecto",
  "Cambio de sabor",
  "Otro",
] as const;

/** Estado del formulario mientras se resuelve una devolución. */
type EstadoDevolucion = {
  id: string;
  paso: "producto" | "dinero" | null;
  notaDinero: string;
  /** Motivo por producto, indexado igual que `devueltos`. */
  motivos: Record<number, MotivoDevolucion>;
  /** Línea del pedido con el formulario de motivo abierto, o `null`. */
  editandoMotivo: number | null;
  devueltos: Record<number, number>;
  compensacion: Reemplazo[];
};

/** Estado inicial al abrir una devolución pendiente. Si ya tenía motivos
    guardados de un intento anterior, se recuperan por línea. */
const nuevaDevolucion = (dev: Venta): EstadoDevolucion => ({
  id: dev.id,
  paso: null,
  notaDinero: "",
  motivos: dev.devolucionMotivos
    ? Object.fromEntries(
        Object.entries(dev.devolucionMotivos).map(([k, v]) => [Number(k), v]),
      )
    : {},
  editandoMotivo: null,
  devueltos: {},
  compensacion: [],
});

export function DevolucionesScreen({
  pedidos,
  setPedidos,
  productos,
  setProductos,
  ordenes,
  setOrdenes,
  fichasPorProducto,
  insumos,
  categorias,
  catalogoCanje,
  abrirDevolucionId,
  onAbierta,
  onRecargarOrdenes,
}: {
  pedidos: Venta[];
  setPedidos: React.Dispatch<React.SetStateAction<Venta[]>>;
  /** Catálogo de Productos terminados: la devolución mueve su stock (el sabor
      que entra de vuelta) y puede reemplazarlo por otro. */
  productos: Producto[];
  setProductos: React.Dispatch<React.SetStateAction<Producto[]>>;
  /** Órdenes de producción: una devolución cancela la orden de la venta y,
      si hay canje, crea la orden del producto nuevo. */
  ordenes: OrdenProduccion[];
  setOrdenes: React.Dispatch<React.SetStateAction<OrdenProduccion[]>>;
  fichasPorProducto: FichasPorProducto;
  insumos: Insumo[];
  /** Para armar el selector de canje con el catálogo vivo (no el mock). */
  categorias: CategoriaProducto[];
  /** Catálogo real del backend (GET /productos), ya mapeado igual que el modal
      "Nuevo pedido" de VentasScreen: sus id son los id_producto reales de
      tb_productos, los únicos que acepta la FK de id_producto_reemplazo. */
  catalogoCanje: Product[];
  /** Venta a gestionar al entrar. La tabla de ventas la pasa para no obligar a
      buscarla de nuevo entre las pendientes. */
  abrirDevolucionId?: string | null;
  onAbierta?: () => void;
  /** Recarga las órdenes de producción desde la API (la del canje la crea
      el backend al resolver la devolución). */
  onRecargarOrdenes?: () => Promise<void>;
}) {
  const devoluciones = pedidos.filter((p) => p.estado === "Devolucion");
  const pendientes   = devoluciones.filter((d) => !d.devolucionResuelta);
  const resueltas    = devoluciones.filter((d) => d.devolucionResuelta);

  // La devolución se resuelve con las dos opciones a la vez: una parte se canjea
  // por productos del menú y las unidades que sobren se devuelven en dinero.
  // `paso` es solo qué panel está abierto — no decide nada, porque ninguna
  // elección se confirma hasta que se pulsa el botón "Confirmar".
  const [activa, setActiva] = useState<EstadoDevolucion | null>(null);
  // Corta el doble clic en "Confirmar": el stock y las órdenes se mueven una
  // sola vez por devolución. Se libera al cambiar `activa` (al abrir la
  // siguiente devolución o al cerrarla tras confirmar).
  const confirmarRef = useRef(false);
  useEffect(() => {
    confirmarRef.current = false;
  }, [activa]);
  const [detalleDevolucion, setDetalleDevolucion] = useState<Venta | null>(null);
  // Categoría activa en el selector de canje. Filtrar por categoría es lo que
  // permite ver todos los productos a la vez, sin barra de desplazamiento.
  const [catCanje, setCatCanje] = useState("Todas");
  // Buscador del catálogo de canje (mismo SearchInput del panel): filtra en
  // tiempo real por nombre de producto, sin distinguir mayúsculas ni tildes.
  const [buscaCanje, setBuscaCanje] = useState("");

  // Buscador del listado (mismo SearchInput que Ventas, Proveedores, etc.).
  // Filtra en tiempo real sobre los campos que se ven en la fila (número de
  // venta, cliente, fecha, productos, pago y estado), sin distinguir mayúsculas
  // ni tildes. El contador del header sigue contando el total, no el filtrado.
  const [search, setSearch] = useState("");
  const busqueda = normalizarTexto(search);
  const visibles = (() => {
    const ordenadas = [...pendientes, ...resueltas];
    if (!busqueda) return ordenadas;
    return ordenadas.filter((dev) =>
      normalizarTexto(
        [
          `#${dev.id}`,
          dev.id,
          dev.usuario,
          dev.fecha,
          dev.productos,
          dev.metodoPago ?? "",
          etiquetaEstadoDev(dev),
        ].join(" "),
      ).includes(busqueda),
    );
  })();

  // Al llegar desde la tabla de ventas con "Gestionar", se abre sola la
  // devolución indicada: el modal de gestión si sigue pendiente, o la vista de
  // solo lectura si ya se resolvió. Se limpia el id para no reabrirla al
  // cambiar de pantalla más adelante.
  useEffect(() => {
    if (!abrirDevolucionId) return;
    const dev = pedidos.find((p) => p.id === abrirDevolucionId);
    onAbierta?.();
    if (!dev) return;
    if (dev.devolucionResuelta) {
      setDetalleDevolucion(dev);
    } else {
      setActiva(nuevaDevolucion(dev));
    }
  }, [abrirDevolucionId, pedidos, onAbierta]);

  // Resumen que se muestra al confirmar, una vez la devolución ya quedó cerrada.
  const [resumen, setResumen] = useState<{
    unidadesDevueltas: number;
    valorDevuelto: number;
    compensacion: Reemplazo[];
    valorComp: number;
    dineroADar: number;
    dineroARecibir: number;
  } | null>(null);

  const resolverDev = (
    id: string,
    tipo: DevolucionTipo,
    nota: string,
    motivos?: Record<number, MotivoDevolucion>,
  ) => {
    setPedidos((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              devolucionTipo: tipo,
              devolucionResuelta: true,
              devolucionNota: nota,
              ...(motivos && Object.keys(motivos).length > 0
                ? { devolucionMotivos: Object.fromEntries(
                    Object.entries(motivos).map(([k, v]) => [String(k), v]),
                  ) }
                : {}),
              historial: [...(x.historial ?? []), { estado: "Devolucion" as VentaStatus, hora: nowHoraDev() }],
            }
          : x,
      ),
    );
    setActiva(null);
  };

  const setDevQty = (idx: number, max: number, delta: number) => {
    setActiva((prev) => {
      if (!prev) return prev;
      const cur = prev.devueltos[idx] ?? 0;
      const nuevo = Math.max(0, Math.min(max, cur + delta));
      if (nuevo === cur) return prev;
      const devueltos = { ...prev.devueltos, [idx]: nuevo };
      // Si bajan las unidades devueltas se recorta el canje para que nunca
      // cubra más de lo que el cliente devuelve.
      const comp = prev.compensacion.map((c) => ({ ...c }));
      const dd = pedidos.find((p) => p.id === prev.id)?.detalle ?? [];
      const newTotal = dd.reduce((s, d, i) => s + (devueltos[i] ?? 0), 0);
      let compTotal = comp.reduce((s, c) => s + c.cantidad, 0);
      while (compTotal > newTotal && comp.length) {
        const last = comp[comp.length - 1];
        const drop = Math.min(last.cantidad, compTotal - newTotal);
        last.cantidad = Math.max(0, last.cantidad - drop);
        if (last.cantidad === 0) comp.pop();
        compTotal -= drop;
      }
      return { ...prev, devueltos, compensacion: comp };
    });
  };

  // Motivo de una línea devuelta. Se guarda por índice igual que `devueltos`,
  // para que la razón viaje junto a la cantidad que se pidió de ese producto.
  const setMotivo = (idx: number, patch: Partial<MotivoDevolucion>) => {
    setActiva((prev) => {
      if (!prev) return prev;
      const actual = prev.motivos[idx] ?? { motivo: "", descripcion: "" };
      return {
        ...prev,
        motivos: { ...prev.motivos, [idx]: { ...actual, ...patch } },
      };
    });
  };

  // Producto de canje del menú. La unidad se identifica por producto **y**
  // tamaño, así que el precio guardado es el del tamaño elegido. Tope: las
  // unidades devueltas, para que el canje no supere lo que entra.
  const setReemplazo = (prod: Product, tam: { label: string; price: number } | null, delta: number) => {
    setActiva((prev) => {
      if (!prev) return prev;
      const dd = pedidos.find((p) => p.id === prev.id)?.detalle ?? [];
      const devueltosTot = dd.reduce((s, d, i) => s + (prev.devueltos[i] ?? 0), 0);
      const etiqueta = tam?.label ?? "";
      const coincide = (c: Reemplazo) => c.id === prod.id && (c.tamaño ?? "") === etiqueta;
      const curQty = prev.compensacion.find(coincide)?.cantidad ?? 0;
      const nuevo = Math.max(0, curQty + delta);
      if (nuevo > devueltosTot) return prev;
      const rest = prev.compensacion.filter((c) => !coincide(c));
      const nueva =
        nuevo === 0
          ? rest
          : [
              ...rest,
              {
                id: prod.id,
                nombre: prod.name,
                precio: tam?.price ?? prod.price,
                cantidad: nuevo,
                imagen: prod.image,
                ...(etiqueta ? { tamaño: etiqueta } : {}),
              },
            ];
      return { ...prev, compensacion: nueva };
    });
  };

  // Categorías del catálogo, en el orden del menú, para el selector de canje.
  // El canje se arma con el catálogo REAL del backend (el mismo que el modal
  // "Nuevo pedido" de VentasScreen): sus id son los id_producto reales de
  // tb_productos, los únicos que acepta la FK de id_producto_reemplazo al
  // resolver la devolución. El catálogo local ("PROD-001"…) trae ids que no
  // existen en la base y la revientan con canje.
  const canjeCatalogo: Product[] = useMemo(
    // Sólo productos que hoy se pueden pedir. Se usa la vía oficial del
    // catálogo (`productoDisponible`, que resuelve `estado` con caída al
    // `status` legacy) en vez de comparar `p.status` a mano: el backend NO
    // envía `status`, sólo `estado` ('Disponible' | 'No disponible' |
    // 'Descontinuado'), y `status` lo fabrica `productoACatalogo` al mapear.
    () => catalogoCanje.filter((p) => productoDisponible(p)),
    [catalogoCanje],
  );
  const categoriasCanje = (() => {
    const disponibles = canjeCatalogo;
    const conocidas = SECCIONES_MENU.map((s) => s.categoria);
    const enOrden = conocidas.filter((c) => disponibles.some((p) => p.category === c));
    const nuevas = [...new Set(disponibles.map((p) => p.category))].filter(
      (c) => !conocidas.includes(c),
    );
    return ["Todas", ...enOrden, ...nuevas];
  })();
  const disponiblesCanje = canjeCatalogo;
  const porCategoria = disponiblesCanje.filter((p) => catCanje === "Todas" || p.category === catCanje);
  // Si la categoría elegida no tiene nada disponible se muestran todos, para no
  // dejar el panel de canje en blanco.
  const baseCanje = porCategoria.length > 0 ? porCategoria : disponiblesCanje;
  const terminoCanje = normalizarTexto(buscaCanje);
  const productosCanje = terminoCanje
    ? baseCanje.filter((p) => normalizarTexto(p.name).includes(terminoCanje))
    : baseCanje;
  // Cantidad ya canjeada de un producto en un tamaño concreto.
  const cantCanje = (prod: Product, tam: string) =>
    activa?.compensacion.find((c) => c.id === prod.id && (c.tamaño ?? "") === tam)?.cantidad ?? 0;

  const devActiva = activa ? pedidos.find((p) => p.id === activa.id) ?? null : null;
  const detalleAct = devActiva?.detalle ?? [];
  const totalActRaw = devActiva?.total || detalleAct.reduce((s, d) => s + d.precio * d.cantidad, 0) || 0;
  const totalDevueltos = activa ? detalleAct.reduce((s, d, i) => s + (activa.devueltos[i] ?? 0), 0) : 0;
  const totalComp = activa ? activa.compensacion.reduce((s, c) => s + c.cantidad, 0) : 0;
  const valorComp = activa ? activa.compensacion.reduce((s, c) => s + c.cantidad * c.precio, 0) : 0;

  // Valor de lo que el cliente devuelve: es la suma de (unidades devueltas ×
  // precio unitario) de cada línea del pedido.
  const valorDevuelto = activa
    ? detalleAct.reduce((s, d, i) => s + (activa.devueltos[i] ?? 0) * d.precio, 0)
    : 0;

  // Unitarios que se suman en el bloque inferior izquierdo.
  const preciosSumados = activa
    ? detalleAct
        .map((d, i) => ({ d, q: activa.devueltos[i] ?? 0 }))
        .filter((x) => x.q > 0)
        .map((x) => `${x.q} × ${fmtCOPDev(x.d.precio)}`)
    : [];

  // Saldo final entre lo que entra y lo que sale. Antes solo se contemplaba el
  // dinero de las unidades sin canjear, así que un canje por un producto más
  // caro o más barato no mostraba ni el saldo a favor ni el extra a cobrar.
  //   > 0 → le debemos dinero al cliente
  //   < 0 → el cliente nos debe un extra
  const saldo = valorDevuelto - valorComp;
  // Magnitud que se muestra en vivo: el monto reacciona a cada producto que se
  // añade al canje.
  const montoSaldo = Math.abs(saldo);
  const dineroADar = saldo > 0 ? saldo : 0;
  const dineroARecibir = saldo < 0 ? -saldo : 0;
  // El rótulo dice a favor de quién queda el saldo. Antes decía "por la
  // devolución", que no era claro para saber si tocaba pagar o cobrar.
  const rotuloDinero =
    saldo < 0 ? "Dinero a favor de La Sirena:" : "Dinero a favor del cliente:";

  const textoComp =
    activa?.compensacion.map((c) => `${c.cantidad}x ${c.nombre}${c.tamaño ? ` (${c.tamaño})` : ""}`).join(", ") ??
    "";
  // P18 — el motivo es OBLIGATORIO: cada producto que entra debe tener su
  // razón registrada (y "Otro" exige además la descripción, que es lo que
  // realmente explica el caso). Sin motivo no se puede confirmar la
  // devolución: el botón queda deshabilitado y `faltan` explica el porqué.
  const lineasSinMotivo = activa
    ? detalleAct
        .map((d, i) => {
          const q = activa.devueltos[i] ?? 0;
          if (q <= 0) return null;
          const mv = activa.motivos[i];
          const incompleto =
            !mv?.motivo?.trim() || (mv.motivo === "Otro" && !mv.descripcion?.trim());
          return incompleto ? d.nombre : null;
        })
        .filter((n): n is string => n !== null)
    : [];
  // "Cambio de sabor" exige canje: sin producto nuevo no hay sabor que
  // reemplazar al que entra de vuelta (el caso sin canje es devolver en dinero).
  const cambioSaborSinCanje =
    !!activa &&
    totalComp === 0 &&
    detalleAct.some(
      (_d, i) =>
        (activa.devueltos[i] ?? 0) > 0 && activa.motivos[i]?.motivo === "Cambio de sabor",
    );
  const puedeConfirmar =
    !!activa && totalDevueltos > 0 && lineasSinMotivo.length === 0 && !cambioSaborSinCanje;
  const modoGlobal: DevolucionTipo =
    totalComp > 0 && (dineroADar > 0 || dineroARecibir > 0)
      ? "mixto"
      : totalComp > 0
        ? "producto"
        : "dinero";

  // "Aún puedes hacer…": primero marcar qué entra y, ahora, el motivo de cada
  // producto devuelto (obligatorio); la liquidación en dinero ya está siempre
  // activa.
  const faltan: string[] = [];
  if (totalDevueltos === 0) {
    faltan.push("Marca las unidades que devuelve el cliente.");
  }
  for (const nombre of lineasSinMotivo) {
    faltan.push(`Indica el motivo de la devolución de «${nombre}» (obligatorio).`);
  }
  if (cambioSaborSinCanje) {
    faltan.push(
      "El motivo «Cambio de sabor» necesita un producto de canje: elige el sabor nuevo.",
    );
  }

  const confirmarDevolucion = async () => {
    if (!activa || !devActiva) return;
    // P18 — red de seguridad: aunque el botón ya viene deshabilitado, si falta
    // el motivo NO se registra la devolución y se avisa en español.
    if (lineasSinMotivo.length > 0) {
      import("sonner").then(({ toast }) =>
        toast.error("No se puede registrar la devolución sin motivo", {
          description: `Falta el motivo de: ${lineasSinMotivo.join(", ")}`,
        }),
      );
      return;
    }
    if (!puedeConfirmar) return;
    // Anti doble clic: los movimientos de stock y de órdenes se aplican UNA vez,
    // aunque se dispare una segunda confirmación antes del re-render. Se libera
    // al abrir/cerrar la devolución (efecto sobre `activa`) y también si el
    // backend rechaza, para poder reintentar.
    if (confirmarRef.current) return;
    confirmarRef.current = true;
    const devStr = detalleAct
      .map((d, i) => {
        const q = activa.devueltos[i] ?? 0;
        return q > 0 ? `${q}x ${d.nombre}` : null;
      })
      .filter(Boolean)
      .join(", ");
    const nota = [
      devStr ? `Devolvió: ${devStr}` : null,
      totalComp > 0 ? `Canje: ${textoComp}` : null,
      dineroADar > 0 ? `Dinero a devolver: ${fmtCOPDev(dineroADar)}` : null,
      dineroARecibir > 0 ? `Extra a cobrar: ${fmtCOPDev(dineroARecibir)}` : null,
      activa.notaDinero.trim() ? `Nota: ${activa.notaDinero.trim()}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const lineasDev = detalleAct
      .map((d, i) => ({
        d,
        i,
        q: activa.devueltos[i] ?? 0,
        motivo: activa.motivos[i]?.motivo ?? "",
        descripcion: activa.motivos[i]?.descripcion ?? "",
      }))
      .filter((x) => x.q > 0);
    const esCambioSabor = lineasDev.some((x) => x.motivo === "Cambio de sabor");

    // ── 1. Registro en el backend (fuente de verdad) ──
    // La venta de reemplazo del canje la crea el SERVIDOR: mismo cliente, pago
    // ya verificado y su orden de producción en tb_orden_produccion. Si falla,
    // no se mueve nada en el navegador y se puede reintentar.
    let idVentaReemplazo: number | undefined;
    try {
      // Asegura la fila en tb_devolucion (venta ya en Devolucion sin fila).
      let idDevolucion = devActiva.idDevolucion;
      if (!idDevolucion) {
        const marcada = await marcarDevolucionApi(devActiva.id);
        idDevolucion = marcada.id_devolucion == null ? undefined : Number(marcada.id_devolucion);
      }
      if (!idDevolucion) {
        throw new Error("La devolución no tiene registro en el servidor.");
      }
      // Con una sola línea devuelta y un solo producto de canje no hay duda de
      // a qué línea pertenece el reemplazo; con varios, el canje viaja sólo en
      // la lista global (que es la que arma la venta de reemplazo).
      const canjeUnico =
        lineasDev.length === 1 && activa.compensacion.length === 1
          ? activa.compensacion[0]
          : null;
      ({ idVentaReemplazo } = await resolverDevolucionApi(idDevolucion, {
        // "mixto" se guarda como 'Excedente': canje con saldo en dinero.
        tipo:
          modoGlobal === "mixto" ? "Excedente" : modoGlobal === "producto" ? "Producto" : "Dinero",
        nota,
        // Dinero que la pizzería devuelve (>= 0); el "extra a cobrar" queda en
        // la nota, porque `tb_devolucion.monto` no admite negativos.
        monto: dineroADar,
        lineas: lineasDev.map((x) => ({
          id_detalle_venta: x.d.idDetalleVenta ?? 0,
          cantidad: x.q,
          motivo: x.motivo,
          descripcion_motivo: x.descripcion.trim() ? x.descripcion.trim() : null,
          id_producto_reemplazo: canjeUnico ? canjeUnico.id : null,
          cantidad_reemplazo: canjeUnico ? canjeUnico.cantidad : null,
          tamano_reemplazo: canjeUnico ? (canjeUnico.tamaño ?? null) : null,
        })),
        canje: activa.compensacion.map((c) => ({
          id_producto: c.id,
          cantidad: c.cantidad,
          tamano: c.tamaño ?? null,
        })),
      }));
    } catch (error) {
      confirmarRef.current = false;
      import("sonner").then(({ toast }) =>
        toast.error(error instanceof Error ? error.message : "No se pudo registrar la devolución en el servidor.", {
          description: "No se movió ningún producto ni se creó la orden del canje.",
        }),
      );
      return;
    }

    // ── 2. Movimiento de stock y órdenes de la devolución (§flujo Ventas) ──
    // Regla de stock: el producto solo se calienta, así que su stock ya salió
    // (o no) al INICIAR la orden de producción de la venta. Aquí solo se
    // aplica lo que corresponde según el motivo de cada línea:
    // - "Cambio de sabor" / "Producto incorrecto" / "Otro": el producto que
    //   entra de vuelta se suma SOLO si la orden ya lo había descontado.
    // - "Producto malo": nunca vuelve al stock; si aún no había salido, sale
    //   ahora (queda eliminado).
    // La orden ORIGINAL de la venta: si la devolución ya generó un canje, la
    // nueva orden comparte `ventaId`, así que se excluye por su observación.
    const opVenta = ordenes.find(
      (o) => o.ventaId === devActiva.id && o.observacion !== "Canje por devolución",
    );

    const productoDeLinea = (d: (typeof detalleAct)[number]): Producto | undefined => {
      const porId = d.productoId
        ? productos.find((p) => p.id === d.productoId)
        : undefined;
      const base = d.nombre.split(" — ")[0].trim();
      return (
        porId ??
        productos.find((p) => normalizarNombre(p.nombre) === normalizarNombre(base))
      );
    };

    const sumas = new Map<string, number>();
    const bajas = new Map<string, number>();
    for (const { d, q, motivo } of lineasDev) {
      const prod = productoDeLinea(d);
      if (!prod) continue;
      if (motivo === "Producto malo") {
        if (!opVenta?.productosDescontados) {
          bajas.set(prod.id, (bajas.get(prod.id) ?? 0) + q);
        }
      } else if (opVenta?.productosDescontados) {
        sumas.set(prod.id, (sumas.get(prod.id) ?? 0) + q);
      }
    }
    if (sumas.size > 0 || bajas.size > 0) {
      setProductos((prev) =>
        prev.map((p) => {
          const s = sumas.get(p.id) ?? 0;
          const b = bajas.get(p.id) ?? 0;
          if (s === 0 && b === 0) return p;
          const stockDisponible = Math.max(
            0,
            Math.round((p.stockDisponible + s - b) * 1000) / 1000,
          );
          return { ...p, stockDisponible };
        }),
      );
    }

    // Cancelación de la orden de la venta: en "Cambio de sabor" siempre (la
    // orden original ya no se entrega); en el resto de motivos solo si aún
    // está pendiente (así no se descuenta stock por una orden muerta).
    if (opVenta && (esCambioSabor || opVenta.estadoOrden === "pendiente")) {
      setOrdenes((prev) =>
        prev.map((o) =>
          o.id === opVenta.id && o.estadoOrden !== "cancelada"
            ? {
                ...o,
                estadoOrden: "cancelada" as const,
                historial: [
                  ...o.historial,
                  {
                    de: o.estadoOrden,
                    a: "cancelada" as const,
                    fechaHora: new Date().toISOString(),
                  },
                ],
              }
            : o,
        ),
      );
    }

    // Orden del canje: el backend YA creó la orden de producción real de la
    // venta de reemplazo al resolver la devolución, así que aquí no se arma
    // ninguna orden local: se recargan las órdenes desde la API. Si no hay
    // canje (todo en dinero), no hay orden nueva que traer.
    if (activa.compensacion.length > 0) {
      void onRecargarOrdenes?.();
    }

    setResumen({
      unidadesDevueltas: totalDevueltos,
      valorDevuelto,
      compensacion: activa.compensacion,
      valorComp,
      dineroADar,
      dineroARecibir,
    });
    resolverDev(devActiva.id, modoGlobal, nota, activa.motivos);
    import("sonner").then(({ toast }) =>
      toast.success(
        modoGlobal === "mixto"
          ? "Devolución mixta registrada"
          : modoGlobal === "producto"
            ? "Devolución resuelta — cambio de producto registrado"
            : "Devolución resuelta — dinero registrado",
        {
          description:
            dineroARecibir > 0
              ? `Extra a cobrar al cliente: ${fmtCOPDev(dineroARecibir)}`
              : `Dinero a devolver: ${fmtCOPDev(dineroADar)}`,
        },
      ),
    );
    // Refresco desde el servidor: la venta de reemplazo del canje ya existe
    // allá y así aparece en el listado de Ventas sin esperar un F5.
    void obtenerVentasPanel()
      .then(setPedidos)
      .catch(() => {
        // Silencioso: la resolución ya quedó registrada en el servidor.
      });
  };

  const devolucionDetalle: Venta = detalleDevolucion
    ? pedidos.find((p) => p.id === detalleDevolucion.id) ?? detalleDevolucion
    : null;
  const totalDetalleDevolucion =
    devolucionDetalle?.total ||
    devolucionDetalle?.detalle?.reduce((s, d) => s + d.precio * d.cantidad, 0) ||
    0;

  return (
    <div className="px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF_DEV }}>
          Devoluciones
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {pendientes.length} pendiente{pendientes.length !== 1 ? "s" : ""} · {resueltas.length} resuelta{resueltas.length !== 1 ? "s" : ""}
        </p>
      </div>

      {devoluciones.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <p className="text-lg font-semibold text-foreground">Sin devoluciones</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Cuando una venta sea marcada como "Devolución" aparecerá aquí para su gestión.
          </p>
        </div>
      )}

      {/* Buscador + listado de devoluciones */}
      {devoluciones.length > 0 && (
        <>
          {/* Search */}
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por venta, cliente, producto o estado…"
          />

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
                <tr>
                  {[
                    "Venta",
                    "Cliente",
                    "Fecha",
                    "Productos",
                    "Total",
                    "Pago",
                    "Estado",
                    "Acciones",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center text-muted-foreground">
                      <p className="text-4xl mb-3">🔄</p>
                      <p>No se encontraron devoluciones</p>
                    </td>
                  </tr>
                ) : (
                  visibles.map((dev) => {
                  const totalDev =
                    dev.total ||
                    dev.detalle?.reduce((s, d) => s + d.precio * d.cantidad, 0) ||
                    0;
                  const pendiente = !dev.devolucionResuelta;
                  // Estado derivado: solo se resuelve con el flujo de
                  // "Gestionar devolución", por eso la pill va sin menú.
                  const estadoDevLabel = etiquetaEstadoDev(dev);
                  const estadoDevColor = pendiente
                    ? "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200";

                  return (
                    <tr
                      key={dev.id}
                      className={`transition-colors ${
                        pendiente
                          ? "bg-orange-50/20 hover:bg-orange-50/40 dark:bg-orange-500/10 dark:hover:bg-orange-500/20"
                          : "bg-emerald-50/20 hover:bg-emerald-50/40 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20"
                      }`}
                    >
                      <td className="px-4 py-3.5 text-sm font-mono font-semibold text-foreground">
                        #{dev.id}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-medium text-foreground">
                        {dev.usuario}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                        {dev.fecha}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-foreground max-w-[240px]">
                        <span className="block truncate" title={dev.productos}>
                          {dev.productos || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-bold text-foreground whitespace-nowrap" style={{ fontFamily: MONO_DEV }}>
                        {fmtCOPDev(totalDev)}
                      </td>
                      <td className="px-4 py-3.5">
                        <PagoPill metodo={dev.metodoPago} />
                      </td>
                      <td className="px-4 py-3.5">
                        <EstadoSelect
                          value={estadoDevLabel}
                          onChange={() => {}}
                          options={[{ value: estadoDevLabel, label: estadoDevLabel, color: estadoDevColor }]}
                          disabled
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            disabled={!pendiente}
                            onClick={() =>
                              pendiente && setActiva(nuevaDevolucion(dev))
                            }
                            title={pendiente ? "Gestionar devolución" : "La devolución ya está resuelta"}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              pendiente
                                ? "bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                                : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                            }`}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <ActionIcons
                            onView={() => setDetalleDevolucion(dev)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* Gestión de la devolución: ventana completa en vez de modal. La
          resolución mueve varias listas a la vez —productos que entran,
          canje y saldo— y en un modal encima quedaban demasiado apretadas. */}
      <AnimatePresence>
        {activa && devActiva && (
          <div className="fixed inset-0 z-50 bg-background flex flex-col">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="w-full h-full flex flex-col overflow-hidden"
            >
              {/* Header modal */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center shrink-0">
                      <RefreshCw className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">Gestionar devolución</p>
                    <p className="text-xs text-muted-foreground truncate">
                      #{devActiva.id} · {devActiva.usuario} · {devActiva.fecha}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiva(null)}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cuerpo modal: dos columnas. Izquierda, lo que entra de vuelta.
                  Derecha, cómo se compensa. `lg:grid-rows-1` es lo que mantiene
                  cada mitad dentro del alto del modal: sin él la fila del grid se
                  mide por su contenido y el catálogo de canje se desborda hacia
                  abajo en vez de quedarse en la columna derecha. */}
              <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:grid-rows-1 divide-y lg:divide-y-0 lg:divide-x divide-border">
                {/* ================= Columna izquierda ================= */}
                <div className="flex flex-col min-h-0">
                  <div className="px-5 py-3 border-b border-border shrink-0 flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground">Qué devuelve el cliente</p>
                    {totalDevueltos > 0 && (
                      <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                        {totalDevueltos} de {detalleAct.reduce((s, d) => s + d.cantidad, 0)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-h-0 lg:overflow-y-auto p-4 space-y-2">
                    {detalleAct.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        Esta venta no tiene detalle de productos registrado, así que no hay productos
                        que compensar.
                      </p>
                    ) : (
                      detalleAct.map((d, i) => {
                        const q = activa.devueltos[i] ?? 0;
                        const [nombre, ...resto] = d.nombre.split(" — ");
                        const mv = activa.motivos[i];
                        // Resumen del motivo ya registrado: se muestra en la fila
                        // para no tener que abrir el formulario a revisar.
                        const motivoLinea = mv
                          ? [mv.motivo, mv.descripcion].filter(Boolean).join(": ")
                          : "";
                        return (
                          <div
                            key={i}
                            className={`flex flex-wrap items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-colors ${
                              q > 0
                                ? "border-orange-300 bg-orange-50/40 dark:border-orange-500/40 dark:bg-orange-500/10"
                                : "border-border bg-card"
                            }`}
                          >
                            {d.imagen ? (
                              <img src={d.imagen} alt={d.nombre} className="w-8 h-8 rounded-lg object-cover bg-muted shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{nombre}</p>
                              <p className="text-xs text-muted-foreground">
                                {resto.length > 0 ? `${resto.join(" — ")} · ` : ""}
                                {/* Cantidad pedida. Va antes del unitario y un punto
                                    más grande que él, porque al lado del precio se
                                    confundía con el valor de la línea. */}
                                <span className="text-sm font-bold text-foreground">{d.cantidad} ped.</span>
                                <span> · {fmtCOPDev(d.precio)} c/u</span>
                              </p>
                              {motivoLinea && (
                                <p className="text-[11px] text-orange-700 dark:text-orange-400 truncate mt-0.5">
                                  {motivoLinea}
                                </p>
                              )}
                            </div>
                            {/* Motivo de la línea. Solo tiene sentido si el
                                producto entra. El texto acompaña al icono para
                                que se entienda sin pasar el mouse por encima. */}
                            <button
                              type="button"
                              onClick={() =>
                                setActiva((p) => (p ? { ...p, editandoMotivo: i } : p))
                              }
                              disabled={q === 0}
                              title={
                                motivoLinea
                                  ? `Motivo: ${motivoLinea}`
                                  : "Registrar el motivo de la devolución"
                              }
                              className={`flex items-center gap-1 px-2 h-6 rounded-lg text-[11px] font-semibold transition-colors shrink-0 cursor-pointer disabled:opacity-40 ${
                                motivoLinea
                                  ? "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-500/20 dark:text-orange-300"
                                  : "bg-card border border-border text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              <FileText className="w-3 h-3 shrink-0" />
                              Motivo
                            </button>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setDevQty(i, d.cantidad, -1)}
                                disabled={q === 0}
                                className="w-6 h-6 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-7 text-center text-sm font-bold text-foreground">{q}</span>
                              <button
                                type="button"
                                onClick={() => setDevQty(i, d.cantidad, 1)}
                                disabled={q >= d.cantidad}
                                className="w-6 h-6 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Resumen de lo que entra: unidades y dinero, con los unitarios
                      que sumando producen ese dinero. */}
                  <div className="shrink-0 border-t border-border bg-muted/30 p-4">
                    <div className="rounded-xl border border-border bg-card divide-y divide-border">
                      <div className="flex items-center justify-between px-3 py-2">
                        <p className="text-xs font-semibold text-foreground">Cantidad de productos a cambiar</p>
                        <p className="text-sm font-bold text-foreground">{totalDevueltos}</p>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2">
                        <p className="text-xs font-semibold text-foreground">Cantidad de dinero</p>
                        <p className="text-base font-bold text-foreground" style={{ fontFamily: MONO_DEV }}>
                          {fmtCOPDev(valorDevuelto)}
                        </p>
                      </div>
                    </div>
                    {preciosSumados.length > 0 && (
                      <p className="text-[11px] text-muted-foreground text-right mt-1.5" style={{ fontFamily: MONO_DEV }}>
                        {preciosSumados.join("  +  ")} = {fmtCOPDev(valorDevuelto)}
                      </p>
                    )}
                  </div>
                </div>

                {/* ================= Columna derecha ================= */}
                <div className="flex flex-col min-h-0">
                  <div className="px-5 py-3 border-b border-border shrink-0">
                    <p className="text-sm font-bold text-foreground">Tipo de devolución</p>
                  </div>

                  {/* Este bloque no scrollea como una unidad: la tarjeta de "Dinero"
                      queda siempre visible y es el catálogo de canje el que se
                      encoge y scrollea por dentro. Si scrolls toda la columna,
                      abrir "Cambio de producto" empuja el monto fuera de vista. */}
                  <div className="flex-1 min-h-0 flex flex-col gap-3 p-4">
                    {/* Opción 1: Cambio de producto */}
                    <div
                      className={`rounded-2xl border-2 transition-all ${
                        activa.paso === "producto"
                          ? "flex-1 min-h-0 flex flex-col overflow-hidden"
                          : "shrink-0"
                      } ${
                        totalComp > 0
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-500/15"
                          : "border-border bg-card"
                      }`}
                    >
                      <button
                        onClick={() =>
                          setActiva((p) => (p ? { ...p, paso: p.paso === "producto" ? null : "producto" } : p))
                        }
                        className="w-full shrink-0 flex items-center gap-3 p-3.5 text-left cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                          <PackageCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground">Cambio de producto</p>
                          <p className="text-xs text-muted-foreground">
                            {totalComp > 0
                              ? `${totalComp} de ${totalDevueltos} · ${fmtCOPDev(valorComp)}`
                              : "Otro producto del menú"}
                          </p>
                        </div>
                        {totalComp > 0 && (
                          <span className="w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </span>
                        )}
                      </button>

                      {activa.paso === "producto" && (
                        <div className="px-3.5 pb-3.5 flex flex-col flex-1 min-h-0 space-y-2.5">
                          {activa.compensacion.length > 0 && (
                            <div className="shrink-0 bg-card border border-blue-200 dark:border-blue-500/30 rounded-xl px-3 py-2">
                              {activa.compensacion.map((r) => (
                                <div key={`${r.id}-${r.tamaño ?? ""}`} className="flex justify-between gap-2 text-xs text-blue-900 dark:text-blue-200 py-0.5">
                                  <span className="truncate">
                                    • {r.cantidad}x {r.nombre}
                                    {r.tamaño ? ` (${r.tamaño})` : ""}
                                  </span>
                                  <span className="font-semibold whitespace-nowrap">
                                    {fmtCOPDev(r.cantidad * r.precio)}
                                  </span>
                                </div>
                              ))}
                              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 border-t border-blue-200 dark:border-blue-500/30 pt-1.5">
                                Valor del canje: {fmtCOPDev(valorComp)}
                              </p>
                            </div>
                          )}

                          {totalDevueltos === 0 ? (
                            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                              Marca primero cuántas unidades devuelve el cliente.
                            </p>
                          ) : totalComp === 0 ? (
                            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                              Falta elegir el producto de canje.
                            </p>
                          ) : null}

                          {/* Filtro por categoría: en vez de una lista larga con
                              scroll, se elige una categoría y caben todos sus
                              productos a la vez. */}
                          <div className="shrink-0 flex flex-wrap items-center gap-1.5">
                            {categoriasCanje.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setCatCanje(c)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                  catCanje === c
                                    ? "bg-blue-600 dark:bg-blue-500 text-white border-transparent"
                                    : "bg-card text-foreground border-border hover:border-blue-400"
                                }`}
                              >
                                {c}
                              </button>
                            ))}
                          </div>

                          {/* Buscador del catálogo de canje (mismo componente
                              que los listados del panel), por si hay muchos
                              productos y no caben a simple vista. */}
                          <SearchInput
                            value={buscaCanje}
                            onChange={setBuscaCanje}
                            placeholder="Buscar producto…"
                            wrapperClassName="w-full shrink-0"
                          />

                          {/* Cada producto es una tarjeta; si tiene tamaños, cada
                              tamaño es una celda con su propio precio y su propio
                              contador, porque el canje es por unidad y tamaño. */}
                          {/* Solo la rejilla scrollea: tiene un alto mínimo para
                              no aplastarse a cero cuando el modal es corto, y
                              así la tarjeta de "Dinero" y los botones de abajo
                              (Cancelar/Confirmar) nunca se tapan. */}
                          <div className="flex-1 min-h-[220px] overflow-y-auto pr-0.5">
                            <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                            {productosCanje.map((prod) => {
                              const variantes =
                                prod.sizes.length > 0
                                  ? prod.sizes
                                  : [{ label: "", price: prod.price }];
                              const cantTotal = variantes.reduce(
                                (s, v) => s + cantCanje(prod, v.label),
                                0,
                              );
                              return (
                                <div
                                  key={prod.id}
                                  className={`rounded-xl border p-2 flex flex-col gap-1.5 transition-all ${
                                    cantTotal > 0
                                      ? "bg-blue-50 border-blue-300 dark:bg-blue-500/15 dark:border-blue-400"
                                      : "bg-card border-border"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <img
                                      src={prod.image}
                                      alt={prod.name}
                                      className={`w-8 h-8 rounded-lg object-cover bg-muted shrink-0 ${
                                        verImagenCompleta(prod) ? "object-contain" : ""
                                      }`}
                                    />
                                    <p className="text-[11px] font-semibold text-foreground leading-tight line-clamp-2">
                                      {prod.name}
                                    </p>
                                  </div>

                                  <div className="flex gap-1.5">
                                    {variantes.map((v) => {
                                      const cant = cantCanje(prod, v.label);
                                      const lleno = totalComp >= totalDevueltos;
                                      return (
                                        <div
                                          key={v.label || "base"}
                                          className={`flex-1 min-w-0 rounded-lg border px-1.5 py-1 ${
                                            cant > 0
                                              ? "border-blue-400 dark:border-blue-400 bg-card"
                                              : "border-border bg-muted/40"
                                          }`}
                                        >
                                          <p className="text-[10px] font-semibold text-foreground truncate">
                                            {v.label || "Única"}
                                          </p>
                                          <p
                                            className="text-[10px] text-muted-foreground truncate"
                                            style={{ fontFamily: MONO_DEV }}
                                          >
                                            {fmtCOPDev(v.price)}
                                          </p>
                                          <div className="flex items-center justify-between mt-0.5">
                                            <button
                                              type="button"
                                              onClick={() => setReemplazo(prod, v.label ? v : null, -1)}
                                              disabled={cant === 0}
                                              className="w-5 h-5 rounded bg-card border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 cursor-pointer"
                                            >
                                              <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="text-[11px] font-bold text-foreground">
                                              {cant}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => setReemplazo(prod, v.label ? v : null, 1)}
                                              disabled={totalDevueltos === 0 || lleno}
                                              className="w-5 h-5 rounded bg-card border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 cursor-pointer"
                                            >
                                              <Plus className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                            </div>
                            {productosCanje.length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-6">
                                No se encontraron productos
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Opción 2: Dinero. Siempre activa: el saldo se liquida
                        en dinero pase lo que pase con el canje, así que exigir
                        marcarla a mano solo dejaba Lugar a olvidos. El botón
                        sigue siendo clicable para abrir la nota, pero ya no
                        alterna el estado. `shrink-0` la mantiene siempre
                        visible, con el catálogo de canje abierto. Cuando lo
                        activo es el cambio de producto la tarjeta se COLAPSA a
                        una sola línea con el saldo (y a favor de quién) y el
                        catálogo se queda con todo el resto del alto del modal;
                        al volver a elegir "Dinero" se expande otra vez. */}
                    <div className="shrink-0 rounded-2xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 transition-all overflow-hidden">
                      {activa.paso === "producto" ? (
                        <button
                          onClick={() =>
                            setActiva((p) => (p ? { ...p, paso: "dinero" } : p))
                          }
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left cursor-pointer"
                        >
                          <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span
                            className={`text-xs font-semibold truncate ${
                              saldo < 0
                                ? "text-orange-700 dark:text-orange-300"
                                : "text-emerald-800 dark:text-emerald-200"
                            }`}
                          >
                            {saldo === 0
                              ? "Sin diferencia de dinero"
                              : saldo > 0
                                ? `Dinero a favor del cliente: ${fmtCOPDev(dineroADar)}`
                                : `El cliente paga: ${fmtCOPDev(dineroARecibir)}`}
                          </span>
                        </button>
                      ) : (
                        <>
                      <button
                        onClick={() =>
                          setActiva((p) => (p ? { ...p, paso: p.paso === "dinero" ? null : "dinero" } : p))
                        }
                        className="w-full flex items-center gap-3 p-3.5 text-left cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <Banknote className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground">Dinero</p>
                          <p className="text-xs text-muted-foreground">
                            {dineroARecibir > 0
                              ? `A favor de La Sirena: ${fmtCOPDev(dineroARecibir)}`
                              : `A favor del cliente: ${fmtCOPDev(montoSaldo)}`}
                          </p>
                        </div>
                        <span className="w-5 h-5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </span>
                      </button>

                      {/* El dinero se explica en tres pasos: cuánto entra por
                          lo que devuelve, cuánto sale por el canje y qué saldo
                          queda. Antes solo se veía el saldo final y no se
                          entendía de dónde salía. */}
                      <div className="px-3.5 pb-3.5 space-y-1.5">
                        <div className="rounded-xl border border-border bg-card divide-y divide-border">
                          <div className="flex items-center justify-between gap-3 px-3 py-1.5">
                            <p className="text-[11px] text-muted-foreground">
                              Total de los productos devueltos
                            </p>
                            <p
                              className="text-xs font-bold text-foreground whitespace-nowrap"
                              style={{ fontFamily: MONO_DEV }}
                            >
                              {fmtCOPDev(valorDevuelto)}
                            </p>
                          </div>
                          <div className="flex items-center justify-between gap-3 px-3 py-1.5">
                            <p className="text-[11px] text-muted-foreground">
                              Total del cambio de producto
                            </p>
                            <p
                              className="text-xs font-bold text-foreground whitespace-nowrap"
                              style={{ fontFamily: MONO_DEV }}
                            >
                              {fmtCOPDev(valorComp)}
                            </p>
                          </div>
                        </div>

                        {/* El saldo se muestra siempre: el rótulo cambia entre dar y
                            recibir según lo que reste del canje. */}
                        <div className="flex items-center justify-between gap-3 bg-card border border-emerald-200 dark:border-emerald-500/30 rounded-xl px-3 py-2">
                          <p className="text-xs text-muted-foreground truncate">{rotuloDinero}</p>
                          <p
                            className={`text-lg font-bold whitespace-nowrap ${
                              dineroARecibir > 0
                                ? "text-orange-600 dark:text-orange-400"
                                : "text-emerald-700 dark:text-emerald-300"
                            }`}
                            style={{ fontFamily: MONO_DEV }}
                          >
                            {fmtCOPDev(montoSaldo)}
                          </p>
                        </div>

                        {activa.paso === "dinero" && (
                          <input
                            type="text"
                            value={activa.notaDinero}
                            onChange={(e) => setActiva((p) => (p ? { ...p, notaDinero: e.target.value } : p))}
                            placeholder="Nota del reembolso (opcional)"
                            className="w-full mt-2.5 px-3 py-2.5 bg-card rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-500/40"
                          />
                        )}
                      </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Cierre: avisos y único botón. El motivo ya no va aquí: se
                      registra por producto con el botón "Motivo" de cada línea.
                      Los cuadros de "Cambio de producto" y "Dinero" quedan
                      arriba, siempre visibles. */}
                  <div className="shrink-0 border-t border-border bg-muted/30 p-4 space-y-2.5">
                    {faltan.length > 0 && (
                      <div className="space-y-0.5">
                        {faltan.map((f) => (
                          <p key={f} className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                            • {f}
                          </p>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={!puedeConfirmar}
                      onClick={confirmarDevolucion}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-foreground text-background text-sm font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Check className="w-4 h-4" strokeWidth={3} />
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Motivo de una línea devuelta. Va por encima de la ventana y no
                detrás: se abre desde el botón de cada producto y se cierra sin
                perder lo que ya se había seleccionado. */}
            {activa.editandoMotivo !== null && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.96, opacity: 0 }}
                  transition={{ duration: 0.14 }}
                  className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border"
                >
                  {(() => {
                    const idx = activa.editandoMotivo as number;
                    const linea = detalleAct[idx];
                    const mv = activa.motivos[idx] ?? { motivo: "", descripcion: "" };
                    const esOtro = mv.motivo === "Otro";
                    return (
                      <>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground">
                              ¿Por qué devuelve este producto?
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {linea ? linea.nombre : "Producto"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setActiva((p) => (p ? { ...p, editandoMotivo: null } : p))
                            }
                            className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="p-4 space-y-3">
                          <div>
                            {/* P18: el motivo es obligatorio para poder
                                confirmar la devolución. */}
                            <label className="block text-xs font-semibold text-foreground mb-1.5">
                              Por qué <span className="text-orange-600 dark:text-orange-400">*</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {MOTIVOS_DEVOLUCION.map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setMotivo(idx, { motivo: m })}
                                  className={`px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                                    mv.motivo === m
                                      ? "bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-500/20 dark:border-orange-500/40 dark:text-orange-300"
                                      : "bg-card border-border text-muted-foreground hover:bg-muted"
                                  }`}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* La descripción solo se abre con "Otro": en los otros
                              casos el motivo ya dice suficiente. */}
                          <div>
                            <label className="block text-xs font-semibold text-foreground mb-1.5">
                              Descripción de la situación
                            </label>
                            <textarea
                              value={mv.descripcion}
                              onChange={(e) => setMotivo(idx, { descripcion: e.target.value })}
                              disabled={!esOtro}
                              rows={3}
                              placeholder={
                                esOtro
                                  ? "Ej: el cliente pidió sin cebolla y llegó con cebolla"
                                  : "Elige “Otro” para escribir la situación"
                              }
                              className="w-full px-3 py-2.5 bg-muted/40 rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-orange-500/40 resize-none disabled:opacity-50"
                            />
                          </div>
                        </div>

                        <div className="px-4 pb-4">
                          <button
                            type="button"
                            onClick={() => {
                              // P18: el motivo es obligatorio. Si se pulsa
                              // "Listo" sin elegir motivo —o sin descripción
                              // cuando el motivo es "Otro"— no se cierra el
                              // formulario y se avisa en español.
                              if (!mv.motivo.trim()) {
                                import("sonner").then(({ toast }) =>
                                  toast.error("Debes indicar el motivo de la devolución"),
                                );
                                return;
                              }
                              if (esOtro && !mv.descripcion.trim()) {
                                import("sonner").then(({ toast }) =>
                                  toast.error("Escribe la descripción de la situación"),
                                );
                                return;
                              }
                              setActiva((p) => (p ? { ...p, editandoMotivo: null } : p));
                            }}
                            className="w-full py-2.5 bg-foreground text-background text-sm font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                          >
                            Listo
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Modal: resumen de la devolución ya confirmada */}
      <AnimatePresence>
        {resumen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border max-h-[88vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CircleCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">Devolución confirmada</p>
                    <p className="text-xs text-muted-foreground truncate">Resumen de la compensación</p>
                  </div>
                </div>
                <button
                  onClick={() => setResumen(null)}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="rounded-xl border border-border bg-muted/40 px-3 py-2.5 flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Unidades devueltas</p>
                  <p className="text-sm font-bold text-foreground">
                    {resumen.unidadesDevueltas}{" "}
                    {resumen.unidadesDevueltas === 1 ? "unidad" : "unidades"}
                  </p>
                </div>

                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-blue-50 dark:bg-blue-500/15 border-b border-blue-200 dark:border-blue-500/30">
                    <p className="text-xs font-bold text-blue-900 dark:text-blue-200">Cambio de producto</p>
                  </div>
                  {resumen.compensacion.length === 0 ? (
                    <p className="px-3 py-2.5 text-xs text-muted-foreground italic">
                      No se canjeó ningún producto.
                    </p>
                  ) : (
                    resumen.compensacion.map((r) => (
                      <div
                        key={`${r.id}-${r.tamaño ?? ""}`}
                        className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0"
                      >
                        {r.imagen ? (
                          <img src={r.imagen} alt={r.nombre} className="w-9 h-9 rounded-lg object-cover bg-muted shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-muted shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {r.nombre}
                            {r.tamaño ? ` · ${r.tamaño}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.cantidad} {r.cantidad === 1 ? "unidad" : "unidades"} ×{" "}
                            {fmtCOPDev(r.precio)}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-blue-700 dark:text-blue-300 shrink-0" style={{ fontFamily: MONO_DEV }}>
                          {fmtCOPDev(r.cantidad * r.precio)}
                        </p>
                      </div>
                    ))
                  )}
                  {resumen.compensacion.length > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-500/15 border-t border-blue-200 dark:border-blue-500/30">
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">Valor del canje</p>
                      <p className="text-sm font-bold text-blue-700 dark:text-blue-300" style={{ fontFamily: MONO_DEV }}>
                        {fmtCOPDev(resumen.valorComp)}
                      </p>
                    </div>
                  )}
                </div>

                {/* El dinero se separa en dar o recibir: el signo del saldo decide
                    cuál de los dos rótulos se muestra. */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <div
                    className={`px-3 py-2 border-b ${
                      resumen.dineroARecibir > 0
                        ? "bg-orange-50 dark:bg-orange-500/15 border-orange-200 dark:border-orange-500/30"
                        : "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30"
                    }`}
                  >
                    <p
                      className={`text-xs font-bold ${
                        resumen.dineroARecibir > 0
                          ? "text-orange-900 dark:text-orange-200"
                          : "text-emerald-900 dark:text-emerald-200"
                      }`}
                    >
                      {resumen.dineroARecibir > 0
                        ? "Dinero a recibir por la devolución"
                        : "Dinero a dar por la devolución"}
                    </p>
                  </div>
                  <div className="px-3 py-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {fmtCOPDev(resumen.valorDevuelto)} devueltos − {fmtCOPDev(resumen.valorComp)} canje
                    </p>
                    <p
                      className={`text-xl font-bold shrink-0 ${
                        resumen.dineroARecibir > 0
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-emerald-700 dark:text-emerald-300"
                      }`}
                      style={{ fontFamily: MONO_DEV }}
                    >
                      {fmtCOPDev(resumen.dineroARecibir > 0 ? resumen.dineroARecibir : resumen.dineroADar)}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  La devolución quedó registrada y ya no se puede deshacer.
                </p>
              </div>

              <div className="px-5 py-4 border-t border-border">
                <button
                  onClick={() => setResumen(null)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-muted text-foreground hover:bg-border cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: visualizar devolución */}
      <AnimatePresence>
        {detalleDevolucion && devolucionDetalle && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border max-h-[88vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">Detalle de devolución</p>
                    <p className="text-xs text-muted-foreground truncate">
                      #{devolucionDetalle.id} · {devolucionDetalle.usuario} · {devolucionDetalle.fecha}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDetalleDevolucion(null)}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-lg font-bold text-foreground mt-0.5" style={{ fontFamily: MONO_DEV }}>
                      {fmtCOPDev(totalDetalleDevolucion)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Método de pago</p>
                    <div className="mt-1">
                      {devolucionDetalle.metodoPago ? (
                        <PagoPill metodo={devolucionDetalle.metodoPago} />
                      ) : (
                        <p className="text-sm font-semibold text-muted-foreground">No registrado</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Estado</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      devolucionDetalle.devolucionResuelta
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
                        : "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200"
                    }`}
                  >
                    {devolucionDetalle.devolucionResuelta
                      ? devolucionDetalle.devolucionTipo === "dinero"
                        ? "Resuelta · Dinero"
                        : devolucionDetalle.devolucionTipo === "producto"
                          ? "Resuelta · Canje"
                          : "Resuelta · Mixta"
                      : "Pendiente de resolución"}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Productos</p>
                  {devolucionDetalle.detalle && devolucionDetalle.detalle.length > 0 ? (
                    <div className="border border-border rounded-xl overflow-hidden">
                      {devolucionDetalle.detalle.map((item, index) => (
                        <div key={`${item.nombre}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-border last:border-0">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{item.nombre}</p>
                            <p className="text-xs text-muted-foreground">x{item.cantidad} · {fmtCOPDev(item.precio)} c/u</p>
                          </div>
                          <p className="text-sm font-semibold text-foreground whitespace-nowrap">
                            {fmtCOPDev(item.precio * item.cantidad)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{devolucionDetalle.productos || "Sin detalle de productos"}</p>
                  )}
                </div>

                {/* Motivo de cada línea devuelta. Es lo que registró el botón
                    que hay junto a la cantidad de cada producto. */}
                {devolucionDetalle.devolucionMotivos &&
                  Object.keys(devolucionDetalle.devolucionMotivos).length > 0 && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50/50 dark:border-orange-500/30 dark:bg-orange-500/10 px-3 py-2.5">
                      <p className="text-xs font-semibold text-orange-800 dark:text-orange-300 mb-1.5">
                        Motivo por producto
                      </p>
                      <div className="space-y-1">
                        {Object.entries(devolucionDetalle.devolucionMotivos)
                          .sort((a, b) => Number(a[0]) - Number(b[0]))
                          .map(([k, m]) => {
                            const linea = devolucionDetalle.detalle?.[Number(k)];
                            return (
                              <div
                                key={k}
                                className="flex items-start justify-between gap-3"
                              >
                                <p className="text-xs text-foreground truncate">
                                  {linea?.nombre ?? `Línea ${Number(k) + 1}`}
                                </p>
                                <p className="text-xs text-muted-foreground text-right shrink-0">
                                  {m.motivo}
                                  {m.descripcion ? `: ${m.descripcion}` : ""}
                                </p>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                {devolucionDetalle.devolucionNota && (
                  <div className="rounded-xl border border-border bg-muted/40 px-3 py-2.5">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Nota de resolución</p>
                    <p className="text-sm text-foreground italic">“{devolucionDetalle.devolucionNota}”</p>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-border">
                <button
                  onClick={() => setDetalleDevolucion(null)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-muted text-foreground hover:bg-border cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
