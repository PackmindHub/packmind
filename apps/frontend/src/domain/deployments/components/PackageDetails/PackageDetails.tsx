import React from 'react';
import {
  PMPage,
  PMText,
  PMPageSection,
  PMBox,
  PMVStack,
  PMAlert,
  PMSpinner,
  PMHeading,
  PMHStack,
} from '@packmind/ui';
import { useGetPackageByIdQuery } from '../../api/queries/DeploymentsQueries';
import { AutobreadCrumb } from '../../../../shared/components/navigation/AutobreadCrumb';
import { PackageId, Recipe, Standard } from '@packmind/types';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';

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

export const PackageDetails = ({ id }: PackageDetailsProps) => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  const {
    data: packageResponse,
    isLoading,
    isError,
    error,
  } = useGetPackageByIdQuery(id, spaceId, organization?.id);

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

  if (!packageResponse?.package) {
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

  const pkg = packageResponse.package as PackageWithDetails;

  const recipes = pkg.recipes || [];
  const standards = pkg.standards || [];

  const recipeCount = recipes.length;
  const standardCount = standards.length;

  return (
    <PMPage
      title={pkg.name}
      subtitle={pkg.description}
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack align="stretch" gap="6">
        <PMPageSection>
          <PMVStack align="stretch" gap="4">
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
          </PMVStack>
        </PMPageSection>

        {recipeCount > 0 && (
          <PMPageSection>
            <PMVStack align="stretch" gap="4">
              <PMHeading size="lg">Recipes</PMHeading>
              <PMBox>
                {recipes.map((recipe) => {
                  const recipeData =
                    typeof recipe === 'string' ? { id: recipe } : recipe;
                  return (
                    <PMBox
                      key={recipeData.id}
                      p="2"
                      borderBottomWidth="1px"
                      borderColor="border.default"
                    >
                      <PMText>
                        {typeof recipe === 'string'
                          ? recipe
                          : (recipe as Recipe).name}
                      </PMText>
                    </PMBox>
                  );
                })}
              </PMBox>
            </PMVStack>
          </PMPageSection>
        )}

        {standardCount > 0 && (
          <PMPageSection>
            <PMVStack align="stretch" gap="4">
              <PMHeading size="lg">Standards</PMHeading>
              <PMBox>
                {standards.map((standard) => {
                  const standardData =
                    typeof standard === 'string' ? { id: standard } : standard;
                  return (
                    <PMBox
                      key={standardData.id}
                      p="2"
                      borderBottomWidth="1px"
                      borderColor="border.default"
                    >
                      <PMText>
                        {typeof standard === 'string'
                          ? standard
                          : (standard as Standard).name}
                      </PMText>
                    </PMBox>
                  );
                })}
              </PMBox>
            </PMVStack>
          </PMPageSection>
        )}
      </PMVStack>
    </PMPage>
  );
};
