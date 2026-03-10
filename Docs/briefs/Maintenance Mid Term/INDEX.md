# Index — Briefs Maintenance Mid-Term (M.1, M.2, M.3)

> **Créé** : Mars 10, 2026
> **Basé sur** : `Docs/ACTION_PLAN_POST_AUDIT.md`
> **Total briefs** : 12 (7 principaux + 5 reportés)
> **Dossier** : `/Docs/briefs/Maintenance Mid Term/`

---

## Vue d'Ensemble des Phases

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE M.1 — Performance Core & Concurrence                     │
│ Criticité: P0 | Durée: 1-2 semaines                            │
├─────────────────────────────────────────────────────────────────┤
│ ├─ M.1.1 : Correction Runtime Ingestion (3-4 jours)            │
│ │  └─ M.1.1a : Monitoring Threadpool (2 jours) [REPORTÉ]       │
│ ├─ M.1.2 : Migration Async IO (2-3 jours)                      │
│ │  └─ M.1.2a : Cleanup Sync Code (2-3 jours) [REPORTÉ]         │
│ └─ M.1.3 : Nettoyage Code Mort (1-2 jours)                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PHASE M.2 — Architecture & Sécurité                             │
│ Criticité: P1 | Durée: 1-2 semaines                            │
├─────────────────────────────────────────────────────────────────┤
│ ├─ M.2.1 : Refactoring Injection Dépendances DB (4-5 jours)    │
│ │  └─ M.2.1a : Connection Pooling (3-4 jours) [REPORTÉ]        │
│ └─ M.2.2 : Durcissement Sécurité (2-3 jours)                   │
│    └─ M.2.2a : CSP Review (1-2 jours) [REPORTÉ]                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PHASE M.3 — UX & Optimisations UI                              │
│ Criticité: P2 | Durée: 1-2 semaines                            │
├─────────────────────────────────────────────────────────────────┤
│ ├─ M.3.1 : Refactoring App.tsx (2-3 jours)                     │
│ └─ M.3.2 : Optimisation Grille & Données (3-4 jours)           │
│    └─ M.3.2a : LeftSidebar Refactor (1-2 jours) [REPORTÉ]      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Links — Briefs Principaux

### **Phase M.1 — Performance Core & Concurrence** (P0)

| Brief                                                         | Durée | Objectif                                              | Dépendances |
| ------------------------------------------------------------- | ----- | ----------------------------------------------------- | ----------- |
| [M.1.1](MAINTENANCE-MT-M.1.1-correction-runtime-ingestion.md) | 3-4j  | Éliminer création répétée `Runtime::new()` en boucles | Aucune      |
| [M.1.2](MAINTENANCE-MT-M.1.2-migration-async-io.md)           | 2-3j  | Remplacer `std::fs` → `tokio::fs`                     | M.1.1       |
| [M.1.3](MAINTENANCE-MT-M.1.3-nettoyage-code-mort.md)          | 1-2j  | Supprimer code mort et dépendances inutilisées        | Aucune      |

### **Phase M.2 — Architecture & Sécurité** (P1)

| Brief                                                     | Durée | Objectif                                           | Dépendances  |
| --------------------------------------------------------- | ----- | -------------------------------------------------- | ------------ |
| [M.2.1](MAINTENANCE-MT-M.2.1-refactoring-injection-db.md) | 4-5j  | Pattern Repository/Context pour DB injection       | M.1.1, M.1.2 |
| [M.2.2](MAINTENANCE-MT-M.2.2-durcissement-securite.md)    | 2-3j  | Whitelist fichiers, CSP, path traversal protection | M.1.3        |

### **Phase M.3 — UX & Optimisations UI** (P2)

| Brief                                                        | Durée | Objectif                                        | Dépendances  |
| ------------------------------------------------------------ | ----- | ----------------------------------------------- | ------------ |
| [M.3.1](MAINTENANCE-MT-M.3.1-refactoring-app-tsx.md)         | 2-3j  | Extract AppInitializer, useAppShortcuts hook    | M.1.x, M.2.x |
| [M.3.2](MAINTENANCE-MT-M.3.2-optimisation-grille-donnees.md) | 3-4j  | Lazy-load EXIF, virtualisation robuste GridView | M.3.1        |

---

## Quick Links — Briefs Reportés

