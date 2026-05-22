import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const DURUM_RENK = {
  bekleyen: 'bg-amber-50 text-amber-600 border-amber-200',
  kabul:    'bg-emerald-50 text-emerald-600 border-emerald-200',
  red:      'bg-red-50 text-red-600 border-red-200',
};
const DURUM_LABEL = { bekleyen: 'İnceleniyor', kabul: 'Kabul', red: 'Reddedildi' };

function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [isExpanded,   setIsExpanded]   = useState(false);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    api.get('/applications/me').then(res => setApplications(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const visible = isExpanded ? applications : applications.slice(0, 2);
  const ad = [user?.ad, user?.soyad].filter(Boolean).join(' ');

  const toplam   = applications.length;
  const bekleyen = applications.filter(a => a.durum === 'bekleyen').length;
  const kabul    = applications.filter(a => a.durum === 'kabul').length;

  // Hızlı işlemler — boş kalacaklar disabled
  const hizliIslemler = [
    { text: 'Staj İlanlarını İncele', icon: '🔍', route: '/internships' },
    { text: 'Günlük Rapor Ekle',      icon: '📄', route: '/internship-book' },
    { text: "CV'mi Düzenle",          icon: '📝', route: '/profile' },
    { text: 'Hedef Şirket Yol Haritası', icon: '🎯', route: '/career-map' },
    { text: 'Takım Bul',              icon: '👥', route: '/team-matcher' },
    { text: 'Kariyer Asistanı',       icon: '🤖', route: '/career-assistant' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans antialiased">

      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white text-base font-bold">İ</div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">InternovaYZ</h1>
            <span className="text-xs text-gray-400 font-medium">Öğrenci Paneli</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <button onClick={() => navigate('/badges')} className="p-2 hover:bg-gray-50 rounded-full transition-all cursor-pointer" title="Rozetler">🏅</button>
          <button onClick={() => navigate('/profile')} className="p-2 hover:bg-gray-50 rounded-full transition-all cursor-pointer" title="Profil">👤</button>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto p-6 lg:p-8 flex flex-col gap-8">

        {/* Karşılama */}
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Hoş Geldin, {ad || user?.email}!</h2>
          <p className="text-sm text-gray-500 mt-1">Staj başvurularını ve ilerlemeni buradan takip edebilirsin</p>
        </div>

        {/* İSTATİSTİK KARTLARI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Toplam Başvuru',  value: toplam,   alt: 'Tüm zamanlar',       icon: '📁', bg: 'bg-gray-50' },
            { label: 'Bekleyen',        value: bekleyen, alt: 'İnceleme aşamasında', icon: '⏳', bg: 'bg-amber-50' },
            { label: 'Kabul',           value: kabul,    alt: 'Onaylandı',           icon: '✅', bg: 'bg-emerald-50' },
            { label: 'Günlük Raporlar', value: '—',      alt: 'Staj defterinden',    icon: '📄', bg: 'bg-blue-50' },
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

        {/* ALT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* SON BAŞVURULAR */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Son Başvurular</h3>
                <p className="text-xs text-gray-400 mt-0.5">Yaptığın başvuruların durumu</p>
              </div>
              <span className="text-[11px] text-gray-400 font-semibold bg-gray-50 px-2.5 py-1 rounded-lg">
                Toplam {toplam} Başvuru
              </span>
            </div>

            {loading ? (
              <p className="text-xs text-gray-400 py-4 text-center">Yükleniyor...</p>
            ) : applications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400 mb-3">Henüz başvuru yapmadınız.</p>
                <button onClick={() => navigate('/internships')} className="text-xs font-bold text-blue-600 border border-blue-100 px-4 py-2 rounded-xl hover:bg-blue-50 transition-all">İlanları Keşfet →</button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 mt-2">
                  {visible.map(app => (
                    <div key={app.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition-all">
                      <div className="flex items-center gap-4">
                        <span className="text-xl p-2.5 bg-blue-50 text-blue-600 rounded-xl">💼</span>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">{app.internship?.pozisyon || 'Staj'}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            <span>{app.internship?.company?.ad || '—'}</span>
                            {app.basvuru_tarihi && <><span>•</span><span>{new Date(app.basvuru_tarihi).toLocaleDateString('tr-TR')}</span></>}
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${DURUM_RENK[app.durum] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                        {DURUM_LABEL[app.durum] || app.durum}
                      </span>
                    </div>
                  ))}
                </div>
                {applications.length > 2 && (
                  <button onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full text-center py-2.5 text-xs font-bold text-gray-500 hover:text-gray-900 border border-gray-100 rounded-xl mt-2 hover:bg-gray-50 transition-all cursor-pointer">
                    {isExpanded ? '▲ Gizle' : `▼ Tüm Başvuruları Gör (${applications.length - 2} gizli)`}
                  </button>
                )}
              </>
            )}
          </div>

          {/* SAĞ PANEL */}
          <div className="flex flex-col gap-6">

            {/* Hızlı İşlemler */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
              <h3 className="text-base font-bold text-gray-900">Hızlı İşlemler</h3>
              <div className="flex flex-col gap-1.5 mt-1">
                {hizliIslemler.map((item, idx) => (
                  <button key={idx}
                    onClick={() => item.route && navigate(item.route)}
                    disabled={!item.route}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-xs font-semibold transition-all
                      ${item.route
                        ? 'border-gray-100/70 text-gray-700 hover:bg-gray-50 hover:border-gray-200 cursor-pointer'
                        : 'border-gray-100/40 text-gray-300 cursor-not-allowed'}`}>
                    <span className="text-sm">{item.icon}</span>
                    {item.text}
                    {!item.route && <span className="ml-auto text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Yakında</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Profil Özeti */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Profilim</h3>
              <div className="flex flex-col gap-2 text-xs text-gray-500">
                <div className="flex justify-between"><span>Bölüm</span><span className="font-semibold text-gray-800">{user?.bolum || '—'}</span></div>
                <div className="flex justify-between"><span>Öğrenci No</span><span className="font-semibold text-gray-800">{user?.ogrenci_no || '—'}</span></div>
                <div className="flex justify-between"><span>E-posta</span><span className="font-semibold text-gray-800 truncate ml-2">{user?.email}</span></div>
              </div>
              <button onClick={() => navigate('/profile')} className="w-full text-center py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-bold mt-1 transition-all border border-gray-100">
                Profili Düzenle
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;
