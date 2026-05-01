import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="home-page">
      <section className="hero">
        <h1>Hayalindeki Stajı Bul</h1>
        <p>YZ destekli platform ile kariyerine en uygun staj fırsatlarını keşfet.</p>
        <div className="hero-actions">
          <Link to="/internships" className="btn-primary">Stajları İncele</Link>
          <Link to="/register" className="btn-secondary">Hemen Başla</Link>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
