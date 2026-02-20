import { useState, useEffect } from 'react';
import { Import, FolderOpen, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useDiscovery } from '@/hooks/useDiscovery';

interface ImportModalProps {
  onClose: () => void;
  onImportComplete?: () => void;
}

export const ImportModal = ({ onClose, onImportComplete }: ImportModalProps) => {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  
  const {
    progress,
    totalFiles,
    processedFiles,
    currentFile,
    stage,
    error,
    selectRootFolder,
    startScan,
    cancel,
  } = useDiscovery();

  // Handle completion
  useEffect(() => {
    if (stage === 'completed' && onImportComplete) {
      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 1500); // Give user time to see success state
    }
  }, [stage, onImportComplete, onClose]);

  const handleStartImport = async () => {
    if (!selectedPath) return;
    
    setIsStarted(true);
    await startScan(selectedPath);
  };

  const handleSelectFolder = async () => {
    const path = await selectRootFolder();
    if (path) {
      setSelectedPath(path);
    }
  };

  const getStageText = () => {
    switch (stage) {
      case 'idle':
        return isStarted ? 'Préparation...' : 'Prêt à importer';
      case 'scanning':
        return `Analyse: ${currentFile}`;
      case 'ingesting':
        return `Ingestion: ${currentFile}`;
      case 'completed':
        return 'Import terminé';
      case 'error':
        return `Erreur: ${error}`;
      default:
        return 'Préparation...';
    }
  };

  const getStageIcon = () => {
    switch (stage) {
      case 'completed':
        return <CheckCircle className="text-emerald-500" size={32} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={32} />;
      default:
        return <Import className="text-blue-500" size={32} />;
    }
  };

  const isActive = stage === 'scanning' || stage === 'ingesting';
  const isComplete = stage === 'completed';
  const hasError = stage === 'error';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center">
      <div className="bg-zinc-950 border border-zinc-800 w-[500px] p-8 rounded-xl shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mb-2">
            {getStageIcon()}
          </div>
          <h3 className="text-zinc-100 font-black text-xl tracking-tighter uppercase">
            {isComplete ? 'Import Réussi' : 'Ingestion Haute Performance'}
          </h3>
          <p className="text-zinc-500 text-xs">
            {isComplete 
              ? `${totalFiles} fichiers importés avec succès`
              : 'Traitement parallèle de 12 flux RAW simultanés'
            }
          </p>
        </div>

        {/* Folder Selection */}
        {!isStarted && !selectedPath && (
          <div className="space-y-4">
            <button
              onClick={handleSelectFolder}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-blue-100 font-medium transition-colors flex items-center justify-center gap-2"
            >
              <FolderOpen size={20} />
              Sélectionner un dossier
            </button>
          </div>
        )}

        {/* Selected Path */}
        {!isStarted && selectedPath && (
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-lg p-3">
              <p className="text-zinc-400 text-xs mb-1">Dossier sélectionné:</p>
              <p className="text-zinc-200 text-sm font-mono truncate">{selectedPath}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleStartImport}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-blue-100 font-medium transition-colors"
              >
                Commencer l'import
              </button>
              <button
                onClick={() => setSelectedPath(null)}
                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Progress */}
        {isStarted && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                <span>{getStageText()}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div 
                  className={`h-full transition-all duration-100 ${
                    hasError ? 'bg-red-600' : isComplete ? 'bg-emerald-600' : 'bg-blue-600'
                  } shadow-[0_0_10px_rgba(37,99,235,0.5)]`} 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 text-[10px] font-mono border-t border-zinc-900 pt-4 text-zinc-600 uppercase">
              <div>
                Fichiers: <span className="text-zinc-400">{processedFiles}/{totalFiles}</span>
              </div>
              <div className="text-right">
                Vitesse: <span className="text-emerald-500">
                  {isActive ? '~1.2 GB/s' : '--'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {isActive && (
            <button
              onClick={cancel}
              className="flex-1 py-2 bg-red-900/50 hover:bg-red-900/70 rounded text-xs text-red-400 transition-colors uppercase font-bold tracking-widest"
            >
              Annuler
            </button>
          )}
          
          {!isActive && (
            <button
              onClick={onClose}
              className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 rounded text-xs text-zinc-500 transition-colors uppercase font-bold tracking-widest"
            >
              {isComplete ? 'Fermer' : 'Annuler'}
            </button>
          )}
        </div>

        {/* Error Display */}
        {hasError && error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};
