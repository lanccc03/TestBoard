# Development Seed Reports Design

## Goal

Make the development seed script produce exactly 100 deterministic test-report requests while retaining its current variety, file generation, and idempotent import behavior.

## Approach

`build_dev_reports()` will construct its requests from the existing four runners and a fixed sequence of report definitions. The sequence will cycle through the current five result states and corresponding error details, and derive unique case IDs, idempotency keys, and timestamps from a zero-based index.

This keeps the dataset predictable across runs, exercises the existing runner and result filters, and ensures duplicate detection continues to operate because idempotency keys do not change.

## Boundaries

- Change only `backend/app/dev/seed_data.py` and its focused test module.
- Generate 100 reports, represented by 100 `TestReportRequest` values.
- Preserve all five existing result states: `passed`, `failed`, `error`, `skipped`, and `blocked`.
- Keep four runners and report-file creation unchanged.
- Update tests to require 100 initial imports, 100 duplicate imports on a second run, and 100 stored reports.

## Verification

Run the focused seed-data tests, then the prescribed backend static checks and test suite relevant to the changed backend code.
