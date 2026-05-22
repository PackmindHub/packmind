import React from 'react';
import { PMPage, PMText, PMBox, PMAlert, PMSpinner } from '@packmind/ui';
import { useGetPackageByIdQuery } from '../../api/queries/DeploymentsQueries';
import { PackageId } from '@packmind/types';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useGetRecipesQuery } from '../../../recipes/api/queries/RecipesQueries';
import { useGetStandardsQuery } from '../../../standards/api/queries/StandardsQueries';
import { useGetSkillsQuery } from '../../../skills/api/queries/SkillsQueries';
import { PackageEditFormBody } from './PackageEditFormBody';

interface PackageEditFormProps {
  id: PackageId;
  orgSlug: string;
  spaceSlug: string;
}

export const PackageEditForm = ({
  id,
  orgSlug,
  spaceSlug,
}: PackageEditFormProps) => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  const {
    data: packageResponse,
    isLoading,
    isError,
    error,
  } = useGetPackageByIdQuery(id, spaceId, organization?.id);

  const { data: recipesResponse, isLoading: isLoadingRecipes } =
    useGetRecipesQuery();

  const { data: standardsResponse, isLoading: isLoadingStandards } =
    useGetStandardsQuery();

  const { data: skillsResponse, isLoading: isLoadingSkills } =
    useGetSkillsQuery();

  const pkg = packageResponse?.package;
  const allRecipes = (recipesResponse || []).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const allStandards = (standardsResponse?.standards || []).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const allSkills = (skillsResponse || []).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  if (isLoading) {
    return (
      <PMPage title="Edit Package" subtitle="Loading...">
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
      >
        <PMBox>
          <PMText>This package could not be found.</PMText>
        </PMBox>
      </PMPage>
    );
  }

  if (isLoadingRecipes || isLoadingStandards || isLoadingSkills) {
    return (
      <PMPage title="Edit Package" subtitle="Loading...">
        <PMBox
          display="flex"
          alignItems="center"
          justifyContent="center"
          minH="200px"
        >
          <PMSpinner size="lg" mr={2} />
          <PMText ml={2}>Loading commands and standards...</PMText>
        </PMBox>
      </PMPage>
    );
  }

  return (
    <PackageEditFormBody
      pkg={pkg}
      allRecipes={allRecipes}
      allStandards={allStandards}
      allSkills={allSkills}
      id={id}
      orgSlug={orgSlug}
      spaceSlug={spaceSlug}
    />
  );
};
