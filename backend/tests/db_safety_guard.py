def _validate_test_database_config(test_db_name: str | None, development_db_name: str) -> str:
    if not test_db_name:
        raise RuntimeError("TEST_DB_NAME is required for database integration tests.")
        
    test_db = test_db_name.strip()
    if not test_db:
        raise RuntimeError("TEST_DB_NAME is required for database integration tests.")
        
    test_db_lower = test_db.lower()
    
    if test_db_lower == "sosanhgia_db":
        raise RuntimeError("Test database cannot be 'sosanhgia_db'.")
        
    if "test" not in test_db_lower:
        raise RuntimeError(f"Test database name must contain 'test', got: '{test_db}'.")
        
    dev_db_lower = development_db_name.strip().lower()
    
    if test_db_lower == dev_db_lower:
        raise RuntimeError("Test database cannot be identical to development database.")
        
    return test_db
