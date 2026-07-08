import React, { useState } from 'react';
import {
  PMPage,
  PMText,
  PMBox,
  PMVStack,
  PMAlert,
  PMHeading,
  PMHStack,
  PMButton,
  PMField,
  PMFieldset,
  PMInput,
  pmToaster,
} from '@packmind/ui';
import { useNavigate } from 'react-router';
import { useUpdatePackageMutation } from '../../api/queries/DeploymentsQueries';
import {
  Package,
  PackageId,
  Command,
  Standard,
  CommandId,
  StandardId,
  Skill,
  SkillId,
} from '@packmind/types';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { routes } from '../../../../shared/utils/routes';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../../shared/components/editor/MarkdownEditor';
import { PackageEditFormContent } from './PackageEditFormContent';

interface PackageEditFormBodyProps {
  pkg: Package;
  allCommands: Command[];
  allStandards: Standard[];
  allSkills: Skill[];
  id: PackageId;
  orgSlug: string;
  spaceSlug: string;
}

export const PackageEditFormBody = ({
  pkg,
  allCommands,
  allStandards,
  allSkills,
  id,
  orgSlug,
  spaceSlug,
}: PackageEditFormBodyProps) => {
  const navigate = useNavigate();
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  const [editName, setEditName] = useState(pkg.name);
  const [editDescription, setEditDescription] = useState(pkg.description ?? '');
  const [selectedCommandIds, setSelectedCommandIds] = useState<CommandId[]>(
    pkg.recipes ?? [],
  );
  const [selectedStandardIds, setSelectedStandardIds] = useState<StandardId[]>(
    pkg.standards ?? [],
  );
  const [selectedSkillIds, setSelectedSkillIds] = useState<SkillId[]>(
    pkg.skills ?? [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updatePackageMutation = useUpdatePackageMutation();

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
        recipeIds: selectedCommandIds,
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
                  key={`loaded-${allCommands.length}-${allStandards.length}-${allSkills.length}`}
                  allCommands={allCommands}
                  allStandards={allStandards}
                  allSkills={allSkills}
                  selectedCommandIds={selectedCommandIds}
                  selectedStandardIds={selectedStandardIds}
                  selectedSkillIds={selectedSkillIds}
                  setSelectedCommandIds={setSelectedCommandIds}
                  setSelectedStandardIds={setSelectedStandardIds}
                  setSelectedSkillIds={setSelectedSkillIds}
                  isPending={isPending}
                  isLoadingCommands={false}
                  isLoadingStandards={false}
                  isLoadingSkills={false}
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
