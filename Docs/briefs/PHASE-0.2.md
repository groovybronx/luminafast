# Phase 0.2 — Scaffolding Tauri v2

## Objectif

Intégrer Tauri v2 dans le projet existant React+Vite+TypeScript. L'UI mockup doit s'afficher dans une fenêtre native macOS. Installer les plugins nécessaires pour le filesystem, les dialogues et le shell.

## Dépendances

- Phase 0.1 (Migration TypeScript) ✅

## Fichiers à créer

- `src-tauri/Cargo.toml` — Dépendances Rust (tauri, plugins)
- `src-tauri/tauri.conf.json` — Configuration Tauri (fenêtre, permissions, build)
- `src-tauri/src/main.rs` — Point d'entrée Rust
- `src-tauri/src/lib.rs` — Module library Tauri
- `src-tauri/capabilities/default.json` — Permissions par défaut
- `src-tauri/build.rs` — Script de build Tauri
- `src-tauri/icons/` — Icônes d'application (générées par Tauri)

## Fichiers à modifier

- `package.json` — Ajout des scripts `tauri` et dépendance `@tauri-apps/api`
- `vite.config.ts` — Éventuel ajustement pour Tauri dev server

## Plugins Tauri à installer

- `tauri-plugin-fs` — Accès au filesystem (import, previews)
- `tauri-plugin-dialog` — Dialogues natifs (sélection de fichiers/dossiers)
- `tauri-plugin-shell` — Exécution de commandes système

## Critères de validation

1. `cargo tauri dev` lance l'app dans une fenêtre native macOS
2. L'UI mockup s'affiche identiquement dans la fenêtre Tauri
3. `cargo tauri build` produit un bundle .app pour macOS
4. Les plugins fs, dialog et shell sont enregistrés côté Rust

## Contexte architectural

Tauri v2 utilise une architecture multi-webview avec un backend Rust. Le frontend communique avec le backend via `invoke()` (commandes Tauri) et des événements. Les plugins sont enregistrés dans `src/lib.rs` via le pattern Builder.
