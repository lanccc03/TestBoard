from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.runner import Runner
    from app.models.test_case_result import TestCaseResult


class TestRun(Base):
    __tablename__ = "test_runs"
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_test_runs_idempotency_key"),
        CheckConstraint("status IN ('passed', 'failed', 'error')", name="ck_test_runs_status"),
        CheckConstraint(
            "duration_ms IS NULL OR duration_ms >= 0",
            name="ck_test_runs_duration_ms_non_negative",
        ),
        CheckConstraint(
            "total >= 0 AND passed >= 0 AND failed >= 0 "
            "AND skipped >= 0 AND blocked >= 0 AND error >= 0",
            name="ck_test_runs_summary_counts_non_negative",
        ),
        Index("ix_test_runs_idempotency_key", "idempotency_key"),
        Index("ix_test_runs_started_at", "started_at"),
        Index("ix_test_runs_runner_owner", "runner_owner"),
        Index("ix_test_runs_runner_id", "runner_id"),
        Index("ix_test_runs_status", "status"),
    )

    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    idempotency_key: Mapped[str] = mapped_column(String(255), nullable=False)
    runner_id: Mapped[str] = mapped_column(
        String(128),
        ForeignKey("runners.runner_id", name="fk_test_runs_runner_id_runners"),
        nullable=False,
    )
    runner_owner: Mapped[str] = mapped_column(String(128), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_ms: Mapped[int | None]
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    report_url: Mapped[str | None] = mapped_column(String(2048))
    total: Mapped[int] = mapped_column(nullable=False)
    passed: Mapped[int] = mapped_column(nullable=False)
    failed: Mapped[int] = mapped_column(nullable=False)
    skipped: Mapped[int] = mapped_column(nullable=False)
    blocked: Mapped[int] = mapped_column(nullable=False)
    error: Mapped[int] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    runner: Mapped[Runner] = relationship("Runner", back_populates="test_runs")
    case_results: Mapped[list[TestCaseResult]] = relationship(
        "TestCaseResult",
        back_populates="test_run",
    )
