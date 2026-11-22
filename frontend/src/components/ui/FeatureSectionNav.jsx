import React from 'react';

export default function FeatureSectionNav({ label, items, activeId, onChange }) {
  return (
    <nav className="hud-section-nav flex flex-wrap gap-2" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          aria-current={activeId === item.id ? 'page' : undefined}
          className={`hud-section-nav-button border px-3 py-1.5 text-sm ${
            activeId === item.id
              ? 'is-active font-medium'
              : 'text-slate-300'
          }`}
        >
          {item.label}{item.count !== undefined ? ` (${item.count})` : ''}
        </button>
      ))}
    </nav>
  );
}

