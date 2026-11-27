import { MotionConfig } from "motion/react";
import type { Screen } from "@/shared/utils/screen";
import { type Product } from "@/shared/utils/catalog";
import type { CategoriaProducto } from "@/features/product-categories/utils/product-categories";
import { type Producto } from "@/features/products/pages/ProductsScreen";
import { Content } from "@/layout/components/Content";
import { Footer } from "@/layout/components/Footer";

export function Landing(props: {
  navigate: (s: Screen) => void;
  setProduct: (p: Product) => void;
  onCategoryNavigate: (cat: string) => void;
  /** Categorías creadas en el módulo del admin. Las tres originales NO entran
      acá: su ícono y su nombre están en las tarjetas de arriba. Solo se suman
      las que trae su propio ícono, es decir las nuevas. */
  categorias: CategoriaProducto[];
  /** Productos del panel de administración: es el mismo estado `Producto[]`
      de Gestión de Productos, así que el nombre real vive en `nombre`. */
  productos: Producto[];
  /** Abre el detalle guardando la pantalla de origen. */
  onOpenDetail: (p: Product) => void;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <div>
        <Content {...props} />
        <Footer navigate={props.navigate} />
      </div>
    </MotionConfig>
  );
}
