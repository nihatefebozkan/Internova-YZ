// Staj Hazırlık merkezi — Hazırlık Skoru + Sektör Önerisi + Öneriler
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const SEVIYE_RENK = {
  hazir:      { bg: 'bg-emerald-50', fg: 'text-emerald-700', bar: 'bg-emerald-500', ring: 'stroke-emerald-500' },
  iyi_yolda:  { bg: 'bg-blue-50',    fg: 'text-blue-700',    bar: 'bg-blue-500',    ring: 'stroke-blue-500'    },
  gelisiyor:  { bg: 'bg-amber-50',   fg: 'text-amber-700',   bar: 'bg-amber-500',   ring: 'stroke-amber-500'   },
  baslangic:  { bg: 'bg-gray-100',   fg: 'text-gray-700',    bar: 'bg-gray-400',    ring: 'stroke-gray-400'    },
};

function CircleGauge({ value, color = 'stroke-blue-500' }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <svg viewBox="0 0 140 140" className="w-32 h-32 -rotate-90">
      <circle cx="70" cy="70" r={r} className="stroke-gray-100" strokeWidth="12" fill="none" />
      <circle cx="70" cy="70" r={r} className={color} strokeWidth="12" fill="none"
        strokeLinecap="round" strokeDasharray={`${dash} ${c}`} />
    </svg>
  );
}

