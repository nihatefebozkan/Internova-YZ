// Öğrenci Paneli — Aktif başvurular, profil özeti, hızlı linkler
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './style.css';

const DURUM_RENK = {
  bekleyen: '#f59e0b',
  kabul: '#10b981',
  red: '#ef4444',
};

const DURUM_LABEL = {
  bekleyen: 'Bekliyor',
  kabul: 'Kabul Edildi',
  red: 'Reddedildi',
};

function StudentDashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/applications/me')
      .then(res => setApplications(res.data.slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const ad = [user?.ad, user?.soyad].filter(Boolean).join(' ');

  return (
    <div className="student-dashboard">
      <header className="dashboard-header">
        <h2>Hoş geldin, {ad || user?.email}! 👋</h2>
        <p className="subtitle">BTÜ Kariyer & Staj Platformu</p>
      </header>

      <div className="dashboard-grid">
        {/* Başvurular */}
        <section className="dashboard-card applications-widget">
          <div className="card-header">
            <h3>Başvurularım</h3>
            <span className="badge-count">{applications.length}</span>
          </div>
          {loading ? (
            <p className="muted">Yükleniyor...</p>
          ) : applications.length === 0 ? (
            <div className="empty-state">
              <p>Henüz başvuru yapmadınız.</p>
              <Link to="/internships" className="btn-primary">İlanları Keşfet</Link>
            </div>
          ) : (
            <ul className="applications-list">
              {applications.map(app => (
                <li key={app.id} className="application-item">
                  <span className="pozisyon">{app.internship?.pozisyon || 'Staj'}</span>
                  <span
                    className="durum-badge"
                    style={{ color: DURUM_RENK[app.durum] }}
                  >
                    {DURUM_LABEL[app.durum]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Hızlı Erişim */}
        <section className="dashboard-card quick-links">
          <h3>Hızlı Erişim</h3>
          <div className="link-grid">
            <Link to="/portfolio" className="quick-link-card">
              <span className="icon">📁</span>
              <span>Portfolyo</span>
            </Link>
            <Link to="/career-map" className="quick-link-card">
              <span className="icon">🗺️</span>
              <span>Kariyer Haritası</span>
            </Link>
            <Link to="/internship-book" className="quick-link-card">
              <span className="icon">📔</span>
              <span>Staj Defteri</span>
            </Link>
            <Link to="/badges" className="quick-link-card">
              <span className="icon">🏅</span>
              <span>Rozetlerim</span>
            </Link>
            <Link to="/team-matcher" className="quick-link-card">
              <span className="icon">👥</span>
              <span>Takım Bul</span>
            </Link>
            <Link to="/internships" className="quick-link-card">
              <span className="icon">💼</span>
              <span>Staj İlanları</span>
            </Link>
          </div>
        </section>

        {/* Profil Özeti */}
        <section className="dashboard-card profile-widget">
          <h3>Profilim</h3>
          <div className="profile-info">
            <p><strong>Bölüm:</strong> {user?.bolum || '—'}</p>
            <p><strong>Öğrenci No:</strong> {user?.ogrenci_no || '—'}</p>
            <p><strong>E-posta:</strong> {user?.email}</p>
          </div>
          <Link to="/profile" className="btn-secondary">Profili Düzenle</Link>
        </section>

        {/* YZ Önerileri — Sprint 5'te doldurulacak */}
        <section className="dashboard-card ai-widget">
          <h3>YZ Staj Önerileri</h3>
          <p className="muted">Profilinizi tamamladığınızda kişiselleştirilmiş öneriler burada görünecek.</p>
          <Link to="/profile" className="btn-secondary">Profili Tamamla</Link>
        </section>
      </div>
    </div>
  );
}

export default StudentDashboard;
