// Kariyer Yol Haritası Sayfası — Radar grafik, beceri gap analizi, hedef şirket seçimi
// Dolduracak: Bilgenur & Rabia (careerService + RadarChart component)

import RadarChart from '../../components/RadarChart';
import './style.css';

function CareerMap() {
  return (
    <div className="career-map-page">
      <section className="target-selector">
        {/* Hedef şirket / pozisyon seçici */}
      </section>

      <section className="radar-section">
        <RadarChart data={[]} />
        {/* Beceri radar grafiği */}
      </section>

      <section className="gap-analysis">
        {/* Eksik beceriler ve öneri kurslar */}
      </section>

      <section className="roadmap-timeline">
        {/* Adım adım gelişim yol haritası */}
      </section>
    </div>
  );
}

export default CareerMap;
