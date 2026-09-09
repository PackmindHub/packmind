import type { LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import { PMPage } from '@packmind/ui';
import { queryClient } from '../../src/shared/data/queryClient';
import { ensureOrgContext } from '../../src/shared/data/ensureOrgContext';
import { getSpacesQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { SpacesManagementPage } from '../../src/domain/spaces/components/SpacesManagementPage';
import { SpacesToolbar } from '../../src/domain/spaces/components/SpacesManagementPage/SpacesToolbar';

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const me = await ensureOrgContext(params.orgSlug!);
  try {
    const spaces = await queryClient.ensureQueryData(
      getSpacesQueryOptions(me.organization.id),
    );
    return { spaceCount: spaces.length };
  } catch {
    return { spaceCount: null };
  }
}

export default function SettingsSpacesRouteModule() {
  const { organization } = useAuthContext();
  const { spaceCount } = useLoaderData<typeof clientLoader>();

  if (!organization) {
    return null;
  }

  const subtitle =
    spaceCount === null
      ? 'Manage every space in your organization'
      : `Manage every space in your organization · ${spaceCount} ${
          spaceCount === 1 ? 'space' : 'spaces'
        }`;

  return (
    <PMPage title="Spaces" subtitle={subtitle} actions={<SpacesToolbar />}>
      <SpacesManagementPage />
    </PMPage>
  );
}
