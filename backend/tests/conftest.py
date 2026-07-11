import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from sqlalchemy.engine.url import URL

from backend.app.core.config import settings
from backend.tests.db_safety_guard import _validate_test_database_config
from backend.app.main import app
from backend.app.core.database import get_db

@pytest.fixture(scope="session")
def test_database_url():
    test_db_name = _validate_test_database_config(
        settings.TEST_DB_NAME,
        settings.DB_NAME
    )
    
    try:
        port = int(settings.DB_PORT)
    except (ValueError, TypeError):
        raise RuntimeError(f"DB_PORT must be an integer, got: '{settings.DB_PORT}'")
        
    url = URL.create(
        drivername="postgresql+psycopg2",
        username=settings.DB_USER,
        password=settings.DB_PASSWORD,
        host=settings.DB_HOST,
        port=port,
        database=test_db_name,
    )
    return url

@pytest.fixture(scope="session")
def test_engine(test_database_url):
    engine = create_engine(
        test_database_url,
        echo=False,
        pool_pre_ping=True
    )
    yield engine
    engine.dispose()

@pytest.fixture(scope="function")
def db_session(test_engine):
    connection = test_engine.connect()
    outer_transaction = connection.begin()
    
    session = Session(
        bind=connection,
        autoflush=False,
        expire_on_commit=False,
        join_transaction_mode="create_savepoint",
    )
    
    try:
        yield session
    finally:
        session.close()
        
        if outer_transaction.is_active:
            outer_transaction.rollback()
            
        connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        yield db_session
        
    previous_override = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_get_db
    
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        if previous_override is None:
            app.dependency_overrides.pop(get_db, None)
        else:
            app.dependency_overrides[get_db] = previous_override
