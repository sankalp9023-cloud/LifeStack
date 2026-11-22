import React from 'react';

export default function FeaturePageHeader({ title, description, actionLabel, onAction }) {
  return (
    <header className="hud-page-header flex flex-wrap items-center justify-between gap-3 pb-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="hud-action-button bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500 shadow-sm">
          {actionLabel}
        </button>
      )}
    </header>
  );
}

