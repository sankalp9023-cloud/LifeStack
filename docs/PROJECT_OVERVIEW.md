# LifeStack — Project Overview

## Product direction

LifeStack brings personal study, projects, and tasks into one responsive workspace. The dashboard summarizes those feature areas and offers links into their dedicated pages. The current product is a local-first browser application; account-based cloud storage is a planned next stage.

## Implemented areas

### Dashboard

- Live counts and activity summaries from the Study, Projects, and Tasks stores.
- A workspace progress panel comparing Study, Tasks, and Projects completion. Its overall figure is an average of the sections that contain trackable records.
- Progress charts are derived from current records and update when those records change. Historical trend data is not collected yet.

### Study

- Subjects contain chapters; chapters contain topics.
- Topic completion is derived from each topic's configured lecture, reading, and practice requirements and completed learning activities.
- Subject/topic progress, a topic completion pie chart, upcoming assessments, revisions, and recent study activity.
- Notes, practice sessions, assessments, study sessions, and revision records.

### Projects and Tasks

- Projects with status, priority, deadlines, milestones, notes, resources, important dates, and activity history.
- A project overview with status and progress charts, recently updated projects, and upcoming or overdue deadlines.
- Tasks can be associated with projects and milestones, or remain personal. Task progress contributes to project metrics where linked.

### Settings

- General preferences, appearance, reminders and notification history, module preferences, privacy information, backup/restore, and system information.

## Future scope

Email/password and Google account authentication are implemented in the backend. Frontend auth integration, multi-device sync, and cloud persistence remain planned. Fitness and calendar/event management remain future product modules and are not represented as implemented features.
