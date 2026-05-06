// Genel Buton Bileşeni
// Dolduracak: Sevde

/**
 * @param {string} text - Buton yazısı
 * @param {function} onClick - Tıklama olayı
 * @param {string} type - button | submit
 * @param {boolean} disabled - Pasif durum
 */

function Button({
    text = "Buton",
    onClick,
    type = "button",
    disabled = false,
}) {
    return (
        <button
            className="custom-button"
            type={type}
            onClick={onClick}
            disabled={disabled}
        >
            {text}
        </button>
    );
}

export default Button;