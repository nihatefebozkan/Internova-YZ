// QR Kod Bileşeni — Staj defteri, sertifika ve etkinlik girişi için QR üretme/okuma
// Dolduracak: Bilgenur (qrcode.react kütüphanesi)

// import { QRCodeSVG } from 'qrcode.react';

/**
 * @param {string} value - QR kodun işaret edeceği URL veya token
 * @param {number} size - Piksel cinsinden boyut (varsayılan: 200)
 * @param {string} label - Altında görünecek açıklama
 */
function QRCode({ value, size = 200, label }) {
  if (!value) return null;

  return (
    <div className="qrcode-wrapper">
      {/* <QRCodeSVG value={value} size={size} /> */}
      <div className="qrcode-placeholder" style={{ width: size, height: size }}>
        QR: {value}
      </div>
      {label && <p className="qrcode-label">{label}</p>}
    </div>
  );
}

export default QRCode;
