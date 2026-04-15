import {
  PMBox,
  PMButton,
  PMGrid,
  PMGridItem,
  PMHeading,
  PMHStack,
  PMIcon,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  LuBot,
  LuBook,
  LuUpload,
  LuExternalLink,
  LuPlug,
} from 'react-icons/lu';
import { useNavigate } from 'react-router';
import { GettingStartedLearnMoreDialog } from '../../organizations/components/dashboard/GettingStartedLearnMoreDialog';
import { SkillsLearnMoreContent } from './SkillsLearnMoreContent';
import { SkillsImportContent } from './SkillsImportContent';
import { SkillExampleDialog } from './SkillExampleDialog';
import { routes } from '../../../shared/utils/routes';

interface SkillsBlankStateProps {
  orgSlug: string;
  spaceSlug?: string;
}

export const SkillsBlankState = ({
  orgSlug,
  spaceSlug,
}: SkillsBlankStateProps) => {
  const navigate = useNavigate();
  return (
    <PMBox
      borderRadius={'md'}
      backgroundColor={'background.primary'}
      p={8}
      border="solid 1px"
      borderColor={'border.tertiary'}
    >
      <PMHeading level="h2">
        No skills yet. Let's create your first one.
      </PMHeading>
      <PMText as="p" fontWeight={'medium'} color="secondary">
        Skills enable your AI assistant to handle specialized tasks
        independently. Perfect for complex workflows, domain-specific knowledge,
        or multi-step processes that require structured expertise.
      </PMText>
      <SkillExampleDialog />

      <PMVStack alignItems={'flex-start'} width={'full'} mt={8}>
        <PMGrid gridTemplateColumns={'repeat(3, 1fr)'} gap={4} width={'full'}>
          {/* Browse use cases */}
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
              borderColor={'blue.800'}
            >
              <PMBox>
                <PMHStack mb={2}>
                  <PMIcon color={'green.200'} size={'lg'}>
                    <LuPlug />
                  </PMIcon>
                  <PMHeading level="h5" fontWeight={'bold'}>
                    Browse use cases
                  </PMHeading>
                </PMHStack>
                <PMBox fontSize={'sm'} color={'text.secondary'}>
                  Ready-made skills that mine knowledge from GitHub, Slack, Jira
                  and more
                </PMBox>
              </PMBox>
              <PMButton
                variant="primary"
                size={'xs'}
                onClick={() => navigate(routes.org.toSetupUseCases(orgSlug))}
                marginTop={'auto'}
              >
                Browse use cases
              </PMButton>
            </PMBox>
          </PMGridItem>

          <PMGridItem colSpan={3} mt={6}>
            <PMHeading level="h5" fontWeight={'medium'}>
              Other ways to create skills
            </PMHeading>
          </PMGridItem>

          {/* Create from the code */}
          <PMGridItem>
            <PMBox
              backgroundColor={'background.primary'}
              borderRadius={'md'}
              p={6}
              display={'flex'}
              flexDirection={'column'}
              gap={4}
              height={'full'}
              border={'solid 1px'}
              borderColor={'border.tertiary'}
            >
              <PMBox>
                <PMHStack mb={2}>
                  <PMIcon color={'branding.primary'} size={'lg'}>
                    <LuBot />
                  </PMIcon>
                  <PMHeading level="h5" fontWeight={'bold'}>
                    Create from the code
                  </PMHeading>
                </PMHStack>
                <PMBox fontSize={'sm'} color={'text.secondary'}>
                  Let your agent create skills from your codebase
                </PMBox>
              </PMBox>
              {spaceSlug && (
                <GettingStartedLearnMoreDialog
                  body={<SkillsLearnMoreContent />}
                  title="How to create skills"
                  buttonLabel="Create"
                  buttonVariant="tertiary"
                  buttonMarginTop={'auto'}
                />
              )}
            </PMBox>
          </PMGridItem>

          {/* Import your skills */}
          <PMGridItem>
            <PMBox
              backgroundColor={'background.primary'}
              borderRadius={'md'}
              p={6}
              display={'flex'}
              flexDirection={'column'}
              gap={4}
              height={'full'}
              border={'solid 1px'}
              borderColor={'border.tertiary'}
            >
              <PMBox>
                <PMHStack mb={2}>
                  <PMIcon color={'yellow.100'} size={'lg'}>
                    <LuUpload />
                  </PMIcon>
                  <PMHeading level="h5" fontWeight={'bold'}>
                    Import your skills
                  </PMHeading>
                </PMHStack>
                <PMBox fontSize={'sm'} color={'text.secondary'}>
                  Import skills into your project via CLI
                </PMBox>
              </PMBox>
              {spaceSlug && (
                <GettingStartedLearnMoreDialog
                  body={<SkillsImportContent />}
                  title="How to import skills"
                  buttonLabel="Import"
                  buttonVariant="tertiary"
                  buttonMarginTop={'auto'}
                />
              )}
            </PMBox>
          </PMGridItem>
        </PMGrid>
      </PMVStack>
    </PMBox>
  );
};
