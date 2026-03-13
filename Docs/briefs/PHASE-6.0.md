# Phase 6.0 — Settings Framework Professionnel (Lightroom++)

> **Statut** : ⬜ **En attente**
> **Durée estimée** : 7-10 jours

## Objectif

Créer un **système Settings complet et professionnel** (niveau Lightroom) permettant une configuration exhaustive de l'application : stockage, cache, previews, API, infos utilisateur, raccourcis clavier, licence. Single source of truth pour TOUS les paramètres. Interface extensible + persistance SQLite.

## Périmètre

### 🔵 À compléter impérativement dans cette phase

- Le bouton « Enregistrer » du SettingsModal doit déclencher une vraie persistance :
  - Collecte des valeurs modifiées via le store (Zustand)
  - Persistance dans la base SQLite (table `app_settings` ou équivalent)
  - Commande Tauri Rust exposée pour lecture/écriture des settings
  - Feedback UI (succès/erreur) après sauvegarde
  - Validation côté frontend (avant envoi) et côté backend (avant écriture)
  - Les paramètres doivent être relus au démarrage de l’application
  - Toute modification doit être testée (unitaires + intégration)

Sans cette persistance réelle, la phase 6.0 ne peut pas être considérée comme complète.

### ✅ Inclus dans cette phase

**Frontend (TypeScript/React)** : Composant Settings **professionnel** avec 9 catégories

- **SettingsModal.tsx** : modal principal multi-tabs responsive
- **9 Catégories** (chacune un composant dédié) :
  1. **SettingsCategoryStorage.tsx** — Emplacements de stockage
     - Path catalogue principal (dialog file picker)
     - Path pour DB SQLite (configurable)
     - Path pour Previews.lrdata/ (configuration custom path)
     - Validation : vérifier espace libre, permissions R/W
     - Bouton : "Browse..." pour chaque chemin

  2. **SettingsCategoryCache.tsx** — Gestion cache avancée
     - L1 limit (RAM) : slider 100-2000 MB
     - L2 limit (Disk) : slider 1-20 GB
     - L3 origin : dropdown (auto/manual fetch)
     - Prune threshold : slider 70-95 %
     - Éviction priority : dropdown (LRU / LFU / FIFO)
     - Cache hit rate display (live)
     - Boutons : "Clear All", "Optimize Now"
     - Affichage disk usage % par tier

  3. **SettingsCategoryPreview.tsx** — Génération & qualité previews
     - Configurations par type de preview (thumbnail, standard, native)
     - type de fichier : dropdown (JPEG)
     - Thumbnail size : slider 1-4(360(low)/(medium)480/(high)720/(ultra)1080 px bord long)
     - Thumbnail quality : slider 50-100
     - Standard size : dropdown (720/1440/2880 px)
     - Standard JPEG quality : slider 50-100
     - Native size : dropdown (100% / 95% / 90% original)
     - Native JPEG quality : slider 50-100
     - Auto-generate on import : toggle
     - Background processing : toggle
     - Parallel worker count : slider 1-8 (CPU cores)

  4. **SettingsCategoryKeyboardShortcuts.tsx** — Raccourcis clavier
     - Liste complète des commandes : import, develop, collections, search, etc.
     - Chaque shortcut : Input text + recording button pour recorder nouveau
     - Profiles : "Lightroom Compatible", "Adobe", "Custom"
     - Reset to defaults button
     - Conflict detection (warning if same key used 2x)
     - Export/Import profile JSON

  5. **SettingsCategoryStorage.tsx** — voir ci-dessus (renommé)

  6. **SettingsCategoryUserProfile.tsx** — Infos personnelles & licence
     - Full name (text)
     - Email (text with validation)
     - Organization/Studio (text, optional)
     - License key input (validation + status indicator)
     - License type dropdown : "Free", "Pro", "Enterprise"
     - Activation date + expiry (read-only if activated)
     - License status badge (Valid/Expired/Trial)

  7. **SettingsCategoryAI.tsx** — Paramètres AI & ML
     - AI enabled toggle
     - API provider dropdown : "OpenAI", "Claude", "Local", "Custom"
     - API key input (masked, show/hide button)
     - Model selector per task :
       - Face recognition : dropdown (builtin / MTCNN / MediaPipe..)
       - Auto-tagging : model dropdown (Vision / GPT-4 / Claude...)
       - Smart descriptions : model dropdown
     - Confidence threshold slider : 50-95 %
     - Local model path (if using local inference)
     - Enable privacy mode toggle (process locally, no cloud)

  8. **SettingsCategoryAppearance.tsx** — Interface & apparence
     - Theme : dropdown (Auto, Light, Dark)
     - Font size : slider (50-120 %)
     - Sidebar position : radio (Left, Right)
     - Show grid lines toggle
     - Filmstrip position : dropdown (Bottom, Right, Hidden, auto)
     - Tooltip delays (ms) : slider 100-1000
     - Window state on startup : dropdown (Restore, Fullscreen, Windowed)

  9. **SettingsCategoryAbout.tsx** — À propos & support
     - App version + build info
     - License info
     - Credits (contributors, libraries)
     - Links (GitHub, documentation, support)
     - Check for updates button
     - Telemetry toggle (anonymous usage stats, off by default)
     - Reset all settings button (with confirmation)

