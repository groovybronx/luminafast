mod commands;
mod database;
mod error;
mod models;
mod services;

pub use error::{AppError, AppResult};

use commands::catalog::AppState;
use database::Database;
use log::{error, info};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            match initialize_app(app) {
                Ok(_) => {
                    info!("Application initialized successfully");
                    Ok(())
                }
                Err(e) => {
                    error!("Application initialization failed: {}", e);
                    show_error_dialog(&format!("Failed to start LuminaFast: {}", e));
                    Err(Box::new(e) as Box<dyn std::error::Error>)
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            // Catalog commands
            commands::catalog::get_all_images,
            commands::catalog::get_collections,
            commands::catalog::search_images,
            // Hashing commands
            commands::hashing::hash_file,
            // Filesystem commands
            commands::filesystem::start_watcher,
            commands::filesystem::stop_watcher,
            commands::filesystem::acquire_lock,
            commands::filesystem::release_lock,
            commands::filesystem::get_pending_events,
            commands::filesystem::get_filesystem_state,
            commands::filesystem::get_active_locks,
            commands::filesystem::is_file_locked,
            commands::filesystem::get_watcher_stats,
            commands::filesystem::list_active_watchers,
            commands::filesystem::test_permissions,
            commands::filesystem::get_file_metadata,
            commands::filesystem::create_directory,
            commands::filesystem::delete_path,
            commands::filesystem::move_path,
            commands::filesystem::copy_file,
            commands::filesystem::list_directory,
            commands::filesystem::path_exists,
            commands::filesystem::get_file_size,
            // Discovery commands
            commands::discovery::start_discovery,
            commands::discovery::stop_discovery,
            commands::discovery::get_discovery_status,
            commands::discovery::get_all_discovery_sessions,
            commands::discovery::get_discovered_files,
            commands::discovery::ingest_file,
            commands::discovery::batch_ingest,
            commands::discovery::create_discovery_config,
            commands::discovery::get_supported_formats,
            commands::discovery::validate_discovery_path,
            commands::discovery::get_default_discovery_config,
            commands::discovery::cleanup_discovery_sessions,
            commands::discovery::get_discovery_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn initialize_app(app: &mut tauri::App) -> AppResult<()> {
    info!("Initializing application...");
    
    // 1. Get app data directory
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Internal(format!("Failed to get app data dir: {}", e)))?;
    
    info!("App data directory: {:?}", app_data_dir);
    
    // 2. Create directory if needed
    if !app_data_dir.exists() {
        std::fs::create_dir_all(&app_data_dir)
            .map_err(|e| AppError::FileSystem(format!("Failed to create app data directory: {}", e)))?;
        info!("Created app data directory");
    }
    
    // 3. Initialize database
    let db_path = app_data_dir.join("luminafast.db");
    info!("Database path: {:?}", db_path);
    
    let mut db = Database::new(&db_path)
        .map_err(|e| AppError::Database(format!("Failed to initialize database: {}", e)))?;
    
    db.initialize()
        .map_err(|e| AppError::Database(format!("Failed to run database migrations: {}", e)))?;
    
    info!("Database initialized successfully");
    
    // 4. Store database in app state
    let app_state = AppState {
        db: std::sync::Arc::new(std::sync::Mutex::new(db)),
    };
    app.manage(app_state);
    
    // 5. Initialize hashing service for Phase 1.3
    let hashing_state = commands::hashing::HashingState::new();
    app.manage(hashing_state);
    info!("Hashing service initialized");
    
    // 6. Initialize filesystem service for Phase 1.4
    commands::filesystem::initialize_filesystem_service();
    info!("Filesystem service initialized");
    
    // 7. Initialize discovery services for Phase 2.1
    commands::discovery::initialize_discovery_services();
    info!("Discovery services initialized");
    
    info!("Application state initialized successfully");
    
    Ok(())
}

fn show_error_dialog(message: &str) {
    // Log the fatal error
    error!("FATAL ERROR: {}", message);
    // In a real implementation, this would show a native dialog to the user
    eprintln!("FATAL ERROR: {}", message);
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_error_module_exists() {
        // Test that AppError can be created
        let err = AppError::Internal("test".to_string());
        assert!(matches!(err, AppError::Internal(_)));
    }
}
