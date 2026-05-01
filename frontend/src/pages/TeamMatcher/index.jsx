// Takım Eşleştirme Sayfası — Proje türü seçimi, önerilen takım kartları, yetkinlik skoru
// Dolduracak: Yusuf (teamMatcherService + eşleşme animasyonu)

import './style.css';

function TeamMatcher() {
  return (
    <div className="team-matcher-page">
      <section className="project-selector">
        {/* Proje türü seç: Otonom Araç, AR-GE, Makine, Elektronik, Yazılım */}
      </section>

      <section className="requirements-form">
        {/* Takım büyüklüğü, süre, beceri zorunlulukları */}
      </section>

      <section className="team-results">
        {/* Önerilen takım kombinasyonları, %XX eşleşme skoru */}
      </section>

      <section className="team-preview">
        {/* Seçilen takımın profil kartları */}
      </section>
    </div>
  );
}

export default TeamMatcher;
