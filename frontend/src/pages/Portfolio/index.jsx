// Portfolyo — GitHub repo analizi + Sertifika doğrulama
import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import './style.css';

// ── Proje Ekleme Formu ───────────────────────────────────────────
function ProjeEkleForm({ onEklendi, onIptal }) {
  const [url,   setUrl]   = useState('');
  const [durum, setDurum] = useState('bosta');
  const [hata,  setHata]  = useState('');
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const analiz = async (e) => {
    e.preventDefault();
    if (!url.trim()) { setHata('GitHub URL girin.'); return; }
    setDurum('yukleniyor'); setHata('');
    try {
      const res = await api.post('/portfolio/analyze-github', { github_url: url.trim() });
      setDurum('tamam');
      onEklendi(res.data);
    } catch (err) {
      setHata(err.response?.data?.detail || 'Analiz başarısız.');
      setDurum('hata');
    }
  };

  return (
    <div className="proje-ekle-form dashboard-card">
      <h3>🔗 GitHub Repo Ekle</h3>
      {(durum === 'bosta' || durum === 'hata') ? (
        <form onSubmit={analiz}>
          <div className="github-input-row">
            <input ref={inputRef}
              placeholder="https://github.com/kullanici/repo"
              value={url}
              onChange={e => { setUrl(e.target.value); setHata(''); setDurum('bosta'); }}
              className="github-url-input" />
            <button type="submit" className="btn-primary" disabled={!url.trim()}>🤖 Analiz Et</button>
          </div>
          {hata && <p className="error-message" style={{ marginTop: '.5rem' }}>{hata}</p>}
          <p className="muted" style={{ fontSize: '.82rem', marginTop: '.4rem' }}>
            Public repo olmalı. AI tech stack'i otomatik tespit eder.
          </p>
          <button type="button" className="btn-secondary" onClick={onIptal} style={{ marginTop: '.5rem' }}>İptal</button>
        </form>
      ) : (
        <div className="yukle-durum">
          <div className="yukle-spinner" />
          <p>GitHub'dan dosyalar çekiliyor, AI analiz ediyor...</p>
          <p className="muted">10-20 saniye sürebilir.</p>
        </div>
      )}
    </div>
  );
}

// ── Bar bileşeni ────────────────────────────────────────────────
function MiniBar({ deger, renk = 'var(--primary)', max = 100 }) {
  const yuzde = Math.min((deger / max) * 100, 100);
  return (
    <div className="mini-bar-bg">
      <div className="mini-bar-fill" style={{ width: `${yuzde}%`, background: renk }} />
    </div>
  );
}

