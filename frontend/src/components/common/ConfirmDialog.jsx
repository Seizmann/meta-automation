/**
 * ConfirmDialog renders a premium, iOS-style modal dialog
 * for confirm/cancel operations.
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="ios-alert-overlay" onClick={onCancel}>
      <div className="ios-alert" onClick={(e) => e.stopPropagation()}>
        <div className="ios-alert-content">
          {title && <h3 className="ios-alert-title">{title}</h3>}
          {message && <p className="ios-alert-message">{message}</p>}
        </div>
        
        <div className="ios-alert-buttons">
          <button 
            type="button" 
            className="ios-alert-btn ios-alert-btn-cancel" 
            onClick={onCancel}
          >
            {cancelText}
          </button>
          
          <button 
            type="button" 
            className={`ios-alert-btn ${
              isDestructive ? 'ios-alert-btn-destructive' : 'ios-alert-btn-confirm'
            }`} 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
