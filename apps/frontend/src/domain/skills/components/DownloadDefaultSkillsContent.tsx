import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMSeparator,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { CodingAgent } from '@packmind/types';
import { RiClaudeLine } from 'react-icons/ri';
import { VscVscode } from 'react-icons/vsc';
import { CursorIcon } from '@packmind/assets/icons/CursorIcon';
import { CopiableTextField } from '../../../shared/components/inputs/CopiableTextField';

interface IDownloadDefaultSkillsContentProps {
  downloadingAgent: CodingAgent | null;
  onDownload: (agent: CodingAgent) => void;
}

export const DownloadDefaultSkillsContent = ({
  downloadingAgent,
  onDownload,
}: IDownloadDefaultSkillsContentProps) => {
  return (
    <PMVStack gap={6} align={'stretch'}>
      <PMVStack
        gap={2}
        align={'flex-start'}
        borderWidth={1}
        borderColor="border"
        borderRadius="md"
        backgroundColor="secondary"
      >
        <PMText variant="small-important" fontWeight="medium">
          Via CLI
        </PMText>
        <PMText color="secondary" as="p" variant="small">
          Use the Packmind CLI to initialize default skills directly:
        </PMText>
        <PMBox w="full">
          <CopiableTextField
            value="packmind-cli skills init"
            readOnly
            fontFamily="mono"
            fontSize="sm"
            placeholder=""
            size={'xs'}
          />
        </PMBox>
      </PMVStack>

      <PMHStack>
        <PMSeparator flex="1" borderColor="border.tertiary" />
        <PMText flexShrink="0" variant="small-important">
          Or
        </PMText>
        <PMSeparator flex="1" borderColor="border.tertiary" />
      </PMHStack>
      <PMVStack gap={2} align={'flex-start'}>
        <PMText variant="small-important" fontWeight="medium">
          Download for AI assistant
        </PMText>
        <PMText color="secondary" as="p" variant="small">
          Extract the zip file at the root of your repository to add Packmind
          skills to your project. These skills help you manage your Packmind
          playbook, including creating standards and skills.
        </PMText>
        <PMHStack gap={2} align="stretch" mt={2}>
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
