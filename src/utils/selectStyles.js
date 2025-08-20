const selectStyles = (theme) => ({
  control: (base, state) => {
  const isDark = theme === 'dark';
  // Higher-contrast dark glass background and stronger border for readability
  // In light mode we want a white-ish background with dark text for consistency
  const glassBg = isDark ? 'rgba(8,10,12,0.62)' : 'rgba(255,255,255,0.96)';
  const baseBorder = isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)';
    const focusRing = '0 0 0 2px var(--accent, #3b82f6)';
    const baseShadow = isDark ? '0 10px 40px 0 rgba(0,0,0,0.6)' : '0 8px 32px 0 rgba(31,38,135,0.04)';
    return {
      ...base,
      backgroundColor: glassBg,
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      borderRadius: '0.75rem',
      border: state.isFocused ? `2px solid var(--accent, #3b82f6)` : baseBorder,
      boxShadow: state.isFocused ? `${focusRing}, 0 8px 32px 0 rgba(31,38,135,0.12)` : baseShadow,
      minHeight: '2.5rem',
      fontSize: '1rem',
  color: isDark ? 'var(--glass-fg, #e6eef8)' : 'var(--glass-fg, #1e293b)',
      padding: '0.5rem 0.75rem',
      transition: 'border-color 0.18s, box-shadow 0.18s, background-color 0.18s',
      outline: state.isFocused ? `2px solid var(--accent, #3b82f6)` : 'none',
      outlineOffset: '0',
      boxSizing: 'border-box',
      backdropBlendMode: 'overlay',
    };
  },
  valueContainer: (base) => ({
    ...base,
    padding: 0,
    paddingLeft: 0,
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    color: theme === 'dark' ? '#e6eef8' : '#1e293b',
    fontSize: '1rem',
    backgroundColor: 'transparent',
  }),
  menu: (base) => ({
    ...base,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderRadius: '0.75rem',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.12)',
    zIndex: 9999,
    fontSize: '1rem',
    // Use a dark glass background in dark mode to avoid white-on-white menu items
    backgroundColor: theme === 'dark' ? 'rgba(6,8,10,0.72)' : 'var(--glass-bg-menu, rgba(255,255,255,0.9))',
    border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.18)',
  }),
  menuPortal: base => ({
    ...base,
    zIndex: 9999,
  }),
  multiValue: (base) => {
    const isDark = theme === 'dark';
    return {
      ...base,
      display: 'inline-flex',
      alignItems: 'center',
      height: '1.9rem',
      margin: '2px',
      // Light: subtle gray pill; Dark: light translucent pill
      backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(243,244,246,1)',
      borderRadius: '0.5rem',
      color: isDark ? 'var(--glass-fg, #e6eef8)' : 'var(--glass-fg, #1e293b)',
      fontWeight: 600,
      padding: '0 6px',
      border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(15,23,42,0.06)',
      boxSizing: 'border-box',
    }
  },
  multiValueLabel: (base) => {
    const isDark = theme === 'dark';
    return {
      ...base,
      color: isDark ? 'var(--glass-fg, #e6eef8)' : 'var(--glass-fg, #1e293b)',
      fontWeight: 600,
      padding: '0 6px',
      fontSize: '0.95rem',
      lineHeight: '1.9rem',
    }
  },
  multiValueRemove: (base) => {
    const isDark = theme === 'dark';
    return {
      ...base,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: isDark ? 'var(--glass-fg, #e6eef8)' : 'var(--glass-fg, #1e293b)',
      backgroundColor: 'transparent',
      borderRadius: '0.25rem',
      padding: '0 6px',
      cursor: 'pointer',
      ':hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.08)', color: isDark ? 'var(--glass-fg, #e6eef8)' : 'var(--glass-fg, #1e293b)' },
    }
  },
  option: (base, state) => {
    // Soften the accent on hover/selected so the menu is less visually aggressive.
    const hoverBg = 'rgba(59,130,246,0.08)';
    const selectedBg = 'rgba(59,130,246,0.12)';
    const isDark = theme === 'dark';
    return {
      ...base,
      backgroundColor: state.isSelected ? selectedBg : state.isFocused ? hoverBg : 'transparent',
      color: isDark ? 'var(--glass-fg, #e6eef8)' : 'var(--glass-fg, #1e293b)',
      padding: '8px 12px',
      cursor: 'pointer',
    };
  },
  placeholder: (base, state) => ({
    ...base,
    color: theme === 'dark' ? '#cbd5e1' : '#9ca3af',
    fontWeight: 400,
    fontSize: '1rem',
  }),
  singleValue: (base) => {
    const isDark = theme === 'dark';
    return {
      ...base,
      color: isDark ? 'var(--glass-fg, #e6eef8)' : 'var(--glass-fg, #1e293b)',
      fontSize: '1rem',
    };
  },
  menuList: (base) => ({
    ...base,
    maxHeight: '240px',
    padding: 0,
  }),
});

export default selectStyles;