**Backend (Rust)**:

- Optional : command `get_system_info()` (CPU, RAM, Disk for display)
- Optional : command `validate_path(path)` (check permissions, space)
- Optional : command `get_license_status()` (verify license key)

**Database (SQLite)**:

- Table `app_settings` : key-value store JSON
  - Schéma : `{ id INTEGER PRIMARY KEY, setting_key TEXT UNIQUE, setting_value TEXT, updated_at TIMESTAMP }`
  - Alternative (simpler) : single row with JSON blob `{ id=1, all_settings_json }`

**Store (Zustand)** :

- Single `settingsStore` holding entire SettingsConfig
- Typed actions per category
- Auto-persistence to DB on any change (debounced)
- Validation logic per field

**Integration** :

- TopNav button : Settings icon → open SettingsModal
- Keyboard shortcut : Cmd+, (macOS) / Ctrl+, (Windows/Linux)
- Shortcuts dynamically update on change (no restart needed)
- Storage paths validated on save (must exist, must have permissions)
- AI settings enable/disable dependent features in UI

**Documentation** :

- Update `APP_DOCUMENTATION.md` : "Settings & Configuration" section (detailed per category)
- Code comments : rationale for each slider range, default value

### ❌ Exclus (reportés ou future)

- **Actual AI model integration** (Phase 6.1+ when API keys are used)
- **License key validation against backend** (Phase 7 or later)
- **Telemetry implementation** (Phase 7)
- **Cloud sync of settings** (Phase 8)
- **Backup settings to cloud** (Phase 8)
- **Settings migration between machines** (Phase 8)

### 📋 Rapports de dépendance

- **Phase 6.1** (Cache) : utilise SettingsCategoryCache pour sliders
- **Phase 6.2+** (Preview rendering) : utilise SettingsCategoryPreview
- **Phase 7** (License) : utilise SettingsCategoryUserProfile
- **Future AI phases** : utilisent SettingsCategoryAI

---

## Dépendances

### Phases

- Phase 0.3 ✅ (composants modulaires OK)
- Phase 0.4 ✅ (Zustand pour state management)
- Aucune autre dépendance

### Ressources Externes

- Aucune nouvelle (Zustand, React, TailwindCSS déjà présents)

### Test Infrastructure

- Vitest + React Testing Library (Phase 0.5 ✅)

## Fichiers

### À créer

**Frontend Types**:

