import { useState, useEffect, useCallback } from 'react';
import { FileCode, Download, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { XmpService } from '@/services/xmpService';
import type { XmpStatus, XmpImportResult } from '@/types/xmp';

interface XmpPanelProps {
  imageId: number;
  /** Callback appelé après un import réussi (pour rafraîchir les données de l'image) */
  onImportSuccess?: (result: XmpImportResult) => void;
}

type FeedbackState = { type: 'success' | 'error'; message: string } | null;

/**
 * XmpPanel — Export/Import du sidecar .xmp pour une image (Phase 5.4)
 *
 * Affiche l'état du fichier .xmp sidecar et propose les actions :
 * - Exporter : écrit les métadonnées actuelles (rating, flag, tags) dans un .xmp Adobe-compatible
 * - Importer : lit un .xmp existant et applique ses données en DB
 */
export const XmpPanel = ({ imageId, onImportSuccess }: XmpPanelProps) => {
  const [status, setStatus] = useState<XmpStatus | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const loadStatus = useCallback(async () => {
    try {
      const s = await XmpService.getXmpStatus(imageId);
      setStatus(s);
    } catch {
      // API Tauri indisponible en dev web — silencieux
    }
  }, [imageId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Efface le feedback après 4s
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setFeedback(null);
    try {
      const xmpPath = await XmpService.exportImageXmp(imageId);
      setFeedback({ type: 'success', message: `Exporté → ${xmpPath.split('/').pop()}` });
      await loadStatus();
    } catch (err) {
      setFeedback({ type: 'error', message: String(err) });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!status?.exists || isImporting) return;
    setIsImporting(true);
    setFeedback(null);
    try {
      const result = await XmpService.importImageXmp(imageId);
      setFeedback({
        type: 'success',
        message: `Importé — ${result.tagsImported} tag(s)${result.rating != null ? `, note ${result.rating}` : ''}`,
      });
      onImportSuccess?.(result);
    } catch (err) {
      setFeedback({ type: 'error', message: String(err) });
    } finally {
      setIsImporting(false);
    }
  };

  const xmpFilename = status?.xmpPath ? (status.xmpPath.split('/').pop() ?? '') : '';

  return (
    <div className="space-y-3">
      {/* En-tête */}
      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2 flex justify-between items-center">
        <span className="flex items-center gap-1.5">
          <FileCode size={10} />
          Sidecar XMP
        </span>
        {status && (
          <span
            className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
              status.exists
                ? 'bg-green-900/40 text-green-400 border border-green-800/40'
                : 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/40'
            }`}
          >
            {status.exists ? '● Présent' : '○ Absent'}
          </span>
        )}
      </div>

      {/* Nom du fichier sidecar */}
      {xmpFilename && (
        <div className="text-[9px] text-zinc-500 font-mono truncate px-0.5" title={status?.xmpPath}>
          {xmpFilename}
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex gap-2">
        {/* Export */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-[9px] font-bold uppercase tracking-wide
                     bg-blue-900/30 text-blue-300 border border-blue-800/40
                     hover:bg-blue-800/50 hover:text-blue-200 hover:border-blue-700/60
                     disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="Écrire les métadonnées actuelles dans le fichier .xmp"
        >
          {isExporting ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
          {isExporting ? 'Export…' : 'Exporter'}
        </button>

        {/* Import */}
        <button
          onClick={handleImport}
          disabled={isImporting || !status?.exists}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-[9px] font-bold uppercase tracking-wide
                     bg-purple-900/30 text-purple-300 border border-purple-800/40
                     hover:bg-purple-800/50 hover:text-purple-200 hover:border-purple-700/60
                     disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title={
            status?.exists
              ? 'Lire le .xmp existant et appliquer ses données en DB'
              : "Aucun fichier .xmp trouvé — exportez d'abord"
          }
        >
          {isImporting ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
          {isImporting ? 'Import…' : 'Importer'}
        </button>
      </div>

      {/* Feedback (succès / erreur) */}
      {feedback && (
        <div
          className={`flex items-start gap-1.5 p-2 rounded text-[9px] ${
            feedback.type === 'success'
              ? 'bg-green-900/20 text-green-400 border border-green-800/30'
              : 'bg-red-900/20 text-red-400 border border-red-800/30'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle size={10} className="shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={10} className="shrink-0 mt-0.5" />
          )}
          <span className="break-all">{feedback.message}</span>
        </div>
      )}

      {/* Note informative */}
      <p className="text-[8px] text-zinc-600 leading-4">
        Le fichier .xmp est compatible Adobe Lightroom, DarkTable et tout logiciel respectant le
        standard&nbsp;XMP.
      </p>
    </div>
  );
};
