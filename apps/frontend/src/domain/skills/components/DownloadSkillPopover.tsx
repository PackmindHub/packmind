import { useState } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMPopover,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { CodingAgent, OrganizationId, SkillId, SpaceId } from '@packmind/types';
import { RiClaudeLine } from 'react-icons/ri';
import { VscVscode } from 'react-icons/vsc';
import { LuDownload } from 'react-icons/lu';
import { CursorIcon } from '@packmind/assets/icons/CursorIcon';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';

interface IDownloadSkillPopoverProps {
  skillId: SkillId;
  organizationId: OrganizationId;
  spaceId: SpaceId;
}

export const DownloadSkillPopover = ({
  skillId,
  organizationId,
  spaceId,
}: IDownloadSkillPopoverProps) => {
  const [downloadingAgent, setDownloadingAgent] = useState<CodingAgent | null>(
    null,
  );
  const analytics = useAnalytics();

  const handleDownload = async (agent: CodingAgent) => {
    setDownloadingAgent(agent);
    analytics.track('skill_downloaded', { agent, skillId });
    try {
      const response = await fetch(
        `/api/v0/organizations/${organizationId}/spaces/${spaceId}/skills/${skillId}/download/${agent}`,
        { credentials: 'include' },
      );
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = response.headers.get('Content-Disposition');
      const fileName =
        disposition?.match(/filename="(.+)"/)?.[1] ?? `skill-${agent}.zip`;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Failed to download skill zip for ${agent}:`, error);
    } finally {
      setDownloadingAgent(null);
    }
  };

  return (
    <PMPopover.Root positioning={{ placement: 'bottom-end' }}>
      <PMPopover.Trigger asChild>
        <PMButton variant="secondary">
          <LuDownload />
          Download
        </PMButton>
      </PMPopover.Trigger>
      <PMPopover.Positioner>
        <PMPopover.Content width="380px">
          <PMPopover.Arrow>
            <PMPopover.ArrowTip />
          </PMPopover.Arrow>
          <PMPopover.Body>
            <PMPopover.Title>Download for AI assistant</PMPopover.Title>
            <PMBox mt={4}>
              <PMVStack gap={2} align="flex-start">
                <PMText color="secondary" as="p" variant="small">
                  Extract the zip file at the root of your repository.
                </PMText>
                <PMHStack gap={2} align="stretch" mt={2}>
                  <PMButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload('claude')}
                    loading={downloadingAgent === 'claude'}
                    disabled={downloadingAgent !== null}
                  >
                    <PMIcon as={RiClaudeLine} />
                    Claude
                  </PMButton>
                  <PMButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload('copilot')}
                    loading={downloadingAgent === 'copilot'}
                    disabled={downloadingAgent !== null}
                  >
                    <PMIcon as={VscVscode} />
                    Copilot
                  </PMButton>
                  <PMButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload('cursor')}
                    loading={downloadingAgent === 'cursor'}
                    disabled={downloadingAgent !== null}
                  >
                    <PMIcon as={CursorIcon} />
                    Cursor
                  </PMButton>
                </PMHStack>
              </PMVStack>
            </PMBox>
          </PMPopover.Body>
        </PMPopover.Content>
      </PMPopover.Positioner>
    </PMPopover.Root>
  );
};
