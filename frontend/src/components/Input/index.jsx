// Genel Input Bileşeni
// Dolduracak: Sevde

/**
 * @param {string} type - input tipi
 * @param {string} placeholder - placeholder yazısı
 * @param {string} value - input değeri
 * @param {function} onChange - değişim olayı
 */

function Input({
    type = "text",
    placeholder = "",
    value,
    onChange,
}) {
    return (
        <input
            className="custom-input"
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
        />
    );
}

export default Input;