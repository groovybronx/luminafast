# LuminaFast — Stratégie de Tests

> **Les tests sont OBLIGATOIRES et doivent être écrits EN PARALLÈLE du code, jamais après.**
> Aucun code ne peut être livré sans ses tests correspondants.

---

## 1. Principes Fondamentaux

1. **Tests first ou tests parallel** — jamais "tests later"
2. **Un test ne peut pas être modifié pour passer** sans justification explicite de pourquoi l'hypothèse initiale du test était fausse
3. **Couverture minimale exigée** : 80% des lignes pour le backend Rust, 70% pour le frontend React
4. **Les tests des phases précédentes doivent continuer à passer** — toute régression est un blocage
5. **Les tests doivent être déterministes** — pas de dépendance à l'heure, au réseau ou à l'ordre d'exécution

---

## 2. Structure des Fichiers de Tests

### Frontend (TypeScript/React)
```
src/
├── __tests__/                    # Tests d'intégration frontend globaux
│   └── app.integration.test.tsx
├── components/
│   ├── layout/
│   │   ├── TopNav.tsx
│   │   └── __tests__/
│   │       └── TopNav.test.tsx   # Test co-localisé avec le composant
│   ├── library/
│   │   ├── GridView.tsx
│   │   └── __tests__/
│   │       └── GridView.test.tsx
│   └── ...
├── stores/
│   ├── catalogStore.ts
│   └── __tests__/
│       └── catalogStore.test.ts
├── services/
│   ├── catalogService.ts
│   └── __tests__/
│       └── catalogService.test.ts
├── hooks/
│   ├── useKeyboardShortcuts.ts
│   └── __tests__/
│       └── useKeyboardShortcuts.test.ts
└── lib/
    ├── queryParser.ts
    └── __tests__/
        └── queryParser.test.ts
```

### Backend (Rust/Tauri)
```
src-tauri/
├── src/
│   ├── catalog.rs          # Tests unitaires intégrés (#[cfg(test)])
│   ├── hashing.rs          # Tests unitaires intégrés
│   ├── preview.rs          # Tests unitaires intégrés
│   ├── filesystem.rs       # Tests unitaires intégrés
│   └── commands/
│       ├── mod.rs
│       └── tests/          # Tests d'intégration des commandes Tauri
│           ├── catalog_commands_test.rs
│           └── import_commands_test.rs
└── tests/                  # Tests d'intégration Rust
    ├── catalog_integration.rs
    ├── import_pipeline.rs
    └── blake3_hashing.rs
```

### Tests End-to-End
```
e2e/
├── import.spec.ts          # Test E2E du pipeline d'import
├── library.spec.ts         # Test E2E de la bibliothèque
├── develop.spec.ts         # Test E2E du module développement
├── collections.spec.ts     # Test E2E des collections
└── fixtures/
    ├── sample_raw.raf      # Fichier RAW de test (petit)
    ├── sample_jpeg.jpg     # JPEG de test
    └── sample_with_exif.jpg # JPEG avec métadonnées EXIF complètes
```

---

## 3. Types de Tests par Couche

### 3.1 — Tests Unitaires Rust (`cargo test`)
**Portée** : Fonctions individuelles, modules isolés
**Framework** : Module `#[cfg(test)]` intégré + `assert!` macros
**Quand** : À chaque fonction publique créée

```rust
// Exemple : src-tauri/src/hashing.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_blake3_hash_deterministic() {
        let data = b"test data";
        let hash1 = compute_blake3_from_bytes(data);
        let hash2 = compute_blake3_from_bytes(data);
        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_blake3_hash_different_for_different_input() {
        let hash1 = compute_blake3_from_bytes(b"data1");
        let hash2 = compute_blake3_from_bytes(b"data2");
        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_empty_input_returns_valid_hash() {
        let hash = compute_blake3_from_bytes(b"");
        assert!(!hash.is_empty());
    }
}
```

