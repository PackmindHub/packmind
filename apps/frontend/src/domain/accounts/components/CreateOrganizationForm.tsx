import { useState, useEffect } from 'react';
import {
  PMVStack,
  PMHeading,
  PMText,
  PMButton,
  PMField,
  PMInput,
  PMAlert,
} from '@packmind/ui';
import { useAuthContext } from '../hooks/useAuthContext';
import { organizationGateway } from '../api/gateways';
import { useRenameOrganizationMutation } from '../api/queries/AccountsQueries';
import { isPackmindConflictError } from '../../../services/api/errors/PackmindConflictError';

interface CreateOrganizationFormProps {
  onSuccess: () => void;
}

export function CreateOrganizationForm({
  onSuccess,
}: CreateOrganizationFormProps) {
  const { organization } = useAuthContext();
  const [organizationName, setOrganizationName] = useState(
    organization?.name || '',
  );
  const [organizationNameError, setOrganizationNameError] = useState<
    string | undefined
  >(undefined);
  const [isValidating, setIsValidating] = useState(false);

  const renameOrganizationMutation = useRenameOrganizationMutation();

  useEffect(() => {
    const trimmedName = organizationName.trim();

    if (!trimmedName) {
      setOrganizationNameError('Name cannot be empty');
      setIsValidating(false);
      return;
    }

    if (trimmedName === organization?.name) {
      setOrganizationNameError(undefined);
      setIsValidating(false);
      return;
    }

    setIsValidating(true);

    const validateOrganizationName = async () => {
      try {
        await organizationGateway.getByName(trimmedName);
        setOrganizationNameError('Organization name already exists');
      } catch {
        setOrganizationNameError(undefined);
      } finally {
        setIsValidating(false);
      }
    };

    const debounceTimer = setTimeout(validateOrganizationName, 500);
    return () => clearTimeout(debounceTimer);
  }, [organizationName, organization?.name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = organizationName.trim();

    if (!trimmedName) {
      setOrganizationNameError('Organization name is required');
      return;
    }

    if (organizationNameError) {
      return;
    }

    if (!organization?.id) {
      return;
    }

    if (trimmedName === organization.name) {
      onSuccess();
      return;
    }

    renameOrganizationMutation.mutate(
      {
        organizationId: organization.id,
        name: trimmedName,
      },
      {
        onSuccess: () => {
          onSuccess();
        },
        onError: (error: unknown) => {
          if (isPackmindConflictError(error)) {
            setOrganizationNameError(error.serverError.data.message);
          }
        },
      },
    );
  };

  const ORG_NAME_MAX_LENGTH = 64;

  return (
    <PMVStack gap={8} align="stretch" maxW="600px" mx="auto">
      <PMVStack gap={3} textAlign="center">
        <PMHeading level="h2">Name your organization</PMHeading>
        <PMText color="secondary" fontSize="md">
          This is how your team will identify your workspace.
        </PMText>
      </PMVStack>

      <form onSubmit={handleSubmit}>
        <PMVStack gap={6} align="stretch">
          <PMField.Root required invalid={!!organizationNameError}>
            <PMField.Label>
              Organization Name{' '}
              <PMText as="span" variant="small" color="secondary">
                ({organizationName.length} / {ORG_NAME_MAX_LENGTH} max)
              </PMText>
              <PMField.RequiredIndicator />
            </PMField.Label>

            <PMInput
              id="create-organization-name"
              value={organizationName}
              onChange={(e) => {
                setOrganizationName(e.target.value);
                setOrganizationNameError(undefined);
              }}
              placeholder="Enter organization name"
              required
              disabled={renameOrganizationMutation.isPending}
              maxLength={ORG_NAME_MAX_LENGTH}
              data-testid="CreateOrganizationForm.OrganizationNameInput"
            />
            <PMField.ErrorText>{organizationNameError}</PMField.ErrorText>
          </PMField.Root>

          {renameOrganizationMutation.error &&
            !isPackmindConflictError(renameOrganizationMutation.error) && (
              <PMAlert.Root status="error">
                <PMAlert.Indicator />
                <PMAlert.Title>
                  {renameOrganizationMutation.error.message ||
                    'Failed to rename organization. Please try again.'}
                </PMAlert.Title>
              </PMAlert.Root>
            )}

          <PMVStack gap={3} align="stretch">
            <PMButton
              type="submit"
              size="lg"
              variant="primary"
              disabled={
                renameOrganizationMutation.isPending ||
                isValidating ||
                !!organizationNameError
              }
              data-testid="CreateOrganizationForm.SubmitButton"
            >
              {renameOrganizationMutation.isPending ? 'Saving...' : 'Continue'}
            </PMButton>
          </PMVStack>
        </PMVStack>
      </form>
    </PMVStack>
  );
}
