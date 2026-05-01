// Rozetler ve Ekosistem Sayfası — Rozet koleksiyonu, XP puanı, liderlik tablosu, takvim
// Dolduracak: Bilgenur & Melike (badgeService + gamification UI)

import BadgeCard from '../../components/BadgeCard';
import './style.css';

function Badges() {
  return (
    <div className="badges-page">
      <section className="xp-overview">
        {/* Toplam XP, seviye, sonraki rozet için ilerleme */}
      </section>

      <section className="badge-collection">
        {/* Kazanılan rozetler grid — BadgeCard componenti */}
      </section>

      <section className="leaderboard">
        {/* Bölüm / genel liderlik tablosu */}
      </section>

      <section className="central-calendar">
        {/* Bursa Merkezi etkinlik takvimi */}
      </section>
    </div>
  );
}

export default Badges;
