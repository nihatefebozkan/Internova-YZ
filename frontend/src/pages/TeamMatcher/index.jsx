// Takım Eşleştirme — Takım oluştur, listele, başvur, eşleştir
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './style.css';

const BOSH_FORM = { proje_adi: '', aciklama: '', aranan_yetkinlikler: '', max_uye_sayisi: 5 };

function TeamMatcher() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BOSH_FORM);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [matches, setMatches] = useState([]);
  const [applyMsg, setApplyMsg] = useState({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/teams').then(res => setTeams(res.data)).catch(() => {});
  }, []);

  const createTeam = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        max_uye_sayisi: Number(form.max_uye_sayisi),
        aranan_yetkinlikler: form.aranan_yetkinlikler
          .split(',').map(s => s.trim()).filter(Boolean),
      };
      const res = await api.post('/teams', payload);
      setTeams(prev => [res.data, ...prev]);
      setShowForm(false);
      setForm(BOSH_FORM);
      setMsg('Takım oluşturuldu!');
    } catch { setMsg('Takım oluşturulamadı.'); }
  };

  const applyTeam = async (teamId) => {
    try {
      await api.post(`/teams/${teamId}/apply`, { mesaj: 'Takımınıza katılmak istiyorum.' });
      setApplyMsg(prev => ({ ...prev, [teamId]: '✅ Başvuru gönderildi' }));
    } catch (err) {
      const detail = err.response?.data?.detail || 'Hata';
      setApplyMsg(prev => ({ ...prev, [teamId]: `❌ ${detail}` }));
    }
  };

  const getMatches = async (team) => {
    setSelectedTeam(team);
    try {
      const res = await api.get(`/teams/match?team_id=${team.id}`);
      setMatches(res.data);
    } catch { setMatches([]); }
  };

  return (
    <div className="team-matcher-page">
      <header className="page-header">
        <h2>👥 Takım Eşleştirme</h2>
        {user?.role === 'student' && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'İptal' : '+ Takım Kur'}
          </button>
        )}
      </header>

      {msg && <p className="info-msg">{msg}</p>}

      {showForm && (
        <form className="team-form dashboard-card" onSubmit={createTeam}>
          <h3>Yeni Takım</h3>
          <input placeholder="Proje adı *" required value={form.proje_adi}
            onChange={e => setForm(f => ({ ...f, proje_adi: e.target.value }))} />
          <textarea placeholder="Açıklama" rows={3} value={form.aciklama}
            onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))} />
          <input placeholder="Aranan beceriler (virgülle ayırın)" value={form.aranan_yetkinlikler}
            onChange={e => setForm(f => ({ ...f, aranan_yetkinlikler: e.target.value }))} />
          <input type="number" min={2} max={10} placeholder="Max üye sayısı"
            value={form.max_uye_sayisi}
            onChange={e => setForm(f => ({ ...f, max_uye_sayisi: e.target.value }))} />
          <button type="submit" className="btn-primary">Oluştur</button>
        </form>
      )}

      <div className="team-grid">
        {/* Takım listesi */}
        <section>
          <h3>Açık Takımlar ({teams.length})</h3>
          {teams.length === 0
            ? <p className="muted">Şu an açık takım yok.</p>
            : teams.map(team => (
              <div key={team.id} className="team-card dashboard-card">
                <div className="team-header">
                  <h4>{team.proje_adi}</h4>
                  <span className="team-size">Max {team.max_uye_sayisi} kişi</span>
                </div>
                {team.aciklama && <p>{team.aciklama}</p>}
                {team.aranan_yetkinlikler?.length > 0 && (
                  <div className="tech-tags">
                    {team.aranan_yetkinlikler.map(b => <span key={b} className="tag">{b}</span>)}
                  </div>
                )}
                <p className="team-leader">
                  Lider: {team.lider?.ad} {team.lider?.soyad}
                </p>
                <div className="team-actions">
                  {user?.role === 'student' && team.lider_id !== user?.id && (
                    <button className="btn-secondary"
                      onClick={() => applyTeam(team.id)}
                      disabled={!!applyMsg[team.id]}>
                      {applyMsg[team.id] || 'Başvur'}
                    </button>
                  )}
                  {(user?.role === 'company' || team.lider_id === user?.id) && (
                    <button className="btn-ai" onClick={() => getMatches(team)}>
                      🤖 Eşleştir
                    </button>
                  )}
                </div>
              </div>
            ))
          }
        </section>

        {/* Eşleştirme sonuçları */}
        {selectedTeam && (
          <section className="match-results dashboard-card">
            <h3>"{selectedTeam.proje_adi}" için En Uygun Öğrenciler</h3>
            {matches.length === 0
              ? <p className="muted">CV'si olan öğrenci bulunamadı.</p>
              : matches.map((m, i) => (
                <div key={m.student_id} className="match-item">
                  <span className="match-rank">#{i + 1}</span>
                  <span className="match-id">Öğrenci #{m.student_id}</span>
                  <div className="match-bar-wrapper">
                    <div className="match-bar" style={{ width: `${Math.round(m.score * 100)}%` }} />
                    <span className="match-pct">%{Math.round(m.score * 100)}</span>
                  </div>
                  {m.eslesen_beceriler?.length > 0 && (
                    <div className="tech-tags">
                      {m.eslesen_beceriler.map(b => <span key={b} className="tag">{b}</span>)}
                    </div>
                  )}
                </div>
              ))
            }
          </section>
        )}
      </div>
    </div>
  );
}

export default TeamMatcher;
