// Folder tree types for navigation and filtering

export interface FolderTreeNode {
  id: number;
  name: string;
  path: string;
  volume_name: string;
  is_online: boolean;
  image_count: number; // images directly in this folder
  total_image_count: number; // images recursively (this folder + children)
  children: FolderTreeNode[];
}

export interface FolderFilter {
  folder_id: number | null;
  recursive: boolean;
}
