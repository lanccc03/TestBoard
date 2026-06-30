from sqlalchemy import text

from app.db.session import make_engine


def main() -> None:
    engine = make_engine()
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    print("Database connection ok")


if __name__ == "__main__":
    main()
