import {
  PMBox,
  PMButton,
  PMHeading,
  PMHStack,
  PMIcon,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuBot, LuBook } from 'react-icons/lu';
import { GettingStartedLearnMoreDialog } from '../../organizations/components/dashboard/GettingStartedLearnMoreDialog';
import { SkillsLearnMoreContent } from './SkillsLearnMoreContent';

interface SkillsBlankStateProps {
  spaceSlug?: string;
}

export const SkillsBlankState = ({ spaceSlug }: SkillsBlankStateProps) => {
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

      <PMHStack mt={4} gap={2}>
        <PMButton variant="secondary" size={'xs'} asChild w="fit-content">
          <a
            href="https://github.com/ComposioHQ/awesome-claude-skills/tree/master"
            target="_blank"
            rel="noopener noreferrer"
          >
            <PMIcon>
              <LuBook />
            </PMIcon>
            Example: awesome-claude-skills
          </a>
        </PMButton>
      </PMHStack>

      <PMVStack alignItems={'flex-start'} width={'full'} mt={8}>
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
          width={'fit-content'}
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
      </PMVStack>
    </PMBox>
  );
};
