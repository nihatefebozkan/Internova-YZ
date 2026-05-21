// Staj Defteri — Günlük giriş + AI akademik metin dönüştürme + onay takibi
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import './style.css';

function InternshipBook() {
  const [entries,            setEntries]            = useState([]);
  const [internships,        setInternships]        = useState([]);
  const [selectedInternship, setSelectedInternship] = useState('');
  const [form,               setForm]               = useState({ tarih: new Date().toISOString().slice(0, 10), ham_metin: '' });
  const [showForm,           setShowForm]           = useState(false);
  const [expandedId,         setExpandedId]         = useState(null);
  const [isleniyorId,        setIsleniyorId]        = useState(null); // hangi entry şu an işleniyor
  const [msg,                setMsg]                = useState('');

  useEffect(() => {
    api.get('/applications/me')
      .then(res => {
        const kabuller = res.data.filter(a => a.durum === 'kabul');
        setInternships(kabuller);
        if (kabuller.length > 0) setSelectedInternship(kabuller[0].internship_id);
      })
      .catch(() => {});
  }, []);

  const loadEntries = useCallback(() => {
    if (!selectedInternship) return;
    api.get('/diary', { params: { internship_id: selectedInternship } })
      .then(res => setEntries(res.data))
      .catch(() => {});
  }, [selectedInternship]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Kaydet — sadece kaydeder, LLM başlatmaz
  const addEntry = async (e) => {
    e.preventDefault();
    if (!selectedInternship) { setMsg('Önce bir staj seçin.'); return; }
    try {
      const res = await api.post('/diary', {
        internship_id: Number(selectedInternship),
        tarih: form.tarih,
        ham_metin: form.ham_metin,
      });
      setEntries(prev => [res.data, ...prev]);
      setForm({ tarih: new Date().toISOString().slice(0, 10), ham_metin: '' });
      setShowForm(false);
      setMsg('Giriş kaydedildi. Genişletmek için "AI ile Genişlet" butonuna bas.');
    } catch { setMsg('Giriş eklenemedi.'); }
  };

  // AI ile Genişlet — kullanıcı butona basınca başlar
  const triggerLLM = async (entryId) => {
    setIsleniyorId(entryId);
    setMsg('AI işlemi başlatıldı...');
    try {
      await api.post(`/diary/${entryId}/process-llm`);
      // 3 saniyede bir kontrol
      const interval = setInterval(async () => {
        try {
          const res = await api.get(`/diary/${entryId}`);
          const entry = res.data;
          setEntries(prev => prev.map(e => e.id === entryId ? entry : e));
          if (entry.llm_isleme_durumu !== 'bekliyor') {
            clearInterval(interval);
            setIsleniyorId(null);
            setMsg(entry.llm_isleme_durumu === 'tamamlandi'
              ? '✅ Akademik metin hazır!'
              : '❌ AI işlemi başarısız oldu.');
          }
        } catch { clearInterval(interval); setIsleniyorId(null); }
      }, 3000);
    } catch {
      setIsleniyorId(null);
      setMsg('AI işlemi başlatılamadı.');
    }
  };

  return (
    <div className="internship-book-page">
      <header className="book-header">
        <h2>📔 Staj Defteri</h2>
        {internships.length > 1 && (
          <select value={selectedInternship} onChange={e => setSelectedInternship(e.target.value)}>
            {internships.map(a => (
              <option key={a.internship_id} value={a.internship_id}>
                {a.internship?.pozisyon || `Staj #${a.internship_id}`}
              </option>
            ))}
          </select>
        )}
        {internships.length === 0 && (
          <p className="muted">Kabul edilmiş bir stajınız yok.</p>
        )}
      </header>

      {msg && <p className="info-msg">{msg}</p>}

      {internships.length > 0 && (
        <>
          <div className="book-actions-top">
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'İptal' : '+ Yeni Giriş'}
            </button>
            <span className="entry-count">{entries.length} giriş</span>
          </div>

          {showForm && (
            <form className="entry-form" onSubmit={addEntry}>
              <label>Tarih
                <input type="date" value={form.tarih}
                  onChange={e => setForm(f => ({ ...f, tarih: e.target.value }))} required />
              </label>
              <label>Günlük Notunuz
                <textarea rows={5} placeholder="Bugün ne yaptınız? (1-3 cümle yeterli)"
                  value={form.ham_metin}
                  onChange={e => setForm(f => ({ ...f, ham_metin: e.target.value }))}
                  required />
              </label>
              <button type="submit" className="btn-primary">Kaydet</button>
            </form>
          )}

          <section className="daily-entries">
            {entries.length === 0
              ? <p className="muted">Henüz giriş yok. İlk günlüğünüzü ekleyin.</p>
              : entries.map(entry => (
                <div key={entry.id} className={`entry-card ${entry.onaylandi ? 'approved' : ''}`}>

                  {/* Kart başlığı */}
                  <div className="entry-header" onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
                    <span className="entry-date">📅 {entry.tarih}</span>
                    <div className="entry-meta">
                      {entry.onaylandi
                        ? <span className="badge-approved">✅ Onaylı</span>
                        : <span className="badge-pending">⏳ Onay Bekliyor</span>
                      }
                      {entry.llm_isleme_durumu === 'tamamlandi' && (
                        <span style={{ color: '#10b981', fontSize: '.82rem' }}>✅ AI Genişletildi</span>
                      )}
                    </div>
                  </div>

                  {/* Genişletilmiş içerik */}
                  {expandedId === entry.id && (
                    <div className="entry-body">
                      <div className="text-columns">
                        <div className="col-ham">
                          <h4>Ham Metin</h4>
                          <p>{entry.ham_metin}</p>
                        </div>
                        <div className="col-akademik">
                          <h4>Akademik Metin</h4>
                          {entry.akademik_metin
                            ? <p>{entry.akademik_metin}</p>
                            : <p className="muted">Henüz genişletilmedi.</p>
                          }
                        </div>
                      </div>

                      {/* AI butonu — sadece onaylanmamış ve akademik metin yoksa göster */}
                      {!entry.onaylandi && entry.llm_isleme_durumu !== 'tamamlandi' && (
                        <button
                          className="btn-ai"
                          onClick={() => triggerLLM(entry.id)}
                          disabled={isleniyorId === entry.id}
                        >
                          {isleniyorId === entry.id
                            ? '⏳ İşleniyor...'
                            : '🤖 AI ile Genişlet'}
                        </button>
                      )}
                    </div>
                  )}

                </div>
              ))
            }
          </section>
        </>
      )}
    </div>
  );
}

export default InternshipBook;
