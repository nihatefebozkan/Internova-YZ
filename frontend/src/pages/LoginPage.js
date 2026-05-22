import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_ROUTES = {
  student: '/student-dashboard',
  teacher: '/academic-dashboard',
  company: '/company-dashboard',
};

const TAB_ROLES = {
  ogrenci:  'student',
  sirket:   'company',
  akademik: 'teacher',
};

const TAB_PLACEHOLDERS = {
  ogrenci:  'ogrenci@btu.edu.tr',
  sirket:   'sirket@example.com',
  akademik: 'ogretmen@btu.edu.tr',
};

const TAB_ICONS = {
  ogrenci:  '🎓',
  sirket:   '🏢',
  akademik: '👨‍🏫',
};

const TAB_LABELS = {
  ogrenci:  'Öğrenci Girişi',
  sirket:   'Şirket Girişi',
  akademik: 'Akademisyen Girişi',
};

function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [activeTab, setActiveTab] = useState('ogrenci');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      const gercekRol   = data?.user?.role;
      const beklenenRol = TAB_ROLES[activeTab];

      // Seçilen sekme ile kullanıcının gerçek rolü uyuşmuyorsa hata ver
      if (gercekRol !== beklenenRol) {
        const ROL_ADI = { student: 'Öğrenci', company: 'Şirket', teacher: 'Akademisyen' };
        setError(`Bu hesap bir ${ROL_ADI[gercekRol]} hesabıdır. Lütfen "${ROL_ADI[gercekRol]}" sekmesinden giriş yapın.`);
        setLoading(false);
        return;
      }

      navigate(ROLE_ROUTES[gercekRol] || '/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Giriş başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-[#f9fafb] p-4 font-sans antialiased text-gray-900">
      <div className="w-full max-w-[440px] rounded-2xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col">

        {/* Logo ve Başlık */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white mb-3 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422A12.083 12.083 0 0121 12c0 3.866-4.03 7-9 7s-9-3.134-9-7a12.083 12.083 0 012.84-7.578L12 14z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">InternovaYZ</h2>
          <p className="text-sm text-gray-400 mt-0.5">Hesabınıza giriş yapın</p>
        </div>

        {/* Sekme Seçimi */}
        <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
          {['ogrenci', 'sirket', 'akademik'].map(tab => (
            <button key={tab} type="button" onClick={() => { setActiveTab(tab); setError(''); }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}>
              {tab === 'ogrenci' ? 'Öğrenci' : tab === 'sirket' ? 'Şirket' : 'Akademisyen'}
            </button>
          ))}
        </div>

        {/* Dinamik Rol Başlığı */}
        <div className="flex items-center gap-2 text-blue-600 font-semibold mb-4 text-sm">
          <span>{TAB_ICONS[activeTab]}</span>
          <span>{TAB_LABELS[activeTab]}</span>
        </div>

        {/* Hata Mesajı */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 font-medium">
            {error}
          </div>
        )}

        {/* Giriş Formu */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 mb-1.5">E-posta</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder={TAB_PLACEHOLDERS[activeTab]}
              className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:bg-white ring-1 ring-gray-200/60 focus:ring-2 focus:ring-blue-600 transition-all outline-none" />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 mb-1.5">Şifre</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:bg-white ring-1 ring-gray-200/60 focus:ring-2 focus:ring-blue-600 transition-all outline-none" />
          </div>

          <div className="flex gap-3 mt-3">
            <button type="submit" disabled={loading}
              className="flex-1 rounded-xl bg-gray-950 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
            <Link to="/register"
              className="flex-1 rounded-xl bg-white border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all text-center">
              Kaydol
            </Link>
          </div>
        </form>

      </div>
    </div>
  );
}

export default LoginPage;