// ── Proje Kartı ─────────────────────────────────────────────────
function ProjeKarti({ proje, onSil }) {
  return (
    <div className="project-card">
      {/* Başlık */}
      <div className="proje-baslik">
        <h4>{proje.proje_adi}</h4>
        {proje.github_link && (
          <a href={proje.github_link} target="_blank" rel="noreferrer" className="github-link-badge">GitHub ↗</a>
        )}
      </div>

      {/* Konu */}
      {proje.konu && (
        <span className="proje-konu-badge">🏷️ {proje.konu}</span>
      )}

      {/* Açıklama */}
      {proje.aciklama && <p className="proje-aciklama">{proje.aciklama}</p>}

      {/* Teknolojiler */}
      {proje.teknolojiler?.length > 0 && (
        <div className="tech-tags">
          {proje.teknolojiler.map(t => (
            <span key={t} className="tag">💻 {t}</span>
          ))}
        </div>
      )}

      {/* Analiz değerleri */}
      {proje.proje_buyuklugu > 0 && (
        <div className="proje-metrikler">
          <div className="metrik-satir">
            <span className="metrik-label">Proje Büyüklüğü</span>
            <MiniBar deger={proje.proje_buyuklugu} renk="var(--accent)" />
            <span className="metrik-deger">%{proje.proje_buyuklugu}</span>
          </div>
          {proje.teknik_yetkinlik > 0 && (
            <div className="metrik-satir">
              <span className="metrik-label">Teknik Yetkinlik</span>
              <MiniBar deger={proje.teknik_yetkinlik} renk="var(--primary)" />
              <span className="metrik-deger">%{Math.round(proje.teknik_yetkinlik)}</span>
            </div>
          )}
          {proje.beceriler > 0 && (
            <div className="metrik-satir">
              <span className="metrik-label">Beceri Katkısı</span>
              <MiniBar deger={proje.beceriler * 100} renk="#10B981" max={100} />
              <span className="metrik-deger" style={{ color: '#065F46' }}>
                {(proje.beceriler * 100).toFixed(1)}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="card-actions">
        <button className="btn-delete" onClick={() => onSil(proje.id)}>Sil</button>
      </div>
    </div>
  );
}

// ── Sertifika Ekleme Formu ───────────────────────────────────────
function SertifikaForm({ onEklendi, onIptal }) {
  const [kurum,      setKurum]      = useState('btk');
  const [dosya,      setDosya]      = useState(null);
  const [durum,      setDurum]      = useState('bosta');
  const [sonuc,      setSonuc]      = useState(null);
  const [manuelNo,   setManuelNo]   = useState('');
  const [manuelYukl, setManuelYukl] = useState(false);
  const [hata,       setHata]       = useState('');
  const dosyaRef = useRef();

  const yukle = async () => {
    if (!dosya) { setHata('Lütfen dosya seçin.'); return; }
    setDurum('yukleniyor'); setHata('');
    const fd = new FormData();
    fd.append('dosya', dosya);
    try {
      const res = await api.post(`/certificates/upload?veren_kurum=${kurum}`, fd,
        { headers: { 'Content-Type': 'multipart/form-data' } });
      setSonuc(res.data);
      if (res.data.manuel_gerekli) setDurum('manuel');
      else { setDurum('tamam'); onEklendi(res.data); }
    } catch (err) {
      setHata(err.response?.data?.detail || 'Yükleme başarısız.');
      setDurum('bosta');
    }
  };

  const manuelDogrula = async () => {
    if (!manuelNo.trim()) { setHata('ID boş olamaz.'); return; }
    setManuelYukl(true); setHata('');
    try {
      const res = await api.post('/certificates/verify-manual', {
        sertifika_id: sonuc.id, cert_no: manuelNo.trim(),
      });
      if (res.data.id_hatali) {
        setHata('❌ Bu ID ile BTK sisteminde sertifika bulunamadı.');
      } else {
        setSonuc(prev => ({ ...prev, dogrulanmis: res.data.dogrulanmis }));
        setDurum('tamam');
        onEklendi({ ...sonuc, dogrulanmis: res.data.dogrulanmis });
      }
    } catch (err) {
      setHata(err.response?.data?.detail || 'Doğrulama başarısız.');
    } finally { setManuelYukl(false); }
  };

  return (
    <div className="sertifika-form dashboard-card">
      <h3>📄 Sertifika Ekle</h3>
      <div className="kurum-secici">
        {[{v:'btk',l:'🏛️ BTK Akademi'},{v:'diger',l:'📄 Diğer'}].map(k => (
          <button key={k.v} type="button"
            className={`kurum-btn ${kurum === k.v ? 'aktif' : ''}`}
            onClick={() => { setKurum(k.v); setDosya(null); setDurum('bosta'); setSonuc(null); setHata(''); }}>
            {k.l}
          </button>
        ))}
      </div>

      {(durum === 'bosta') && (
        <>
          <label className="dosya-label">
            {dosya ? `📎 ${dosya.name}` : kurum === 'btk' ? '📄 PDF seç (BTK sertifikası)' : '📎 Dosya seç (PNG, JPG, PDF)'}
            <input ref={dosyaRef} type="file"
              accept={kurum === 'btk' ? 'application/pdf' : 'image/png,image/jpeg,image/jpg,application/pdf'}
              style={{ display: 'none' }}
              onChange={e => { setDosya(e.target.files[0]); setHata(''); }} />
          </label>
          {hata && <p className="error-message">{hata}</p>}
          <div className="form-actions">
            <button className="btn-primary" onClick={yukle} disabled={!dosya}>
              {kurum === 'btk' ? 'Yükle & Doğrula' : 'Ekle'}
            </button>
            <button className="btn-secondary" onClick={onIptal}>İptal</button>
          </div>
        </>
      )}

      {durum === 'yukleniyor' && (
        <div className="yukle-durum">
          <div className="yukle-spinner" />
          <p>{kurum === 'btk' ? 'PDF okunuyor, BTK kontrol ediliyor...' : 'Kaydediliyor...'}</p>
        </div>
      )}

      {durum === 'manuel' && (
        <div className="manuel-bar">
          <p className="manuel-uyari">⚠️ BTK sisteminde sertifika numarasıyla kayıt bulunamadı.</p>
          {sonuc?.ocr && (
            <div className="ocr-onizleme">
              {sonuc.ocr.cert_no && <span>🔢 <strong>{sonuc.ocr.cert_no}</strong></span>}
              {sonuc.ocr.isim    && <span>👤 {sonuc.ocr.isim}</span>}
              {sonuc.ocr.kurs    && <span>📚 {sonuc.ocr.kurs}</span>}
              {sonuc.ocr.tarih   && <span>📅 {sonuc.ocr.tarih}</span>}
            </div>
          )}
          <p className="manuel-aciklama">Sertifikanın <strong>sağ üst köşesindeki</strong> numarayı girin:</p>
          <div className="manuel-row">
            <input className="manuel-input" placeholder="örn: 6mqF06j6vL"
              value={manuelNo} onChange={e => setManuelNo(e.target.value)} />
            <button className="btn-primary" onClick={manuelDogrula} disabled={manuelYukl}>
              {manuelYukl ? 'Kontrol ediliyor...' : 'Doğrula'}
            </button>
          </div>
          {hata && <p className="error-message">{hata}</p>}
          <button className="btn-secondary" style={{ marginTop: '.5rem' }} onClick={onIptal}>Vazgeç</button>
        </div>
      )}
    </div>
  );
}

// ── Sertifika Kartı ──────────────────────────────────────────────
function parseMeta(ocr_metin) {
  if (!ocr_metin) return {};
  const al = (alan) => { const m = ocr_metin.match(new RegExp(`^${alan}:(.+)$`, 'm')); return m ? m[1].trim() : ''; };
  return { cert_no: al('cert_no'), isim: al('isim'), tarih: al('tarih') };
}

function SertifikaKarti({ cert, onSil }) {
  const kurum = cert.veren_kurum === 'btk' ? '🏛️ BTK Akademi' : '📄 Diğer';
  const meta  = cert.veren_kurum === 'btk' ? parseMeta(cert.ocr_metin) : {};
  return (
    <div className={`cert-card ${cert.dogrulanmis ? 'dogrulanmis' : ''}`}>
      <div className="cert-card-header">
        <div className="cert-card-info">
          <strong className="cert-ad">{cert.ad}</strong>
          <span className="cert-kurum">{kurum}</span>
        </div>
        <div className="cert-card-durum">
          {cert.dogrulanmis
            ? <span className="dogru-badge">✅ Doğrulandı</span>
            : <span className="red-badge">⏳ Doğrulanmadı</span>}
        </div>
      </div>
      {cert.dogrulanmis && cert.veren_kurum === 'btk' && (
        <div className="cert-meta">
          {meta.isim    && <span>👤 {meta.isim}</span>}
          {meta.cert_no && <span>🔢 {meta.cert_no}</span>}
          {meta.tarih   && <span>📅 {meta.tarih}</span>}
        </div>
      )}
      {!cert.dogrulanmis && cert.ocr_metin?.includes('neden:') && (
        <p className="cert-red-neden">
          {cert.ocr_metin.match(/neden:(.+)/)?.[1]?.trim()}
        </p>
      )}
      <div className="cert-card-actions">
        <button className="btn-delete" onClick={() => onSil(cert.id)}>Sil</button>
      </div>
    </div>
  );
}

// ── Ana Sayfa ────────────────────────────────────────────────────
function Portfolio() {
  const [projects,      setProjects]      = useState([]);
  const [certificates,  setCertificates]  = useState([]);
  const [showProjForm,  setShowProjForm]  = useState(false);
  const [showCertForm,  setShowCertForm]  = useState(false);
  const [msg,           setMsg]           = useState('');
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/portfolio/projects'),
      api.get('/certificates/me'),
    ]).then(([p, c]) => { setProjects(p.data); setCertificates(c.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const projeEklendi = (p) => {
    setProjects(prev => [p, ...prev]);
    setShowProjForm(false);
    setMsg(`✅ "${p.proje_adi}" eklendi! ${p.teknolojiler?.length || 0} teknoloji tespit edildi.`);
    setTimeout(() => setMsg(''), 5000);
  };

  const certEklendi = () => {
    api.get('/certificates/me').then(r => setCertificates(r.data)).catch(() => {});
    setShowCertForm(false);
    setMsg('Sertifika eklendi.');
    setTimeout(() => setMsg(''), 3000);
  };

  if (loading) return <div className="loading-spinner" style={{ margin: '4rem auto' }} />;

  return (
    <div className="portfolio-page">
      {msg && <p className="info-msg">{msg}</p>}

      {/* ── Projeler ── */}
      <section className="portfolio-section">
        <div className="page-header">
          <h2>Projelerim ({projects.length})</h2>
          <button className="btn-primary" onClick={() => { setShowProjForm(f => !f); setShowCertForm(false); }}>
            {showProjForm ? 'İptal' : '+ Proje Ekle'}
          </button>
        </div>

        {showProjForm && <ProjeEkleForm onEklendi={projeEklendi} onIptal={() => setShowProjForm(false)} />}

        {projects.length === 0 && !showProjForm ? (
          <div className="empty-state">
            <span style={{ fontSize: '2.5rem' }}>🔗</span>
            <p>Henüz proje eklemediniz.</p>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(p => <ProjeKarti key={p.id} proje={p} onSil={id => { api.delete(`/portfolio/projects/${id}`); setProjects(prev => prev.filter(x => x.id !== id)); }} />)}
          </div>
        )}
      </section>

      {/* ── Sertifikalar ── */}
      <section className="portfolio-section" style={{ marginTop: '2.5rem' }}>
        <div className="page-header">
          <h2>Sertifikalarım ({certificates.length})</h2>
          <button className="btn-primary" onClick={() => { setShowCertForm(f => !f); setShowProjForm(false); }}>
            {showCertForm ? 'İptal' : '+ Sertifika Ekle'}
          </button>
        </div>

        {showCertForm && <SertifikaForm onEklendi={certEklendi} onIptal={() => setShowCertForm(false)} />}

        <div className="cert-list">
          {certificates.map(c => (
            <SertifikaKarti key={c.id} cert={c}
              onSil={id => { api.delete(`/certificates/${id}`); setCertificates(prev => prev.filter(x => x.id !== id)); }} />
          ))}
          {certificates.length === 0 && !showCertForm && <p className="muted">Henüz sertifika eklemediniz.</p>}
        </div>
      </section>
    </div>
  );
}

export default Portfolio;
