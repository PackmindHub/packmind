import { useMemo, useState } from 'react';
import { LuFolder, LuFile, LuChevronRight, LuFiles } from 'react-icons/lu';
import {
  createFileTreeCollection,
  PMBox,
  PMIcon,
  PMSeparator,
  PMText,
  PMTreeView,
  PMTreeViewBranchIndentGuide,
} from '@packmind/ui';
import { SKILL_MD_PATH } from '../../utils/groupSkillProposalsByFile';

interface SkillFileFilterTreeProps {
  allFilePaths: string[];
  filePathsWithChanges: Set<string>;
  selectedFilter: string;
  onFilterSelect: (filter: string) => void;
}

function ChangeIndicator() {
  return (
    <PMBox bg="yellow.500" borderRadius="full" w="6px" h="6px" flexShrink={0} />
  );
}

function hasDescendantChanges(
  dirPath: string,
  filePathsWithChanges: Set<string>,
): boolean {
  for (const path of filePathsWithChanges) {
    if (path.startsWith(dirPath + '/')) return true;
  }
  return false;
}

export function SkillFileFilterTree({
  allFilePaths,
  filePathsWithChanges,
  selectedFilter,
  onFilterSelect,
}: Readonly<SkillFileFilterTreeProps>) {
  const collection = useMemo(
    () => createFileTreeCollection(allFilePaths),
    [allFilePaths],
  );

  const [expandedValue, setExpandedValue] = useState(() => {
    const dirs = new Set<string>();
    for (const filePath of allFilePaths) {
      const parts = filePath.split('/');
      for (let i = 1; i < parts.length; i++) {
        dirs.add(parts.slice(0, i).join('/'));
      }
    }
    return Array.from(dirs);
  });

  const hasSkillMdChanges = filePathsWithChanges.has(SKILL_MD_PATH);
  const isAllFilesSelected = selectedFilter === '';
  const isSkillMdSelected = selectedFilter === SKILL_MD_PATH;

  return (
    <PMBox>
      {/* All Files item */}
      <PMBox
        px={3}
        py={1.5}
        cursor="pointer"
        display="flex"
        alignItems="center"
        gap={2}
        borderRadius="sm"
        bg={isAllFilesSelected ? 'blue.900' : undefined}
        _hover={{ bg: isAllFilesSelected ? 'blue.900' : 'blue.800' }}
        onClick={() => onFilterSelect('')}
      >
        <PMIcon fontSize="sm">
          <LuFiles />
        </PMIcon>
        <PMText
          fontSize="sm"
          fontWeight={isAllFilesSelected ? 'semibold' : 'normal'}
        >
          All Files
        </PMText>
      </PMBox>

      <PMSeparator borderColor="border.secondary" my={1} />

      {/* SKILL.md item */}
      <PMBox
        px={3}
        py={1.5}
        cursor="pointer"
        display="flex"
        alignItems="center"
        gap={2}
        borderRadius="sm"
        bg={isSkillMdSelected ? 'blue.900' : undefined}
        _hover={{ bg: isSkillMdSelected ? 'blue.900' : 'blue.800' }}
        onClick={() => onFilterSelect(SKILL_MD_PATH)}
      >
        <LuFile />
        <PMText
          fontSize="sm"
          fontWeight={isSkillMdSelected ? 'semibold' : 'normal'}
          flex={1}
        >
          SKILL.md
        </PMText>
        {hasSkillMdChanges && <ChangeIndicator />}
      </PMBox>

      {allFilePaths.length > 0 && (
        <>
          <PMSeparator borderColor="border.secondary" my={1} />

          {/* File tree */}
          <PMTreeView.Root
            collection={collection}
            selectionMode="single"
            selectedValue={selectedFilter ? [selectedFilter] : []}
            onSelectionChange={(details: { selectedValue: string[] }) => {
              const value = details.selectedValue[0];
              if (value) {
                onFilterSelect(value);
              }
            }}
            expandedValue={expandedValue}
            onExpandedChange={(details: { expandedValue: string[] }) => {
              setExpandedValue(details.expandedValue);
            }}
            width="full"
            size="sm"
          >
            <PMTreeView.Tree>
              <PMTreeView.Node
                indentGuide={<PMTreeViewBranchIndentGuide />}
                render={({ node, nodeState }) => {
                  if (nodeState.isBranch) {
                    const dirHasChanges = hasDescendantChanges(
                      node.value,
                      filePathsWithChanges,
                    );
                    const isDirSelected = selectedFilter === node.value;

                    return (
                      <PMTreeView.Branch>
                        <PMTreeView.BranchControl
                          onClick={() => {
                            onFilterSelect(node.value);
                          }}
                          bg={isDirSelected ? 'blue.900' : undefined}
                        >
                          <PMTreeView.BranchIndicator>
                            <LuChevronRight />
                          </PMTreeView.BranchIndicator>
                          <PMIcon>
                            <LuFolder />
                          </PMIcon>
                          <PMTreeView.BranchText>
                            {node.label}
                          </PMTreeView.BranchText>
                          {dirHasChanges && <ChangeIndicator />}
                        </PMTreeView.BranchControl>
                        <PMTreeView.BranchContent />
                      </PMTreeView.Branch>
                    );
                  }

                  const fileHasChanges = filePathsWithChanges.has(node.value);

                  return (
                    <PMTreeView.Item>
                      <LuFile />
                      <PMTreeView.ItemText>{node.label}</PMTreeView.ItemText>
                      {fileHasChanges && <ChangeIndicator />}
                    </PMTreeView.Item>
                  );
                }}
              />
            </PMTreeView.Tree>
          </PMTreeView.Root>
        </>
      )}
    </PMBox>
  );
}
