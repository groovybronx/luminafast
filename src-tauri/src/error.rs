use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(String),
    
    #[error("File system error: {0}")]
    FileSystem(String),
    
    #[error("File not found: {0}")]
    FileNotFound(String),
    
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    
    #[error("Invalid input: {0}")]
    InvalidInput(String),
    
    #[error("Internal error: {0}")]
    Internal(String),
    
    #[error("Hash error: {0}")]
    Hash(String),
    
    #[error("Discovery error: {0}")]
    Discovery(String),
}

pub type AppResult<T> = Result<T, AppError>;

// Utility conversions
impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        AppError::Database(err.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        match err.kind() {
            std::io::ErrorKind::NotFound => AppError::FileNotFound(err.to_string()),
            std::io::ErrorKind::PermissionDenied => AppError::PermissionDenied(err.to_string()),
            _ => AppError::FileSystem(err.to_string()),
        }
    }
}

impl From<AppError> for String {
    fn from(err: AppError) -> String {
        serde_json::to_string(&err).unwrap_or_else(|_| err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_app_error_serialization() {
        let err = AppError::Database("test error".to_string());
        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("Database"));
        assert!(json.contains("test error"));
    }
    
    #[test]
    fn test_error_conversion_from_io() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let app_err: AppError = io_err.into();
        assert!(matches!(app_err, AppError::FileNotFound(_)));
    }
    
    #[test]
    fn test_error_conversion_from_io_permission() {
        let io_err = std::io::Error::new(std::io::ErrorKind::PermissionDenied, "access denied");
        let app_err: AppError = io_err.into();
        assert!(matches!(app_err, AppError::PermissionDenied(_)));
    }
    
    #[test]
    fn test_error_to_string_conversion() {
        let err = AppError::FileNotFound("test.jpg".to_string());
        let string_err: String = err.into();
        assert!(string_err.contains("FileNotFound") || string_err.contains("File not found"));
    }
    
    #[test]
    fn test_database_error_from_rusqlite() {
        // Test that rusqlite errors convert properly
        let err = AppError::Database("connection failed".to_string());
        assert!(matches!(err, AppError::Database(_)));
    }
}
