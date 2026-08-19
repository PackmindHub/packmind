import { useEffect, useMemo, useState } from 'react';
import {
  createFileTreeCollection,
  PMBox,
  PMHStack,
  PMIcon,
  PMSeparator,
  PMText,
  PMTreeView,
  PMTreeViewBranchIndentGuide,
  PMVStack,
} from '@packmind/ui';
import { LuChevronRight, LuFile, LuFolder } from 'react-icons/lu';

import type { Component, ComponentFile, PluginSummary } from '../types';

const SKILL_MD_PATH = 'SKILL.md';

/** 'a/b/c.md' → ['a', 'a/b'] */
function parentFolders(filePath: string): string[] {
  const parts = filePath.split('/');
  return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'));
}

/**
 * The rail is contextual. At plugin level it lists plugins; inside a
 * multi-file component it becomes that component's file tree. Two navigation
 * columns at every depth, never three.
 *
 * SKILL.md sits above the tree, separated from the rest: it is the component,
 * the other files are its resources. That mirrors how an agent reads a skill,
 * loading SKILL.md first and pulling references on demand.
 */
export function SkillFileRail({
  component,
  plugin,
  selectedFilePath,
  onSelectFile,
  onBackToPlugin,
}: Readonly<{
  component: Component;
  plugin: PluginSummary;
  selectedFilePath: string;
  onSelectFile: (path: string) => void;
  onBackToPlugin: () => void;
}>) {
  const files: ComponentFile[] = component.files ?? [];
  const entryFile = files.find((file) => file.path === SKILL_MD_PATH);
  const otherFiles = files.filter((file) => file.path !== SKILL_MD_PATH);

  const collection = useMemo(
    () => createFileTreeCollection(otherFiles.map((file) => file.path)),
    [otherFiles],
  );

  const [expandedValue, setExpandedValue] = useState<string[]>(() =>
    parentFolders(selectedFilePath),
  );

  // Reveal the selected file when the selection comes from outside the tree.
  useEffect(() => {
    const parents = parentFolders(selectedFilePath);
    if (parents.length === 0) return;
    setExpandedValue((prev) => Array.from(new Set([...prev, ...parents])));
  }, [selectedFilePath]);

  return (
    <PMBox
      // Tied to the plugin rail this one replaces: the column must not change
      // width when a skill is opened and closed.
      width="344px"
      flexShrink={0}
      borderRightWidth="1px"
      borderColor="border.tertiary"
      display="flex"
      flexDirection="column"
      minH={0}
    >
      <PMBox
        paddingX={3}
        paddingY={3}
        borderBottomWidth="1px"
        borderColor="border.tertiary"
      >
        <PMBox
          as="button"
          display="inline-flex"
          alignItems="center"
          gap="4px"
          bg="transparent"
          border="none"
          padding={0}
          cursor="pointer"
          fontSize="xs"
          color="text.faded"
          _hover={{ color: 'text.primary' }}
          transition="color 150ms ease-out"
          onClick={onBackToPlugin}
        >
          <PMIcon fontSize="xs">
            <LuChevronRight style={{ transform: 'rotate(180deg)' }} />
          </PMIcon>
          {plugin.name}
        </PMBox>
        <PMText as="div" fontSize="sm" fontWeight="semibold" paddingTop={1}>
          {component.name}
        </PMText>
        <PMText as="div" fontSize="xs" color="faded">
          {files.length} files
        </PMText>
      </PMBox>

      <PMVStack
        align="stretch"
        gap={2}
        flex={1}
        minH={0}
        paddingX={2}
        paddingY={2}
      >
        {entryFile && (
          <>
            <PMTreeView.Root
              collection={createFileTreeCollection([SKILL_MD_PATH])}
              selectionMode="single"
              selectedValue={
                selectedFilePath === SKILL_MD_PATH ? [SKILL_MD_PATH] : []
              }
              onSelectionChange={() => onSelectFile(SKILL_MD_PATH)}
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
            {otherFiles.length > 0 && (
              <PMSeparator borderColor="border.tertiary" width="full" />
            )}
          </>
        )}

        {otherFiles.length > 0 && (
          <PMBox
            flex={1}
            minH={0}
            overflow="auto"
            scrollbarColor="{colors.background.tertiary} transparent"
          >
            <PMTreeView.Root
              collection={collection}
              selectionMode="single"
              selectedValue={[selectedFilePath]}
              onSelectionChange={(details: {
                selectedValue: string[];
                selectedNodes: { children?: unknown[] }[];
              }) => {
                const node = details.selectedNodes[0];
                const value = details.selectedValue[0];
                const isFile = !node?.children?.length;
                if (isFile && value) onSelectFile(value);
              }}
              expandedValue={expandedValue}
              onExpandedChange={(details: { expandedValue: string[] }) =>
                setExpandedValue(details.expandedValue)
              }
              width="full"
              size="sm"
            >
              <PMTreeView.Tree>
                <PMTreeView.Node
                  indentGuide={<PMTreeViewBranchIndentGuide />}
                  render={({
                    node,
                    nodeState,
                  }: {
                    node: { label: string };
                    nodeState: { isBranch: boolean };
                  }) => {
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
          </PMBox>
        )}
      </PMVStack>
    </PMBox>
  );
}

/**
 * Where the tree leads. Read-only on purpose: this prototype covers navigation,
 * not authoring.
 */
export function FileDetailPane({
  file,
  component,
}: Readonly<{ file: ComponentFile; component: Component }>) {
  const segments = file.path.split('/');
  const fileName = segments[segments.length - 1];
  const folder = segments.slice(0, -1).join('/');

  return (
    <PMBox padding={6}>
      <PMText as="div" fontSize="xs" color="faded" fontFamily="mono">
        {component.name}/{folder ? `${folder}/` : ''}
      </PMText>
      <PMText
        as="div"
        fontSize="lg"
        fontWeight="semibold"
        fontFamily="mono"
        paddingTop="2px"
      >
        {fileName}
      </PMText>
      <PMHStack gap={2} paddingTop={2} wrap="wrap">
        <PMText fontSize="sm" color="faded">
          {file.size}
        </PMText>
        {file.executable && (
          <>
            <PMText fontSize="sm" color="faded" aria-hidden>
              ·
            </PMText>
            <PMText fontSize="sm" color="faded">
              executable
            </PMText>
          </>
        )}
        {file.binary && (
          <>
            <PMText fontSize="sm" color="faded" aria-hidden>
              ·
            </PMText>
            <PMText fontSize="sm" color="faded">
              binary
            </PMText>
          </>
        )}
      </PMHStack>

      <PMBox
        marginTop={5}
        borderTopWidth="1px"
        borderColor="border.tertiary"
        paddingTop={5}
        maxWidth="80ch"
      >
        {file.binary ? (
          <PMText color="secondary">
            Binary file, not shown. It ships with the skill and is written to
            the repository as is.
          </PMText>
        ) : (
          <PMBox
            as="pre"
            fontFamily="mono"
            fontSize="sm"
            whiteSpace="pre-wrap"
            color="text.secondary"
            margin={0}
          >
            {file.content ?? 'No preview in this prototype.'}
          </PMBox>
        )}
      </PMBox>
    </PMBox>
  );
}
