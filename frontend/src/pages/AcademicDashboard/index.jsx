// BTÜ Akademisyen Paneli — Onay kuyruğu, staj defteri denetim, sertifikasyon, istatistikler
// Dolduracak: Melike (akademisyen rol akışı + onay API bağlantısı)

import './style.css';

function AcademicDashboard() {
  return (
    <div className="academic-dashboard">
      <div className="dashboard-grid">
        <section className="approval-queue">
          {/* Onay bekleyen staj defteri listesi */}
        </section>

        <section className="certification-panel">
          {/* Sertifika onay ve sorgulama */}
        </section>

        <section className="stats-panel">
          {/* Öğrenci dağılım istatistikleri, şirket bazlı */}
        </section>

        <section className="regulation-panel">
          {/* BTÜ yönetmelik görüntüleyici */}
        </section>
      </div>
    </div>
  );
}

export default AcademicDashboard;
