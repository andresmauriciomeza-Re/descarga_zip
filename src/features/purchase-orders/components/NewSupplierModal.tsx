import { type ProveedorRef, SERIF } from "@/features/purchase-orders/utils/purchase-orders";
import { soloLetras, useProveedorForm, nombreGuardado, contactoGuardado, datosNuevosProveedor, type ProveedorFormValues } from "@/features/suppliers/hooks/useSupplierForm";
import { useState } from "react";
import { toast } from "sonner";
import { crearProveedor, mensajeErrorProveedores } from "@/features/suppliers/services/suppliersApi";
import { motion } from "motion/react";
import { TipoPersonaSelector } from "@/features/suppliers/components/PersonTypeSelector";
import { X } from "lucide-react";
import { ProveedorFormCampos } from "@/features/suppliers/components/SupplierForm";

// ��������� NUEVO PROVEEDOR MODAL ������������������������������������������������������������������������������������������������������������������������������������������������������������

export function NuevoProveedorModal({
  onGuardar, onClose, nombreInicial = "", existentes = [],
}: {
  onGuardar: (p: ProveedorRef) => void;
  onClose: () => void;
  nombreInicial?: string;
  /** Punto 1: proveedores ya existentes. Sirven para dos cosas: detectar NIT
      repetido con las mismas reglas del módulo Proveedores y generar el id
      numérico del nuevo registro (mismo cálculo que "Crear Proveedor"). */
  existentes?: ProveedorRef[];
}) {
  // Punto 1: mismas validaciones que el formulario del módulo Proveedores
  // (useProveedorForm). El nombre llega del buscador y se filtra con las
  // reglas del formulario para no arrancar con un valor inválido.
  const nombreSemilla = soloLetras(nombreInicial);
  const form = useProveedorForm(
    {
      nombre: nombreSemilla,
      nombres: nombreSemilla,
      razonSocial: nombreInicial.trim(),
      nit: "",
      telefono: "",
      email: "",
      asesorComercial: "",
      direccion: "",
      estado: "activo",
      // Punto 3.1: igual que el alta del módulo Proveedores, el formulario
      // arranca con "Persona Natural" preseleccionado (el control segmentado
      // permite cambiar a Jurídica en un toque).
      tipoPersona: "Persona Natural",
    },
    existentes,
  );
  /** "Guardando…" mientras habla la API: bloquea el doble clic. */
  const [guardando, setGuardando] = useState(false);

  const submit = async () => {
    if (guardando) return;
    // Fase 2: el botón NO envía con errores. Se pintan todos los mensajes que
    // falten y el foco va al primer campo inválido (el DOM se recorre en orden
    // visual gracias a `data-prov-campo`).
    if (form.enfocarPrimeroInvalido()) {
      toast.error("Revisa los campos del formulario");
      return;
    }
    setGuardando(true);
    try {
      const v = form.values;
      // Bloque 3: el proveedor se da de alta contra la API (con el id real que
      // devuelve el servidor) y el resto de la app lo recibe ya mapeado.
      // `contactoGuardado` es el MISMO mapeo del módulo Proveedores: en
      // Jurídica toma el Contacto comercial y en Natural llena asesor/teléfono/
      // email con los datos del propio proveedor (el backend los exige).
      const creado = await crearProveedor({
        id: "",
        nombre: nombreGuardado(v),
        nit: v.nit.trim(),
        ...contactoGuardado(v),
        direccion: v.direccion.trim(),
        estado: v.estado,
        tipoPersona: v.tipoPersona,
        ...datosNuevosProveedor(v),
      });
      onGuardar(creado);
    } catch (error) {
      const mensaje = mensajeErrorProveedores(error, "No se pudo crear el proveedor.");
      const visible = (campo: string) => !!document.querySelector(`[data-prov-campo="${campo}"]`);
      let campo: keyof ProveedorFormValues | null = null;
      if (/nit/i.test(mensaje) && visible("nit")) campo = "nit";
      else if (/documento/i.test(mensaje) && visible("numeroDocumento")) campo = "numeroDocumento";
      else if (/correo|email/i.test(mensaje)) {
        if (visible("contactoEmail")) campo = "contactoEmail";
        else if (visible("email")) campo = "email";
      }
      if (campo) {
        form.setErrorServidor(campo, mensaje);
        const el = document.querySelector<HTMLElement>(`[data-prov-campo="${campo}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus();
      } else {
        toast.error(mensaje);
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        // Sin borde exterior (estilo "sin cards con borde"): la separación la
        // dan las líneas divisorias del encabezado y del pie.
        className="bg-card rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)]"
      >
        {/* Encabezado FIJO: título + subtítulo y, en la misma fila a la
            derecha (o abajo en móvil), el selector Persona Natural / Persona Jurídica. */}
        <div className="flex flex-wrap items-center gap-3 px-4 sm:px-6 py-3 border-b border-border shrink-0">
          <div className="min-w-[180px] flex-1">
            <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Nuevo Proveedor</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Completa la información de contacto del proveedor.</p>
          </div>
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <TipoPersonaSelector
              valor={form.values.tipoPersona}
              onChange={(tipo) => {
                form.marcarTocado("tipoPersona");
                form.setCampo("tipoPersona", tipo);
              }}
              error={form.obtenerError("tipoPersona")}
            />
            <button onClick={onClose} className="p-1.5 max-md:p-3.5 max-md:-m-2 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Único contenedor con scroll dentro del modal (prohibido scroll doble). */}
        <div className="px-4 sm:px-6 py-5 overflow-y-auto flex-1 min-h-0">
          {/* Punto 1: mismo formulario de proveedor que el módulo Proveedores. */}
          <ProveedorFormCampos form={form} />
        </div>
        <div className="flex justify-end gap-3 px-4 sm:px-6 py-3 border-t border-border shrink-0">
          <button onClick={onClose} className="px-5 h-10 max-md:min-h-11 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => void submit()}
            // Fase 2: habilitado siempre; si hay errores, `submit` los pinta y
            // enfoca el primero en lugar de guardar.
            disabled={guardando}
            className="px-5 h-10 max-md:min-h-11 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary transition-all"
          >
            {guardando ? "Guardando…" : "Crear Proveedor"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
