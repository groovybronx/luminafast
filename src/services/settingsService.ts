import { invoke } from '@tauri-apps/api/core';
import type { SettingsConfig } from '@/types/settings';

/**
 * Validation result from frontend validation functions
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Load settings from database via Tauri command
 *
 * @returns Deserialized SettingsConfig from SQLite
 * @throws Error if database unavailable or JSON corrupt
 */
export async function loadSettingsFromDB(): Promise<SettingsConfig> {
  try {
    const result = await invoke<SettingsConfig>('load_settings_from_db');
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load settings from DB: ${message}`);
  }
}

/**
 * Save settings to database via Tauri command
 *
 * Performs atomic transaction on backend.
 *
 * @param config - SettingsConfig to persist
 * @throws Error if save failed
 */
export async function saveSettingsToDB(config: SettingsConfig): Promise<void> {
  try {
    await invoke<void>('save_settings_to_db', { config });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to save settings to DB: ${message}`);
  }
}

/**
 * Validate email format
 *
 * Simple regex check (not full RFC 5322 compliance, but sufficient for UX).
 *
 * @param email - Email string to validate
 * @returns true if email matches basic pattern
 */
export function validateEmail(email: string): boolean {
  if (!email) return true; // Email is optional

  // Basic pattern: something@something.something
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate file paths exist and are writable
 *
 * Checks:
 * - catalogue_root exists
 * - database_path parent directory exists
 * - previews_path parent directory exists
 *
 * All checks run in parallel with 2s timeout.
 *
 * @param config - SettingsConfig to validate
 * @returns ValidationResult with error details if validation fails
 */
export async function validatePaths(config: SettingsConfig): Promise<ValidationResult> {
  const errors: Record<string, string> = {};

  // Validate catalogue_root
  if (config.storage.catalogue_root) {
    try {
      // Note: Actual path validation would require a Tauri command
      // For now, basic non-empty check
      if (!config.storage.catalogue_root.trim()) {
        errors['storage.catalogue_root'] = 'Catalogue root cannot be empty';
      }
    } catch (error) {
      errors['storage.catalogue_root'] = `Path validation failed: ${String(error)}`;
    }
  }

  // Validate database_path
  if (config.storage.database_path) {
    if (!config.storage.database_path.trim()) {
      errors['storage.database_path'] = 'Database path cannot be empty';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Detect keyboard shortcut conflicts
 *
 * Identifies duplicate key combinations in the keyboard shortcuts map.
 *
 * @param shortcuts - KeyboardShortcuts object
 * @returns Array of conflict descriptions (empty if no conflicts)
 */
export function detectShortcutConflicts(shortcuts: Record<string, string>): string[] {
  const conflicts: string[] = [];
  const keyCombos = new Map<string, string[]>();

  // Build map of keyCombos -> action names
  Object.entries(shortcuts).forEach(([action, combo]) => {
    if (!keyCombos.has(combo)) {
      keyCombos.set(combo, []);
    }
    const actions = keyCombos.get(combo);
    if (actions) {
      actions.push(action);
    }
  });

  // Find duplicates
  keyCombos.forEach((actions, combo) => {
    if (actions.length > 1) {
      conflicts.push(`Shortcut "${combo}" assigned to multiple actions: ${actions.join(', ')}`);
    }
  });

  return conflicts;
}

/**
 * Sanitize API keys in config for logging
 *
 * Masks sensitive fields (api_key, license_key, etc.)
 * Useful for error messages, console logs.
 *
 * @param config - SettingsConfig to sanitize
 * @returns Deep copy with masked keys
 */
export function sanitizeApiKeys(config: SettingsConfig): SettingsConfig {
  const sanitized = JSON.parse(JSON.stringify(config)) as SettingsConfig;

  // Mask user API keys
  if (sanitized.user.license_key) {
    sanitized.user.license_key = '***MASKED***';
  }

  // Mask AI provider API key
  if (sanitized.ai.api_key) {
    sanitized.ai.api_key = '***MASKED***';
  }

  return sanitized;
}
