# LifeStack — Frontend Application

## Overview

The LifeStack client is built with **React**, **Vite**, **Tailwind CSS**, and modern JavaScript (ES6+). It provides a modular local-first personal management application.

## Design Identity & Structure

- **Navigation:** Compact top toolbar (`src/components/navigation/TopNavbar.jsx`). Left sidebar is strictly omitted.
- **Dashboard:** Central neural core architecture with surrounding orbital glass panels.
- **Styling:** Tailwind utility tokens augmented with specialized glassmorphism and organic curve styling rules in `src/styles/`.
- **Modularity:** Isolated feature domains in `src/features/` (`dashboard`, `study`, `projects`).

## Directory Layout

```text
src/
├── assets/          # Static media bundled with the app
├── components/      # Common primitives, navigation, panels, UI
├── layouts/         # Base layout scaffolding (e.g. RootLayout)
├── pages/           # Route views (Dashboard, Study, Projects, Settings)
├── features/        # Feature modules with components, data, and hooks
├── hooks/           # Global reusable React hooks
├── context/         # Application-level contexts
├── services/        # Service abstraction and data fetching
├── utils/           # Utility functions
├── constants/       # Global constants and route definitions
├── styles/          # Tailwind setup and custom CSS effects
└── routes/          # Application router configuration
```

## Available Scripts

- `npm run dev`: Launch local Vite dev server on port `5173`.
- `npm run build`: Compile production-ready bundle to `dist/`.
- `npm run preview`: Preview production build locally.
- `npm test`: Run the Node.js test suite.

## Study data

The Study feature stores its normalized records in browser local storage under
`lifestack.study.v1`. The versioned record contains subjects, chapters, topics,
learning activities, notes, revision records, practice sessions, assessments,
and study sessions. Study data is browser-local and is not synchronized to a
server.

The Settings feature stores validated preferences separately under
`lifestack.settings.v1`. App backups cover Settings, Study, Projects, and Tasks;
manual backups remain in this browser profile, while exports are downloadable
JSON files. Browser reminders require the app to be open and desktop
notification permission to be granted.
