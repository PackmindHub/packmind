import { PMButton, PMHStack, PMIcon, PMText, PMVStack } from '@packmind/ui';
import { CodingAgent } from '@packmind/types';
import { RiClaudeLine } from 'react-icons/ri';
import { VscVscode } from 'react-icons/vsc';
import { CursorIcon } from '@packmind/assets/icons/CursorIcon';

interface IDownloadDefaultSkillsContentProps {
  downloadingAgent: CodingAgent | null;
  onDownload: (agent: CodingAgent) => void;
}

export const DownloadDefaultSkillsContent = ({
  downloadingAgent,
  onDownload,
}: IDownloadDefaultSkillsContentProps) => {
  return (
    <PMVStack gap={2} align={'stretch'}>
      <PMText color="secondary" as="p">
        Extract the zip file at the root of your repository to add Packmind
        skills to your project.
      </PMText>
      <PMText color="secondary" as="p">
        These skills help you manage your Packmind playbook, including creating
        standards and skills.
      </PMText>
      <PMVStack gap={0} align={'flex-start'} mt={4}>
        <PMText variant="body" fontWeight="medium" mb={2}>
          Download for
        </PMText>
        <PMHStack gap={2} align="stretch">
          <PMButton
            variant="outline"
            size="sm"
            onClick={() => onDownload('claude')}
            loading={downloadingAgent === 'claude'}
            disabled={downloadingAgent !== null}
          >
            <PMIcon as={RiClaudeLine} />
            Claude
          </PMButton>
          <PMButton
            variant="outline"
            size="sm"
            onClick={() => onDownload('copilot')}
            loading={downloadingAgent === 'copilot'}
            disabled={downloadingAgent !== null}
          >
            <PMIcon as={VscVscode} />
            Copilot
          </PMButton>
          <PMButton
            variant="outline"
            size="sm"
            onClick={() => onDownload('cursor')}
            loading={downloadingAgent === 'cursor'}
            disabled={downloadingAgent !== null}
          >
            <PMIcon as={CursorIcon} />
            Cursor
          </PMButton>
        </PMHStack>
      </PMVStack>
    </PMVStack>
  );
};
