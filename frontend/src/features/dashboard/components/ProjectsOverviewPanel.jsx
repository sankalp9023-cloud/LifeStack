import React from 'react';
import CornerPanel from '@/components/panels/CornerPanel';

export default function ProjectsOverviewPanel({ className = '' }) {
  return (
    <CornerPanel
      title="Venture Flux"
      subtitle="Projects"
      showAction={true}
      className={`panel-top-right w-full sm:w-[280px] md:w-[310px] h-[230px] ${className}`}
    >
      <div className="relative w-full h-full flex items-center justify-center py-1">
        {/* Luminous Liquid 3D Orb matching reference */}
        <div className="relative w-40 h-40 flex items-center justify-center">
          {/* Ambient Glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/20 via-red-500/10 to-transparent blur-2xl pointer-events-none" />

          {/* Liquid Outer Morphing Ring */}
          <div
            className="absolute inset-1 border border-blue-300/45 rounded-full opacity-85 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 32% 28%, rgba(39, 186, 255, 0.24) 0%, rgba(255, 64, 88, 0.12) 55%, rgba(3, 12, 25, 0.7) 100%)',
              boxShadow:
                'inset 0 0 24px rgba(39, 186, 255, 0.18), 0 0 20px rgba(39, 186, 255, 0.1)',
            }}
          />

          {/* Secondary Counter-Rotating Wave Silhouette */}
          <div
            className="absolute inset-3 border border-red-300/20 rounded-full opacity-60 pointer-events-none"
            style={{
              animationDirection: 'reverse',
              animationDuration: '14s',
              background:
                'radial-gradient(circle at 68% 68%, rgba(255, 64, 88, 0.16) 0%, transparent 60%)',
            }}
          />

          {/* Tertiary Subtle Depth Ring */}
          <div className="absolute inset-6 rounded-full border border-blue-300/20 pointer-events-none" />

          {/* Central Stat Counter */}
          <div className="relative z-10 text-center flex flex-col items-center justify-center drop-shadow-lg">
            <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white via-blue-100 to-blue-300 bg-clip-text text-transparent">
              32+
            </span>
            <span className="text-[11.5px] font-semibold tracking-wider text-slate-300/90 uppercase mt-0.5">
              Projects
            </span>
          </div>

          {/* Specular glass reflection highlights */}
          <div className="absolute top-4 left-6 w-9 h-4 rounded-full bg-white/30 blur-[2px] rotate-[-28deg] pointer-events-none" />
        </div>
      </div>
    </CornerPanel>
  );
}

