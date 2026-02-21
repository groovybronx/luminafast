import { ChevronDown, ChevronRight, Folder, HardDrive } from 'lucide-react';
import { useState } from 'react';
import type { FolderTreeNode } from '../../types/folder';

interface FolderTreeItemProps {
  node: FolderTreeNode;
  isActive: boolean;
  isExpanded: boolean;
  onSelect: (id: number) => void;
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

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) {
            onToggleExpand(node.id);
          }
          onSelect(node.id);
        }}
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
            <FolderTreeItemContainer key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// Container component to access store hooks
interface FolderTreeItemContainerProps {
  node: FolderTreeNode;
  depth: number;
}

function FolderTreeItemContainer({ node, depth }: FolderTreeItemContainerProps) {
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<number>>(new Set());

  // Ces états devraient venir du store, mais pour simplifier le composant
  // on les passe via props depuis le parent
  return (
    <FolderTreeItem
      node={node}
      isActive={activeFolderId === node.id}
      isExpanded={expandedFolderIds.has(node.id)}
      onSelect={setActiveFolderId}
      onToggleExpand={(id) => {
        const newSet = new Set(expandedFolderIds);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        setExpandedFolderIds(newSet);
      }}
      depth={depth}
    />
  );
}

// Composant principal exporté
interface FolderTreeProps {
  nodes: FolderTreeNode[];
  activeFolderId: number | null;
  expandedFolderIds: Set<number>;
  onSelectFolder: (id: number) => void;
  onToggleExpand: (id: number) => void;
}

export function FolderTree({
  nodes,
  activeFolderId,
  expandedFolderIds,
  onSelectFolder,
  onToggleExpand,
}: FolderTreeProps) {
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
                onSelect={onSelectFolder}
                onToggleExpand={onToggleExpand}
                depth={0}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
