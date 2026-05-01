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
          <div key={company._id} className="company-card">
            <h3>{company.name}</h3>
            <p>{company.sector}</p>
            <Link to={`/companies/${company._id}`}>Detay</Link>
          </div>
        ))}
        {companies.length === 0 && <p>Şirket bulunamadı.</p>}
      </div>
    </div>
  );
}

export default CompaniesPage;
