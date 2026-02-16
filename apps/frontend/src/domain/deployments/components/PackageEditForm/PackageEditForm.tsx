import React, { useState, useEffect } from 'react';
import {
  PMPage,
  PMText,
  PMBox,
  PMVStack,
  PMAlert,
  PMSpinner,
  PMHeading,
  PMHStack,
  PMButton,
  PMField,
  PMFieldset,
  PMInput,
  pmToaster,
  PMCombobox,
  PMPortal,
  pmUseFilter,
  pmUseListCollection,
  PMBadge,
  PMCloseButton,
} from '@packmind/ui';
import { Link, useNavigate } from 'react-router';
import {
  useGetPackageByIdQuery,
  useUpdatePackageMutation,
} from '../../api/queries/DeploymentsQueries';
import {
  PackageId,
  Recipe,
  Standard,
  RecipeId,
  StandardId,
  Skill,
  SkillId,
} from '@packmind/types';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { routes } from '../../../../shared/utils/routes';
import { useGetRecipesQuery } from '../../../recipes/api/queries/RecipesQueries';
import { useGetStandardsQuery } from '../../../standards/api/queries/StandardsQueries';
import { useGetSkillsQuery } from '../../../skills/api/queries/SkillsQueries';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../../shared/components/editor/MarkdownEditor';

interface PackageEditFormProps {
  id: PackageId;
  orgSlug: string;
  spaceSlug: string;
}

interface PackageEditFormContentProps {
  allRecipes: Recipe[];
  allStandards: Standard[];
  allSkills: Skill[];
  selectedRecipeIds: RecipeId[];
  selectedStandardIds: StandardId[];
  selectedSkillIds: SkillId[];
  setSelectedRecipeIds: (ids: RecipeId[]) => void;
  setSelectedStandardIds: (ids: StandardId[]) => void;
  setSelectedSkillIds: (ids: SkillId[]) => void;
  isPending: boolean;
  isLoadingRecipes: boolean;
  isLoadingStandards: boolean;
  isLoadingSkills: boolean;
  orgSlug: string;
  spaceSlug: string;
}

