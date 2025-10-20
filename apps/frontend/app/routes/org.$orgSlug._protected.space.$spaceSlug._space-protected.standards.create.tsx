import { NavLink } from 'react-router';
import { PMPage } from '@packmind/ui';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { PMVStack } from '@packmind/ui';
import { CreateStandard } from '../../src/domain/standards/components/CreateStandard';
import { routes } from '../../src/shared/utils/routes';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string; spaceSlug: string } }) => {
    return (
      <NavLink
        to={routes.space.toCreateStandard(params.orgSlug, params.spaceSlug)}
      >
        Create standard
      </NavLink>
    );
  },
};

export default function CreateStandardRouteModule() {
  return (
    <PMPage
      title="Create Standard"
      subtitle="Create a new standard for your organization"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack align="stretch" gap={6}>
        <CreateStandard />
      </PMVStack>
    </PMPage>
  );
}
