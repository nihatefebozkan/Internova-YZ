// Portfolyo — Proje yönetimi + Sertifika doğrulama
import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import './style.css';

const BOSH_FORM = { proje_adi: '', aciklama: '', github_link: '', demo_link: '', teknolojiler: '' };

// ── Sertifika Ekleme Formu ───────────────────────────────────────
function SertifikaForm({ onEklendi, onIptal }) {
  const [kurum,      setKurum]      = useState('btk');
  const [dosya,      setDosya]      = useState(null);
  const [durum,      setDurum]      = useState('bosta'); // bosta|yukleniyor|manuel|tamam
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
      const res = await api.post(
        `/certificates/upload?veren_kurum=${kurum}`,
        fd, { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setSonuc(res.data);
      if (res.data.manuel_gerekli) {
        setDurum('manuel');
      } else {
        setDurum('tamam');
        onEklendi(res.data);
      }
    } catch (err) {
      setHata(err.response?.data?.detail || 'Yükleme başarısız.');
      setDurum('bosta');
    }
  };

  const manuelDogrula = async () => {
    if (!manuelNo.trim()) { setHata('Sertifika No boş olamaz.'); return; }
    setManuelYukl(true); setHata('');
    try {
      const res = await api.post('/certificates/verify-manual', {
        sertifika_id: sonuc.id,
        cert_no: manuelNo.trim(),
      });
      if (res.data.id_hatali) {
        setHata('❌ Bu ID ile BTK sisteminde sertifika bulunamadı. ID hatalı.');
      } else {
        setSonuc(prev => ({ ...prev, dogrulanmis: res.data.dogrulanmis }));
        setDurum('tamam');
        onEklendi({ ...sonuc, dogrulanmis: res.data.dogrulanmis });
      }
    } catch (err) {
      setHata(err.response?.data?.detail || 'Doğrulama başarısız.');
    } finally {
      setManuelYukl(false);
    }
  };

  return (
    <div className="sertifika-form">
      {/* Kurum seçici */}
      <div className="kurum-secici">
        <button type="button"
          className={`kurum-btn ${kurum === 'btk' ? 'aktif' : ''}`}
          onClick={() => { setKurum('btk'); setDosya(null); setDurum('bosta'); setSonuc(null); setHata(''); }}>
          🏛️ BTK Akademi
        </button>
        <button type="button"
          className={`kurum-btn ${kurum === 'diger' ? 'aktif' : ''}`}
          onClick={() => { setKurum('diger'); setDosya(null); setDurum('bosta'); setSonuc(null); setHata(''); }}>
          📄 Diğer
        </button>
      </div>

      {/* Dosya seç + yükle */}
      {durum === 'bosta' && (
        <>
          <label className="dosya-label">
            {dosya
              ? `📎 ${dosya.name}`
              : kurum === 'btk' ? '📄 PDF seç (BTK sertifikası)' : '📎 Dosya seç (PNG, JPG, PDF)'}
            <input ref={dosyaRef} type="file"
              accept={kurum === 'btk' ? 'application/pdf' : 'image/png,image/jpeg,image/jpg,application/pdf'}
              style={{ display: 'none' }}
              onChange={e => { setDosya(e.target.files[0]); setHata(''); }}
            />
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

      {/* Yükleniyor */}
      {durum === 'yukleniyor' && (
        <div className="yukle-durum">
          <div className="yukle-spinner" />
          <p>PDF okunuyor, BTK kontrol ediliyor...</p>
          <p className="muted">Bu işlem ~15 saniye sürebilir.</p>
        </div>
      )}

      {/* Manuel ID barı */}
      {durum === 'manuel' && (
        <div className="manuel-bar">
          <p className="manuel-uyari">
            ⚠️ Sertifika numarası ile BTK sisteminde kayıt bulunamadı.
          </p>
          {sonuc?.ocr && (
            <div className="ocr-onizleme">
              {sonuc.ocr.cert_no && <span>🔢 <strong>{sonuc.ocr.cert_no}</strong></span>}
              {sonuc.ocr.isim    && <span>👤 {sonuc.ocr.isim}</span>}
              {sonuc.ocr.kurs    && <span>📚 {sonuc.ocr.kurs}</span>}
              {sonuc.ocr.tarih   && <span>📅 {sonuc.ocr.tarih}</span>}
            </div>
          )}
          <p className="manuel-aciklama">
            Sertifikanın <strong>sağ üst köşesindeki</strong> numarayı girin:
          </p>
          <div className="manuel-row">
            <input className="manuel-input"
              placeholder="örn: 6mqF06j6vL"
              value={manuelNo}
              onChange={e => setManuelNo(e.target.value)}
            />
            <button className="btn-primary" onClick={manuelDogrula} disabled={manuelYukl}>
              {manuelYukl ? 'Kontrol ediliyor...' : 'Doğrula'}
            </button>
          </div>
          {hata && <p className="error-message">{hata}</p>}
          <button className="btn-secondary" style={{ marginTop: '.5rem' }} onClick={onIptal}>
            Vazgeç
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sertifika Kartı ──────────────────────────────────────────────
function parseCertMeta(ocr_metin) {
  if (!ocr_metin) return {};
  const al = (alan) => {
    const m = ocr_metin.match(new RegExp(`^${alan}:(.+)$`, 'm'));
    return m ? m[1].trim() : '';
  };
  return {
    cert_no: al('cert_no'),
    isim:    al('isim'),
    tarih:   al('tarih'),
    neden:   al('neden'),
  };
}

function SertifikaKarti({ cert, onSil }) {
  const kurum = cert.veren_kurum === 'btk' ? '🏛️ BTK Akademi' : '📄 Diğer';
  const meta  = cert.veren_kurum === 'btk' ? parseCertMeta(cert.ocr_metin) : {};

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
            : <span className="red-badge">⏳ Doğrulanmadı</span>
          }
        </div>
      </div>

      {cert.veren_kurum === 'btk' && cert.dogrulanmis && (
        <div className="cert-meta">
          {meta.isim    && <span>👤 {meta.isim}</span>}
          {meta.cert_no && <span>🔢 {meta.cert_no}</span>}
          {meta.tarih   && <span>📅 {meta.tarih}</span>}
        </div>
      )}

      {cert.veren_kurum === 'btk' && !cert.dogrulanmis && meta.neden && (
        <div className="cert-neden">
          ⚠️ {meta.neden}
        </div>
      )}

      <div className="cert-card-actions">
        <button className="btn-delete" onClick={() => onSil(cert.id)}>Sil</button>
      </div>
    </div>
  );
}

// ── Ana Bileşen ──────────────────────────────────────────────────
function Portfolio() {
  const [projects,     setProjects]     = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [form,         setForm]         = useState(BOSH_FORM);
  const [editId,       setEditId]       = useState(null);
  const [showProjForm, setShowProjForm] = useState(false);
  const [showCertForm, setShowCertForm] = useState(false);
  const [msg,          setMsg]          = useState('');

  useEffect(() => {
    api.get('/portfolio/projects').then(r => setProjects(r.data)).catch(() => {});
    api.get('/certificates/me').then(r => setCertificates(r.data)).catch(() => {});
  }, []);

  const saveProject = async (e) => {
    e.preventDefault();
    const payload = { ...form, teknolojiler: form.teknolojiler.split(',').map(s => s.trim()).filter(Boolean) };
    try {
      if (editId) {
        const r = await api.put(`/portfolio/projects/${editId}`, payload);
        setProjects(prev => prev.map(p => p.id === editId ? r.data : p));
        setMsg('Proje güncellendi!');
      } else {
        const r = await api.post('/portfolio/projects', payload);
        setProjects(prev => [...prev, r.data]);
        setMsg('Proje eklendi!');
      }
      setForm(BOSH_FORM); setEditId(null); setShowProjForm(false);
    } catch { setMsg('İşlem başarısız.'); }
  };

  const certEklendi = (s) => {
    api.get('/certificates/me').then(r => setCertificates(r.data)).catch(() => {});
    setShowCertForm(false);
    setMsg(s.dogrulanmis ? '✅ Sertifika doğrulandı!' : '⚠️ Sertifika eklendi (doğrulanmadı).');
  };

  const certSil = async (id) => {
    await api.delete(`/certificates/${id}`);
    setCertificates(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="portfolio-page">
      <h2>Portfolyom</h2>
      {msg && <p className="info-msg">{msg}</p>}

      {/* Projeler */}
      <section className="portfolio-section">
        <div className="section-header">
          <h3>Projeler ({projects.length})</h3>
          <button className="btn-primary" onClick={() => { setShowProjForm(!showProjForm); setEditId(null); setForm(BOSH_FORM); }}>
            {showProjForm && !editId ? 'İptal' : '+ Proje Ekle'}
          </button>
        </div>
        {showProjForm && (
          <form className="project-form" onSubmit={saveProject}>
            <input placeholder="Proje adı *" required value={form.proje_adi} onChange={e => setForm(f => ({ ...f, proje_adi: e.target.value }))} />
            <textarea placeholder="Açıklama" rows={3} value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))} />
            <input placeholder="GitHub linki" value={form.github_link} onChange={e => setForm(f => ({ ...f, github_link: e.target.value }))} />
            <input placeholder="Demo linki" value={form.demo_link} onChange={e => setForm(f => ({ ...f, demo_link: e.target.value }))} />
            <input placeholder="Teknolojiler (virgülle ayırın)" value={form.teknolojiler} onChange={e => setForm(f => ({ ...f, teknolojiler: e.target.value }))} />
            <button type="submit" className="btn-primary">{editId ? 'Güncelle' : 'Ekle'}</button>
          </form>
        )}
        <div className="projects-grid">
          {projects.map(p => (
            <div key={p.id} className="project-card">
              <h4>{p.proje_adi}</h4>
              {p.aciklama && <p>{p.aciklama}</p>}
              <div className="tech-tags">{(p.teknolojiler || []).map(t => <span key={t} className="tag">{t}</span>)}</div>
              <div className="card-actions">
                {p.github_link && <a href={p.github_link} target="_blank" rel="noreferrer">GitHub</a>}
                {p.demo_link   && <a href={p.demo_link}   target="_blank" rel="noreferrer">Demo</a>}
                <button className="btn-edit" onClick={() => { setForm({ ...p, teknolojiler: (p.teknolojiler || []).join(', ') }); setEditId(p.id); setShowProjForm(true); }}>Düzenle</button>
                <button className="btn-delete" onClick={() => { api.delete(`/portfolio/projects/${p.id}`); setProjects(prev => prev.filter(x => x.id !== p.id)); }}>Sil</button>
              </div>
            </div>
          ))}
          {projects.length === 0 && <p className="muted">Henüz proje eklemediniz.</p>}
        </div>
      </section>

      {/* Sertifikalar */}
      <section className="portfolio-section">
        <div className="section-header">
          <h3>Sertifikalar ({certificates.length})</h3>
          <button className="btn-primary" onClick={() => setShowCertForm(f => !f)}>
            {showCertForm ? 'İptal' : '+ Sertifika Ekle'}
          </button>
        </div>
        {showCertForm && (
          <SertifikaForm onEklendi={certEklendi} onIptal={() => setShowCertForm(false)} />
        )}
        <div className="cert-list">
          {certificates.map(c => <SertifikaKarti key={c.id} cert={c} onSil={certSil} />)}
          {certificates.length === 0 && !showCertForm && (
            <p className="muted">Henüz sertifika eklemediniz.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default Portfolio;
