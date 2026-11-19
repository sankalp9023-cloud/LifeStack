import React, { useState } from 'react';
import useProjectData from '@/features/projects/hooks/useProjectData';
import ProjectsDashboard from '@/features/projects/components/ProjectsDashboard';
import ProjectList from '@/features/projects/components/ProjectList';
import ProjectDetail from '@/features/projects/components/ProjectDetail';
import ProjectForm from '@/features/projects/components/ProjectForm';
import FeaturePageHeader from '@/components/ui/FeaturePageHeader';
import FeatureSectionNav from '@/components/ui/FeatureSectionNav';
import Modal from '@/components/ui/Modal';

const SECTIONS = [
  ['projects', 'All Projects'],
  ['archived', 'Archived'],
];

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

  const [section, setSection] = useState('dashboard');
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
    <div className="select-text flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <FeaturePageHeader
          title="Projects"
          description="Manage larger objectives, ongoing initiatives, software development, and milestones."
          actionLabel="+ New Project"
          onAction={() => {
            setSelectedProjectId(null);
            setIsCreatingProject(true);
          }}
        />

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

        {/* Top Section Navigation (shown when not viewing a single project detail) */}
        {!selectedProject && (
          <FeatureSectionNav
            label="Projects sections"
            activeId={section}
            onChange={(id) => { setSection(id); setNotice(''); }}
            items={SECTIONS.map(([id, label]) => ({
              id,
              label,
              ...(id === 'projects' ? { count: projects.filter((project) => project.status !== 'archived').length } : {}),
              ...(id === 'archived' ? { count: projects.filter((project) => project.status === 'archived').length } : {}),
            }))}
          />
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
          <>
            {section === 'dashboard' && (
              <ProjectsDashboard
                projects={projects}
                milestones={milestones}
                tasks={tasks}
                onSelectProject={handleSelectProject}
                onViewAllProjects={() => setSection('projects')}
              />
            )}

            {section === 'projects' && (
              <ProjectList
                projects={projects.filter((p) => p.status !== 'archived')}
                milestones={milestones}
                tasks={tasks}
                onSelectProject={handleSelectProject}
                onNewProject={() => setIsCreatingProject(true)}
                repository={repository}
                taskRepository={taskRepository}
                run={run}
              />
            )}

            {section === 'archived' && (
              <ProjectList
                projects={projects.filter((p) => p.status === 'archived')}
                milestones={milestones}
                tasks={tasks}
                onSelectProject={handleSelectProject}
                onNewProject={() => setIsCreatingProject(true)}
                repository={repository}
                taskRepository={taskRepository}
                run={run}
              />
            )}
          </>
        )}
        <Modal open={isCreatingProject} title="Create project" onClose={() => setIsCreatingProject(false)}>
          <ProjectForm onSubmit={handleCreateSubmit} onCancel={() => setIsCreatingProject(false)} />
        </Modal>
      </div>
    </div>
  );
}