const PackageEditFormContent = ({
  allRecipes,
  allStandards,
  allSkills,
  selectedRecipeIds,
  selectedStandardIds,
  selectedSkillIds,
  setSelectedRecipeIds,
  setSelectedStandardIds,
  setSelectedSkillIds,
  isPending,
  isLoadingRecipes,
  isLoadingStandards,
  isLoadingSkills,
  orgSlug,
  spaceSlug,
}: PackageEditFormContentProps) => {
  const { contains } = pmUseFilter({ sensitivity: 'base' });

  const recipeItems = allRecipes.map((recipe: Recipe) => ({
    label: recipe.name,
    value: recipe.id,
  }));

  const standardItems = allStandards.map((standard: Standard) => ({
    label: standard.name,
    value: standard.id,
  }));

  const skillItems = allSkills.map((skill: Skill) => ({
    label: skill.name,
    value: skill.id,
  }));

  const { collection: recipeCollection, filter: filterRecipes } =
    pmUseListCollection({
      initialItems: recipeItems,
      filter: contains,
    });

  const { collection: standardCollection, filter: filterStandards } =
    pmUseListCollection({
      initialItems: standardItems,
      filter: contains,
    });

  const { collection: skillCollection, filter: filterSkills } =
    pmUseListCollection({
      initialItems: skillItems,
      filter: contains,
    });

  const recipeDisplayValue =
    selectedRecipeIds.length === 0
      ? 'Select commands...'
      : `${selectedRecipeIds.length} command(s) selected`;

  const standardDisplayValue =
    selectedStandardIds.length === 0
      ? 'Select standards...'
      : `${selectedStandardIds.length} standard(s) selected`;

  const skillDisplayValue =
    selectedSkillIds.length === 0
      ? 'Select skills...'
      : `${selectedSkillIds.length} skill(s) selected`;

  return (
    <PMHStack align="flex-start" gap={4} width="full">
      <PMField.Root flex={1} width="full">
        <PMField.Label>Standards</PMField.Label>
        {isLoadingStandards || allStandards.length === 0 ? (
          isLoadingStandards ? (
            <PMSpinner size="sm" />
          ) : (
            <PMText colorPalette="gray" fontSize="sm" display="block">
              No standards available in this space
            </PMText>
          )
        ) : (
          <PMVStack gap={2} width="full" align="flex-start">
            <PMCombobox.Root
              collection={standardCollection}
              onInputValueChange={(e: { inputValue: string }) =>
                filterStandards(e.inputValue)
              }
              onValueChange={(details: { value: string[] }) =>
                setSelectedStandardIds(details.value as StandardId[])
              }
              value={selectedStandardIds}
              multiple
              openOnClick
              placeholder={standardDisplayValue}
              width="full"
              disabled={isPending}
            >
              <PMCombobox.Control>
                <PMVStack gap={0} width="full">
                  <PMCombobox.Input />
                  <PMCombobox.IndicatorGroup>
                    <PMCombobox.ClearTrigger />
                    <PMCombobox.Trigger />
                  </PMCombobox.IndicatorGroup>
                </PMVStack>
              </PMCombobox.Control>

              <PMPortal>
                <PMCombobox.Positioner>
                  <PMCombobox.Content>
                    <PMCombobox.Empty>No standards found</PMCombobox.Empty>
                    {standardCollection.items.map((item) => (
                      <PMCombobox.Item item={item} key={item.value}>
                        <PMCombobox.ItemText>{item.label}</PMCombobox.ItemText>
                        <PMCombobox.ItemIndicator />
                      </PMCombobox.Item>
                    ))}
                  </PMCombobox.Content>
                </PMCombobox.Positioner>
              </PMPortal>
            </PMCombobox.Root>

            {selectedStandardIds.length > 0 && (
              <PMHStack gap={2} flexWrap="wrap" width="full">
                {selectedStandardIds
                  .map((standardId) => {
                    const standard = allStandards.find(
                      (s) => s.id === standardId,
                    );
                    return standard
                      ? { id: standardId, name: standard.name }
                      : null;
                  })
                  .filter(
                    (item): item is { id: StandardId; name: string } =>
                      item !== null,
                  )
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(({ id, name }) => (
                    <PMBadge
                      key={id}
                      variant="subtle"
                      maxW="300px"
                      display="inline-flex"
                      alignItems="center"
                    >
                      <Link
                        to={routes.space.toStandard(orgSlug, spaceSlug, id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          textDecoration: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          overflow: 'hidden',
                        }}
                      >
                        <PMText truncate title={name}>
                          {name}
                        </PMText>
                      </Link>
                      <PMCloseButton
                        size="xs"
                        ml={1}
                        flexShrink={0}
                        onClick={() =>
                          setSelectedStandardIds(
                            selectedStandardIds.filter(
                              (standardId) => standardId !== id,
                            ),
                          )
                        }
                        disabled={isPending}
                      />
                    </PMBadge>
                  ))}
              </PMHStack>
            )}
          </PMVStack>
        )}
        <PMField.HelperText />
        <PMField.ErrorText />
      </PMField.Root>

      <PMField.Root flex={1} width="full">
        <PMField.Label>Commands</PMField.Label>
        {isLoadingRecipes || allRecipes.length === 0 ? (
          isLoadingRecipes ? (
            <PMSpinner size="sm" />
          ) : (
            <PMText colorPalette="gray" fontSize="sm" display="block">
              No commands available in this space
            </PMText>
          )
        ) : (
          <PMVStack gap={2} width="full" align="flex-start">
            <PMCombobox.Root
              collection={recipeCollection}
              onInputValueChange={(e: { inputValue: string }) =>
                filterRecipes(e.inputValue)
              }
              onValueChange={(details: { value: string[] }) =>
                setSelectedRecipeIds(details.value as RecipeId[])
              }
              value={selectedRecipeIds}
              multiple
              openOnClick
              placeholder={recipeDisplayValue}
              width="full"
              disabled={isPending}
            >
              <PMCombobox.Control>
                <PMVStack gap={0} width="full">
                  <PMCombobox.Input />
                  <PMCombobox.IndicatorGroup>
                    <PMCombobox.ClearTrigger />
                    <PMCombobox.Trigger />
                  </PMCombobox.IndicatorGroup>
                </PMVStack>
              </PMCombobox.Control>

              <PMPortal>
                <PMCombobox.Positioner>
                  <PMCombobox.Content>
                    <PMCombobox.Empty>No commands found</PMCombobox.Empty>
                    {recipeCollection.items.map((item) => (
                      <PMCombobox.Item item={item} key={item.value}>
                        <PMCombobox.ItemText>{item.label}</PMCombobox.ItemText>
                        <PMCombobox.ItemIndicator />
                      </PMCombobox.Item>
                    ))}
                  </PMCombobox.Content>
                </PMCombobox.Positioner>
              </PMPortal>
            </PMCombobox.Root>

            {selectedRecipeIds.length > 0 && (
              <PMHStack gap={2} flexWrap="wrap" width="full">
                {selectedRecipeIds
                  .map((recipeId) => {
                    const recipe = allRecipes.find((r) => r.id === recipeId);
                    return recipe ? { id: recipeId, name: recipe.name } : null;
                  })
                  .filter(
                    (item): item is { id: RecipeId; name: string } =>
                      item !== null,
                  )
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(({ id, name }) => (
                    <PMBadge
                      key={id}
                      variant="subtle"
                      maxW="300px"
                      display="inline-flex"
                      alignItems="center"
                    >
                      <Link
                        to={routes.space.toCommand(orgSlug, spaceSlug, id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          textDecoration: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          overflow: 'hidden',
                        }}
                      >
                        <PMText truncate title={name}>
                          {name}
                        </PMText>
                      </Link>
                      <PMCloseButton
                        size="xs"
                        ml={1}
                        flexShrink={0}
                        onClick={() =>
                          setSelectedRecipeIds(
                            selectedRecipeIds.filter(
                              (recipeId) => recipeId !== id,
                            ),
                          )
                        }
                        disabled={isPending}
                      />
                    </PMBadge>
                  ))}
              </PMHStack>
            )}
          </PMVStack>
        )}
        <PMField.HelperText />
        <PMField.ErrorText />
      </PMField.Root>

      <PMField.Root flex={1} width="full">
        <PMField.Label>Skills</PMField.Label>
        {isLoadingSkills || allSkills.length === 0 ? (
          isLoadingSkills ? (
            <PMSpinner size="sm" />
          ) : (
            <PMText colorPalette="gray" fontSize="sm" display="block">
              No skills available in this space
            </PMText>
          )
        ) : (
          <PMVStack gap={2} width="full" align="flex-start">
            <PMCombobox.Root
              collection={skillCollection}
              onInputValueChange={(e: { inputValue: string }) =>
                filterSkills(e.inputValue)
              }
              onValueChange={(details: { value: string[] }) =>
                setSelectedSkillIds(details.value as SkillId[])
              }
              value={selectedSkillIds}
              multiple
              openOnClick
              placeholder={skillDisplayValue}
              width="full"
              disabled={isPending}
            >
              <PMCombobox.Control>
                <PMVStack gap={0} width="full">
                  <PMCombobox.Input />
                  <PMCombobox.IndicatorGroup>
                    <PMCombobox.ClearTrigger />
                    <PMCombobox.Trigger />
                  </PMCombobox.IndicatorGroup>
                </PMVStack>
              </PMCombobox.Control>

              <PMPortal>
                <PMCombobox.Positioner>
                  <PMCombobox.Content>
                    <PMCombobox.Empty>No skills found</PMCombobox.Empty>
                    {skillCollection.items.map((item) => (
                      <PMCombobox.Item item={item} key={item.value}>
                        <PMCombobox.ItemText>{item.label}</PMCombobox.ItemText>
                        <PMCombobox.ItemIndicator />
                      </PMCombobox.Item>
                    ))}
                  </PMCombobox.Content>
                </PMCombobox.Positioner>
              </PMPortal>
            </PMCombobox.Root>

            {selectedSkillIds.length > 0 && (
              <PMHStack gap={2} flexWrap="wrap" width="full">
                {selectedSkillIds
                  .map((skillId) => {
                    const skill = allSkills.find((s) => s.id === skillId);
                    return skill ? { id: skillId, name: skill.name } : null;
                  })
                  .filter(
                    (item): item is { id: SkillId; name: string } =>
                      item !== null,
                  )
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(({ id, name }) => (
                    <PMBadge
                      key={id}
                      variant="subtle"
                      maxW="300px"
                      display="inline-flex"
                      alignItems="center"
                    >
                      <PMText truncate title={name}>
                        {name}
                      </PMText>
                      <PMCloseButton
                        size="xs"
                        ml={1}
                        flexShrink={0}
                        onClick={() =>
                          setSelectedSkillIds(
                            selectedSkillIds.filter(
                              (skillId) => skillId !== id,
                            ),
                          )
                        }
                        disabled={isPending}
                      />
                    </PMBadge>
                  ))}
              </PMHStack>
            )}
          </PMVStack>
        )}
        <PMField.HelperText />
        <PMField.ErrorText />
      </PMField.Root>
    </PMHStack>
  );
};