- `src/types/settings.ts` (~200 lines)

  ```typescript
  interface StorageConfig {
    catalogue_root: string;
    database_path: string;
    previews_path: string;
    smart_previews_path: string;
  }

  interface CacheConfig {
    l1_limit_mb: number; // 100-2000
    l2_limit_gb: number; // 1-20
    l3_mode: 'auto' | 'manual';
    prune_threshold_percent: number; // 70-95
    eviction_priority: 'lru' | 'lfu' | 'fifo';
  }

  interface PreviewConfig {
    thumbnail_size_px: 160 | 240 | 320;
    thumbnail_quality: number; // 70-85
    standard_size_px: 720 | 1440 | 2880;
    standard_quality: number; // 85-95
    native_percentage: 90 | 95 | 100;
    native_quality: number; // 90-100
    auto_generate: boolean;
    background_processing: boolean;
    parallel_workers: number; // 1-8
  }

  interface KeyboardShortcuts {
    [commandName: string]: string; // e.g., { import: 'Cmd+I', ... }
  }

  interface UserProfile {
    full_name: string;
    email: string;
    organization: string;
    license_key: string;
    license_type: 'free' | 'pro' | 'enterprise';
  }

  interface AIConfig {
    enabled: boolean;
    provider: 'openai' | 'claude' | 'local' | 'custom';
    api_key: string;
    face_recognition_model: string;
    auto_tagging_model: string;
    smart_descriptions_model: string;
    confidence_threshold: number; // 50-95
    local_model_path: string;
    privacy_mode: boolean;
  }

  interface AppearanceConfig {
    theme: 'auto' | 'light' | 'dark';
    font_size_percent: number; // 90-120
    sidebar_position: 'left' | 'right';
    show_grid_lines: boolean;
    filmstrip_position: 'bottom' | 'right' | 'hidden';
    tooltip_delay_ms: number; // 100-1000
    window_state: 'restore' | 'fullscreen' | 'windowed';
  }

  interface SettingsConfig {
    storage: StorageConfig;
    cache: CacheConfig;
    preview: PreviewConfig;
    keyboard: KeyboardShortcuts;
    user: UserProfile;
    ai: AIConfig;
    appearance: AppearanceConfig;
    telemetry_enabled: boolean;
    last_updated: string; // ISO timestamp
  }
  ```

**Frontend Store**:

- `src/stores/settingsStore.ts` (~200 lines)
  - Zustand store with typed state
  - Actions: `updateStorage()`, `updateCache()`, `updatePreview()`, `updateKeyboard()`, `updateUserProfile()`, `updateAI()`, `updateAppearance()`
  - Auto-persist to DB (debounced 1s)
  - Validation logic per category
  - Selectors: `selectCacheConfig()`, `selectStoragePaths()`, etc.

**Frontend Components**:

- `src/components/settings/SettingsModal.tsx` (~280 lines)
  - Tab navigation (9 tabs)
  - Modal container + backdrop
  - Keyboard shortcut listener (Cmd+, / Ctrl+,)
  - Save/Cancel buttons

- `src/components/settings/SettingsCategoryStorage.tsx` (~220 lines)
  - 4 path inputs with "Browse" buttons
  - Validation display (✅ Valid / ⚠️ Warning / ❌ Error)
  - Disk space indicator
  - Confirmation dialog for path changes (warn if data might be lost)

- `src/components/settings/SettingsCategoryCache.tsx` (~250 lines)
  - Sliders for L1, L2, prune threshold
  - Dropdown for eviction priority
  - Live cache status display (usage bars)
  - "Clear All", "Optimize Now" buttons

- `src/components/settings/SettingsCategoryPreview.tsx` (~250 lines)
  - Dropdowns for thumbnail/standard/native sizes
  - Quality sliders (3 tiers)
  - Toggle for auto-generate + background processing
  - Parallel workers slider
  - Preview of output quality (comparison image)

- `src/components/settings/SettingsCategoryKeyboardShortcuts.tsx` (~350 lines)
  - Table : Command, Current Key, Actions (Edit/Reset)
  - Recording UI : press keys, show conflict warnings
  - Profile selector dropdown (Lightroom/Adobe/Custom)
  - Filter/search by command name
  - Import/Export JSON buttons

- `src/components/settings/SettingsCategoryUserProfile.tsx` (~180 lines)
  - Text inputs : name, email, organization
  - License key input + validation indicator
  - License type dropdown
  - Expiry date display (when activated)
  - License status badge

