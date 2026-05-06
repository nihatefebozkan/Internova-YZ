// Modal Bileşeni
// Dolduracak: Sevde

/**
 * @param {boolean} open - Modal açık mı
 * @param {function} onClose - Kapatma fonksiyonu
 * @param {React.ReactNode} children - İçerik
 */

function Modal({
    open = false,
    onClose,
    children,
}) {
    if (!open) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button
                    className="modal-close"
                    onClick={onClose}
                >
                    X
                </button>

                {children}
            </div>
        </div>
    );
}

export default Modal;