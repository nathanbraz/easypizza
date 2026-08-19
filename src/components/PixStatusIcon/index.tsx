import { QrCode } from 'lucide-react';
import './PixStatusIcon.css';

interface PixStatusIconProps {
  status: 'waiting' | 'confirmed';
  size?: number;
}

// Anel girando + QR pulsando enquanto aguarda, com transição pra um check verde "desenhado"
// via SVG assim que o pagamento é confirmado. Validado antes numa página de teste isolada
// (ver git log) antes de entrar no fluxo real do OrderTrackerPage.
export default function PixStatusIcon({ status, size = 56 }: PixStatusIconProps) {
  return (
    <div className={`pix-status-icon-wrap ${status}`} style={{ width: size, height: size }}>
      {status === 'waiting' ? (
        <>
          <span className="pix-status-ring" />
          <QrCode size={size * 0.42} className="pix-status-qr-icon" />
        </>
      ) : (
        <svg viewBox="0 0 52 52" className="pix-status-check-svg">
          <circle cx="26" cy="26" r="24" pathLength={1} className="pix-status-check-circle" />
          <path d="M14 27l7 7 17-17" pathLength={1} className="pix-status-check-path" />
        </svg>
      )}
    </div>
  );
}
