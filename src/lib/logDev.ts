// src/lib/logDev.ts

/**
 * Log conditionnel pour le développement UI.
 * Usage : logDev('message', data)
 */
export function logDev(message: string, data?: unknown) {
  if (import.meta.env.DEV) {
    if (data !== undefined) {
      console.warn(`[UI] ${message}`, data);
    } else {
      console.warn(`[UI] ${message}`);
    }
  }
}
