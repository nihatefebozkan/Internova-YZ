// Grup detayı — sticky header + sekmeli içerik + zengin üye/proje/başvuru görünümü
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const ROL_BADGE = {
  owner:     { ad: 'Sahip',      bg: 'bg-purple-50',  fg: 'text-purple-700',  border: 'border-purple-200',  ikon: '👑' },
  moderator: { ad: 'Moderatör',  bg: 'bg-blue-50',    fg: 'text-blue-700',    border: 'border-blue-200',    ikon: '🛡' },
  member:    { ad: 'Üye',        bg: 'bg-gray-50',    fg: 'text-gray-600',    border: 'border-gray-200',    ikon: '👤' },
};

const DURUM_RENK = {
  acik:        'bg-emerald-50 text-emerald-700',
  devam:       'bg-amber-50 text-amber-700',
  tamamlandi:  'bg-gray-100 text-gray-600',
};

function UyeSatiri({ m, yonetici, currentUserId, onCikar, onRolDegistir }) {
  const r = ROL_BADGE[m.rol] || ROL_BADGE.member;
  const harf = (m.user?.ad?.[0] || '?').toUpperCase();
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between hover:shadow-sm transition-all">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">
          {harf}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">
            {m.user?.ad} {m.user?.soyad}
            {m.user_id === currentUserId && <span className="text-[10px] text-blue-600 ml-1.5">(sen)</span>}
          </p>
          <p className="text-xs text-gray-400 truncate">{m.user?.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${r.bg} ${r.fg} ${r.border}`}>
          {r.ikon} {r.ad}
        </span>
        {yonetici && m.rol !== 'owner' && m.user_id !== currentUserId && (
          <div className="flex gap-1">
            <button onClick={() => onRolDegistir(m.user_id, m.rol === 'moderator' ? 'member' : 'moderator')}
              className="text-[10px] font-bold text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50">
              {m.rol === 'moderator' ? 'Üyeye düşür' : 'Moderatör yap'}
            </button>
            <button onClick={() => onCikar(m.user_id)}
              className="text-[10px] font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded">
              Çıkar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjeKarti({ p, navigate }) {
  const dolu = (p.departments || []).reduce((s, d) => s + (d.dolu_sayisi || 0), 0);
  const gerek = (p.departments || []).reduce((s, d) => s + d.gereken_kisi, 0);
  return (
    <div onClick={() => navigate(`/projects/${p.id}`)}
      className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-base font-bold text-gray-900 line-clamp-1">{p.ad}</h4>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${DURUM_RENK[p.durum] || DURUM_RENK.acik}`}>
          {p.durum}
        </span>
      </div>
      {p.kisa_aciklama && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{p.kisa_aciklama}</p>}
      {p.departments?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
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
      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-50">
        <span className="font-semibold">{p.departments?.length || 0} departman</span>
        <span className="font-bold text-gray-700">{dolu}/{gerek} kişi</span>
      </div>
    </div>
  );
}

