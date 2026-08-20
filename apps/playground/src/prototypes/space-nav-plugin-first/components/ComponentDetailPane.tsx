import {
  PMBox,
  PMButton,
  PMHStack,
  PMHeading,
  PMIcon,
  PMMarkdownViewer,
  PMMenu,
  PMPortal,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuChevronDown, LuChevronRight, LuFileCode } from 'react-icons/lu';

import { descriptorFor } from '../data';
import type { Component, PluginSummary } from '../types';
import { ComponentReviewMarker } from './ComponentReviewMarker';

/**
 * The frame. Identical for every component type: identity, version, the plugin
 * it belongs to, its distribution reach, its review state. Only the body below
 * the divider changes, and which body to render comes from the type registry.
 */
export function ComponentDetailPane({
  component,
  plugin,
  plugins,
  filesInRail = false,
  onBack,
  onMoveToPlugin,
}: Readonly<{
  component: Component;
  plugin: PluginSummary;
  plugins: PluginSummary[];
  /** True when the rail already carries this component's file tree and its back link. */
  filesInRail?: boolean;
  onBack: () => void;
  onMoveToPlugin: (targetPluginId: string) => void;
}>) {
  const descriptor = descriptorFor(component.type);

  return (
    <PMBox padding={6}>
      {!filesInRail && (
        <PMBox
          as="button"
          display="inline-flex"
          alignItems="center"
          gap="4px"
          bg="transparent"
          border="none"
          padding={0}
          cursor="pointer"
          fontSize="sm"
          color="text.faded"
          _hover={{ color: 'text.primary' }}
          transition="color 150ms ease-out"
          onClick={onBack}
        >
          <PMIcon fontSize="sm">
            <LuChevronRight style={{ transform: 'rotate(180deg)' }} />
          </PMIcon>
          {plugin.name}
        </PMBox>
      )}

      <PMHStack align="start" justify="space-between" gap={6} paddingTop={2}>
        <PMBox minW={0} maxWidth="68ch">
          <PMHeading level="h2">{component.name}</PMHeading>
          <PMHStack gap={2} paddingTop={2} wrap="wrap" align="center">
            <PMHStack gap="6px" align="center">
              <PMIcon fontSize="xs" color="text.faded">
                {descriptor.icon}
              </PMIcon>
              <PMText fontSize="sm" color="secondary">
                {descriptor.labelSingular}
              </PMText>
            </PMHStack>
            <PMText fontSize="sm" color="faded" aria-hidden>
              ·
            </PMText>
            <PMText fontSize="sm" color="faded">
              v{component.version}
            </PMText>
            <PMText fontSize="sm" color="faded" aria-hidden>
              ·
            </PMText>
            <PMText fontSize="sm" color="faded">
              {component.updatedLabel} by {component.author}
            </PMText>
            {/*
              No repository count and no distribution status here. Both belong to
              the plugin, one level up, and printing them on the component was
              what made users think an component is distributed on its own.
            */}
            {component.pendingReview && (
              <>
                <PMText fontSize="sm" color="faded" aria-hidden>
                  ·
                </PMText>
                <ComponentReviewMarker pendingReview />
              </>
            )}
          </PMHStack>
          <PMHStack gap={2} paddingTop={3} wrap="wrap" align="center">
            <PMText fontSize="sm" color="secondary">
              Renders for
            </PMText>
            {descriptor.agents.map((agent) => (
              <PMBox
                key={agent}
                paddingX={2}
                paddingY="1px"
                borderRadius="sm"
                bg="background.tertiary"
                fontSize="xs"
                color="text.secondary"
              >
                {agent}
              </PMBox>
            ))}
            {!descriptor.marketplaceRenderable && (
              <PMText fontSize="xs" color="faded">
                not carried to marketplaces
              </PMText>
            )}
          </PMHStack>
        </PMBox>

        <PMHStack gap={2} flexShrink={0}>
          <MovePluginMenu
            plugins={plugins}
            currentPluginId={plugin.id}
            onMoveToPlugin={onMoveToPlugin}
          />
          <PMButton variant="primary" size="sm">
            Edit
          </PMButton>
        </PMHStack>
      </PMHStack>

      <PMBox
        marginTop={5}
        borderTopWidth="1px"
        borderColor="border.tertiary"
        paddingTop={5}
      >
        <ComponentBody component={component} filesInRail={filesInRail} />
      </PMBox>
    </PMBox>
  );
}

/**
 * Replaces AddToPackagesDialog. With one plugin per component there is nothing
 * to reconcile: the component moves, it is never added to a set.
 */
