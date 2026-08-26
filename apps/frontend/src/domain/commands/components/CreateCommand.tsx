import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router';
import {
  useCreateCommandMutation,
  useGetCommandsQuery,
} from '../api/queries/CommandsQueries';
import { Command } from '@packmind/types';
import { RECIPE_MESSAGES } from '../constants/messages';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { useNavigation } from '../../../shared/hooks/useNavigation';
import { CommandForm, CommandFormData } from './CommandForm';
import { MarkdownEditorProvider } from '../../../shared/components/editor/MarkdownEditor';
import { isPackmindConflictError } from '../../../services/api/errors/PackmindConflictError';
import { useCreateIntoPackage } from '../../deployments/hooks/useCreateIntoPackage';
import { contextPackageHref } from '../../deployments/components/context/buildComponentDetail';
import { pmToaster } from '@packmind/ui';

export const CreateCommand = () => {
  const { orgSlug, spaceSlug } = useParams() as {
    orgSlug: string;
    spaceSlug: string;
  };
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const nav = useNavigation();
  const { packageId, attachToPackage } = useCreateIntoPackage();

  const [alert, setAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const createMutation = useCreateCommandMutation();
  const { data: existingCommands } = useGetCommandsQuery();
  const existingCommandNames = useMemo(
    () => (existingCommands ?? []).map((r) => r.name),
    [existingCommands],
  );

  const handleSubmit = (data: CommandFormData) => {
    if (!organization?.id || !spaceId) {
      setAlert({
        type: 'error',
        message: 'Organization or space not found',
      });
      return;
    }

    createMutation.mutate(
      {
        organizationId: organization.id,
        spaceId,
        recipe: {
          name: data.name,
          content: data.content,
          slug: data.slug,
        },
      },
      {
        onSuccess: (createdCommand: Command) => {
          pmToaster.success({
            title: RECIPE_MESSAGES.success.created,
          });
          /*
           * Navigating only once the membership is settled, so whichever screen
           * comes next shows the command in the package it was created for.
           */
          void attachToPackage({ commandIds: [createdCommand.id] }).then(
            (outcome) => {
              if (outcome === 'failed') {
                pmToaster.error({
                  title: 'Command created, but not added to the package',
                  description:
                    'It is in the space. Add it to a package to distribute it.',
                });
              }
              /*
               * Back where the form was opened from. A package in the address
               * means this form was reached from the Context surface, so that is
               * the screen the user was working on, with the new command open in
               * it. The command's own page is where the per-type pages send it,
               * and it is still the right answer for them.
               */
              if (packageId) {
                nav.to(
                  contextPackageHref(
                    { orgSlug, spaceSlug },
                    packageId,
                    createdCommand.id,
                  ),
                );
              } else {
                nav.space.toCommand(createdCommand.id);
              }
            },
          );
        },
        onError: (error) => {
          console.error('Failed to create command:', error);
          if (isPackmindConflictError(error)) {
            setAlert({
              type: 'error',
              message: RECIPE_MESSAGES.error.slugAlreadyExists,
            });
          } else {
            setAlert({
              type: 'error',
              message: RECIPE_MESSAGES.error.createFailed,
            });
          }
        },
      },
    );
  };

  const handleCancel = () => {
    nav.space.toCommands();
  };

  return (
    <MarkdownEditorProvider>
      <CommandForm
        mode="create"
        existingCommandNames={existingCommandNames}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isPending={createMutation.isPending}
        isSuccess={createMutation.isSuccess}
        alert={alert}
      />
    </MarkdownEditorProvider>
  );
};
