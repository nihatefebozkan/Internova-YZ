// Ana Sayfa — Hero, özellik kartları, CTA
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './style.css';

const OZELLIKLER = [
  { ikon: '🤖', baslik: 'YZ Staj Defteri', aciklama: 'Günlük notlarını akademik metne dönüştür, PDF oluştur.' },
  { ikon: '🗺️', baslik: 'Kariyer Haritası', aciklama: 'Radar grafiğiyle beceri boşluklarını gör, hedef role ulaş.' },
  { ikon: '👥', baslik: 'Takım Eşleştirme', aciklama: '%83+ doğrulukla TF-IDF algoritmasıyla takım bul.' },
  { ikon: '🏅', baslik: 'Rozet Sistemi', aciklama: 'Her başarı için rozet kazan, XP puan biriktir.' },
  { ikon: '📷', baslik: 'Sertifika Doğrulama', aciklama: 'OCR ile sertifikaları otomatik doğrula.' },
  { ikon: '💬', baslik: 'YZ Asistan', aciklama: 'BTÜ staj yönetmeliğini anında sorgula.' },
];

function Home() {
  const { user } = useAuth();

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <h1>
            Hayalindeki Stajı Bul
            <span className="hero-accent"> — YZ Destekli</span>
          </h1>
          <p className="hero-subtitle">
            Bursa Teknik Üniversitesi öğrencileri, akademisyenler ve
            Bursa sanayisi için tek platform.
          </p>
          <div className="hero-actions">
            {user ? (
              <Link to="/dashboard" className="btn-primary btn-lg">
                Panelime Git →
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary btn-lg">
                  Ücretsiz Başla
                </Link>
                <Link to="/internships" className="btn-secondary btn-lg">
                  Stajlara Göz At
                </Link>
              </>
            )}
          </div>
          <p className="hero-stats">
            <span>🎓 BTÜ</span>
            <span>🏭 Bursa Sanayi</span>
            <span>🤖 Gemini AI</span>
          </p>
        </div>
      </section>

      {/* Özellikler */}
      <section className="features">
        <h2>Platform Özellikleri</h2>
        <div className="features-grid">
          {OZELLIKLER.map(o => (
            <div key={o.baslik} className="feature-card">
              <span className="feature-icon">{o.ikon}</span>
              <h3>{o.baslik}</h3>
              <p>{o.aciklama}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="cta">
          <h2>Hemen Başla</h2>
          <p>Öğrenci, akademisyen veya şirket olarak platforma katıl.</p>
          <Link to="/register" className="btn-primary btn-lg">Kayıt Ol</Link>
        </section>
      )}
    </div>
  );
}

export default Home;
