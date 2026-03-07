import type { XmpImportResult, XmpStatus } from '@/types/xmp';

/**
 * Service pour les opérations XMP sidecar — Phase 5.4
 * Wraps les commandes Tauri pour la communication frontend↔backend
 */
export class XmpService {
  private static getInvoke() {
    if (typeof window !== 'undefined') {
      const tauriWindow = window as unknown as {
        __TAURI__?: {
          invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
        };
        __TAURI_INTERNALS__?: {
          invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
        };
      };
      if (tauriWindow.__TAURI__?.invoke) return tauriWindow.__TAURI__.invoke;
      if (tauriWindow.__TAURI_INTERNALS__?.invoke) return tauriWindow.__TAURI_INTERNALS__.invoke;
    }
    throw new Error('Tauri API not available');
  }

  /**
   * Exporte les métadonnées d'une image (rating, flag, tags) vers un fichier .xmp sidecar.
   * Le chemin du fichier est résolu en interne par le backend.
   * @returns Chemin absolu du fichier .xmp écrit
   */
  static async exportImageXmp(imageId: number): Promise<string> {
    const invoke = this.getInvoke();
    const result = await invoke('export_image_xmp', { imageId });
    return result as string;
  }

  /**
   * Importe les métadonnées depuis le fichier .xmp sidecar vers la base de données.
   * Les tags inexistants sont créés automatiquement.
   */
  static async importImageXmp(imageId: number): Promise<XmpImportResult> {
    const invoke = this.getInvoke();
    const result = await invoke('import_image_xmp', { imageId });
    return result as XmpImportResult;
  }

  /**
   * Vérifie l'existence du sidecar .xmp pour une image donnée.
   * Le chemin du fichier est résolu en interne par le backend.
   */
  static async getXmpStatus(imageId: number): Promise<XmpStatus> {
    const invoke = this.getInvoke();
    const result = await invoke('get_xmp_status', { imageId });
    return result as XmpStatus;
  }
}
