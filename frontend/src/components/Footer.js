import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Footer() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <footer className="footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 2rem' }}>
      <p style={{ margin: 0, fontSize: '.85rem' }}>&copy; {new Date().getFullYear()} İnternova YZ. Tüm hakları saklıdır.</p>
      {user && (
        <button
          onClick={handleLogout}
          style={{
            background: 'none', border: '1px solid #E5E7EB', borderRadius: '8px',
            padding: '0.35rem 0.85rem', fontSize: '.82rem', fontWeight: 600,
            color: '#6B7280', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.target.style.borderColor = '#EF4444'; e.target.style.color = '#EF4444'; }}
          onMouseLeave={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.color = '#6B7280'; }}
        >
          Çıkış Yap
        </button>
      )}
    </footer>
  );
}

export default Footer;
