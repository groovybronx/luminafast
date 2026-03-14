import { invoke } from '@tauri-apps/api/core';
import type { SettingsConfig } from '@/types/settings';

/**
 * Validation result from frontend validation functions
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

const PATH_VALIDATION_TIMEOUT_MS = 2000;

function normalizePathValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function validatePathWithTimeout(path: string): Promise<void> {
  const validationPromise = invoke<void>('validate_settings_path', { path });
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Path validation timeout')), PATH_VALIDATION_TIMEOUT_MS);
  });

  await Promise.race([validationPromise, timeoutPromise]);
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
 * Validate license key format
 *
 * Accepted format: uppercase letters, digits, and dashes, between 10 and 64 chars.
 * This is a local format check only, not server-side activation validation.
 */
export function validateLicenseKey(key: string): boolean {
  if (!key) return true;

  const licenseRegex = /^[A-Z0-9-]{10,64}$/;
  return licenseRegex.test(key);
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

  const pathChecks: Array<Promise<void>> = [];
  const storage = (config as Partial<SettingsConfig>).storage as
    | Partial<SettingsConfig['storage']>
    | undefined;

  const catalogueRoot = normalizePathValue(storage?.catalogue_root);
  const databasePath = normalizePathValue(storage?.database_path);
  const previewsPath = normalizePathValue(storage?.previews_path);
  const smartPreviewsPath = normalizePathValue(storage?.smart_previews_path);

  // Validate catalogue_root
  if (catalogueRoot) {
    if (!catalogueRoot.trim()) {
      errors['storage.catalogue_root'] = 'Catalogue root cannot be empty';
    } else {
      pathChecks.push(
        validatePathWithTimeout(catalogueRoot).catch((error: unknown) => {
          errors['storage.catalogue_root'] =
            error instanceof Error ? error.message : 'Path validation failed';
        }),
      );
    }
  }

  // Validate database_path
  if (databasePath) {
    if (!databasePath.trim()) {
      errors['storage.database_path'] = 'Database path cannot be empty';
    } else {
      // Validate parent folder for database location.
      const normalized = databasePath.replace(/\\/g, '/');
      const lastSlash = normalized.lastIndexOf('/');
      const parentPath = lastSlash > 0 ? normalized.slice(0, lastSlash) : normalized;

      if (parentPath) {
        pathChecks.push(
          validatePathWithTimeout(parentPath).catch((error: unknown) => {
            errors['storage.database_path'] =
              error instanceof Error ? error.message : 'Database path validation failed';
          }),
        );
      }
    }
  }

  if (previewsPath.trim()) {
    pathChecks.push(
      validatePathWithTimeout(previewsPath).catch((error: unknown) => {
        errors['storage.previews_path'] =
          error instanceof Error ? error.message : 'Previews path validation failed';
      }),
    );
  }

  if (smartPreviewsPath.trim()) {
    pathChecks.push(
      validatePathWithTimeout(smartPreviewsPath).catch((error: unknown) => {
        errors['storage.smart_previews_path'] =
          error instanceof Error ? error.message : 'Smart previews path validation failed';
      }),
    );
  }

  await Promise.all(pathChecks);

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

  if (!shortcuts || typeof shortcuts !== 'object' || Array.isArray(shortcuts)) {
    return conflicts;
  }

  // Build map of keyCombos -> action names
  Object.entries(shortcuts).forEach(([action, combo]) => {
    if (typeof combo !== 'string') {
      return;
    }

    const normalizedCombo = combo.trim();
    if (!normalizedCombo) {
      return;
    }

    if (!keyCombos.has(normalizedCombo)) {
      keyCombos.set(normalizedCombo, []);
    }
    const actions = keyCombos.get(normalizedCombo);
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
