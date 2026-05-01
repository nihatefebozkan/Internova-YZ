// Staj Defteri Sayfası — Günlük giriş formu, onay durumu takibi, PDF indirme
// Dolduracak: Mustafa (internshipBookService + PDF önizleme)

import './style.css';

function InternshipBook() {
  return (
    <div className="internship-book-page">
      <section className="book-header">
        {/* Staj özet bilgisi, onay durumu badge */}
      </section>

      <section className="daily-entries">
        {/* Günlük giriş listesi + yeni giriş formu */}
      </section>

      <section className="approval-chain">
        {/* Onay zinciri: Öğrenci → Şirket IK → BTÜ Akademisyen */}
      </section>

      <div className="book-actions">
        {/* PDF İndir, QR Doğrulama butonu */}
      </div>
    </div>
  );
}

export default InternshipBook;
