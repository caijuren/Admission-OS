# EduOS Release Notes

## v1.9.0 - Workspace UI Upgrade

Release type: product UI upgrade + workflow refinement.

### Highlights

- Upgraded the application shell with grouped navigation, module-aware accent colors, and a visible account/logout area.
- Added a compact context bar on non-home pages showing the current module, student, target school, and stage.
- Refined non-home page surfaces with unified panel radius, softer shadows, consistent action buttons, and denser workbench spacing.
- Improved Goals as a planning workbench with a sticky goal map, active goal path summary, direct task creation, and task priority badges.
- Improved Weekly Plan with a Today Focus panel that surfaces the current day's suggested tasks before the full weekly breakdown.
- Tuned Timeline, Advisor, Settings, Portfolio, Reading, Grades, and shared empty states to align with the new workspace visual system.

### Design System

- Added route-aware section themes: planning green, evidence blue, advisor purple, and system gray.
- Standardized page width, panel radius, control radius, and resting/raised shadows through shared CSS variables.
- Kept the home cockpit visually distinct while bringing secondary pages into one operating-system style.

### Engineering

- App version bumped to `1.9.0`.
- The UI upgrade is mostly CSS- and shell-driven, with scoped JSX changes in Goals and Weekly Plan.
- Cleared stale Next.js cache during validation to resolve dev-server manifest mismatch after repeated builds.

### Known Beta Areas

- The upgraded UI should be reviewed visually in the browser across the main authenticated pages.
- Mobile layouts use responsive fallbacks, but Goals and Advisor still deserve a dedicated mobile pass.
- Local disk space can affect Next.js cache writes; keep enough free space before running repeated builds.

## v1.5.0 - UI Polish Sprint

Release type: product polish + workflow beta.

### Highlights

- Repositioned EduOS as a Growth OS instead of an education admin dashboard.
- Upgraded the visual system across Goals, Weekly Plan, Records, Reading, Grades, Portfolio, Settings, and Weekly Report.
- Added a Dashboard admission-tree view as a beta visual cockpit.
- Added Weekly Plan enhancements: daily split, natural-language daily logging, and DingTalk push beta.
- Added DingTalk integration configuration in Settings.
- Added release documentation and structured database migration foundation.

### Design System

- Primary color: growth green.
- Secondary color: sky blue.
- Accent color: achievement gold.
- Warning color: orange.
- Risk color: red.
- Card hierarchy now separates high-priority growth status, execution content, and supporting stats.

### Engineering

- App version bumped to `1.5.0`.
- Added structured Supabase table definitions while keeping the current JSON state store as the runtime source of truth.
- Added dedicated DingTalk integration APIs with URL validation, timeout handling, and masked configuration reads.

### Known Beta Areas

- DingTalk push depends on user-provided custom robot webhook configuration.
- Structured database tables are migration-ready but not yet the default runtime data source.
- The admission-tree cockpit is visual beta and should be reviewed on smaller screens before making it the default dashboard.

## v1.1.7 - Core Closed Loop

### Highlights

- Local account login and protected application shell.
- File-backed data mode with `data/eduos.local.json`.
- Dashboard, Goals, Weekly Plan, Grades, Reading, Records, Timeline, Portfolio, and Settings core flows.
- Supabase `app_state` JSONB support for future database mode.

## Release Checklist

Run before every release:

```bash
npm run lint
npm run build
```

For file-backed server deployments, back up the mutable data file before release:

```bash
cp /srv/apps/admission-os/data/eduos.local.json /srv/apps/admission-os/data/eduos.local.$(date +%Y%m%d-%H%M%S).json
```
