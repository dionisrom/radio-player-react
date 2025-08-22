import React from 'react';

export default function Modal({ open, onClose, children, title }) {
  if (!open) return null;
  // Close modal when clicking the overlay (but not the modal itself)
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && typeof onClose === 'function') onClose();
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden backdrop-blur-xl"
      style={{
        minHeight: '100vh',
        minWidth: '100vw',
        background: 'var(--modal-glass-bg, rgba(255,255,255,0.55))',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        backdropFilter: 'blur(24px) saturate(180%)',
      }}
      onClick={handleOverlayClick}
    >
      <style>{`
        :root {
          --modal-glass-bg: rgba(255,255,255,0.75);
        }
        html.dark {
          --modal-glass-bg: rgba(24, 24, 32, 0.85);
        }
      `}</style>
      <div
        className="glass bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-black/20 rounded-2xl shadow-2xl max-w-md w-full mx-2 sm:mx-4 p-0 relative animate-fadeIn flex flex-col"
        style={{
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          backdropFilter: 'blur(16px) saturate(180%)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">{title}</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded transition"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
