import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';

function CareerMap() {
  const navigate   = useNavigate();
  const { user }   = useAuth();

  // ── Yol Haritası State ──
  const [ilanlar,         setIlanlar]         = useState([]);
  const [seciliIlanId,    setSeciliIlanId]    = useState('');
  const [seciliSirket,    setSeciliSirket]    = useState('');
  const [haritaYukleniyor, setHaritaYukleniyor] = useState(false);
  const [aktifHarita,     setAktifHarita]     = useState(null);
  const [kayitliHaritalar, setKayitliHaritalar] = useState([]);

  // ── Radar State ──
  const [radarData,    setRadarData]    = useState([]);
  const [beceriSayisi, setBeceriSayisi] = useState(0);
  const [bolumAdi,     setBolumAdi]     = useState('');
  const [targetRole,   setTargetRole]   = useState('');
  const [gap,          setGap]          = useState(null);
  const [roller,       setRoller]       = useState([]);
  const [radarYukl,    setRadarYukl]    = useState(true);
  const [aiYukleniyor, setAiYukleniyor] = useState(false);
  const [aiMsg,        setAiMsg]        = useState('');
  const [katki,        setKatki]        = useState(null);

  // Şirket listesi — benzersiz şirketler
  const sirketler = [...new Map(ilanlar.map(i => [i.sirket_adi, i])).values()];
  // Seçili şirkete ait pozisyonlar
  const pozisyonlar = ilanlar.filter(i => i.sirket_adi === seciliSirket);

  useEffect(() => {
    api.get('/career/roadmap/ilanlar').then(r => setIlanlar(r.data)).catch(() => {});
    api.get('/career/roadmap/me').then(r => setKayitliHaritalar(r.data)).catch(() => {});
    api.get('/career/radar').then(r => {
      setRadarData(r.data.radar || []);
      setBeceriSayisi(r.data.beceri_sayisi || 0);
      setBolumAdi(r.data.bolum_adi || '');
    }).catch(() => {}).finally(() => setRadarYukl(false));
    api.get('/career/roles').then(r => {
      setRoller(r.data || []);
      if (r.data?.length) setTargetRole(r.data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!targetRole) return;
    api.get(`/career/gap-analysis?target_role=${targetRole}`).then(r => setGap(r.data)).catch(() => {});
  }, [targetRole]);

  const haritaOlustur = async () => {
    if (!seciliIlanId) return;
    setHaritaYukleniyor(true); setAktifHarita(null);
    try {
      const r = await api.post(`/career/roadmap/olustur?internship_id=${seciliIlanId}`);
      setAktifHarita(r.data);
      setKayitliHaritalar(prev => [r.data, ...prev.filter(h => h.id !== r.data.id)]);
    } catch (err) {
      alert(err.response?.data?.detail || 'Yol haritası oluşturulamadı.');
    } finally { setHaritaYukleniyor(false); }
  };

  const haritaSil = async (id) => {
    await api.delete(`/career/roadmap/${id}`).catch(() => {});
    setKayitliHaritalar(prev => prev.filter(h => h.id !== id));
    if (aktifHarita?.id === id) setAktifHarita(null);
  };

  const radarYenile = () => {
    api.get('/career/radar').then(r => {
      setRadarData(r.data.radar || []);
      setBeceriSayisi(r.data.beceri_sayisi || 0);
    }).catch(() => {});
  };

  const aiProfiliOlustur = async () => {
    setAiYukleniyor(true); setAiMsg('');
    try {
      const r = await api.post('/career/generate-profile');
      if (r.data.basarili) {
        setAiMsg(`✅ Profil güncellendi! ${r.data.beceriler?.length || 0} kategori.`);
        setKatki(r.data.radar);
        radarYenile();
      } else { setAiMsg(`⚠️ ${r.data.mesaj}`); }
    } catch { setAiMsg('❌ Profil oluşturulamadı.'); }
    finally { setAiYukleniyor(false); setTimeout(() => setAiMsg(''), 5000); }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans antialiased">

      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/student-dashboard')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-lg">İ</div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">InternovaYZ</h1>
            <span className="text-xs text-gray-400 font-medium">Kariyer Haritası</span>
          </div>
        </div>
        <button onClick={() => navigate('/student-dashboard')} className="p-2 hover:bg-gray-50 rounded-full text-red-500 cursor-pointer">↩</button>
      </header>

      <main className="max-w-[1280px] mx-auto p-6 lg:p-8 flex flex-col gap-8">

        {/* ═══ YOL HARİTASI BÖLÜMÜ ═══ */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">◎</span>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Hedef Şirket Yol Haritası</h2>
          </div>
          <p className="text-sm text-gray-500">Hedef pozisyonuna ulaşmak için kişiselleştirilmiş gelişim planın</p>
        </div>

        {/* Şirket + Pozisyon Seçimi */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Hedef Seçimi</h3>
          <p className="text-xs text-gray-400 mb-6">Aktif staj ilanlarından hedeflemek istediğin şirketi ve pozisyonu seç</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-600">Hedef Şirket</label>
              <select
                value={seciliSirket}
                onChange={e => { setSeciliSirket(e.target.value); setSeciliIlanId(''); setAktifHarita(null); }}
                className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100 text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Şirket seçin —</option>
                {sirketler.map(s => <option key={s.sirket_adi} value={s.sirket_adi}>{s.sirket_adi}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-600">Hedef Pozisyon / Departman</label>
              <select
                value={seciliIlanId}
                onChange={e => setSeciliIlanId(e.target.value)}
                disabled={!seciliSirket}
                className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100 text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="">— Pozisyon seçin —</option>
                {pozisyonlar.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.pozisyon}{i.departman ? ` — ${i.departman}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {seciliIlanId && (
            <button onClick={haritaOlustur} disabled={haritaYukleniyor}
              className="mt-6 w-full bg-gray-950 text-white py-3.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {haritaYukleniyor ? '⏳ AI yol haritası oluşturuyor...' : '🗺️ Yol Haritası Oluştur'}
            </button>
          )}
        </div>

        {/* Yol Haritası Sonucu */}
        {aktifHarita ? (
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 text-blue-600 font-bold text-sm mb-1">
                  <span>◎</span>
                  <span>{aktifHarita.sirket_adi} — {aktifHarita.departman}</span>
                </div>
                <h3 className="text-base font-bold text-gray-900">Kişiselleştirilmiş Yol Haritanız</h3>
              </div>
              <button onClick={() => haritaSil(aktifHarita.id)} className="text-xs text-red-400 hover:text-red-600 font-semibold">Sil</button>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {aktifHarita.icerik}
            </div>
          </div>
        ) : !seciliIlanId && (
          <div className="bg-white p-16 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-6xl text-gray-200 mb-6">◎</span>
            <h3 className="text-base font-bold text-gray-900 mb-2">Hedef Belirle</h3>
            <p className="text-sm text-gray-500 max-w-sm">Başlamak için yukarıdan bir şirket ve pozisyon seç. Sana özel yol haritası oluşturalım!</p>
          </div>
        )}

        {/* Kayıtlı Haritalar */}
        {kayitliHaritalar.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Önceki Yol Haritaları</h3>
            <div className="flex flex-col gap-3">
              {kayitliHaritalar.map(h => (
                <div key={h.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{h.sirket_adi} — {h.departman}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(h.created_at).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setAktifHarita(h)} className="text-xs text-blue-600 font-bold border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all">Görüntüle</button>
                    <button onClick={() => haritaSil(h.id)} className="text-xs text-red-400 font-bold border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all">Sil</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ BECERİ RADARİ BÖLÜMÜ ═══ */}
        <div className="border-t border-gray-200 pt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">Beceri Profilim</h2>
              <p className="text-sm text-gray-500 mt-0.5">{bolumAdi || 'Bölümüne göre'} beceri haritası</p>
            </div>
            <button onClick={aiProfiliOlustur} disabled={aiYukleniyor}
              className="bg-gray-950 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-800 transition-all disabled:opacity-50">
              {aiYukleniyor ? '⏳ Analiz ediliyor...' : '🤖 AI ile Profil Oluştur'}
            </button>
          </div>
          {aiMsg && <div className="mb-4 bg-blue-50 border border-blue-100 text-blue-700 text-sm px-4 py-3 rounded-xl font-medium">{aiMsg}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-1">Beceri Profili ({beceriSayisi} beceri)</h3>
              {radarYukl ? <p className="text-xs text-gray-400 py-8 text-center">Yükleniyor...</p> :
               beceriSayisi === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400 mb-3">Henüz beceri eklenmedi.</p>
                  <button onClick={() => navigate('/profile')} className="text-xs text-blue-600 border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-50">CV'yi Güncelle</button>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData.map(d => ({ subject: d.kategori?.length > 12 ? d.kategori.slice(0,12)+'…' : d.kategori, skor: d.skor, fullMark: 100 }))}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <Radar name="Skor" dataKey="skor" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.4} />
                    <Tooltip formatter={v => `${v}%`} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Gap Analizi */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Gap Analizi</h3>
              <div className="flex items-center gap-3 mb-4">
                <label className="text-xs font-bold text-gray-600 whitespace-nowrap">Hedef Rol:</label>
                <select value={targetRole} onChange={e => setTargetRole(e.target.value)}
                  className="flex-1 bg-gray-50 p-2 rounded-xl border border-gray-100 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {roller.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
              {gap && (
                <>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-500">{gap.hedef_rol}</span>
                      <span className="font-bold text-blue-600">%{gap.tamamlanma_yuzdesi}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${gap.tamamlanma_yuzdesi}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase mb-2">✅ Sahip ({gap.sahip_olunan?.length})</p>
                      <ul className="flex flex-col gap-1">
                        {gap.sahip_olunan?.slice(0,4).map(b => <li key={b} className="text-xs text-gray-600 flex items-center gap-1"><span className="text-emerald-500">✓</span>{b}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-red-400 uppercase mb-2">📚 Eksik ({gap.eksik_beceriler?.length})</p>
                      <ul className="flex flex-col gap-1">
                        {gap.eksik_beceriler?.slice(0,4).map(b => (
                          <li key={b} className="text-xs text-gray-600 flex items-center justify-between">
                            <span>{b}</span>
                            <a href={`https://www.udemy.com/courses/search/?q=${encodeURIComponent(b)}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline ml-1">öğren</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Katkı Detayları */}
        {katki && katki.some(k => k.katkilar?.length > 0) && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">📊 Kaynak Katkı Analizi</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {katki.filter(k => k.skor > 0 && k.katkilar?.length > 0).map(k => (
                <div key={k.kategori} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-gray-800">{k.kategori}</span>
                    <span className="text-xs font-bold text-blue-600">%{k.skor}</span>
                  </div>
                  {k.katkilar.map((kt, i) => {
                    const parcalar = (kt.kaynak || '').split(':');
                    const sol = parcalar[0]?.trim();
                    const sag = parcalar.slice(1).join(':').trim();
                    return (
                      <div key={i} className="mb-2">
                        <p className="text-[11px] text-gray-600 mb-1">
                          {sol?.toLowerCase().includes('sertifika') ? '🏅' : '💻'} <strong>{sol}</strong>
                          {sag && <span className="text-gray-400"> : {sag}</span>}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${kt.etki}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-blue-600">%{kt.etki}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default CareerMap;
