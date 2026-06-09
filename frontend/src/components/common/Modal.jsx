import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable modal overlay component.
 */
export default function Modal({ isOpen, onClose, title, children }) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Prevent scrolling body when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking content
      >
        <button onClick={onClose} className="modal-close" aria-label="Close modal">
          <X size={18} />
        </button>
        
        {title && <h3 className="modal-title">{title}</h3>}
        
        {children}
      </div>
    </div>
  );
}