- `src/components/settings/SettingsCategoryAI.tsx` (~280 lines)
  - Master toggle for AI features
  - Provider dropdown
  - API key input (masked, with show/hide)
  - Model selectors per task (face, tagging, descriptions)
  - Confidence threshold slider
  - Local model path input (conditional on provider='local')
  - Privacy mode toggle
  - Test API button (try connection)

- `src/components/settings/SettingsCategoryAppearance.tsx` (~200 lines)
  - Theme dropdown (radio buttons)
  - Font size slider
  - Sidebar position radio
  - Grid toggle
  - Filmstrip position dropdown
  - Tooltip delay slider
  - Window state dropdown
  - Live preview of theme change

- `src/components/settings/SettingsCategoryAbout.tsx` (~150 lines)
  - Version info + build metadata
  - Credits list (contributors)
  - License text
  - Links (GitHub, docs, issues)
  - Check updates button
  - Telemetry toggle
  - Reset all settings button (with scary warning 💀)

**Shared UI Components** (atomic):

- `src/components/ui/SettingToggle.tsx` (~60 lines) — Reusable toggle input
- `src/components/ui/SettingSlider.tsx` (~80 lines) — Reusable slider with label + value
- `src/components/ui/SettingDropdown.tsx` (~70 lines) — Reusable dropdown
- `src/components/ui/SettingTextInput.tsx` (~70 lines) — Reusable text field
- `src/components/ui/SettingFileInput.tsx` (~100 lines) — Path picker with "Browse" button
- `src/components/ui/ValidationBadge.tsx` (~40 lines) — Shows ✅/⚠️/❌ status

**Frontend Services**:

- `src/services/settingsService.ts` (~120 lines)
  - Function `loadSettingsFromDB()` : fetch from Tauri
  - Function `saveSettingsToDB(config)` : persist to Tauri
  - Function `validatePaths(config)` : check if paths exist + writable
  - Function `validateEmail(email)` : email regex
  - Function `validateLicenseKey(key)` : format check (not real validation)
  - Function `detectShortcutConflicts(shortcuts)` : find duplicates

**Tests**:

- `src/__tests__/SettingsModal.test.tsx` (~150 lines)
  - Test modal opens/closes
  - Test tab switching
  - Test keyboard shortcut (Cmd+,)
  - Test toggle persistence

- `src/__tests__/settingsStore.test.ts` (~200 lines)
  - Test each category update action
  - Test persistence to mock DB
  - Test validation logic

- `src/__tests__/settingsService.test.ts` (~150 lines)
  - Test path validation
  - Test email validation
  - Test shortcut conflict detection

**Database** (Rust):

- Migration `008_app_settings_table.sql` (~40 lines)
  ```sql
  CREATE TABLE app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    settings_json TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  INSERT INTO app_settings (id, settings_json)
  VALUES (1, '{}');
  ```

### À modifier

**Frontend**:

- `src/components/layout/TopNav.tsx`
  - Import Settings icon from lucide-react
  - Add button : `<button onClick={() => setSettingsOpen(true)}>`
  - Icon positioning (top-right near version info)

- `src/App.tsx`
  - Add state : `const [settingsOpen, setSettingsOpen] = useState(false)`
  - Mount `<SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />`
  - Initialize `settingsStore.loadSettings()` on app mount

- `src/types/index.ts`
  - Export all types from `settings.ts`

**Backend** (optional, Rust):

- `src-tauri/src/commands/system.rs` (create if not exists)
  - Add `#[tauri::command] fn get_system_info() -> SystemInfo`
  - Returns : CPU count, RAM available, Disk available

- `src-tauri/src/lib.rs`
  - Register command `get_system_info` if added
  - Ensure DB handle available for settings queries

---

## Interfaces Publiques

### TypeScript Complete SettingsConfig