function MovePluginMenu({
  plugins,
  currentPluginId,
  onMoveToPlugin,
}: Readonly<{
  plugins: PluginSummary[];
  currentPluginId: string;
  onMoveToPlugin: (targetPluginId: string) => void;
}>) {
  const others = plugins.filter((p) => p.id !== currentPluginId);
  return (
    <PMMenu.Root>
      <PMMenu.Trigger asChild>
        <PMButton variant="secondary" size="sm" disabled={others.length === 0}>
          Move to plugin
          <PMIcon fontSize="xs">
            <LuChevronDown />
          </PMIcon>
        </PMButton>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content maxHeight="320px" overflowY="auto" minWidth="260px">
            {others.map((plugin) => (
              <PMMenu.Item
                key={plugin.id}
                value={plugin.id}
                cursor="pointer"
                onClick={() => onMoveToPlugin(plugin.id)}
              >
                {plugin.name}
              </PMMenu.Item>
            ))}
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
}

function ComponentBody({
  component,
  filesInRail = false,
}: Readonly<{ component: Component; filesInRail?: boolean }>) {
  const { body } = descriptorFor(component.type);

  switch (body) {
    case 'prose':
      return <ProseBody component={component} />;
    case 'prose+rules':
      return (
        <PMVStack gap={6} align="stretch">
          <ProseBody component={component} />
          <RulesBody component={component} />
        </PMVStack>
      );
    case 'prose+frontmatter':
      return (
        <PMVStack gap={6} align="stretch">
          <FrontmatterBody component={component} />
          <ProseBody component={component} />
        </PMVStack>
      );
    case 'prose+frontmatter+files':
      return (
        <PMVStack gap={6} align="stretch">
          <FrontmatterBody component={component} />
          {/* The file list moves to the rail once there is a tree to navigate. */}
          {!filesInRail && <FilesBody component={component} />}
          <ProseBody component={component} />
        </PMVStack>
      );
    case 'config-form':
      return <ConfigBody component={component} />;
  }
}

function BodySectionLabel({ children }: Readonly<{ children: string }>) {
  return (
    <PMText
      fontSize="10px"
      fontWeight="semibold"
      textTransform="uppercase"
      letterSpacing="wider"
      color="faded"
    >
      {children}
    </PMText>
  );
}

function ProseBody({ component }: Readonly<{ component: Component }>) {
  if (!component.prose) return null;
  return (
    <PMBox maxWidth="72ch">
      <PMMarkdownViewer content={component.prose} />
    </PMBox>
  );
}

function RulesBody({ component }: Readonly<{ component: Component }>) {
  if (!component.rules?.length) return null;
  return (
    <PMBox maxWidth="72ch">
      <BodySectionLabel>
        {`${component.rules.length} rule${component.rules.length === 1 ? '' : 's'}`}
      </BodySectionLabel>
      <PMBox
        marginTop={1}
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="sm"
        overflow="hidden"
      >
        {component.rules.map((rule, index) => (
          <PMHStack
            key={rule.id}
            gap={3}
            paddingX={3}
            paddingY="10px"
            borderTopWidth={index === 0 ? '0' : '1px'}
            borderColor="border.tertiary"
            align="start"
          >
            <PMText fontSize="sm" flex={1} minW={0}>
              {rule.text}
            </PMText>
            <PMText fontSize="xs" color="faded" flexShrink={0}>
              {rule.detection === 'automated' ? 'Detected' : 'Reviewed'}
            </PMText>
          </PMHStack>
        ))}
      </PMBox>
    </PMBox>
  );
}

function FrontmatterBody({ component }: Readonly<{ component: Component }>) {
  if (!component.frontmatter?.length) return null;
  return (
    <PMBox maxWidth="72ch">
      <BodySectionLabel>Frontmatter</BodySectionLabel>
      <PMVStack gap={0} align="stretch" marginTop={1}>
        {component.frontmatter.map((field, index) => (
          <PMHStack
            key={field.label}
            gap={4}
            align="start"
            paddingY="6px"
            borderTopWidth={index === 0 ? '0' : '1px'}
            borderColor="border.tertiary"
          >
            <PMText
              fontSize="sm"
              color="faded"
              width="132px"
              flexShrink={0}
              fontFamily="mono"
            >
              {field.label}
            </PMText>
            <PMText fontSize="sm" flex={1} minW={0}>
              {field.value}
            </PMText>
          </PMHStack>
        ))}
      </PMVStack>
    </PMBox>
  );
}

function FilesBody({ component }: Readonly<{ component: Component }>) {
  if (!component.files?.length) return null;
  return (
    <PMBox maxWidth="72ch">
      <BodySectionLabel>
        {`${component.files.length} file${component.files.length === 1 ? '' : 's'}`}
      </BodySectionLabel>
      <PMBox
        marginTop={1}
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="sm"
        overflow="hidden"
      >
        {component.files.map((file, index) => (
          <PMHStack
            key={file.path}
            gap={3}
            paddingX={3}
            paddingY="8px"
            borderTopWidth={index === 0 ? '0' : '1px'}
            borderColor="border.tertiary"
            align="center"
          >
            <PMIcon fontSize="xs" color="text.faded" flexShrink={0}>
              <LuFileCode />
            </PMIcon>
            <PMText fontSize="sm" fontFamily="mono" flex={1} minW={0} truncate>
              {file.path}
            </PMText>
            {file.executable && (
              <PMText fontSize="xs" color="faded" flexShrink={0}>
                executable
              </PMText>
            )}
            <PMText
              fontSize="xs"
              color="faded"
              flexShrink={0}
              width="64px"
              textAlign="right"
            >
              {file.size}
            </PMText>
          </PMHStack>
        ))}
      </PMBox>
    </PMBox>
  );
}

function ConfigBody({ component }: Readonly<{ component: Component }>) {
  if (!component.config?.length) return null;
  return (
    <PMBox maxWidth="72ch">
      <PMText as="div" color="secondary" paddingBottom={4}>
        {component.summary}
      </PMText>
      <PMVStack gap={4} align="stretch">
        {component.config.map((field) => (
          <PMBox key={field.label}>
            <PMText as="div" fontSize="sm" fontWeight="medium">
              {field.label}
            </PMText>
            <PMBox
              marginTop={1}
              paddingX={3}
              paddingY="8px"
              borderWidth="1px"
              borderColor="border.tertiary"
              borderRadius="sm"
              bg="background.secondary"
            >
              <PMText
                fontSize="sm"
                fontFamily={field.kind === 'code' ? 'mono' : undefined}
                wordBreak="break-word"
              >
                {field.value}
              </PMText>
            </PMBox>
            {field.hint && (
              <PMText as="div" fontSize="xs" color="faded" paddingTop={1}>
                {field.hint}
              </PMText>
            )}
          </PMBox>
        ))}
      </PMVStack>
    </PMBox>
  );
}
