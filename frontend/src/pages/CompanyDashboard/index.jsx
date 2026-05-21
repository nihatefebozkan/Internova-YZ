// Şirket Paneli — İlan yönetimi ve başvuru takibi
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './style.css';

function CompanyDashboard() {
  const { user } = useAuth();
  const [internships, setInternships] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [applications, setApplications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ pozisyon: '', konum: '', aciklama: '', ucret_var_mi: false, durum: 'aktif' });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/internships', { params: { durum: 'aktif', limit: 50 } })
      .then(res => {
        const myIlanlar = res.data.filter(i => i.company_id === user?.id);
        setInternships(myIlanlar);
        if (myIlanlar.length > 0) setSelectedId(myIlanlar[0].id);
      })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!selectedId) return;
    api.get(`/applications/internship/${selectedId}`)
      .then(res => setApplications(res.data))
      .catch(() => setApplications([]));
  }, [selectedId]);

  const decide = async (appId, durum) => {
    await api.put(`/applications/${appId}/decision`, { durum });
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, durum } : a));
  };

  const createInternship = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/internships', form);
      setInternships(prev => [...prev, res.data]);
      setShowForm(false);
      setForm({ pozisyon: '', konum: '', aciklama: '', ucret_var_mi: false, durum: 'aktif' });
      setMsg('İlan oluşturuldu!');
    } catch {
      setMsg('İlan oluşturulamadı.');
    }
  };

  return (
    <div className="company-dashboard">
      <header className="dashboard-header">
        <h2>{user?.ad} — Şirket Paneli</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'İptal' : '+ Yeni İlan'}
        </button>
      </header>

      {msg && <p className="info-msg">{msg}</p>}

      {showForm && (
        <form className="ilan-form" onSubmit={createInternship}>
          <h3>Yeni Staj İlanı</h3>
          <input placeholder="Pozisyon *" required value={form.pozisyon}
            onChange={e => setForm(f => ({ ...f, pozisyon: e.target.value }))} />
          <input placeholder="Konum" value={form.konum}
            onChange={e => setForm(f => ({ ...f, konum: e.target.value }))} />
          <textarea placeholder="Açıklama" value={form.aciklama}
            onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))} rows={3} />
          <label>
            <input type="checkbox" checked={form.ucret_var_mi}
              onChange={e => setForm(f => ({ ...f, ucret_var_mi: e.target.checked }))} />
            {' '}Ücretli staj
          </label>
          <button type="submit" className="btn-primary">Oluştur</button>
        </form>
      )}

      <div className="dashboard-grid">
        {/* İlan listesi */}
        <section className="dashboard-card listings-panel">
          <h3>İlanlarım ({internships.length})</h3>
          {loading ? <p className="muted">Yükleniyor...</p> :
            internships.length === 0 ? <p className="muted">Henüz ilan oluşturmadınız.</p> :
            <ul className="ilan-list">
              {internships.map(i => (
                <li key={i.id}
                  className={`ilan-item ${selectedId === i.id ? 'active' : ''}`}
                  onClick={() => setSelectedId(i.id)}>
                  <span className="pozisyon">{i.pozisyon}</span>
                  <span className="konum">{i.konum}</span>
                </li>
              ))}
            </ul>
          }
        </section>

        {/* Başvurular */}
        <section className="dashboard-card applications-panel">
          <h3>Başvurular {selectedId && `— ${internships.find(i=>i.id===selectedId)?.pozisyon}`}</h3>
          {applications.length === 0
            ? <p className="muted">Bu ilana henüz başvuru yok.</p>
            : <ul className="app-list">
                {applications.map(app => (
                  <li key={app.id} className="app-item">
                    <div>
                      <strong>{app.student?.ad} {app.student?.soyad}</strong>
                      <p className="email">{app.student?.email}</p>
                      {app.on_yazi && <p className="on-yazi">"{app.on_yazi}"</p>}
                    </div>
                    {app.durum === 'bekleyen' ? (
                      <div className="action-btns">
                        <button className="btn-accept" onClick={() => decide(app.id, 'kabul')}>Kabul</button>
                        <button className="btn-reject" onClick={() => decide(app.id, 'red')}>Reddet</button>
                      </div>
                    ) : (
                      <span className={`status-badge status-${app.durum}`}>
                        {app.durum === 'kabul' ? '✅ Kabul' : '❌ Red'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
          }
        </section>

        {/* Hızlı linkler */}
        <section className="dashboard-card quick-links">
          <h3>Araçlar</h3>
          <Link to="/team-matcher" className="quick-link-card">
            <span className="icon">👥</span><span>Takım Eşleştirme</span>
          </Link>
          <Link to="/profile" className="quick-link-card">
            <span className="icon">🏢</span><span>Şirket Profili</span>
          </Link>
        </section>
      </div>
    </div>
  );
}

export default CompanyDashboard;
