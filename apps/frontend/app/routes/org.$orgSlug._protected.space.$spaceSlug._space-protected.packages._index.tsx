import { useParams, Link } from 'react-router';
import { PMPage, PMVStack, PMButton } from '@packmind/ui';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { PackagesPage } from '../../src/domain/deployments/components/PackagesPage';
import { routes } from '../../src/shared/utils/routes';
import { useState } from 'react';

export default function PackagesRouteModule() {
  const { spaceSlug, orgSlug } = useParams() as {
    spaceSlug: string;
    orgSlug: string;
  };
  const [isEmpty, setIsEmpty] = useState(false);

  return (
    <PMPage
      title="Packages"
      subtitle="Organize and distribute your playbook artifacts across your repositories."
      actions={
        !isEmpty && (
          <Link to={routes.space.toCreatePackage(orgSlug, spaceSlug)}>
            <PMButton>Create</PMButton>
          </Link>
        )
      }
    >
      <PMVStack align="stretch" gap={6}>
        <PackagesPage
          spaceSlug={spaceSlug}
          orgSlug={orgSlug}
          onEmptyStateChange={setIsEmpty}
        />
      </PMVStack>
    </PMPage>
  );
}
