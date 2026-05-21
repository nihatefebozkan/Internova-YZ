import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ ad: '', soyad: '', bolum: '', ogrenci_no: '', telefon: '' });
  const [cv, setCv] = useState({ ozet: '', beceriler: '' });
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('profil'); // 'profil' | 'cv'

  useEffect(() => {
    if (user) {
      setForm({
        ad: user.ad || '',
        soyad: user.soyad || '',
        bolum: user.bolum || '',
        ogrenci_no: user.ogrenci_no || '',
        telefon: user.telefon || '',
      });
    }
    if (user?.role === 'student') {
      api.get('/cv/me')
        .then(res => setCv({
          ozet: res.data.ozet || '',
          beceriler: (res.data.beceriler || []).join(', '),
        }))
        .catch(() => {});
    }
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/users/${user.id}`, form);
      setMsg('Profil güncellendi!');
    } catch {
      setMsg('Güncelleme başarısız.');
    }
  };

  const saveCv = async (e) => {
    e.preventDefault();
    try {
      await api.put('/cv/me', {
        ozet: cv.ozet,
        beceriler: cv.beceriler.split(',').map(s => s.trim()).filter(Boolean),
      });
      setMsg('CV güncellendi!');
    } catch {
      setMsg('CV güncellenemedi.');
    }
  };

  return (
    <div className="profile-page">
      <h2>Profilim</h2>

      <div className="tab-buttons">
        <button className={tab === 'profil' ? 'tab active' : 'tab'} onClick={() => setTab('profil')}>
          Kişisel Bilgiler
        </button>
        {user?.role === 'student' && (
          <button className={tab === 'cv' ? 'tab active' : 'tab'} onClick={() => setTab('cv')}>
            CV
          </button>
        )}
      </div>

      {msg && <p className="info-msg">{msg}</p>}

      {tab === 'profil' && (
        <form className="profile-form" onSubmit={saveProfile}>
          <label>Ad
            <input value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))} required />
          </label>
          <label>Soyad
            <input value={form.soyad} onChange={e => setForm(f => ({ ...f, soyad: e.target.value }))} required />
          </label>
          {user?.role === 'student' && (
            <>
              <label>Bölüm
                <input value={form.bolum} onChange={e => setForm(f => ({ ...f, bolum: e.target.value }))} />
              </label>
              <label>Öğrenci No
                <input value={form.ogrenci_no} onChange={e => setForm(f => ({ ...f, ogrenci_no: e.target.value }))} />
              </label>
            </>
          )}
          <label>Telefon
            <input value={form.telefon} onChange={e => setForm(f => ({ ...f, telefon: e.target.value }))} />
          </label>
          <button type="submit" className="btn-primary">Kaydet</button>
        </form>
      )}

      {tab === 'cv' && user?.role === 'student' && (
        <form className="cv-form" onSubmit={saveCv}>
          <label>Özet
            <textarea rows={4} value={cv.ozet}
              onChange={e => setCv(c => ({ ...c, ozet: e.target.value }))}
              placeholder="Kendinizi kısaca tanıtın..." />
          </label>
          <label>Beceriler (virgülle ayırın)
            <input value={cv.beceriler}
              onChange={e => setCv(c => ({ ...c, beceriler: e.target.value }))}
              placeholder="Python, React, SQL, Git..." />
          </label>
          <button type="submit" className="btn-primary">CV'yi Kaydet</button>
        </form>
      )}
    </div>
  );
}

export default ProfilePage;
