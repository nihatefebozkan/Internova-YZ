// Grup oluşturma — modern Tailwind, kategori chip seçimi, canlı önizleme
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const BOSH = { ad: '', aciklama: '', kategori: 'web', max_uye: 10, acik: true, kapak_url: '' };

const KATEGORILER = [
  { k: 'web',    ad: 'Web',          ikon: '🌐' },
  { k: 'mobile', ad: 'Mobil',        ikon: '📱' },
  { k: 'ai',    ad: 'Yapay Zeka',    ikon: '🤖' },
  { k: 'oyun',  ad: 'Oyun',          ikon: '🎮' },
  { k: 'veri',  ad: 'Veri Bilimi',  ikon: '📊' },
  { k: 'diger', ad: 'Diğer',         ikon: '✨' },
];

export default function GroupCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState(BOSH);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await api.post('/groups', { ...form, max_uye: Number(form.max_uye) });
      navigate(`/groups/${r.data.id}`);
    } catch (e) {
      setErr(e.response?.data?.detail || 'Bir hata oluştu');
    } finally { setBusy(false); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const aktif = form.ad.trim().length >= 3;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans antialiased">

      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white text-base font-bold">G</div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">Yeni Grup</h1>
            <span className="text-xs text-gray-400 font-medium">Bir takım kur, proje aç, üye al</span>
          </div>
        </div>
        <button onClick={() => navigate('/groups')}
          className="text-xs font-bold text-gray-500 hover:text-gray-900 px-3 py-2 rounded-xl hover:bg-gray-50">
          ← Geri
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* FORM */}
        <form onSubmit={submit} className="lg:col-span-2 flex flex-col gap-6">

          {/* Temel bilgiler */}
          <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
            <h2 className="text-base font-extrabold text-gray-900">Temel Bilgiler</h2>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Grup Adı <span className="text-red-500">*</span></label>
              <input required minLength={3} value={form.ad}
                onChange={e => set('ad', e.target.value)}
                placeholder="Örn: BTÜ Yapay Zeka Topluluğu"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
              <p className="text-[11px] text-gray-400 mt-1">En az 3 karakter</p>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Açıklama</label>
              <textarea value={form.aciklama} rows={4}
                onChange={e => set('aciklama', e.target.value)}
                placeholder="Grubun amacı, üyelerinden beklediğin şeyler, sıklığı..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none" />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Kapak Görseli URL (opsiyonel)</label>
              <input type="url" value={form.kapak_url}
                onChange={e => set('kapak_url', e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400" />
            </div>
          </section>

          {/* Kategori chip seçimi */}
          <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
            <h2 className="text-base font-extrabold text-gray-900">Kategori</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {KATEGORILER.map(c => {
                const sec = form.kategori === c.k;
                return (
                  <button key={c.k} type="button" onClick={() => set('kategori', c.k)}
                    className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all
                      ${sec ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 hover:border-gray-300 text-gray-600'}`}>
                    <span className="text-lg">{c.ikon}</span>
                    <span className="text-[10px] font-bold">{c.ad}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Ayarlar */}
          <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
            <h2 className="text-base font-extrabold text-gray-900">Ayarlar</h2>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Maksimum Üye Sayısı</label>
              <div className="flex items-center gap-3">
                <input type="range" min={2} max={50} value={form.max_uye}
                  onChange={e => set('max_uye', e.target.value)}
                  className="flex-1 accent-blue-600" />
                <span className="text-sm font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg min-w-[3rem] text-center">{form.max_uye}</span>
              </div>
            </div>

            <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={form.acik}
                onChange={e => set('acik', e.target.checked)}
                className="h-4 w-4 accent-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Yeni üye başvurularına açık</p>
                <p className="text-[11px] text-gray-400">Kapatırsan kimse katılma isteği yollayamaz</p>
              </div>
            </label>
          </section>

          {err && (
            <div className="bg-red-50 border border-red-200 px-4 py-3 rounded-xl text-sm text-red-700 font-semibold">
              ⚠️ {err}
            </div>
          )}

          <button disabled={busy || !aktif}
            className="w-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed py-3.5 rounded-xl shadow-sm transition-all">
            {busy ? 'Oluşturuluyor…' : '✨ Grubu Oluştur'}
          </button>
        </form>

        {/* CANLI ÖNİZLEME */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Önizleme</h3>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold text-gray-900 line-clamp-1">{form.ad || 'Grup adı'}</h3>
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {KATEGORILER.find(c => c.k === form.kategori)?.ikon} {KATEGORILER.find(c => c.k === form.kategori)?.ad}
                </span>
              </div>
              <p className="text-xs text-gray-500 line-clamp-3 min-h-[3rem]">
                {form.aciklama || 'Açıklama buraya gelir…'}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-50">
                <span>👤 Sen</span>
                <span className="font-semibold text-gray-600">1/{form.max_uye} üye</span>
              </div>
              {!form.acik && (
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full w-fit">
                  🔒 Yeni üye alımı kapalı
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-3 px-1">
              💡 Grubu kurduktan sonra üye davet edebilir ve proje açabilirsin.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
