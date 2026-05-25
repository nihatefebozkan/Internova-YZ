// Gruplarım — üyesi olduğum gruplar (sahip/moderatör/üye ayrımı)
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const ROL_BADGE = {
  owner:     { ad: 'Sahip',      bg: 'bg-purple-50',  fg: 'text-purple-700',  border: 'border-purple-200',  ikon: '👑' },
  moderator: { ad: 'Moderatör',  bg: 'bg-blue-50',    fg: 'text-blue-700',    border: 'border-blue-200',    ikon: '🛡' },
  member:    { ad: 'Üye',        bg: 'bg-gray-50',    fg: 'text-gray-600',    border: 'border-gray-200',    ikon: '👤' },
};

function GrupKarti({ g, rol, navigate }) {
  const r = ROL_BADGE[rol] || ROL_BADGE.member;
  return (
    <div onClick={() => navigate(`/groups/${g.id}`)}
      className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-bold text-gray-900 line-clamp-1">{g.ad}</h3>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${r.bg} ${r.fg} ${r.border}`}>
          {r.ikon} {r.ad}
        </span>
      </div>
      {g.aciklama && <p className="text-xs text-gray-500 line-clamp-2">{g.aciklama}</p>}
      <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-2 border-t border-gray-50">
        <span className="truncate">👤 {g.owner?.ad} {g.owner?.soyad}</span>
        <span className="font-semibold text-gray-600">{g.uye_sayisi}/{g.max_uye} üye</span>
      </div>
    </div>
  );
}

export default function MyGroups() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/groups/me').then(r => setGroups(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Sahip olduğu/moderatör olduğu/üye olduğu grupları rolüne göre tespit etmek için ayrı çağrı yapmadan
  // membership rolünü detay endpoint'inden almak gerekirdi. Burada owner kontrolünü user.id ile yapıyoruz.
  const sahipligindeki = useMemo(
    () => groups.filter(g => g.owner_id === user?.id),
    [groups, user]
  );
  const uyesiOlduklari = useMemo(
    () => groups.filter(g => g.owner_id !== user?.id),
    [groups, user]
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans antialiased">

      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white text-base font-bold">G</div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">Gruplarım</h1>
            <span className="text-xs text-gray-400 font-medium">Üye olduğun ve yönettiğin gruplar</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/groups')}
            className="text-xs font-bold text-gray-600 hover:text-gray-900 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all">
            Tüm Projeler
          </button>
          <button onClick={() => navigate('/groups/new')}
            className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-sm transition-all">
            + Grup Kur
          </button>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto p-6 lg:p-8 flex flex-col gap-8">

        {/* İstatistik kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Toplam Grup',     value: groups.length,        alt: 'Üyesi olduğun',         icon: '👥', bg: 'bg-gray-50' },
            { label: 'Sahipliğinde',    value: sahipligindeki.length, alt: 'Sen kurmuşsun',         icon: '👑', bg: 'bg-purple-50' },
            { label: 'Üyelik',          value: uyesiOlduklari.length, alt: 'Katıldığın gruplar',    icon: '🛡', bg: 'bg-blue-50' },
          ].map(({ label, value, alt, icon, bg }) => (
            <div key={label} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-400 block mb-3">{label}</span>
                <span className="text-3xl font-bold text-gray-900 block">{loading ? '…' : value}</span>
                <span className="text-xs text-gray-400 mt-1 block">{alt}</span>
              </div>
              <span className={`text-xl p-2 ${bg} rounded-xl`}>{icon}</span>
            </div>
          ))}
        </div>

        {/* Sahip olduğun gruplar */}
        {sahipligindeki.length > 0 && (
          <section>
            <h2 className="text-lg font-extrabold text-gray-900 mb-3">👑 Sahip Olduğun</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sahipligindeki.map(g => <GrupKarti key={g.id} g={g} rol="owner" navigate={navigate} />)}
            </div>
          </section>
        )}

        {/* Üyesi olduğun gruplar */}
        <section>
          <h2 className="text-lg font-extrabold text-gray-900 mb-3">
            {sahipligindeki.length > 0 ? '👥 Üyesi Olduğun Diğer Gruplar' : '👥 Gruplarım'}
          </h2>
          {loading ? (
            <p className="text-sm text-gray-400">Yükleniyor…</p>
          ) : groups.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm text-center">
              <span className="text-5xl block mb-3">👥</span>
              <p className="text-sm text-gray-500 mb-4">Henüz bir gruba üye değilsin.</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => navigate('/groups')}
                  className="text-xs font-bold text-blue-600 border border-blue-200 px-4 py-2 rounded-xl hover:bg-blue-50">
                  Projeleri Keşfet →
                </button>
                <button onClick={() => navigate('/groups/new')}
                  className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-sm">
                  + Grup Kur
                </button>
              </div>
            </div>
          ) : uyesiOlduklari.length === 0 ? (
            <p className="text-sm text-gray-400 bg-white p-5 rounded-2xl border border-gray-100">
              Sadece sahip olduğun gruplar var.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {uyesiOlduklari.map(g => <GrupKarti key={g.id} g={g} rol="member" navigate={navigate} />)}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
