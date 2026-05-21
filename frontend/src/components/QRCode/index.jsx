// QR Kod Bileşeni — etkinlik check-in ve sertifika doğrulama
import { QRCodeSVG } from 'qrcode.react';

/**
 * @param {string} value - QR içeriği (token, URL, qr_kod)
 * @param {number} size  - Piksel boyutu (varsayılan: 200)
 * @param {string} label - Altındaki açıklama metni
 */
function QRCode({ value, size = 200, label }) {
  if (!value) return null;

  return (
    <div className="qrcode-wrapper">
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        includeMargin={true}
        style={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
      />
      {label && <p className="qrcode-label">{label}</p>}
    </div>
  );
}

export default QRCode;
