import React from 'react';
import { Folder, GraduationCap, Sparkles, Settings } from 'lucide-react';
import CornerPanel from '@/components/panels/CornerPanel';

export default function VentureFluxListPanel({ className = '' }) {
  const activityItems = [
    {
      id: 'item-1',
      title: 'Venture Flux',
      subtitle: 'Study · Extra workout',
      badge: '12 am',
      icon: Folder,
      iconBg: 'bg-red-500/20 text-red-300 border-red-500/30',
      badgeBg: 'text-red-300/80',
    },
    {
      id: 'item-2',
      title: 'Knowledge Sphere',
      subtitle: 'Study · Extra focus',
      badge: '10 web',
      icon: GraduationCap,
      iconBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      badgeBg: 'text-cyan-300/80',
    },
    {
      id: 'item-3',
      title: 'Creative Flux',
      subtitle: 'Study · Extra bench',
      badge: '18m 18',
      icon: Sparkles,
      iconBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      badgeBg: 'text-blue-300/80',
    },
    {
      id: 'item-4',
      title: 'Settings',
      subtitle: 'System',
      badge: '30 min',
      icon: Settings,
      iconBg: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      badgeBg: 'text-slate-400',
    },
  ];

  return (
    <CornerPanel
      title="Venture Flux"
      subtitle="Projects"
      showAction={true}
      className={`panel-bottom-left w-full sm:w-[330px] md:w-[350px] ${className}`}
      bodyClassName="space-y-2 pt-1"
    >
      {activityItems.map((item) => {
        const IconComponent = item.icon;
        return (
          <div
            key={item.id}
            className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.025] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/[0.1] transition-all duration-200 cursor-pointer group/item"
          >
            <div className="flex items-center gap-3">
              {/* Icon Capsule */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center border ${item.iconBg} shadow-sm group-hover/item:scale-105 transition-transform`}
              >
                <IconComponent className="w-4 h-4" />
              </div>

              {/* Text Meta */}
              <div>
                <h3 className="text-[12.5px] font-medium text-slate-200 group-hover/item:text-white transition-colors leading-tight">
                  {item.title}
                </h3>
                <p className="text-[10.5px] text-slate-400 font-normal leading-tight">
                  {item.subtitle}
                </p>
              </div>
            </div>

            {/* Time / Metric Badge */}
            <span
              className={`text-[11px] font-mono tracking-tight px-2 py-0.5 rounded-md bg-black/20 ${item.badgeBg}`}
            >
              {item.badge}
            </span>
          </div>
        );
      })}
    </CornerPanel>
  );
}

