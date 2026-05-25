// Proje detayı — sticky header + hero + departman kartları + yan panel
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const DURUM_BADGE = {
  acik:        { ad: 'Açık',         bg: 'bg-emerald-50',  fg: 'text-emerald-700',  border: 'border-emerald-200' },
  devam:       { ad: 'Devam ediyor', bg: 'bg-amber-50',    fg: 'text-amber-700',    border: 'border-amber-200' },
  tamamlandi:  { ad: 'Tamamlandı',   bg: 'bg-gray-100',    fg: 'text-gray-600',     border: 'border-gray-200' },
};

const SEVIYE_RENK = {
  baslangic: 'bg-emerald-50 text-emerald-700',
  orta:      'bg-amber-50 text-amber-700',
  ileri:     'bg-red-50 text-red-700',
};

function DepartmanKarti({ d, projeAcik, projeOwner, yonetici, currentUserId, onBasvur, basvuruDurum, basvuruText, setBasvuruText }) {
  const dolu = d.dolu_sayisi >= d.gereken_kisi;
  const yuzde = d.gereken_kisi > 0 ? Math.round((d.dolu_sayisi / d.gereken_kisi) * 100) : 0;
  const aktif = projeAcik && projeOwner !== currentUserId && !yonetici;

  return (
    <div className={`bg-white p-5 rounded-2xl border shadow-sm transition-all
      ${dolu ? 'border-gray-100' : 'border-gray-100 hover:border-blue-200 hover:shadow-md'}`}>
      {/* Başlık + doluluk */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-base font-bold text-gray-900">{d.ad}</h3>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap
          ${dolu ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-700'}`}>
          {d.dolu_sayisi}/{d.gereken_kisi} kişi
        </span>
      </div>

      {/* Doluluk barı */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all ${dolu ? 'bg-gray-300' : 'bg-blue-500'}`}
          style={{ width: `${Math.min(yuzde, 100)}%` }} />
      </div>

      {/* Beceri etiketleri */}
      {d.beceri_etiketleri?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {d.beceri_etiketleri.map((t, i) => (
            <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-semibold">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Beklentiler */}
      {d.beklentiler && (
        <p className="text-xs text-gray-500 leading-relaxed mb-3 whitespace-pre-wrap">{d.beklentiler}</p>
      )}

      {/* Başvuru CTA */}
      {aktif && (
        <div className="pt-3 border-t border-gray-50">
          {basvuruDurum ? (
            <p className="text-xs text-center font-bold py-2.5">
              {basvuruDurum}
            </p>
          ) : dolu ? (
            <p className="text-xs text-gray-400 text-center py-2">Bu departman dolu</p>
          ) : (
            <>
              <textarea rows={2} placeholder="Neden bu departmana başvuruyorsun? (opsiyonel)"
                value={basvuruText || ''}
                onChange={e => setBasvuruText(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg mb-2 focus:outline-none focus:border-blue-400 resize-none" />
              <button onClick={onBasvur}
                className="w-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 py-2.5 rounded-lg transition-all shadow-sm">
                ✋ Başvur
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [p, setP] = useState(null);
  const [g, setG] = useState(null);
  const [apps, setApps] = useState([]);
  const [basvuruText, setBasvuruText] = useState({});
  const [basvuruDurum, setBasvuruDurum] = useState({});

  const fetchProject = async () => {
    try {
      const r = await api.get(`/projects/${id}`);
      setP(r.data);
      const gr = await api.get(`/groups/${r.data.group_id}`);
      setG(gr.data);
    } catch {}
  };
  useEffect(() => { fetchProject(); }, [id]);

  const benimUye = g?.memberships?.find(m => m.user_id === user?.id);
  const yonetici = benimUye && ['owner', 'moderator'].includes(benimUye.rol);

  useEffect(() => {
    if (yonetici) {
      api.get(`/projects/${id}/applications?durum=bekleyen`).then(r => setApps(r.data)).catch(() => {});
    }
  }, [yonetici, id]);

  const basvur = async (depId) => {
    try {
      await api.post(`/departments/${depId}/apply`, { mesaj: basvuruText[depId] || null });
      setBasvuruDurum(prev => ({ ...prev, [depId]: '✅ Başvurun gönderildi' }));
    } catch (e) {
      setBasvuruDurum(prev => ({ ...prev, [depId]: `❌ ${e.response?.data?.detail || 'Hata'}` }));
    }
  };

  const karar = async (depId, appId, durum) => {
    await api.put(`/departments/${depId}/applications/${appId}`, { durum });
    setApps(prev => prev.filter(a => a.id !== appId));
    fetchProject();
  };

  if (!p) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <p className="text-sm text-gray-400">Yükleniyor…</p>
      </div>
    );
  }

  const durum = DURUM_BADGE[p.durum] || DURUM_BADGE.acik;
  const toplamGerek = (p.departments || []).reduce((s, d) => s + d.gereken_kisi, 0);
  const toplamDolu  = (p.departments || []).reduce((s, d) => s + (d.dolu_sayisi || 0), 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans antialiased">

      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white text-base font-bold">P</div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-gray-900 leading-none truncate">{p.ad}</h1>
            <button onClick={() => navigate(`/groups/${p.group_id}`)}
              className="text-xs text-gray-400 font-medium hover:text-blue-600 truncate">
              ← {g?.ad || 'Grup'}
            </button>
          </div>
        </div>
        <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${durum.bg} ${durum.fg} ${durum.border}`}>
          {durum.ad}
        </span>
      </header>

      <main className="max-w-[1280px] mx-auto p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* SOL — Proje detayları + departmanlar */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* HERO */}
          <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{p.ad}</h2>
            {p.kisa_aciklama && <p className="text-sm text-gray-600 mb-4">{p.kisa_aciklama}</p>}

            <div className="flex flex-wrap gap-2">
              {p.kategori && <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-semibold">{p.kategori}</span>}
              {p.sure && <span className="text-xs bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full font-semibold">⏱ {p.sure}</span>}
              {p.seviye && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${SEVIYE_RENK[p.seviye] || 'bg-gray-50 text-gray-600'}`}>
                  📊 {p.seviye}
                </span>
              )}
              {p.haftalik_saat && <span className="text-xs bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full font-semibold">⌛ {p.haftalik_saat} sa/hafta</span>}
              {p.github_var && <span className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full font-semibold">🐙 GitHub</span>}
            </div>
          </section>

          {/* Pitch */}
          {p.pitch && (
            <section className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-2xl border border-blue-100">
              <h3 className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2">💡 Pitch</h3>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{p.pitch}</p>
            </section>
          )}

          {/* Hedef */}
          {p.hedef && (
            <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">🎯 Hedef</h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{p.hedef}</p>
            </section>
          )}

          {/* Gereksinimler */}
          {p.gereksinimler && (
            <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">📋 Gereksinimler</h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{p.gereksinimler}</p>
            </section>
          )}

          {/* Departmanlar */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-extrabold text-gray-900">Departmanlar</h2>
              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {toplamDolu}/{toplamGerek} doldu
              </span>
            </div>
            {p.departments?.length === 0 ? (
              <p className="text-sm text-gray-400 bg-white p-6 rounded-2xl border border-gray-100">
                Departman tanımlı değil.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {p.departments?.map(d => (
                  <DepartmanKarti key={d.id} d={d}
                    projeAcik={p.durum === 'acik'}
                    projeOwner={p.owner_id}
                    yonetici={yonetici}
                    currentUserId={user?.id}
                    onBasvur={() => basvur(d.id)}
                    basvuruDurum={basvuruDurum[d.id]}
                    basvuruText={basvuruText[d.id]}
                    setBasvuruText={(v) => setBasvuruText(prev => ({ ...prev, [d.id]: v }))} />
                ))}
              </div>
            )}
          </section>

          {/* Yönetici - bekleyen başvurular */}
          {yonetici && apps.length > 0 && (
            <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-base font-extrabold text-gray-900 mb-3">
                Bekleyen Başvurular <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ml-1">{apps.length}</span>
              </h2>
              <div className="flex flex-col gap-2">
                {apps.map(a => {
                  const dep = p.departments.find(d => d.id === a.department_id);
                  return (
                    <div key={a.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900">{a.applicant?.ad} {a.applicant?.soyad}</p>
                        <p className="text-xs text-gray-500">→ <span className="font-semibold">{dep?.ad}</span></p>
                        {a.mesaj && <p className="text-xs text-gray-400 mt-1 italic line-clamp-2">"{a.mesaj}"</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0 ml-3">
                        <button onClick={() => karar(a.department_id, a.id, 'kabul')}
                          className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg">✓ Kabul</button>
                        <button onClick={() => karar(a.department_id, a.id, 'red')}
                          className="text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg">✕ Red</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* SAĞ — Yan panel */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-24 flex flex-col gap-4">

            {/* Grup özet kartı */}
            {g && (
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Grup</h3>
                <button onClick={() => navigate(`/groups/${g.id}`)}
                  className="text-sm font-bold text-gray-900 hover:text-blue-600 text-left">
                  {g.ad}
                </button>
                {g.aciklama && <p className="text-xs text-gray-500 line-clamp-3">{g.aciklama}</p>}
                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-50">
                  <span>👤 {g.owner?.ad} {g.owner?.soyad}</span>
                  <span className="font-semibold text-gray-600">{g.uye_sayisi || g.memberships?.length}/{g.max_uye}</span>
                </div>
                {benimUye && (
                  <button onClick={() => navigate(`/groups/${g.id}/chat`)}
                    className="w-full text-xs font-bold text-blue-600 border border-blue-200 hover:bg-blue-50 py-2 rounded-xl">
                    💬 Grup Sohbetine Git
                  </button>
                )}
              </div>
            )}

            {/* Hızlı istatistik */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Özet</h3>
              <div className="flex flex-col gap-2 text-xs">
                {[
                  ['Toplam Pozisyon', toplamGerek],
                  ['Dolu', toplamDolu],
                  ['Açık Pozisyon', Math.max(0, toplamGerek - toplamDolu)],
                  ['Departman Sayısı', p.departments?.length || 0],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-bold text-gray-900">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bilgilendirme */}
            {!benimUye && p.durum === 'acik' && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                <p className="text-xs text-amber-700 font-semibold leading-relaxed">
                  💡 Bir departmana başvurun kabul edilirse otomatik olarak gruba üye olursunuz.
                </p>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
