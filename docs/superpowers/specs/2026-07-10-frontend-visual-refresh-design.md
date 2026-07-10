# Frontend Visual Refresh Design

## Context

TestBoard is a desktop-first internal test-results platform. Its functional
surface is complete for the current phase, but its visual quality is uneven. The
statistics page already has a stronger dashboard treatment, while the global app
shell, dashboard, report list, failure investigation page, and report detail page
still resemble an application skeleton. The current horizontal header also
constrains navigation growth, the `max-w-6xl` content limit leaves wide desktop
screens underused, and dense tables do not have a consistent visual hierarchy.

The selected direction is **Professional Blue Operations Console**: a restrained
light interface with a fixed left sidebar, a fluid desktop content area, a blue
interaction color, and semantic result colors. The redesign covers the entire
frontend while preserving all existing behavior and data contracts.

## Goals

- Give every route one coherent, production-quality visual language.
- Make test quality, failures, and actionable links easy to scan on desktop.
- Use wide screens effectively for filters, tables, and charts.
- Unify page headers, metric cards, panels, filters, result states, tables, and
  request feedback.
- Preserve current routes, API requests, query behavior, statistics semantics,
  accessible names, and business labels.
- Keep changes focused on presentation and small presentation-only component
  boundaries.

## Non-Goals

- Do not add or change backend endpoints, schemas, or database behavior.
- Do not add export, health monitoring, synchronization status, or new dashboard
  metrics. Those elements in early visual mockups illustrated placement only.
- Do not add a dark theme.
- Do not design a mobile navigation or mobile-specific page layouts.
- Do not introduce unrelated refactors or move existing shared API and hook
  layers into features.
- Do not replace Recharts or add another visualization library.

## Supported Desktop Layout

The supported product viewport starts at 1280 CSS pixels wide. The application
uses a 224-pixel sidebar and a fluid main area with a minimum content width of
1000 pixels. The content area no longer uses the current `max-w-6xl` constraint.
It keeps 32 pixels of outer padding and grows with the viewport so dense tables
and charts use available space.

Widths below the supported desktop viewport may use horizontal browser scrolling.
The implementation does not add a collapsed sidebar, hamburger navigation, mobile
cards, or mobile table transformations.

## Visual System

### Color

The interface remains light. A cool gray-blue application background separates
white content panels without relying on heavy shadows. Blue is reserved for the
active navigation item, primary actions, links, focus indicators, and selected
states.

Result and attention states use semantic tokens rather than raw colors scattered
through feature components:

- Success: passed results and healthy quality signals.
- Destructive: failed results and request failures.
- Error: execution exceptions, visually related to destructive but separately
  labeled.
- Warning: blocked and attention states.
- Neutral: skipped results, structural elements, and secondary metadata.

Each result state includes explicit text and may also include a dot or icon, so
meaning never depends on color alone. Existing shadcn semantic tokens remain the
foundation. Additional success, warning, and information tokens are defined in
the global theme only when an existing token cannot express the state.

### Typography

Geist remains the application font. Route titles use stronger weight and tighter
tracking, while descriptions and metadata use the muted foreground token. Case
IDs, runner IDs, and other machine identifiers continue to use a monospaced
treatment. Numeric metrics use tabular figures where useful for stable alignment.

### Shape, Spacing, and Elevation

Panels use modest rounded corners consistent with the installed shadcn style.
Borders provide the main separation. Shadows are subtle and limited to elevated
or interactive surfaces. Page sections use a consistent vertical rhythm, while
filter controls and tables stay intentionally compact for desktop productivity.

Decorative gradients, glass effects, oversized radii, and large blocks of status
color are excluded.

## Application Shell

`frontend/src/layouts/AppLayout.tsx` becomes a two-column desktop shell. The
sidebar uses sticky positioning at the top of the viewport and fills the viewport
height, while the main document remains the vertical scroll container.

The fixed left sidebar contains:

- TestBoard brand mark and product name.
- The four existing routes with Lucide icons: dashboard, case reports, failures,
  and statistics.
- A concise product descriptor in the lower area. It must not imply live service
  health because no health data is available to this frontend surface.

The active route uses a blue-tinted background, blue foreground, and a visible
selection marker. Hover and keyboard focus states remain distinct.

The main workspace uses the cool gray-blue background. Route content occupies a
fluid-width inner area with consistent desktop padding. The shell does not change
route ownership or data fetching.

## Shared Presentation Components

The following cross-feature presentation components are added under
`frontend/src/components/` and imported through direct paths:

- `PageHeader`: route eyebrow or context, title, description, and optional action
  area.
- `MetricCard`: label, numeric value, optional icon, supporting text, and semantic
  state.
- `DataPanel`: section title, description, optional action or count, and a content
  body suitable for tables or charts.
- Refined request-state presentation using the existing `request-state.tsx`
  boundary.

These units remain display-only and accept typed props. They do not fetch data,
own route state, or know feature-specific query behavior. Existing shadcn base
controls stay in `frontend/src/components/ui/`. If a missing shadcn primitive is
needed, it is introduced at that base layer rather than reimplemented inside a
feature.

Business-specific filters, tables, formatters, and chart sections remain in their
current `frontend/src/features/<feature>/` directories.

## Page Designs

### Dashboard

The dashboard becomes the primary quality overview without changing its response
schema.

