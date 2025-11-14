import React from 'react';
import {
  PMPage,
  PMText,
  PMBox,
  PMVStack,
  PMAlert,
  PMSpinner,
  PMHeading,
  PMHStack,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMLink,
} from '@packmind/ui';
import { Link } from 'react-router';
import { useGetPackageByIdQuery } from '../../api/queries/DeploymentsQueries';
import { AutobreadCrumb } from '../../../../shared/components/navigation/AutobreadCrumb';
import { PackageId, Recipe, Standard } from '@packmind/types';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { routes } from '../../../../shared/utils/routes';

type PackageWithDetails = {
  id: PackageId;
  name: string;
  slug: string;
  description: string;
  recipes?: Recipe[] | string[];
  standards?: Standard[] | string[];
};

interface PackageDetailsProps {
  id: PackageId;
  orgSlug: string;
  spaceSlug: string;
}

export const PackageDetails = ({
  id,
  orgSlug,
  spaceSlug,
}: PackageDetailsProps) => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  const {
    data: packageResponse,
    isLoading,
    isError,
    error,
  } = useGetPackageByIdQuery(id, spaceId, organization?.id);

  const pkg = packageResponse?.package as PackageWithDetails | undefined;
  const recipes = pkg?.recipes || [];
  const standards = pkg?.standards || [];

  const recipeTableData: PMTableRow[] = React.useMemo(
    () =>
      recipes.map((recipe) => {
        const recipeData = typeof recipe === 'string' ? { id: recipe } : recipe;
        const recipeName =
          typeof recipe === 'string' ? recipe : (recipe as Recipe).name;
        return {
          key: recipeData.id,
          name: (
            <PMLink asChild>
              <Link
                to={routes.space.toRecipe(orgSlug, spaceSlug, recipeData.id)}
              >
                {recipeName}
              </Link>
            </PMLink>
          ),
        };
      }),
    [recipes, orgSlug, spaceSlug],
  );

  const standardTableData: PMTableRow[] = React.useMemo(
    () =>
      standards.map((standard) => {
        const standardData =
          typeof standard === 'string' ? { id: standard } : standard;
        const standardName =
          typeof standard === 'string' ? standard : (standard as Standard).name;
        return {
          key: standardData.id,
          name: (
            <PMLink asChild>
              <Link
                to={routes.space.toStandard(
                  orgSlug,
                  spaceSlug,
                  standardData.id,
                )}
              >
                {standardName}
              </Link>
            </PMLink>
          ),
        };
      }),
    [standards, orgSlug, spaceSlug],
  );

  const recipeColumns: PMTableColumn[] = React.useMemo(
    () => [{ key: 'name', header: 'Recipe Name', grow: true }],
    [],
  );

  const standardColumns: PMTableColumn[] = React.useMemo(
    () => [{ key: 'name', header: 'Standard Name', grow: true }],
    [],
  );

  if (isLoading) {
    return (
      <PMPage
        title="Loading Package..."
        subtitle="Please wait while we fetch the package details"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMBox
          display="flex"
          alignItems="center"
          justifyContent="center"
          minH="200px"
        >
          <PMSpinner size="lg" mr={2} />
          <PMText ml={2}>Loading package details...</PMText>
        </PMBox>
      </PMPage>
    );
  }

  if (isError) {
    return (
      <PMPage
        title="Error Loading Package"
        subtitle="Sorry, we couldn't load the package details"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMAlert.Root status="error" width="lg" mb={4}>
          <PMAlert.Indicator />
          <PMAlert.Title>There was an error loading the package.</PMAlert.Title>
          {error && <PMText color="error">Error: {String(error)}</PMText>}
        </PMAlert.Root>
      </PMPage>
    );
  }

  if (!pkg) {
    return (
      <PMPage
        title="Package Not Found"
        subtitle="The package you're looking for doesn't exist"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMBox>
          <PMText>This package could not be found.</PMText>
        </PMBox>
      </PMPage>
    );
  }

  const recipeCount = recipes.length;
  const standardCount = standards.length;

  return (
    <PMPage
      title={pkg.name}
      subtitle={pkg.description}
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack align="stretch" gap="6">
        <PMBox>
          <PMVStack align="stretch" gap="2">
            <PMHStack gap="4">
              <PMText fontWeight="semibold">Slug:</PMText>
              <PMText>{pkg.slug}</PMText>
            </PMHStack>
            <PMHStack gap="4">
              <PMText fontWeight="semibold">Recipes:</PMText>
              <PMText>{recipeCount}</PMText>
            </PMHStack>
            <PMHStack gap="4">
              <PMText fontWeight="semibold">Standards:</PMText>
              <PMText>{standardCount}</PMText>
            </PMHStack>
          </PMVStack>
        </PMBox>

        {recipeCount > 0 && (
          <PMBox>
            <PMHeading size="lg" mb={4}>
              Recipes ({recipeCount})
            </PMHeading>
            <PMTable
              columns={recipeColumns}
              data={recipeTableData}
              striped={true}
              hoverable={true}
              variant="line"
            />
          </PMBox>
        )}

        {standardCount > 0 && (
          <PMBox>
            <PMHeading size="lg" mb={4}>
              Standards ({standardCount})
            </PMHeading>
            <PMTable
              columns={standardColumns}
              data={standardTableData}
              striped={true}
              hoverable={true}
              variant="line"
            />
          </PMBox>
        )}
      </PMVStack>
    </PMPage>
  );
};
