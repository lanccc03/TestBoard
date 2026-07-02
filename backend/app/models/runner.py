from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.test_case_report import TestCaseReport


class Runner(Base):
    __tablename__ = "runners"

    runner_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    runner_name: Mapped[str | None] = mapped_column(String(255))
    runner_owner: Mapped[str] = mapped_column(String(128), nullable=False)
    ip: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    case_reports: Mapped[list[TestCaseReport]] = relationship(
        "TestCaseReport",
        back_populates="runner",
    )
