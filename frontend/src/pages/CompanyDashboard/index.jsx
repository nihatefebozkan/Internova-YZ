// Şirket Paneli — Tailwind + İlan yönetimi + Başvuru takibi + Bulk + AI sıralama
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const BOSH_FORM = { pozisyon: '', departman: '', konum: '', aciklama: '', ucret_var_mi: false, durum: 'aktif', bolum_kodu: '' };

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

const DURUM_BADGE = {
  bekleyen:    { ad: 'Bekleyen',    bg: 'bg-amber-50',    fg: 'text-amber-700',    ikon: '⏳' },
  inceleniyor: { ad: 'İnceleniyor', bg: 'bg-blue-50',     fg: 'text-blue-700',     ikon: '🔍' },
  mulakat:     { ad: 'Mülakat',     bg: 'bg-purple-50',   fg: 'text-purple-700',   ikon: '🤝' },
  kabul:       { ad: 'Kabul',       bg: 'bg-emerald-50',  fg: 'text-emerald-700',  ikon: '✅' },
  red:         { ad: 'Reddedildi',  bg: 'bg-red-50',      fg: 'text-red-700',      ikon: '✕'  },
};

// Hangi durumdan hangi durumlara geçiş izinli
const GECERLI_GECISLER = {
  bekleyen:    ['inceleniyor','mulakat','kabul','red'],
  inceleniyor: ['mulakat','kabul','red'],
  mulakat:     ['kabul','red'],
  kabul:       [],
  red:         [],
};

