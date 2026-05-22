// Şirket Paneli — İlan yönetimi, beceri profili, başvuru takibi
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './style.css';

const BOSH_FORM = { pozisyon: '', departman: '', konum: '', aciklama: '', ucret_var_mi: false, durum: 'aktif', bolum_kodu: '' };

function CompanyDashboard() {
  const { user } = useAuth();
  const [internships,  setInternships]  = useState([]);
  const [selectedId,   setSelectedId]   = useState(null);
  const [applications, setApplications] = useState([]);
  const [showForm,     setShowForm]     = useState(false);
  const [form,         setForm]         = useState(BOSH_FORM);
  const [profil,       setProfil]       = useState({});
  const [bolumler,     setBolumler]     = useState([]);
  const [kategoriler,  setKategoriler]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [msg,          setMsg]          = useState('');

  useEffect(() => {
    api.get('/internships', { params: { durum: 'aktif', limit: 50 } })
      .then(res => {
        const myIlanlar = res.data.filter(i => i.company_id === user?.id);
        setInternships(myIlanlar);
        if (myIlanlar.length > 0) setSelectedId(myIlanlar[0].id);
      })
      .finally(() => setLoading(false));

    api.get('/career/bolumler').then(res => setBolumler(res.data)).catch(() => {});
  }, [user]);

  // Bölüm seçilince slider kategorilerini güncelle
  const handleBolumChange = (bolum_kodu) => {
    setForm(f => ({ ...f, bolum_kodu }));
    if (!bolum_kodu) { setKategoriler([]); setProfil({}); return; }
    // Backend'den bu bölümün kategorilerini al
    api.get(`/career/bolumler`).then(res => {
      // Bölüm kategorileri career_data'dan geliyor, frontend'de data.py mevcut değil
      // Onun yerine basit bir static mapping kullanalım
    }).catch(() => {});
    // Static mapping frontend'de
    const KAT_MAP = {
      bilgisayar: ["Yazılım Dilleri","Web Teknolojileri","Veritabanı","DevOps & Araçlar","Yapay Zeka & Veri","Algoritma & Mantık","Siber Güvenlik","Proje Yönetimi"],
      makine:     ["CAD & Tasarım","Dinamik & Mekanik","Malzeme Bilimi","Termodinamik","Üretim & İmalat","CNC & Otomasyon","Kalite Kontrol","Proje Yönetimi"],
      insaat:     ["Statik & Betonarme","CAD & Çizim","Zemin Mekaniği","Yapı Malzemeleri","Proje Yönetimi","İş Sağlığı & Güvenliği","Harita & Coğrafya","Çevre & Sürdürülebilirlik"],
      elektrik:   ["Devre Teorisi","Güç Sistemleri","Elektronik Tasarım","Mikrodenetleyiciler","Otomasyon & PLC","Sinyal İşleme","Yenilenebilir Enerji","Proje Yönetimi"],
      endustri:   ["Süreç Optimizasyonu","Kalite Yönetimi","Lojistik & Tedarik","İstatistik & Veri Analizi","Simülasyon","Ergonomi","Proje Yönetimi","ERP Sistemleri"],
      gida:       ["Gıda Kimyası","Mikrobiyoloji","Gıda İşleme Teknolojisi","Kalite & HACCP","Paketleme","Gıda Mevzuatı","Ar-Ge & İnovasyon","Analitik Kimya"],
      gemi:       ["Gemi Tasarımı","Yapısal Analiz","Makine Sistemleri","Hidrodinamik","CAD & 3D Modelleme","Deniz Hukuku & Mevzuat","Bakım & Onarım","Proje Yönetimi"],
      mimarlik:   ["Mimari Tasarım","AutoCAD & Revit","Kentsel Planlama","Yapı Malzemeleri","İç Mimari","Adobe & Görsel Sunum","Sürdürülebilir Mimari","Restorasyon"],
      isletme:    ["Muhasebe & Finans","Pazarlama","Girişimcilik","İnsan Kaynakları","Stratejik Yönetim","Veri Analizi","Dijital Pazarlama","Proje Yönetimi"],
      psikoloji:  ["Klinik Psikoloji","Araştırma Yöntemleri","Nörobilim","Gelişim Psikolojisi","Endüstriyel Psikoloji","Veri Analizi & SPSS","Danışmanlık Becerileri","Raporlama"],
      sosyoloji:  ["Sosyal Araştırma","İstatistik & Analiz","Sosyal Politika","Kültürel Çalışmalar","Kent Sosyolojisi","Proje Tasarımı","İletişim Becerileri","Raporlama & Yazarlık"],
    };
    const cats = KAT_MAP[bolum_kodu] || [];
    setKategoriler(cats);
    setProfil(Object.fromEntries(cats.map(k => [k, 0])));
  };

  useEffect(() => {
    if (!selectedId) return;
    api.get(`/applications/internship/${selectedId}`)
      .then(res => setApplications(res.data))
      .catch(() => setApplications([]));
  }, [selectedId]);

  const decide = async (appId, durum) => {
    await api.put(`/applications/${appId}/decision`, { durum });
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, durum } : a));
  };

  const createInternship = async (e) => {
    e.preventDefault();
    if (!form.bolum_kodu) { setMsg('Lütfen bölüm seçin.'); return; }
    try {
      const res = await api.post('/internships', { ...form, beceri_profili: profil });
      setInternships(prev => [...prev, res.data]);
      setShowForm(false);
      setForm(BOSH_FORM);
      setProfil({});
      setKategoriler([]);
      setMsg('İlan oluşturuldu!');
    } catch {
      setMsg('İlan oluşturulamadı.');
    }
  };

  return (
    <div className="company-dashboard">
      <header className="dashboard-header">
        <h2>{user?.ad} — Şirket Paneli</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'İptal' : '+ Yeni İlan'}
        </button>
      </header>

      {msg && <p className="info-msg">{msg}</p>}

      {showForm && (
        <form className="ilan-form" onSubmit={createInternship}>
          <h3>Yeni Staj İlanı</h3>

          <input placeholder="Pozisyon *" required value={form.pozisyon}
            onChange={e => setForm(f => ({ ...f, pozisyon: e.target.value }))} />
          <input placeholder="Konum" value={form.konum}
            onChange={e => setForm(f => ({ ...f, konum: e.target.value }))} />
          <textarea placeholder="Açıklama" value={form.aciklama}
            onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))} rows={3} />
          <label className="checkbox-label">
            <input type="checkbox" checked={form.ucret_var_mi}
              onChange={e => setForm(f => ({ ...f, ucret_var_mi: e.target.checked }))} />
            {' '}Ücretli staj
          </label>

          {/* Bölüm Seçimi */}
          <div className="beceri-profil-baslik">
            <span>Hedef Bölüm *</span>
            <span className="muted" style={{ fontSize: '.8rem' }}>Beceri profili bölüme göre şekillenir</span>
          </div>
          <select value={form.bolum_kodu} onChange={e => handleBolumChange(e.target.value)} required>
            <option value="">— Bölüm seçin —</option>
            {bolumler.map(b => <option key={b.kod} value={b.kod}>{b.ad}</option>)}
          </select>

          {/* Beceri Profili — bölüm seçilince görünür */}
          {kategoriler.length > 0 && (
            <>
              <div className="beceri-profil-baslik">
                <span>Aranan Beceri Profili</span>
                <span className="muted" style={{ fontSize: '.8rem' }}>0 = önemli değil, 100 = zorunlu</span>
              </div>
              <div className="slider-grid">
                {kategoriler.map(k => (
                  <div key={k} className="slider-satir">
                    <div className="slider-label">
                      <span>{k}</span>
                      <strong>%{profil[k] ?? 0}</strong>
                    </div>
                    <input
                      type="range" min="0" max="100" step="5"
                      value={profil[k] ?? 0}
                      onChange={e => setProfil(p => ({ ...p, [k]: Number(e.target.value) }))}
                      className="skill-slider"
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          <button type="submit" className="btn-primary">Oluştur</button>
        </form>
      )}

      <div className="dashboard-grid">
        {/* İlan listesi */}
        <section className="dashboard-card listings-panel">
          <h3>İlanlarım ({internships.length})</h3>
          {loading ? <p className="muted">Yükleniyor...</p> :
            internships.length === 0 ? <p className="muted">Henüz ilan oluşturmadınız.</p> :
            <ul className="ilan-list">
              {internships.map(i => (
                <li key={i.id}
                  className={`ilan-item ${selectedId === i.id ? 'active' : ''}`}
                  onClick={() => setSelectedId(i.id)}>
                  <span className="pozisyon">{i.pozisyon}</span>
                  <span className="konum">{i.konum}</span>
                </li>
              ))}
            </ul>
          }
        </section>

        {/* Başvurular */}
        <section className="dashboard-card applications-panel">
          <h3>Başvurular {selectedId && `— ${internships.find(i => i.id === selectedId)?.pozisyon}`}</h3>
          {applications.length === 0
            ? <p className="muted">Bu ilana henüz başvuru yok.</p>
            : <ul className="app-list">
                {applications.map(app => (
                  <li key={app.id} className="app-item">
                    <div>
                      <strong>{app.student?.ad} {app.student?.soyad}</strong>
                      <p className="email">{app.student?.email}</p>
                    </div>
                    {app.durum === 'bekleyen' ? (
                      <div className="action-btns">
                        <button className="btn-accept" onClick={() => decide(app.id, 'kabul')}>Kabul</button>
                        <button className="btn-reject" onClick={() => decide(app.id, 'red')}>Reddet</button>
                      </div>
                    ) : (
                      <span className={`status-badge status-${app.durum}`}>
                        {app.durum === 'kabul' ? '✅ Kabul' : '❌ Red'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
          }
        </section>

        {/* Hızlı linkler */}
        <section className="dashboard-card quick-links">
          <h3>Araçlar</h3>
          <a href="/team-matcher" className="quick-link-card">
            <span className="icon">👥</span><span>Takım Eşleştirme</span>
          </a>
          <a href="/profile" className="quick-link-card">
            <span className="icon">🏢</span><span>Şirket Profili</span>
          </a>
        </section>
      </div>
    </div>
  );
}

export default CompanyDashboard;
