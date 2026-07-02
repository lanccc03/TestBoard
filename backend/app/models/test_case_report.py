from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.runner import Runner


class TestCaseReport(Base):
    __tablename__ = "test_case_reports"
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_test_case_reports_idempotency_key"),
        CheckConstraint(
            "result IN ('passed', 'failed', 'skipped', 'blocked', 'error')",
            name="ck_test_case_reports_result",
        ),
        CheckConstraint(
            "duration_ms IS NULL OR duration_ms >= 0",
            name="ck_test_case_reports_duration_ms_non_negative",
        ),
        CheckConstraint(
            "report_size_bytes >= 0",
            name="ck_test_case_reports_report_size_bytes_non_negative",
        ),
        Index("ix_test_case_reports_idempotency_key", "idempotency_key"),
        Index("ix_test_case_reports_started_at", "started_at"),
        Index("ix_test_case_reports_runner_owner", "runner_owner"),
        Index("ix_test_case_reports_runner_id", "runner_id"),
        Index("ix_test_case_reports_result", "result"),
        Index("ix_test_case_reports_case_id", "case_id"),
        Index("ix_test_case_reports_module", "module"),
    )

    case_report_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    idempotency_key: Mapped[str] = mapped_column(String(255), nullable=False)
    runner_id: Mapped[str] = mapped_column(
        String(128),
        ForeignKey("runners.runner_id", name="fk_test_case_reports_runner_id_runners"),
        nullable=False,
    )
    runner_owner: Mapped[str] = mapped_column(String(128), nullable=False)
    case_id: Mapped[str] = mapped_column(String(255), nullable=False)
    case_name: Mapped[str] = mapped_column(String(512), nullable=False)
    module: Mapped[str | None] = mapped_column(String(255))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_ms: Mapped[int | None]
    result: Mapped[str] = mapped_column(String(16), nullable=False)
    report_file_path: Mapped[str] = mapped_column(String(2048), nullable=False)
    report_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    report_content_type: Mapped[str] = mapped_column(String(255), nullable=False)
    report_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    error_type: Mapped[str | None] = mapped_column(String(128))
    error_message: Mapped[str | None] = mapped_column(String(4096))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    runner: Mapped[Runner] = relationship("Runner", back_populates="case_reports")
