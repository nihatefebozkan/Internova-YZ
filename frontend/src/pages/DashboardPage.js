import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const ROLE_ROUTES = {
  student: '/student-dashboard',
  teacher: '/academic-dashboard',
  company: '/company-dashboard',
};

function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user?.role) {
      navigate(ROLE_ROUTES[user.role] || '/', { replace: true });
    }
  }, [user, loading, navigate]);

  return <LoadingSpinner />;
}

export default DashboardPage;
