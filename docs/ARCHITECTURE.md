# LifeStack — System Architecture & Standards

## 1. High-Level Architecture

LifeStack adopts a decoupled **Frontend-First Architecture**. The client-side application is entirely self-sufficient in layout, state orchestration, routing, and component presentation.

```
┌─────────────────────────────────────────────────────────────┐
│                      LifeStack Client                       │
├─────────────────────────────────────────────────────────────┤
│  Top Navigation Toolbar (Compact, Persistent, Non-Sidebar) │
├─────────────────────────────────────────────────────────────┤
│  View Router (React Router v6+)                             │
│  ├─ /           (Configured default landing route)          │
│  ├─ /dashboard  (Dashboard - Neural Brain Core & Orbitals)  │
│  ├─ /study      (Study Management & Cognitive Tracking)     │
│  ├─ /projects   (Project & Task Lifecycle Execution)        │
│  └─ /settings   (System Preferences & Customization)        │
├─────────────────────────────────────────────────────────────┤
│  Feature Modules (Modular Hooks, Services, Component Trees) │
│  ├─ features/dashboard                                      │
│  ├─ features/study                                          │
│  ├─ features/projects                                       │
│  └─ services/taskRepository                                 │
├─────────────────────────────────────────────────────────────┤
│  Shared Foundation                                          │
│  ├─ Common UI & Glass Panels (translucent, curved)          │
│  ├─ Design Tokens & Tailwind Utility Engine                 │
│  └─ Global Context & Shared Utility Functions               │
└─────────────────────────────────────────────────────────────┘
```

## 2. Directory Structure Principles

The project hierarchy strictly enforces domain boundaries:

```text
LifeStack/
├── frontend/             # Client-side SPA (React, Vite, Tailwind CSS)
│   ├── public/           # Static unbundled assets
│   ├── src/
│   │   ├── assets/       # Bundled static media (images, icons, backgrounds)
│   │   ├── components/   # Cross-cutting reusable UI primitives
│   │   │   ├── common/   # Universal widgets (Spinners, Badges, Modals)
│   │   │   ├── navigation/  # Compact top toolbar and navigation pills
│   │   │   ├── panels/   # Organic glass panels and orbital containers
│   │   │   └── ui/       # Form controls, buttons, tooltips
│   │   ├── layouts/      # App scaffolding and layout shells
│   │   ├── pages/        # Route entry-point views
│   │   ├── features/     # Encapsulated domain logic
│   │   │   ├── dashboard/   # Dashboard widgets, orbital data, state hooks
│   │   │   ├── study/       # Study metrics, session logs, topic trees
│   │   │   └── projects/    # Project boards, milestone trackers
│   │   ├── hooks/        # Global custom React hooks
│   │   ├── context/      # Application-wide React Context providers
│   │   ├── services/     # API abstraction layer and data transport
│   │   ├── utils/        # Pure helper functions, formatting, math
│   │   ├── constants/    # Design tokens, config constants, routes
│   │   ├── styles/       # Tailwind entry, animations, glassmorphism CSS
│   │   └── routes/       # Central route configuration and guards
├── backend/              # Future backend services (Uninitialized)
├── docs/                 # Architectural specifications and roadmaps
└── assets/               # External reference designs, logos, and mockups
```

## 3. Component Architecture Guidelines

1. **Pure & Modular Primitives:** Keep generic components inside `components/ui` and `components/panels`. They must not depend on domain-specific feature state.
2. **Domain Encapsulation:** Any component specific to a domain (e.g., `StudyTimer`, `ProjectCard`) belongs strictly in `features/<domain>/components/`.
3. **No Monster Files:** Files should remain focused and single-responsibility. Decompose complex widgets into composable subcomponents.
4. **Data Isolation:** Mock datasets, sample schemas, and feature-specific hooks live alongside their respective feature directories (`features/<domain>/data` and `features/<domain>/hooks`).
5. **No Sidebar Mandate:** The layout strictly avoids left sidebars to maximize horizontal visual canvas for the central neural core and surrounding orbital elements.

## 4. Study Data and Persistence

The Study feature uses a normalized, versioned record in browser `localStorage`
(`lifestack.study.v1`). `features/study/data/studyRepository.js` owns validation,
relationship checks, mutations, and cascade behavior; the Study page consumes
it through `features/study/hooks/useStudyData.js`. Dashboard metrics are derived
from persisted records in `features/study/data/studyMetrics.js`.

Subjects own chapters, chapters own topics, and topic-linked learning activities
and revision records retain their topic IDs. Notes, practice sessions,
assessments, and study sessions retain their subject/topic associations where
applicable. Deleting a subject removes its dependent subject data; deleting a
chapter or topic removes topic-specific learning/revision records and detaches
topic links from retained notes and history.

The browser storage record is local to the current browser profile. It does not
provide cloud synchronization, cross-device backup, or account-level isolation.

## 5. Central Settings and Application Data

Settings are defined and validated in `features/settings/data/settingsSchema.js`
and persisted by `features/settings/data/settingsStore.js` under
`lifestack.settings.v1`. `SettingsProvider` exposes current preferences and
applies theme, accent, density, and application-mode values to the document
root. Other modules can subscribe through `features/settings/hooks/useSettings`
and register validated module-specific defaults.

The centralized reminder scheduler uses the browser Notification API for
upcoming Study assessments and pending revisions. The app must be open and
notification permission granted for scheduled delivery; browser notification
history and sound preferences are managed centrally.

Versioned app backups include Settings, Study, Projects, and Tasks data.
`features/settings/data/backupService.js` validates backups before restore,
preserves module relationships, supports local manual backups, and allows
future modules to register backup adapters. Projects and Tasks repositories
provide validated replacement operations so restored snapshots update active
subscribers. Manual backups are kept in browser local storage separately from
exported app data to avoid recursive backups.
