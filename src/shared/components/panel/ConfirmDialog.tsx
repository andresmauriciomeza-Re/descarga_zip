import { useEffect, useId, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";
import { useIdioma } from "@/shared/i18n";

interface Base {
  abierto: boolean;
  onCambiarAbierto: (abierto: boolean) => void;
  /** En forma de pregunta: «¿Desactivar a Laura Pérez?». */
  titulo: string;
}
interface Confirmar extends Base {
  variante?: "confirmar";
  /** Viñetas de «Qué va a pasar:». */
  queVaAPasar: string[];
  /** Muestra el campo «Motivo (opcional)». */
  pedirMotivo?: boolean;
  /** Texto del campo de motivo. Por defecto «Motivo (opcional)». */
  etiquetaMotivo?: string;
  /** El botón de la acción queda apagado mientras el motivo esté vacío. */
  motivoObligatorio?: boolean;
  /** Botón seguro, primero. Por defecto «No, dejarlo como está». */
  textoSeguro?: string;
  /** Botón de la acción, p. ej. «Sí, desactivar». */
  textoAccion: string;
  onConfirmar: (motivo: string) => void;
}
interface Bloqueo extends Base {
  variante: "bloqueo";
  /** Viñetas de «Por qué no se puede:». */
  porQueNo: string[];
  /** Botón «Entendido». */
  textoEntendido?: string;
  /** Alternativa (p. ej. «Ver los pedidos pendientes»). */
  textoAlternativa?: string;
  onAlternativa?: () => void;
}

/** Diálogo accesible (Radix AlertDialog: foco atrapado y tecla Escape). */
export function DialogoConfirmacion(props: Confirmar | Bloqueo) {
  const { t } = useIdioma();
  const [motivo, setMotivo] = useState("");
  const idMotivo = useId();
  useEffect(() => {
    if (!props.abierto) setMotivo("");
  }, [props.abierto]);
  const cerrar = () => props.onCambiarAbierto(false);

  return (
    <AlertDialog.Root open={props.abierto} onOpenChange={props.onCambiarAbierto}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="pn-dialogo-fondo" />
        <AlertDialog.Content className="pn-dialogo">
          <AlertDialog.Title>{props.titulo}</AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div>
              {props.variante === "bloqueo" ? (
                <div className="pn-dialogo__caja pn-dialogo__caja--ambar">
                  <strong>{t("comun.porQueNo")}</strong>
                  <ul>{props.porQueNo.map((linea) => <li key={linea}>{linea}</li>)}</ul>
                </div>
              ) : (
                <div className="pn-dialogo__caja">
                  <strong>{t("comun.queVaAPasar")}</strong>
                  <ul>{props.queVaAPasar.map((linea) => <li key={linea}>{linea}</li>)}</ul>
                </div>
              )}
            </div>
          </AlertDialog.Description>

          {props.variante !== "bloqueo" && props.pedirMotivo && (
            <div className="pn-campo" style={{ marginBottom: "1rem" }}>
              <label htmlFor={idMotivo} className="pn-etiqueta">{props.etiquetaMotivo ?? t("comun.motivoOpcional")}</label>
              <input id={idMotivo} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </div>
          )}

          <div className="pn-dialogo__botones">
            {props.variante === "bloqueo" ? (
              <>
                <AlertDialog.Cancel asChild>
                  <BotonAccion variante="oscuro">{props.textoEntendido ?? t("comun.entendido")}</BotonAccion>
                </AlertDialog.Cancel>
                {props.textoAlternativa && (
                  <BotonAccion
                    variante="normal"
                    onClick={() => {
                      cerrar();
                      props.onAlternativa?.();
                    }}
                  >
                    {props.textoAlternativa}
                  </BotonAccion>
                )}
              </>
            ) : (
              <>
                <AlertDialog.Cancel asChild>
                  <BotonAccion variante="oscuro">{props.textoSeguro ?? t("comun.dejarComoEsta")}</BotonAccion>
                </AlertDialog.Cancel>
                <BotonAccion
                  variante="peligro"
                  disabled={!!props.motivoObligatorio && !motivo.trim()}
                  onClick={() => {
                    props.onConfirmar(motivo.trim());
                    cerrar();
                  }}
                >
                  {props.textoAccion}
                </BotonAccion>
              </>
            )}
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
