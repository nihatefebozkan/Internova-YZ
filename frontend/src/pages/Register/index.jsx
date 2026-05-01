// Kayıt Sayfası — Rol seçimi (öğrenci / şirket / akademisyen), form doğrulama
// Dolduracak: Mustafa (AuthContext register + rol yönlendirme)

import { useState } from 'react';
import './style.css';

function Register() {
  const [role, setRole] = useState('student');

  return (
    <div className="register-page">
      <div className="role-selector">
        {/* Öğrenci / Şirket / BTÜ Akademisyen seçici */}
      </div>
      <form>
        {/* Role göre dinamik form alanları */}
      </form>
    </div>
  );
}

export default Register;