```typescript
interface SettingsConfig {
  // Storage
  storage: {
    catalogue_root: string; // e.g., '/Users/john/LuminaFast'
    database_path: string; // e.g., '/Users/john/LuminaFast/catalog.db'
    previews_path: string; // e.g., '/Volumes/FastDisk/Previews.lrdata'
    smart_previews_path: string; // optional
  };

  // Cache (Phase 6.1 modifie ces valeurs via UI)
  cache: {
    l1_limit_mb: number;
    l2_limit_gb: number;
    l3_mode: 'auto' | 'manual';
    prune_threshold_percent: number;
    eviction_priority: 'lru' | 'lfu' | 'fifo';
  };

  // Preview Generation
  preview: {
    thumbnail_size_px: 160 | 240 | 320;
    thumbnail_quality: number;
    standard_size_px: 720 | 1440 | 2880;
    standard_quality: number;
    native_percentage: 90 | 95 | 100;
    native_quality: number;
    auto_generate: boolean;
    background_processing: boolean;
    parallel_workers: number;
  };

  // Keyboard (Phase 7+ modifie via UI)
  keyboard: {
    [commandName: string]: string; // e.g., { 'import': 'Cmd+I', 'develop': 'D', ... }
  };

  // User
  user: {
    full_name: string;
    email: string;
    organization: string;
    license_key: string;
    license_type: 'free' | 'pro' | 'enterprise';
  };

  // AI Integration
  ai: {
    enabled: boolean;
    provider: 'openai' | 'claude' | 'local' | 'custom';
    api_key: string; // encrypted when stored
    face_recognition_model: string;
    auto_tagging_model: string;
    smart_descriptions_model: string;
    confidence_threshold: number;
    local_model_path: string;
    privacy_mode: boolean;
  };

  // Appearance
  appearance: {
    theme: 'auto' | 'light' | 'dark';
    font_size_percent: number;
    sidebar_position: 'left' | 'right';
    show_grid_lines: boolean;
    filmstrip_position: 'bottom' | 'right' | 'hidden';
    tooltip_delay_ms: number;
    window_state: 'restore' | 'fullscreen' | 'windowed';
  };

  // Global
  telemetry_enabled: boolean;
  last_updated: string; // ISO timestamp
}
```

### Zustand Store Actions

```typescript
settingsStore.update = (category: keyof SettingsConfig, updates: any) => void;
settingsStore.loadSettings = () => Promise<void>;
settingsStore.resetToDefaults = () => void;
settingsStore.getSettings = () => SettingsConfig;
settingsStore.validate = (config: SettingsConfig) => ValidationResult;
```

### React Component Props

```typescript
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SettingsCategoryProps {
  onUpdate: (key: string, value: any) => void;
}
```

---

## Contraintes Techniques

### React/TypeScript

- Strict mode (`"strict": true`) — no `any`
- All SettingsConfig fields must be typed
- Modal accessibility : focus trap, ESC to close, keyboard navigation
- Form validation : real-time, show errors below fields
- No prop drilling → use settingsStore for all state

### Database (SQLite)

- Single atomic write per update (transaction)
- JSON serialization/deserialization
- Encryption for sensitive fields (API keys, license keys)
- Auto-backup on major version upgrades

### Performance

- Modal render < 100ms
- Settings.update() → DB write async (debounced 1s, non-blocking)
- Path validation : async, timeout 2s
- No reload delays (all settings applied immediately)

### Security

- API keys : encrypted with `password-hash` or similar
- Never log sensitive fields
- License key : masked in UI (show last 4 chars only)
- Validation errors reported to user, errors logged locally (no telemetry)

### Lightroom Parity

- Default values match Lightroom settings where applicable
- Keyboard shortcuts : provide Lightroom-compatible profiles
- License types : Free, Pro, Enterprise (align with Lr)
- Preview quality presets : standard = same as Lightroom native resolution

---

## Critères de Validation

### Phase 1 : Types & Store Foundation

- [ ] SettingsConfig fully typed (9 categories, 40+ fields)
- [ ] settingsStore compiles without errors
- [ ] TypeScript `tsc --noEmit` ✅
- [ ] All types exported from `src/types/index.ts`

### Phase 2 : Component Structure

