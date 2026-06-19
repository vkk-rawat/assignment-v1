import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

const icons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

export default function Alert({ type = "info", message, onClose }) {
  if (!message) {
    return null;
  }

  const Icon = icons[type] || Info;

  return (
    <div className={`alert alert-${type}`} role="alert">
      <Icon size={18} aria-hidden="true" />
      <span>{message}</span>
      {onClose ? (
        <button
          type="button"
          className="icon-button subtle"
          onClick={onClose}
          aria-label="Dismiss message"
          title="Dismiss"
        >
          <X size={16} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
