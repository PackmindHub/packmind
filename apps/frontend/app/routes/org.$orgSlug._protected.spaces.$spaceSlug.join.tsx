import { redirect, useLoaderData, useNavigate, useParams } from 'react-router';
import { queryClient } from '../../src/shared/data/queryClient';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';
import {
  getBrowseSpacesQueryOptions,
  useJoinSpaceBySlugMutation,
} from '../../src/domain/spaces-management/api/queries/SpacesManagementQueries';
import { setFlashToast } from '../../src/shared/utils/flashToast';
import { routes } from '../../src/shared/utils/routes';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import {
  PMBox,
  PMButton,
  PMHeading,
  PMStatus,
  PMText,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import { getSpaceColorPalette } from '../../src/domain/organizations/components/sidebar/SpaceNavBlock';

// ─── CLIENT LOADER ───────────────────────────────────────────────────────
export async function clientLoader({
  params,
}: {
  params: { orgSlug: string; spaceSlug: string };
}) {
  const me = await queryClient.ensureQueryData(getMeQueryOptions());
  if (!me.organization) {
    throw redirect('/sign-in');
  }

  const browseData = await queryClient.fetchQuery(
    getBrowseSpacesQueryOptions(me.organization.id),
  );

  const spaceSlug = params.spaceSlug;

  // Already a member → redirect to space dashboard with toast
  const mySpace = browseData.mySpaces.find((s) => s.slug === spaceSlug);
  if (mySpace) {
    setFlashToast({
      type: 'info',
      title: 'Already a member',
      description: `You're already a member of ${mySpace.name}.`,
    });
    throw redirect(routes.space.toDashboard(params.orgSlug, mySpace.slug));
  }

  // Find in discoverable spaces
  const space = browseData.allSpaces.find((s) => s.slug === spaceSlug);

  return { space: space ?? null };
}

// ─── ROUTE COMPONENT ────────────────────────────────────────────────────
export default function JoinSpaceRouteModule() {
  const { space } = useLoaderData<typeof clientLoader>();
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();
  const { organization } = useAuthContext();
  const navigate = useNavigate();
  const joinMutation = useJoinSpaceBySlugMutation();

  if (!organization || !orgSlug || !spaceSlug) return null;

  if (!space) {
    return (
      <PMBox
        display="flex"
        justifyContent="center"
        alignItems="center"
        h="100%"
      >
        <PMVStack align="center" gap={4} maxW="md" textAlign="center">
          <PMHeading size="lg">Space not found</PMHeading>
          <PMText color="faded">
            This space doesn't exist or is not available to join.
          </PMText>
        </PMVStack>
      </PMBox>
    );
  }

  const handleJoin = () => {
    joinMutation.mutate(
      { spaceSlug },
      {
        onSuccess: () => {
          pmToaster.success({
            title: 'Joined!',
            description: `You've joined ${space.name}.`,
          });
          navigate(routes.org.toDashboard(orgSlug));
        },
        onError: () => {
          pmToaster.error({
            title: 'Failed to join',
            description: 'Something went wrong. Please try again.',
          });
        },
      },
    );
  };

  return (
    <PMBox display="flex" justifyContent="center" alignItems="center" h="100%">
      <PMVStack align="center" gap={6} maxW="sm" textAlign="center">
        <PMStatus.Root colorPalette={getSpaceColorPalette(space.name)}>
          <PMStatus.Indicator boxSize={4} />
        </PMStatus.Root>
        <PMVStack gap={2}>
          <PMHeading size="lg">{space.name}</PMHeading>
          <PMText color="faded">You've been invited to join this space.</PMText>
        </PMVStack>
        <PMButton
          onClick={handleJoin}
          loading={joinMutation.isPending}
          size="lg"
        >
          Join this space
        </PMButton>
      </PMVStack>
    </PMBox>
  );
}
