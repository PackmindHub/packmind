import { useState } from 'react';
import {
  PMButton,
  PMHStack,
  PMIcon,
  PMIconButton,
  PMPopover,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import { CodingAgent, PreviewArtifactRenderingCommand } from '@packmind/types';
import { RiClaudeLine } from 'react-icons/ri';
import { VscVscode } from 'react-icons/vsc';
import { CursorIcon } from '@packmind/assets/icons/CursorIcon';
import { LuDownload } from 'react-icons/lu';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';

type AgentOption = {
  value: CodingAgent;
  label: string;
  icon: React.ComponentType;
};

const AGENT_OPTIONS: AgentOption[] = [
  { value: 'claude', label: 'Claude', icon: RiClaudeLine },
  { value: 'copilot', label: 'Copilot', icon: VscVscode },
  { value: 'cursor', label: 'Cursor', icon: CursorIcon },
];

interface DownloadAsAgentButtonProps {
  getPreviewCommand: () => Omit<PreviewArtifactRenderingCommand, 'codingAgent'>;
  size?: 'xs' | 'sm';
}

export function DownloadAsAgentButton({
  getPreviewCommand,
  size = 'sm',
}: Readonly<DownloadAsAgentButtonProps>) {
  const [downloadingAgent, setDownloadingAgent] = useState<CodingAgent | null>(
    null,
  );
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  const handleDownload = async (agent: CodingAgent) => {
    if (!organization?.id || !spaceId) return;

    setDownloadingAgent(agent);
    try {
      const command = getPreviewCommand();
      const response = await fetch(
        `/api/v0/organizations/${organization.id}/spaces/${spaceId}/change-proposals/preview-rendering`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ...command, codingAgent: agent }),
        },
      );

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `packmind-${agent}-preview.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Failed to download ${agent} preview zip:`, error);
    } finally {
      setDownloadingAgent(null);
    }
  };

  return (
    <PMPopover.Root positioning={{ placement: 'bottom-end' }}>
      <PMTooltip label="Download for agent">
        <PMPopover.Trigger asChild>
          <PMIconButton
            aria-label="Download for agent"
            variant="tertiary"
            size={size}
          >
            <LuDownload />
          </PMIconButton>
        </PMPopover.Trigger>
      </PMTooltip>
      <PMPopover.Positioner>
        <PMPopover.Content width="380px">
          <PMPopover.Arrow>
            <PMPopover.ArrowTip />
          </PMPopover.Arrow>
          <PMPopover.Body>
            <PMPopover.Title>Download as agent files</PMPopover.Title>
            <PMVStack gap={2} align="stretch" mt={3}>
              <PMText color="secondary" as="p" variant="small">
                Download the rendered artifact files for your AI coding
                assistant. Extract the zip at the root of your repository to
                test locally.
              </PMText>
              <PMHStack gap={2} mt={2} flexWrap="wrap">
                {AGENT_OPTIONS.map((agent) => (
                  <PMButton
                    key={agent.value}
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(agent.value)}
                    loading={downloadingAgent === agent.value}
                    disabled={downloadingAgent !== null}
                  >
                    <PMIcon as={agent.icon} />
                    {agent.label}
                  </PMButton>
                ))}
              </PMHStack>
            </PMVStack>
          </PMPopover.Body>
        </PMPopover.Content>
      </PMPopover.Positioner>
    </PMPopover.Root>
  );
}
