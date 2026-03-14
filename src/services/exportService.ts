import { save } from '@tauri-apps/plugin-dialog';

export type ExportFormat = 'jpeg' | 'tiff';

export interface ExportResultDTO {
  imageId: number;
  outputPath: string;
  format: string;
  width: number;
  height: number;
  appliedEditEvents: number;
  usedSnapshot: boolean;
}

export interface ExportEditedImageRequest {
  imageId: number;
  outputPath: string;
  format: ExportFormat;
  rawOnly?: boolean;
}

const EXPORT_EXTENSION_BY_FORMAT: Record<ExportFormat, string> = {
  jpeg: 'jpg',
  tiff: 'tiff',
};

const EXPORT_FILTERS: Record<ExportFormat, { name: string; extensions: string[] }> = {
  jpeg: {
    name: 'JPEG image',
    extensions: ['jpg', 'jpeg'],
  },
  tiff: {
    name: 'TIFF image',
    extensions: ['tif', 'tiff'],
  },
};

function getFilenameWithoutExtension(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) {
    return 'image';
  }

  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot <= 0) {
    return trimmed;
  }

  return trimmed.slice(0, lastDot);
}

export function buildDefaultExportFilename(sourceFilename: string, format: ExportFormat): string {
  const baseName = getFilenameWithoutExtension(sourceFilename);
  const extension = EXPORT_EXTENSION_BY_FORMAT[format];
  return `${baseName}_edited.${extension}`;
}

export class ExportService {
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

      if (tauriWindow.__TAURI__?.invoke) {
        return tauriWindow.__TAURI__.invoke;
      }

      if (tauriWindow.__TAURI_INTERNALS__?.invoke) {
        return tauriWindow.__TAURI_INTERNALS__.invoke;
      }
    }

    throw new Error('Tauri API not available');
  }

  static async promptOutputPath(
    sourceFilename: string,
    format: ExportFormat = 'jpeg',
  ): Promise<string | null> {
    const defaultPath = buildDefaultExportFilename(sourceFilename, format);

    return save({
      title: 'Export Edited Image',
      defaultPath,
      filters: [EXPORT_FILTERS[format]],
    });
  }

  static async exportEditedImage(request: ExportEditedImageRequest): Promise<ExportResultDTO> {
    const invoke = this.getInvoke();

    const command = request.rawOnly ? 'export_raw_edited' : 'export_image_edited';
    const result = await invoke(command, {
      imageId: String(request.imageId),
      outputPath: request.outputPath,
      format: request.format,
    });

    return result as ExportResultDTO;
  }

  static async exportWithDialog(params: {
    imageId: number;
    sourceFilename: string;
    format?: ExportFormat;
    rawOnly?: boolean;
  }): Promise<ExportResultDTO | null> {
    const format = params.format ?? 'jpeg';
    const outputPath = await this.promptOutputPath(params.sourceFilename, format);

    if (!outputPath) {
      return null;
    }

    return this.exportEditedImage({
      imageId: params.imageId,
      outputPath,
      format,
      rawOnly: params.rawOnly,
    });
  }
}
