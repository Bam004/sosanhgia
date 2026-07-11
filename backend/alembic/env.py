from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

from backend.app.core.config import settings
from backend.app.core.database import Base
from backend.app import models  # noqa: F401


config = context.config

x_args = context.get_x_argument(as_dictionary=True)
test_mode = x_args.get("test_mode")

if test_mode is None:
    target_url = settings.DATABASE_URL
elif test_mode == "1":
    test_db = settings.TEST_DB_NAME
    if not test_db:
        raise RuntimeError("TEST_DB_NAME is required for test mode.")
        
    test_db = test_db.strip()
    if not test_db:
        raise RuntimeError("TEST_DB_NAME cannot be empty.")
        
    test_db_lower = test_db.lower()
    if test_db_lower == "sosanhgia_db":
        raise RuntimeError("Test database cannot be 'sosanhgia_db'.")
        
    if "test" not in test_db_lower:
        raise RuntimeError(f"Test database name must contain 'test', got: '{test_db}'.")
        
    dev_db_lower = settings.DB_NAME.strip().lower()
    if test_db_lower == dev_db_lower:
        raise RuntimeError("Test database cannot be identical to development database.")
        
    try:
        port = int(settings.DB_PORT)
    except (ValueError, TypeError):
        raise RuntimeError(f"DB_PORT must be an integer, got: '{settings.DB_PORT}'")
        
    from sqlalchemy.engine.url import URL
    url_obj = URL.create(
        drivername="postgresql+psycopg2",
        username=settings.DB_USER,
        password=settings.DB_PASSWORD,
        host=settings.DB_HOST,
        port=port,
        database=test_db,
    )
    
    # In an toan
    host_display = settings.DB_HOST if settings.DB_HOST in ('localhost', '127.0.0.1') else '***'
    
    print("--- TEST MIGRATION TARGET ---")
    print("- Backend: PostgreSQL")
    print(f"- Host: {host_display}")
    print(f"- Port: {port}")
    print(f"- Database: {test_db}")
    print(f"- Development database: {settings.DB_NAME}")
    print("- Targets are different: YES")
    print("-----------------------------")
    
    target_url = url_obj.render_as_string(hide_password=False).replace("%", "%%")
else:
    raise RuntimeError(f"Invalid test_mode value: '{test_mode}'. Must be '1' or omitted.")

config.set_main_option("sqlalchemy.url", target_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section)

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()