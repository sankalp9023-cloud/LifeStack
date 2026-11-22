# Feature Modules

Each feature owns its domain components and data logic. Route components under `pages/` compose these modules; shared primitives belong in `components/` and should not depend on feature repositories.

| Directory | Responsibility |
|---|---|
| `dashboard/` | Read-only summaries composed from Study, Projects, Tasks, and Settings. Progress values are derived from feature data. |
| `study/` | Subjects, chapters, topics, learning activities, notes, revisions, practice, assessments, study sessions, metrics, and charts. |
| `projects/` | Projects, milestones, notes, resources, important dates, activity, project-linked task views, metrics, and charts. |
| `tasks/` | Task views, task analytics, and task-specific presentation. Persistence is currently owned by `src/services/taskRepository.js`. |
| `settings/` | Preference schema/store, reminders, notifications, backups, import/export, and system information. |

## Module conventions

- `components/`: feature-only presentation and interaction components.
- `data/`: repository/store implementations, schemas, metrics, and data-focused tests.
- `hooks/`: React subscriptions to feature repositories.
- Keep relationships and validation in the data layer, not in visual components.
- Keep cross-feature dashboard code read-only; mutations remain with the owning feature.
- Do not duplicate stored progress. Derive it from the source records unless a historical snapshot model is deliberately added.