export default function GroupDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [g, setG] = useState(null);
  const [projects, setProjects] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tab, setTab] = useState('genel');
  const [joinMsg, setJoinMsg] = useState('');
  const [joinStatus, setJoinStatus] = useState(null);

  const fetchAll = async () => {
    try {
      const [gr, pr] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/groups/${id}/projects`),
      ]);
      setG(gr.data); setProjects(pr.data);
    } catch {}
  };
  useEffect(() => { fetchAll(); }, [id]);

  const benimUye = useMemo(() => g?.memberships?.find(m => m.user_id === user?.id), [g, user]);
  const yonetici = benimUye && ['owner', 'moderator'].includes(benimUye.rol);
  const isOwner = benimUye?.rol === 'owner';

  useEffect(() => {
    if (yonetici && tab === 'basvurular') {
      api.get(`/groups/${id}/requests`).then(r => setRequests(r.data)).catch(() => {});
    }
  }, [tab, yonetici, id]);

  const join = async () => {
    try {
      await api.post(`/groups/${id}/join`, { mesaj: joinMsg || null });
      setJoinStatus('✅ Başvurun gönderildi'); setJoinMsg('');
    } catch (e) {
      setJoinStatus(`❌ ${e.response?.data?.detail || 'Hata'}`);
    }
  };

  const karar = async (rid, durum) => {
    await api.put(`/groups/${id}/requests/${rid}`, { durum });
    setRequests(prev => prev.filter(r => r.id !== rid));
    if (durum === 'kabul') fetchAll();
  };

  const cikar = async (uid) => {
    if (!window.confirm('Üyeyi çıkarmak istediğine emin misin?')) return;
    await api.delete(`/groups/${id}/members/${uid}`);
    fetchAll();
  };

  const rolDegistir = async (uid, yeniRol) => {
    await api.put(`/groups/${id}/members/${uid}/role`, { rol: yeniRol });
    fetchAll();
  };

  const ayrıl = async () => {
    if (!window.confirm('Bu gruptan ayrılmak istediğine emin misin?')) return;
    await api.delete(`/groups/${id}/members/${user.id}`);
    navigate('/groups');
  };

  const sil = async () => {
    if (!window.confirm('Grubu silmek geri alınamaz. Emin misin?')) return;
    await api.delete(`/groups/${id}`);
    navigate('/groups');
  };

  if (!g) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <p className="text-sm text-gray-400">Yükleniyor…</p>
      </div>
    );
  }

  const tabs = [
    { k: 'genel',      l: 'Genel',                                                ikon: 'ℹ️' },
    { k: 'uyeler',     l: `Üyeler (${g.memberships?.length || 0})`,               ikon: '👥' },
    { k: 'projeler',   l: `Projeler (${projects.length})`,                        ikon: '🚀' },
    ...(yonetici ? [{ k: 'basvurular', l: 'Başvurular',                           ikon: '📨' }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans antialiased">

      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white text-base font-bold">G</div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-gray-900 leading-none truncate">{g.ad}</h1>
            <button onClick={() => navigate('/groups')}
              className="text-xs text-gray-400 font-medium hover:text-blue-600">
              ← Tüm projeler
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {benimUye && (
            <button onClick={() => navigate(`/groups/${id}/chat`)}
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-sm transition-all">
              💬 Sohbet
            </button>
          )}
          {!benimUye && g.acik && (
            <button onClick={join}
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-sm transition-all">
              + Katıl
            </button>
          )}
          {benimUye && !isOwner && (
            <button onClick={ayrıl}
              className="text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-2 rounded-xl">
              Ayrıl
            </button>
          )}
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* SOL ANA İÇERİK */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* HERO */}
          <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
              <h2 className="text-2xl font-extrabold text-gray-900">{g.ad}</h2>
              <div className="flex gap-2">
                {g.kategori && <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-semibold">{g.kategori}</span>}
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold
                  ${g.acik ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {g.acik ? '🟢 Yeni üye alıyor' : '🔒 Kapalı'}
                </span>
              </div>
            </div>
            {g.aciklama && <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{g.aciklama}</p>}
            <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-50">
              <span>👤 <span className="font-semibold text-gray-700">{g.owner?.ad} {g.owner?.soyad}</span></span>
              <span>📅 {new Date(g.created_at).toLocaleDateString('tr-TR')}</span>
            </div>
          </section>

          {/* SEKMELER */}
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
              {/* GENEL */}
              {tab === 'genel' && (
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Hakkında</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {g.aciklama || 'Açıklama yok.'}
                    </p>
                  </div>

                  {!benimUye && g.acik && (
                    <div className="mt-2 pt-4 border-t border-gray-100">
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">Katılma mesajı (opsiyonel)</label>
                      <textarea rows={3} value={joinMsg} onChange={e => setJoinMsg(e.target.value)}
                        placeholder="Kendini tanıt, neden katılmak istediğini yaz..."
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 resize-none" />
                      <button onClick={join}
                        className="mt-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-xl shadow-sm">
                        Başvur
                      </button>
                      {joinStatus && (
                        <p className={`text-xs mt-2 font-semibold ${joinStatus.startsWith('✅') ? 'text-emerald-600' : 'text-red-600'}`}>
                          {joinStatus}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ÜYELER */}
              {tab === 'uyeler' && (
                <div className="flex flex-col gap-2">
                  {g.memberships?.length === 0 ? (
                    <p className="text-sm text-gray-400">Henüz üye yok.</p>
                  ) : g.memberships.map(m => (
                    <UyeSatiri key={m.id} m={m}
                      yonetici={yonetici}
                      currentUserId={user?.id}
                      onCikar={cikar}
                      onRolDegistir={isOwner ? rolDegistir : () => {}} />
                  ))}
                </div>
              )}

              {/* PROJELER */}
              {tab === 'projeler' && (
                <div className="flex flex-col gap-4">
                  {yonetici && (
                    <button onClick={() => navigate(`/groups/${id}/projects/new`)}
                      className="self-start text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl shadow-sm">
                      + Proje Aç
                    </button>
                  )}
                  {projects.length === 0 ? (
                    <div className="text-center py-10">
                      <span className="text-5xl block mb-3">🚀</span>
                      <p className="text-sm text-gray-400">Henüz proje yok.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projects.map(p => <ProjeKarti key={p.id} p={p} navigate={navigate} />)}
                    </div>
                  )}
                </div>
              )}

              {/* BAŞVURULAR */}
              {tab === 'basvurular' && yonetici && (
                <div className="flex flex-col gap-2">
                  {requests.length === 0 ? (
                    <p className="text-sm text-gray-400">Bekleyen başvuru yok.</p>
                  ) : requests.map(r => (
                    <div key={r.id} className="p-4 border border-gray-100 rounded-xl flex items-center justify-between hover:bg-gray-50">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900">{r.user?.ad} {r.user?.soyad}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{r.user?.email}</p>
                        {r.mesaj && <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">"{r.mesaj}"</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0 ml-3">
                        <button onClick={() => karar(r.id, 'kabul')}
                          className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg">✓ Kabul</button>
                        <button onClick={() => karar(r.id, 'red')}
                          className="text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg">✕ Red</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SAĞ YAN PANEL */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-24 flex flex-col gap-4">

            {/* İstatistikler */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Özet</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  ['👥 Üye',     `${g.memberships?.length || 0}/${g.max_uye}`],
                  ['🚀 Proje',   projects.length],
                  ['📅 Açılış',  new Date(g.created_at).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' })],
                  ['🏷 Kategori', g.kategori || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 px-3 py-2 rounded-lg">
                    <p className="text-[10px] text-gray-500 font-semibold">{k}</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sahip kartı */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Grup Sahibi</h3>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  {(g.owner?.ad?.[0] || '?').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{g.owner?.ad} {g.owner?.soyad}</p>
                  <p className="text-xs text-gray-400 truncate">{g.owner?.email}</p>
                </div>
              </div>
            </div>

            {/* Owner için tehlikeli bölge */}
            {isOwner && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-2xl">
                <p className="text-[11px] font-bold text-red-700 mb-2">⚠ Tehlikeli Bölge</p>
                <button onClick={sil}
                  className="w-full text-xs font-bold text-white bg-red-600 hover:bg-red-700 py-2 rounded-lg shadow-sm">
                  Grubu Sil
                </button>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
