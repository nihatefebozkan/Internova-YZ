// Yan Panel — Dashboard sayfalarında sol navigasyon, collapse desteği
// Dolduracak: Nihat & Melike (rol bazlı menü item'ları)

import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function Sidebar({ isOpen = true }) {
  const { user } = useAuth();

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <div className="sidebar-user">
        {/* Kullanıcı avatar + isim */}
      </div>
      <nav className="sidebar-nav">
        {/* Rol bazlı NavLink listesi buraya */}
      </nav>
    </aside>
  );
}

export default Sidebar;
