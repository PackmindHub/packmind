import { NavLink } from 'react-router';
import { PMPage } from '@packmind/ui';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { PMVStack } from '@packmind/ui';
import { CreateStandard } from '../../src/domain/standards/components/CreateStandard';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string } }) => {
    return (
      <NavLink to={`/org/${params.orgSlug}/standards/create`}>
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
