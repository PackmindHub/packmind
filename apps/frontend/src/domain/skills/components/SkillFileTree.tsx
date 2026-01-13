import { useMemo, useState, useEffect } from 'react';
import { LuFolder, LuFile, LuChevronRight } from 'react-icons/lu';
import {
  createFileTreeCollection,
  PMIcon,
  PMTreeView,
  PMTreeViewBranchIndentGuide,
} from '@packmind/ui';

import type { SkillFile } from '@packmind/types';

type SkillFileTreeProps = {
  files: SkillFile[];
  selectedFilePath: string | null;
  onFileSelect: (path: string) => void;
};

/**
 * Get all parent folder paths for a given file path.
 * e.g., 'src/utils/helper.ts' → ['src', 'src/utils']
 */
const getParentFolders = (filePath: string): string[] => {
  const parts = filePath.split('/');
  return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'));
};

export const SkillFileTree = ({
  files,
  selectedFilePath,
  onFileSelect,
}: SkillFileTreeProps) => {
  const filePaths = useMemo(() => files.map((f) => f.path), [files]);
  const collection = useMemo(
    () => createFileTreeCollection(filePaths),
    [filePaths],
  );

  // Track expanded folders - initialize with parents of selected file
  const [expandedValue, setExpandedValue] = useState<string[]>(() =>
    selectedFilePath ? getParentFolders(selectedFilePath) : [],
  );

  // Auto-expand parent folders when selectedFilePath changes (e.g., from URL navigation)
  useEffect(() => {
    if (selectedFilePath) {
      const parentFolders = getParentFolders(selectedFilePath);
      setExpandedValue((prev) => {
        // Merge new parents with existing expanded folders to preserve user expansions
        const combined = new Set([...prev, ...parentFolders]);
        return Array.from(combined);
      });
    }
  }, [selectedFilePath]);

  const handleSelectionChange = (details: {
    selectedValue: string[];
    selectedNodes: { children?: unknown[] }[];
  }) => {
    const selectedNode = details.selectedNodes[0];
    const selectedValue = details.selectedValue[0];

    // Only trigger selection for files (nodes without children), not folders
    const isFile = !selectedNode?.children?.length;

    if (isFile && selectedValue) {
      onFileSelect(selectedValue);
    }
  };

  const handleExpandedChange = (details: { expandedValue: string[] }) => {
    setExpandedValue(details.expandedValue);
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <PMTreeView.Root
      collection={collection}
      selectionMode="single"
      selectedValue={selectedFilePath ? [selectedFilePath] : []}
      onSelectionChange={handleSelectionChange}
      expandedValue={expandedValue}
      onExpandedChange={handleExpandedChange}
      width="full"
      size="sm"
    >
      <PMTreeView.Tree>
        <PMTreeView.Node
          indentGuide={<PMTreeViewBranchIndentGuide />}
          render={({ node, nodeState }) => {
            if (nodeState.isBranch) {
              return (
                <PMTreeView.Branch>
                  <PMTreeView.BranchControl>
                    <PMTreeView.BranchIndicator>
                      <LuChevronRight />
                    </PMTreeView.BranchIndicator>
                    <PMIcon>
                      <LuFolder />
                    </PMIcon>
                    <PMTreeView.BranchText>{node.label}</PMTreeView.BranchText>
                  </PMTreeView.BranchControl>
                  <PMTreeView.BranchContent />
                </PMTreeView.Branch>
              );
            }

            return (
              <PMTreeView.Item>
                <LuFile />
                <PMTreeView.ItemText>{node.label}</PMTreeView.ItemText>
              </PMTreeView.Item>
            );
          }}
        />
      </PMTreeView.Tree>
    </PMTreeView.Root>
  );
};