- [ ] SettingsModal renders without errors
- [ ] All 9 tabs visible + clickable
- [ ] Tab switching works (activeTab state)
- [ ] Modal opens/closes (keyboard shortcut works)
- [ ] ESC closes modal
- [ ] `pnpm lint` ✅

### Phase 3 : Category Components

- [ ] Each SettingsCategoryX.tsx compiles + renders
- [ ] Storage paths : inputs + browse buttons work
- [ ] Cache : sliders functional (no errors)
- [ ] Preview : dropdowns + sliders work
- [ ] Keyboard : command list displays + edit mode works
- [ ] User : text inputs + validation display
- [ ] AI : dropdown + API key masked input
- [ ] Appearance : theme toggle shows live preview
- [ ] About : version displays correctly

### Phase 4 : Store Integration

- [ ] settingsStore initializes on app mount
- [ ] updateSetting() triggers store mutation
- [ ] settingsStore values flow to components (2-way binding)
- [ ] Manual test : change value in UI → store updates → shows in console

### Phase 5 : Persistence

- [ ] Settings save to DB asynchronously (debounced)
- [ ] App restart → settings load from DB
- [ ] All 9 categories persist correctly
- [ ] Manual test : set all values → restart → verify all present

### Phase 6 : Validation

- [ ] Path validation : red border if invalid, ✅ green if valid
- [ ] Email validation : shows error if format wrong
- [ ] Shortcut conflicts : warning if same key used 2x
- [ ] Slider ranges : can't exceed min/max
- [ ] License key : shows status (Valid/Invalid/Expired)

### Phase 7 : Integration & Polish

- [ ] TopNav Settings button wired (opens modal)
- [ ] Keyboard shortcut Cmd+, (macOS) + Ctrl+, (Windows/Linux)
- [ ] Modal closes when setting saved (optional UX choice)
- [ ] No console warnings/errors
- [ ] Modal responsive on small screens
- [ ] All text readable (contrast WCAG AA)

### Phase 8 : Tests & Docs

- [ ] SettingsModal tests pass (Vitest)
- [ ] settingsStore tests pass
- [ ] settingsService tests pass (validation logic)
- [ ] `pnpm test` ✅
- [ ] `APP_DOCUMENTATION.md` updated (Settings section, 9 categories documented)
- [ ] Inline code comments on complex logic

### Phase 9 : Final Manual Validation

- [ ] Settings modal : "feels professional" (design consistency, no rough edges)
- [ ] Each category : logical organization (not overwhelming)
- [ ] Defaults are sane (app runs with defaults, no weird values)
- [ ] No data loss : change setting → restart → setting preserved
- [ ] Lightroom veterans : recognize familiar options (keyboard profiles, license model)

---

## Architecture Decision Log

### Decision 1 : Single Giant SettingsConfig vs Nested Objects

- **Option A** : Flat object (showCacheStatus, cacheL1, cacheL2, ...)
- **Option B** : Nested (storage.**_, cache._**, preview.\*\*\*) (chosen)
- **Rationale** : Nested groups visually in code, easier to understand which settings belong together, mirrors UI tabs

### Decision 2 : Settings Storage

- **Option A** : SQLite table (chosen)
- **Option B** : JSON file on disk
- **Option C** : localStorage (too limited for many fields)
- **Rationale** : Consistent with app DB, benefits from transactions, easier to query later

### Decision 3 : Encryption for Sensitive Fields

- **Option A** : Plain text (quick but unsafe)
- **Option B** : Encrypt API keys + license keys (chosen)
- **Option C** : Encrypt everything
- **Rationale** : Only sensitive data encrypted, performance acceptable, user's data safe

### Decision 4 : Keyboard Shortcut Format

- **Option A** : String (chosen) : "Cmd+I", "Ctrl+Shift+X"
- **Option B** : Object : { cmd: true, shift: true, key: 'I' }
- **Rationale** : String easier to parse/display, human-readable in DB

### Decision 5 : Settings Persistence Delay

