import { useAuth } from '../context/AuthContext';

function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="dashboard-page">
      <h2>Hoş geldin, {[user?.ad, user?.soyad].filter(Boolean).join(' ')}!</h2>
      <p>Rol: {user?.role === 'student' ? 'Öğrenci' : user?.role === 'teacher' ? 'Akademisyen' : 'Şirket'}</p>
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Başvurularım</h3>
          <p>Aktif başvurularını buradan takip edebilirsin.</p>
        </div>
        <div className="dashboard-card">
          <h3>YZ Önerileri</h3>
          <p>Profiline göre kişiselleştirilmiş staj önerileri.</p>
        </div>
        <div className="dashboard-card">
          <h3>Profil</h3>
          <p>Profilini güncel tut, daha iyi eşleşmeler al.</p>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
