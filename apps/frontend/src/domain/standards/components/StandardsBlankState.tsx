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
import { LuBot, LuLibrary, LuPencilLine } from 'react-icons/lu';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';

interface StandardsBlankStateProps {
  orgSlug: string;
  spaceSlug: string;
  onBrowseTemplatesClick: () => void;
}

export const StandardsBlankState = ({
  orgSlug,
  spaceSlug,
  onBrowseTemplatesClick,
}: StandardsBlankStateProps) => {
  const analytics = useAnalytics();

  return (
    <PMBox
      borderRadius={'md'}
      backgroundColor={'background.primary'}
      p={8}
      border="solid 1px"
      borderColor={'border.tertiary'}
    >
      <PMHeading level="h2">
        No standards yet. Let's create your first one.
      </PMHeading>
      <PMText as="p" fontWeight={'medium'} color="secondary">
        Create reusable coding guidelines that Packmind can render as
        instructions files for Claude Code, Github Copilot, Cursor...
      </PMText>

      <PMVStack alignItems={'flex-start'} width={'full'} mt={8}>
        <PMGrid gridTemplateColumns={'repeat(3, 1fr)'} gap={4} width={'full'}>
          {/* Start with a template */}
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
                  <PMIcon color={'yellow.200'} size={'lg'}>
                    <LuLibrary />
                  </PMIcon>
                  <PMHeading level="h5" fontWeight={'bold'}>
                    Start with a sample
                  </PMHeading>
                </PMHStack>
                <PMBox fontSize={'sm'} color={'text.secondary'}>
                  Get started instantly with proven standards for common stacks
                </PMBox>
              </PMBox>
              <PMButton
                variant="primary"
                size={'xs'}
                onClick={() => {
                  analytics.track('create_standard_from_samples_clicked', {});
                  onBrowseTemplatesClick();
                }}
                marginTop={'auto'}
              >
                Browse samples
              </PMButton>
            </PMBox>
          </PMGridItem>

          <PMGridItem colSpan={3} mt={6}>
            <PMHeading level="h5" fontWeight={'medium'}>
              Other ways to create standards
            </PMHeading>
          </PMGridItem>

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
                    Generate from your code{' '}
                  </PMHeading>
                </PMHStack>
                <PMBox fontSize={'sm'} color={'text.secondary'}>
                  Let your agent create standards from your codebase
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

          {/* Create from scratch */}
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
                    Create from scratch
                  </PMHeading>
                </PMHStack>
                <PMBox fontSize={'sm'} color={'text.secondary'}>
                  Build a custom standard manually
                </PMBox>
              </PMBox>
              <PMButton
                variant="tertiary"
                asChild
                w="fit-content"
                size={'xs'}
                marginTop="auto"
              >
                <Link to={routes.space.toCreateStandard(orgSlug, spaceSlug)}>
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
