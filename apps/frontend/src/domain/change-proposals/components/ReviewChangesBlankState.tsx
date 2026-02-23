import {
  PMAlert,
  PMBox,
  PMGrid,
  PMGridItem,
  PMHeading,
  PMHStack,
  PMIcon,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuTerminal } from 'react-icons/lu';
import { GettingStartedLearnMoreDialog } from '../../organizations/components/dashboard/GettingStartedLearnMoreDialog';
import { ReviewChangesLearnMoreContent } from './ReviewChangesLearnMoreContent';
import { CopiableTextField } from '../../../shared/components/inputs';

const DIFF_SUBMIT_COMMAND = 'packmind-cli diff --submit';

export const ReviewChangesBlankState = () => {
  return (
    <PMVStack gap={4} width="full">
      <PMAlert.Root status="info">
        <PMAlert.Indicator />
        <PMAlert.Content>
          <PMAlert.Description>
            Playbook update management will soon require an Enterprise plan.
          </PMAlert.Description>
        </PMAlert.Content>
      </PMAlert.Root>

      <PMBox
        borderRadius={'md'}
        backgroundColor={'background.primary'}
        p={8}
        border="solid 1px"
        borderColor={'border.tertiary'}
      >
        <PMHeading level="h2">No playbook updates to review.</PMHeading>
        <PMText as="p" fontWeight={'medium'} color="secondary">
          When your AI agents modify standards, commands, or skills locally, use
          the Packmind CLI to submit those changes as proposals. They will
          appear here for your team to review and approve.
        </PMText>

        <PMVStack alignItems={'flex-start'} width={'full'} mt={8}>
          <PMGrid gridTemplateColumns={'1fr'} gap={4} width={'full'}>
            <PMGridItem>
              <PMBox
                backgroundColor={'background.primary'}
                borderRadius={'md'}
                p={6}
                display={'flex'}
                flexDirection={'column'}
                gap={4}
                alignItems={'flex-start'}
                border={'solid 1px'}
                borderColor={'border.tertiary'}
              >
                <PMBox>
                  <PMHStack mb={2}>
                    <PMIcon color={'branding.primary'} size={'lg'}>
                      <LuTerminal />
                    </PMIcon>
                    <PMHeading level="h5" fontWeight={'bold'}>
                      Set up the CLI and submit changes
                    </PMHeading>
                  </PMHStack>
                  <PMBox fontSize={'sm'} color={'text.secondary'}>
                    Install the Packmind CLI and submit change proposals
                  </PMBox>
                </PMBox>
                <PMBox width="1/2">
                  <CopiableTextField
                    value={DIFF_SUBMIT_COMMAND}
                    readOnly
                    label="Terminal"
                  />
                </PMBox>
                <GettingStartedLearnMoreDialog
                  body={<ReviewChangesLearnMoreContent />}
                  title="How to submit change proposals"
                  buttonLabel="Get started"
                  buttonVariant="tertiary"
                  buttonMarginTop={'auto'}
                />
              </PMBox>
            </PMGridItem>
          </PMGrid>
        </PMVStack>
      </PMBox>
    </PMVStack>
  );
};
