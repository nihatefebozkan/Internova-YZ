// Kariyer Yol Haritası — Bölüme göre dinamik radar + gap analizi
import { useState, useEffect } from 'react';
import RadarChart from '../../components/RadarChart';
import api from '../../services/api';
import './style.css';

function CareerMap() {
  const [radarData,      setRadarData]      = useState([]);
  const [beceriSayisi,   setBeceriSayisi]   = useState(0);
  const [bolumAdi,       setBolumAdi]       = useState('');
  const [targetRole,     setTargetRole]     = useState('');
  const [gap,            setGap]            = useState(null);
  const [roller,         setRoller]         = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [aiYukleniyor,   setAiYukleniyor]   = useState(false);
  const [aiMsg,          setAiMsg]          = useState('');
  const [katki,          setKatki]          = useState(null); // AI katkı detayları

  const radarYenile = () => {
    api.get('/career/radar').then(res => {
      setRadarData(res.data.radar || []);
      setBeceriSayisi(res.data.beceri_sayisi || 0);
      setBolumAdi(res.data.bolum_adi || '');
    }).catch(() => {});
  };

  const aiProfiliOlustur = async () => {
    setAiYukleniyor(true); setAiMsg('');
    try {
      const res = await api.post('/career/generate-profile');
      if (res.data.basarili) {
        setAiMsg(`✅ Profil oluşturuldu! ${res.data.beceriler?.length || 0} kategori güncellendi.`);
        setKatki(res.data.radar); // katkı detaylarını sakla
        radarYenile();
      } else {
        setAiMsg(`⚠️ ${res.data.mesaj}`);
      }
    } catch (err) {
      setAiMsg(err.response?.data?.detail || '❌ Profil oluşturulamadı.');
    } finally {
      setAiYukleniyor(false);
      setTimeout(() => setAiMsg(''), 6000);
    }
  };

  useEffect(() => {
    // Radar verisi (bölüme göre otomatik)
    api.get('/career/radar')
      .then(res => {
        setRadarData(res.data.radar || []);
        setBeceriSayisi(res.data.beceri_sayisi || 0);
        setBolumAdi(res.data.bolum_adi || '');
      })

      .catch(() => {})
      .finally(() => setLoading(false));

    // Bölüme göre hedef roller
    api.get('/career/roles')
      .then(res => {
        setRoller(res.data);
        if (res.data.length > 0) setTargetRole(res.data[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!targetRole) return;
    api.get(`/career/gap-analysis?target_role=${encodeURIComponent(targetRole)}`)
      .then(res => setGap(res.data))
      .catch(() => {});
  }, [targetRole]);

  return (
    <div className="career-map-page">
      <h2>🗺️ Kariyer Haritam</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '.5rem' }}>
        {bolumAdi
          ? <p className="subtitle" style={{ margin: 0 }}>{bolumAdi} bölümüne göre kariyer analizi</p>
          : <p className="subtitle muted" style={{ margin: 0 }}>Bölüm seçmek için <a href="/profile">Profil</a>'i güncelle</p>
        }
        <button
          className="btn-ai"
          onClick={aiProfiliOlustur}
          disabled={aiYukleniyor}
          style={{ fontSize: '.85rem', padding: '.45rem 1rem' }}
        >
          {aiYukleniyor ? '⏳ Analiz ediliyor...' : '🤖 AI ile Profil Oluştur'}
        </button>
      </div>
      {aiMsg && <p className="info-msg" style={{ marginBottom: '.75rem' }}>{aiMsg}</p>}

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

          {roller.length === 0
            ? <p className="muted">Bölüm seçilmedi. <a href="/profile">Profil'den bölüm seç</a></p>
            : (
              <>
                <div className="role-selector">
                  <label>Hedef Rol:</label>
                  <select value={targetRole} onChange={e => setTargetRole(e.target.value)}>
                    {roller.map(r => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
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
              </>
            )
          }
        </section>
      </div>
      {/* Katkı Detayları */}
      {katki && katki.some(k => k.katkilar?.length > 0) && (
        <section className="dashboard-card katki-detay">
          <h3>📊 Hangi Kaynak Nelere Katkı Sağladı?</h3>
          <div className="katki-grid">
            {katki.filter(k => k.skor > 0 && k.katkilar?.length > 0).map(k => (
              <div key={k.kategori} className="katki-karti">
                <div className="katki-baslik">
                  <span className="katki-kat">{k.kategori}</span>
                  <span className="katki-toplam">%{k.skor}</span>
                </div>
                <ul className="katki-liste">
                  {k.katkilar.map((kt, i) => {
                    const parcalar = (kt.kaynak || '').split(':');
                    const solTaraf = parcalar[0]?.trim() || kt.kaynak;
                    const sagTaraf = parcalar.slice(1).join(':').trim();
                    const ikonSertifika = solTaraf.toLowerCase().includes('sertifika');
                    const gosterilen = kt.etki;
                    const barGenislik = kt.etki; // backend zaten cap'ledi
                    return (
                      <li key={i} className="katki-satir">
                        <div className="katki-satir-baslik">
                          {ikonSertifika ? '🏅' : '💻'}{' '}
                          <strong>{solTaraf}</strong>
                          {sagTaraf && <span className="katki-sag"> : {sagTaraf}</span>}
                        </div>
                        <div className="katki-alt">
                          <div className="katki-bar-bg">
                            <div className="katki-bar" style={{ width: `${barGenislik}%` }} />
                          </div>
                          <span className="katki-etki">%{gosterilen}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default CareerMap;
