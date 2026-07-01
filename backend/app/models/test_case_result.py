from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.test_run import TestRun


class TestCaseResult(Base):
    __tablename__ = "test_case_results"
    __table_args__ = (
        CheckConstraint(
            "result IN ('passed', 'failed', 'skipped', 'blocked', 'error')",
            name="ck_test_case_results_result",
        ),
        CheckConstraint(
            "duration_ms IS NULL OR duration_ms >= 0",
            name="ck_test_case_results_duration_ms_non_negative",
        ),
        Index("ix_test_case_results_run_id", "run_id"),
        Index("ix_test_case_results_case_id", "case_id"),
        Index("ix_test_case_results_result", "result"),
        Index("ix_test_case_results_module", "module"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("test_runs.run_id", name="fk_test_case_results_run_id_test_runs"),
        nullable=False,
    )
    case_id: Mapped[str] = mapped_column(String(255), nullable=False)
    case_name: Mapped[str] = mapped_column(String(512), nullable=False)
    module: Mapped[str | None] = mapped_column(String(255))
    result: Mapped[str] = mapped_column(String(16), nullable=False)
    duration_ms: Mapped[int | None]
    error_type: Mapped[str | None] = mapped_column(String(128))
    error_message: Mapped[str | None] = mapped_column(String(4096))
    log_url: Mapped[str | None] = mapped_column(String(2048))
    screenshot_url: Mapped[str | None] = mapped_column(String(2048))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    test_run: Mapped[TestRun] = relationship("TestRun", back_populates="case_results")
