// Staj İlanları — modern Tailwind, arama + filtre + zengin kartlar
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function IlanKarti({ ilan, navigate }) {
  const skor = ilan.beceri_profili
    ? Math.round(
        Object.values(ilan.beceri_profili).reduce((a, b) => a + (Number(b) || 0), 0) /
          Math.max(Object.keys(ilan.beceri_profili).length, 1)
      )
    : null;

  return (
    <div onClick={() => navigate(`/internships/${ilan.id}`)}
      className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all flex flex-col gap-3">
      {/* Başlık */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-gray-900 line-clamp-2 leading-snug">{ilan.pozisyon}</h3>
          {ilan.company?.ad && (
            <p className="text-xs text-gray-400 mt-1 truncate">🏢 {ilan.company.ad}</p>
          )}
        </div>
        {ilan.ucret_var_mi && (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
            💰 Ücretli
          </span>
        )}
      </div>

      {/* Açıklama */}
      {ilan.aciklama && (
        <p className="text-xs text-gray-500 line-clamp-2">{ilan.aciklama}</p>
      )}

      {/* Meta etiketler */}
      <div className="flex flex-wrap gap-1.5">
        {ilan.departman && (
          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {ilan.departman}
          </span>
        )}
        {ilan.konum && (
          <span className="text-[10px] font-semibold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full">
            📍 {ilan.konum}
          </span>
        )}
        {ilan.kontenjan && (
          <span className="text-[10px] font-semibold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full">
            👥 {ilan.kontenjan} kişi
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 mt-auto pt-2 border-t border-gray-50">
        <span>
          {ilan.basvuru_son_tarih
            ? `📅 Son ${new Date(ilan.basvuru_son_tarih).toLocaleDateString('tr-TR')}`
            : 'Tarih belirsiz'}
        </span>
        {skor !== null && (
          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
            Beceri ort. {skor}
          </span>
        )}
      </div>
    </div>
  );
}

export default function InternshipsPage() {
  const navigate = useNavigate();
  const [ilanlar, setIlanlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchIlanlar = (q = '') => {
    setLoading(true);
    const params = q ? `?search=${encodeURIComponent(q)}` : '';
    api.get(`/internships${params}`)
      .then(r => setIlanlar(r.data))
      .catch(() => setIlanlar([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchIlanlar(); }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans antialiased">

      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white text-base font-bold">İ</div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">Staj İlanları</h1>
            <span className="text-xs text-gray-400 font-medium">Aktif staj fırsatlarını keşfet</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/staj/hazirlik')}
            className="text-xs font-bold text-gray-600 hover:text-gray-900 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all">
            🎯 Hazırlığım
          </button>
          <button onClick={() => navigate('/student-dashboard')}
            className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-sm transition-all">
            Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto p-6 lg:p-8 flex flex-col gap-6">

        {/* ARAMA */}
        <section className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchIlanlar(search)}
              placeholder="Pozisyon, konum, şirket ara…"
              className="w-full text-sm pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
          </div>
          <button onClick={() => fetchIlanlar(search)}
            className="text-xs font-bold text-white bg-gray-900 hover:bg-gray-800 px-5 py-2.5 rounded-xl transition-all">
            Ara
          </button>
          {search && (
            <button onClick={() => { setSearch(''); fetchIlanlar(''); }}
              className="text-xs font-bold text-gray-500 hover:text-gray-900 px-3 py-2.5 rounded-xl hover:bg-gray-50">
              ✕ Temizle
            </button>
          )}
        </section>

        {/* LİSTE */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-extrabold text-gray-900">Aktif İlanlar</h2>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {ilanlar.length}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 h-44 animate-pulse">
                  <div className="h-4 w-3/4 bg-gray-100 rounded mb-3" />
                  <div className="h-3 w-1/2 bg-gray-100 rounded mb-4" />
                  <div className="h-2 w-full bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : ilanlar.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm text-center">
              <span className="text-5xl block mb-3">🔍</span>
              <p className="text-sm text-gray-500 mb-3">
                {search ? 'Aramana uygun ilan bulunamadı.' : 'Şu an aktif ilan yok.'}
              </p>
              {search && (
                <button onClick={() => { setSearch(''); fetchIlanlar(''); }}
                  className="text-xs font-bold text-blue-600 border border-blue-200 px-4 py-2 rounded-xl hover:bg-blue-50">
                  Tüm ilanları gör
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ilanlar.map(i => <IlanKarti key={i.id} ilan={i} navigate={navigate} />)}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
