// Şirket Paneli — İlan yönetimi, başvuru takibi, stajyer değerlendirme, takım eşleştirme
// Dolduracak: Nihat (companyService + teamMatcherService bağlantısı)

import './style.css';

function CompanyDashboard() {
  return (
    <div className="company-dashboard">
      <div className="dashboard-grid">
        <section className="listings-panel">
          {/* Aktif ilanlar + yeni ilan oluştur butonu */}
        </section>

        <section className="applications-panel">
          {/* Başvuru listesi, filtre, kabul/ret */}
        </section>

        <section className="team-matcher-panel">
          {/* Hazır takım önerisi widget'ı */}
        </section>

        <section className="evaluations-panel">
          {/* Mevcut stajyer değerlendirme formu */}
        </section>
      </div>
    </div>
  );
}

export default CompanyDashboard;
