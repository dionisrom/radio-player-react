import React from 'react';

export default function Spinner({ className = '' }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" role="status" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
