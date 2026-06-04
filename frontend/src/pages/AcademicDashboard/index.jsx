// Akademisyen Paneli — Onay kuyruğu + Onaylanmış evraklar + istatistikler (Faz 3 #14)
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const TIP_AD = {
  kabul_mektubu: 'Kabul Mektubu', sigorta_bilgisi: 'Sigorta',
  is_yeri_degerlendirme: 'İş Yeri Değerlendirme',
  ogrenci_degerlendirme: 'Öğrenci Değerlendirme',
  staj_defteri: 'Staj Defteri', diger: 'Diğer',
};

const TIP_RENK = {
  kabul_mektubu: 'bg-blue-50 text-blue-700',
  sigorta_bilgisi: 'bg-purple-50 text-purple-700',
  is_yeri_degerlendirme: 'bg-emerald-50 text-emerald-700',
  ogrenci_degerlendirme: 'bg-amber-50 text-amber-700',
  staj_defteri: 'bg-indigo-50 text-indigo-700',
  diger: 'bg-gray-100 text-gray-700',
};

function EvrakKarti({ e, onKarar, busy }) {
  const [acik, setAcik] = useState(false);
  const [not_, setNot] = useState('');
  const [karar, setKarar] = useState(null);

  const onayla = () => {
    setKarar('onayli'); setAcik(true);
  };
  const reddet = () => {
    setKarar('red'); setAcik(true);
  };
  const gonder = () => {
    onKarar(e.id, karar, not_);
    setAcik(false); setNot(''); setKarar(null);
  };

  const dosyaUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:8002'}${e.dosya_url}`;

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
      {/* Üst — kim + tip + tarih */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">
            {(e.ogrenci_ad?.[0] || '?').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{e.ogrenci_ad}</p>
            <p className="text-xs text-gray-400 truncate">{e.ogrenci_bolum || '—'}</p>
            <p className="text-[11px] text-gray-500 mt-1 truncate">
              💼 {e.pozisyon} {e.sirket_adi && `· ${e.sirket_adi}`}
            </p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${TIP_RENK[e.tip] || TIP_RENK.diger} whitespace-nowrap`}>
          {TIP_AD[e.tip] || e.tip}
        </span>
      </div>

      {/* Orta — evrak adı + dosya */}
      <div className="bg-gray-50 p-3 rounded-xl flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">{e.ad}</p>
          <p className="text-[11px] text-gray-500 truncate">📎 {e.dosya_adi}</p>
        </div>
        <a href={dosyaUrl} target="_blank" rel="noreferrer"
          className="text-xs font-bold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 whitespace-nowrap">
          ↗ Görüntüle
        </a>
      </div>

      <p className="text-[10px] text-gray-400">
        📅 Yüklendi: {new Date(e.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
      </p>

      {/* Karar UI */}
      {acik ? (
        <div className={`p-3 rounded-xl border ${karar === 'onayli' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-xs font-bold mb-2 ${karar === 'onayli' ? 'text-emerald-800' : 'text-red-800'}`}>
            {karar === 'onayli' ? '✓ Onaylama Notu' : '✕ Reddetme Sebebi'} {karar === 'red' && <span className="text-red-600">*</span>}
          </p>
          <textarea rows={2} value={not_} onChange={e => setNot(e.target.value)}
            placeholder={karar === 'onayli' ? 'Opsiyonel not...' : 'Neden reddettiğini yaz...'}
            className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-blue-400" />
          <div className="flex gap-2 mt-2">
            <button onClick={() => { setAcik(false); setNot(''); setKarar(null); }}
              className="flex-1 text-xs font-bold text-gray-600 hover:bg-gray-50 py-2 rounded-lg">İptal</button>
            <button onClick={gonder} disabled={busy || (karar === 'red' && !not_.trim())}
              className={`flex-1 text-xs font-bold text-white py-2 rounded-lg disabled:bg-gray-300
                ${karar === 'onayli' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {busy ? '⏳' : karar === 'onayli' ? '✓ Onayla' : '✕ Reddet'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={reddet}
            className="flex-1 text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 py-2 rounded-lg">
            ✕ Reddet
          </button>
          <button onClick={onayla}
            className="flex-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 py-2 rounded-lg shadow-sm">
            ✓ Onayla
          </button>
        </div>
      )}
    </div>
  );
}

export default function AcademicDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bekleyen, setBekleyen] = useState([]);
  const [tum, setTum] = useState([]);
  const [tab, setTab] = useState('bekleyen');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const yukle = () => {
    setLoading(true);
    Promise.all([
      api.get('/staj/evrak/onay-kuyrugu').catch(() => ({ data: [] })),
      api.get('/staj/evrak/akademisyen/tumu').catch(() => ({ data: [] })),
    ]).then(([b, t]) => {
      setBekleyen(b.data);
      setTum(t.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { yukle(); }, []);

  const karar = async (id, durum, onay_notu) => {
    setBusy(true);
    try {
      await api.put(`/staj/evrak/${id}/onay`, { durum, onay_notu });
      setMsg(`✅ Evrak ${durum === 'onayli' ? 'onaylandı' : 'reddedildi'}`);
      setTimeout(() => setMsg(''), 4000);
      yukle();
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.detail || 'İşlem başarısız'));
    } finally {
      setBusy(false);
    }
  };

  const stats = useMemo(() => ({
    bekleyen: tum.filter(e => e.durum === 'bekleyen').length,
    onayli:   tum.filter(e => e.durum === 'onayli').length,
    red:      tum.filter(e => e.durum === 'red').length,
    toplam:   tum.length,
  }), [tum]);

  const gosterilen = tab === 'bekleyen' ? bekleyen : tum.filter(e => e.durum === tab);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans antialiased">

      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white text-base font-bold">A</div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-gray-900 leading-none truncate">{user?.ad} {user?.soyad}</h1>
            <span className="text-xs text-gray-400 font-medium">Akademisyen Paneli</span>
          </div>
        </div>
        <button onClick={() => navigate('/profile')}
          className="text-xs font-bold text-gray-500 hover:text-gray-900 px-3 py-2 rounded-xl hover:bg-gray-50">
          👤 Profil
        </button>
      </header>

      <main className="max-w-[1280px] mx-auto p-6 lg:p-8 flex flex-col gap-6">

        {msg && (
          <div className={`p-3 rounded-xl text-sm font-semibold ${
            msg.startsWith('❌') ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>{msg}</div>
        )}

        {/* Karşılama */}
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Hoş Geldin, {user?.ad}!</h2>
          <p className="text-sm text-gray-500 mt-1">Öğrencilerinin staj evraklarını buradan inceleyip onaylayabilirsin.</p>
        </div>

        {/* İstatistik kartları */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Bekleyen', value: stats.bekleyen, alt: 'Karar verilmemiş', icon: '⏳', bg: 'bg-amber-50' },
            { label: 'Onaylı',   value: stats.onayli,   alt: 'Geçen evraklar', icon: '✓',  bg: 'bg-emerald-50' },
            { label: 'Reddedildi', value: stats.red,    alt: 'Eksik/hatalı',   icon: '✕',  bg: 'bg-red-50' },
            { label: 'Toplam',   value: stats.toplam,   alt: 'Sistem içi',     icon: '📁', bg: 'bg-gray-50' },
          ].map(s => (
            <div key={s.label} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-400 block mb-3">{s.label}</span>
                <span className="text-3xl font-bold text-gray-900 block">{loading ? '…' : s.value}</span>
                <span className="text-xs text-gray-400 mt-1 block">{s.alt}</span>
              </div>
              <span className={`text-xl p-2 ${s.bg} rounded-xl`}>{s.icon}</span>
            </div>
          ))}
        </div>

        {/* Tab seçici */}
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex gap-1 self-start">
          {[
            { k: 'bekleyen', l: `⏳ Onay Kuyruğu (${stats.bekleyen})` },
            { k: 'onayli',   l: `✓ Onaylı (${stats.onayli})` },
            { k: 'red',      l: `✕ Reddedilen (${stats.red})` },
          ].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all
                ${tab === t.k ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
              {t.l}
            </button>
          ))}
        </div>

        {/* Evrak listesi */}
        {loading ? (
          <p className="text-sm text-gray-400">Yükleniyor…</p>
        ) : gosterilen.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center">
            <span className="text-5xl block mb-3">{tab === 'bekleyen' ? '🎉' : '📭'}</span>
            <p className="text-sm text-gray-500">
              {tab === 'bekleyen'
                ? 'Onay bekleyen evrak yok. İyi iş! 🎯'
                : tab === 'onayli' ? 'Henüz onaylanmış evrak yok.'
                : 'Reddedilmiş evrak yok.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gosterilen.map(e => (
              <EvrakKarti key={e.id} e={e} onKarar={karar} busy={busy} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
