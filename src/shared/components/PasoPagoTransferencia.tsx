import { QrCode, Upload, X, ImageIcon } from "lucide-react";
import { useEffect, useState, type RefObject } from "react";
import QRCode from "qrcode";

const MONO = "var(--font-texto)";
const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`;

/** Datos de la cuenta a la que se hace el depósito. `llave` es la llave de la
    cuenta (interbancaria/Nequi) por si el cliente prefiere enviar el dinero con
    ella en vez del número, y `qr` es el contenido que se pinta en el recuadro
    del QR para pagar escaneando. */
export const PAYMENT_INFO: Record<
  string,
  { icon: string; lines: string[]; llave: string; qr: string }
> = {
  Nequi: {
    icon: "💜",
    lines: [
      "Número Nequi: 310 555 1234",
      "Titular: La Sirena Pizza",
    ],
    llave: "310 555 1234",
    qr: "nequi://pay/3105551234?name=La%20Sirena%20Pizza",
  },
  Bancolombia: {
    icon: "🏦",
    lines: [
      "Cuenta de Ahorros: 690-1234567-89",
      "Titular: La Sirena Pizza SAS",
      "NIT: 900.123.456-7",
    ],
    llave: "900 123 456 789",
    qr: "https://banco.example.com/pagar?cuenta=690123456789&titular=La%20Sirena%20Pizza%20SAS",
  },
};

/** Payload que codifica el QR de pago: la base del medio elegido + el monto
    (`valor=`). Si la base ya trae "?" se concatena con "&"; si no, con "?".
    DEBE quedar igual en el backend (mail.service.js): el QR del correo de
    saldo faltante codifica exactamente lo mismo. */
export const payloadQrPago = (payment: string, monto: number): string => {
  const base = PAYMENT_INFO[payment]?.qr ?? "";
  return base ? `${base}${base.includes("?") ? "&" : "?"}valor=${monto}` : "";
};

/** Genera el QR de pago en el navegador (data URL) con la librería `qrcode`.
    Mismo contenido y estilo en el checkout, el modal "Completar pago" de Mis
    pedidos y las tarjetas de pedidos pendientes. */
export function useQrPago(payment: string, monto: number): string {
  const [qrDataUrl, setQrDataUrl] = useState("");
  useEffect(() => {
    let vivo = true;
    const payload = payloadQrPago(payment, monto);
    if (!payload) {
      setQrDataUrl("");
      return;
    }
    QRCode.toDataURL(payload, {
      margin: 1,
      width: 260,
      color: { dark: "#141414", light: "#ffffff" },
    })
      .then((url) => vivo && setQrDataUrl(url))
      .catch(() => vivo && setQrDataUrl(""));
    return () => {
      vivo = false;
    };
  }, [payment, monto]);
  return qrDataUrl;
}

/** Bloque "O deposita escaneando el QR": el mismo recuadro del checkout y del
    modal "Completar pago" de Mis pedidos (y de los pedidos pendientes). */
export function BloqueQrPago({
  payment,
  monto,
  qrDataUrl,
}: {
  payment: string;
  monto: number;
  qrDataUrl: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/50 p-4 flex flex-col items-center gap-3">
      <p className="w-full text-sm font-semibold text-foreground flex items-center gap-1.5">
        <QrCode className="w-4 h-4 text-primary" />
        O deposita escaneando el QR
      </p>
      <div className="bg-white rounded-xl p-3 border border-border shadow-sm">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt={`QR de pago ${payment}`} className="w-44 h-44" />
        ) : (
          <div className="w-44 h-44 flex flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground px-5">
            <span className="text-2xl">📱</span>
            Generando el QR…
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Escanea con la cámara o con tu app de pago y paga{" "}
        <strong className="text-foreground">{fmt(monto)}</strong>.
      </p>
    </div>
  );
}

/** Paso de pago por transferencia: datos de la cuenta + QR a la izquierda y
    subida del comprobante a la derecha. Es el mismo cuerpo que usa el checkout
    y el modal "Completar pago" de Mis pedidos (falta de dinero), para no
    duplicar el JSX. El encabezado (volver/cerrar) y el pie (enviar) los pone
    cada pantalla. */
export function PasoPagoTransferencia({
  payment,
  subtotal,
  qrDataUrl,
  comprobante,
  onQuitarComprobante,
  subiendo,
  fileRef,
  onFileChange,
}: {
  payment: string;
  subtotal: number;
  qrDataUrl: string;
  comprobante: string;
  onQuitarComprobante: () => void;
  subiendo: boolean;
  fileRef: RefObject<HTMLInputElement | null>;
  onFileChange: (file: File) => void;
}) {
  const info = PAYMENT_INFO[payment];
  return (
    <div className="px-5 py-5 grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
      {/* LEFT: datos de la cuenta + QR */}
      <div className="space-y-4">
        <div className="bg-muted/50 rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{info?.icon}</span>
            <p className="font-bold text-foreground text-base">{payment}</p>
          </div>
          <div className="space-y-1.5">
            {info?.lines.map((line, i) => (
              <p key={i} className="text-sm text-foreground font-medium">
                {line}
              </p>
            ))}
            <div className="flex items-center justify-between gap-3 pt-2 mt-1 border-t border-border">
              <span className="text-sm text-muted-foreground">Llave de la cuenta</span>
              <span className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>
                {info?.llave}
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-2">
            Realiza la transferencia por el valor exacto de{" "}
            <strong className="text-foreground">{fmt(subtotal)}</strong> y sube el comprobante.
          </p>
        </div>

        <BloqueQrPago payment={payment} monto={subtotal} qrDataUrl={qrDataUrl} />
      </div>

      {/* RIGHT: subir comprobante */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Upload className="w-4 h-4 text-primary" />
          Comprobante de pago *
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileChange(file);
            e.target.value = "";
          }}
        />
        {comprobante ? (
          <div className="relative rounded-xl overflow-hidden border border-border">
            <img
              src={comprobante}
              alt="Comprobante"
              className="w-full max-h-48 object-contain bg-muted"
            />
            <button
              onClick={onQuitarComprobante}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer transition-colors"
              aria-label="Quitar comprobante"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={subiendo}
            className="w-full flex flex-col items-center justify-center gap-3 py-8 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 cursor-pointer transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
              <ImageIcon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                {subiendo ? "Subiendo..." : "Haz clic para subir"}
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WEBP o PDF · máx 5 MB
              </p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
