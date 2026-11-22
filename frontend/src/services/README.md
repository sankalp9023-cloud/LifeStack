# Frontend Services and Data Stores

This directory currently contains the shared task repository/service. Feature-specific repositories and stores live beside their feature data. React hooks subscribe to these stores and expose snapshots to pages and components.

## Current boundary

- `taskRepository.js` persists tasks and publishes changes through its repository API.
- Study and Projects repositories live in their respective `features/*/data` directories.
- Settings uses a validated settings store and separate backup/notification services.
- UI components should use feature hooks/repositories instead of reading browser storage directly.

## Backend transition

The backend has not been implemented. When it is, add an API client and API-backed repository adapters here or beside the owning feature. Preserve feature-hook interfaces where practical so visual components remain independent of transport. The migration must keep local export/backup available and must not clear browser records without verified import. See [Backend Plan](../../../docs/BACKEND_PLAN.md) and [Data Model and Migration Plan](../../../docs/BACKEND_DATA_MODEL.md).
