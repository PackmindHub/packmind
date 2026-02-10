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
import { routes } from '../../../shared/utils/routes';
import { LuPackage } from 'react-icons/lu';

interface PackagesBlankStateProps {
  orgSlug: string;
  spaceSlug: string;
}

export const PackagesBlankState = ({
  orgSlug,
  spaceSlug,
}: PackagesBlankStateProps) => {
  return (
    <PMBox
      borderRadius={'md'}
      backgroundColor={'background.primary'}
      p={8}
      border="solid 1px"
      borderColor={'border.tertiary'}
    >
      <PMHeading level="h2">Bundle and spread your best practices.</PMHeading>
      <PMText as="p" fontWeight={'medium'} color="secondary">
        Packages are collections of standards, commands and skills that can be
        distributed together to your repositories, ensuring consistent practices
        across your projects.
      </PMText>

      <PMVStack alignItems={'flex-start'} width={'full'} mt={8}>
        <PMGrid gridTemplateColumns={'repeat(1, 1fr)'} gap={4} width={'full'}>
          {/* Create manually */}
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
              w={'fit-content'}
            >
              <PMBox>
                <PMHStack mb={2}>
                  <PMIcon color={'branding.primary'} size={'lg'}>
                    <LuPackage />
                  </PMIcon>
                  <PMHeading level="h5" fontWeight={'bold'}>
                    Create your first package
                  </PMHeading>
                </PMHStack>
                <PMBox fontSize={'sm'} color={'text.secondary'}>
                  Organize your standards, commands, and skills into packages
                  for easy distribution
                </PMBox>
              </PMBox>
              <PMButton
                variant="primary"
                asChild
                w="fit-content"
                size={'xs'}
                marginTop={'auto'}
              >
                <Link to={routes.space.toCreatePackage(orgSlug, spaceSlug)}>
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