- The page header explains that the view summarizes today's quality window.
- The existing report total, pass rate, failure count, and passed count become a
  consistent four-card metric row.
- The statistics window becomes supporting metadata in the page header instead of
  an isolated line.
- Owner summaries, recent runners, and recent failures become consistent data
  panels with clear titles and descriptions.
- Existing links to all reports, failures, and report details remain available.
- Sections render only when their existing data is present, preserving current
  empty detection and conditional behavior.

No seven-day chart, active-runner count, or new quality metric is added to the
dashboard.

### Case Reports

The report list is a desktop productivity page.

- The existing seven filters remain unchanged and are grouped into a compact
  control panel with aligned submit and reset actions.
- The table, total count, and pagination read as one data surface.
- Column headers gain clearer contrast; machine identifiers remain monospaced;
  result badges use the unified semantic treatment.
- Row hover highlights the current record without turning the entire row into an
  implicit link.
- Report and detail actions remain explicit and keyboard reachable.
- Long error content stays truncated in the table, while the detail route remains
  the complete source.

The existing query construction, page size, page reset behavior, and report links
do not change.

### Failure Investigation

The failure page shares the report-list structure but gives failures stronger
visual priority.

- The page header and description emphasize investigation rather than generic
  history browsing.
- Existing filters keep their values and submission behavior.
- Failure and exception badges remain distinct.
- Error type is visually stronger than the truncated error message.
- Report and detail actions remain explicit.

No severity level, assignment workflow, or resolution state is introduced.

### Report Detail

The report detail page answers the result question before showing metadata.

- A status summary at the top contains the existing result, case name, case ID,
  and report action.
- Runner and owner, case information, timing, file metadata, and ingestion
  metadata are grouped into clearly titled panels.
- Failure or exception information receives a destructive-accented panel when
  present.
- The existing back navigation and report access remain unchanged.

The page does not infer missing metadata or add new actions.

### Statistics

The existing statistics refresh remains the visual and behavioral baseline for
charts.

- The page adopts the new application shell, page-header pattern, shared panel
  language, and global semantic tokens.
- Existing summary cards, filters, trend chart, comparison charts, detail tables,
  tooltip formatting, and partial-failure behavior remain intact.
- Chart colors align with the unified semantic tokens without changing series or
  calculations.

The implementation must preserve the existing partial-failure rule: summary
metrics do not render when the date trend request is unavailable.

## Data Flow and Behavior

API clients, response types, hooks, and route structure do not change. Route pages
continue to own filter draft state and submitted query state. Feature components
receive typed props as they do now.

Display-only derivations already present in pages remain local. New shared
presentation components receive formatted or typed values and never become a new
state-management layer. This avoids coupling visual reuse to feature queries.

The refresh does not change request timing, retries, cache behavior, empty-state
detection, pagination, report URLs, filter defaults, or pass-rate semantics.

## Loading, Empty, and Error States

Request feedback stays within the content region it replaces so the application
shell remains stable.

- Route-level loading states use the shared request-state panel with a title,
  description, and three skeleton rows. Charts retain their existing sized
  loading container so the page does not collapse while data loads.
- Empty states use a neutral icon, direct explanation, and an existing relevant
  action such as resetting filters or opening the reports page.
- Error states use a concise destructive treatment, retain the existing normalized
  error message, and expose the current retry behavior.
- Partial data keeps the current route-specific rules. The visual refresh does not
  reinterpret a partial response as complete data.

## Accessibility

- Preserve the existing heading structure and table accessible names.
- Keep all navigation, filters, pagination, links, and retry actions keyboard
  reachable with visible focus indicators.
- Do not rely on color alone for result or request state.
- Keep sufficient contrast for muted text, borders, badges, and active navigation.
- Preserve chart detail tables as the accessible data source.
- Decorative Lucide icons use `aria-hidden`; icon-only interactive controls require
  explicit accessible labels.

## Testing and Verification

Focused tests are updated only where markup contracts or presentation components
change. Coverage should confirm:

- The application shell renders all four existing navigation destinations and
  identifies the active route.
- Shared presentation components render their labels, actions, and semantic state
  without owning business behavior.
- Existing dashboard, list, failure, detail, and statistics loading, error, empty,
  populated, filtering, pagination, and retry behaviors remain intact.
- Existing accessible table names, headings, links, and labels remain present.
- Result badges still map every result value to the correct visible label and
  semantic treatment.

Run the full frontend verification suite after implementation:

- `pnpm lint`
- `pnpm format:check`
- `pnpm test`
- `pnpm build`

After automated checks, start the real frontend and backend and visually inspect
all routes at desktop widths, including populated data, an empty filtered result,
and a request error or equivalent isolated component state. Confirm that tables do
not clip required actions at the supported 1280-pixel viewport.

## Implementation Scope

The refresh includes:

- `frontend/src/index.css`
- `frontend/src/layouts/AppLayout.tsx`
- `frontend/src/components/request-state.tsx`
- New cross-feature presentation components under `frontend/src/components/`
- Route pages under `frontend/src/pages/`
- Existing dashboard, case-report, failure, and statistics presentation components
  under `frontend/src/features/`
- Focused frontend tests for changed rendering contracts

No backend files or dependency changes are expected. Any generated brainstorming
artifacts under `.superpowers/` remain local and are not part of the implementation
or design-document commit.
