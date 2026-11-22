import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ open, title, onClose, children, className = '' }) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="hud-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-space-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} className={`hud-modal m-auto max-h-[min(90vh,52rem)] ${className}`}>
        <header className="hud-modal-header"><h2 id={titleId}>{title}</h2><button type="button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></header>
        <div className="hud-modal-body">{children}</div>
      </section>
    </div>, document.body,
  );
}
