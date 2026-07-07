# Stats Trends Visual Refresh Design

## Context

The stats trends page currently renders a plain page heading, time-range filter form,
one date trend chart with a detail table, and three Top 10 comparison sections. The
page works functionally, but the visual hierarchy is flat: charts use default
Recharts styling, containers are simple bordered boxes, and important quality
signals such as failures, pass rate, and blocked/error counts are not surfaced
before the user reads the chart or tables.

The chosen direction is a light-page status dashboard. The overall application
remains light, including the global header and navigation. Only the stats page
content should gain stronger status emphasis.

## Goals

- Keep the stats trends page clearly aligned with the existing light TestBoard UI.
- Make quality state visible at a glance through summary metrics and status color.
- Improve chart readability with deliberate axis, grid, legend, tooltip, and series
  styling.
- Preserve the current data-fetching behavior, filters, routes, API contracts, and
  table labels used by tests.
- Keep the implementation localized to the stats page and stats feature components.

## Non-Goals

- Do not convert the whole app to a dark theme or status-room theme.
- Do not change backend APIs, query parameters, or response schemas.
- Do not add a new charting library.
- Do not redesign global navigation or unrelated pages.
- Do not introduce broad layout refactors outside the stats page surface.

## User Experience

The stats page should open with a stronger page header that explains the current
view and shows the active statistics window when data is loaded. Below that, a
compact set of summary metric cards should surface the most important signals:
total reports, failure count, pass rate, and blocked/error pressure. The cards
should use the same visual language as the rest of the app, with status color used
as a functional signal rather than decoration.

The filter form remains directly below the header area. It should feel like part
of a control panel: compact, aligned, and easy to scan. Existing inputs and actions
remain unchanged.

The date trend chart becomes the primary visual anchor. Total volume, failure
count, and pass rate should be immediately distinguishable. The chart should use
rounded bars, lighter grid lines, readable axis text, and a custom tooltip that
formats counts and pass rate consistently with the rest of the page.

The three comparison sections should keep their current structure but adopt a
consistent analysis-panel treatment. Each section has a clear title, short
description, chart, and accessible table. The chart styling should match the trend
chart, and the tables should make state values easier to scan without changing the
underlying data.

## Components

### StatsPage

`frontend/src/pages/StatsPage.tsx` remains the route-level page. It will continue
owning filter state and the `useStats` query calls. When all data is available, it
will derive page-level summary metrics from `byDateData.items` and render them
above the trend chart.

The empty, loading, and error states remain in the same behavioral positions. No
request timing or retry behavior changes.

### StatsFilters

`frontend/src/features/stats/components/StatsFilters.tsx` keeps the existing props
and form behavior. The visual treatment can be refined with stronger container
styling and responsive button alignment while continuing to use shadcn `Field`,
`Input`, and `Button`.

### StatsTrendSection

`frontend/src/features/stats/components/StatsTrendSection.tsx` remains responsible
for the date trend chart and date detail table. It can gain helper functions for
chart labels and tooltip formatting. It should keep the accessible table label
`日期趋势明细`.

### StatsComparisonSection

`frontend/src/features/stats/components/StatsComparisonSection.tsx` remains the
shared component for owner, runner, and case comparisons. It can receive more
polished chart styling internally without changing its public props. It should keep
the passed `tableLabel` as the table accessible name.

## Data Flow

No API or hook changes are required.

`StatsPage` will derive summary metrics from already loaded date trend items:

- `totalReports`: sum of `total`.
- `failureCount`: sum of `failureCount`.
- `passRate`: weighted pass rate from summed `passed / (passed + failed +
  error)`, with no value when there are no eligible completed outcomes. This
  matches the existing stats API semantics and excludes skipped/blocked reports
  from the pass-rate denominator.
- `blockedAndError`: sum of `blocked + error`.

These derived values are display-only and should not affect empty-state detection
or query parameters.

## Visual System

Use semantic app tokens for containers, borders, text, and backgrounds. Limited
status colors are acceptable where they communicate result state:

- Green for pass rate and passing signal.
- Red for failures.
- Amber for skipped or attention states.
- Slate/neutral for totals and structural elements.

Avoid changing the global CSS theme. If small chart constants are useful, keep them
inside the stats components rather than introducing global design tokens.

Cards and panels should use modest radii consistent with the project. Avoid nested
decorative cards; repeated metric cards are acceptable because they are individual
data items.

## Accessibility

- Preserve existing headings and table accessible names.
- Keep text readable on mobile and desktop.
- Avoid relying only on color; labels and numeric values must identify each state.
- Ensure chart tooltips provide formatted values for users interacting with the
  chart, while tables remain the accessible data source.

## Testing

Update or extend `frontend/src/pages/StatsPage.test.tsx` to verify:

- The page still renders the existing heading, charts, and comparison tables.
- The summary metrics render when data is available.
- Filter submit and reset behavior remains unchanged.
- Loading, error, and empty states still render as before.

Run the relevant frontend checks after implementation:

- `pnpm lint`
- `pnpm format:check`
- `pnpm test`
- `pnpm build`

## Implementation Scope

Expected files:

- `frontend/src/pages/StatsPage.tsx`
- `frontend/src/features/stats/components/StatsFilters.tsx`
- `frontend/src/features/stats/components/StatsTrendSection.tsx`
- `frontend/src/features/stats/components/StatsComparisonSection.tsx`
- `frontend/src/pages/StatsPage.test.tsx`

No dependency changes are expected.
