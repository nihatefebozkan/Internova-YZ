import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import { useAuth } from './context/AuthContext';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
// Çalışan sayfalar
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import InternshipsPage from './pages/InternshipsPage';
import CompaniesPage from './pages/CompaniesPage';
import ProfilePage from './pages/ProfilePage';

// Yeni sayfalar (stub → doldurulacak)
import Home from './pages/Home';
import CareerAssistant from './pages/CareerAssistant';
import InternshipDetail from './pages/InternshipDetail';
import StudentDashboard from './pages/StudentDashboard';
import CompanyDashboard from './pages/CompanyDashboard';
import AcademicDashboard from './pages/AcademicDashboard';
import CareerMap from './pages/CareerMap';
import Badges from './pages/Badges';
import InternshipBook from './pages/InternshipBook';
// Portfolio sayfası kaldırıldı — tüm fonksiyonu ProfilePage karşılıyor
import Groups from './pages/Groups';
import GroupCreate from './pages/Groups/Create';
import MyGroups from './pages/Groups/Mine';
import GroupDetail from './pages/Groups/Detail';
import GroupChat from './pages/Groups/Chat';
import ProjectCreate from './pages/Projects/Create';
import ProjectDetail from './pages/Projects/Detail';

import './App.css';

function AppRoutes() {
  return (
    <>
      <main className="main-content">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/internships" element={<InternshipsPage />} />
          <Route path="/internships/:id" element={<InternshipDetail />} />
          <Route path="/companies" element={<CompaniesPage />} />

          {/* Dashboard — role bazlı yönlendirme */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

          {/* Rol bazlı dashboard'lar */}
          <Route path="/student-dashboard" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
          <Route path="/company-dashboard" element={<ProtectedRoute><CompanyDashboard /></ProtectedRoute>} />
          <Route path="/academic-dashboard" element={<ProtectedRoute><AcademicDashboard /></ProtectedRoute>} />

          {/* Öğrenci özellikleri */}
          <Route path="/portfolio" element={<Navigate to="/profile" replace />} />
          <Route path="/career-map" element={<ProtectedRoute><CareerMap /></ProtectedRoute>} />
          <Route path="/badges" element={<ProtectedRoute><Badges /></ProtectedRoute>} />
          <Route path="/internship-book" element={<ProtectedRoute><InternshipBook /></ProtectedRoute>} />
          <Route path="/team-matcher" element={<Navigate to="/groups" replace />} />
          <Route path="/career-assistant" element={<ProtectedRoute><CareerAssistant /></ProtectedRoute>} />

          {/* Grup yönetimi */}
          <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
          <Route path="/groups/new" element={<ProtectedRoute><GroupCreate /></ProtectedRoute>} />
          <Route path="/groups/me" element={<ProtectedRoute><MyGroups /></ProtectedRoute>} />
          <Route path="/groups/:id" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
          <Route path="/groups/:id/chat" element={<ProtectedRoute><GroupChat /></ProtectedRoute>} />
          <Route path="/groups/:groupId/projects/new" element={<ProtectedRoute><ProjectCreate /></ProtectedRoute>} />
          <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
          <Route path="/skills" element={<Navigate to="/profile" replace />} />

          {/* Profil */}
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </UserProvider>
    </AuthProvider>
  );
}

export default App;
