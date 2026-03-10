use std::ffi::OsString;
use std::path::{Component, Path, PathBuf};

const ALLOWED_DIRS_ENV_VAR: &str = "LUMINAFAST_ALLOWED_DIRS";

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum SecurityError {
    #[error("Path traversal attempt: {0}")]
    PathTraversalAttempt(String),

    #[error("Path is outside whitelist: {0}")]
    NotInWhitelist(String),

    #[error("Invalid path: {0}")]
    InvalidPath(String),
}

/// Detect obvious path traversal patterns before any filesystem call.
pub fn is_path_traversal_attempt(path: &str) -> bool {
    let lower = path.to_ascii_lowercase();
    if lower.contains("../")
        || lower.contains("..\\")
        || lower.contains("%2e%2e")
        || lower.contains("..%2f")
        || lower.contains("..%5c")
    {
        return true;
    }

    Path::new(path)
        .components()
        .any(|component| matches!(component, Component::ParentDir))
}

/// Resolve and canonicalize a path for safe comparisons.
pub fn normalize_path(path: &str) -> Result<PathBuf, SecurityError> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err(SecurityError::InvalidPath("empty path".to_string()));
    }

    if is_path_traversal_attempt(trimmed) {
        return Err(SecurityError::PathTraversalAttempt(trimmed.to_string()));
    }

    let candidate = PathBuf::from(trimmed);
    let absolute = if candidate.is_absolute() {
        candidate
    } else {
        std::env::current_dir()
            .map_err(|e| SecurityError::InvalidPath(e.to_string()))?
            .join(candidate)
    };

    absolute
        .canonicalize()
        .map_err(|e| SecurityError::InvalidPath(e.to_string()))
}

/// Validate a requested path against a runtime whitelist.
pub fn validate_path(requested_path: &str, whitelist: &[String]) -> Result<(), SecurityError> {
    if whitelist.is_empty() {
        return Err(SecurityError::NotInWhitelist(
            "whitelist is empty".to_string(),
        ));
    }

    let normalized_requested = normalize_path(requested_path)?;

    for allowed in whitelist {
        if allowed.trim().is_empty() {
            continue;
        }

        let normalized_allowed = match normalize_path(allowed) {
            Ok(path) => path,
            Err(_) => continue,
        };

        if normalized_requested.starts_with(&normalized_allowed) {
            return Ok(());
        }
    }

    Err(SecurityError::NotInWhitelist(
        normalized_requested.display().to_string(),
    ))
}

pub fn get_runtime_whitelist() -> Vec<String> {
    let mut whitelist = parse_env_whitelist();
    if whitelist.is_empty() {
        whitelist = default_whitelist();
    }
    whitelist
}

pub fn initialize_security_context() -> Vec<String> {
    let whitelist = get_runtime_whitelist();

    if whitelist.is_empty() {
        log::warn!(
            "Security whitelist is empty. Set {} to authorize directories explicitly.",
            ALLOWED_DIRS_ENV_VAR
        );
    } else {
        log::info!(
            "Security whitelist initialized with {} directories",
            whitelist.len()
        );
    }

    whitelist
}

pub fn validate_runtime_path(path: &Path) -> Result<(), SecurityError> {
    let requested = path.to_string_lossy();
    let whitelist = get_runtime_whitelist();
    validate_path(requested.as_ref(), &whitelist)
}

fn parse_env_whitelist() -> Vec<String> {
    let mut whitelist = Vec::new();

    if let Some(raw) = std::env::var_os(ALLOWED_DIRS_ENV_VAR) {
        for path in std::env::split_paths(&raw) {
            if let Ok(canonical) = path.canonicalize() {
                whitelist.push(canonical.to_string_lossy().to_string());
            }
        }
    }

    whitelist
}

fn default_whitelist() -> Vec<String> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Some(home) = dirs::home_dir() {
        candidates.push(home.join("Pictures"));
        candidates.push(home.join("Documents"));
        candidates.push(home.join("Desktop"));
    }

    #[cfg(test)]
    {
        candidates.push(std::env::temp_dir());
    }

    normalize_whitelist_paths(candidates)
}

fn normalize_whitelist_paths(paths: Vec<PathBuf>) -> Vec<String> {
    let mut normalized = Vec::new();

    for path in paths {
        if let Ok(canonical) = path.canonicalize() {
            let canonical_string = canonical.to_string_lossy().to_string();
            if !normalized.contains(&canonical_string) {
                normalized.push(canonical_string);
            }
        }
    }

    normalized
}

#[allow(dead_code)]
fn join_whitelist_entries(paths: &[String]) -> OsString {
    std::env::join_paths(paths.iter().map(PathBuf::from)).unwrap_or_else(|_| OsString::new())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn detects_path_traversal_variants() {
        assert!(is_path_traversal_attempt("../../etc/passwd"));
        assert!(is_path_traversal_attempt("..\\..\\Windows\\system32"));
        assert!(is_path_traversal_attempt("%2e%2e/%2e%2e/secret"));
        assert!(!is_path_traversal_attempt("/Users/test/Pictures/photo.cr3"));
    }

    #[test]
    fn validate_path_accepts_path_inside_whitelist() {
        let dir = TempDir::new().expect("temp dir");
        let allowed = dir.path().join("allowed");
        std::fs::create_dir_all(&allowed).expect("create allowed dir");

        let file = allowed.join("photo.cr3");
        std::fs::write(&file, b"raw").expect("create file");

        let whitelist = vec![allowed.to_string_lossy().to_string()];
        let result = validate_path(file.to_string_lossy().as_ref(), &whitelist);

        assert!(result.is_ok());
    }

    #[test]
    fn validate_path_rejects_path_outside_whitelist() {
        let dir = TempDir::new().expect("temp dir");
        let allowed = dir.path().join("allowed");
        let blocked = dir.path().join("blocked");
        std::fs::create_dir_all(&allowed).expect("create allowed dir");
        std::fs::create_dir_all(&blocked).expect("create blocked dir");

        let blocked_file = blocked.join("photo.cr3");
        std::fs::write(&blocked_file, b"raw").expect("create file");

        let whitelist = vec![allowed.to_string_lossy().to_string()];
        let result = validate_path(blocked_file.to_string_lossy().as_ref(), &whitelist);

        assert!(matches!(result, Err(SecurityError::NotInWhitelist(_))));
    }

    #[test]
    fn validate_path_rejects_traversal() {
        let whitelist = vec!["/Users/test/Pictures".to_string()];
        let result = validate_path("../../etc/passwd", &whitelist);

        assert!(matches!(
            result,
            Err(SecurityError::PathTraversalAttempt(_))
        ));
    }
}