| Brief                                                    | Durée | Parent | Objectif                              |
| -------------------------------------------------------- | ----- | ------ | ------------------------------------- |
| [M.1.1a](MAINTENANCE-MT-M.1.1a-monitoring-threadpool.md) | 2j    | M.1.1  | Monitoring saturation threadpool      |
| [M.1.2a](MAINTENANCE-MT-M.1.2a-cleanup-sync-code.md)     | 2-3j  | M.1.2  | Cleanup `std::fs` restants codebase   |
| [M.2.1a](MAINTENANCE-MT-M.2.1a-connection-pooling.md)    | 3-4j  | M.2.1  | Connection pooling avancée            |
| [M.2.2a](MAINTENANCE-MT-M.2.2a-csp-review.md)            | 1-2j  | M.2.2  | CSP hardening (remove unsafe-inline)  |
| [M.3.2a](MAINTENANCE-MT-M.3.2a-leftsidebar-refactor.md)  | 1-2j  | M.3.2  | Extract composants inline LeftSidebar |

---

## Ordre d'Exécution Recommandé

### **Criticité P0 (Blockers)**

1. **M.1.1** — Correction Runtime Ingestion
2. **M.1.2** — Migration Async IO
3. **M.1.3** — Nettoyage Code Mort

### **Criticité P1 (Foundation)**

4. **M.2.1** — Refactoring Injection Dépendances DB
5. **M.2.2** — Durcissement Sécurité

### **Criticité P2 (Polish)**

6. **M.3.1** — Refactoring App.tsx
7. **M.3.2** — Optimisation Grille & Données

### **Optionnel (Future Maintenance)**

- **M.1.1a** — après M.1.1 (monitoring)
- **M.1.2a** — après M.1.2 (cleanup)
- **M.2.1a** — après M.2.1 (pooling)
- **M.2.2a** — après M.2.2 (CSP)
- **M.3.2a** — après M.3.2 (sidebar)

---

## Checkpoints Globaux de Validation

À chaque fin de phase :

### Code Quality

- ✅ `cargo check` (Rust)
- ✅ `cargo clippy` (0 warnings)
- ✅ `tsc --noEmit` (TypeScript)
- ✅ `npm run lint` (ESLint)
- ✅ Pas de `any` TypeScript
- ✅ Pas de `unwrap()` production Rust

### Testing

- ✅ Tests Rust ≥80% coverage
- ✅ Tests TypeScript ≥70% coverage
- ✅ Non-régression phases précédentes
- ✅ Tests ciblés périmètre phase uniquement

### Documentation

- ✅ CHANGELOG.md mise à jour
- ✅ APP_DOCUMENTATION.md mise à jour
- ✅ Briefs reportés linkés explicitement

### Performance (si applicable)

- ✅ Benchmarks before/after
- ✅ Memory usage verified
- ✅ No regressions detected

---

## Règles Strictes — Important ⚠️

1. **Aucun commit sans approbation** — Tous les changements sont validés avant merge
2. **Corriger AVANT tester** — Tous les problèmes code réagissent avant suite tests
3. **Tests ciblés seulement** — Générer tests APRÈS completion phase, périmètre spécifique
4. **Briefs non-modifiables** — Sauf approbation propriétaire
5. **Root cause analysis** — Avant chaque correction, documenter racine problème

---

## Navigation

- **Lire briefs dans l'ordre** : Vue d'ensemble → objectif → périmètre → dépendances
- **Sections clés** : Checkpoints (validation intermédiaire), Pièges (risques), Critères de Complétion
- **Références croisées** : Chaque brief reference ses dépendances et phases reportées
- **Exécution** : Suivre ordre recommandé, respecter dépendances phases

---

## Statistiques

| Catégorie                          | Nombre  |
| ---------------------------------- | ------- |
| **Briefs totaux**                  | 12      |
| Briefs principaux                  | 7       |
| Briefs reportés                    | 5       |
| **Hours estimées**                 | ~40-50h |
| **Fichiers Rust à modifier**       | ~10     |
| **Fichiers TypeScript à modifier** | ~5      |
| **Tests à créer**                  | ~20-30  |

---

## Contacts & Escalations

- Blocker non-resolvable → Escalader dans CHANGELOG.md avec:
  - Description précise
  - Root cause technique
  - Options disponibles
  - Impact planning

---

**Dernière mise à jour** : March 10, 2026
**Status** : ✅ Briefs structurés, prêts pour implémentation
