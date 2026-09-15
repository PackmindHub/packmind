import { useParams, Link, type LoaderFunctionArgs } from 'react-router';
import { PMPage, PMVStack, PMButton } from '@packmind/ui';
import { PackagesPage } from '../../src/domain/deployments/components/PackagesPage';
import { routes } from '../../src/shared/utils/routes';
import { useState } from 'react';
import { redirectToContextPackage } from '../../src/shared/data/redirectToContext';

/**
 * The packages list, which is a sidebar entry in the current navigation and
 * nothing at all in the plugin-first one. There the rail is the list, so this
 * address opens Context with no package named and the rail answers with its
 * first.
 */
export async function clientLoader(args: LoaderFunctionArgs) {
  return redirectToContextPackage(args);
}

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
