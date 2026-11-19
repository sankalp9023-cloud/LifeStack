import React from 'react';
import { MoreHorizontal } from 'lucide-react';

export default function CornerPanel({
  title,
  subtitle,
  showAction = true,
  actionIcon: ActionIcon = MoreHorizontal,
  onActionClick,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  children,
}) {
  return (
    <div className={`floating-glass-panel relative flex flex-col p-5 overflow-hidden group ${className}`}>
      {/* Subtle interior gradient reflection light catch */}
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-blue-300/[0.035] to-transparent pointer-events-none rounded-t-[inherit]" />

      {/* Header */}
      {(title || subtitle) && (
        <div className={`relative z-10 flex items-start justify-between pb-3 ${headerClassName}`}>
          <div>
            {title && (
              <h2 className="text-[14px] font-semibold tracking-wide text-slate-100 group-hover:text-cyan-100 transition-colors">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-[11px] font-medium text-slate-400 tracking-wider">
                {subtitle}
              </p>
            )}
          </div>

          {showAction && (
            <button
              type="button"
              onClick={onActionClick}
              aria-label="More options"
              className="text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] p-1 rounded-lg transition-colors"
            >
              <ActionIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Body Content */}
      <div className={`relative z-10 flex-1 flex flex-col ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
}

