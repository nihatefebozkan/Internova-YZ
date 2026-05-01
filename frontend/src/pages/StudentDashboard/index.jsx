// Öğrenci Paneli — Kariyer yol haritası özeti, aktif başvurular, rozet, YZ öneriler
// Dolduracak: Nihat & Rabia (tüm servislerle bağlantı kurulacak)

import { useAuth } from '../../context/AuthContext';
import './style.css';

function StudentDashboard() {
  const { user } = useAuth();

  return (
    <div className="student-dashboard">
      <header className="dashboard-header">
        <h2>Hoş geldin, {user?.name}</h2>
      </header>

      <div className="dashboard-grid">
        <section className="career-map-widget">
          {/* Kariyer yol haritası mini widget — CareerMap servisinden */}
        </section>

        <section className="applications-widget">
          {/* Aktif başvurular — internshipService'ten */}
        </section>

        <section className="badges-widget">
          {/* Son kazanılan rozetler — badgeService'ten */}
        </section>

        <section className="ai-suggestions-widget">
          {/* YZ staj önerileri — aiService'ten */}
        </section>

        <section className="mentor-bot-widget">
          {/* Mentor bot hızlı erişim — ChatBot componenti */}
        </section>
      </div>
    </div>
  );
}

export default StudentDashboard;
