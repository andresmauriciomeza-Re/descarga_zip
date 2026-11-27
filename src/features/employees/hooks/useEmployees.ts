import { useState, useEffect } from "react";
import { listarCargos, listarEmpleados } from "@/shared/services/employeesService";
import { toast } from "sonner";
import { type Empleado, mapearEmpleadoApi, mensajeError } from "@/features/employees/pages/EmployeesScreen";

/** Carga de empleados y sus cargos. */
export function useEmployees() {
  // Fuente de verdad = la base (API). Nada de esto se guarda en localStorage.
  const [empleados,   setEmpleados] = useState<Empleado[]>([]);
  const [cargosApi,   setCargosApi] = useState<{ id: string; nombre: string }[]>([]);
  const [nombresRoles, setNombresRoles] = useState<Map<string, string>>(new Map());
  const [cargando,    setCargando]  = useState(true);
  const [errorCarga,  setErrorCarga] = useState<string | null>(null);
  // `mostrarCarga`: la primera carga y "Reintentar" reemplazan la tabla por el
  // estado de carga/error; las recargas posteriores a un cambio son silenciosas
  // (la lista se queda y, si fallan, avisan con un toast).
  const cargarEmpleados = async (mostrarCarga = true) => {
    if (mostrarCarga) { setCargando(true); setErrorCarga(null); }
    try {
      const [lista, cargos] = await Promise.all([listarEmpleados(), listarCargos()]);
      const nombres = new Map<string, string>();
      for (const emp of lista.empleados) {
        for (const c of emp.contrataciones) for (const r of c.roles) nombres.set(String(r.idRol), r.nombre);
      }
      setNombresRoles(nombres);
      setCargosApi(cargos.cargos.map(c => ({ id: String(c.idRol), nombre: c.nombre })));
      const cargados = lista.empleados.map(mapearEmpleadoApi);
      setEmpleados(cargados);
    } catch (error) {
      const mensaje = mensajeError(error, "No se pudieron cargar los empleados.");
      if (mostrarCarga) setErrorCarga(mensaje); else toast.error(mensaje);
    } finally {
      if (mostrarCarga) setCargando(false);
    }
  };
  useEffect(() => { void cargarEmpleados(); }, []);

  return { empleados, cargosApi, nombresRoles, cargando, errorCarga, cargarEmpleados };
}
