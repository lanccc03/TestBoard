from sqlalchemy.orm import Session

from app.models.runner import Runner
from app.schemas.test_report import TestReportRunner


class RunnerRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get(self, runner_id: str) -> Runner | None:
        return self._session.get(Runner, runner_id)

    def upsert(self, runner: TestReportRunner) -> Runner:
        existing_runner = self.get(runner.runner_id)
        if existing_runner is None:
            existing_runner = Runner(
                runner_id=runner.runner_id,
                runner_name=runner.runner_name,
                runner_owner=runner.runner_owner,
                ip=runner.ip,
            )
            self._session.add(existing_runner)
            return existing_runner

        existing_runner.runner_name = runner.runner_name
        existing_runner.runner_owner = runner.runner_owner
        existing_runner.ip = runner.ip
        return existing_runner
