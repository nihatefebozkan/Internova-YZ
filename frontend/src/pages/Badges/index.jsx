// Rozetler & Ekosistem — Rozet koleksiyonu + XP sayacı + Etkinlik takvimi
import { useState, useEffect } from 'react';
import api from '../../services/api';
import QRCode from '../../components/QRCode';
import './style.css';

function BadgeCard({ badge, kazanildi, kazanma_tarihi }) {
  return (
    <div className={`badge-card ${kazanildi ? 'earned' : 'locked'}`}>
      <div className="badge-icon">
        {badge.ikon_url
          ? <img src={badge.ikon_url} alt={badge.ad} />
          : <span className="badge-emoji">{kazanildi ? '🏅' : '🔒'}</span>
        }
      </div>
      <h4 className="badge-name">{badge.ad}</h4>
      <p className="badge-desc">{badge.aciklama}</p>
      {kazanildi && kazanma_tarihi && (
        <p className="badge-date">
          {new Date(kazanma_tarihi).toLocaleDateString('tr-TR')}
        </p>
      )}
      {!kazanildi && <span className="locked-label">Kilitli</span>}
    </div>
  );
}

function Badges() {
  const [allBadges, setAllBadges] = useState([]);
  const [myBadges, setMyBadges] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/badges'),
      api.get('/badges/me'),
      api.get('/events', { params: { limit: 5 } }).catch(() => ({ data: [] })),
    ]).then(([allRes, myRes, eventsRes]) => {
      setAllBadges(allRes.data);
      setMyBadges(myRes.data);
      setEvents(eventsRes.data);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const myBadgeIds = new Set(myBadges.map(ub => ub.badge_id));
  const xp = myBadges.length * 100;
  const seviye = Math.floor(xp / 300) + 1;
  const sonrakiXP = seviye * 300;

  return (
    <div className="badges-page">
      <h2>🏅 Rozetlerim</h2>

      {/* XP Özeti */}
      <section className="xp-overview dashboard-card">
        <div className="xp-stats">
          <div className="xp-item">
            <span className="xp-value">{xp}</span>
            <span className="xp-label">XP</span>
          </div>
          <div className="xp-item">
            <span className="xp-value">{seviye}</span>
            <span className="xp-label">Seviye</span>
          </div>
          <div className="xp-item">
            <span className="xp-value">{myBadges.length}</span>
            <span className="xp-label">Rozet</span>
          </div>
        </div>
        <div className="xp-bar-wrapper">
          <div className="xp-bar">
            <div className="xp-fill" style={{ width: `${Math.min((xp % 300) / 300 * 100, 100)}%` }} />
          </div>
          <span className="xp-next">{xp % 300} / 300 XP — Sonraki seviye</span>
        </div>
      </section>

      {/* Rozet Koleksiyonu */}
      <section className="badge-collection">
        <h3>Tüm Rozetler ({myBadges.length}/{allBadges.length})</h3>
        {loading
          ? <p className="muted">Yükleniyor...</p>
          : (
            <div className="badges-grid">
              {/* Kazanılanlar önce */}
              {allBadges
                .sort((a, b) => (myBadgeIds.has(b.id) ? 1 : 0) - (myBadgeIds.has(a.id) ? 1 : 0))
                .map(badge => {
                  const userBadge = myBadges.find(ub => ub.badge_id === badge.id);
                  return (
                    <BadgeCard
                      key={badge.id}
                      badge={badge}
                      kazanildi={myBadgeIds.has(badge.id)}
                      kazanma_tarihi={userBadge?.kazanma_tarihi}
                    />
                  );
                })
              }
              {allBadges.length === 0 && (
                <p className="muted">Henüz rozet tanımlanmamış.</p>
              )}
            </div>
          )
        }
      </section>

      {/* Etkinlik Takvimi */}
      <section className="dashboard-card events-section">
        <h3>📅 Yaklaşan Etkinlikler ({events.length})</h3>
        {events.length === 0
          ? <p className="muted">Yaklaşan etkinlik yok.</p>
          : events.map(e => (
            <div key={e.id} className="event-card">
              <div className="event-info">
                <h4>{e.baslik}</h4>
                <p className="event-meta">
                  {new Date(e.baslangic_tarihi).toLocaleDateString('tr-TR', {
                    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                  })}
                  {e.konum && ` — ${e.konum}`}
                </p>
                <span className="event-kategori">{e.kategori}</span>
              </div>
              {e.qr_kod && (
                <div className="event-qr">
                  <QRCode value={e.qr_kod} size={100} label="Check-in QR" />
                </div>
              )}
              <button className="btn-secondary"
                onClick={() => api.post(`/events/${e.id}/attend`)
                  .then(() => alert('Etkinliğe kayıt oldunuz!'))
                  .catch(err => alert(err.response?.data?.detail || 'Hata'))}>
                Katıl
              </button>
            </div>
          ))
        }
      </section>
    </div>
  );
}

export default Badges;
