import { useState, useEffect } from 'react';
import { getInternships } from '../services/internshipService';
import InternshipCard from '../components/InternshipCard';
import LoadingSpinner from '../components/LoadingSpinner';

function InternshipsPage() {
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getInternships({ search: search || undefined })
      .then(setInternships)
      .catch(() => setError('Stajlar yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [search]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="internships-page">
      <h2>Staj İlanları</h2>
      <input
        type="text"
        placeholder="Pozisyon, konum ara..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />
      {error && <p className="error-message">{error}</p>}
      <div className="internships-grid">
        {internships.map((internship) => (
          <InternshipCard key={internship.id} internship={internship} />
        ))}
        {internships.length === 0 && !error && <p>İlan bulunamadı.</p>}
      </div>
    </div>
  );
}

export default InternshipsPage;
