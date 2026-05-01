import { useAuth } from '../context/AuthContext';

function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="profile-page">
      <h2>Profilim</h2>
      <div className="profile-card">
        <p><strong>Ad:</strong> {user?.name}</p>
        <p><strong>E-posta:</strong> {user?.email}</p>
        <p><strong>Rol:</strong> {user?.role === 'student' ? 'Öğrenci' : 'Şirket'}</p>
      </div>
    </div>
  );
}

export default ProfilePage;
