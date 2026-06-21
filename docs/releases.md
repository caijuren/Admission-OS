# EduOS Release Notes

## v1.16.0 - Interaction Quality Pass

Release type: final desktop interaction and release-readiness polish.

### Highlights

- Standardized hover, active, focus, disabled, feedback, and empty-state details across the core workspace.
- Added reduced-motion safeguards so decorative movement does not interfere with focused use.
- Tightened visual affordances for primary buttons, icon buttons, toolbars, cards, and data panels without changing workflows.
- Prepared the current UI iteration for release validation.

## v1.15.0 - Evidence System Polish

Release type: evidence page visual unification.

### Highlights

- Added a unified Evidence System hero across Reading, Grades, Timeline, and Records.
- Added evidence signal strips for page-specific proof depth, highlights, and source counts.
- Brought evidence cards, panels, rows, and timelines closer to the same premium dashboard language.
- Kept existing evidence entry flows and data sources intact.

## v1.14.0 - Advisor Workspace

Release type: AI advisor workspace polish.

### Highlights

- Reframed AI Advisor as a diagnosis and action workspace instead of only a chat surface.
- Added a workspace hero summarizing plan diagnosis and pending signals.
- Added decision metrics for diagnosis items, action drafts, task drafts, and progress drafts.
- Moved plan diagnosis into the primary tool position and refined advisor cards, chat, and action draft surfaces.

## v1.13.0 - Goal Strategy Workspace

Release type: goal strategy workspace polish.

### Highlights

- Added a Strategy Brief to Goals with current goal context, standards, progress, and system signals.
- Made the goal map sticky on desktop so users can switch goals while keeping the strategy view in place.
- Tightened task cards and category columns for faster scanning.
- Turned conflict cards into next-step guidance instead of passive warnings.

## v1.12.0 - Weekly Execution Polish

Release type: daily execution workflow polish.

### Highlights

- Moved Today Actions ahead of the full weekly matrix so the page starts with what needs doing now.
- Added rhythm and drift signals for pending today items, behind tasks, and high-priority low-progress tasks.
- Added execution coverage as a first-class weekly metric.
- Refined Weekly Plan surfaces into a calmer execution desk with stronger hierarchy and sticky matrix headers.

## v1.11.0 - Flagship Dashboard

Release type: flagship dashboard redesign.

### Highlights

- Rebuilt the default dashboard into an Admission Command Center with a stronger first impression.
- Added a hero summary for target school, current stage, readiness, and risk count.
- Reframed the pathway map as the primary visual work area instead of the whole page.
- Added next actions, risk signals, and evidence shortcuts around the pathway so the first screen leads to decisions.
- Kept existing dashboard view switching and data sources intact.

## v1.10.0 - Design Foundation

Release type: visual system foundation.

### Highlights

- Recalibrated the desktop visual system toward a quieter international dashboard style.
- Reduced decorative gradients and glow effects in favor of restrained borders, lighter shadows, and cleaner surfaces.
- Unified shell, sidebar, toolbars, cards, buttons, form controls, feedback states, task cards, and weekly tables around the same radius, color, and elevation language.
- Kept the current product workflows intact while making the existing pages feel more cohesive and premium.

## v1.9.1 - Experience Patch

Release type: desktop workflow polish.

### Highlights

- Added clearer save feedback on Goals for goal/task create, edit, delete, and hierarchy changes.
- Tightened Weekly Plan's Today area into a direct action surface with completion counts and record buttons.
- Improved empty states in Weekly Plan so the next action is visible without reading surrounding context.
- Added a lightweight smoke check for core pages, data APIs, shell navigation, and critical workflow labels.

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
