import React from 'react';
import { CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import CornerPanel from '@/components/panels/CornerPanel';
import useTaskData from '@/hooks/useTaskData';

export default function VentureFluxListPanel({ className = '' }) {
  const { tasks, error } = useTaskData();
  const activityItems = [...tasks]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    .slice(0, 4);

  return (
    <CornerPanel
      title="Task activity"
      subtitle="Tasks"
      showAction={true}
      className={`panel-bottom-left w-full min-w-0 ${className}`}
      bodyClassName="space-y-1 pt-1"
    >
      {error ? <p className="px-2 py-3 text-xs text-red-300">Task data is unavailable.</p> : activityItems.length ? activityItems.map((item) => (
          <Link to="/tasks" key={item.id}
            className="dashboard-activity-row flex items-center justify-between rounded-xl border px-2.5 py-2 transition-colors duration-200 cursor-pointer group/item"
          >
            <div className="flex items-center gap-3">
              {/* Icon Capsule */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center border bg-navy-800/55 text-navy-200 border-navy-300/15 transition-transform group-hover/item:scale-105"
              >
                <CheckSquare className="w-4 h-4" />
              </div>

              {/* Text Meta */}
              <div>
                <h3 className="text-[12.5px] font-medium text-slate-200 group-hover/item:text-white transition-colors leading-tight">
                  {item.title}
                </h3>
                <p className="text-[10.5px] text-slate-400 font-normal leading-tight">
                  {item.status === 'completed' ? 'Completed' : item.status === 'in_progress' ? 'In progress' : 'To do'}{item.category ? ` · ${item.category}` : ''}
                </p>
              </div>
            </div>

            {/* Time / Metric Badge */}
            <span
              className="text-[11px] font-mono tracking-tight px-2 py-0.5 rounded-md bg-black/20 text-navy-200/80"
            >
              {item.dueDate ? new Date(`${item.dueDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : item.status === 'completed' ? 'Done' : 'Open'}
            </span>
          </Link>
        )) : <p className="px-2 py-3 text-xs text-slate-400">No tasks yet. Create a task to see your activity here.</p>}
    </CornerPanel>
  );
}

