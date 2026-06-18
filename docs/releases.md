# EduOS Release Notes

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
