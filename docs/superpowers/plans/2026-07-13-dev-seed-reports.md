# Development Seed Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate exactly 100 deterministic development test reports while retaining idempotent import behavior.

**Architecture:** Keep `build_dev_reports()` as the construction boundary. Replace its seven literal report requests with a deterministic loop over fixed runner and result metadata; derive unique identities and timestamps from the loop index. Existing file storage and importer code remain unchanged.

**Tech Stack:** Python 3.12, FastAPI project schemas, SQLAlchemy, pytest, Ruff, mypy.

## Global Constraints

- Work only in `backend/` for implementation and use existing Pydantic request schemas.
- Preserve four runners, five result states, existing report-file handling, and deterministic idempotency keys.
- Test behavior before implementation and run the backend checks from `AGENTS.md` before completion.

---

### Task 1: Assert the 100-report seed contract

**Files:**
- Modify: `backend/tests/dev/test_seed_data.py:47-112`

**Interfaces:**
- Consumes: `build_dev_reports() -> list[TestReportRequest]`, `seed_dev_data(session: Session) -> SeedResult`
- Produces: Regression coverage for report count, uniqueness, and repeated-import results.

- [ ] **Step 1: Write the failing test expectations**

Change the current count assertions and add identity assertions:

```python
assert len(reports) == 100
assert len({report.idempotency_key for report in reports}) == 100
assert len({report.case.case_id for report in reports}) == 100
```

Change the seed assertions:

```python
assert first_result.imported == 100
assert second_result.duplicates == 100
assert _count(session, CaseReportModel) == 100
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pytest tests/dev/test_seed_data.py -v`

Expected: FAIL because `build_dev_reports()` still returns seven reports and `seed_dev_data()` imports seven reports.

### Task 2: Generate the deterministic report set

**Files:**
- Modify: `backend/app/dev/seed_data.py:64-181`

**Interfaces:**
- Consumes: `_case(...) -> TestReportCase`, `_report(...) -> TestReportRequest`, four `TestReportRunner` values.
- Produces: `build_dev_reports() -> list[TestReportRequest]` containing 100 unique deterministic requests.

- [ ] **Step 1: Replace the literal request list with indexed generation**

Define fixed tuples for runners and result metadata, then construct 100 reports in index order. Derive each identity with zero padding and choose metadata using modulo indexing:

```python
for index in range(100):
    sequence = index + 1
    runner = runners[index % len(runners)]
    result, error_type, error_message = outcomes[index % len(outcomes)]
    reports.append(
        _report(
            idempotency_key=f"dev-seed-report-{sequence:03d}",
            runner=runner,
            test_case=_case(
                case_id=f"DEV-{modules[index % len(modules)].upper()}-{sequence:03d}",
                case_name=f"{modules[index % len(modules)]} development scenario {sequence}",
                module=modules[index % len(modules)],
                result=result,
                started_at=base_time + timedelta(minutes=30 * index),
                error_type=error_type,
                error_message=error_message,
            ),
        )
    )
```

Use `None` error details for `passed` and `skipped`; retain explicit error details for `failed`, `error`, and `blocked`.

- [ ] **Step 2: Run the focused test to verify it passes**

Run: `pytest tests/dev/test_seed_data.py -v`

Expected: PASS with both deterministic-build and idempotent-import tests succeeding.

### Task 3: Run prescribed backend verification

**Files:**
- Verify: `backend/app/dev/seed_data.py`
- Verify: `backend/tests/dev/test_seed_data.py`

**Interfaces:**
- Consumes: Completed Tasks 1 and 2.
- Produces: Verified backend change ready for handoff.

- [ ] **Step 1: Run formatting and lint checks**

Run: `ruff check . && ruff format --check .`

Expected: Both commands succeed with no violations.

- [ ] **Step 2: Run type checks**

Run: `mypy app tests`

Expected: Succeeds with no type errors.

- [ ] **Step 3: Run the backend test suite**

Run: `pytest`

Expected: All tests pass.

- [ ] **Step 4: Commit the implementation**

```bash
git add backend/app/dev/seed_data.py backend/tests/dev/test_seed_data.py
git commit -m "feat: expand development seed reports"
```
