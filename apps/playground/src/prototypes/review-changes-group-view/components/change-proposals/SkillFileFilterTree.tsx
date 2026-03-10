import { useState, useMemo } from 'react';
import {
  PMBox,
  PMText,
  PMSeparator,
  PMIcon,
  PMTreeView,
  PMTreeViewBranchIndentGuide,
  createFileTreeCollection,
} from '@packmind/ui';
import { LuFile, LuFolder, LuChevronRight } from 'react-icons/lu';

const SKILL_MD_PATH = 'SKILL.md';

const getParentFolders = (filePath: string): string[] => {
  const parts = filePath.split('/');
  return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'));
};

export function getUniqueFilePaths(
  proposals: { filePath?: string }[],
): string[] {
  const paths = new Set(proposals.map((p) => p.filePath ?? 'SKILL.md'));
  return Array.from(paths).sort((a, b) => {
    if (a === 'SKILL.md') return -1;
    if (b === 'SKILL.md') return 1;
    return a.localeCompare(b);
  });
}

export function SkillFileFilterTree({
  filePaths,
  selectedFilePath,
  onFileSelect,
}: {
  filePaths: string[];
  selectedFilePath: string | null;
  onFileSelect: (path: string | null) => void;
}) {
  const hasSkillMd = filePaths.includes(SKILL_MD_PATH);
  const otherPaths = filePaths.filter((p) => p !== SKILL_MD_PATH);
  const hasOtherFiles = otherPaths.length > 0;

  const otherCollection = useMemo(
    () => createFileTreeCollection(otherPaths),
    [otherPaths],
  );

  const [expandedValue, setExpandedValue] = useState<string[]>(() => {
    const allFolders = new Set<string>();
    for (const p of otherPaths) {
      for (const folder of getParentFolders(p)) {
        allFolders.add(folder);
      }
    }
    return Array.from(allFolders);
  });

  const handleSelectionChange = (details: {
    selectedValue: string[];
    selectedNodes: { children?: unknown[] }[];
  }) => {
    const selectedNode = details.selectedNodes[0];
    const selectedValue = details.selectedValue[0];
    const isFile = !selectedNode?.children?.length;
    if (isFile && selectedValue) {
      onFileSelect(selectedValue);
    }
  };

  return (
    <PMBox px={3} pt={2}>
      <PMText fontSize="xs" fontWeight="bold" color="secondary" mb={2} px={2}>
        FILES
      </PMText>

      {/* "All files" option */}
      <PMBox
        cursor="pointer"
        onClick={() => onFileSelect(null)}
        px={2}
        py={1}
        borderRadius="sm"
        bg={
          selectedFilePath === null
            ? '{colors.background.secondary}'
            : undefined
        }
        _hover={{ bg: '{colors.background.secondary}' }}
        mb={1}
      >
        <PMText
          fontSize="sm"
          fontWeight={selectedFilePath === null ? 'bold' : 'normal'}
        >
          All files
        </PMText>
      </PMBox>

      <PMSeparator borderColor="border.secondary" my={1} />

      {/* SKILL.md — principal file */}
      {hasSkillMd && (
        <PMTreeView.Root
          collection={createFileTreeCollection([SKILL_MD_PATH])}
          selectionMode="single"
          selectedValue={
            selectedFilePath === SKILL_MD_PATH ? [SKILL_MD_PATH] : []
          }
          onSelectionChange={() => onFileSelect(SKILL_MD_PATH)}
          width="full"
          size="sm"
        >
          <PMTreeView.Tree>
            <PMTreeView.Node
              render={() => (
                <PMTreeView.Item>
                  <LuFile />
                  <PMTreeView.ItemText>{SKILL_MD_PATH}</PMTreeView.ItemText>
                </PMTreeView.Item>
              )}
            />
          </PMTreeView.Tree>
        </PMTreeView.Root>
      )}

      {/* Separator between SKILL.md and other files */}
      {hasSkillMd && hasOtherFiles && (
        <PMSeparator borderColor="border.secondary" width="full" />
      )}

      {/* Other files tree */}
      {hasOtherFiles && (
        <PMTreeView.Root
          collection={otherCollection}
          selectionMode="single"
          selectedValue={selectedFilePath ? [selectedFilePath] : []}
          onSelectionChange={handleSelectionChange}
          expandedValue={expandedValue}
          onExpandedChange={(details) =>
            setExpandedValue(details.expandedValue)
          }
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
                        <PMTreeView.BranchText>
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
                    <PMTreeView.ItemText>{node.label}</PMTreeView.ItemText>
                  </PMTreeView.Item>
                );
              }}
            />
          </PMTreeView.Tree>
        </PMTreeView.Root>
      )}
    </PMBox>
  );
}
