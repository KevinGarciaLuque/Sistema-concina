import { FaExclamationTriangle } from "react-icons/fa";

export default function ModalConfirm({
  show,
  title = "Confirmación",
  message = "¿Deseas continuar?",
  confirmText = "Eliminar",
  cancelText = "Cancelar",
  confirmVariant = "danger", // danger | primary | warning | etc.
  loading = false,
  icon = <FaExclamationTriangle />,
  onConfirm,
  onCancel,
}) {
  if (!show) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ background: "rgba(0,0,0,.45)", zIndex: 2000 }}
      onClick={() => !loading && onCancel?.()}
    >
      <div
        className="card shadow-lg"
        style={{ width: "min(520px, 92vw)", borderRadius: 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-body p-4">
          <div className="d-flex align-items-start gap-3">
            <div
              className="d-flex align-items-center justify-content-center"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(220,53,69,.12)",
                color: "#dc3545",
                fontSize: 20,
                flex: "0 0 auto",
              }}
            >
              {icon}
            </div>

            <div className="flex-grow-1">
              <h5 className="mb-1">{title}</h5>
              <div className="text-muted" style={{ lineHeight: 1.35 }}>
                {message}
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelText}
            </button>

            <button
              type="button"
              className={`btn btn-${confirmVariant}`}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? "Procesando..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
