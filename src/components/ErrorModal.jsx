import React, { useEffect } from 'react';

export default function ErrorModal({ message, onDismiss, autoHide = true, duration = 5000 }) {
  useEffect(() => {
    if (autoHide && message) {
      const timer = setTimeout(() => {
        onDismiss && onDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, autoHide, duration, onDismiss]);

  if (!message) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] bg-red-600/30 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-4 backdrop-blur-md animate-fade-in">
      <span className="text-sm">Stream error: {message}</span>
      <button
        className="ml-2 text-xs px-2 py-1 bg-white/20 rounded hover:bg-white/30 transition"
        onClick={onDismiss}
      >
        Dismiss
      </button>
    </div>
  );
}
