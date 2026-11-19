# Feature Modules

This directory contains self-contained feature slices following a domain-driven structure:

- **`dashboard/`**: Neural core orchestration, orbital widget data, layout coordinates, and active metrics.
- **`study/`**: Persisted subject/chapter/topic management, learning activities, notes, revision history, practice, assessments, and study dashboards.
- **`projects/`**: Persisted project tracking, milestones, notes, resources, important dates, and activity history.
- **`settings/`**: Shared preference schemas, local persistence, browser notifications, app-wide backup/restore, and system information.
- **`services/taskRepository.js`**: Shared persisted task data linked to projects and milestones.

### Feature Structure Convention:
Each feature directory contains:
- `components/`: Components exclusive to this feature domain.
- `data/`: Feature-specific models, persistence, metrics, and test fixtures.
- `hooks/`: Feature-scoped React hooks managing feature logic and state subscriptions.
