import React from 'react';
import CurrentVitalsPanel from '@/features/dashboard/components/CurrentVitalsPanel';
import VentureFluxListPanel from '@/features/dashboard/components/VentureFluxListPanel';
import ProjectsOverviewPanel from '@/features/dashboard/components/ProjectsOverviewPanel';
import StudyProgressPanel from '@/features/dashboard/components/StudyProgressPanel';

export default function DashboardPage() {
  return (
    <div className="dashboard-page relative w-full h-[calc(100vh-3.75rem)] min-h-[640px] overflow-hidden flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none">
      {/* Top Quadrant: Top-Left & Top-Right Corner Panels */}
      <div className="relative z-10 w-full flex flex-col sm:flex-row items-start justify-between gap-4 pointer-events-none">
        <div className="pointer-events-auto">
          <CurrentVitalsPanel />
        </div>
        <div className="pointer-events-auto self-end sm:self-auto">
          <ProjectsOverviewPanel />
        </div>
      </div>

      {/* Open center zone keeps the dashboard panels balanced. */}
      <div className="flex-1 pointer-events-none" />

      {/* Bottom Quadrant: Bottom-Left & Bottom-Right Corner Panels */}
      <div className="relative z-10 w-full flex flex-col sm:flex-row items-end justify-between gap-4 pointer-events-none">
        <div className="pointer-events-auto">
          <VentureFluxListPanel />
        </div>
        <div className="pointer-events-auto self-end sm:self-auto">
          <StudyProgressPanel />
        </div>
      </div>
    </div>
  );
}

