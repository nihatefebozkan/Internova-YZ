import { Link } from 'react-router-dom';

function InternshipCard({ internship }) {
  const { _id, title, company, location, type, deadline } = internship;

  return (
    <div className="internship-card">
      <h3>{title}</h3>
      <p className="company-name">{company?.name || company}</p>
      <p className="location">{location}</p>
      <span className="badge">{type}</span>
      {deadline && (
        <p className="deadline">Son başvuru: {new Date(deadline).toLocaleDateString('tr-TR')}</p>
      )}
      <Link to={`/internships/${_id}`} className="btn-primary">
        İncele
      </Link>
    </div>
  );
}

export default InternshipCard;
