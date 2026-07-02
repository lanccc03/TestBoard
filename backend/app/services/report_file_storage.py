from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from fastapi import UploadFile


class ReportFileTooLargeError(Exception):
    pass


@dataclass(frozen=True)
class StoredReportFile:
    relative_path: str
    filename: str
    content_type: str
    size_bytes: int


class ReportFileStorage:
    def __init__(self, storage_dir: Path, max_upload_bytes: int) -> None:
        self._storage_dir = storage_dir
        self._max_upload_bytes = max_upload_bytes

    async def save(self, upload_file: UploadFile) -> StoredReportFile:
        filename = self._clean_filename(upload_file.filename)
        content_type = upload_file.content_type or "application/octet-stream"
        relative_path = self._make_relative_path(filename)
        destination = self._storage_dir / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)

        size_bytes = 0
        try:
            with destination.open("wb") as output_file:
                while chunk := await upload_file.read(1024 * 1024):
                    size_bytes += len(chunk)
                    if size_bytes > self._max_upload_bytes:
                        raise ReportFileTooLargeError
                    output_file.write(chunk)
        except Exception:
            destination.unlink(missing_ok=True)
            raise
        finally:
            await upload_file.close()

        return StoredReportFile(
            relative_path=relative_path,
            filename=filename,
            content_type=content_type,
            size_bytes=size_bytes,
        )

    def resolve(self, relative_path: str) -> Path:
        storage_root = self._storage_dir.resolve()
        report_path = (storage_root / relative_path).resolve()
        report_path.relative_to(storage_root)
        return report_path

    def delete(self, relative_path: str) -> None:
        self.resolve(relative_path).unlink(missing_ok=True)

    def _make_relative_path(self, filename: str) -> str:
        now = datetime.now(UTC)
        suffix = Path(filename).suffix[:32]
        generated_name = f"{uuid.uuid4().hex}{suffix}"
        return str(Path(str(now.year)) / f"{now.month:02d}" / generated_name)

    @staticmethod
    def _clean_filename(filename: str | None) -> str:
        cleaned = Path(filename or "report").name.strip()
        return cleaned[:255] or "report"
