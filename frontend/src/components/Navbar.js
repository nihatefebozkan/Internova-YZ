import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = {
  student: [
    { label: 'Stajlar', to: '/internships' },
    { label: 'Portfolyo', to: '/portfolio' },
    { label: 'Kariyer Haritam', to: '/career-map' },
    { label: 'Staj Defterim', to: '/internship-book' },
    { label: 'Rozetler & Etkinlikler', to: '/badges' },
    { label: 'Takım Bul', to: '/team-matcher' },
  ],
  company: [
    { label: 'Panelim', to: '/company-dashboard' },
    { label: 'Stajlar', to: '/internships' },
    { label: 'Şirketler', to: '/companies' },
    { label: 'Takım Eşleştir', to: '/team-matcher' },
  ],
  teacher: [
    { label: 'Onay Paneli', to: '/academic-dashboard' },
    { label: 'Stajlar', to: '/internships' },
    { label: 'Rozetler & Etkinlikler', to: '/badges' },
  ],
};

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const links = NAV_LINKS[user?.role] || [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-text">Internova</span>
        <span className="brand-yz">YZ</span>
      </Link>

      <div className="navbar-links">
        {user ? (
          <>
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={location.pathname === link.to ? 'nav-link active' : 'nav-link'}
              >
                {link.label}
              </Link>
            ))}
            <Link to="/profile" className="nav-link">
              👤 {user.ad}
            </Link>
            <button className="btn-logout" onClick={handleLogout}>
              Çıkış
            </button>
          </>
        ) : (
          <>
            <Link to="/internships" className="nav-link">Stajlar</Link>
            <Link to="/companies" className="nav-link">Şirketler</Link>
            <Link to="/login" className="nav-link">Giriş</Link>
            <Link to="/register" className="btn-primary nav-register">Kayıt Ol</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