function AdayKart({ app, selected, onToggle, aiUyum, onDecide }) {
  const dur = DURUM_BADGE[app.durum] || DURUM_BADGE.bekleyen;
  const terminal = app.durum === 'kabul' || app.durum === 'red';
  const izinli = GECERLI_GECISLER[app.durum] || [];

  return (
    <div className={`bg-white p-4 rounded-xl border transition-all
      ${selected ? 'border-blue-400 bg-blue-50/40 ring-2 ring-blue-100' : 'border-gray-100 hover:shadow-sm'}`}>
      <div className="flex items-start gap-3">
        {!terminal && (
          <input type="checkbox" checked={selected} onChange={onToggle}
            className="mt-1 h-4 w-4 accent-blue-600 cursor-pointer" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{app.student?.ad} {app.student?.soyad}</p>
              <p className="text-xs text-gray-400 truncate">{app.student?.email}</p>
              {app.student?.bolum && (
                <p className="text-[11px] text-gray-500 mt-0.5">🎓 {app.student.bolum}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${dur.bg} ${dur.fg}`}>
                {dur.ikon} {dur.ad}
              </span>
              {aiUyum != null && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                  ${aiUyum >= 70 ? 'bg-emerald-100 text-emerald-700'
                    : aiUyum >= 40 ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-600'}`}>
                  🤖 %{aiUyum}
                </span>
              )}
            </div>
          </div>

          {/* Önce yazısı varsa kısa */}
          {app.on_yazi && (
            <p className="text-xs text-gray-600 mt-2 line-clamp-2 italic">"{app.on_yazi}"</p>
          )}

          {/* Hızlı işlem butonları */}
          {!terminal && izinli.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {izinli.map(d => {
                const b = DURUM_BADGE[d];
                return (
                  <button key={d} onClick={() => onDecide(d)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${b.bg} ${b.fg} border-transparent hover:opacity-80 transition-all`}>
                    {b.ikon} {b.ad}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CompanyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [internships, setInternships] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [applications, setApplications] = useState([]);
  const [bolumler, setBolumler] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BOSH_FORM);
  const [profil, setProfil] = useState({});
  const [kategoriler, setKategoriler] = useState([]);
  const [msg, setMsg] = useState('');

  // Bulk + AI
  const [secili, setSecili] = useState(new Set());
  const [aiAcik, setAiAcik] = useState(false);
  const [aiSiralama, setAiSiralama] = useState({});       // {appId: uyum_yuzdesi}
  const [aiYukleniyor, setAiYukleniyor] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [filtre, setFiltre] = useState('hepsi');           // hepsi | bekleyen | inceleniyor | mulakat | kabul | red

  useEffect(() => {
    // Şirketin TÜM ilanları (taslak/aktif/kapalı hepsi)
    api.get('/internships/me')
      .then(res => {
        setInternships(res.data);
        if (res.data.length > 0) setSelectedId(res.data[0].id);
      })
      .finally(() => setLoading(false));
    api.get('/career/bolumler').then(res => setBolumler(res.data)).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!selectedId) return;
    api.get(`/applications/internship/${selectedId}`)
      .then(res => setApplications(res.data))
      .catch(() => setApplications([]));
    // sıfırla
    setSecili(new Set());
    setAiAcik(false);
    setAiSiralama({});
  }, [selectedId]);

  const handleBolumChange = (bolum_kodu) => {
    setForm(f => ({ ...f, bolum_kodu }));
    const cats = KAT_MAP[bolum_kodu] || [];
    setKategoriler(cats);
    setProfil(Object.fromEntries(cats.map(k => [k, 0])));
  };

  const createInternship = async (e) => {
    e.preventDefault();
    if (!form.bolum_kodu) { setMsg('Lütfen bölüm seçin.'); return; }
    try {
      const res = await api.post('/internships', { ...form, beceri_profili: profil });
      setInternships(prev => [...prev, res.data]);
      setShowForm(false); setForm(BOSH_FORM); setProfil({}); setKategoriler([]);
      setMsg('✅ İlan oluşturuldu!');
      setTimeout(() => setMsg(''), 4000);
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.detail || 'İlan oluşturulamadı'));
    }
  };

  const decide = async (appId, durum) => {
    try {
      await api.put(`/applications/${appId}/decision`, { durum });
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, durum } : a));
      setSecili(prev => { const yeni = new Set(prev); yeni.delete(appId); return yeni; });
    } catch (e) {
      alert(e.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const toggleSecili = (id) => {
    setSecili(prev => {
      const yeni = new Set(prev);
      if (yeni.has(id)) yeni.delete(id); else yeni.add(id);
      return yeni;
    });
  };

  const tumunuSec = () => {
    const nonTerm = applications.filter(a => a.durum !== 'kabul' && a.durum !== 'red');
    if (secili.size === nonTerm.length) setSecili(new Set());
    else setSecili(new Set(nonTerm.map(a => a.id)));
  };

  const bulkAksiyon = async (durum) => {
    if (secili.size === 0) return;
    if (!window.confirm(`${secili.size} başvuruyu '${DURUM_BADGE[durum].ad}' durumuna taşımak istediğine emin misin?`)) return;
    setBulkBusy(true);
    try {
      const r = await api.put('/applications/bulk-decision', {
        application_ids: Array.from(secili),
        durum,
      });
      // Başarılıları güncelle
      const basarili = new Set(r.data.basarili);
      setApplications(prev => prev.map(a => basarili.has(a.id) ? { ...a, durum } : a));
      setSecili(new Set());
      let mesaj = `✅ ${r.data.basarili.length} başvuru güncellendi`;
      if (r.data.atlanan.length > 0) mesaj += `, ${r.data.atlanan.length} atlandı`;
      setMsg(mesaj);
      setTimeout(() => setMsg(''), 5000);
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.detail || 'Toplu işlem başarısız'));
    } finally {
      setBulkBusy(false);
    }
  };

  const aiSiralamaCagir = async () => {
    if (!selectedId) return;
    setAiYukleniyor(true);
    try {
      const r = await api.get(`/applications/internship/${selectedId}/ai-siralama`);
      const map = {};
      r.data.forEach(x => { map[x.application_id] = x.uyum_yuzdesi; });
      setAiSiralama(map);
      setAiAcik(true);
    } catch (e) {
      alert(e.response?.data?.detail || 'AI sıralama yapılamadı');
    } finally {
      setAiYukleniyor(false);
    }
  };

  const goruntulenenler = applications
    .filter(a => filtre === 'hepsi' ? true : a.durum === filtre)
    .sort((a, b) => {
      if (aiAcik) {
        return (aiSiralama[b.id] || 0) - (aiSiralama[a.id] || 0);
      }
      return new Date(b.basvuru_tarihi) - new Date(a.basvuru_tarihi);
    });

  const seciliInRange = goruntulenenler.filter(a => secili.has(a.id) && a.durum !== 'kabul' && a.durum !== 'red');
  const nonTerminal = goruntulenenler.filter(a => a.durum !== 'kabul' && a.durum !== 'red');

  // Kararlar için Faz 2 #10 — bulk durum seçenekleri (seçili olanların ortak izinli durumları)
  const ortakIzinli = (() => {
    if (seciliInRange.length === 0) return [];
    const setler = seciliInRange.map(a => new Set(GECERLI_GECISLER[a.durum] || []));
    return Array.from(setler.reduce((a, b) => new Set([...a].filter(x => b.has(x)))));
  })();

  const sayim = {
    bekleyen:    applications.filter(a => a.durum === 'bekleyen').length,
    inceleniyor: applications.filter(a => a.durum === 'inceleniyor').length,
    mulakat:     applications.filter(a => a.durum === 'mulakat').length,
    kabul:       applications.filter(a => a.durum === 'kabul').length,
    red:         applications.filter(a => a.durum === 'red').length,
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans antialiased">

      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white text-base font-bold">Ş</div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-gray-900 leading-none truncate">{user?.ad || 'Şirket'}</h1>
            <span className="text-xs text-gray-400 font-medium">Staj İlanı & Başvuru Yönetimi</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/internships')}
            className="text-xs font-bold text-gray-700 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-xl transition-all">
            🔍 Tüm İlanlar
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-sm transition-all">
            {showForm ? '✕ İptal' : '+ Yeni İlan'}
          </button>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto p-6 lg:p-8 flex flex-col gap-6">

        {/* Mesaj banner */}
        {msg && (
          <div className={`p-3 rounded-xl text-sm font-semibold ${
            msg.startsWith('❌') ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>{msg}</div>
        )}

        {/* YENİ İLAN FORMU */}
        {showForm && (
          <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-base font-extrabold text-gray-900 mb-4">Yeni Staj İlanı</h2>
            <form onSubmit={createInternship} className="flex flex-col gap-3">
              <input required value={form.pozisyon}
                onChange={e => setForm(f => ({ ...f, pozisyon: e.target.value }))}
                placeholder="Pozisyon *"
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400" />
              <div className="grid grid-cols-2 gap-3">
                <input value={form.departman}
                  onChange={e => setForm(f => ({ ...f, departman: e.target.value }))}
                  placeholder="Departman"
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400" />
                <input value={form.konum}
                  onChange={e => setForm(f => ({ ...f, konum: e.target.value }))}
                  placeholder="Konum"
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <textarea value={form.aciklama} rows={3}
                onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))}
                placeholder="Açıklama"
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 resize-none" />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.ucret_var_mi}
                  onChange={e => setForm(f => ({ ...f, ucret_var_mi: e.target.checked }))}
                  className="h-4 w-4 accent-blue-600" />
                Ücretli staj
              </label>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Hedef Bölüm *</label>
                <select value={form.bolum_kodu} onChange={e => handleBolumChange(e.target.value)} required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 font-semibold">
                  <option value="">— Bölüm seçin —</option>
                  {bolumler.map(b => <option key={b.kod} value={b.kod}>{b.ad}</option>)}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">Beceri profili bölüme göre şekillenir</p>
              </div>

              {kategoriler.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs font-bold text-gray-700 mb-3">
                    Aranan Beceri Profili <span className="font-normal text-gray-400">(0 önemli değil, 100 zorunlu)</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {kategoriler.map(k => (
                      <div key={k} className="bg-white p-3 rounded-lg">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-semibold text-gray-700">{k}</span>
                          <span className="font-bold text-blue-700">%{profil[k] ?? 0}</span>
                        </div>
                        <input type="range" min="0" max="100" step="5"
                          value={profil[k] ?? 0}
                          onChange={e => setProfil(p => ({ ...p, [k]: Number(e.target.value) }))}
                          className="w-full accent-blue-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit"
                className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 py-3 rounded-xl shadow-sm transition-all">
                İlanı Oluştur
              </button>
            </form>
          </section>
        )}

        {/* ANA GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* SOL — İlan Listesi */}
          <section className="lg:col-span-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-extrabold text-gray-900 mb-3">
              📋 İlanlarım <span className="text-xs font-bold text-gray-500 ml-1">({internships.length})</span>
            </h3>
            {loading ? (
              <p className="text-sm text-gray-400">Yükleniyor…</p>
            ) : internships.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400 mb-3">Henüz ilan yok.</p>
                <button onClick={() => setShowForm(true)}
                  className="text-xs font-bold text-blue-600 border border-blue-200 px-4 py-2 rounded-xl hover:bg-blue-50">
                  + İlk ilanı oluştur
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {internships.map(i => (
                  <button key={i.id} onClick={() => setSelectedId(i.id)}
                    className={`text-left p-3 rounded-xl border transition-all
                      ${selectedId === i.id
                        ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200'
                        : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}`}>
                    <p className={`text-sm font-bold ${selectedId === i.id ? 'text-blue-700' : 'text-gray-900'} truncate`}>
                      {i.pozisyon}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {i.konum || '—'} · {i.durum}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* SAĞ — Başvurular */}
          <section className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Üst — başlık + AI butonu */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-gray-900 truncate">
                  Başvurular {selectedId && `— ${internships.find(i => i.id === selectedId)?.pozisyon || ''}`}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{applications.length} toplam başvuru</p>
              </div>
              <div className="flex items-center gap-2">
                {aiAcik && (
                  <button onClick={() => setAiAcik(false)}
                    className="text-xs font-bold text-gray-600 hover:text-gray-900 px-3 py-2 rounded-xl hover:bg-gray-50">
                    ✕ AI Sıralama Kapat
                  </button>
                )}
                {!aiAcik && (
                  <button onClick={aiSiralamaCagir} disabled={aiYukleniyor || applications.length === 0}
                    className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 px-3 py-2 rounded-xl shadow-sm transition-all">
                    {aiYukleniyor ? '⏳ Hesaplanıyor…' : '🤖 AI Sıralama'}
                  </button>
                )}
              </div>
            </div>

            {/* Filtre çipleri */}
            <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-2 items-center">
              {[
                { k: 'hepsi', l: `Hepsi (${applications.length})` },
                { k: 'bekleyen', l: `Bekleyen (${sayim.bekleyen})` },
                { k: 'inceleniyor', l: `İnceleniyor (${sayim.inceleniyor})` },
                { k: 'mulakat', l: `Mülakat (${sayim.mulakat})` },
                { k: 'kabul', l: `Kabul (${sayim.kabul})` },
                { k: 'red', l: `Red (${sayim.red})` },
              ].map(f => (
                <button key={f.k} onClick={() => setFiltre(f.k)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all
                    ${filtre === f.k
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                  {f.l}
                </button>
              ))}
            </div>

            {/* Bulk action bar */}
            {nonTerminal.length > 0 && (
              <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input type="checkbox"
                    checked={seciliInRange.length > 0 && seciliInRange.length === nonTerminal.length}
                    onChange={tumunuSec}
                    className="h-4 w-4 accent-blue-600" />
                  <span className="font-bold">
                    {seciliInRange.length > 0
                      ? `${seciliInRange.length} seçili`
                      : `Tümünü seç (${nonTerminal.length})`}
                  </span>
                </label>
                {seciliInRange.length > 0 && ortakIzinli.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mr-1">Toplu:</span>
                    {ortakIzinli.map(d => {
                      const b = DURUM_BADGE[d];
                      return (
                        <button key={d} onClick={() => bulkAksiyon(d)} disabled={bulkBusy}
                          className={`text-[11px] font-bold px-3 py-1.5 rounded-lg ${b.bg} ${b.fg} hover:opacity-80 transition-all disabled:opacity-50`}>
                          {b.ikon} {b.ad}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Başvuru listesi */}
            <div className="p-6">
              {goruntulenenler.length === 0 ? (
                <div className="text-center py-10">
                  <span className="text-5xl block mb-2">📭</span>
                  <p className="text-sm text-gray-400">
                    {filtre === 'hepsi' ? 'Bu ilana henüz başvuru yok.' : 'Bu filtreye uyan başvuru yok.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {goruntulenenler.map(app => (
                    <AdayKart key={app.id} app={app}
                      selected={secili.has(app.id)}
                      onToggle={() => toggleSecili(app.id)}
                      aiUyum={aiAcik ? aiSiralama[app.id] : null}
                      onDecide={(durum) => decide(app.id, durum)} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
