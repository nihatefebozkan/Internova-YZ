import { Link } from 'react-router-dom';

function InternshipCard({ internship }) {
  const { id, pozisyon, konum, ucret_var_mi, basvuru_son_tarih, company } = internship;

  return (
    <div className="internship-card">
      <h3>{pozisyon}</h3>
      <p className="company-name">
        {company ? `${company.ad} ${company.soyad}` : ''}
      </p>
      <p className="location">{konum}</p>
      <span className="badge">{ucret_var_mi ? 'Ücretli' : 'Ücretsiz'}</span>
      {basvuru_son_tarih && (
        <p className="deadline">
          Son başvuru: {new Date(basvuru_son_tarih).toLocaleDateString('tr-TR')}
        </p>
      )}
      <Link to={`/internships/${id}`} className="btn-primary">
        İncele
      </Link>
    </div>
  );
}

export default InternshipCard;
