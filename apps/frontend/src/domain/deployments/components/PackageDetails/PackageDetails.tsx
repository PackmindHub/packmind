import React, { useMemo } from 'react';
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
  PMButton,
  PMAlertDialog,
  PMMarkdownViewer,
  PMDataList,
  PMTabs,
  PMEmptyState,
  isFeatureFlagEnabled,
  DEFAULT_FEATURE_DOMAIN_MAP,
  MANAGE_SKILLS_FEATURE_KEY,
} from '@packmind/ui';
import { Link, useNavigate } from 'react-router';
import {
  useGetPackageByIdQuery,
  useDeletePackagesBatchMutation,
  useListPackageDeploymentsQuery,
} from '../../api/queries/DeploymentsQueries';
import { AutobreadCrumb } from '../../../../shared/components/navigation/AutobreadCrumb';
import { PackageId } from '@packmind/types';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { routes } from '../../../../shared/utils/routes';
import { useGetRecipesQuery } from '../../../recipes/api/queries/RecipesQueries';
import { useGetStandardsQuery } from '../../../standards/api/queries/StandardsQueries';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';
import { useGetSkillsQuery } from '../../../skills/api/queries/SkillsQueries';
import { PACKAGE_MESSAGES } from '../../constants/messages';
import { DeployPackageButton } from '../PackageDeployments/DeployPackageButton';
import { RemovePackageFromTargetsButton } from '../RemovePackageFromTargets';
import { PackageDistributionList } from '../PackageDistributionList';
import { CopiableTextField } from '../../../../shared/components/inputs/CopiableTextField';
import { useState } from 'react';

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
  const navigate = useNavigate();
  const { organization, user } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const showSkillsSelection = isFeatureFlagEnabled({
    featureDomainMap: DEFAULT_FEATURE_DOMAIN_MAP,
    featureKeys: [MANAGE_SKILLS_FEATURE_KEY],
    userEmail: user?.email,
  });

  const {
    data: packageResponse,
    isLoading,
    isError,
    error,
  } = useGetPackageByIdQuery(id, spaceId, organization?.id);

  const { data: recipesResponse } = useGetRecipesQuery();

  const { data: standardsResponse } = useGetStandardsQuery();

  const { data: skillsResponse } = useGetSkillsQuery();

  const { data: deployments = [], isLoading: isLoadingDeployments } =
    useListPackageDeploymentsQuery(id);

  const { data: providersResponse } = useGetGitProvidersQuery();
  const hasGitProviderWithToken =
    providersResponse?.providers?.some((p) => p.hasToken) ?? false;

  const deletePackageMutation = useDeletePackagesBatchMutation();

  const pkg = packageResponse?.package;
  const recipeIds = useMemo(() => pkg?.recipes || [], [pkg?.recipes]);
  const standardIds = useMemo(() => pkg?.standards || [], [pkg?.standards]);
  const skillIds = useMemo(() => pkg?.skills || [], [pkg?.skills]);
  const allRecipes = (recipesResponse || []).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const allStandards = (standardsResponse?.standards || []).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const allSkills = (skillsResponse || []).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const handleEdit = () => {
    navigate(routes.space.toPackageEdit(orgSlug, spaceSlug, id));
  };

  const handleDelete = async () => {
    if (!spaceId || !organization?.id) {
      return;
    }

    try {
      await deletePackageMutation.mutateAsync({
        packageIds: [id],
        spaceId,
        organizationId: organization.id,
      });
      navigate(routes.space.toPackages(orgSlug, spaceSlug));
    } catch (err) {
      console.error('Failed to delete package:', err);
    }
  };

  const recipeTableData: PMTableRow[] = React.useMemo(() => {
    const rows: PMTableRow[] = [];
    for (const recipeId of recipeIds) {
      const recipe = allRecipes.find((r) => r.id === recipeId);
      if (recipe) {
        rows.push({
          key: recipeId,
          name: (
            <PMLink asChild>
              <Link to={routes.space.toCommand(orgSlug, spaceSlug, recipeId)}>
                {recipe.name}
              </Link>
            </PMLink>
          ),
          sortName: recipe.name,
        });
      }
    }
    return rows.sort((a, b) =>
      (a.sortName as string).localeCompare(b.sortName as string),
    );
  }, [recipeIds, allRecipes, orgSlug, spaceSlug]);

  const standardTableData: PMTableRow[] = React.useMemo(() => {
    const rows: PMTableRow[] = [];
    for (const standardId of standardIds) {
      const standard = allStandards.find((s) => s.id === standardId);
      if (standard) {
        rows.push({
          key: standardId,
          name: (
            <PMLink asChild>
              <Link
                to={routes.space.toStandard(orgSlug, spaceSlug, standardId)}
              >
                {standard.name}
              </Link>
            </PMLink>
          ),
          sortName: standard.name,
        });
      }
    }
    return rows.sort((a, b) =>
      (a.sortName as string).localeCompare(b.sortName as string),
    );
  }, [standardIds, allStandards, orgSlug, spaceSlug]);

  const skillTableData: PMTableRow[] = React.useMemo(() => {
    const rows: PMTableRow[] = [];
    for (const skillId of skillIds) {
      const skill = allSkills.find((s) => s.id === skillId);
      if (skill) {
        rows.push({
          key: skillId,
          name: <PMText>{skill.name}</PMText>,
          sortName: skill.name,
        });
      }
    }
    return rows.sort((a, b) =>
      (a.sortName as string).localeCompare(b.sortName as string),
    );
  }, [skillIds, allSkills]);

  const recipeColumns: PMTableColumn[] = React.useMemo(
    () => [{ key: 'name', header: 'Name', grow: true }],
    [],
  );

  const standardColumns: PMTableColumn[] = React.useMemo(
    () => [{ key: 'name', header: 'Name', grow: true }],
    [],
  );

  const skillColumns: PMTableColumn[] = React.useMemo(
    () => [{ key: 'name', header: 'Name', grow: true }],
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

  const recipeCount = recipeTableData.length;
  const standardCount = standardTableData.length;
  const skillCount = skillTableData.length;
  const isPackageEmpty =
    recipeCount === 0 &&
    standardCount === 0 &&
    (!showSkillsSelection || skillCount === 0);

  const pullCommand = `packmind-cli pull ${pkg.slug}`;

  return (
    <PMPage
      title={pkg.name}
      breadcrumbComponent={<AutobreadCrumb />}
      isFullWidth
      actions={
        <PMHStack gap={3}>
          {hasGitProviderWithToken && (
            <DeployPackageButton
              label="Distribute"
              size="md"
              selectedPackages={[pkg]}
            />
          )}
          <RemovePackageFromTargetsButton
            selectedPackage={pkg}
            distributions={deployments}
            distributionsLoading={isLoadingDeployments}
            size="md"
          />
          <PMButton variant="tertiary" onClick={handleEdit}>
            Edit
          </PMButton>
          <PMAlertDialog
            trigger={
              <PMButton variant="tertiary" colorPalette="red">
                Delete
              </PMButton>
            }
            title="Delete Package"
            message={PACKAGE_MESSAGES.confirmation.deletePackage(pkg.name)}
            confirmText="Delete"
            cancelText="Cancel"
            confirmColorScheme="red"
            onConfirm={handleDelete}
            open={deleteDialogOpen}
            onOpenChange={({ open }) => setDeleteDialogOpen(open)}
            isLoading={deletePackageMutation.isPending}
          />
        </PMHStack>
      }
    >
      <PMTabs
        defaultValue="content"
        tabs={[
          {
            value: 'content',
            triggerLabel: 'Content',
            content: (
              <PMVStack align="stretch" gap="6" pt={4}>
                <PMHStack gap={8} align="center" justifyContent="space-between">
                  <PMDataList
                    size="md"
                    orientation="horizontal"
                    items={[
                      {
                        label: 'Slug',
                        value: <PMText>{pkg.slug}</PMText>,
                      },
                    ]}
                  />
                  <PMHStack
                    gap={2}
                    align="center"
                    flexGrow={1}
                    justifyContent="flex-end"
                  >
                    <PMText variant="small" color="primary" fontWeight="medium">
                      Install package
                    </PMText>
                    <CopiableTextField
                      value={pullCommand}
                      readOnly
                      width="auto"
                    />
                  </PMHStack>
                </PMHStack>
                {pkg.description && (
                  <PMBox>
                    <PMMarkdownViewer content={pkg.description} />
                  </PMBox>
                )}

                {isPackageEmpty ? (
                  <PMEmptyState
                    backgroundColor={'background.primary'}
                    borderRadius={'md'}
                    width={'2xl'}
                    mx={'auto'}
                    mt={8}
                    title={'This package is empty'}
                    description={
                      showSkillsSelection
                        ? 'Add commands, standards, and skills to this package to distribute them to your repositories'
                        : 'Add commands and standards to this package to distribute them to your repositories'
                    }
                  >
                    <PMHStack>
                      <PMButton variant="secondary" onClick={handleEdit}>
                        Edit Package
                      </PMButton>
                    </PMHStack>
                  </PMEmptyState>
                ) : (
                  <PMHStack align="flex-start" gap={6} width="full">
                    {standardCount > 0 && (
                      <PMBox flex={1} width="full">
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

                    {recipeCount > 0 && (
                      <PMBox flex={1} width="full">
                        <PMHeading size="lg" mb={4}>
                          Commands ({recipeCount})
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

                    {showSkillsSelection && skillCount > 0 && (
                      <PMBox flex={1} width="full">
                        <PMHeading size="lg" mb={4}>
                          Skills ({skillCount})
                        </PMHeading>
                        <PMTable
                          columns={skillColumns}
                          data={skillTableData}
                          striped={true}
                          hoverable={true}
                          variant="line"
                        />
                      </PMBox>
                    )}
                  </PMHStack>
                )}
              </PMVStack>
            ),
          },
          {
            value: 'distributions',
            triggerLabel: 'Distributions',
            content: (
              <PMBox pt={4}>
                <PackageDistributionList packageId={id} />
              </PMBox>
            ),
          },
        ]}
      />
    </PMPage>
  );
};
