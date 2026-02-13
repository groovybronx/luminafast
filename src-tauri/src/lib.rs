mod commands;
mod database;
mod models;
mod services;

use tauri::Manager;
use database::Database;
use commands::catalog::AppState;

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
            
            // Initialize database connection for Phase 1.1
            let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");
            
            let db_path = app_data_dir.join("luminafast.db");
            let mut db = Database::new(&db_path).expect("Failed to initialize database");
            db.initialize().expect("Failed to run database migrations");
            
            log::info!("Database initialized at: {:?}", db_path);
            
            // Store database in app state for commands
            let app_state = AppState { db: std::sync::Arc::new(std::sync::Mutex::new(db)) };
            app.manage(app_state);
            
            // Initialize hashing service for Phase 1.3
            let hashing_state = commands::hashing::HashingState::new();
            app.manage(hashing_state);
            
            // Initialize filesystem service for Phase 1.4
            commands::filesystem::initialize_filesystem_service();
            
            // Initialize discovery services for Phase 2.1
            commands::discovery::initialize_discovery_services();
            
            log::info!("Hashing, filesystem and discovery services initialized");
            
            Ok(())
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
