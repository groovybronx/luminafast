# Phase 6.0.1 — Persistance Réelle des Settings (DB + Tauri + Store)

> **Statut** : ⬜ **En attente**
> **Durée estimée** : 5-7 heures

## Objectif

Implémenter la **persistance réelle** des paramètres utilisateur :

- Créer la table SQLite `app_settings` pour stocker les configurations
- Exposer deux commandes Tauri Rust (`load_settings`, `save_settings`) pour lire/écrire la DB
- Connecter le store Zustand existant (`settingsStore`) à ces commandes
- Brancher le bouton « Enregistrer » du `SettingsModal` pour déclencher la sauvegarde avec feedback UI
- Charger les paramètres au démarrage de l'application depuis la DB

**Dépendance directe de Phase 6.0** : Cette sous-phase complète l'infrastructure UI/Store en y ajoutant la persistence stratégique.

---

## Périmètre

### ✅ Inclus dans cette phase

**Backend (Rust)** :

- Migration `008_app_settings_table.sql` : table `app_settings` (single row avec JSON blob)
- Service `src-tauri/src/services/settings.rs` : logique CRUD settings + sérialisation JSON
- Commandes Tauri `src-tauri/src/commands/settings.rs` :
  - `#[tauri::command] async fn load_settings_from_db() -> Result<SettingsConfig, String>`
  - `#[tauri::command] async fn save_settings_to_db(config: SettingsConfig) -> Result<(), String>`
- Tests Rust unitaires pour les deux fonctions
- Enregistrement des commandes dans `src-tauri/src/lib.rs`

**Frontend (TypeScript)** :

- Service `src/services/settingsService.ts` : wrappers Tauri + validation
  - `loadSettingsFromDB()` : appelle commande Tauri, retourne `SettingsConfig` ou erreur
  - `saveSettingsToDB(config)` : appelle commande Tauri, retourne succès/erreur
  - `validateEmail(email)` : regex simple (format seulement)
  - `validatePaths(config)` : check paths existent + writeable (async, timeout 2s)
  - `detectShortcutConflicts(shortcuts)` : identifie les doublons
  - `sanitizeApiKeys(config)` : masque les clés sensibles dans logs
- Modification `src/stores/settingsStore.ts` :
  - Ajouter action `loadFromDB()` : appelle `settingsService.loadSettingsFromDB()` et charge en mémoire
  - Ajouter action `saveToDBDebounced()` : debounce 1s, appelle `settingsService.saveSettingsToDB()`
- Modification `src/components/settings/SettingsModal.tsx` :
  - Implémenter handler sur bouton « Enregistrer » (collecte settings → valide → saveToDBDebounced → toast)
  - États locaux (isSaving, saveStatus, errorMessage)
  - Toast/snackbar pour feedback utilisateur
- Modification `src/App.tsx` :
  - Appeler `settingsStore.loadFromDB()` dans `useEffect([])` au montage

**Tests** :

- `src-tauri/src/services/tests/settings_service.test.rs` : ~120 lignes
- `src/__tests__/settingsService.test.ts` : ~180 lignes (validation)
- `src/__tests__/settingsStore.integration.test.ts` : ~150 lignes (mock service, debounce, errors)

**Documentation** :

- `Docs/APP_DOCUMENTATION.md` section 11.4 (nouveau) : "Settings Persistence Architecture"
- Inline comments Rust + TS sur sérialisation JSON + error handling

### ❌ Exclus (reportés intentionnellement)

- **Chiffrement des clés API/license** (Phase 6.1 — nécessite `aes-gcm`)
- **Validation en temps réel de license keys contre backend** (Phase 7)
- **Synchronisation cloud des settings** (Phase 8)
- **Migration de settings entre machines** (Phase 8)

---

## Dépendances

### Phases

- Phase 0.1 ✅ (TypeScript strict)
- Phase 0.2 ✅ (Tauri v2 + DB foundational)
- Phase 0.4 ✅ (Zustand)
- Phase 0.5 ✅ (Vitest + Testing Library)
- Phase 6.0 ✅ (Types settings.ts, store exists, components ready, modal exists)

### Ressources Externes

- `serde_json` (déjà installé)
- `thiserror` (Rust custom errors) — **À ajouter** si absent
- Aucune nouvelle dépendance npm

### Test Infrastructure

