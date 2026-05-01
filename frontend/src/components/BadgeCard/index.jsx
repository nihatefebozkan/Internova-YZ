// Dijital Rozet Kartı — Rozet görseli, başlık, kazanılma tarihi, paylaş butonu
// Dolduracak: Bilgenur & Melike (rozet tipleri ve görseller assets/badges klasöründen)

/**
 * @param {object} badge - { type, title, description, earnedAt, icon }
 * @param {boolean} locked - Henüz kazanılmamış rozet (soluk gösterim)
 */
function BadgeCard({ badge, locked = false }) {
  return (
    <div className={`badge-card ${locked ? 'locked' : 'earned'}`}>
      <div className="badge-icon">
        {badge.icon ? (
          <img src={badge.icon} alt={badge.title} />
        ) : (
          <span className="badge-emoji">🏅</span>
        )}
      </div>
      <h4 className="badge-title">{badge.title}</h4>
      <p className="badge-desc">{badge.description}</p>
      {!locked && badge.earnedAt && (
        <small>{new Date(badge.earnedAt).toLocaleDateString('tr-TR')}</small>
      )}
      {!locked && (
        <button className="badge-share-btn">Paylaş</button>
      )}
    </div>
  );
}

export default BadgeCard;