export const PackageEditForm = ({
  id,
  orgSlug,
  spaceSlug,
}: PackageEditFormProps) => {
  const navigate = useNavigate();
  const { organization, user } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<RecipeId[]>([]);
  const [selectedStandardIds, setSelectedStandardIds] = useState<StandardId[]>(
    [],
  );
  const [selectedSkillIds, setSelectedSkillIds] = useState<SkillId[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const updatePackageMutation = useUpdatePackageMutation();

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

  useEffect(() => {
    if (pkg) {
      setEditName(pkg.name);
      setEditDescription(pkg.description);
      setSelectedRecipeIds(pkg.recipes || []);
      setSelectedStandardIds(pkg.standards || []);
      setSelectedSkillIds(pkg.skills || []);
    }
  }, [pkg]);

  const handleCancel = () => {
    navigate(routes.space.toPackage(orgSlug, spaceSlug, id));
  };

  const handleSave = async () => {
    if (!spaceId || !organization?.id) {
      return;
    }

    if (updatePackageMutation.isPending || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await updatePackageMutation.mutateAsync({
        packageId: id,
        spaceId,
        organizationId: organization.id,
        name: editName,
        description: editDescription,
        recipeIds: selectedRecipeIds,
        standardIds: selectedStandardIds,
        skillsIds: selectedSkillIds,
      });

      pmToaster.create({
        type: 'success',
        title: 'Package updated successfully',
        description: `"${editName}" has been updated`,
      });

      navigate(routes.space.toPackage(orgSlug, spaceSlug, id));
    } catch (err) {
      console.error('Failed to update package:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An error occurred while updating the package';
      pmToaster.create({
        type: 'error',
        title: 'Failed to update package',
        description: errorMessage,
      });
      setIsSubmitting(false);
    }
  };

  const isPending = updatePackageMutation.isPending || isSubmitting;
  const isFormValid = editName.trim();

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
    <PMPage
      title="Edit Package"
      subtitle="Update package details, commands, and standards"
    >
      <MarkdownEditorProvider>
        <PMBox
          as="form"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <PMVStack gap={10} alignItems="flex-start">
            <PMFieldset.Root>
              <PMFieldset.Legend>
                <PMHeading level="h3">Package Information</PMHeading>
              </PMFieldset.Legend>
              <PMFieldset.Content
                border="solid 1px"
                borderColor="border.primary"
                p={4}
              >
                <PMField.Root required>
                  <PMField.Label>
                    Name
                    <PMField.RequiredIndicator />
                  </PMField.Label>
                  <PMInput
                    placeholder="Enter package name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={isPending}
                  />
                  <PMField.HelperText />
                  <PMField.ErrorText />
                </PMField.Root>

                <PMField.Root maxW="100%">
                  <PMField.Label>Description</PMField.Label>
                  <PMBox width="100%">
                    <MarkdownEditor
                      defaultValue={editDescription}
                      onMarkdownChange={(value: string): void => {
                        setEditDescription(value);
                      }}
                    />
                  </PMBox>
                  <PMField.HelperText />
                  <PMField.ErrorText />
                </PMField.Root>
              </PMFieldset.Content>
            </PMFieldset.Root>

            <PMFieldset.Root>
              <PMFieldset.Legend>
                <PMHeading level="h3">Content Selection</PMHeading>
              </PMFieldset.Legend>
              <PMFieldset.HelperText>
                Select the commands and standards to include in this package.
              </PMFieldset.HelperText>
              <PMFieldset.Content
                border="solid 1px"
                borderColor="border.primary"
                p={4}
              >
                <PackageEditFormContent
                  key={`loaded-${allRecipes.length}-${allStandards.length}-${allSkills.length}`}
                  allRecipes={allRecipes}
                  allStandards={allStandards}
                  allSkills={allSkills}
                  selectedRecipeIds={selectedRecipeIds}
                  selectedStandardIds={selectedStandardIds}
                  selectedSkillIds={selectedSkillIds}
                  setSelectedRecipeIds={setSelectedRecipeIds}
                  setSelectedStandardIds={setSelectedStandardIds}
                  setSelectedSkillIds={setSelectedSkillIds}
                  isPending={isPending}
                  isLoadingRecipes={isLoadingRecipes}
                  isLoadingStandards={isLoadingStandards}
                  isLoadingSkills={isLoadingSkills}
                  orgSlug={orgSlug}
                  spaceSlug={spaceSlug}
                />
              </PMFieldset.Content>
            </PMFieldset.Root>
          </PMVStack>

          <PMHStack
            marginTop={6}
            border="solid 1px"
            borderColor="border.primary"
            paddingY={4}
            justifyContent="center"
            backgroundColor="background.secondary"
            position="sticky"
            bottom={0}
          >
            <PMButton
              type="submit"
              variant="primary"
              disabled={!isFormValid || isPending}
              loading={isPending}
              size="lg"
            >
              {isPending ? 'Saving...' : 'Save'}
            </PMButton>
            <PMButton
              variant="secondary"
              onClick={handleCancel}
              type="button"
              disabled={isPending}
              size="lg"
            >
              Cancel
            </PMButton>
          </PMHStack>

          {updatePackageMutation.isError && (
            <PMAlert.Root status="error">
              <PMAlert.Indicator />
              <PMAlert.Title>Failed to update package</PMAlert.Title>
              <PMText>Please try again.</PMText>
            </PMAlert.Root>
          )}
        </PMBox>
      </MarkdownEditorProvider>
    </PMPage>
  );
};