export default function StajHazirlik() {
  const navigate = useNavigate();
  const [skor, setSkor] = useState(null);
  const [sektor, setSektor] = useState(null);
  const [skorLoading, setSkorLoading] = useState(true);
  const [sektorLoading, setSektorLoading] = useState(true);

  useEffect(() => {
    api.get('/staj/hazirlik-skoru')
      .then(r => setSkor(r.data)).catch(() => {}).finally(() => setSkorLoading(false));
    api.get('/staj/sektor-onerisi?ai_yorum=true')
      .then(r => setSektor(r.data)).catch(() => {}).finally(() => setSektorLoading(false));
  }, []);

  const renk = skor ? (SEVIYE_RENK[skor.seviye] || SEVIYE_RENK.baslangic) : SEVIYE_RENK.baslangic;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans antialiased">

      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white text-base font-bold">S</div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">Staj Hazırlık</h1>
            <span className="text-xs text-gray-400 font-medium">Skorunu gör, eksiklerini tamamla</span>
          </div>
        </div>
        <button onClick={() => navigate('/student-dashboard')}
          className="text-xs font-bold text-gray-500 hover:text-gray-900 px-3 py-2 rounded-xl hover:bg-gray-50">
          ← Dashboard
        </button>
      </header>

      <main className="max-w-[1280px] mx-auto p-6 lg:p-8 flex flex-col gap-6">

        {/* TOPLAM SKOR + ALT SKORLAR */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Sol: Big gauge */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hazırlık Skoru</h2>
            {skorLoading ? (
              <div className="w-32 h-32 rounded-full bg-gray-100 animate-pulse" />
            ) : skor ? (
              <>
                <div className="relative">
                  <CircleGauge value={skor.toplam_skor} color={renk.ring} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold text-gray-900">{skor.toplam_skor}</span>
                    <span className="text-[10px] text-gray-400 font-bold">/100</span>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${renk.bg} ${renk.fg}`}>
                  {skor.seviye === 'hazir' && '🎉 Hazır'}
                  {skor.seviye === 'iyi_yolda' && '🚀 İyi yoldasın'}
                  {skor.seviye === 'gelisiyor' && '🌱 Gelişiyor'}
                  {skor.seviye === 'baslangic' && '🌟 Başlangıç'}
                </span>
                <p className="text-xs text-gray-500 text-center leading-relaxed">{skor.mesaj}</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Skor yüklenemedi</p>
            )}
          </div>

          {/* Sağ: Alt skorlar */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-extrabold text-gray-900 mb-4">Alt Kategori Skorları</h3>
            {skorLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}
              </div>
            ) : skor ? (
              <div className="space-y-3">
                {skor.alt_skorlar.map(a => {
                  const yuzde = Math.round((a.skor / a.max) * 100);
                  const tam = a.skor === a.max;
                  return (
                    <div key={a.kategori} className="flex items-center gap-3">
                      <span className="text-xl flex-shrink-0">{a.ikon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-gray-900">{a.kategori}</span>
                          <span className={`font-bold ${tam ? 'text-emerald-600' : 'text-gray-700'}`}>
                            {a.skor}/{a.max}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${tam ? 'bg-emerald-500' : 'bg-blue-500'}`}
                            style={{ width: `${yuzde}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </section>

        {/* ÖNERİLER + SEKTÖR */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Öneriler — 2 col */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-gray-900">💡 Gelişim Önerileri</h3>
              {skor && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {skor.oneriler?.length || 0} öneri
                </span>
              )}
            </div>
            {skorLoading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}</div>
            ) : !skor?.oneriler?.length ? (
              <div className="text-center py-8">
                <span className="text-4xl block mb-2">🎉</span>
                <p className="text-sm text-gray-600 font-bold">Tüm kategorilerde tam puan!</p>
                <p className="text-xs text-gray-400 mt-1">Profili güncel tutmaya devam et.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {skor.oneriler.map((o, i) => (
                  <button key={i}
                    onClick={() => o.yol && navigate(o.yol)}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left group">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-xs font-semibold text-gray-800 truncate">{o.baslik}</span>
                    </div>
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full whitespace-nowrap group-hover:bg-blue-100">
                      +{o.puan} puan
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sektör — 1 col */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-extrabold text-gray-900 mb-3">🎯 Sana Uygun Sektörler</h3>
            {sektorLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}</div>
            ) : !sektor?.yeterli_veri ? (
              <div className="text-center py-6">
                <p className="text-xs text-gray-500 mb-3">{sektor?.mesaj || 'Veri yetersiz'}</p>
                <button onClick={() => navigate('/profile')}
                  className="text-xs font-bold text-white bg-blue-600 px-4 py-2 rounded-xl">
                  Proje Ekle
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {sektor.sektor_onerileri?.map((s, i) => (
                    <div key={s.kod} className="p-3 rounded-xl border border-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-900">{s.ikon} {s.ad}</span>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">%{s.uyum}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.uyum}%` }} />
                      </div>
                      {i === 0 && s.sonraki_adimlar?.[0] && (
                        <p className="text-[10px] text-gray-500 mt-2 italic">💡 {s.sonraki_adimlar[0]}</p>
                      )}
                    </div>
                  ))}
                </div>
                {sektor.ai_yorum && (
                  <div className="mt-4 p-3 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-xl">
                    <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">✨ AI Yorumu</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{sektor.ai_yorum}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Profil dağılımı (alt bar) */}
        {sektor?.kullanici_profili && (
          <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-extrabold text-gray-900 mb-3">📊 Alan Profilin</h3>
            <p className="text-xs text-gray-500 mb-4">Tüm projelerinden gelen ortalama beceri dağılımı</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(sektor.kullanici_profili).map(([kat, deg]) => {
                const en_guclu = sektor.en_guclu_alan === kat;
                const en_zayif = sektor.en_zayif_alan === kat;
                return (
                  <div key={kat} className={`p-3 rounded-xl border ${en_guclu ? 'border-emerald-200 bg-emerald-50' : en_zayif ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{kat}</p>
                    <p className={`text-2xl font-extrabold ${en_guclu ? 'text-emerald-700' : en_zayif ? 'text-amber-700' : 'text-gray-900'}`}>
                      {deg}
                    </p>
                    {en_guclu && <span className="text-[9px] font-bold text-emerald-600">EN GÜÇLÜ</span>}
                    {en_zayif && <span className="text-[9px] font-bold text-amber-600">EN ZAYIF</span>}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
