# LifeStack — Current Architecture

## System shape

LifeStack's product data currently lives in a browser-based React single-page app. React Router selects pages inside a shared layout, and feature repositories persist versioned records in `localStorage`. The TypeScript/Fastify API provides PostgreSQL connectivity, email/password and Google account sign-in, and server-side sessions; feature data routes and frontend API integration remain unimplemented.

```text
Browser
├── RootLayout + top navigation
├── Pages: Dashboard, Study, Projects, Tasks, Settings
├── Feature modules
│   ├── dashboard: cross-module read-only summaries
│   ├── study: studyRepository + studyMetrics
│   ├── projects: projectRepository + projectMetrics
│   ├── tasks: taskRepository
│   └── settings: settingsStore + backup/reminder services
└── localStorage (versioned feature records and backups)

Planned: frontend services → authenticated versioned API → PostgreSQL feature repositories
```

## Frontend stack and entry points

- React, JavaScript modules, Vite, Tailwind CSS, React Router, and Lucide icons.
- `frontend/src/main.jsx` mounts the app; `App.jsx` installs settings and routing; `routes/AppRoutes.jsx` maps URLs to pages; `layouts/RootLayout.jsx` provides the viewport shell and navigation.
- `frontend/src/pages/` contains route-level composition. Domain logic and feature UI live under `frontend/src/features/`.
- Shared UI lives under `frontend/src/components/`; global theme tokens and primitives are defined in `frontend/src/styles/index.css` and `frontend/tailwind.config.js`.
- Responsive pages fill the available viewport width, use the browser's dynamic viewport height, and scroll within the content area when their content exceeds the view.

## Feature boundaries

| Area | Data owner | Main behavior |
|---|---|---|
| Dashboard | No separate repository | Reads Study, Projects, Tasks, and Settings stores; derives summary and progress values. |
| Study | `features/study/data/studyRepository.js` | Subjects, chapters, topics, learning activities, notes, revisions, practice sessions, assessments, and study sessions. Metrics are in `studyMetrics.js`. |
| Projects | `features/projects/data/projectRepository.js` | Projects, milestones, notes, resources, important dates, and activity. Metrics are in `projectMetrics.js`. |
| Tasks | `services/taskRepository.js` | Personal and project-linked tasks, subtasks, status, dates, and categories. |
| Settings | `features/settings/data/settingsStore.js` | Validated preferences, browser notifications, backups, import, and export. |

Repository hooks subscribe to changes and storage events so views can refresh when data changes in the current browser profile. Project data composes the task store to support project-linked tasks.

## Current persistence

| Data | Storage key | Record shape |
|---|---|---|
| Study | `lifestack.study.v1` | Versioned object containing the Study collections. |
| Projects | `lifestack.projects.v1` | Collections for projects, milestones, notes, resources, important dates, and activities. |
| Tasks | `lifestack.tasks.v1` | Tasks collection. |
| Settings | `lifestack.settings.v1` | Versioned validated settings object. |
| Manual backups | `lifestack.backups.v1` | Browser-local backup records. |

Local storage is not a secure multi-user database and does not synchronize between browsers or devices. The current app has data export/import and backup support; the future backend plan describes how to transition without discarding those records.

## Derived progress

Dashboard and feature charts derive progress from current records. Study completion is calculated from completed learning requirements. Task completion uses task status. Project progress is derived from linked tasks and milestones, with the existing project completion rule. These values are not historical snapshots, so the current graphs show a present-state comparison rather than a timeline.

## Backend boundary

The backend currently has only a minimal TypeScript/Fastify API foundation and liveness route; domain persistence remains planned. Proposed API and data ownership boundaries are documented in [Backend Plan](BACKEND_PLAN.md) and [Backend Data Model](BACKEND_DATA_MODEL.md). Frontend components should continue to consume hooks/repositories; future API transport should be introduced behind those data boundaries rather than inside visual components.

The reviewed PostgreSQL schema and idempotent local-data migration plan are in
[Data Model and Migration](DATA_MODEL_AND_MIGRATION.md) and
[backend/prisma/migrations/20261122000000_initial/migration.sql](../backend/prisma/migrations/20261122000000_initial/migration.sql).
