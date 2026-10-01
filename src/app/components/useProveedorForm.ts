import { useState, useMemo, useCallback } from "react";

// ─── Validaciones reutilizables para formularios de proveedor ─────────────────

export interface ProveedorFormValues {
  nombre: string;
  nit: string;
  telefono: string;
  email: string;
  asesorComercial: string;
  direccion: string;
  estado: "activo" | "inactivo";
}

export type ProveedorFormErrors = Partial<Record<keyof ProveedorFormValues, string>>;

const NIT_LENGTH = 10;

/** Filtra el NIT: solo números, máximo 10 dígitos. */
export function filtrarNit(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, NIT_LENGTH);
}

/** Filtra texto de nombres: solo letras y espacios (con tildes y ñ). */
export function soloLetras(valor: string): string {
  return valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, "");
}

/** Filtra teléfono: solo números. */
export function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** Valida formato de correo. */
export function validarCorreo(email: string): string | null {
  if (!email.trim()) return "El correo es obligatorio.";
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email.trim())) return "Ingresa un correo válido.";
  return null;
}

/** Normaliza texto para comparar sin mayúsculas, tildes ni espacios extra. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Hook reutilizable para formularios de proveedor.
 * Centraliza todas las validaciones para que todos los formularios se comporten igual.
 */
export function useProveedorForm(
  inicial: ProveedorFormValues,
  existentes: { nit: string; nombre: string }[] = [],
  opciones: { bloquearNombre?: boolean; bloquearNit?: boolean } = {},
) {
  const [values, setValues] = useState<ProveedorFormValues>(inicial);
  const [tocado, setTocado] = useState<Partial<Record<keyof ProveedorFormValues, boolean>>>({});
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  const setCampo = useCallback(<K extends keyof ProveedorFormValues>(campo: K, valor: ProveedorFormValues[K]) => {
    setValues(prev => ({ ...prev, [campo]: valor }));
  }, []);

  const marcarTocado = useCallback((campo: keyof ProveedorFormValues) => {
    setTocado(prev => ({ ...prev, [campo]: true }));
  }, []);

  const errors: ProveedorFormErrors = useMemo(() => {
    const e: ProveedorFormErrors = {};

    // NIT: obligatorio, exactamente 10 dígitos, no duplicado
    if (!values.nit.trim()) {
      e.nit = "El NIT es obligatorio.";
    } else if (values.nit.trim().length !== NIT_LENGTH) {
      e.nit = `El NIT debe tener exactamente ${NIT_LENGTH} dígitos.`;
    } else if (existentes.some(x => x.nit === values.nit.trim())) {
      e.nit = "Ya existe un proveedor con este NIT.";
    }

    // Nombre: obligatorio, solo letras
    if (!values.nombre.trim()) {
      e.nombre = "El nombre es obligatorio.";
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(values.nombre.trim())) {
      e.nombre = "El nombre solo puede contener letras y espacios.";
    }

    // Teléfono: obligatorio, solo números, exactamente 10 dígitos
    if (!values.telefono.trim()) {
      e.telefono = "El teléfono es obligatorio.";
    } else if (!/^\d+$/.test(values.telefono.trim())) {
      e.telefono = "El teléfono solo puede contener números.";
    } else if (values.telefono.trim().length !== 10) {
      e.telefono = "El teléfono debe tener exactamente 10 dígitos.";
    }

    // Email: obligatorio, formato válido
    const emailErr = validarCorreo(values.email);
    if (emailErr) e.email = emailErr;

    // Asesor comercial: obligatorio, solo letras y espacios, mínimo 3 caracteres
    if (!values.asesorComercial.trim()) {
      e.asesorComercial = "El asesor comercial es obligatorio.";
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(values.asesorComercial.trim())) {
      e.asesorComercial = "El asesor solo puede contener letras y espacios.";
    } else if (values.asesorComercial.trim().length < 3) {
      e.asesorComercial = "El asesor comercial debe tener al menos 3 caracteres.";
    }

    // Dirección: obligatoria, mínimo 5 caracteres
    if (!values.direccion.trim()) {
      e.direccion = "La dirección es obligatoria.";
    } else if (values.direccion.trim().length < 5) {
      e.direccion = "La dirección debe tener al menos 5 caracteres.";
    }

    return e;
  }, [values, existentes]);

  const formValido = Object.keys(errors).length === 0;

  const obtenerError = (campo: keyof ProveedorFormValues): string | undefined => {
    if (opciones.bloquearNombre && campo === "nombre") return undefined;
    if (opciones.bloquearNit && campo === "nit") return undefined;
    return (tocado[campo] || intentoGuardar) ? errors[campo] : undefined;
  };

  const campoCls = (campo: keyof ProveedorFormValues): string => {
    const err = obtenerError(campo);
    return err ? "border-red-400 focus:ring-red-300" : "";
  };

  const reset = useCallback(() => {
    setValues(inicial);
    setTocado({});
    setIntentoGuardar(false);
  }, [inicial]);

  return {
    values,
    setCampo,
    marcarTocado,
    errors,
    formValido,
    obtenerError,
    campoCls,
    reset,
    setIntentoGuardar,
    intentoGuardar,
  };
}
