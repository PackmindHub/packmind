import React from 'react';
import { Link } from 'react-router';
import {
  PMBox,
  PMLink,
  PMButton,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMEmptyState,
  PMHStack,
} from '@packmind/ui';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useListPackagesBySpaceQuery } from '../../api/queries/DeploymentsQueries';
import { routes } from '../../../../shared/utils/routes';

export interface PackagesPageProps {
  spaceSlug: string;
  orgSlug: string;
}

export const PackagesPage: React.FC<PackagesPageProps> = ({
  spaceSlug,
  orgSlug,
}) => {
  const { spaceId, space, isLoading: isLoadingSpace } = useCurrentSpace();
  const organizationId = space?.organizationId;

  const {
    data: packagesResponse,
    isLoading: isLoadingPackages,
    isError,
  } = useListPackagesBySpaceQuery(spaceId, organizationId);

  const [tableData, setTableData] = React.useState<PMTableRow[]>([]);

  React.useEffect(() => {
    if (!packagesResponse) return;

    setTableData(
      packagesResponse.packages.map((pkg) => ({
        key: pkg.id,
        name: (
          <PMLink asChild>
            <Link to={routes.space.toPackage(orgSlug, spaceSlug, pkg.id)}>
              {pkg.name}
            </Link>
          </PMLink>
        ),
        description: <>{pkg.description || '-'}</>,
        recipes: <>{pkg.recipes?.length || 0}</>,
        standards: <>{pkg.standards?.length || 0}</>,
      })),
    );
  }, [packagesResponse, orgSlug, spaceSlug]);

  const columns: PMTableColumn[] = [
    { key: 'name', header: 'Name', width: '250px' },
    { key: 'description', header: 'Description', grow: true },
    { key: 'recipes', header: 'Recipes', width: '100px', align: 'center' },
    { key: 'standards', header: 'Standards', width: '100px', align: 'center' },
  ];

  const isLoading = isLoadingSpace || isLoadingPackages;

  return (
    <>
      {isLoading && <p>Loading...</p>}
      {isError && <p>Error loading packages.</p>}
      {(packagesResponse?.packages ?? []).length ? (
        <PMBox>
          <PMTable
            columns={columns}
            data={tableData}
            striped={true}
            hoverable={true}
            size="md"
            variant="line"
          />
        </PMBox>
      ) : (
        <PMEmptyState
          backgroundColor={'background.primary'}
          borderRadius={'md'}
          width={'2xl'}
          mx={'auto'}
          title={'No packages yet'}
        >
          Packages are collections of standards and recipes that can be deployed
          together to your repositories, ensuring consistent practices across
          your projects.
          <PMHStack>
            <Link to={routes.space.toCreatePackage(orgSlug, spaceSlug)}>
              <PMButton variant="secondary">Create Package</PMButton>
            </Link>
          </PMHStack>
        </PMEmptyState>
      )}
    </>
  );
};
