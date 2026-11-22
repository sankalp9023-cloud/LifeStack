import React from 'react';
import useSettings from '@/features/settings/hooks/useSettings';
import { formatSettingsDateTime } from '@/features/settings/data/settingsFormatters';

export default function ActivityLog({ project, activities = [] }) {
  const { settings } = useSettings();
  const projectActivities = activities.filter((a) => a.projectId === project.id);

  return (
    <div className="space-y-4">
      <div className="pb-2">
        <h3 className="text-lg font-semibold text-slate-100">
          Activity History ({projectActivities.length})
        </h3>
        <p className="text-xs text-slate-400">
          Audit trail of modifications, milestone achievements, status transitions, and task lifecycle events.
        </p>
      </div>

      {projectActivities.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">
          No recorded activity for this project yet.
        </p>
      ) : (
        <div className="space-y-2">
          {projectActivities.map((act) => {
            const timeFormatted = formatSettingsDateTime(act.timestamp, settings);

            return (
              <div
                key={act.id}
                className="rounded border border-slate-800 bg-slate-900/30 p-2.5 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <span className="font-mono text-[10px] uppercase font-bold text-slate-400">
                    [{act.type.replace(/_/g, ' ')}]
                  </span>
                  <p className="text-slate-200">{act.description}</p>
                </div>
                <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                  {timeFormatted}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

