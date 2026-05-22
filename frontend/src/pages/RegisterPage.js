import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'student', bolum_kodu: '',
  });
  const [bolumler, setBolumler] = useState([]);
  const [error,    setError]   = useState('');
  const [loading,  setLoading] = useState(false);

  useEffect(() => {
    api.get('/career/bolumler').then(res => setBolumler(res.data)).catch(() => {});
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.role === 'student' && !formData.bolum_kodu) {
      setError('Lütfen bölümünüzü seçin.');
      return;
    }
    setLoading(true);
    try {
      const data = await register(formData);
      const ROLE_ROUTES = { student: '/student-dashboard', teacher: '/academic-dashboard', company: '/company-dashboard' };
      navigate(ROLE_ROUTES[data?.user?.role] || '/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Kayıt başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Kayıt Ol</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit}>
          <input type="text" name="name" placeholder="Ad Soyad"
            value={formData.name} onChange={handleChange} required />
          <input type="email" name="email" placeholder="E-posta"
            value={formData.email} onChange={handleChange} required />
          <input type="password" name="password" placeholder="Şifre (min 8 karakter, büyük harf, rakam)"
            value={formData.password} onChange={handleChange} required />

          <select name="role" value={formData.role} onChange={handleChange}>
            <option value="student">Öğrenci</option>
            <option value="company">Şirket</option>
          </select>

          {/* Bölüm seçimi — sadece öğrenci */}
          {formData.role === 'student' && (
            <select name="bolum_kodu" value={formData.bolum_kodu} onChange={handleChange} required>
              <option value="">— Bölümünüzü seçin * —</option>
              {bolumler.map(b => (
                <option key={b.kod} value={b.kod}>{b.ad}</option>
              ))}
            </select>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
          </button>
        </form>
        <p>Zaten hesabın var mı? <Link to="/login">Giriş Yap</Link></p>
      </div>
    </div>
  );
}

export default RegisterPage;
