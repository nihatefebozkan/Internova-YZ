import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">İnternova YZ</Link>
      <div className="navbar-links">
        <Link to="/internships">Stajlar</Link>
        <Link to="/companies">Şirketler</Link>
        {user ? (
          <>
            <Link to="/dashboard">Panel</Link>
            <button onClick={handleLogout}>Çıkış</button>
          </>
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
