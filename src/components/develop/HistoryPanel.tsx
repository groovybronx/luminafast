import { useEffect, useState } from 'react';
import { History, Clock, Save, RotateCcw, Trash2 } from 'lucide-react';
import { useEditStore } from '@/stores/editStore';
import * as historyService from '@/services/historyService';
import type { EditEventDTO, SnapshotDTO } from '@/types/edit';

/**
 * HistoryPanel — Timeline interactive pour le time-travel (Phase 4.3)
 *
 * Affiche:
 * - Baseline "Import" (point d'entrée)
 * - Chronologie des événements d'édition
 * - Snapshots nommés
 *
 * Interactions:
 * - Cliquer un événement → restaurer à ce point
 * - Cliquer un snapshot → restaurer à cet état
 * - Créer snapshot → modal
 * - Supprimer snapshot → confirmation
 * - Reset to Import → confirmation
 */
export const HistoryPanel = () => {
  const selectedImageId = useEditStore((s) => s.selectedImageId);

  // State for timeline
  const [events, setEvents] = useState<EditEventDTO[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for create snapshot modal
  const [showCreateSnapshot, setShowCreateSnapshot] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDesc, setSnapshotDesc] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  // Load timeline and snapshots when image changes
  useEffect(() => {
    if (!selectedImageId) {
      setEvents([]);
      setSnapshots([]);
      return;
    }

    const loadTimeline = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [loadedEvents, loadedSnapshots] = await Promise.all([
          historyService.getEventTimeline(selectedImageId, 50),
          historyService.getSnapshots(selectedImageId),
        ]);
        setEvents(loadedEvents);
        setSnapshots(loadedSnapshots);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        console.error('[HistoryPanel] Failed to load timeline:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadTimeline();
  }, [selectedImageId]);

  const handleRestoreToEvent = async (eventId: number) => {
    if (!selectedImageId) return;

    try {
      setIsLoading(true);
      const newState = await historyService.restoreToEvent(selectedImageId, eventId);
      // Update editStore with new state
      useEditStore.getState().replaceAllEdits(newState);
      // Reload timeline
      const [newEvents, newSnapshots] = await Promise.all([
        historyService.getEventTimeline(selectedImageId, 50, true),
        historyService.getSnapshots(selectedImageId),
      ]);
      setEvents(newEvents);
      setSnapshots(newSnapshots);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('[HistoryPanel] Failed to restore to event:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreToSnapshot = async (snapshotId: number) => {
    try {
      setIsLoading(true);
      const newState = await historyService.restoreToSnapshot(snapshotId);
      // Update editStore
      useEditStore.getState().replaceAllEdits(newState);
      // Reload timeline
      if (selectedImageId) {
        const [newEvents, newSnapshots] = await Promise.all([
          historyService.getEventTimeline(selectedImageId, 50, true),
          historyService.getSnapshots(selectedImageId),
        ]);
        setEvents(newEvents);
        setSnapshots(newSnapshots);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('[HistoryPanel] Failed to restore to snapshot:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSnapshot = async () => {
    if (!selectedImageId || !snapshotName.trim()) return;

    try {
      setIsCreatingSnapshot(true);
      const newSnapshot = await historyService.createSnapshot(
        selectedImageId,
        snapshotName.trim(),
        snapshotDesc.trim() || undefined,
      );
      // Add to local state
      setSnapshots((prev) => [newSnapshot, ...prev]);
      // Reset form
      setSnapshotName('');
      setSnapshotDesc('');
      setShowCreateSnapshot(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('[HistoryPanel] Failed to create snapshot:', err);
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleDeleteSnapshot = async (snapshotId: number) => {
    try {
      await historyService.deleteSnapshot(snapshotId);
      setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('[HistoryPanel] Failed to delete snapshot:', err);
    }
  };

  const handleResetToImport = async () => {
    if (!selectedImageId || !confirm('Reset all edits to import state?')) return;

    try {
      setIsLoading(true);
      // Restore to event 0 (or first event)
      const firstEvent = events[events.length - 1]; // Last = oldest
      if (firstEvent) {
        await handleRestoreToEvent(firstEvent.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedImageId) {
    return (
      <div className="pt-6 border-t border-zinc-800">
        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">
          <span className="flex items-center gap-2">
            <History size={14} /> Historique
          </span>
        </div>
        <div className="text-[9px] text-zinc-600 italic">Select an image to view history</div>
      </div>
    );
  }

  return (
    <div className="pt-6 border-t border-zinc-800">
      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex justify-between items-center">
        <span className="flex items-center gap-2">
          <History size={14} /> Historique ({events.length})
        </span>
        <button
          onClick={() => setShowCreateSnapshot(true)}
          className="text-[9px] text-blue-500 font-bold border border-blue-900 px-2 py-0.5 rounded-full hover:bg-blue-900 transition-colors disabled:opacity-50"
          disabled={isLoading || isCreatingSnapshot}
        >
          <Save size={10} className="inline mr-1" /> Snapshot
        </button>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-900/30 border border-red-700 rounded text-[8px] text-red-400">
          {error}
        </div>
      )}

      {isLoading && <div className="text-[9px] text-zinc-600 italic p-3">Loading timeline...</div>}

      {!isLoading && (
        <>
          {/* Timeline */}
          <div className="h-48 overflow-y-auto bg-black/50 p-3 text-[9px] rounded-xl border border-zinc-800/50 custom-scrollbar shadow-inner">
            {/* Import baseline */}
            <div className="mb-3 p-2 bg-zinc-900 border-l-2 border-zinc-600 hover:border-green-500 cursor-pointer transition-colors">
              <div className="text-zinc-300 font-bold">Import</div>
              <div className="text-[8px] text-zinc-500">Original state</div>
            </div>

            {/* Events */}
            {events.length === 0 && (
              <div className="opacity-30 italic text-center py-8">No edits recorded yet.</div>
            )}
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => handleRestoreToEvent(event.id)}
                className="mb-2 p-2 border-l-2 border-zinc-700 hover:border-blue-500 cursor-pointer transition-colors group bg-zinc-900/30 rounded"
              >
                <div className="text-zinc-300 group-hover:text-blue-300 font-mono text-[8px]">
                  <Clock size={10} className="inline mr-1" />
                  {event.event_type}
                </div>
                <div className="opacity-60 text-[7px] ml-4">
                  {new Date(event.created_at).toLocaleTimeString()}
                </div>
                {event.is_undone && <div className="text-[7px] text-orange-400 ml-4">[undone]</div>}
              </div>
            ))}

            {/* Snapshots */}
            {snapshots.length > 0 && (
              <div className="mt-4 pt-3 border-t border-zinc-700">
                <div className="text-[9px] font-bold text-zinc-400 mb-2">Snapshots</div>
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="mb-2 p-2 bg-blue-900/20 border-l-2 border-blue-600 hover:border-blue-400 cursor-pointer transition-colors group rounded"
                  >
                    <div className="flex justify-between items-start">
                      <div onClick={() => handleRestoreToSnapshot(snap.id)}>
                        <div className="text-blue-300 font-bold text-[8px]">{snap.name}</div>
                        {snap.description && (
                          <div className="text-[7px] text-zinc-400 opacity-70">
                            {snap.description}
                          </div>
                        )}
                        <div className="text-[7px] text-zinc-500 mt-1">
                          {snap.event_count} events •{' '}
                          {new Date(snap.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        title="Delete snapshot"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete snapshot "${snap.name}"?`)) {
                            handleDeleteSnapshot(snap.id);
                          }
                        }}
                        className="text-red-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reset to Import button */}
          <button
            onClick={handleResetToImport}
            className="mt-3 w-full text-[9px] py-2 px-3 bg-red-900/30 hover:bg-red-900/50 border border-red-700 rounded text-red-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            <RotateCcw size={12} /> Reset to Import
          </button>
        </>
      )}

      {/* Create Snapshot Modal */}
      {showCreateSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-sm font-bold text-white mb-4">Create Snapshot</h2>

            <input
              type="text"
              placeholder="Snapshot name (e.g., 'Warm Color Grading')"
              className="w-full mb-3 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-[9px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              disabled={isCreatingSnapshot}
            />

            <textarea
              placeholder="Description (optional)"
              className="w-full mb-4 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-[9px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 h-20 resize-none"
              value={snapshotDesc}
              onChange={(e) => setSnapshotDesc(e.target.value)}
              disabled={isCreatingSnapshot}
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateSnapshot(false);
                  setSnapshotName('');
                  setSnapshotDesc('');
                }}
                className="flex-1 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-[9px] font-bold transition-colors disabled:opacity-50"
                disabled={isCreatingSnapshot}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSnapshot}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-[9px] font-bold text-white transition-colors disabled:opacity-50"
                disabled={!snapshotName.trim() || isCreatingSnapshot}
              >
                {isCreatingSnapshot ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
