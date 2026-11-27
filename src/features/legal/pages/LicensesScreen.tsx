import { useEffect, type MouseEvent } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { IndiceLicencias } from "@/features/legal/components/LicenseIndex";
import { TablaLicencias } from "@/features/legal/components/LicenseTable";
import { irASeccion } from "@/features/legal/navigation";
import {
  FECHA_ACTUALIZACION,
  FECHA_ACTUALIZACION_ISO,
  FUENTES_OFICIALES,
  LICENCIAS,
  SECCIONES,
  SERVICIOS,
  TABLA_BACKEND,
  TABLA_FRONTEND,
  TABLA_HERRAMIENTAS,
  URL_AVISOS_TERCEROS,
} from "@/features/legal/data/licenses";
import { EnlaceExterno, Seccion } from "@/features/legal/components/LicenseSection";
import { CLASE_ENLACE } from "@/features/legal/utils/legal";

export function LicenciasScreen({ onVolver }: { onVolver: () => void }) {
  // Enlace directo a una sección (/licenses#reconocimientos): el contenido se
  // monta después de que el navegador intentó ubicar el ancla.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const espera = window.setTimeout(() => irASeccion(id), 300);
    return () => window.clearTimeout(espera);
  }, []);

  const alVolver = (evento: MouseEvent<HTMLAnchorElement>) => {
    if (evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
    evento.preventDefault();
    onVolver();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
      <header className="border-b border-border pb-8">
        <a
          href="/"
          onClick={alVolver}
          className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-semibold text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al inicio
        </a>
        <div className="mt-4 flex items-start gap-3">
          <FileText className="mt-1 hidden h-8 w-8 shrink-0 text-primary sm:block" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-2xl text-foreground sm:text-3xl">Licencias y reconocimientos</h1>
            <p className="mt-2 text-base text-muted-foreground">
              Conoce las tecnologías, licencias y recursos que hacen posible S.I.V.PRO.
            </p>
            <p className="mt-3 text-sm font-semibold text-foreground">
              S.I.V.PRO — Sistema Integral de Ventas y Producción
            </p>
            <p className="text-sm text-muted-foreground">
              Última actualización: <time dateTime={FECHA_ACTUALIZACION_ISO}>{FECHA_ACTUALIZACION}</time>.
            </p>
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        <div>
          <IndiceLicencias secciones={SECCIONES} />
        </div>

        <article className="min-w-0 text-[15px] leading-7 text-foreground">
          <Seccion indice={0}>
            <p>
              S.I.V.PRO es una solución tecnológica desarrollada para apoyar la gestión administrativa y
              operativa de la Pizzería La Sirena, facilitando los procesos de compras, producción, ventas,
              gestión de clientes, empleados, insumos y productos.
            </p>
            <p>
              Para su desarrollo se han integrado diferentes tecnologías, bibliotecas de software, recursos
              gráficos, tipografías y servicios externos que contribuyen a su funcionamiento, seguridad,
              accesibilidad y experiencia de usuario.
            </p>
            <p>
              Esta sección tiene como finalidad informar sobre las licencias aplicables a dichos componentes y
              reconocer los derechos de sus respectivos autores y colaboradores.
            </p>
          </Seccion>

          <Seccion indice={1}>
            <p>
              El código fuente original, los diseños originales, las funcionalidades desarrolladas, la
              documentación y los demás elementos propios de S.I.V.PRO están protegidos por la legislación
              aplicable en materia de propiedad intelectual y derechos de autor.
            </p>
            <p>
              Los derechos sobre estos elementos corresponden a sus respectivos titulares, de acuerdo con los
              acuerdos de desarrollo, autorización y licenciamiento aplicables.
            </p>
            <p>
              El acceso al aplicativo no implica la transferencia de derechos de propiedad intelectual ni
              concede permisos adicionales sobre su código fuente, documentación o identidad visual.
            </p>
            <p>
              Las bibliotecas y componentes de terceros conservan sus licencias originales y los derechos
              reconocidos en ellas.
            </p>
          </Seccion>

          <Seccion indice={2}>
            <p>
              S.I.V.PRO incorpora tecnologías de código abierto que permiten implementar sus funcionalidades y
              ofrecer una experiencia adecuada a sus usuarios.
            </p>
            <TablaLicencias {...TABLA_FRONTEND} />
            <TablaLicencias {...TABLA_BACKEND} />
            <TablaLicencias {...TABLA_HERRAMIENTAS} />
            <p>
              Estas herramientas contribuyen a la compilación, procesamiento de recursos, mantenimiento y
              verificación del aplicativo.
            </p>
            <p>
              Las versiones y licencias deberán contrastarse con los archivos package-lock.json actuales antes
              de su publicación.
            </p>
          </Seccion>

          <Seccion indice={3}>
            <p>
              Las dependencias utilizadas en S.I.V.PRO incluyen componentes distribuidos bajo las siguientes
              licencias:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              {LICENCIAS.map(({ nombre, resumen, url }) => (
                <li key={nombre}>
                  <strong className="font-semibold">{nombre}:</strong> {resumen}{" "}
                  <EnlaceExterno href={url}>
                    Texto oficial<span className="sr-only"> de {nombre}</span>
                  </EnlaceExterno>
                </li>
              ))}
            </ul>
            <p>
              Cada componente conserva las autorizaciones, restricciones, condiciones de distribución y avisos
              de derechos de autor establecidos en su licencia original.
            </p>
            <p>
              La información resumida en esta sección no reemplaza los textos originales de las licencias.
            </p>
            <p>
              <a href={URL_AVISOS_TERCEROS} target="_blank" rel="noopener" className={CLASE_ENLACE}>
                Consultar avisos legales de terceros
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </a>
            </p>
            <p className="text-sm text-muted-foreground">
              Algunos paquetes tienen su licencia o su aviso de autoría pendiente de verificación; el archivo
              los identifica expresamente.
            </p>
          </Seccion>

          <Seccion indice={4}>
            <p>
              S.I.V.PRO utiliza las familias tipográficas Montserrat y Poppins, disponibles a través de Google
              Fonts y distribuidas bajo la SIL Open Font License 1.1.
            </p>
            <p>
              Asimismo, el proyecto incorpora componentes gráficos de Lucide y recursos fotográficos
              procedentes de Unsplash, conforme a las condiciones de sus respectivas licencias.
            </p>
            <p>
              Los nombres comerciales, logotipos, fotografías de productos y demás elementos pertenecientes a
              terceros conservan los derechos de sus respectivos titulares.
            </p>
            <p>
              Su presencia en el aplicativo no implica una transferencia de propiedad, patrocinio o afiliación
              comercial con S.I.V.PRO.
            </p>
            <h3 className="pt-2 text-base font-bold">Fuentes oficiales</h3>
            <ul className="list-disc space-y-1.5 pl-5">
              {FUENTES_OFICIALES.map(({ nombre, url }) => (
                <li key={nombre} className="break-all">
                  {nombre}: <EnlaceExterno href={url}>{url}</EnlaceExterno>
                </li>
              ))}
            </ul>
          </Seccion>

          <Seccion indice={5}>
            <p>Para complementar su funcionamiento, S.I.V.PRO integra los siguientes servicios externos:</p>
            {SERVICIOS.map(({ nombre, descripcion, terminos }) => (
              <div key={nombre}>
                <h3 className="text-base font-bold">{nombre}</h3>
                <p className="mt-1">{descripcion}</p>
                <p className="mt-1">
                  Términos de servicio: <EnlaceExterno href={terminos}>{terminos}</EnlaceExterno>
                </p>
              </div>
            ))}
            <p>
              El funcionamiento de estos servicios está sujeto a los términos, políticas y condiciones
              establecidos por sus respectivos proveedores.
            </p>
            <p>
              La licencia de una biblioteca de integración no reemplaza las condiciones comerciales o
              contractuales del servicio correspondiente.
            </p>
          </Seccion>

          <Seccion indice={6}>
            <p>
              S.I.V.PRO reconoce y agradece el trabajo de los desarrolladores, autores, comunidades de código
              abierto y proveedores tecnológicos que contribuyen, directa o indirectamente, a la construcción
              de las herramientas utilizadas en el aplicativo.
            </p>
            <p>
              La incorporación de estas tecnologías no implica que sus autores o proveedores participen
              directamente en el desarrollo, administración o comercialización de S.I.V.PRO.
            </p>
            <p>
              Los derechos de autor y las licencias de los componentes de terceros permanecen vigentes de
              acuerdo con sus condiciones originales.
            </p>
          </Seccion>

          <Seccion indice={7}>
            <p>
              La información presentada en esta sección podrá actualizarse cuando se incorporen, sustituyan o
              eliminen tecnologías, dependencias, servicios o recursos utilizados en el aplicativo.
            </p>
            <p>
              En caso de existir diferencias entre esta descripción y el texto original de una licencia de
              terceros, prevalecerán las condiciones de la licencia correspondiente.
            </p>
          </Seccion>

          <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">
              S.I.V.PRO — Sistema Integral de Ventas y Producción
            </p>
            <p className="mt-1">
              © 2026 S.I.V.PRO. Los derechos sobre los componentes originales y de terceros corresponden a sus
              respectivos titulares.
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}