- Vitest + React Testing Library (Phase 0.5 ✅)
- Rust test framework (`#[cfg(test)]`) ✅

---

## Fichiers

### À créer

**Backend** :

- `src-tauri/migrations/008_app_settings_table.sql`
  - Table `app_settings` avec single-row constraint (`id = 1`)
  - Colonne `settings_json TEXT` pour JSON blob
  - Colonne `updated_at TIMESTAMP` auto-updaté
  - INSERT initial avec defaults

- `src-tauri/src/services/settings.rs`
  - Responsabilité : CRUD logique + sérialisation JSON (pas de Tauri-specifics)
  - `fn load_settings(conn: &Connection) -> Result<SettingsConfig, SettingsError>`
  - `fn save_settings(conn: &Connection, config: &SettingsConfig) -> Result<(), SettingsError>`
  - Custom error enum `SettingsError` dérivé de `thiserror`
  - Tests unitaires intégrés (`#[cfg(test)] mod tests { ... }`)

- `src-tauri/src/commands/settings.rs`
  - Responsabilité : Tauri IPC entry points + DB handle + error-to-String conversion
  - `#[tauri::command] async fn load_settings_from_db(state: State<AppState>) -> Result<SettingsConfig, String>`
  - `#[tauri::command] async fn save_settings_to_db(state: State<AppState>, config: SettingsConfig) -> Result<(), String>`
  - Tous les errors convertis en `String` pour serialization Tauri

- `src/__tests__/settingsService.test.ts`
  - Test `validateEmail()` : valid, invalid formats
  - Test `validatePaths()` : exists, not writable, timeout
  - Test `detectShortcutConflicts()` : no conflicts, with conflicts
  - Mock `invoke` from Tauri

- `src/__tests__/settingsStore.integration.test.ts`
  - Mock `settingsService` (loadSettingsFromDB, saveSettingsToDB)
  - Test `loadFromDB()` : updates store state
  - Test `saveToDBDebounced()` : debounce works, calls after 1s
  - Test error handling : error message displayed

### À modifier

**Backend** :

- `src-tauri/src/lib.rs`
  - Ajouter dans `mod services`: `pub mod settings;`
  - Ajouter dans `mod commands`: `pub mod settings;`
  - Ajouter dans `invoke_handler`:
    ```rust
    .invoke_handler(tauri::generate_handler![
      // ... existing
      commands::settings::load_settings_from_db,
      commands::settings::save_settings_to_db,
    ])
    ```

- `src-tauri/Cargo.toml`
  - Vérifier `thiserror = "1.0"` dans `[dependencies]` (ajouter si absent)

**Frontend** :

- `src/stores/settingsStore.ts` (~20 lignes ajoutées)
  - Importer `settingsService` au top
  - Ajouter action `loadFromDB: async () => { ... }`
  - Ajouter action `saveToDBDebounced: debounce(async (config) => { ... }, 1000)`

- `src/components/settings/SettingsModal.tsx` (~35 lignes modifiées)
  - Importer `useSettingsStore` et `settingsService`
  - Ajouter états locaux : `isSaving`, `saveStatus`, `errorMessage`
  - Implémenter handler `handleSave` sur bouton « Enregistrer »
  - Ajouter toast/snackbar UI pour feedback

- `src/App.tsx` (~15 lignes ajoutées)
  - Importer `useSettingsStore`
  - Dans `useEffect([])` : appeler `settingsStore.loadFromDB()` avec try/catch

- `Docs/APP_DOCUMENTATION.md`
  - Ajouter section 11.4 : "Settings Persistence Architecture"

---

## Interfaces Publiques

### Rust Service

```rust
// src-tauri/src/services/settings.rs

use crate::models::SettingsConfig;

#[derive(Debug, thiserror::Error)]
pub enum SettingsError {
    #[error("JSON serialization failed: {0}")]
    SerializeError(#[from] serde_json::Error),

    #[error("Database error: {0}")]
    DbError(String),

    #[error("Invalid settings: {0}")]
    ValidationError(String),
}

pub fn load_settings(conn: &rusqlite::Connection) -> Result<SettingsConfig, SettingsError>;
pub fn save_settings(conn: &rusqlite::Connection, config: &SettingsConfig) -> Result<(), SettingsError>;
```

### Rust Commands

