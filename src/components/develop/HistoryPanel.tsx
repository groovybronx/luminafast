import { useEffect, useCallback, useMemo, useState } from 'react';
import { History, RotateCcw, Save } from 'lucide-react';
import { useEditStore } from '@/stores/editStore';
import * as snapshotService from '@/services/snapshotService';
import { SnapshotModal } from './SnapshotModal';
import type { SnapshotDTO } from '@/services/snapshotService';

interface HistoryPanelProps {
  selectedImageId?: number;
}

export const HistoryPanel = ({ selectedImageId }: HistoryPanelProps) => {
  const editStore = useEditStore();
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [isDeletingSnapshot, setIsDeletingSnapshot] = useState<number | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotDTO[]>([]);

  // Load snapshots when image changes
  useEffect(() => {
    if (!selectedImageId) {
      setSnapshots([]);
      return;
    }

    const loadSnapshots = async () => {
      try {
        const loaded = await snapshotService.getSnapshots(selectedImageId);
        setSnapshots(loaded);
        editStore.setSnapshots(selectedImageId, loaded);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Failed to load snapshots:', error);
        }
      }
    };

    loadSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImageId]);

  // Get current events for the image
  const currentEvents = useMemo(
    () => (selectedImageId ? editStore.getAppliedEdits(selectedImageId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedImageId],
  );

  /**
   * Handle restoration to a specific event
   */
  const handleRestoreToEvent = useCallback(
    (eventIndex: number) => {
      if (!selectedImageId) return;
      editStore.restoreToEvent(selectedImageId, eventIndex);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedImageId],
  );

  /**
   * Handle reset to initial state (no edits)
   */
  const handleReset = useCallback(() => {
    if (!selectedImageId) return;
    editStore.setEditEventsForImage(selectedImageId, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImageId]);

  /**
   * Handle snapshot creation
   */
  const handleCreateSnapshot = useCallback(
    async (name: string) => {
      if (!selectedImageId) return;

      setIsCreatingSnapshot(true);
      try {
        const eventIds = currentEvents.map((e) => e.id);
        const snapshotData = JSON.stringify(currentEvents);

        const newSnapshot = await snapshotService.createSnapshot(
          selectedImageId,
          name,
          eventIds,
          snapshotData,
        );

        setSnapshots((prev) => [newSnapshot, ...prev]);
        editStore.addSnapshot(selectedImageId, newSnapshot);
      } catch (error) {
        throw error instanceof Error ? error : new Error('Failed to create snapshot');
      } finally {
        setIsCreatingSnapshot(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedImageId, currentEvents],
  );

  /**
   * Handle snapshot restoration
   */
  const handleRestoreSnapshot = useCallback(
    (snapshot: SnapshotDTO) => {
      if (!selectedImageId) return;
      const events = JSON.parse(snapshot.snapshotData);
      editStore.setEditEventsForImage(selectedImageId, events);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedImageId],
  );

  /**
   * Handle snapshot deletion
   */
  const handleDeleteSnapshot = useCallback(
    async (snapshotId: number) => {
      if (!selectedImageId) return;

      setIsDeletingSnapshot(snapshotId);
      try {
        await snapshotService.deleteSnapshot(snapshotId);
        setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
        editStore.deleteSnapshotLocal(selectedImageId, snapshotId);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to delete snapshot:', error);
        }
      } finally {
        setIsDeletingSnapshot(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedImageId],
  );

  if (!selectedImageId) {
    return (
      <div className="pt-6 border-t border-zinc-800">
        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex justify-between items-center">
          <span className="flex items-center gap-2">
            <History size={14} /> Historique (Events)
          </span>
        </div>
        <div className="h-48 overflow-y-auto bg-black/50 p-3 text-[9px] font-mono text-zinc-500 rounded-xl border border-zinc-800/50 custom-scrollbar shadow-inner flex items-center justify-center">
          <div className="opacity-40 italic">Select an image to view history</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-6 border-t border-zinc-800">
      {/* Header */}
      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex justify-between items-center">
        <span className="flex items-center gap-2">
          <History size={14} /> Historique ({currentEvents.length} events)
        </span>
        <div className="flex gap-1">
          <button
            onClick={handleReset}
            disabled={currentEvents.length === 0}
            className="text-[9px] text-blue-500 font-bold border border-blue-900 px-2 py-0.5 rounded-full hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Reset to initial state"
          >
            <RotateCcw size={12} className="inline mr-1" />
            Reset
          </button>
          <button
            onClick={() => setIsSnapshotModalOpen(true)}
            disabled={currentEvents.length === 0}
            className="text-[9px] text-green-500 font-bold border border-green-900 px-2 py-0.5 rounded-full hover:bg-green-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Create a named snapshot"
          >
            <Save size={12} className="inline mr-1" />
            Snapshot
          </button>
        </div>
      </div>

      {/* Events Timeline */}
      <div className="mb-4">
        <div className="h-48 overflow-y-auto bg-black/50 p-3 text-[9px] font-mono text-zinc-500 rounded-xl border border-zinc-800/50 custom-scrollbar shadow-inner">
          {currentEvents.length === 0 && (
            <div className="opacity-30 italic">No edits recorded yet.</div>
          )}
          {currentEvents.map((event, index) => (
            <button
              key={event.id}
              onClick={() => handleRestoreToEvent(index)}
              className="w-full mb-2 border-l-2 border-zinc-800 pl-2 hover:border-blue-500 transition-colors group text-left"
              title="Click to restore to this state"
            >
              <div className="text-zinc-400 group-hover:text-blue-400">
                {index + 1}. {event.eventType}
              </div>
              <div className="opacity-40 text-[8px]">
                {new Date(event.createdAt).toLocaleTimeString()} •{' '}
                {JSON.stringify(event.payload).substring(0, 40)}...
              </div>
            </button>
          ))}
          <div className="italic opacity-20 mt-4 text-center text-[8px]">
            --- Initial Import v1.0 ---
          </div>
        </div>
      </div>

      {/* Snapshots Section */}
      {snapshots.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
            Snapshots ({snapshots.length})
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
            {snapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                onClick={() => handleRestoreSnapshot(snapshot)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRestoreSnapshot(snapshot);
                  }
                }}
                role="button"
                tabIndex={0}
                className="w-full flex items-center justify-between p-2 bg-green-900/10 border border-green-900/30 rounded hover:bg-green-900/20 transition-colors group"
                title="Click to restore this snapshot"
              >
                <div className="text-left flex-1 min-w-0">
                  <div className="text-[9px] font-medium text-green-400 truncate">
                    {snapshot.name}
                  </div>
                  <div className="text-[8px] text-zinc-500">
                    {new Date(snapshot.createdAt).toLocaleTimeString()}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSnapshot(snapshot.id);
                  }}
                  disabled={isDeletingSnapshot === snapshot.id}
                  className="ml-2 text-[8px] text-red-500 hover:text-red-400 disabled:opacity-40 transition-colors font-bold"
                  title="Delete snapshot"
                >
                  {isDeletingSnapshot === snapshot.id ? '...' : '✕'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Snapshot Modal */}
      <SnapshotModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        onSave={handleCreateSnapshot}
        isLoading={isCreatingSnapshot}
      />
    </div>
  );
};