### 3.2 — Tests d'Intégration Rust (`tests/`)
**Portée** : Interactions entre modules (DB + hashing + filesystem)
**Framework** : `#[test]` dans le dossier `tests/`
**Quand** : À chaque sous-phase impliquant le backend

```rust
// Exemple : src-tauri/tests/catalog_integration.rs
#[test]
fn test_import_creates_image_with_exif() {
    let db = create_test_catalog();
    let result = import_image(&db, "fixtures/sample.raf");
    assert!(result.is_ok());

    let image = get_image_by_hash(&db, &result.unwrap().blake3_hash);
    assert!(image.is_some());
    assert!(image.unwrap().exif.iso > 0);
}
```

### 3.3 — Tests de Composants React (Vitest + Testing Library)
**Portée** : Composants individuels, rendu et interactions
**Framework** : `vitest` + `@testing-library/react`
**Quand** : À chaque composant créé ou modifié

```typescript
// Exemple : src/components/library/__tests__/GridView.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { GridView } from '../GridView';
import { mockImages } from '@/test-utils/fixtures';

describe('GridView', () => {
  it('renders correct number of thumbnails', () => {
    render(<GridView images={mockImages(10)} />);
    expect(screen.getAllByRole('img')).toHaveLength(10);
  });

  it('calls onSelect when thumbnail is clicked', () => {
    const onSelect = vi.fn();
    render(<GridView images={mockImages(5)} onSelect={onSelect} />);
    fireEvent.click(screen.getAllByRole('img')[0]);
    expect(onSelect).toHaveBeenCalledWith(0, expect.any(Object));
  });

  it('highlights selected images', () => {
    render(<GridView images={mockImages(5)} selection={[1, 3]} />);
    // Vérifier les classes CSS de sélection
  });
});
```

### 3.4 — Tests de Stores Zustand (Vitest)
**Portée** : Logique d'état, actions, sélecteurs
**Framework** : `vitest`
**Quand** : À chaque store créé ou modifié

```typescript
// Exemple : src/stores/__tests__/catalogStore.test.ts
import { useCatalogStore } from '../catalogStore';

describe('catalogStore', () => {
  beforeEach(() => {
    useCatalogStore.getState().reset();
  });

  it('adds images to the catalog', () => {
    const { addImages } = useCatalogStore.getState();
    addImages(mockImages(5));
    expect(useCatalogStore.getState().images).toHaveLength(5);
  });

  it('filters images by rating', () => {
    // ...
  });
});
```

### 3.5 — Tests End-to-End (Playwright ou Tauri test driver)
**Portée** : Flux utilisateur complets dans l'app Tauri
**Framework** : `@playwright/test` ou `tauri-driver`
**Quand** : À la fin de chaque phase majeure (0, 1, 2, 3, 4, 5, 6, 7)

---

## 4. Convention de Nommage des Tests

| Type | Pattern | Exemple |
|------|---------|---------|
| Test unitaire Rust | `test_<module>_<behavior>` | `test_blake3_hash_deterministic` |
| Test intégration Rust | `test_<workflow>_<expected_result>` | `test_import_creates_image_with_exif` |
| Test composant React | `<Component>.test.tsx` | `GridView.test.tsx` |
| Test store | `<storeName>.test.ts` | `catalogStore.test.ts` |
| Test service | `<serviceName>.test.ts` | `catalogService.test.ts` |
| Test E2E | `<feature>.spec.ts` | `import.spec.ts` |

### Nommage des blocs `describe` / `it` :
```
describe('<NomDuModule>')
  it('<verbe à la 3e personne> <comportement attendu>')
```
Exemples :
- `it('renders correct number of thumbnails')`
- `it('returns empty array when no images match filter')`
- `it('persists rating after app restart')`

---

## 5. Matrice de Couverture par Sous-Phase