```rust
// src-tauri/src/commands/settings.rs

#[tauri::command]
pub async fn load_settings_from_db(
    state: tauri::State<'_, AppState>,
) -> Result<SettingsConfig, String>;

#[tauri::command]
pub async fn save_settings_to_db(
    state: tauri::State<'_, AppState>,
    config: SettingsConfig,
) -> Result<(), String>;
```

### TypeScript Service

```typescript
// src/services/settingsService.ts

export async function loadSettingsFromDB(): Promise<SettingsConfig>;
export async function saveSettingsToDB(config: SettingsConfig): Promise<void>;
export function validateEmail(email: string): boolean;
export async function validatePaths(config: SettingsConfig): Promise<ValidationResult>;
export function detectShortcutConflicts(shortcuts: KeyboardShortcuts): string[];
export function sanitizeApiKeys(config: SettingsConfig): SettingsConfig;

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}
```

---

## Contraintes Techniques

### Rust Backend

- ✅ Jamais de `unwrap()` — utiliser `Result<T, E>`
- ✅ Custom error avec `thiserror` + `#[from]` pour auto-conversion
- ✅ Valider inputs (config non-null) avant save
- ✅ Transaction atomique : 1 UPDATE = 1 mutation
- ✅ Tests : min 2 tests par fonction public (happy + error)
- ✅ Pas de panics sur données invalides

### TypeScript Frontend

- ✅ Strict mode (`"strict": true`)
- ✅ Pas de `any`
- ✅ Try/catch sur tous les `invoke()`
- ✅ Debounce : dernière valeur du store = dernière sauvegardée
- ✅ Validation frontend AVANT invoke (UX fast fail)
- ✅ Feedback UI : loading → success/error
- ✅ Tests: mock Tauri invoke + settingsService

### Database

- ✅ Migration idempotente (IF NOT EXISTS ou CHECK)
- ✅ CHECK constraint `id = 1` enforced
- ✅ JSON TEXT valide

---

## Critères de Validation

### Checkpoint 1 : DB Schéma + Service Rust (1h)

- [x] Migration 008 appliquée (`SELECT * FROM app_settings` OK)
- [x] `src-tauri/src/services/settings.rs` compiles (`cargo check` ✅)
- [x] Custom error `SettingsError` dérivé via `thiserror`

### Checkpoint 2 : Commands Tauri (1h)

- [x] `src-tauri/src/commands/settings.rs` compiles
- [x] Enregistrées dans `lib.rs` invoke_handler
- [x] `cargo check` ✅ + `cargo clippy` ✅

### Checkpoint 3 : Service TypeScript (1h)

- [x] `src/services/settingsService.ts` créé (5+ fonctions)
- [x] `pnpm tsc --noEmit` ✅
- [x] `ESLint` ✅

### Checkpoint 4 : Store Integration (1h)

- [x] `settingsStore.ts` modifié : `loadFromDB()` + `saveToDBDebounced()`
- [x] `pnpm tsc --noEmit` ✅

### Checkpoint 5 : Modal + App (1h)

- [ ] Bouton « Enregistrer » branché
- [ ] UI feedback fonctionnelle (spinner, toast)
- [ ] `App.tsx` appelle `loadFromDB()` au mount
- [ ] Pas d'erreurs console

### Checkpoint 6 : Tests Rust (1h)

- [x] `cargo test --lib settings` ✅ (min 4 tests verts)

### Checkpoint 7 : Tests TypeScript (1h)

- [x] `pnpm test settingsService` ✅
- [x] `pnpm test settingsStore` ✅

### Checkpoint 8 : E2E Manual (30min)

- [ ] App démarre → settings loadés
- [ ] Modifier setting → Enregistrer → toast "Success"
- [ ] Restarrer → setting persiste
- [ ] Modifier invalid → toast "Error"

### Checkpoint 9 : Documentation (30min)

- [ ] `Docs/APP_DOCUMENTATION.md` section 11.4 ajoutée
- [ ] Inline comments sur JSON serde (Rust + TS)

---

## Livrable

Après 6.0.1 :

- ✅ Settings persistés en DB atomiquement
- ✅ Chargements au app startup
- ✅ Feedback UI (succès/erreur) sur sauvegarde
- ✅ Tests couvrant happy + error paths
- ✅ Docs synchrone

**Phase 6.0 n'est COMPLÈTE que avec 6.0.1 validée.**
