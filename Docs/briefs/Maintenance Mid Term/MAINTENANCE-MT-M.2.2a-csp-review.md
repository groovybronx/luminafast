# Phase M.2.2a — CSP Review & Hardening

> **Statut** : ⬜ **En attente**
> **Durée estimée** : 1-2 jours
> **Priorité** : P2 (Moyenne)
> **Dépendance** : Phase M.2.2 complétée

## Objectif

Revue détaillée Content Security Policy (CSP), remove `unsafe-inline` où possible, implémenter strict CSP policies pour XSS prevention avant distribution commerciale.

## Périmètre

### ✅ Inclus dans cette phase

- Audit CSP policy actuelle, identifier `unsafe-*` directives
- Refactoring inline styles/scripts → external files with nonces
- Implementation strict CSP sans compromises de sécurité
- Tests CSP enforcement (browser DevTools validation)
- Documentation CSP rationale pour maintenance

### ❌ Exclus ou reporté intentionnellement

- Subresource integrity (SRI) on 3rd-party CDNs (optional future)
- HSTS headers setup (server-side, out of Tauri scope)

## Dépendances

### Phases

- Phase M.2.2 ✅ (Security hardening started)

## Fichiers

### À modify

- `src-tauri/tauri.conf.json` — Update CSP to strict mode
- Frontend components — Move inline styles to CSS modules if needed

## Checkpoints

- [ ] **Checkpoint 1** : CSP audit completed (all unsafe-\* identified)
- [ ] **Checkpoint 2** : Code refactored (no new unsafe-inline)
- [ ] **Checkpoint 3** : Browser DevTools CSP violations = 0
- [ ] **Checkpoint 4** : Tests pass

## Critères de Complétion

### Security

- [ ] CSP: No unsafe-inline (scripts/styles)
- [ ] CSP: Strict mode enabled
- [ ] Browser: Zero CSP violation warnings

### Integration

- [ ] Tests M.2.2 passent
- [ ] CHANGELOG mis à jour
