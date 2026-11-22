import React from 'react';
import CurrentVitalsPanel from '@/features/dashboard/components/CurrentVitalsPanel';
import VentureFluxListPanel from '@/features/dashboard/components/VentureFluxListPanel';
import ProjectsOverviewPanel from '@/features/dashboard/components/ProjectsOverviewPanel';
import StudyProgressPanel from '@/features/dashboard/components/StudyProgressPanel';
import OverallProgressPanel from '@/features/dashboard/components/OverallProgressPanel';
import '@/features/dashboard/dashboard.css';

export default function DashboardPage() {
  return (
    <div className="dashboard-page relative h-full min-h-full w-full min-w-0 overflow-x-hidden overflow-y-auto flex flex-col justify-between gap-4 p-4 sm:gap-6 sm:p-6 xl:p-8 select-none">
      {/* Top Quadrant: Top-Left & Top-Right Corner Panels */}
      <div className="relative z-10 w-full flex flex-col sm:flex-row items-start justify-between gap-4 pointer-events-none">
        <div className="pointer-events-auto min-w-0 flex-1">
          <CurrentVitalsPanel />
        </div>
        <div className="pointer-events-auto min-w-0 flex-1 self-end sm:self-auto">
          <ProjectsOverviewPanel />
        </div>
      </div>

      {/* Open center zone keeps the dashboard panels balanced. */}
      <div className="dashboard-center relative z-10 flex flex-1 items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-full min-w-0 px-0 sm:px-4">
          <OverallProgressPanel />
        </div>
      </div>

      {/* Bottom Quadrant: Bottom-Left & Bottom-Right Corner Panels */}
      <div className="relative z-10 w-full flex flex-col sm:flex-row items-end justify-between gap-4 pointer-events-none">
        <div className="pointer-events-auto min-w-0 flex-1">
          <VentureFluxListPanel />
        </div>
        <div className="pointer-events-auto min-w-0 flex-1 self-end sm:self-auto">
          <StudyProgressPanel />
        </div>
      </div>
    </div>
  );
}

