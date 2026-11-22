# LifeStack Frontend

The frontend is a responsive React single-page application built with Vite, Tailwind CSS, React Router, and JavaScript. It is currently local-first and has no API dependency.

## Source layout

```text
src/
├── components/       # Shared navigation, panels, and UI primitives
├── constants/        # Route and app constants
├── context/          # Settings provider
├── features/
│   ├── dashboard/    # Cross-module summaries and progress graph
│   ├── projects/     # Project UI, repository, metrics, charts
│   ├── settings/     # Settings, reminders, backup and export
│   ├── study/        # Study UI, repository, metrics, charts
│   └── tasks/        # Task UI and analytics
├── hooks/            # Shared data hooks (including task subscription)
├── layouts/          # Responsive app shell
├── pages/            # Route-level composition
├── routes/           # React Router configuration
├── services/         # Task persistence and service abstractions
├── styles/           # Shared tokens and global primitives
└── utils/            # Shared helpers
```

## Data boundary

Each feature reads and mutates records through its repository/store and React hook. Components should not read `localStorage` directly. Dashboard components compose read-only feature hooks and derive cross-module summaries. Keep API transport behind the repository/service boundaries when the backend is introduced.

Current storage keys are `lifestack.study.v1`, `lifestack.projects.v1`, `lifestack.tasks.v1`, and `lifestack.settings.v1`. Manual backups use `lifestack.backups.v1`. See [system architecture](../docs/ARCHITECTURE.md) and [backend migration plan](../docs/BACKEND_DATA_MODEL.md).

## Commands

- `npm run dev` — start Vite development server.
- `npm run build` — build the production bundle.
- `npm run preview` — preview the production bundle.
- `npm test` — run the Node test suite.

## Responsive layout

`RootLayout` sizes the application to the dynamic browser viewport. Route pages fill available width and scroll their own content. Grids collapse at narrower widths; avoid fixed widths or viewport-height values based on an assumed navbar size.
