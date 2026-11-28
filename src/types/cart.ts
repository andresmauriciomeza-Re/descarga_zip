import { type Product } from "@/shared/utils/catalog";

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  size: string;
  sizePrice: number;
  selectedExtras: string[];
  extrasPrice: number;
}

export interface PendingOrder {
  metodoPago: string;
  comprobante: string;
  items: CartItem[];
  horaRecogida: string;
  nombre?: string;
  documento?: string;
}

/** Resumen del pedido que se acaba de registrar, para la pantalla de
    confirmación. Lo crea el checkout al enviar (handleConfirm y
    submitAsGuest) y el login al retomar el pedido que un invitado
    dejó a medio hacer (handleLogin). */
export interface PedidoResumen {
  id: string;
  items: CartItem[];
  total: number;
  nombre: string;
  documento?: string;
  /** Teléfono del cliente, si lo dejó en el formulario de datos. */
  telefono?: string;
  hora: string;
}
