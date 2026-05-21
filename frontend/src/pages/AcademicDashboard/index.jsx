// BTÜ Akademisyen Paneli — Onay kuyruğu (Sprint 3), istatistikler
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './style.css';

function AcademicDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ ogrenci: 0, sirket: 0, ilan: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/users', { params: { role: 'student', limit: 1 } }).catch(() => ({ data: [] })),
      api.get('/companies', { params: { limit: 1 } }).catch(() => ({ data: [] })),
      api.get('/internships', { params: { limit: 1 } }).catch(() => ({ data: [] })),
    ]).then(([, sirketRes, ilanRes]) => {
      setStats({ sirket: sirketRes.data.length, ilan: ilanRes.data.length });
    });
  }, []);

  return (
    <div className="academic-dashboard">
      <header className="dashboard-header">
        <h2>Hoş geldin, {user?.ad} {user?.soyad}</h2>
        <p className="subtitle">BTÜ Akademisyen Paneli</p>
      </header>

      <div className="dashboard-grid">
        {/* İstatistikler */}
        <section className="dashboard-card stats-panel">
          <h3>Platform İstatistikleri</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{stats.sirket}</span>
              <span className="stat-label">Aktif Şirket</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.ilan}</span>
              <span className="stat-label">Staj İlanı</span>
            </div>
          </div>
        </section>

        {/* Staj Defteri Onay Kuyruğu — Sprint 3'te doldurulacak */}
        <section className="dashboard-card approval-queue">
          <h3>Onay Kuyruğu</h3>
          <p className="muted">Staj defteri onay sistemi Sprint 3'te aktifleşecek.</p>
        </section>

        {/* BTÜ Yönetmelik */}
        <section className="dashboard-card regulation-panel">
          <h3>BTÜ Staj Yönetmeliği</h3>
          <p className="muted">YZ destekli yönetmelik asistanı Sprint 5'te aktifleşecek.</p>
        </section>
      </div>
    </div>
  );
}

export default AcademicDashboard;
