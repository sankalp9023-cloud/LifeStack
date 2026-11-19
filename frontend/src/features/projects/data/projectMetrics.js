export function getDaysDiff(targetDateString, fromDate = new Date()) {
  if (!targetDateString) return null;
  const target = new Date(targetDateString);
  if (Number.isNaN(target.getTime())) return null;

  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const fromMidnight = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());

  const diffMs = targetMidnight.getTime() - fromMidnight.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function calculateProjectMetrics(project, milestones = [], tasks = []) {
  if (!project) return null;

  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter((t) => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const projectMilestones = milestones.filter((m) => m.projectId === project.id);
  const totalMilestones = projectMilestones.length;
  const completedMilestones = projectMilestones.filter((m) => m.completed).length;
  const pendingMilestones = totalMilestones - completedMilestones;
  const milestoneProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  // Calculate overall progress:
  // If tasks exist, task completion drives the primary progress (weighted).
  // If no tasks exist but milestones exist, milestones drive progress.
  // Otherwise 0.
  let overallProgress = 0;
  if (totalTasks > 0 && totalMilestones > 0) {
    // 70% weight on tasks, 30% weight on milestones
    overallProgress = Math.round((taskProgress * 0.7) + (milestoneProgress * 0.3));
  } else if (totalTasks > 0) {
    overallProgress = taskProgress;
  } else if (totalMilestones > 0) {
    overallProgress = milestoneProgress;
  } else if (project.status === 'completed') {
    overallProgress = 100;
  }

  // Cap between 0 and 100
  overallProgress = Math.max(0, Math.min(100, overallProgress));

  // Deadline calculations
  const daysDiff = getDaysDiff(project.deadline);
  const isCompleted = project.status === 'completed';
  const isArchived = project.status === 'archived';

  let isOverdue = false;
  let daysOverdue = 0;
  let daysRemaining = null;
  let urgency = 'on_track';

  if (daysDiff !== null) {
    if (daysDiff < 0) {
      if (!isCompleted && !isArchived) {
        isOverdue = true;
        daysOverdue = Math.abs(daysDiff);
        urgency = 'overdue';
      } else {
        urgency = 'completed';
      }
    } else {
      daysRemaining = daysDiff;
      if (isCompleted) {
        urgency = 'completed';
      } else if (daysDiff <= 3) {
        urgency = 'critical';
      } else if (daysDiff <= 7) {
        urgency = 'due_soon';
      } else {
        urgency = 'on_track';
      }
    }
  } else {
    urgency = isCompleted ? 'completed' : 'no_deadline';
  }

  return {
    totalTasks,
    completedTasks,
    pendingTasks,
    taskProgress,
    totalMilestones,
    completedMilestones,
    pendingMilestones,
    milestoneProgress,
    overallProgress,
    isOverdue,
    daysOverdue,
    daysRemaining,
    urgency,
  };
}

export function calculateMilestoneMetrics(milestone, tasks = []) {
  if (!milestone) return null;
  const milestoneTasks = tasks.filter((t) => t.milestoneId === milestone.id);
  const totalTasks = milestoneTasks.length;
  const completedTasks = milestoneTasks.filter((t) => t.completed).length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (milestone.completed ? 100 : 0);

  const daysDiff = getDaysDiff(milestone.dueDate);
  const isOverdue = !milestone.completed && daysDiff !== null && daysDiff < 0;

  return {
    totalTasks,
    completedTasks,
    pendingTasks: totalTasks - completedTasks,
    progress,
    isOverdue,
    daysDiff,
  };
}

export function calculateDashboardMetrics(projects = [], milestones = [], tasks = []) {
  const nonArchived = projects.filter((p) => p.status !== 'archived');
  const activeProjects = projects.filter((p) => p.status === 'active');
  const completedProjects = projects.filter((p) => p.status === 'completed');
  const onHoldProjects = projects.filter((p) => p.status === 'on_hold');
  const notStartedProjects = projects.filter((p) => p.status === 'not_started');
  const archivedProjects = projects.filter((p) => p.status === 'archived');

  // Overall average progress across active projects
  let totalActiveProgress = 0;
  activeProjects.forEach((p) => {
    const metrics = calculateProjectMetrics(p, milestones, tasks);
    totalActiveProgress += metrics.overallProgress;
  });
  const averageActiveProgress = activeProjects.length > 0
    ? Math.round(totalActiveProgress / activeProjects.length)
    : 0;

  // Upcoming deadlines (projects and milestones within 30 days)
  const upcomingDeadlines = [];
  const overdueItems = [];

  nonArchived.forEach((p) => {
    if (p.deadline && p.status !== 'completed') {
      const daysDiff = getDaysDiff(p.deadline);
      if (daysDiff !== null) {
        const item = {
          id: p.id,
          type: 'project',
          title: p.name,
          projectId: p.id,
          projectName: p.name,
          date: p.deadline,
          daysDiff,
          status: p.status,
        };
        if (daysDiff < 0) {
          overdueItems.push(item);
        } else if (daysDiff <= 30) {
          upcomingDeadlines.push(item);
        }
      }
    }
  });

  milestones.forEach((m) => {
    if (m.dueDate && !m.completed) {
      const parentProject = projects.find((p) => p.id === m.projectId);
      if (parentProject && parentProject.status !== 'archived' && parentProject.status !== 'completed') {
        const daysDiff = getDaysDiff(m.dueDate);
        if (daysDiff !== null) {
          const item = {
            id: m.id,
            type: 'milestone',
            title: m.name,
            projectId: parentProject.id,
            projectName: parentProject.name,
            date: m.dueDate,
            daysDiff,
            status: 'pending',
          };
          if (daysDiff < 0) {
            overdueItems.push(item);
          } else if (daysDiff <= 30) {
            upcomingDeadlines.push(item);
          }
        }
      }
    }
  });

  upcomingDeadlines.sort((a, b) => a.daysDiff - b.daysDiff);
  overdueItems.sort((a, b) => a.daysDiff - b.daysDiff);

  // Recently updated projects
  const recentlyUpdated = [...nonArchived]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 5);

  return {
    totalProjects: nonArchived.length,
    activeProjects: activeProjects.length,
    completedProjects: completedProjects.length,
    onHoldProjects: onHoldProjects.length,
    notStartedProjects: notStartedProjects.length,
    archivedProjects: archivedProjects.length,
    averageActiveProgress,
    upcomingDeadlines,
    overdueItems,
    recentlyUpdated,
  };
}
