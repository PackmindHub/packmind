import { useEffect, useMemo } from 'react';
import { LuFolder, LuFile, LuChevronRight } from 'react-icons/lu';
import {
  createFileTreeCollection,
  PMBox,
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

  const handleSelectionChange = (details: { selectedValue: string[] }) => {
    const selectedValue = details.selectedValue[0];
    if (selectedValue) {
      onFileSelect(selectedValue);
    }
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
      width="full"
      size="sm"
    >
      <PMTreeView.Tree>
        <PMTreeView.Node
          indentGuide={<PMTreeViewBranchIndentGuide />}
          render={({ node, nodeState }) => {
            const isSelected = selectedFilePath === node.value;

            if (nodeState.isBranch) {
              return (
                <PMTreeView.Branch>
                  <PMTreeView.BranchControl>
                    <PMTreeView.BranchIndicator>
                      <LuChevronRight />
                    </PMTreeView.BranchIndicator>
                    <PMIcon color="text.secondary" fontSize="sm">
                      <LuFolder />
                    </PMIcon>
                    <PMTreeView.BranchText color="text.primary">
                      {node.label}
                    </PMTreeView.BranchText>
                  </PMTreeView.BranchControl>
                  <PMTreeView.BranchContent />
                </PMTreeView.Branch>
              );
            }

            return (
              <PMTreeView.Item>
                <LuFile />
                <PMTreeView.ItemText
                  fontWeight={isSelected ? 'bold' : 'normal'}
                  fontSize="sm"
                >
                  {node.label}
                </PMTreeView.ItemText>
              </PMTreeView.Item>
            );
          }}
        />
      </PMTreeView.Tree>
    </PMTreeView.Root>
  );
};
