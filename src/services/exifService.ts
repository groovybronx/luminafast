import type { ExifData } from '@/types';
import { invoke } from '@tauri-apps/api/core';

export class ExifService {
  static async extractExif(filePath: string): Promise<ExifData> {
    // Appel à la commande Tauri pour extraire les métadonnées EXIF
    // Remplacer par invoke réel dès que la commande Rust est disponible
    return invoke('extract_exif', { filePath }) as Promise<ExifData>;
  }

  static async extractBatch(filePaths: string[]): Promise<ExifData[]> {
    return invoke('extract_exif_batch', { filePaths }) as Promise<ExifData[]>;
  }
}
