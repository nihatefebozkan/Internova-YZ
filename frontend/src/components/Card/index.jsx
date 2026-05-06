// Genel Kart Bileşeni
// Dolduracak: Sevde

/**
 * @param {string} title - Kart başlığı
 * @param {string} description - Kart açıklaması
 * @param {React.ReactNode} children - İçerik
 */

function Card({
    title,
    description,
    children,
}) {
    return (
        <div className="custom-card">
            {title && <h3>{title}</h3>}

            {description && (
                <p>{description}</p>
            )}

            <div className="card-content">
                {children}
            </div>
        </div>
    );
}

export default Card;