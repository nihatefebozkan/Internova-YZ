// Staj İlanı Detay — Şirketin beceri profili, ilan bilgileri, başvur
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import api from '../../services/api';
import './style.css';

// Kategoriler ilanın beceri_profili key'lerinden dinamik alınır

function InternshipDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ilan,      setIlan]      = useState(null);
  const [cvBeceri,  setCvBeceri]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [basvurdu,  setBasvurdu]  = useState(false);
  const [basvuruYukleniyor, setBasvuruYukleniyor] = useState(false);
  const [msg,       setMsg]       = useState('');

  useEffect(() => {
    api.get(`/internships/${id}`)
      .then(res => setIlan(res.data))
      .catch(() => navigate('/internships'))
      .finally(() => setLoading(false));

    // Öğrencinin CV becerileri (karşılaştırma için)
    if (user?.role === 'student') {
      api.get('/career/radar').then(res => setCvBeceri(res.data.radar)).catch(() => {});
    }
  }, [id, user, navigate]);

  const basvur = async () => {
    setBasvuruYukleniyor(true);
    try {
      await api.post(`/internships/${id}/apply`, { on_yazi: '' });
      setBasvurdu(true);
      setMsg('Başvurunuz alındı!');
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Başvuru yapılamadı.');
    } finally {
      setBasvuruYukleniyor(false);
    }
  };

  if (loading) return <div className="loading-spinner" />;
  if (!ilan)   return null;

  // Kategoriler ilanın kendi beceri_profili key'lerinden gelir
  const sirketProfil = ilan.beceri_profili || {};
  const kategoriler  = Object.keys(sirketProfil);
  const profilVar    = kategoriler.some(k => sirketProfil[k] > 0);

  const radarData = kategoriler.map(k => ({
    kategori: k.length > 14 ? k.slice(0, 14) + '…' : k,
    sirket:   sirketProfil[k] ?? 0,
    ben:      cvBeceri ? (cvBeceri.find(c => c.kategori === k)?.skor ?? 0) : undefined,
  }));

  return (
    <div className="internship-detail">
      {/* Başlık */}
      <div className="detail-header">
        <button className="btn-secondary back-btn" onClick={() => navigate(-1)}>← Geri</button>
        <div>
          <h1>{ilan.pozisyon}</h1>
          <p className="sirket-adi">{ilan.company?.ad} {ilan.company?.soyad}</p>
        </div>
        {user?.role === 'student' && (
          <button
            className="btn-primary bas-btn"
            onClick={basvur}
            disabled={basvurdu || basvuruYukleniyor}
          >
            {basvurdu ? '✅ Başvuruldu' : basvuruYukleniyor ? 'Gönderiliyor...' : 'Başvur'}
          </button>
        )}
      </div>

      {msg && <p className="info-msg">{msg}</p>}

      <div className="detail-grid">
        {/* Sol: İlan bilgileri */}
        <section className="detail-info dashboard-card">
          <h3>İlan Bilgileri</h3>
          <div className="info-row"><span>📍 Konum</span><strong>{ilan.konum || '—'}</strong></div>
          <div className="info-row"><span>🏢 Departman</span><strong>{ilan.departman || '—'}</strong></div>
          <div className="info-row"><span>👥 Kontenjan</span><strong>{ilan.kontenjan}</strong></div>
          <div className="info-row"><span>💰 Ücret</span><strong>{ilan.ucret_var_mi ? 'Ücretli' : 'Ücretsiz'}</strong></div>
          {ilan.basvuru_son_tarih && (
            <div className="info-row">
              <span>📅 Son Başvuru</span>
              <strong>{new Date(ilan.basvuru_son_tarih).toLocaleDateString('tr-TR')}</strong>
            </div>
          )}
          {ilan.staj_baslangic && (
            <div className="info-row">
              <span>🗓️ Staj Dönemi</span>
              <strong>
                {new Date(ilan.staj_baslangic).toLocaleDateString('tr-TR')} –{' '}
                {ilan.staj_bitis ? new Date(ilan.staj_bitis).toLocaleDateString('tr-TR') : '?'}
              </strong>
            </div>
          )}
          {ilan.aciklama && (
            <div className="detail-aciklama">
              <h4>Açıklama</h4>
              <p>{ilan.aciklama}</p>
            </div>
          )}
          {ilan.gereksinimler && (
            <div className="detail-aciklama">
              <h4>Gereksinimler</h4>
              <p>{ilan.gereksinimler}</p>
            </div>
          )}
        </section>

        {/* Sağ: Beceri profili */}
        {!profilVar && (
          <section className="detail-beceri dashboard-card">
            <h3>Aranan Beceri Profili</h3>
            <p className="muted">Bu ilan için henüz beceri profili belirlenmemiş.</p>
          </section>
        )}
        {profilVar && (
          <section className="detail-beceri dashboard-card">
            <h3>Aranan Beceri Profili</h3>
            {user?.role === 'student' && cvBeceri && (
              <p className="profil-aciklama muted">
                🔵 Şirketin istediği &nbsp;|&nbsp; 🟠 Senin profilin
              </p>
            )}
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="kategori" tick={{ fontSize: 11 }} />
                <Radar
                  name="Şirket"
                  dataKey="sirket"
                  stroke="#4F46E5"
                  fill="#4F46E5"
                  fillOpacity={0.3}
                />
                {user?.role === 'student' && cvBeceri && (
                  <Radar
                    name="Senin Profilin"
                    dataKey="ben"
                    stroke="#F59E0B"
                    fill="#F59E0B"
                    fillOpacity={0.25}
                  />
                )}
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>

            {/* Kategori listesi */}
            <div className="beceri-liste">
              {kategoriler.filter(k => sirketProfil[k] > 0).map(k => (
                <div key={k} className="beceri-satir">
                  <span>{k}</span>
                  <div className="beceri-bar-bg">
                    <div className="beceri-bar-fill" style={{ width: `${sirketProfil[k]}%` }} />
                  </div>
                  <span className="beceri-puan">%{sirketProfil[k]}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default InternshipDetail;
