import { useState } from 'react';
import {
  PMButton,
  PMHStack,
  PMIcon,
  PMPopover,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import { CodingAgent } from '@packmind/types';
import { RiClaudeLine } from 'react-icons/ri';
import { VscVscode } from 'react-icons/vsc';
import { CursorIcon } from '@packmind/assets/icons/CursorIcon';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';

interface IDownloadDefaultSkillsPopoverProps {
  buttonVariant?: 'primary' | 'outline' | 'secondary';
  placement?: 'bottom' | 'bottom-end' | 'bottom-start';
}

export const DownloadDefaultSkillsPopover = ({
  buttonVariant = 'outline',
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
          size="md"
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
            <PMVStack gap={2} align={'stretch'}>
              <PMText variant="small" color="secondary" mb={4}>
                Extract the zip file at the root of your repository to add
                Packmind skills to your project.
              </PMText>
              <PMText variant="small" color="secondary" mb={4}>
                These skills help you manage your Packmind playbook, including
                creating standards and skills.
              </PMText>
              <PMVStack gap={0} align={'flex-start'}>
                <PMText variant="body" fontWeight="medium" mb={2}>
                  Download for
                </PMText>
                <PMHStack gap={2} align="stretch">
                  <PMButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadSkillsForAgent('claude')}
                    loading={downloadingAgent === 'claude'}
                    disabled={downloadingAgent !== null}
                  >
                    <PMIcon as={RiClaudeLine} />
                    Claude
                  </PMButton>
                  <PMButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadSkillsForAgent('copilot')}
                    loading={downloadingAgent === 'copilot'}
                    disabled={downloadingAgent !== null}
                  >
                    <PMIcon as={VscVscode} />
                    Copilot
                  </PMButton>
                  <PMButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadSkillsForAgent('cursor')}
                    loading={downloadingAgent === 'cursor'}
                    disabled={downloadingAgent !== null}
                  >
                    <PMIcon as={CursorIcon} />
                    Cursor
                  </PMButton>
                </PMHStack>
              </PMVStack>
            </PMVStack>
          </PMPopover.Body>
        </PMPopover.Content>
      </PMPopover.Positioner>
    </PMPopover.Root>
  );
};
