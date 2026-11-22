import React, { useState } from 'react';
import useProjectData from '@/features/projects/hooks/useProjectData';
import ProjectsDashboard from '@/features/projects/components/ProjectsDashboard';
import ProjectList from '@/features/projects/components/ProjectList';
import ProjectDetail from '@/features/projects/components/ProjectDetail';
import ProjectForm from '@/features/projects/components/ProjectForm';
import Modal from '@/components/ui/Modal';
import '@/features/projects/projects.css';

export default function ProjectsPage() {
  const {
    projects,
    milestones,
    notes,
    resources,
    importantDates,
    activities,
    repository,
    tasks,
    taskRepository,
    error: storageError,
  } = useProjectData();

  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');

  const run = (action) => {
    try {
      action();
      setError(null);
      setNotice('Saved.');
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Operation failed.');
      setNotice('');
      return false;
    }
  };

  const handleSelectProject = (projectId) => {
    setSelectedProjectId(projectId);
    setIsCreatingProject(false);
    setError(null);
    setNotice('');
  };

  const handleBackToList = () => {
    setSelectedProjectId(null);
  };

  const scrollToProjects = (id = 'active-projects-panel') => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCreateSubmit = (input) => {
    let createdProject = null;
    const ok = run(() => {
      createdProject = repository.createProject(input);
    });
    if (ok && createdProject) {
      setIsCreatingProject(false);
      setSelectedProjectId(createdProject.id);
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="projects-page select-text min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-none space-y-5">
        {/* Alerts & Notifications */}
        {(storageError || error) && (
          <div role="alert" className="rounded border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
            {storageError ? `Storage error: ${storageError.message || storageError}` : error}
          </div>
        )}
        {notice && !error && !storageError && (
          <p role="status" className="text-sm text-blue-300 font-medium">
            {notice}
          </p>
        )}

        {/* Storage unavailable check */}
        {!repository || !taskRepository ? (
          <p className="text-sm text-slate-400">
            Projects system is unavailable because browser storage could not be initialized.
          </p>
        ) : selectedProject ? (
          <ProjectDetail
            project={selectedProject}
            milestones={milestones}
            tasks={tasks}
            notes={notes}
            resources={resources}
            importantDates={importantDates}
            activities={activities}
            repository={repository}
            taskRepository={taskRepository}
            run={run}
            onBack={handleBackToList}
            onSelectProject={handleSelectProject}
          />
        ) : (
          <div className="space-y-6">
            <section className="workspace-section-panel">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Project overview</h2>
                  <p className="text-sm text-slate-400">Progress, activity, and upcoming deadlines.</p>
                </div>
                <button type="button" onClick={() => scrollToProjects()} className="text-sm text-navy-200 underline underline-offset-4">Browse projects</button>
              </div>
              <ProjectsDashboard
                projects={projects}
                milestones={milestones}
                tasks={tasks}
                onSelectProject={handleSelectProject}
                onViewAllProjects={() => scrollToProjects()}
              />
            </section>

            <section id="active-projects-panel" className="workspace-section-panel min-w-0 scroll-mt-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">All projects</h2>
                    <p className="text-sm text-slate-400">{projects.length} total · use the status filter to browse archived projects</p>
                  </div>
                </div>
                <ProjectList
                  projects={projects}
                  milestones={milestones}
                  tasks={tasks}
                  onSelectProject={handleSelectProject}
                  onNewProject={() => setIsCreatingProject(true)}
                  repository={repository}
                  taskRepository={taskRepository}
                  run={run}
                />
            </section>
          </div>
        )}
        <Modal open={isCreatingProject} title="Create project" onClose={() => setIsCreatingProject(false)}>
          <ProjectForm onSubmit={handleCreateSubmit} onCancel={() => setIsCreatingProject(false)} />
        </Modal>
      </div>
    </div>
  );
}

