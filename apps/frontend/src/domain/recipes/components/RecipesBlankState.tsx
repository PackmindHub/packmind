import { Link } from 'react-router';
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
import { GettingStartedLearnMoreDialog } from '../../organizations/components/dashboard/GettingStartedLearnMoreDialog';
import { GETTING_STARTED_CREATE_DIALOG } from '../../organizations/components/dashboard/GettingStartedWidget';
import { routes } from '../../../shared/utils/routes';
import { LuBot, LuPencilLine } from 'react-icons/lu';
import { RecipesExampleDialog } from './RecipesExampleDialog';

interface RecipesBlankStateProps {
  orgSlug: string;
  spaceSlug: string;
}

export const RecipesBlankState = ({
  orgSlug,
  spaceSlug,
}: RecipesBlankStateProps) => {
  return (
    <PMBox
      borderRadius={'md'}
      backgroundColor={'background.primary'}
      p={8}
      border="solid 1px"
      borderColor={'border.tertiary'}
    >
      <PMHeading level="h2">
        No commands yet. Let’s create your first one.
      </PMHeading>
      <PMText as="p" fontWeight={'medium'} color="secondary">
        Commands are reusable prompts that help you speed up recurring dev tasks
        — like creating a new React component or setting up tests — with
        consistent results across your team.
      </PMText>
      <RecipesExampleDialog />

      <PMVStack alignItems={'flex-start'} width={'full'} mt={8}>
        <PMGrid gridTemplateColumns={'repeat(2, 1fr)'} gap={4} width={'full'}>
          {/* Generate from your code */}
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
                  </PMIcon>{' '}
                  <PMHeading
                    level="h5"
                    fontWeight={'bold'}
                    alignItems={'center'}
                  >
                    Create from your code
                  </PMHeading>
                </PMHStack>
                <PMBox fontSize={'sm'} color={'text.secondary'}>
                  Let your agent generate commands from your codebase
                </PMBox>
              </PMBox>
              <GettingStartedLearnMoreDialog
                body={GETTING_STARTED_CREATE_DIALOG.body}
                title={GETTING_STARTED_CREATE_DIALOG.title}
                buttonLabel="Configure my agent"
                buttonVariant="tertiary"
                buttonMarginTop={'auto'}
              />
            </PMBox>
          </PMGridItem>

          {/* Create manually */}
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
                  <PMIcon color={'beige.200'} size={'lg'}>
                    <LuPencilLine />
                  </PMIcon>
                  <PMHeading level="h5" fontWeight={'bold'}>
                    Create manually
                  </PMHeading>
                </PMHStack>
                <PMBox fontSize={'sm'} color={'text.secondary'}>
                  Build a custom command manually
                </PMBox>
              </PMBox>
              <PMButton
                variant="tertiary"
                asChild
                w="fit-content"
                size={'xs'}
                marginTop="auto"
              >
                <Link to={routes.space.toCreateCommand(orgSlug, spaceSlug)}>
                  Create
                </Link>
              </PMButton>
            </PMBox>
          </PMGridItem>
        </PMGrid>
      </PMVStack>
    </PMBox>
  );
};
