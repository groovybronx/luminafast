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
            
            log::info!("Hashing service initialized");
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::catalog::get_all_images,
            commands::catalog::get_image_detail,
            commands::catalog::update_image_state,
            commands::catalog::create_collection,
            commands::catalog::add_images_to_collection,
            commands::catalog::get_collections,
            commands::catalog::search_images,
            commands::hashing::hash_file,
            commands::hashing::hash_files_batch,
            commands::hashing::detect_duplicates,
            commands::hashing::verify_file_integrity,
            commands::hashing::clear_hash_cache,
            commands::hashing::get_hash_cache_stats,
            commands::hashing::benchmark_hashing
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
