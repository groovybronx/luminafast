## Plan: Lancement Phase 6 (6.0 puis 6.1)

Objectif: terminer complètement la Phase 6.0 (UI Settings professionnelle + validations manquantes) en conservant le contrat Settings déjà persistant, puis enchaîner la Phase 6.1 (cache multiniveau) par sous-slices vérifiables avec faible risque de régression.

**Steps**
1. Cadrage et baseline (dépendance: aucune)
- Verrouiller le contrat Settings actuel (pas de migration de schéma 6.0) pour rester compatible avec la persistance 6.0.1 déjà en production.
- Transformer les critères de [Docs/briefsPHASE-6.0.md](/Docs/briefs/PHASE-6.0.md) et [Docs/briefs/PHASE-6.1.md](Docs/briefs/PHASE-6.1.md) en checklist exécutable par slice.
- Identifier officiellement l’écart doc/code: 7 catégories Settings encore en stub alors que la persistance est déjà active.

2. Phase 6.0 — Foundation UI réutilisable (peut commencer immédiatement)
- Créer les composants atomiques manquants dans src/components/ui/ pour text input, masked input, file input, badge de validation.
- Ajouter des tests unitaires dédiés à ces composants dans les dossiers de tests existants.
- Dépendance: step 1.

3. Phase 6.0 — Implémentation des catégories simples (parallélisable partiellement)
- Implémenter d’abord les catégories à faible dépendance backend (Appearance, User Profile, About, AI) avec liaison bidirectionnelle au store.
- Ajouter validation frontend locale (email, ranges, champs requis) sans modifier le schéma de persistance.
- Dépendance: step 2.
- Parallèle possible: plusieurs catégories en parallèle si conventions communes validées.

4. Phase 6.0 — Catégories dépendantes et interaction système
- Storage: implémenter champs chemin + feedback validation; brancher validation asynchrone côté backend via commande Tauri dédiée basée sur les utilitaires de sécurité existants.
- Keyboard: implémenter liste + édition + détection de conflits + import/export JSON.
- Cache (version 6.0): finaliser l’UI de configuration (sliders/dropdowns/boutons), branchée sur settingsStore; le statut live et la logique quota avancée restent à 6.1.
- Dépendance: steps 2 et 3.

5. Phase 6.0 — Intégration transversale app
- Ajouter le raccourci ouverture settings dans le système global de shortcuts: Cmd+, (macOS) et Ctrl+, (Windows/Linux).
- Vérifier focus trap, ESC, navigation clavier et feedback save déjà présents dans le modal.
- Dépendance: steps 3 et 4.

6. Phase 6.0 — Tests et validation finale
- Ajouter tests composants (SettingsModal + catégories), tests store/settings service complémentaires et cas d’erreur (validation path, conflits shortcuts).
- Exécuter tests frontend et backend ciblés + vérification de non-régression des tests existants.
- Dépendance: steps 3, 4, 5.

7. Phase 6.0 — Documentation et statut
- Mettre à jour [Docs/CHANGELOG.md](Docs/CHANGELOG.md), [Docs/APP_DOCUMENTATION.md](Docs/APP_DOCUMENTATION.md) et statut du brief 6.0.
- Préparer un bref bilan de clôture 6.0 et la transition explicite vers 6.1.
- Dépendance: step 6.

8. Phase 6.1 — Contrat backend cache (début après clôture 6.0)
- Définir/implémenter le modèle cache côté Rust (config + status), service manager, commandes Tauri et persistance dédiée (migration suivante après 008).
- Réutiliser les métadonnées previews déjà prêtes pour LRU (access_count/last_accessed).
- Dépendance: step 7.

9. Phase 6.1 — Intégration frontend cache
- Créer service IPC cache + store cache dédiés, brancher polling statut live et actions de maintenance.
- Faire évoluer la catégorie cache vers le mode opérationnel 6.1 (usage live, force clean, clear previews avec confirmation).
- Dépendance: step 8.
- Parallèle possible: UI cache et tests frontend en parallèle une fois contrat IPC figé.

10. Phase 6.1 — Invalidation, tests, documentation
- Raccorder invalidation cache sur événements d’édition côté backend.
- Ajouter tests Rust (quota, éviction, cohérence), tests TS (service/store/cache UI), puis mise à jour docs/changelog.
- Dépendance: steps 8 et 9.

