# LifeStack

LifeStack is a responsive personal productivity app for study tracking, projects, tasks, and personal settings. The current client is a React single-page application; its feature data is persisted in the browser. A minimal TypeScript/Fastify API foundation is initialized; domain APIs and database persistence are not yet implemented.

## Repository

```text
LifeStack/
├── frontend/   # React + Vite application
├── backend/    # TypeScript/Fastify API foundation
├── docs/       # Product, architecture, design, and implementation plans
└── assets/     # Brand and visual reference material
```

## Current features

- **Dashboard:** Live summaries from Study, Projects, Tasks, and reminder settings; overall progress across trackable modules.
- **Study:** Subjects, chapters, topics, learning activities, notes, revisions, practice sessions, assessments, study sessions, and progress charts.
- **Projects:** Projects, milestones, notes, resources, important dates, activity, linked tasks, project status and progress charts.
- **Tasks:** Personal and project-linked tasks, status, due dates, categories, tags, subtasks, and task analytics.
- **Settings:** General and appearance preferences, notifications, module preferences, data export/import, backups, and system information.

Progress charts use the records already stored by each feature. They do not yet represent historical progress snapshots.

## Technology

- React 18, JavaScript, Vite, Tailwind CSS
- React Router and Lucide icons
- Versioned browser `localStorage` repositories for Study, Projects, Tasks, and Settings
- Backend currently exposes a liveness check only; no database, authentication, or cloud sync is implemented

## Run the frontend

Requirements: Node.js 18 or newer and npm.

```bash
cd frontend
npm install
npm run dev
```

Other frontend scripts: `npm run build`, `npm run preview`, and `npm test`.

## Documentation

- [Project overview](docs/PROJECT_OVERVIEW.md)
- [Current architecture](docs/ARCHITECTURE.md)
- [Design guidelines](docs/DESIGN_GUIDELINES.md)
- [Development roadmap](docs/DEVELOPMENT_ROADMAP.md)
- [Backend plan](docs/BACKEND_PLAN.md)
- [Backend data model and migration plan](docs/BACKEND_DATA_MODEL.md)
- [OpenAPI contract draft](docs/lifestack-api-v1.openapi.yaml)
- [Backend folder entry point](backend/README.md)
