import { useState } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMHeading,
  PMIcon,
  PMInput,
  PMMenu,
  PMPortal,
  PMText,
  PMTextArea,
} from '@packmind/ui';
import { LuChevronDown, LuChevronRight } from 'react-icons/lu';

import { descriptorFor, distributionSummary } from '../data';
import type { PluginSummary } from '../types';

/**
 * The gesture that removes the second trip. Creation happens inside a plugin,
 * so the destination is already known and the component is distributable the
 * moment it is saved. The destination is shown and changeable, never asked for
 * afterwards.
 */
export function NewComponentForm({
  type,
  plugin,
  plugins,
  onCancel,
  onCreate,
}: Readonly<{
  type: string;
  plugin: PluginSummary;
  plugins: PluginSummary[];
  onCancel: () => void;
  onCreate: (input: {
    name: string;
    summary: string;
    targetPluginId: string;
  }) => void;
}>) {
  const descriptor = descriptorFor(type);
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [targetPluginId, setTargetPluginId] = useState(plugin.id);

  const targetPlugin = plugins.find((p) => p.id === targetPluginId) ?? plugin;
  const canCreate = name.trim().length > 0;

  return (
    <PMBox padding={6}>
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
        onClick={onCancel}
      >
        <PMIcon fontSize="sm">
          <LuChevronRight style={{ transform: 'rotate(180deg)' }} />
        </PMIcon>
        {plugin.name}
      </PMBox>

      <PMBox paddingTop={2} maxWidth="68ch">
        <PMHeading level="h2">
          New {descriptor.labelSingular.toLowerCase()}
        </PMHeading>
        <PMText as="div" color="secondary" paddingTop={1}>
          It lands in {targetPlugin.name} and goes out with that plugin's next
          distribution. Nothing else to attach afterwards.
        </PMText>

        <PMBox paddingTop={5}>
          <PMText as="div" fontSize="sm" fontWeight="medium">
            Name
          </PMText>
          <PMBox paddingTop={1}>
            <PMInput
              size="sm"
              value={name}
              placeholder={`e.g. ${placeholderFor(type)}`}
              onChange={(event) => setName(event.target.value)}
              aria-label="Component name"
            />
          </PMBox>
        </PMBox>

        <PMBox paddingTop={4}>
          <PMText as="div" fontSize="sm" fontWeight="medium">
            What it is for
          </PMText>
          <PMBox paddingTop={1}>
            <PMTextArea
              rows={3}
              value={summary}
              placeholder="One sentence. It appears in the plugin list and in the agent's own listing."
              onChange={(event) => setSummary(event.target.value)}
              aria-label="Component summary"
            />
          </PMBox>
        </PMBox>

        <PMBox paddingTop={4}>
          <PMText as="div" fontSize="sm" fontWeight="medium">
            Plugin
          </PMText>
          <PMHStack paddingTop={1} gap={3} align="center">
            <PMMenu.Root>
              <PMMenu.Trigger asChild>
                <PMButton variant="secondary" size="sm">
                  {targetPlugin.name}
                  <PMIcon fontSize="xs">
                    <LuChevronDown />
                  </PMIcon>
                </PMButton>
              </PMMenu.Trigger>
              <PMPortal>
                <PMMenu.Positioner>
                  <PMMenu.Content
                    maxHeight="320px"
                    overflowY="auto"
                    minWidth="260px"
                  >
                    {plugins.map((candidate) => (
                      <PMMenu.Item
                        key={candidate.id}
                        value={candidate.id}
                        cursor="pointer"
                        onClick={() => setTargetPluginId(candidate.id)}
                      >
                        {candidate.name}
                      </PMMenu.Item>
                    ))}
                  </PMMenu.Content>
                </PMMenu.Positioner>
              </PMPortal>
            </PMMenu.Root>
            <PMText fontSize="xs" color="faded">
              {distributionSummary(targetPlugin).repositories} repositor
              {distributionSummary(targetPlugin).repositories === 1
                ? 'y'
                : 'ies'}{' '}
              receive this plugin
            </PMText>
          </PMHStack>
        </PMBox>

        <PMHStack gap={2} paddingTop={6}>
          <PMButton
            variant="primary"
            size="sm"
            disabled={!canCreate}
            onClick={() =>
              onCreate({
                name: name.trim(),
                summary: summary.trim(),
                targetPluginId,
              })
            }
          >
            Create {descriptor.labelSingular.toLowerCase()}
          </PMButton>
          <PMButton variant="tertiary" size="sm" onClick={onCancel}>
            Cancel
          </PMButton>
          {!canCreate && (
            <PMText fontSize="xs" color="faded">
              A name is required.
            </PMText>
          )}
        </PMHStack>
      </PMBox>
    </PMBox>
  );
}

function placeholderFor(type: string): string {
  switch (type) {
    case 'standard':
      return 'api-error-envelopes';
    case 'command':
      return 'generate-changelog-entry';
    case 'skill':
      return 'profile-slow-endpoint';
    case 'hook':
      return 'block-secrets-on-write';
    case 'agent':
      return 'migration-reviewer';
    case 'output-style':
      return 'terse-handoff-notes';
    default:
      return 'internal-tooling';
  }
}
