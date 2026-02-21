mod commands;
mod database;
mod models;
pub mod services;

use commands::catalog::AppState;
use database::Database;
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

            // Initialize database connection for Phase 1.1
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");

            let db_path = app_data_dir.join("luminafast.db");
            let mut db = Database::new(&db_path).expect("Failed to initialize database");
            db.initialize().expect("Failed to run database migrations");

            log::info!("Database initialized at: {:?}", db_path);

            // Store database in app state for commands
            let app_state = AppState {
                db: std::sync::Arc::new(std::sync::Mutex::new(db)),
            };
            app.manage(app_state);

            // Initialize hashing service for Phase 1.3
            let hashing_state = commands::hashing::HashingState::new();
            app.manage(hashing_state);

            // Initialize filesystem service for Phase 1.4
            commands::filesystem::initialize_filesystem_service();

            // Exposer le chemin DB réel pour l'IngestionService (OnceLock statique)
            // Doit être défini AVANT initialize_discovery_services() qui initialise la static
            std::env::set_var(
                "TAURI_APP_DATA_DIR",
                app_data_dir.to_string_lossy().as_ref(),
            );

            // Initialize discovery services for Phase 2.1
            commands::discovery::initialize_discovery_services();

            log::info!("Hashing, filesystem and discovery services initialized");

            // Initialize preview service for Phase 2.3
            tauri::async_runtime::spawn(async move {
                if let Err(e) = commands::preview::init_preview_service().await {
                    eprintln!("Failed to initialize preview service: {}", e);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Catalog commands
            commands::catalog::get_all_images,
            commands::catalog::get_collections,
            commands::catalog::search_images,
            commands::catalog::get_image_detail,
            commands::catalog::update_image_state,
            commands::catalog::create_collection,
            commands::catalog::add_images_to_collection,
            commands::catalog::delete_collection,
            commands::catalog::rename_collection,
            commands::catalog::remove_images_from_collection,
            commands::catalog::get_collection_images,
            commands::catalog::create_smart_collection,
            commands::catalog::get_smart_collection_results,
            commands::catalog::update_smart_collection,
            commands::catalog::get_folder_tree,
            commands::catalog::get_folder_images,
            commands::catalog::update_volume_status,
            // EXIF commands
            commands::exif::extract_exif,
            commands::exif::extract_exif_batch,
            // Hashing commands
            commands::hashing::hash_file,
            commands::hashing::hash_files_batch,
            commands::hashing::detect_duplicates,
            commands::hashing::verify_file_integrity,
            commands::hashing::clear_hash_cache,
            commands::hashing::get_hash_cache_stats,
            commands::hashing::benchmark_hashing,
            commands::hashing::scan_directory_for_duplicates,
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
            // Preview commands
            commands::preview::init_preview_service,
            commands::preview::generate_preview,
            commands::preview::generate_batch_previews,
            commands::preview::generate_preview_pyramid,
            commands::preview::is_preview_cached,
            commands::preview::get_preview_cache_info,
            commands::preview::cleanup_preview_cache,
            commands::preview::remove_preview,
            commands::preview::get_preview_path,
            commands::preview::generate_previews_with_progress,
            commands::preview::benchmark_preview_generation,
            commands::preview::get_preview_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
