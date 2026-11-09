import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0B5A9C]/45 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div
          className={`relative transform overflow-hidden rounded-3xl bg-white text-left shadow-[0_20px_60px_-20px_rgba(11,90,156,0.45)] transition-all w-full ${maxWidth} border border-[#cfe9f0]`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || subtitle) && (
            <div className="flex items-start justify-between p-5 border-b border-[#cfe9f0] bg-[#E6F5F8]/70">
              <div>
                {title && <h3 className="text-base font-extrabold text-[#4a4a4a]">{title}</h3>}
                {subtitle && <p className="text-xs text-[#5F5F5F] mt-0.5">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-1 text-[#7a8a90] hover:bg-white hover:text-[#0B5A9C] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Body */}
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
