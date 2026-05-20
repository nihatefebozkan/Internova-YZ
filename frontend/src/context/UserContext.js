// Kullanıcı Profil Context'i — Genişletilmiş profil verisi (portfolyo, rozetler, beceriler)
// AuthContext yalnızca kimlik doğrulama tutar; ayrıntılı profil burada
// Dolduracak: Nihat (userService + portfolioService ile populate edilecek)

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getUserProfile } from '../services/userService';

const UserContext = createContext();

export function UserProvider({ children }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    getUserProfile(user._id)
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const refreshProfile = async () => {
    if (!user?.id) return;
    const data = await getUserProfile(user._id);
    setProfile(data);
  };

  return (
    <UserContext.Provider value={{ profile, loading, refreshProfile, setProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
