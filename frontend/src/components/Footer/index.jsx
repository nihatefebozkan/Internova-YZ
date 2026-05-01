// Alt Bilgi — BTÜ + Bursa Sanayi logoları, sosyal linkler, hızlı bağlantılar
// Dolduracak: Melike

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-brand">
          <p>İnternova YZ</p>
          <small>BTÜ &amp; Bursa Sanayi Kariyer Köprüsü</small>
        </div>
        <div className="footer-links">
          {/* Hızlı linkler */}
        </div>
        <div className="footer-social">
          {/* LinkedIn, GitHub ikonları */}
        </div>
      </div>
      <p className="footer-copy">&copy; {new Date().getFullYear()} İnternova YZ</p>
    </footer>
  );
}

export default Footer;
