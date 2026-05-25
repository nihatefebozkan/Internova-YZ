// Proje keşfi — ana ekran. Tıklanan proje detayına gider; oradan gruba.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const KATEGORILER = [
  { k: '',       ad: 'Tüm kategoriler', ikon: '🌐' },
  { k: 'web',    ad: 'Web',             ikon: '🌐' },
  { k: 'mobile', ad: 'Mobil',           ikon: '📱' },
  { k: 'ai',     ad: 'AI',              ikon: '🤖' },
  { k: 'oyun',   ad: 'Oyun',            ikon: '🎮' },
  { k: 'veri',   ad: 'Veri',            ikon: '📊' },
  { k: 'diger',  ad: 'Diğer',           ikon: '✨' },
];

const SEVIYELER = [
  { k: '',          ad: 'Tüm seviyeler' },
  { k: 'baslangic', ad: 'Başlangıç' },
  { k: 'orta',      ad: 'Orta' },
  { k: 'ileri',     ad: 'İleri' },
];

const SEVIYE_RENK = {
  baslangic: 'bg-emerald-50 text-emerald-700',
  orta:      'bg-amber-50 text-amber-700',
  ileri:     'bg-red-50 text-red-700',
};

function ProjeKarti({ p, navigate, onerilen }) {
  const toplamDolu = (p.departments || []).reduce((s, d) => s + (d.dolu_sayisi || 0), 0);
  const toplamGerek = (p.departments || []).reduce((s, d) => s + (d.gereken_kisi || 0), 0);
  const yuzde = toplamGerek > 0 ? Math.round((toplamDolu / toplamGerek) * 100) : 0;

  return (
    <div onClick={() => navigate(`/projects/${p.id}`)}
      className={`bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all flex flex-col gap-3 relative
        ${onerilen ? 'border-blue-200' : 'border-gray-100'}`}>
      {onerilen && (
        <span className="absolute -top-2 -right-2 text-[9px] font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full shadow">
          ✨ Sana Önerilen
        </span>
      )}

      {/* Başlık + meta */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-gray-900 line-clamp-2 leading-snug">{p.ad}</h3>
          {p.group_ad && (
            <p className="text-[11px] text-gray-400 mt-1 truncate">📌 {p.group_ad}</p>
          )}
        </div>
        {p.kategori && (
          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
            {p.kategori}
          </span>
        )}
      </div>

      {/* Kısa açıklama */}
      {p.kisa_aciklama && <p className="text-xs text-gray-500 line-clamp-2">{p.kisa_aciklama}</p>}

      {/* Meta etiketler */}
      <div className="flex flex-wrap gap-1.5">
        {p.seviye && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SEVIYE_RENK[p.seviye] || 'bg-gray-50 text-gray-600'}`}>
            📊 {p.seviye}
          </span>
        )}
        {p.sure && (
          <span className="text-[10px] font-semibold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full">
            ⏱ {p.sure}
          </span>
        )}
        {p.haftalik_saat && (
          <span className="text-[10px] font-semibold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full">
            ⌛ {p.haftalik_saat} sa/hf
          </span>
        )}
      </div>

      {/* Departman özeti */}
      {p.departments?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {p.departments.slice(0, 4).map(d => (
            <span key={d.id} className="text-[10px] font-bold bg-gray-50 text-gray-700 px-2 py-1 rounded-full">
              {d.ad} {d.dolu_sayisi}/{d.gereken_kisi}
            </span>
          ))}
          {p.departments.length > 4 && (
            <span className="text-[10px] text-gray-400 font-semibold px-1 py-1">+{p.departments.length - 4}</span>
          )}
        </div>
      )}

      {/* Doluluk barı */}
      <div className="mt-auto pt-2 border-t border-gray-50">
        <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
          <span className="font-semibold">{toplamDolu}/{toplamGerek} kişi katıldı</span>
          <span className="font-bold text-gray-700">%{yuzde}</span>
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${yuzde >= 100 ? 'bg-gray-300' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(yuzde, 100)}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function Groups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [recs, setRecs] = useState([]);
  const [q, setQ] = useState('');
  const [kategori, setKategori] = useState('');
  const [seviye, setSeviye] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (kategori) params.set('kategori', kategori);
    if (seviye) params.set('seviye', seviye);
    params.set('durum', 'acik');
    try {
      const r = await api.get(`/discover?${params}`);
      setProjects(r.data?.projects || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); /* eslint-disable-next-line */ }, [kategori, seviye]);
  useEffect(() => {
    if (user) api.get('/discover/recommendations').then(r => setRecs(r.data?.projects || [])).catch(() => {});
  }, [user]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans antialiased">

      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white text-base font-bold">P</div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">Projeler</h1>
            <span className="text-xs text-gray-400 font-medium">Birlikte çalışacağın takımı bul</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/groups/me')}
            className="text-xs font-bold text-gray-600 hover:text-gray-900 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all">
            Gruplarım
          </button>
          <button onClick={() => navigate('/groups/new')}
            className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-sm transition-all">
            + Grup Kur
          </button>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto p-6 lg:p-8 flex flex-col gap-8">

        {/* ARAMA + FİLTRE */}
        <section className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input value={q} onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchProjects()}
                placeholder="Proje ara…"
                className="w-full text-sm pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
            </div>
            <select value={seviye} onChange={e => setSeviye(e.target.value)}
              className="text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 font-semibold text-gray-700">
              {SEVIYELER.map(s => <option key={s.k} value={s.k}>{s.ad}</option>)}
            </select>
            <button onClick={fetchProjects}
              className="text-xs font-bold text-white bg-gray-900 hover:bg-gray-800 px-5 py-2.5 rounded-xl transition-all">
              Ara
            </button>
          </div>

          {/* Kategori chipleri */}
          <div className="flex flex-wrap gap-2">
            {KATEGORILER.map(c => {
              const sec = kategori === c.k;
              return (
                <button key={c.k} onClick={() => setKategori(c.k)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all
                    ${sec
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                  {c.ikon} {c.ad}
                </button>
              );
            })}
          </div>
        </section>

        {/* ÖNERİLER */}
        {recs.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-extrabold text-gray-900">✨ Sana Önerilen</h2>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{recs.length}</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">Profilindeki becerilerle eşleşen projeler</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recs.map(p => <ProjeKarti key={p.id} p={p} navigate={navigate} onerilen />)}
            </div>
          </section>
        )}

        {/* TÜM PROJELER */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-extrabold text-gray-900">Tüm Açık Projeler</h2>
            <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{projects.length}</span>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 animate-pulse h-44">
                  <div className="h-4 w-3/4 bg-gray-100 rounded mb-3" />
                  <div className="h-3 w-1/2 bg-gray-100 rounded mb-4" />
                  <div className="h-2 w-full bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm text-center">
              <span className="text-5xl block mb-3">🚀</span>
              <p className="text-sm text-gray-500 mb-4">
                {q || kategori || seviye ? 'Aramana uygun açık proje bulunamadı.' : 'Henüz açık proje yok.'}
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                {(q || kategori || seviye) && (
                  <button onClick={() => { setQ(''); setKategori(''); setSeviye(''); }}
                    className="text-xs font-bold text-gray-600 border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50">
                    Filtreleri Temizle
                  </button>
                )}
                <button onClick={() => navigate('/groups/new')}
                  className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-sm">
                  + İlk grubu sen kur
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(p => <ProjeKarti key={p.id} p={p} navigate={navigate} />)}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
