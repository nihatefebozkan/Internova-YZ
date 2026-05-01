// Üst Navigasyon — Rol bazlı menü (öğrenci / şirket / akademisyen), aktif sayfa vurgusu
// Dolduracak: Melike (responsive + rol bazlı link listesi)

import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_LINKS = {
  student: [
    { label: 'Stajlar', to: '/internships' },
    { label: 'Portfolyo', to: '/portfolio' },
    { label: 'Kariyer Haritam', to: '/career-map' },
    { label: 'Staj Defterim', to: '/internship-book' },
    { label: 'Rozetler', to: '/badges' },
  ],
  company: [
    { label: 'Panel', to: '/company-dashboard' },
    { label: 'Takım Eşleştir', to: '/team-matcher' },
    { label: 'Şirketler', to: '/companies' },
  ],
  academic: [
    { label: 'Onay Paneli', to: '/academic-dashboard' },
  ],
};

function Navbar() {
  const { user, logout } = useAuth();
  const links = NAV_LINKS[user?.role] || [];

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">İnternova YZ</Link>
      <div className="navbar-links">
        {links.map((link) => (
          <Link key={link.to} to={link.to}>{link.label}</Link>
        ))}
        {user ? (
          <button onClick={logout}>Çıkış</button>
        ) : (
          <>
            <Link to="/login">Giriş</Link>
            <Link to="/register">Kayıt Ol</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
