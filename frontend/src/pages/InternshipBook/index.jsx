// Staj Defteri — Günlük giriş + AI akademik dönüştürme + Haftalık AI özet (Faz 3 #12)
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const DURUM_BADGE = {
  bekliyor:    { ad: 'AI bekliyor',  bg: 'bg-amber-50',    fg: 'text-amber-700'  },
  tamamlandi:  { ad: 'AI hazır',     bg: 'bg-emerald-50',  fg: 'text-emerald-700' },
  hata:        { ad: 'AI hata',      bg: 'bg-red-50',      fg: 'text-red-700'    },
};

export default function InternshipBook() {
  const navigate = useNavigate();

  // Üst seviye state
  const [tab, setTab] = useState('gunluk');   // gunluk | haftalik | beceriler
  const [applications, setApplications] = useState([]);  // kabul edilmiş başvurular
  const [selectedApp, setSelectedApp] = useState(null);  // {internship_id, id}
  const [msg, setMsg] = useState('');

  // Beceriler sekmesi state
  const [beceriler, setBeceriler] = useState(null);
  const [beceriLoading, setBeceriLoading] = useState(false);
  const [secilenBeceriler, setSecilenBeceriler] = useState(new Set());
  const [eklemeBusy, setEklemeBusy] = useState(false);

  // Evraklar sekmesi state
  const [evraklar, setEvraklar] = useState([]);
  const [evrakBusy, setEvrakBusy] = useState(false);
  const [yeniEvrak, setYeniEvrak] = useState({ ad: '', tip: 'kabul_mektubu', dosya: null });
  const [showEvrakForm, setShowEvrakForm] = useState(false);

  // Günlük
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ tarih: new Date().toISOString().slice(0, 10), ham_metin: '' });
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [isleniyorId, setIsleniyorId] = useState(null);

  // Haftalık
  const [haftalik, setHaftalik] = useState(null);
  const [haftaLoading, setHaftaLoading] = useState(false);

  useEffect(() => {
    api.get('/applications/me')
      .then(res => {
        const kabuller = res.data.filter(a => a.durum === 'kabul');
        setApplications(kabuller);
        if (kabuller.length > 0) setSelectedApp(kabuller[0]);
      })
      .catch(() => {});
  }, []);

  const loadEntries = useCallback(() => {
    if (!selectedApp) return;
    api.get('/diary', { params: { internship_id: selectedApp.internship_id } })
      .then(res => setEntries(res.data))
      .catch(() => {});
  }, [selectedApp]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Haftalık özeti yükle (tab'a geçince)
  useEffect(() => {
    if (tab !== 'haftalik' || !selectedApp) return;
    setHaftaLoading(true);
    setHaftalik(null);
    api.get('/staj/haftalik-gunluk', { params: { application_id: selectedApp.id, ai: true } })
      .then(r => setHaftalik(r.data))
      .catch(e => setMsg('Haftalık özet yüklenemedi: ' + (e.response?.data?.detail || '')))
      .finally(() => setHaftaLoading(false));
  }, [tab, selectedApp]);

  const addEntry = async (e) => {
    e.preventDefault();
    if (!selectedApp) { setMsg('Önce bir staj seç.'); return; }
    try {
      const res = await api.post('/diary', {
        internship_id: selectedApp.internship_id,
        tarih: form.tarih,
        ham_metin: form.ham_metin,
      });
      setEntries(prev => [res.data, ...prev]);
      setForm({ tarih: new Date().toISOString().slice(0, 10), ham_metin: '' });
      setShowForm(false);
      setMsg('✅ Giriş kaydedildi. AI ile genişletmek için karta tıkla.');
      setTimeout(() => setMsg(''), 5000);
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.detail || 'Giriş eklenemedi'));
    }
  };

  const triggerLLM = async (entryId) => {
    setIsleniyorId(entryId);
    try {
      await api.post(`/diary/${entryId}/process-llm`);
      const interval = setInterval(async () => {
        try {
          const res = await api.get(`/diary/${entryId}`);
          setEntries(prev => prev.map(e => e.id === entryId ? res.data : e));
          if (res.data.llm_isleme_durumu !== 'bekliyor') {
            clearInterval(interval);
            setIsleniyorId(null);
            setMsg(res.data.llm_isleme_durumu === 'tamamlandi'
              ? '✅ Akademik metin hazır!'
              : '❌ AI işlemi başarısız');
            setTimeout(() => setMsg(''), 4000);
          }
        } catch { clearInterval(interval); setIsleniyorId(null); }
      }, 3000);
    } catch {
      setIsleniyorId(null);
      setMsg('❌ AI işlemi başlatılamadı');
    }
  };

  const haftalikYenidenYukle = () => {
    if (!selectedApp) return;
    setHaftaLoading(true);
    setHaftalik(null);
    api.get('/staj/haftalik-gunluk', { params: { application_id: selectedApp.id, ai: true } })
      .then(r => setHaftalik(r.data))
      .finally(() => setHaftaLoading(false));
  };

  // Beceriler sekmesine geçince yükle
  useEffect(() => {
    if (tab !== 'beceriler' || !selectedApp) return;
    setBeceriLoading(true);
    setBeceriler(null);
    setSecilenBeceriler(new Set());
    api.get('/staj/becerileri-cikar', { params: { application_id: selectedApp.id } })
      .then(r => {
        setBeceriler(r.data);
        // Varsayılan: zaten_var olmayan + yüksek güveni seçili işaretle
        const onSec = new Set();
        (r.data.onerilen_beceriler || []).forEach(b => {
          if (!b.zaten_var && b.guven >= 0.7) onSec.add(b.ad);
        });
        setSecilenBeceriler(onSec);
      })
      .catch(e => setMsg('❌ Beceri çıkarımı başarısız: ' + (e.response?.data?.detail || '')))
      .finally(() => setBeceriLoading(false));
  }, [tab, selectedApp]);

  const beceriYenidenCikar = () => {
    if (!selectedApp) return;
    setBeceriLoading(true);
    setBeceriler(null);
    setSecilenBeceriler(new Set());
    api.get('/staj/becerileri-cikar', { params: { application_id: selectedApp.id } })
      .then(r => setBeceriler(r.data))
      .finally(() => setBeceriLoading(false));
  };

  const toggleBeceriSec = (ad) => {
    setSecilenBeceriler(prev => {
      const yeni = new Set(prev);
      if (yeni.has(ad)) yeni.delete(ad); else yeni.add(ad);
      return yeni;
    });
  };

  // Evraklar yükleme
  useEffect(() => {
    if (tab !== 'evraklar' || !selectedApp) return;
    api.get(`/staj/evrak/application/${selectedApp.id}`)
      .then(r => setEvraklar(r.data))
      .catch(() => setEvraklar([]));
  }, [tab, selectedApp]);

  const evrakYukle = async (e) => {
    e.preventDefault();
    if (!yeniEvrak.dosya || !yeniEvrak.ad.trim()) {
      setMsg('❌ Ad ve dosya zorunlu');
      return;
    }
    setEvrakBusy(true);
    try {
      const fd = new FormData();
      fd.append('application_id', selectedApp.id);
      fd.append('ad', yeniEvrak.ad);
      fd.append('tip', yeniEvrak.tip);
      fd.append('dosya', yeniEvrak.dosya);
      const r = await api.post('/staj/evrak', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEvraklar(prev => [r.data, ...prev]);
      setYeniEvrak({ ad: '', tip: 'kabul_mektubu', dosya: null });
      setShowEvrakForm(false);
      setMsg('✅ Evrak yüklendi, akademisyen onayı bekleniyor');
      setTimeout(() => setMsg(''), 5000);
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.detail || 'Yükleme başarısız'));
    } finally {
      setEvrakBusy(false);
    }
  };

  const evrakSil = async (id) => {
    if (!window.confirm('Bu evrakı silmek istediğine emin misin?')) return;
    try {
      await api.delete(`/staj/evrak/${id}`);
      setEvraklar(prev => prev.filter(x => x.id !== id));
      setMsg('✅ Evrak silindi');
      setTimeout(() => setMsg(''), 4000);
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.detail || 'Silinemedi'));
    }
  };

  const becerileriEkle = async () => {
    if (secilenBeceriler.size === 0) return;
    setEklemeBusy(true);
    try {
      const r = await api.post('/staj/becerileri-ekle', { beceriler: Array.from(secilenBeceriler) });
      setMsg(`✅ ${r.data.eklenenler.length} beceri CV'ne eklendi (toplam ${r.data.toplam_beceri_sayisi})`);
      setTimeout(() => setMsg(''), 5000);
      // Yeniden çıkar — zaten_var flag'leri güncellensin
      beceriYenidenCikar();
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.detail || 'Eklenemedi'));
    } finally {
      setEklemeBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans antialiased">

      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white text-base font-bold">📔</div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-gray-900 leading-none truncate">Staj Defteri</h1>
            <span className="text-xs text-gray-400 font-medium">Günlük + AI haftalık özet</span>
          </div>
        </div>
        <button onClick={() => navigate('/student-dashboard')}
          className="text-xs font-bold text-gray-500 hover:text-gray-900 px-3 py-2 rounded-xl hover:bg-gray-50">
          ← Dashboard
        </button>
      </header>

      <main className="max-w-[1280px] mx-auto p-6 lg:p-8 flex flex-col gap-6">

        {msg && (
          <div className={`p-3 rounded-xl text-sm font-semibold ${
            msg.startsWith('❌') ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>{msg}</div>
        )}

        {/* Staj seçici + sekme */}
        <section className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Staj</span>
            {applications.length === 0 ? (
              <span className="text-sm text-gray-400">Kabul edilmiş stajın yok</span>
            ) : (
              <select
                value={selectedApp?.id || ''}
                onChange={e => setSelectedApp(applications.find(a => a.id === parseInt(e.target.value)))}
                className="text-sm font-bold text-gray-900 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-400">
                {applications.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.internship?.pozisyon || `Staj #${a.internship_id}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Sekme */}
          <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
            <button onClick={() => setTab('gunluk')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all
                ${tab === 'gunluk' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}>
              📋 Günlük ({entries.length})
            </button>
            <button onClick={() => setTab('haftalik')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all
                ${tab === 'haftalik' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}>
              📊 Haftalık
            </button>
            <button onClick={() => setTab('beceriler')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all
                ${tab === 'beceriler' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}>
              🎯 Beceriler
            </button>
            <button onClick={() => setTab('evraklar')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all
                ${tab === 'evraklar' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}>
              📄 Evraklar
            </button>
          </div>
        </section>

        {applications.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center">
            <span className="text-5xl block mb-3">📔</span>
            <p className="text-sm text-gray-500 mb-3">Staj defteri tutmak için önce kabul edilmiş bir başvurun olması gerekir.</p>
            <button onClick={() => navigate('/internships')}
              className="text-xs font-bold text-blue-600 border border-blue-200 px-4 py-2 rounded-xl hover:bg-blue-50">
              Staj İlanlarına Göz At →
            </button>
          </div>
        ) : tab === 'gunluk' ? (
          // ─────────── GÜNLÜK SEKMESİ ───────────
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-gray-900">Günlük Girişler</h2>
              <button onClick={() => setShowForm(!showForm)}
                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-sm transition-all">
                {showForm ? '✕ İptal' : '+ Yeni Giriş'}
              </button>
            </div>

            {showForm && (
              <form onSubmit={addEntry} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Tarih</label>
                  <input type="date" value={form.tarih}
                    onChange={e => setForm(f => ({ ...f, tarih: e.target.value }))} required
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Günlük notun</label>
                  <textarea rows={4} required value={form.ham_metin}
                    onChange={e => setForm(f => ({ ...f, ham_metin: e.target.value }))}
                    placeholder="Bugün ne yaptın? (1-3 cümle yeterli, AI sonra akademik metne dönüştürür)"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 resize-none" />
                </div>
                <button type="submit"
                  className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 py-2.5 rounded-xl shadow-sm">
                  Kaydet
                </button>
              </form>
            )}

            {entries.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center">
                <span className="text-4xl block mb-2">📋</span>
                <p className="text-sm text-gray-400">Henüz giriş yok. İlk günlüğünü ekle.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {entries.map(entry => {
                  const acik = expandedId === entry.id;
                  const llmDurum = DURUM_BADGE[entry.llm_isleme_durumu] || DURUM_BADGE.bekliyor;
                  return (
                    <div key={entry.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <button onClick={() => setExpandedId(acik ? null : entry.id)}
                        className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-all text-left">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl flex-shrink-0">📅</span>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900">{entry.tarih}</p>
                            <p className="text-xs text-gray-400 truncate">{(entry.ham_metin || '').slice(0, 80)}{entry.ham_metin?.length > 80 ? '…' : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {entry.onaylandi && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">✓ Onaylı</span>}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${llmDurum.bg} ${llmDurum.fg}`}>{llmDurum.ad}</span>
                          <span className={`text-gray-400 text-sm transition-transform ${acik ? 'rotate-180' : ''}`}>▼</span>
                        </div>
                      </button>

                      {acik && (
                        <div className="px-5 pb-5 border-t border-gray-100 pt-4 flex flex-col gap-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-gray-50 p-3 rounded-xl">
                              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ham metin</h4>
                              <p className="text-xs text-gray-700 whitespace-pre-wrap">{entry.ham_metin}</p>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-xl">
                              <h4 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">Akademik metin</h4>
                              {entry.akademik_metin ? (
                                <p className="text-xs text-gray-700 whitespace-pre-wrap">{entry.akademik_metin}</p>
                              ) : (
                                <p className="text-xs text-gray-400 italic">Henüz genişletilmedi.</p>
                              )}
                            </div>
                          </div>
                          {!entry.onaylandi && entry.llm_isleme_durumu !== 'tamamlandi' && (
                            <button onClick={() => triggerLLM(entry.id)} disabled={isleniyorId === entry.id}
                              className="self-start text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 px-4 py-2 rounded-xl shadow-sm transition-all">
                              {isleniyorId === entry.id ? '⏳ İşleniyor…' : '🤖 AI ile Genişlet'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : tab === 'haftalik' ? (
          // ─────────── HAFTALIK SEKMESİ ───────────
          <>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-extrabold text-gray-900">📊 Haftalık Özet</h2>
              {!haftaLoading && haftalik && (
                <button onClick={haftalikYenidenYukle}
                  className="text-xs font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-xl transition-all">
                  🔄 Yeniden Üret
                </button>
              )}
            </div>

            {haftaLoading ? (
              <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm text-center">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-700">AI haftalık özetleri üretiyor…</p>
                <p className="text-xs text-gray-400 mt-1">10-30 saniye sürebilir</p>
              </div>
            ) : !haftalik ? (
              <p className="text-sm text-gray-400">Yükleniyor…</p>
            ) : haftalik.toplam_hafta === 0 ? (
              <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center">
                <span className="text-4xl block mb-2">📊</span>
                <p className="text-sm text-gray-500 mb-3">Hafta özeti üretmek için en az 1 giriş gerekli.</p>
                <button onClick={() => setTab('gunluk')}
                  className="text-xs font-bold text-blue-600 border border-blue-200 px-4 py-2 rounded-xl hover:bg-blue-50">
                  + İlk girişi ekle
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Üst özet */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 rounded-2xl shadow-sm flex items-center gap-5">
                  <div className="text-5xl">📊</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs opacity-80 font-semibold">{haftalik.pozisyon} · {haftalik.sirket_adi}</p>
                    <p className="text-2xl font-extrabold">{haftalik.toplam_hafta} hafta, {haftalik.toplam_giris} giriş</p>
                  </div>
                </div>

                {/* Her hafta için kart */}
                {haftalik.haftalar.map(h => (
                  <div key={h.yil_hafta} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
                    {/* Başlık */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="text-base font-extrabold text-gray-900">📅 {h.yil_hafta}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {h.baslangic} → {h.bitis} · <span className="font-bold">{h.giris_sayisi} giriş</span>
                        </p>
                      </div>
                      {h.ai_model && (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-full">
                          ✨ {h.ai_model}
                        </span>
                      )}
                    </div>

                    {/* AI özeti */}
                    {h.ozet && (
                      <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 p-4 rounded-xl">
                        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">🤖 AI Özeti</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{h.ozet}</p>
                      </div>
                    )}

                    {/* Ana konular */}
                    {h.ana_konular?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">📚 Ana Konular</p>
                        <div className="flex flex-wrap gap-1.5">
                          {h.ana_konular.map((k, i) => (
                            <span key={i} className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Detayları göster — gün gün girişler */}
                    <details className="mt-1">
                      <summary className="text-xs font-bold text-gray-500 cursor-pointer hover:text-gray-900">
                        Bu haftanın günlük girişleri ({h.girisler.length})
                      </summary>
                      <div className="mt-2 flex flex-col gap-1.5">
                        {h.girisler.map(g => (
                          <div key={g.id} className="text-xs bg-gray-50 px-3 py-2 rounded-lg">
                            <span className="font-bold text-gray-600">{g.tarih}</span>
                            <span className="text-gray-700"> · {g.akademik_metin || g.ham_metin}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : tab === 'beceriler' ? (
          // ─────────── BECERİLER SEKMESİ ───────────
          <>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-extrabold text-gray-900">🎯 Otomatik Beceri Çıkarımı</h2>
              {!beceriLoading && beceriler && (
                <button onClick={beceriYenidenCikar}
                  className="text-xs font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-xl transition-all">
                  🔄 Yeniden Çıkar
                </button>
              )}
            </div>

            {beceriLoading ? (
              <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm text-center">
                <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-700">Diary'den beceriler çıkarılıyor…</p>
                <p className="text-xs text-gray-400 mt-1">5-15 saniye</p>
              </div>
            ) : !beceriler ? (
              <p className="text-sm text-gray-400">Yükleniyor…</p>
            ) : !beceriler.basarili ? (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-sm text-red-700">
                ⚠ {beceriler.hata}
              </div>
            ) : beceriler.onerilen_beceriler.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center">
                <span className="text-4xl block mb-2">🎯</span>
                <p className="text-sm text-gray-500">Yeterli içerikten beceri çıkarılamadı.</p>
                <p className="text-xs text-gray-400 mt-1">Birkaç daha günlük ekleyince tekrar dene.</p>
              </div>
            ) : (
              <>
                {/* Bilgilendirme */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-5 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="text-4xl">🤖</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs opacity-80 font-semibold">{beceriler.toplam_giris} diary girişinden</p>
                    <p className="text-xl font-extrabold">{beceriler.onerilen_beceriler.length} beceri önerisi</p>
                    <p className="text-xs opacity-80 mt-0.5">İstediklerini seç → CV'ne otomatik eklenir</p>
                  </div>
                </div>

                {/* Beceri kartları */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2">
                  {beceriler.onerilen_beceriler.map((b, i) => {
                    const sec = secilenBeceriler.has(b.ad);
                    return (
                      <button key={i} onClick={() => !b.zaten_var && toggleBeceriSec(b.ad)}
                        disabled={b.zaten_var}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left
                          ${b.zaten_var
                            ? 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed'
                            : sec
                              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-100'
                              : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}`}>
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                          ${b.zaten_var ? 'bg-emerald-500 border-emerald-500 text-white'
                            : sec ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'}`}>
                          {(sec || b.zaten_var) && <span className="text-xs font-bold">✓</span>}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-bold ${b.zaten_var ? 'text-gray-500' : 'text-gray-900'}`}>
                              {b.ad}
                            </span>
                            {b.zaten_var && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                CV'de zaten var
                              </span>
                            )}
                            {!b.zaten_var && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                                ${b.guven >= 0.85 ? 'bg-emerald-100 text-emerald-700'
                                  : b.guven >= 0.7 ? 'bg-blue-100 text-blue-700'
                                  : 'bg-amber-100 text-amber-700'}`}>
                                güven %{Math.round(b.guven * 100)}
                              </span>
                            )}
                            {b.kategori && (
                              <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                {b.kategori}
                              </span>
                            )}
                          </div>
                          {b.kaynak_tarihler?.length > 0 && (
                            <p className="text-[11px] text-gray-400 mt-1">
                              📅 {b.kaynak_tarihler.join(', ')}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Sticky alt eylem barı */}
                <div className="sticky bottom-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-lg flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-xs">
                    <p className="font-bold text-gray-900">{secilenBeceriler.size} beceri seçili</p>
                    <p className="text-gray-500">CV.beceriler'e eklenecek</p>
                  </div>
                  <button onClick={becerileriEkle}
                    disabled={secilenBeceriler.size === 0 || eklemeBusy}
                    className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 px-5 py-2.5 rounded-xl shadow-sm transition-all">
                    {eklemeBusy ? '⏳ Ekleniyor…' : `✓ Seçilenleri CV'me Ekle`}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          // ─────────── EVRAKLAR SEKMESİ ───────────
          <>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-extrabold text-gray-900">📄 Dijital Evraklar</h2>
              <button onClick={() => setShowEvrakForm(!showEvrakForm)}
                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-sm transition-all">
                {showEvrakForm ? '✕ İptal' : '+ Evrak Yükle'}
              </button>
            </div>

            {showEvrakForm && (
              <form onSubmit={evrakYukle} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Evrak Adı *</label>
                  <input value={yeniEvrak.ad} onChange={e => setYeniEvrak(p => ({ ...p, ad: e.target.value }))}
                    placeholder="Örn: Kabul mektubu" required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Tip</label>
                  <select value={yeniEvrak.tip} onChange={e => setYeniEvrak(p => ({ ...p, tip: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white">
                    <option value="kabul_mektubu">Kabul Mektubu</option>
                    <option value="sigorta_bilgisi">Sigorta Bilgisi</option>
                    <option value="is_yeri_degerlendirme">İş Yeri Değerlendirme</option>
                    <option value="ogrenci_degerlendirme">Öğrenci Değerlendirme</option>
                    <option value="staj_defteri">Staj Defteri</option>
                    <option value="diger">Diğer</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Dosya (PDF, JPG veya PNG, max 10 MB)</label>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setYeniEvrak(p => ({ ...p, dosya: e.target.files[0] }))}
                    required
                    className="w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100" />
                </div>
                <button type="submit" disabled={evrakBusy}
                  className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 py-2.5 rounded-xl shadow-sm">
                  {evrakBusy ? '⏳ Yükleniyor…' : '📤 Yükle'}
                </button>
              </form>
            )}

            {evraklar.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center">
                <span className="text-4xl block mb-2">📄</span>
                <p className="text-sm text-gray-400 mb-3">Henüz evrak yüklemedin.</p>
                <p className="text-xs text-gray-400">
                  Akademisyenin onaylaması gereken belgeler (kabul mektubu, sigorta vb.) buradan yüklenir.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {evraklar.map(e => {
                  const renk = {
                    bekleyen: 'bg-amber-50 text-amber-700 border-amber-200',
                    onayli:   'bg-emerald-50 text-emerald-700 border-emerald-200',
                    red:      'bg-red-50 text-red-700 border-red-200',
                  }[e.durum] || 'bg-gray-50 text-gray-700 border-gray-200';
                  const ikon = e.durum === 'onayli' ? '✓' : e.durum === 'red' ? '✕' : '⏳';
                  const tipAd = {
                    kabul_mektubu: 'Kabul Mektubu', sigorta_bilgisi: 'Sigorta',
                    is_yeri_degerlendirme: 'İş Yeri Değerlendirme',
                    ogrenci_degerlendirme: 'Öğrenci Değerlendirme',
                    staj_defteri: 'Staj Defteri', diger: 'Diğer',
                  }[e.tip] || e.tip;
                  return (
                    <div key={e.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className="text-2xl flex-shrink-0">📄</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-gray-900">{e.ad}</h4>
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{tipAd}</span>
                            <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${renk}`}>
                              {ikon} {e.durum === 'onayli' ? 'Onaylı' : e.durum === 'red' ? 'Reddedildi' : 'Beklemede'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 truncate">{e.dosya_adi}</p>
                          {e.onaylayan_ad && (
                            <p className="text-[11px] text-gray-500 mt-1">
                              {e.durum === 'onayli' ? '✓' : '✕'} {e.onaylayan_ad}
                              {e.onay_tarihi && ` · ${new Date(e.onay_tarihi).toLocaleDateString('tr-TR')}`}
                            </p>
                          )}
                          {e.onay_notu && (
                            <p className={`text-xs mt-1.5 italic ${e.durum === 'red' ? 'text-red-700' : 'text-gray-600'}`}>
                              💬 {e.onay_notu}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end flex-shrink-0">
                        <a href={`${process.env.REACT_APP_API_URL || 'http://localhost:8002'}${e.dosya_url}`}
                          target="_blank" rel="noreferrer"
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 px-2 py-1">
                          ↗ Görüntüle
                        </a>
                        {e.durum !== 'onayli' && (
                          <button onClick={() => evrakSil(e.id)}
                            className="text-[10px] font-bold text-red-600 hover:text-red-800 px-2 py-1">
                            ✕ Sil
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
