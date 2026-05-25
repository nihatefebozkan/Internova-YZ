// Proje oluşturma — sticky header, kategori chipleri, seviye chipleri,
// dinamik departman blokları, canlı önizleme yan panel
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const BOSH = {
  ad: '', kisa_aciklama: '', kategori: 'web', sure: '3 ay', seviye: 'orta',
  hedef: '', haftalik_saat: 10, github_var: true, pitch: '', gereksinimler: '',
};
const BOSH_DEP = { ad: '', gereken_kisi: 1, beklentiler: '', beceri_etiketleri: '' };

const KATEGORILER = [
  { k: 'web',    ad: 'Web',    ikon: '🌐' },
  { k: 'mobile', ad: 'Mobil',  ikon: '📱' },
  { k: 'ai',     ad: 'AI',     ikon: '🤖' },
  { k: 'oyun',   ad: 'Oyun',   ikon: '🎮' },
  { k: 'veri',   ad: 'Veri',   ikon: '📊' },
  { k: 'diger',  ad: 'Diğer',  ikon: '✨' },
];
const SURELER = ['1 ay', '3 ay', '6 ay', '1 yıl+'];
const SEVIYELER = [
  { k: 'baslangic', ad: 'Başlangıç', renk: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { k: 'orta',      ad: 'Orta',      renk: 'bg-amber-50 text-amber-700 border-amber-200' },
  { k: 'ileri',     ad: 'İleri',     renk: 'bg-red-50 text-red-700 border-red-200' },
];

export default function ProjectCreate() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(BOSH);
  const [departments, setDepartments] = useState([{ ...BOSH_DEP }]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const updateDep = (i, key, val) => setDepartments(prev =>
    prev.map((d, idx) => idx === i ? { ...d, [key]: val } : d));
  const addDep = () => setDepartments(prev => [...prev, { ...BOSH_DEP }]);
  const delDep = (i) => setDepartments(prev => prev.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const payload = {
        ...form,
        haftalik_saat: Number(form.haftalik_saat) || null,
        departments: departments
          .filter(d => d.ad.trim())
          .map(d => ({
            ad: d.ad.trim(),
            gereken_kisi: Number(d.gereken_kisi) || 1,
            beklentiler: d.beklentiler || null,
            beceri_etiketleri: d.beceri_etiketleri.split(',').map(s => s.trim()).filter(Boolean),
          })),
      };
      const r = await api.post(`/groups/${groupId}/projects`, payload);
      navigate(`/projects/${r.data.id}`);
    } catch (e) {
      setErr(e.response?.data?.detail || 'Bir hata oluştu');
    } finally { setBusy(false); }
  };

  const inp = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all";
  const aktif = form.ad.trim().length >= 3 && departments.some(d => d.ad.trim());
  const dolanDepartmanlar = departments.filter(d => d.ad.trim()).length;
  const toplamKisi = departments.reduce((s, d) => s + (Number(d.gereken_kisi) || 0), 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans antialiased">

      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white text-base font-bold">P</div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">Yeni Proje</h1>
            <span className="text-xs text-gray-400 font-medium">Detayları doldur, departmanları ekle</span>
          </div>
        </div>
        <button onClick={() => navigate(`/groups/${groupId}`)}
          className="text-xs font-bold text-gray-500 hover:text-gray-900 px-3 py-2 rounded-xl hover:bg-gray-50">
          ← Gruba dön
        </button>
      </header>

      <main className="max-w-[1280px] mx-auto p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* FORM */}
        <form onSubmit={submit} className="lg:col-span-2 flex flex-col gap-6">

          {/* TEMEL BİLGİLER */}
          <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
            <h2 className="text-base font-extrabold text-gray-900">Temel Bilgiler</h2>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Proje Adı <span className="text-red-500">*</span></label>
              <input required minLength={3} value={form.ad}
                onChange={e => set('ad', e.target.value)}
                placeholder="Örn: BTÜ Staj Yönetim Sistemi"
                className={inp} />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Kısa Açıklama</label>
              <textarea rows={2} value={form.kisa_aciklama}
                onChange={e => set('kisa_aciklama', e.target.value)}
                placeholder="2-3 cümleyle projeyi özetle…"
                className={`${inp} resize-none`} />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Pitch <span className="text-gray-400">(idea'yı 2-3 cümleyle anlat)</span></label>
              <textarea rows={3} value={form.pitch}
                onChange={e => set('pitch', e.target.value)}
                placeholder="Neden bu proje? Çözdüğü problem ne?"
                className={`${inp} resize-none`} />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Hedef / Amaç</label>
              <textarea rows={2} value={form.hedef}
                onChange={e => set('hedef', e.target.value)}
                placeholder="Bu projeyle ne başarmak istiyorsun?"
                className={`${inp} resize-none`} />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Başvuranlardan Beklentiler</label>
              <textarea rows={2} value={form.gereksinimler}
                onChange={e => set('gereksinimler', e.target.value)}
                placeholder="Genel önkoşullar (örn: temel Git bilgisi, haftada 10 saat zaman)"
                className={`${inp} resize-none`} />
            </div>
          </section>

          {/* KATEGORI + SEVIYE + DETAYLAR */}
          <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
            <h2 className="text-base font-extrabold text-gray-900">Proje Detayları</h2>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">Kategori</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {KATEGORILER.map(c => {
                  const sec = form.kategori === c.k;
                  return (
                    <button key={c.k} type="button" onClick={() => set('kategori', c.k)}
                      className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 transition-all
                        ${sec ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 hover:border-gray-300 text-gray-600'}`}>
                      <span className="text-lg">{c.ikon}</span>
                      <span className="text-[10px] font-bold">{c.ad}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">Seviye</label>
              <div className="flex gap-2">
                {SEVIYELER.map(s => {
                  const sec = form.seviye === s.k;
                  return (
                    <button key={s.k} type="button" onClick={() => set('seviye', s.k)}
                      className={`flex-1 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all
                        ${sec ? s.renk : 'border-gray-100 hover:border-gray-300 text-gray-600 bg-white'}`}>
                      {s.ad}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Süre</label>
                <select value={form.sure} onChange={e => set('sure', e.target.value)} className={inp}>
                  {SURELER.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Haftalık Saat</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={1} max={40} value={form.haftalik_saat}
                    onChange={e => set('haftalik_saat', e.target.value)}
                    className="flex-1 accent-blue-600" />
                  <span className="text-sm font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg min-w-[3rem] text-center">
                    {form.haftalik_saat}
                  </span>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={form.github_var}
                onChange={e => set('github_var', e.target.checked)}
                className="h-4 w-4 accent-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">🐙 GitHub repository kullanılacak</p>
                <p className="text-[11px] text-gray-400">Kod ortak repo üzerinde tutulacak</p>
              </div>
            </label>
          </section>

          {/* DEPARTMANLAR */}
          <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-gray-900">
                Departmanlar <span className="text-sm font-bold text-gray-500 ml-2">({dolanDepartmanlar})</span>
              </h2>
              <button type="button" onClick={addDep}
                className="text-xs font-bold text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all">
                + Departman ekle
              </button>
            </div>

            {departments.map((d, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3 relative bg-gray-50/40">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Departman #{i + 1}</span>
                  {departments.length > 1 && (
                    <button type="button" onClick={() => delDep(i)}
                      className="text-[11px] font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded">
                      ✕ Sil
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <input className={`${inp} col-span-2`}
                    placeholder="Backend, Frontend, UI/UX…" value={d.ad}
                    onChange={e => updateDep(i, 'ad', e.target.value)} />
                  <input type="number" min={1} max={20} placeholder="Kişi"
                    className={inp}
                    value={d.gereken_kisi} onChange={e => updateDep(i, 'gereken_kisi', e.target.value)} />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Aranan beceriler (virgülle)</label>
                  <input placeholder="react, typescript, tailwind"
                    className={inp}
                    value={d.beceri_etiketleri} onChange={e => updateDep(i, 'beceri_etiketleri', e.target.value)} />
                  {d.beceri_etiketleri && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {d.beceri_etiketleri.split(',').map(s => s.trim()).filter(Boolean).map(t => (
                        <span key={t} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <textarea rows={2} placeholder="Bu departmandan beklentiler"
                  className={`${inp} resize-none`}
                  value={d.beklentiler} onChange={e => updateDep(i, 'beklentiler', e.target.value)} />
              </div>
            ))}
          </section>

          {err && (
            <div className="bg-red-50 border border-red-200 px-4 py-3 rounded-xl text-sm text-red-700 font-semibold">
              ⚠️ {err}
            </div>
          )}

          <button disabled={busy || !aktif}
            className="w-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed py-3.5 rounded-xl shadow-sm transition-all">
            {busy ? 'Oluşturuluyor…' : '🚀 Projeyi Oluştur'}
          </button>
        </form>

        {/* ÖZET YAN PANELİ */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-24 flex flex-col gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Özet</h3>
              <div className="flex flex-col gap-2 text-xs">
                {[
                  ['Proje adı', form.ad || '—'],
                  ['Kategori', KATEGORILER.find(c => c.k === form.kategori)?.ad],
                  ['Seviye', SEVIYELER.find(s => s.k === form.seviye)?.ad],
                  ['Süre', form.sure],
                  ['Haftalık', `${form.haftalik_saat} saat`],
                  ['Departman', dolanDepartmanlar],
                  ['Toplam kişi', toplamKisi],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-bold text-gray-900 truncate ml-2 max-w-[60%] text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {!aktif && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                <p className="text-xs text-amber-700 font-semibold leading-relaxed">
                  💡 Proje adı en az 3 karakter olmalı ve en az bir departman tanımlanmalı.
                </p>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