- **Option A** : Immediate (every keystroke)
- **Option B** : Debounced 1s (chosen)
- **Option C** : Manual "Save" button
- **Rationale** : Debounce prevents excessive DB writes, still feels immediate to user

### Decision 6 : Module API (Lightroom Integration)

- **Option A** : No module system (settings local only)
- **Option B** : Expose settings as module API for future plugins (future)
- **Chosen** : Prepare foundations in Phase 6.0, actual module system in Phase 8
- **Rationale** : Lightroom has rich plugin ecosystem; LuminaFast should too

---

## Future Extensibility

Adding a new setting in Phase 6.1+ requires:

```typescript
// 1. Update src/types/settings.ts
interface SettingsConfig {
  // ... existing categories
  mynewcategory: {
    my_new_setting: string | number | boolean;
  };
}

// 2. Add default to settingsStore initial state
const initialState = {
  // ...
  mynewcategory: {
    my_new_setting: 'default_value',
  },
};

// 3. Create new component (or add to existing category)
// src/components/settings/SettingsCategoryMyNewCategory.tsx

// 4. Add tab to SettingsModal
<Tab name="My Category" component={SettingsCategoryMyNewCategory} />

// 5. Done! Store + DB handle the rest.
```

---

## Deliverables Checklist

### Code Architecture (9 Categories × ~200-300 lines each)

- [ ] `src/types/settings.ts` (~200 lines, complete SettingsConfig interface)
- [ ] `src/stores/settingsStore.ts` (~200 lines, Zustand with persistence)
- [ ] `src/components/settings/SettingsModal.tsx` (~280 lines, tab system)
- [ ] `src/components/settings/SettingsCategoryStorage.tsx` (~220 lines)
- [ ] `src/components/settings/SettingsCategoryCache.tsx` (~250 lines)
- [ ] `src/components/settings/SettingsCategoryPreview.tsx` (~250 lines)
- [ ] `src/components/settings/SettingsCategoryKeyboardShortcuts.tsx` (~350 lines)
- [ ] `src/components/settings/SettingsCategoryUserProfile.tsx` (~180 lines)
- [ ] `src/components/settings/SettingsCategoryAI.tsx` (~280 lines)
- [ ] `src/components/settings/SettingsCategoryAppearance.tsx` (~200 lines)
- [ ] `src/components/settings/SettingsCategoryAbout.tsx` (~150 lines)

### Reusable UI Components (Atomic)

- [ ] `src/components/ui/SettingToggle.tsx`
- [ ] `src/components/ui/SettingSlider.tsx`
- [ ] `src/components/ui/SettingDropdown.tsx`
- [ ] `src/components/ui/SettingTextInput.tsx`
- [ ] `src/components/ui/SettingFileInput.tsx`
- [ ] `src/components/ui/ValidationBadge.tsx`

### Services & Utilities

- [ ] `src/services/settingsService.ts` (~120 lines, validation + DB I/O)
- [ ] `src/utils/settingsDefaults.ts` (~50 lines, default values per category)
- [ ] `src/utils/settingsValidation.ts` (~150 lines, validators)

### Tests

- [ ] `src/__tests__/SettingsModal.test.tsx` (~150 lines)
- [ ] `src/__tests__/settingsStore.test.ts` (~200 lines)
- [ ] `src/__tests__/settingsService.test.ts` (~150 lines)
- [ ] `src/__tests__/settings.integration.test.ts` (~100 lines, end-to-end)

### Database & Backend

- [ ] `src-tauri/migrations/008_app_settings_table.sql` (~40 lines)
- [ ] `src-tauri/src/commands/system.rs` (optional, get_system_info)
- [ ] `src-tauri/src/lib.rs` — Register new commands + migrations

### Documentation & Integration

- [ ] `src/components/layout/TopNav.tsx` — Add Settings button
- [ ] `src/App.tsx` — Mount SettingsModal + keyboard shortcut
- [ ] `Docs/APP_DOCUMENTATION.md` — "Settings & Configuration" section (detailed per category)
- [ ] Inline code comments (especially validation logic)
- [ ] CHANGELOG.md — Phase 6.0 entry

---
