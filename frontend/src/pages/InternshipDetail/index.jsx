// Staj İlanı Detay — Tailwind + Recharts radar + Eksik Analizi + Anonim Deneyim
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const SEVIYE_BADGE = {
  tam:   { ad: 'Tamam',  bg: 'bg-emerald-50', fg: 'text-emerald-700', ikon: '✓' },
  kismi: { ad: 'Kısmi',  bg: 'bg-amber-50',   fg: 'text-amber-700',   ikon: '⚠' },
  eksik: { ad: 'Eksik',  bg: 'bg-red-50',     fg: 'text-red-700',     ikon: '✕' },
};

const TIMELINE_ADIMLARI = [
  { k: 'bekleyen',    l: 'Başvuru',     ikon: '📥', renk: 'bg-amber-500'  },
  { k: 'inceleniyor', l: 'İnceleniyor', ikon: '🔍', renk: 'bg-blue-500'    },
  { k: 'mulakat',     l: 'Mülakat',     ikon: '🤝', renk: 'bg-purple-500'  },
  { k: 'sonuc',       l: 'Sonuç',       ikon: '🎯', renk: 'bg-emerald-500' },
];

function BasvuruTimeline({ basvuru }) {
  const durum = basvuru?.durum || 'bekleyen';
  const idx =
    durum === 'bekleyen'    ? 0 :
    durum === 'inceleniyor' ? 1 :
    durum === 'mulakat'     ? 2 :
    durum === 'kabul' || durum === 'red' ? 3 : 0;
  const reddedildi = durum === 'red';
  const gecmis = basvuru?.durum_gecmis || [];

  return (
    <div className="flex flex-col gap-3">
      {/* Bar */}
      <div className="relative flex items-center justify-between">
        {TIMELINE_ADIMLARI.map((adim, i) => {
          const aktif = i <= idx;
          const buAdim = i === 3;
          const aktifRenk = buAdim && (durum === 'kabul' || durum === 'red')
            ? (reddedildi ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white')
            : aktif ? `${adim.renk} text-white` : 'bg-gray-100 text-gray-400';
          return (
            <div key={adim.k} className="flex flex-col items-center gap-1 z-10 relative bg-white">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${aktifRenk}`}>
                {buAdim && reddedildi ? '✕' : aktif ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] font-bold ${aktif ? 'text-gray-700' : 'text-gray-400'}`}>{adim.l}</span>
            </div>
          );
        })}
        {/* Bağlantı çizgisi (arkada) */}
        <div className="absolute top-4 left-4 right-4 h-1 bg-gray-100 -z-0">
          <div className={`h-full transition-all ${reddedildi ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${(idx / 3) * 100}%` }} />
        </div>
      </div>

      {/* Notlar / geçmiş */}
      {gecmis.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {gecmis.slice().reverse().slice(0, 4).map(g => (
            <div key={g.id} className="flex items-start gap-2 text-[11px] bg-gray-50 p-2 rounded-lg">
              <span className="text-gray-400 whitespace-nowrap">{new Date(g.created_at).toLocaleDateString('tr-TR')}</span>
              <span className="text-gray-700">
                <span className="font-bold">{g.eski_durum || '—'} → {g.yeni_durum}</span>
                {g.not_ && <span className="text-gray-500"> · {g.not_}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Yildizlar({ puan }) {
  const dolu = Math.round(puan || 0);
  return (
    <span className="text-amber-500 text-xs font-bold">
      {'★'.repeat(dolu)}<span className="text-gray-200">{'★'.repeat(5 - dolu)}</span>
    </span>
  );
}

function DeneyimKarti({ d }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {d.donem && <span className="font-bold text-gray-700 bg-gray-50 px-2 py-0.5 rounded-full">📅 {d.donem}</span>}
          {d.calistigi_departman && <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">💼 {d.calistigi_departman}</span>}
          {d.bolum_kodu && <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">🎓 {d.bolum_kodu}</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {d.puan && <Yildizlar puan={d.puan} />}
          {d.tavsiye_eder_mi === true && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">✓ Tavsiye</span>}
          {d.tavsiye_eder_mi === false && <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">✗ Tavsiye etmem</span>}
        </div>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{d.genel_yorum}</p>
      {d.ogrendigi_teknolojiler?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {d.ogrendigi_teknolojiler.map((t, i) => (
            <span key={i} className="text-[10px] bg-gray-50 text-gray-700 px-2 py-0.5 rounded-full font-semibold">{t}</span>
          ))}
        </div>
      )}
      <p className="text-[10px] text-gray-400 mt-1">{new Date(d.created_at).toLocaleDateString('tr-TR')}</p>
    </div>
  );
}

export default function InternshipDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ilan, setIlan] = useState(null);
  const [eksikAnaliz, setEksikAnaliz] = useState(null);
  const [deneyimler, setDeneyimler] = useState([]);
  const [stats, setStats] = useState(null);
  const [onanaliz, setOnanaliz] = useState(null);
  const [onanalizLoading, setOnanalizLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [eksikLoading, setEksikLoading] = useState(false);
  const [basvurdu, setBasvurdu] = useState(false);
  const [benimBasvurum, setBenimBasvurum] = useState(null);   // {durum, durum_gecmis...}
  const [basvuruYukleniyor, setBasvuruYukleniyor] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('aciklama');

  // Mülakat hazırlık state
  const [mulakatModal, setMulakatModal] = useState(false);
  const [mulakatLoading, setMulakatLoading] = useState(false);
  const [mulakatData, setMulakatData] = useState(null);
  const [mulakatHata, setMulakatHata] = useState('');
  const [yapildi, setYapildi] = useState({});   // {kategori-idx: true}

  // Kapak mektubu modal state
  const [modalAcik, setModalAcik] = useState(false);
  const [onYazi, setOnYazi] = useState('');
  const [kapakTon, setKapakTon] = useState('denge');
  const [kapakUzunluk, setKapakUzunluk] = useState('orta');
  const [kapakEkstra, setKapakEkstra] = useState('');
  const [kapakUretiliyor, setKapakUretiliyor] = useState(false);
  const [kapakModel, setKapakModel] = useState(null);
  const [kapakUyarilar, setKapakUyarilar] = useState([]);
  const [kapakHata, setKapakHata] = useState('');

  // İlanı yükle
  useEffect(() => {
    setLoading(true);
    api.get(`/internships/${id}`)
      .then(r => setIlan(r.data))
      .catch(() => navigate('/internships'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  // İlan geldikten sonra: eksik analizi + anonim deneyim + istatistik
  useEffect(() => {
    if (!ilan || user?.role !== 'student') return;
    setEksikLoading(true);
    api.get(`/staj/eksik-analizi?internship_id=${id}&ai=true`)
      .then(r => setEksikAnaliz(r.data))
      .catch(() => {})
      .finally(() => setEksikLoading(false));
    if (ilan.company_id) {
      api.get(`/staj/deneyim?company_id=${ilan.company_id}`).then(r => setDeneyimler(r.data)).catch(() => {});
      api.get(`/staj/deneyim/stats/${ilan.company_id}`).then(r => setStats(r.data)).catch(() => {});
    }
  }, [ilan, id, user]);

  // Mevcut başvuruyu kontrol et
  useEffect(() => {
    if (user?.role !== 'student') return;
    api.get('/applications/me').then(r => {
      const mine = r.data.find(a => a.internship_id === parseInt(id));
      if (mine) {
        setBasvurdu(true);
        setBenimBasvurum(mine);
      }
    }).catch(() => {});
  }, [id, user]);

  // Önanaliz sekmesine geçince yükle (lazy)
  useEffect(() => {
    if (tab !== 'onanaliz' || !ilan?.company_id || onanaliz) return;
    setOnanalizLoading(true);
    api.get('/staj/sirket-onanaliz', { params: { company_id: ilan.company_id } })
      .then(r => setOnanaliz(r.data))
      .catch(e => setOnanaliz({ basarili: false, hata: e.response?.data?.detail || 'Yükleme hatası' }))
      .finally(() => setOnanalizLoading(false));
  }, [tab, ilan, onanaliz]);

  const onanalizYenidenYukle = () => {
    if (!ilan?.company_id) return;
    setOnanaliz(null);
    setOnanalizLoading(true);
    api.get('/staj/sirket-onanaliz', { params: { company_id: ilan.company_id } })
      .then(r => setOnanaliz(r.data))
      .finally(() => setOnanalizLoading(false));
  };

  const acModal = () => {
    setOnYazi('');
    setKapakModel(null);
    setKapakUyarilar([]);
    setKapakHata('');
    setModalAcik(true);
  };

  const mulakatHazirligiAc = async () => {
    if (!benimBasvurum?.id) return;
    setMulakatModal(true);
    if (mulakatData) return;   // önceden çekildiyse cache'le
    setMulakatLoading(true);
    setMulakatHata('');
    try {
      const r = await api.get(`/staj/mulakat-hazirligi?application_id=${benimBasvurum.id}`);
      if (r.data.basarili) {
        setMulakatData(r.data);
        // localStorage'dan tıklanan maddeleri yükle
        const key = `mulakat_yapildi_${benimBasvurum.id}`;
        try { setYapildi(JSON.parse(localStorage.getItem(key) || '{}')); } catch {}
      } else {
        setMulakatHata(r.data.hata || 'Hazırlanamadı');
      }
    } catch (e) {
      setMulakatHata(e.response?.data?.detail || 'Hata oluştu');
    } finally {
      setMulakatLoading(false);
    }
  };

  const toggleYapildi = (key) => {
    setYapildi(prev => {
      const yeni = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(`mulakat_yapildi_${benimBasvurum.id}`, JSON.stringify(yeni));
      } catch {}
      return yeni;
    });
  };

  const aiUret = async () => {
    setKapakUretiliyor(true);
    setKapakHata('');
    try {
      const r = await api.post('/staj/kapak-mektubu', {
        internship_id: parseInt(id),
        ton: kapakTon,
        uzunluk: kapakUzunluk,
        ekstra_yonerge: kapakEkstra || null,
      });
      if (r.data.basarili && r.data.metin) {
        setOnYazi(r.data.metin);
        setKapakModel(r.data.kullanilan_model);
        setKapakUyarilar(r.data.uyarilar || []);
      } else {
        setKapakHata(r.data.hata || 'AI üretemedi, elle yazabilirsin.');
      }
    } catch (e) {
      setKapakHata(e.response?.data?.detail || 'Bir hata oluştu');
    } finally {
      setKapakUretiliyor(false);
    }
  };

  const gonder = async () => {
    setBasvuruYukleniyor(true);
    setMsg('');
    try {
      await api.post(`/internships/${id}/apply`, { on_yazi: onYazi.trim() || '' });
      setBasvurdu(true);
      setMsg('✅ Başvurun alındı! Dashboard\'dan takip edebilirsin.');
      setModalAcik(false);
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.detail || 'Başvuru yapılamadı'}`);
    } finally {
      setBasvuruYukleniyor(false);
    }
  };

  const radarData = useMemo(() => {
    if (!ilan?.beceri_profili) return [];
    return Object.keys(ilan.beceri_profili).map(k => {
      const adkisa = k.length > 14 ? k.slice(0, 14) + '…' : k;
      return { kategori: adkisa, sirket: Number(ilan.beceri_profili[k]) || 0 };
    });
  }, [ilan]);

  // Gap analizini radara da uyarla
  const radarDataIle = useMemo(() => {
    if (!radarData.length || !eksikAnaliz?.gap_analizi) return radarData;
    const mevcutMap = {};
    eksikAnaliz.gap_analizi.forEach(g => {
      const adkisa = g.kategori.length > 14 ? g.kategori.slice(0, 14) + '…' : g.kategori;
      mevcutMap[adkisa] = g.mevcut;
    });
    return radarData.map(r => ({ ...r, ben: mevcutMap[r.kategori] ?? 0 }));
  }, [radarData, eksikAnaliz]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <p className="text-sm text-gray-400">Yükleniyor…</p>
      </div>
    );
  }
  if (!ilan) return null;

  const tabs = [
    { k: 'aciklama', l: 'Açıklama',                ikon: 'ℹ️' },
    { k: 'profil',   l: 'Beceri Profili',          ikon: '📊' },
    { k: 'eksik',    l: 'Senin İçin Analiz',       ikon: '🎯' },
    { k: 'onanaliz', l: 'Şirket Önanalizi',        ikon: '🔮' },
    { k: 'deneyim',  l: `Anonim Deneyimler (${deneyimler.length})`, ikon: '💬' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans antialiased">

      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white text-base font-bold">İ</div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-gray-900 leading-none truncate">{ilan.pozisyon}</h1>
            <button onClick={() => navigate('/internships')}
              className="text-xs text-gray-400 font-medium hover:text-blue-600">← İlanlar</button>
          </div>
        </div>
        {user?.role === 'student' && (
          basvurdu ? (
            (() => {
              const d = benimBasvurum?.durum || 'bekleyen';
              const renkler = {
                bekleyen:    'text-amber-700 bg-amber-50 border-amber-200',
                inceleniyor: 'text-blue-700 bg-blue-50 border-blue-200',
                mulakat:     'text-purple-700 bg-purple-50 border-purple-200',
                kabul:       'text-emerald-700 bg-emerald-50 border-emerald-200',
                red:         'text-red-700 bg-red-50 border-red-200',
              };
              const etiketler = {
                bekleyen: '⏳ Bekleyen', inceleniyor: '🔍 İnceleniyor',
                mulakat: '🤝 Mülakat', kabul: '✅ Kabul', red: '✕ Reddedildi',
              };
              return (
                <span className={`text-xs font-bold border px-4 py-2 rounded-xl whitespace-nowrap ${renkler[d] || ''}`}>
                  {etiketler[d] || d}
                </span>
              );
            })()
          ) : (
            <button onClick={acModal}
              className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-xl shadow-sm transition-all">
              ✋ Başvur
            </button>
          )
        )}
      </header>

      <main className="max-w-[1280px] mx-auto p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* SOL ANA İÇERİK */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* HERO */}
          <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{ilan.pozisyon}</h2>
            {ilan.company?.ad && <p className="text-sm text-gray-500 mb-3">🏢 {ilan.company.ad}</p>}
            <div className="flex flex-wrap gap-2">
              {ilan.departman && <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-semibold">{ilan.departman}</span>}
              {ilan.konum && <span className="text-xs bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full font-semibold">📍 {ilan.konum}</span>}
              {ilan.kontenjan && <span className="text-xs bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full font-semibold">👥 {ilan.kontenjan} kontenjan</span>}
              {ilan.ucret_var_mi && <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">💰 Ücretli</span>}
              {ilan.basvuru_son_tarih && (
                <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-semibold">
                  📅 Son {new Date(ilan.basvuru_son_tarih).toLocaleDateString('tr-TR')}
                </span>
              )}
            </div>
            {msg && (
              <p className={`mt-3 text-xs font-semibold ${msg.startsWith('✅') ? 'text-emerald-600' : 'text-red-600'}`}>{msg}</p>
            )}
          </section>

          {/* SEKMELİ İÇERİK */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex gap-1 border-b border-gray-100 px-4 overflow-x-auto">
              {tabs.map(t => (
                <button key={t.k} onClick={() => setTab(t.k)}
                  className={`px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap
                    ${tab === t.k ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
                  {t.ikon} {t.l}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* AÇIKLAMA */}
              {tab === 'aciklama' && (
                <div className="flex flex-col gap-5">
                  {ilan.aciklama && (
                    <div>
                      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">📋 Açıklama</h3>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ilan.aciklama}</p>
                    </div>
                  )}
                  {ilan.gereksinimler && (
                    <div>
                      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">📌 Gereksinimler</h3>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ilan.gereksinimler}</p>
                    </div>
                  )}
                  {(ilan.staj_baslangic || ilan.staj_bitis) && (
                    <div>
                      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">📆 Staj Tarihleri</h3>
                      <p className="text-sm text-gray-700">
                        {ilan.staj_baslangic && new Date(ilan.staj_baslangic).toLocaleDateString('tr-TR')}
                        {ilan.staj_baslangic && ilan.staj_bitis && ' → '}
                        {ilan.staj_bitis && new Date(ilan.staj_bitis).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* BECERİ PROFİLİ — Radar chart */}
              {tab === 'profil' && (
                <div className="flex flex-col gap-3">
                  {!radarData.length ? (
                    <div className="text-center py-10">
                      <span className="text-4xl block mb-2">📊</span>
                      <p className="text-sm text-gray-400">Bu ilan için beceri profili henüz tanımlı değil.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-gray-500 mb-1">Şirketin aradığı kategori bazlı beceri profili ile senin profilin karşılaştırması:</p>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarDataIle}>
                            <PolarGrid stroke="#E5E7EB" />
                            <PolarAngleAxis dataKey="kategori" tick={{ fontSize: 11, fill: '#6B7280' }} />
                            <Radar name="İlan Hedefi" dataKey="sirket" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.25} />
                            {user?.role === 'student' && eksikAnaliz?.gap_analizi && (
                              <Radar name="Sen" dataKey="ben" stroke="#10B981" fill="#10B981" fillOpacity={0.25} />
                            )}
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* EKSİK ANALİZİ */}
              {tab === 'eksik' && (
                <div className="flex flex-col gap-4">
                  {user?.role !== 'student' ? (
                    <p className="text-sm text-gray-400 text-center py-6">Bu özellik sadece öğrenciler içindir.</p>
                  ) : eksikLoading ? (
                    <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}</div>
                  ) : eksikAnaliz?.uyari ? (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm text-amber-700">
                      ⚠ {eksikAnaliz.uyari}
                    </div>
                  ) : !eksikAnaliz ? (
                    <p className="text-sm text-gray-400 text-center py-6">Analiz yapılamadı.</p>
                  ) : (
                    <>
                      {/* Üst banner: tamamlanma yüzdesi */}
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 rounded-2xl flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs opacity-80 font-semibold mb-1">Bu ilana karşı uyumun</p>
                          <p className="text-3xl font-extrabold">%{eksikAnaliz.tamamlanma_yuzdesi}</p>
                        </div>
                        <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-white" style={{ width: `${eksikAnaliz.tamamlanma_yuzdesi}%` }} />
                        </div>
                      </div>

                      {/* AI yorumu */}
                      {eksikAnaliz.ai_yorum && (
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">✨ AI Yorumu</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{eksikAnaliz.ai_yorum}</p>
                        </div>
                      )}

                      {/* Gap analizi listesi */}
                      <div>
                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">📊 Kategori Bazında Karşılaştırma</h3>
                        <div className="space-y-2">
                          {eksikAnaliz.gap_analizi.map(g => {
                            const sev = SEVIYE_BADGE[g.seviye] || SEVIYE_BADGE.eksik;
                            return (
                              <div key={g.kategori} className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-gray-700 w-40 truncate">{g.kategori}</span>
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden relative">
                                  <div className="h-full bg-blue-500" style={{ width: `${g.mevcut}%` }} />
                                  <div className="absolute top-0 h-full w-0.5 bg-amber-500" style={{ left: `${g.hedef}%` }} title={`Hedef: ${g.hedef}`} />
                                </div>
                                <span className="text-[11px] font-bold text-gray-700 w-16 text-right">{g.mevcut}/{g.hedef}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sev.bg} ${sev.fg} flex-shrink-0`}>{sev.ikon}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Somut adımlar */}
                      {eksikAnaliz.somut_adimlar?.length > 0 && (
                        <div>
                          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">💡 Somut Adımlar</h3>
                          <div className="space-y-2">
                            {eksikAnaliz.somut_adimlar.map((a, i) => (
                              <div key={i} className="p-3 border border-gray-100 rounded-xl">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                                    {a.gap_kategori}
                                  </span>
                                  {a.tahmini_sure && (
                                    <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">⏱ {a.tahmini_sure}</span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-800">{a.adim}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ŞİRKET ÖNANALİZİ */}
              {tab === 'onanaliz' && (
                <div className="flex flex-col gap-4">
                  {onanalizLoading ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm font-bold text-gray-700">Eski stajyer verilerinden önanaliz üretiliyor…</p>
                      <p className="text-xs text-gray-400 mt-1">5-15 saniye</p>
                    </div>
                  ) : !onanaliz ? (
                    <p className="text-sm text-gray-400 text-center py-6">Yükleniyor…</p>
                  ) : !onanaliz.basarili ? (
                    <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl">
                      <p className="text-sm font-bold text-amber-800 mb-1">⚠ Yeterli veri yok</p>
                      <p className="text-xs text-amber-700">{onanaliz.hata}</p>
                    </div>
                  ) : (
                    <>
                      {/* Veri kaynağı banner */}
                      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-5 rounded-2xl shadow-sm flex items-center gap-4">
                        <div className="text-4xl">🔮</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs opacity-80 font-semibold">{onanaliz.sirket_adi} için önanaliz</p>
                          <p className="text-base font-extrabold mt-0.5">
                            {onanaliz.ogrenci_sayisi} eski stajyer · {onanaliz.deneyim_sayisi} anonim deneyim
                          </p>
                          {(onanaliz.ortalama_puan != null || onanaliz.tavsiye_yuzdesi != null) && (
                            <p className="text-xs opacity-90 mt-1">
                              {onanaliz.ortalama_puan != null && <>⭐ {onanaliz.ortalama_puan}/5 </>}
                              {onanaliz.tavsiye_yuzdesi != null && <>· %{onanaliz.tavsiye_yuzdesi} tavsiye</>}
                            </p>
                          )}
                        </div>
                        <button onClick={onanalizYenidenYukle}
                          className="text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl border border-white/20 transition-all whitespace-nowrap">
                          🔄 Yenile
                        </button>
                      </div>

                      {/* AI Özet */}
                      {onanaliz.ozet && (
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">
                            ✨ AI Özeti ({onanaliz.kullanilan_model})
                          </p>
                          <p className="text-sm text-gray-800 leading-relaxed">{onanaliz.ozet}</p>
                        </div>
                      )}

                      {/* Muhtemel teknolojiler */}
                      {onanaliz.muhtemel_teknolojiler?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-700 mb-2">💻 Büyük ihtimalle şunlarla çalışacaksın</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {onanaliz.muhtemel_teknolojiler.map((t, i) => (
                              <span key={i} className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Yaygın işler */}
                      {onanaliz.yaygin_isler?.length > 0 && (
                        <div className="bg-white border border-gray-100 p-4 rounded-xl">
                          <h4 className="text-xs font-bold text-gray-700 mb-2">🛠 Yaygın iş türleri</h4>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {onanaliz.yaygin_isler.map((i, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-emerald-500 mt-0.5">▸</span>
                                <span>{i}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* İş kültürü ipuçları */}
                      {onanaliz.is_kulturu_ipuclari?.length > 0 && (
                        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                          <h4 className="text-xs font-bold text-emerald-800 mb-2">🤝 İş kültürü</h4>
                          <ul className="text-sm text-emerald-900 space-y-1">
                            {onanaliz.is_kulturu_ipuclari.map((i, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-emerald-500 mt-0.5">✓</span>
                                <span>{i}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Uyarılar */}
                      {onanaliz.uyari_noktalari?.length > 0 && (
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                          <h4 className="text-xs font-bold text-amber-800 mb-2">⚠ Bilmen gerekenler</h4>
                          <ul className="text-sm text-amber-900 space-y-1">
                            {onanaliz.uyari_noktalari.map((u, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-amber-600 mt-0.5">!</span>
                                <span>{u}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <p className="text-[10px] text-gray-400 text-center pt-2">
                        🔒 Tüm veriler anonim agregat. Bireysel stajyerin diary'si veya kimliği görünmez.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* ANONİM DENEYİMLER */}
              {tab === 'deneyim' && (
                <div className="flex flex-col gap-4">
                  {/* İstatistik banner */}
                  {stats && stats.toplam_paylasim > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-gray-50 p-3 rounded-xl">
                        <p className="text-[10px] font-bold text-gray-500 uppercase">Paylaşım</p>
                        <p className="text-xl font-extrabold text-gray-900 mt-0.5">{stats.toplam_paylasim}</p>
                      </div>
                      <div className="bg-amber-50 p-3 rounded-xl">
                        <p className="text-[10px] font-bold text-amber-600 uppercase">Ortalama Puan</p>
                        <p className="text-xl font-extrabold text-amber-700 mt-0.5">
                          {stats.ortalama_puan ?? '—'} <span className="text-xs">/5</span>
                        </p>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-xl">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase">Tavsiye Oranı</p>
                        <p className="text-xl font-extrabold text-emerald-700 mt-0.5">
                          {stats.tavsiye_yuzdesi !== null ? `%${stats.tavsiye_yuzdesi}` : '—'}
                        </p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-xl">
                        <p className="text-[10px] font-bold text-blue-600 uppercase">Top Teknoloji</p>
                        <p className="text-xs font-bold text-blue-700 mt-0.5 line-clamp-2">
                          {stats.en_cok_teknoloji?.[0] || '—'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Deneyim listesi */}
                  {deneyimler.length === 0 ? (
                    <div className="text-center py-10">
                      <span className="text-4xl block mb-2">💬</span>
                      <p className="text-sm text-gray-500 mb-1">Henüz bu şirkette staj yapan paylaşmamış.</p>
                      <p className="text-xs text-gray-400">Sen kabul aldığında deneyimini paylaşabilirsin.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {deneyimler.map(d => <DeneyimKarti key={d.id} d={d} />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SAĞ YAN PANEL */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-24 flex flex-col gap-4">

            {/* Başvuru kartı */}
            {user?.role === 'student' && (
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {basvurdu ? 'Başvurum' : 'Başvur'}
                </h3>
                {basvurdu && benimBasvurum ? (
                  <>
                    <BasvuruTimeline basvuru={benimBasvurum} />
                    {benimBasvurum.durum === 'mulakat' && (
                      <button onClick={mulakatHazirligiAc}
                        className="mt-1 w-full text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 py-2.5 rounded-xl shadow-sm transition-all">
                        🤝 Mülakat Hazırlığı
                      </button>
                    )}
                    <button onClick={() => navigate('/student-dashboard')}
                      className="text-[11px] font-bold text-blue-600 hover:underline self-start mt-1">
                      Dashboard'dan takip et →
                    </button>
                  </>
                ) : basvurdu ? (
                  <div className="text-center py-3">
                    <span className="text-3xl block mb-1">✅</span>
                    <p className="text-sm font-bold text-emerald-700">Başvurun alındı</p>
                  </div>
                ) : (
                  <>
                    <button onClick={acModal}
                      className="w-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 py-3 rounded-xl shadow-sm transition-all">
                      ✋ Başvur
                    </button>
                    <p className="text-[11px] text-gray-400 text-center">
                      İstersen AI'a kapak mektubu yazdırabilirsin.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Hızlı uyum kartı */}
            {user?.role === 'student' && eksikAnaliz && !eksikAnaliz.uyari && (
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Senin Uyumun</h3>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-extrabold text-blue-600">%{eksikAnaliz.tamamlanma_yuzdesi}</span>
                  <button onClick={() => setTab('eksik')}
                    className="text-xs font-bold text-blue-600 hover:underline">Detay →</button>
                </div>
                {eksikAnaliz.en_buyuk_gaplar?.length > 0 && (
                  <>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">En büyük gaplar</p>
                    <div className="flex flex-wrap gap-1">
                      {eksikAnaliz.en_buyuk_gaplar.map(g => (
                        <span key={g} className="text-[10px] font-bold bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{g}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Şirket özet */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Şirket</h3>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  {(ilan.company?.ad?.[0] || '?').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{ilan.company?.ad || '—'}</p>
                  <p className="text-xs text-gray-400 truncate">{ilan.company?.email}</p>
                </div>
              </div>
              {stats && stats.toplam_paylasim > 0 && (
                <button onClick={() => setTab('deneyim')}
                  className="text-xs font-bold text-blue-600 hover:underline text-left">
                  💬 {stats.toplam_paylasim} kişi deneyim paylaştı →
                </button>
              )}
            </div>
          </div>
        </aside>
      </main>

      {/* MÜLAKAT HAZIRLIK MODAL */}
      {mulakatModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">🤝 Mülakat Hazırlığı</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {mulakatData ? `${mulakatData.pozisyon} · ${mulakatData.sirket_adi}` : 'AI ile özelleştirilmiş checklist'}
                </p>
              </div>
              <button onClick={() => setMulakatModal(false)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
              {mulakatLoading ? (
                <div className="text-center py-10">
                  <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-700">Hazırlık checklist'i üretiliyor…</p>
                  <p className="text-xs text-gray-400 mt-1">5-15 saniye</p>
                </div>
              ) : mulakatHata ? (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-sm text-red-700">
                  ⚠ {mulakatHata}
                </div>
              ) : mulakatData ? (
                <>
                  {/* Progress */}
                  {(() => {
                    const toplam = mulakatData.kategoriler.reduce((s, k) => s + k.maddeler.length, 0);
                    const tamam = Object.values(yapildi).filter(Boolean).length;
                    const yuzde = toplam > 0 ? Math.round((tamam / toplam) * 100) : 0;
                    return (
                      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-purple-700">İlerleme</span>
                          <span className="text-sm font-bold text-purple-700">{tamam}/{toplam} (%{yuzde})</span>
                        </div>
                        <div className="h-2 bg-white rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 transition-all" style={{ width: `${yuzde}%` }} />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Kategoriler */}
                  {mulakatData.kategoriler.map((k, kIdx) => (
                    <div key={kIdx} className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                        <h4 className="text-sm font-bold text-gray-900">
                          {k.ikon} {k.ad} <span className="text-xs text-gray-500 font-semibold">({k.maddeler.length})</span>
                        </h4>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {k.maddeler.map((m, mIdx) => {
                          const key = `${kIdx}-${mIdx}`;
                          const checked = !!yapildi[key];
                          return (
                            <button key={mIdx} onClick={() => toggleYapildi(key)}
                              className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-all
                                ${checked ? 'bg-emerald-50/50' : 'hover:bg-gray-50'}`}>
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                                ${checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300'}`}>
                                {checked && <span className="text-xs font-bold">✓</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${checked ? 'text-gray-500 line-through' : 'text-gray-900 font-semibold'}`}>
                                  {m.baslik}
                                </p>
                                {m.neden && (
                                  <p className="text-[11px] text-gray-500 mt-0.5">💡 {m.neden}</p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Genel tavsiye */}
                  {mulakatData.genel_tavsiye && (
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">✨ Genel Tavsiye</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{mulakatData.genel_tavsiye}</p>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-100 flex justify-between items-center">
              <p className="text-[10px] text-gray-400">
                {mulakatData?.kullanilan_model && `Model: ${mulakatData.kullanilan_model}`}
              </p>
              <button onClick={() => setMulakatModal(false)}
                className="text-xs font-bold text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-xl">
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KAPAK MEKTUBU MODAL */}
      {modalAcik && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">✋ Staj Başvurusu</h3>
                <p className="text-xs text-gray-500 mt-0.5">{ilan.pozisyon}</p>
              </div>
              <button onClick={() => setModalAcik(false)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>

            {/* Scroll alanı */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

              {/* AI ÜRETİM CONTROLS */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 p-4 rounded-xl">
                <p className="text-xs font-bold text-blue-700 mb-2">🤖 Kapak mektubunu AI yazsın</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">Ton</label>
                    <select value={kapakTon} onChange={e => setKapakTon(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-400">
                      <option value="denge">Profesyonel & İçten</option>
                      <option value="resmi">Resmi</option>
                      <option value="samimi">Samimi</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">Uzunluk</label>
                    <select value={kapakUzunluk} onChange={e => setKapakUzunluk(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-400">
                      <option value="kisa">Kısa (120-180 kelime)</option>
                      <option value="orta">Orta (180-260 kelime)</option>
                      <option value="uzun">Uzun (260-360 kelime)</option>
                    </select>
                  </div>
                </div>
                <input value={kapakEkstra} onChange={e => setKapakEkstra(e.target.value)}
                  placeholder="Ek isteğin? (opsiyonel) Örn: 'X projemden bahset'"
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white mb-2 focus:outline-none focus:border-blue-400" />
                <button onClick={aiUret} disabled={kapakUretiliyor}
                  className="w-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 py-2.5 rounded-lg transition-all">
                  {kapakUretiliyor ? '✨ Üretiliyor… (5-15 sn)' : (onYazi ? '🔄 Yeniden Üret' : '✨ AI ile Üret')}
                </button>
                {kapakHata && <p className="text-xs text-red-600 mt-2">⚠ {kapakHata}</p>}
                {kapakModel && (
                  <p className="text-[10px] text-gray-500 mt-2">Model: <span className="font-bold">{kapakModel}</span></p>
                )}
                {kapakUyarilar.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {kapakUyarilar.map((u, i) => (
                      <p key={i} className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded">💡 {u}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* TEXTAREA */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700">Kapak Mektubu (opsiyonel)</label>
                  <span className="text-[10px] text-gray-400">{onYazi.trim().split(/\s+/).filter(Boolean).length} kelime</span>
                </div>
                <textarea value={onYazi} onChange={e => setOnYazi(e.target.value)}
                  rows={12}
                  placeholder="Buraya AI üretebilir veya kendin yazabilirsin. Boş bırakıp doğrudan başvurabilirsin."
                  className="w-full text-sm px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none font-mono" />
              </div>

              {msg && msg.startsWith('❌') && (
                <p className="text-xs text-red-600 font-semibold">{msg}</p>
              )}
            </div>

            {/* Footer butonları */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-2">
              <button onClick={() => setModalAcik(false)}
                className="text-xs font-bold text-gray-600 hover:text-gray-900 px-4 py-2 rounded-xl hover:bg-gray-50">
                İptal
              </button>
              <div className="flex gap-2">
                <button onClick={() => { setOnYazi(''); gonder(); }} disabled={basvuruYukleniyor}
                  className="text-xs font-bold text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 px-4 py-2 rounded-xl transition-all">
                  Mektupsuz Başvur
                </button>
                <button onClick={gonder} disabled={basvuruYukleniyor}
                  className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 px-5 py-2 rounded-xl shadow-sm transition-all">
                  {basvuruYukleniyor ? 'Gönderiliyor…' : '✋ Başvuruyu Gönder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
