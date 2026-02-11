import { useState } from 'react';
import { PMButton, PMPopover } from '@packmind/ui';
import { CodingAgent } from '@packmind/types';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';
import { DownloadDefaultSkillsContent } from './DownloadDefaultSkillsContent';

interface IDownloadDefaultSkillsPopoverProps {
  buttonVariant?: 'primary' | 'outline' | 'secondary' | 'tertiary';
  buttonSize?: 'xs' | 'sm' | 'md' | 'lg';
  placement?: 'bottom' | 'bottom-end' | 'bottom-start';
}

export const DownloadDefaultSkillsPopover = ({
  buttonVariant = 'outline',
  buttonSize = 'md',
  placement = 'bottom-end',
}: IDownloadDefaultSkillsPopoverProps) => {
  const [downloadingAgent, setDownloadingAgent] = useState<CodingAgent | null>(
    null,
  );
  const analytics = useAnalytics();

  const handleDownloadSkillsForAgent = async (agent: CodingAgent) => {
    setDownloadingAgent(agent);
    analytics.track('default_skills_downloaded', { agent });
    try {
      const response = await fetch(`/api/v0/skills/${agent}`);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `packmind-${agent}-default-skills.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Failed to download ${agent} skills zip:`, error);
    } finally {
      setDownloadingAgent(null);
    }
  };

  return (
    <PMPopover.Root positioning={{ placement }}>
      <PMPopover.Trigger asChild>
        <PMButton
          variant={buttonVariant}
          size={buttonSize}
          title={
            'Download skills to create standards and skills with your AI Agent.'
          }
        >
          Get Packmind Skills
        </PMButton>
      </PMPopover.Trigger>
      <PMPopover.Positioner>
        <PMPopover.Content width="380px">
          <PMPopover.Arrow>
            <PMPopover.ArrowTip />
          </PMPopover.Arrow>
          <PMPopover.Body>
            <PMPopover.Title>Get Packmind skills</PMPopover.Title>
            <DownloadDefaultSkillsContent
              downloadingAgent={downloadingAgent}
              onDownload={handleDownloadSkillsForAgent}
            />
          </PMPopover.Body>
        </PMPopover.Content>
      </PMPopover.Positioner>
    </PMPopover.Root>
  );
};
