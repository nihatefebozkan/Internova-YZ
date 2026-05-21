import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCompanies } from '../services/companyService';
import LoadingSpinner from '../components/LoadingSpinner';

function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCompanies()
      .then(setCompanies)
      .catch(() => setError('Şirketler yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="companies-page">
      <h2>Şirketler</h2>
      {error && <p className="error-message">{error}</p>}
      <div className="companies-grid">
        {companies.map((company) => (
          <div key={company.id} className="company-card">
            <h3>{company.ad} {company.soyad}</h3>
            <Link to={`/companies/${company.id}`}>Detay</Link>
          </div>
        ))}
        {companies.length === 0 && !error && <p>Şirket bulunamadı.</p>}
      </div>
    </div>
  );
}

export default CompaniesPage;