**Relevant files**
- [Docs/briefs/PHASE-6.0.md](Docs/briefs/PHASE-6.0.md) — scope cible et critères 6.0
- [Docs/briefs/PHASE-6.0.1.md](Docs/briefs/PHASE-6.0.1.md) — persistance déjà livrée à préserver
- [Docs/briefs/PHASE-6.1.md](Docs/briefs/PHASE-6.1.md) — scope cache multiniveau
- [Docs/CHANGELOG.md](Docs/CHANGELOG.md) — état officiel des phases/sous-phases
- [Docs/APP_DOCUMENTATION.md](Docs/APP_DOCUMENTATION.md) — synchronisation documentation
- [src/components/settings/SettingsModal.tsx](src/components/settings/SettingsModal.tsx) — navigation tabs + save workflow
- [src/components/settings/SettingsCategoryStorage.tsx](src/components/settings/SettingsCategoryStorage.tsx) — stub à compléter
- [src/components/settings/SettingsCategoryCache.tsx](src/components/settings/SettingsCategoryCache.tsx) — stub à compléter puis enrichir en 6.1
- [src/components/settings/SettingsCategoryKeyboardShortcuts.tsx](src/components/settings/SettingsCategoryKeyboardShortcuts.tsx) — stub à compléter
- [src/components/settings/SettingsCategoryUserProfile.tsx](src/components/settings/SettingsCategoryUserProfile.tsx) — stub à compléter
- [src/components/settings/SettingsCategoryAI.tsx](src/components/settings/SettingsCategoryAI.tsx) — stub à compléter
- [src/components/settings/SettingsCategoryAppearance.tsx](src/components/settings/SettingsCategoryAppearance.tsx) — stub à compléter
- [src/components/settings/SettingsCategoryAbout.tsx](src/components/settings/SettingsCategoryAbout.tsx) — stub à compléter
- [src/components/settings/SettingsCategoryPreview.tsx](src/components/settings/SettingsCategoryPreview.tsx) — catégorie déjà avancée
- [src/components/layout/TopNav.tsx](src/components/layout/TopNav.tsx) — bouton paramètres déjà câblé
- [src/App.tsx](src/App.tsx) — chargement settings au démarrage + shortcuts globaux
- [src/hooks/useAppShortcuts.ts](src/hooks/useAppShortcuts.ts) — ajout Cmd+, / Ctrl+,
- [src/stores/settingsStore.ts](src/stores/settingsStore.ts) — source de vérité 6.0 côté frontend
- [src/stores/__tests__/settingsStore.integration.test.ts](src/stores/__tests__/settingsStore.integration.test.ts) — tests d’intégration existants
- [src/services/settingsService.ts](src/services/settingsService.ts) — validation et IO Tauri
- [src/services/__tests__/settingsService.test.ts](src/services/__tests__/settingsService.test.ts) — tests validation existants
- [src/types/settings.ts](src/types/settings.ts) — contrat settings actuel à conserver
- [src-tauri/migrations/008_app_settings_table.sql](src-tauri/migrations/008_app_settings_table.sql) — persistance actuelle settings
- [src-tauri/src/services/settings.rs](src-tauri/src/services/settings.rs) — CRUD settings backend
- [src-tauri/src/commands/settings.rs](src-tauri/src/commands/settings.rs) — commandes IPC settings
- [src-tauri/src/services/security.rs](src-tauri/src/services/security.rs) — base pour validation path côté settings
- [src-tauri/src/database.rs](src-tauri/src/database.rs) — séquence migrations (prochaine migration cache)
- [src-tauri/src/lib.rs](src-tauri/src/lib.rs) — enregistrement commandes Tauri

**Verification**
1. Vérification 6.0 par slice
- Build/lint TS strict sans any implicite.
- Tests unitaires des composants atomiques + catégories livrées.
- Tests store/service settings existants maintenus au vert.
- Validation manuelle: ouverture modal, switch tabs, save, rechargement app, persistance effective.

2. Vérification 6.1 backend
- Tests Rust: quotas, éviction LRU, invalidation sur edit, concurrence.
- Validation DB migration: table cache settings créée et relue.
- Commandes Tauri cache enregistrées et appelables sans panic.

3. Vérification 6.1 frontend
- Tests service/store cache (erreurs IPC, polling, actions).
- Validation manuelle: sliders cache, statut live, force clean, clear all avec confirmation.

4. Vérification documentation
- Cohérence finale changelog/brief/app documentation avec état réel 6.0 puis 6.1.

**Decisions**
- Cible validée: terminer 6.0 puis enchaîner 6.1.
- Stratégie validée: livraison par sous-slices vérifiables.
- Contrat validé: conserver le schéma Settings actuel (compatibilité 6.0.1), sans migration de contrat en 6.0.
- Scope exclu inchangé: pas d’intégration IA réelle, pas de validation licence distante, pas de cloud sync dans 6.0/6.1.

**Further Considerations**
1. Réduire la duplication entre cache 6.0 et cache 6.1: implémenter la catégorie cache 6.0 avec une couche d’adaptation minimale pour faciliter le branchement futur au cacheStore 6.1.
2. Prioriser les tests d’accessibilité clavier du modal dès les premiers slices pour limiter les régressions UX tardives.
3. Inclure une passe de revue rapide des statuts de briefs 6.0/6.0.1 afin d’éliminer l’écart doc vs implémentation avant clôture officielle.