# S.I.V.PRO – Sistema Integral de Ventas y Producción

Diseña una aplicación web y móvil moderna para "La Sirena Pizza", Medellín, Colombia (fundada en 1994).

Objetivo principal: crear una experiencia extremadamente simple para Gloria, la propietaria, una señora mayor con poca experiencia tecnológica.

## Regla de Oro

Si Gloria abre la aplicación y en menos de 10 segundos no entiende qué hacer, el diseño ha fracasado.

## Principios UX

* Texto mínimo 16px.
* Botones mínimo 48px.
* Iconos siempre acompañados por texto.
* Máximo 5 opciones visibles en móvil.
* Confirmaciones visuales después de cada acción.
* Breadcrumb visible.
* Todo en español colombiano.
* Nunca usar mensajes en inglés.
* Nunca usar letras pequeñas.
* Nunca usar iconos solos.

## Personalidad

* Tradición artesanal desde 1994.
* Cercanía y confianza.
* Calidez familiar.
* Modernidad sin complejidad.
* Inspiración visual: Apple, Stripe, Shopify, Rappi y Uber Eats.

## Colores

Rojo #C62828 (acciones principales)

Verde #2E7D32 (éxito)

Naranja #E65100 (precios y promociones)

Negro #1A1A1A (texto)

Blanco #FFFFFF (fondos)

## Temas

### Clásico (Gloria)

Fondo blanco.
Tarjetas claras.
Alto contraste.
Máxima legibilidad.

### Moderno (Empleados)

Modo oscuro elegante.
Fondos #0D0D0D y #1C1C1C.
Contraste alto.

## Tipografía

Títulos: DM Serif Display

Interfaz: DM Sans

Precios: JetBrains Mono

Tamaños:

* 32px títulos principales.
* 24px secciones.
* 18px subtítulos.
* 16px mínimo para texto.

## Navegación

### Desktop

Sidebar izquierda 240px colapsable.

Secciones:

proceso 

configuración: 
                subpreceso
                -Roles
                -Permisos
Usuarios:
                -Gestion de usuarios
                -gestión acceso
Compras:
                -Gestión de compras
                -Gestion de categoría de insumo
                -Gestion de insumos
                -gestión de categoría de productos
                -gestión de productos 
                -gestión de proveedores
Producción:
                -Gestion de agenda
                -Administrar orden de producción
                -Gestión producto terminado
                -Ficha técnica

Ventas:
                -Gestion de clientes
                -Gestion de pedidos
                -Gestion de ventas


Medición de procesos:
                  
                 -Reportes e Informes 


Cerrar sesión siempre al final.

### Mobile

Bottom Navigation:

Inicio
Pedidos
Productos
Inventario
Más

Drawer inferior con:

Facturas
Clientes
Categorías
Insumos
Configuración
Salir

## Pantallas a Diseñar

### 1. Landing Page

Hero moderno.

Título:
"La Sirena — El sabor que conquista"

Subtítulo:
"Pizzas artesanales desde 1994 · Medellín"

Botones:

* Ordenar ahora.
* Ver menú completo.

Estadísticas:
+5200 pedidos.
+1800 clientes.
25 minutos promedio entrega.

Imagen principal:
Pizza artesanal premium.

### 2. Catálogo

Buscador.
Categorías.
Tarjetas de producto.
Precio.
Estado.
Agregar al carrito.

### 3. Detalle Producto

Imagen grande.
Ingredientes.
Tamaños.
Extras.
Cantidad.
Total dinámico.
Botón agregar al carrito.

### 4. Carrito

Productos editables.
Cupón.
Dirección.
Método de pago.
Confirmar pedido.

### 5. Login

Correo.
Contraseña.
Google.
Apple.
Recuperar contraseña.

### 6. Registro

Proceso de 2 pasos.
Validación en tiempo real.
Indicador de progreso.

### 7. Dashboard Gloria

Saludo personalizado.

KPIs:

Pedidos.
Ventas.
Productos.
Calificación.

Tabla últimos pedidos.

### 8. Gestión Productos

Tabla responsive.
Buscar.
Filtrar.
Crear.
Editar.
Eliminar.

### 9. Perfil

Información personal.
Pedidos.
Direcciones.
Métodos de pago.
Notificaciones.
Modo oscuro.

## Componentes Obligatorios

* Navbar sticky.
* Sidebar colapsable.
* Bottom navigation.
* Drawer móvil.
* Breadcrumb.
* Toast success y error.
* Skeleton loaders.
* Empty states ilustrados.
* Badge carrito.
* Buscador en tiempo real.
* Paginación.
* Modal de confirmación.

## Animaciones

Duración máxima 0.4 segundos.

Fade In.
Slide Up.
Scale Hover.
Button Press.
Toast Fade.
Drawer Slide.

## Responsive

Mobile <768px

Tablet 768–1024px

Desktop >1024px

## Estilo Visual

* Fotografías profesionales de pizzas artesanales.
* Iluminación cálida.
* Sombras suaves.
* Bordes redondeados 12–16px.
* Diseño premium inspirado en Shopify y Stripe.
* Espaciado amplio.
* Alta accesibilidad.
* Legibilidad prioritaria.

## Resultado Esperado

Gloria abre la aplicación, identifica inmediatamente "Pedidos", entiende cómo navegar sin ayuda y recibe mensajes claros en español.

La experiencia debe transmitir:

Tradición.
Confianza.
Calidad.
Modernidad.
Facilidad de uso.
Profesionalismo.


## Funcionalidad de Botones e Interacciones

Todos los botones, cards, iconos, menús y acciones visibles deben ser completamente funcionales dentro del prototipo.

No crear botones decorativos o estáticos.

Cada botón debe incluir:

* Estado hover.
* Estado activo.
* Estado disabled.
* Feedback visual inmediato.
* Confirmación visual después de cada acción.

Todos los botones de navegación deben abrir su pantalla correspondiente.

Botones como:

* Crear
* Editar
* Eliminar
* Guardar
* Cancelar
* Agregar al carrito
* Confirmar pedido
* Iniciar sesión
* Registrarse
* Cerrar sesión

deben ejecutar acciones reales dentro del flujo del prototipo.

Las tablas deben permitir:

* Buscar en tiempo real.
* Filtrar.
* Paginar.
* Editar registros.
* Eliminar registros con modal de confirmación.

El carrito debe actualizar cantidades y total dinámicamente.

Los formularios deben validar campos en tiempo real y mostrar mensajes claros de éxito o error.

Toda acción debe mostrar:

* Toast de éxito o error.
* Indicadores de carga.
* Skeleton loaders cuando aplique.

El prototipo debe sentirse como una aplicación funcional real y no únicamente como un diseño visual estático.