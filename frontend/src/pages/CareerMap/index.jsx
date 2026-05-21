// Kariyer Yol Haritası — Radar grafik + gap analizi
import { useState, useEffect } from 'react';
import RadarChart from '../../components/RadarChart';
import api from '../../services/api';
import './style.css';

const ROLLER = [
  { id: 'backend', label: 'Backend Geliştirici' },
  { id: 'frontend', label: 'Frontend Geliştirici' },
  { id: 'data', label: 'Veri Bilimci' },
  { id: 'embedded', label: 'Gömülü Sistemler' },
  { id: 'management', label: 'Proje Yöneticisi' },
];

function CareerMap() {
  const [radarData, setRadarData] = useState([]);
  const [beceriSayisi, setBeceriSayisi] = useState(0);
  const [targetRole, setTargetRole] = useState('backend');
  const [gap, setGap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/career/radar')
      .then(res => {
        setRadarData(res.data.radar || []);
        setBeceriSayisi(res.data.beceri_sayisi || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get(`/career/gap-analysis?target_role=${targetRole}`)
      .then(res => setGap(res.data))
      .catch(() => {});
  }, [targetRole]);

  return (
    <div className="career-map-page">
      <h2>🗺️ Kariyer Haritam</h2>
      <p className="subtitle">Mevcut becerilerine göre kişiselleştirilmiş kariyer analizi</p>

      <div className="career-grid">
        {/* Radar Grafiği */}
        <section className="radar-section dashboard-card">
          <h3>Beceri Profili ({beceriSayisi} beceri)</h3>
          {loading
            ? <p className="muted">Yükleniyor...</p>
            : beceriSayisi === 0
              ? (
                <div className="empty-state">
                  <p>Henüz CV'nize beceri eklemediniz.</p>
                  <a href="/profile" className="btn-primary">CV'yi Güncelle</a>
                </div>
              )
              : <RadarChart data={radarData} />
          }
        </section>

        {/* Gap Analizi */}
        <section className="gap-section dashboard-card">
          <h3>Gap Analizi</h3>
          <div className="role-selector">
            <label>Hedef Rol:</label>
            <select value={targetRole} onChange={e => setTargetRole(e.target.value)}>
              {ROLLER.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>

          {gap && (
            <>
              <div className="progress-bar-wrapper">
                <div className="progress-label">
                  <span>{gap.hedef_rol}</span>
                  <strong>{gap.tamamlanma_yuzdesi}%</strong>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${gap.tamamlanma_yuzdesi}%` }} />
                </div>
              </div>

              <div className="gap-columns">
                <div className="gap-col">
                  <h4>✅ Sahip Olduğunuz ({gap.sahip_olunan.length})</h4>
                  <ul>
                    {gap.sahip_olunan.map(b => <li key={b} className="skill-have">{b}</li>)}
                  </ul>
                </div>
                <div className="gap-col">
                  <h4>📚 Eksik ({gap.eksik_beceriler.length})</h4>
                  <ul>
                    {gap.eksik_beceriler.map(b => (
                      <li key={b} className="skill-missing">
                        {b}
                        <a
                          href={`https://www.udemy.com/courses/search/?q=${encodeURIComponent(b)}`}
                          target="_blank" rel="noreferrer"
                          className="learn-link"
                        > öğren →</a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default CareerMap;
