import { ChevronDown, ChevronRight, Folder, HardDrive } from 'lucide-react';
import type { FolderTreeNode } from '../../types/folder';
import { useFolderStore } from '../../stores/folderStore';

interface FolderTreeItemProps {
  node: FolderTreeNode;
  isActive: boolean;
  isExpanded: boolean;
  onSelect: (id: number) => void | Promise<void>;
  onToggleExpand: (id: number) => void;
  depth: number;
}

function FolderTreeItem({
  node,
  isActive,
  isExpanded,
  onSelect,
  onToggleExpand,
  depth,
}: FolderTreeItemProps) {
  const hasChildren = node.children.length > 0;
  const paddingLeft = `${depth * 12 + 8}px`;

  const handleClick = async () => {
    if (hasChildren) {
      onToggleExpand(node.id);
    }
    await Promise.resolve(onSelect(node.id));
  };

  // Get store state for recursive children
  const activeFolderId = useFolderStore((s) => s.activeFolderId);
  const expandedFolderIds = useFolderStore((s) => s.expandedFolderIds);

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full text-left py-1.5 px-2 rounded text-[11px] hover:bg-zinc-800 flex items-center gap-1.5 transition-colors group ${
          isActive ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-400'
        } ${!node.is_online ? 'opacity-50' : ''}`}
        style={{ paddingLeft }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown size={12} className="text-zinc-500 shrink-0" />
          ) : (
            <ChevronRight size={12} className="text-zinc-500 shrink-0" />
          )
        ) : (
          <span className="w-3" />
        )}
        <Folder
          size={13}
          className={`shrink-0 ${node.is_online ? 'text-blue-500' : 'text-zinc-600'}`}
        />
        <span className="flex-1 truncate">{node.name}</span>
        <span className="text-[9px] font-mono opacity-30 shrink-0">{node.total_image_count}</span>
      </button>
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              isActive={activeFolderId === child.id}
              isExpanded={expandedFolderIds.has(child.id)}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Composant principal exporté
interface FolderTreeProps {
  nodes: FolderTreeNode[];
  onFolderSelected?: (id: number) => void | Promise<void>;
}

export function FolderTree({ nodes, onFolderSelected }: FolderTreeProps) {
  // Get state from the global store
  const activeFolderId = useFolderStore((s) => s.activeFolderId);
  const expandedFolderIds = useFolderStore((s) => s.expandedFolderIds);
  const setActiveFolder = useFolderStore((s) => s.setActiveFolder);
  const toggleFolderExpanded = useFolderStore((s) => s.toggleFolderExpanded);

  const handleSelectFolder = async (id: number) => {
    // If custom callback provided, use it instead of default behavior
    if (onFolderSelected) {
      await Promise.resolve(onFolderSelected(id));
    } else {
      // Default: Load images from the selected folder (non-recursive by default)
      await setActiveFolder(id, false);
    }
  };

  const handleToggleExpand = (id: number) => {
    toggleFolderExpanded(id);
  };

  // Grouper par volume
  const volumeMap = new Map<string, FolderTreeNode[]>();
  nodes.forEach((node) => {
    const existing = volumeMap.get(node.volume_name) || [];
    existing.push(node);
    volumeMap.set(node.volume_name, existing);
  });

  return (
    <div className="space-y-2">
      {Array.from(volumeMap.entries()).map(([volumeName, volumeNodes]) => (
        <div key={volumeName}>
          <div className="flex gap-2 items-center text-xs text-zinc-500 mb-1 px-2">
            <HardDrive size={14} className="text-zinc-600" />
            <span className="font-mono">{volumeName}</span>
            <span className="text-[9px] opacity-30 ml-auto">
              {volumeNodes.reduce((sum, n) => sum + n.total_image_count, 0)}
            </span>
          </div>
          <div className="space-y-0.5">
            {volumeNodes.map((node) => (
              <FolderTreeItem
                key={node.id}
                node={node}
                isActive={activeFolderId === node.id}
                isExpanded={expandedFolderIds.has(node.id)}
                onSelect={handleSelectFolder}
                onToggleExpand={handleToggleExpand}
                depth={0}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
