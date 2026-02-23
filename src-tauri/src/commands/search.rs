use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

use crate::commands::catalog::AppState;
use crate::services::search::SearchService;

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchRequest {
    pub text: String,
    pub filters: Vec<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResultDTO {
    pub id: u32,
    pub filename: String,
    pub blake3_hash: String,
    pub rating: Option<u8>,
    pub flag: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResponseDTO {
    pub results: Vec<SearchResultDTO>,
    pub total: usize,
}

#[tauri::command]
pub async fn search_images(
    request: SearchRequest,
    state: State<'_, AppState>,
) -> Result<SearchResponseDTO, String> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    let search_results = SearchService::search(&mut db, &request.text, &request.filters)?;

    let total = search_results.len();
    let results: Vec<SearchResultDTO> = search_results
        .into_iter()
        .map(|result| SearchResultDTO {
            id: result.id,
            filename: result.filename,
            blake3_hash: result.blake3_hash,
            rating: result.rating,
            flag: result.flag,
        })
        .collect();

    Ok(SearchResponseDTO { results, total })
}