| Sous-Phase | Tests Unitaires | Tests Intégration | Tests Composants | Tests E2E |
|-----------|----------------|-------------------|------------------|-----------|
| 0.1 TypeScript | — | — | Compilation check | — |
| 0.2 Tauri | — | Build check | — | App launches |
| 0.3 Modules | — | — | Chaque composant extrait | — |
| 0.4 Zustand | — | — | Chaque store | — |
| 0.5 CI | — | Pipeline verte | — | — |
| 1.1 SQLite | Schema + CRUD | Migrations | — | — |
| 1.2 Commands | DTO serde | Tauri invoke | Service wrappers | — |
| 1.3 BLAKE3 | Hash functions | Dedup detection | — | — |
| 1.4 Filesystem | Path resolution | Watcher + lock | — | — |
| 2.1 Import | Scanner | Pipeline complète | — | Import 10 files |
| 2.2 EXIF | Parser | Harvest + store | — | — |
| 2.3 Previews | Resize | Pyramid generation | — | — |
| 2.4 Import UI | — | — | ImportModal | Import flow |
| 3.1 Grid | — | — | GridView + virtual | — |
| 3.2 Collections | CRUD SQL | Add/remove images | Sidebar tree | — |
| 3.3 Smart | Query parser | Dynamic results | Rule builder UI | — |
| 3.4 Folders | — | Path tree | Folder browser | — |
| 3.5 Search | Query parser | Full pipeline | SearchBar | Search flow |
| 4.1 Events | Replay logic | Snapshot + replay | — | — |
| 4.2 Render | Filter math | Pipeline chain | Slider → preview | — |
| 4.3 History | — | — | HistoryPanel | Time travel |
| 4.4 Before/After | — | — | SplitView | — |
| 5.1 EXIF Panel | — | — | ExifPanel | — |
| 5.2 Tags | CRUD SQL | Hierarchy | TagPanel | — |
| 5.3 Rating | — | Persist + reload | — | Rate → restart → check |
| 5.4 XMP | Read/write | Roundtrip | — | — |
| 6.1 Cache | LRU logic | Multi-level | — | — |
| 6.2 DuckDB | Queries | Sync SQLite→Duck | — | — |
| 6.3 Virtual Grid | — | — | Scroll perf | — |
| 6.4 SQLite Optim | PRAGMA | Index perf | — | — |
| 7.1 Errors | — | Recovery | Error boundaries | Crash → recover |
| 7.2 Backup | — | Backup + restore | — | Full cycle |
| 7.3 Packaging | — | Build artifacts | — | Install + launch |
| 7.4 UX | — | — | Keyboard + menus | — |
| 7.5 Onboarding | — | — | Welcome flow | First run |

---

## 6. Commandes de Test

```bash
# Frontend : tous les tests
npm run test

# Frontend : watch mode
npm run test:watch

# Frontend : couverture
npm run test:coverage

# Backend Rust : tous les tests
cargo test --manifest-path src-tauri/Cargo.toml

# Backend Rust : un module spécifique
cargo test --manifest-path src-tauri/Cargo.toml hashing

# E2E (quand configuré)
npm run test:e2e

# Tous les tests (CI)
npm run test:all
```

---

## 7. Fixtures & Données de Test

### Emplacement : `tests/fixtures/`
- Fichiers images de test (petits, <1MB chacun)
- Bases SQLite pré-remplies pour tests de migration
- Fichiers XMP de référence

### Factories / Builders :
```typescript
// src/test-utils/factories.ts
export function createMockImage(overrides?: Partial<ImageDTO>): ImageDTO {
  return {
    id: faker.number.int(),
    blake3Hash: faker.string.hexadecimal({ length: 64 }),
    filename: `RAW_${faker.number.int()}.RAF`,
    // ... valeurs par défaut sensées
    ...overrides,
  };
}
```

---

## 8. Règles d'Or

1. **Un test qui échoue bloque la sous-phase** — il doit être corrigé avant de continuer
2. **Les tests sont du code de première classe** — même rigueur que le code de production
3. **Pas de `skip`, `xit`, `xdescribe`** en code commité — un test désactivé est un test supprimé
4. **Les tests doivent être rapides** — <5s pour l'ensemble des tests unitaires, <30s pour l'intégration
5. **Chaque bug corrigé doit avoir un test de régression** — pour prouver qu'il ne reviendra pas
