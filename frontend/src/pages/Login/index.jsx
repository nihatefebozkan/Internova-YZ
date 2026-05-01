// Giriş Sayfası — Email/şifre formu, JWT auth
// Dolduracak: Mustafa (AuthContext ile bağlanacak)

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './style.css';

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: login() çağır, hata yönetimi ekle, role göre yönlendir
  };

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit}>
        {/* Form alanları buraya */}
      </form>
    </div>
  );
}

export default Login;
