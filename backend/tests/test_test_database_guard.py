import pytest
from backend.tests.db_safety_guard import _validate_test_database_config

def test_missing_test_db_name():
    with pytest.raises(RuntimeError, match="TEST_DB_NAME is required"):
        _validate_test_database_config(None, "dev_db")

def test_empty_test_db_name():
    with pytest.raises(RuntimeError, match="TEST_DB_NAME is required"):
        _validate_test_database_config("   ", "dev_db")

def test_test_db_name_is_sosanhgia_db():
    with pytest.raises(RuntimeError, match="Test database cannot be 'sosanhgia_db'"):
        _validate_test_database_config("sosanhgia_db", "dev_db")

def test_test_db_name_missing_test():
    with pytest.raises(RuntimeError, match="Test database name must contain 'test'"):
        _validate_test_database_config("another_db", "dev_db")

def test_test_db_name_identical_to_dev_db_name():
    with pytest.raises(RuntimeError, match="Test database cannot be identical to development database"):
        _validate_test_database_config("my_test_db", "MY_TEST_DB")
        
def test_test_db_name_identical_to_dev_db_name_with_spaces():
    with pytest.raises(RuntimeError, match="Test database cannot be identical to development database"):
        _validate_test_database_config(" my_test_db ", "  my_test_db")

def test_valid_test_db_name():
    result = _validate_test_database_config(" Sosanhgia_Test ", "dev_db")
    assert result == "Sosanhgia_Test"
