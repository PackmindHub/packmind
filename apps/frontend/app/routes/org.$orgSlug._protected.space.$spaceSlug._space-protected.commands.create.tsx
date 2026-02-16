import { NavLink } from 'react-router';
import { PMPage } from '@packmind/ui';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { PMVStack } from '@packmind/ui';
import { CreateCommand } from '../../src/domain/recipes/components/CreateCommand';
import { routes } from '../../src/shared/utils/routes';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string; spaceSlug: string } }) => {
    return (
      <NavLink
        to={routes.space.toCreateCommand(params.orgSlug, params.spaceSlug)}
      >
        Create command
      </NavLink>
    );
  },
};

export default function CreateCommandRouteModule() {
  return (
    <PMPage
      title="Create Command"
      subtitle="Create a new command for your organization"
    >
      <PMVStack align="stretch" gap={6}>
        <CreateCommand />
      </PMVStack>
    </PMPage>
  );
}
