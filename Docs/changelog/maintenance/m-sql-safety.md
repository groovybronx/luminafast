### 2026-03-10 — Phase M.2.2 : Durcissement Sécurité (✅ COMPLÉTÉE)

**Statut** : ✅ **Complétée**
**Agent** : Copilot
**Branche** : `phase/m.2.2-durcissement-securite`
**Type** : Maintenance

#### Résumé

**Cause racine** : les points d'entrée discovery acceptaient des chemins sans validation centralisée contre path traversal + whitelist runtime, et la configuration Tauri exposait un scope `assetProtocol` trop large (`$HOME/**`, `/tmp/**`) avec une CSP permissive (`unsafe-eval`).

**Solution** : création du service `security.rs` (normalisation canonique, détection traversal, validation whitelist dynamique via env), intégration de la validation dans les commandes et service discovery, hardening `tauri.conf.json` (scope restreint + CSP renforcée), et garde-fou sur chemins suspects en backfill catalogue.

#### Fichiers créés

- `src-tauri/src/services/security.rs`

#### Fichiers modifiés

- `src-tauri/src/services/mod.rs` — export du module `security`
- `src-tauri/src/lib.rs` — initialisation du contexte whitelist sécurité au démarrage
- `src-tauri/src/commands/discovery.rs` — validation whitelist/traversal avant config/validation/start discovery
- `src-tauri/src/services/discovery.rs` — validation sécurité au niveau service (défense en profondeur)
- `src-tauri/src/commands/catalog.rs` — rejet des chemins suspects (`..`) pendant backfill folder_id
- `src-tauri/tauri.conf.json` — restriction `assetProtocol.scope` + CSP durcie (suppression `unsafe-eval`)

#### Critères de validation remplis

- [x] Checkpoint 1 : audit sécurité `tauri.conf.json` + scope restreint
- [x] Checkpoint 2 : `cargo check` backend OK
- [x] Checkpoint 3 : tests path validation/traversal passants
- [x] Checkpoint 4 : whitelist active sur flux discovery réels
- [x] Checkpoint 5 : CSP revue et renforcée

#### Impact

- Les chemins discovery sont désormais validés par whitelist dynamique (`LUMINAFAST_ALLOWED_DIRS`) et bloqués en cas de traversal.
- Le backend applique la validation à deux niveaux (commande + service) pour limiter les contournements.
- Le scope d'accès fichiers côté Tauri est réduit aux dossiers utilisateur ciblés, avec CSP moins permissive.
