import React, { useState } from 'react';
import {
  PMBox,
  PMVStack,
  PMPopover,
  PMInput,
  PMButton,
  PMLabel,
  PMText,
  PMHStack,
  PMField,
  PMNativeSelect,
  PMAlert,
} from '@packmind/ui';
import { OrganizationId } from '@packmind/types';
import {
  useCreateGitProviderMutation,
  useUpdateGitProviderMutation,
} from '../../api/queries';
import {
  CreateGitProviderForm as FormData,
  GitProviders,
  GitProviderUI,
} from '../../types/GitProviderTypes';
import { extractErrorMessage } from '../../utils/errorUtils';

interface GitProviderConnectionProps {
  organizationId: OrganizationId;
  editingProvider?: GitProviderUI | null;
  onSuccess?: (provider: GitProviderUI) => void;
}

export const GitProviderConnection: React.FC<GitProviderConnectionProps> = ({
  organizationId,
  editingProvider = null,
  onSuccess,
}) => {
  const isEditing = !!editingProvider;
  const [formData, setFormData] = useState<FormData>({
    source: editingProvider?.source || GitProviders.GITHUB,
    token: editingProvider?.token || '',
    url:
      editingProvider?.url ||
      (editingProvider?.source === GitProviders.GITLAB
        ? 'https://gitlab.com'
        : 'https://github.com'),
  });
  const [errors, setErrors] = useState<{
    source?: string;
    token?: string;
    url?: string;
    form?: string;
  }>({});
  const createMutation = useCreateGitProviderMutation();
  const updateMutation = useUpdateGitProviderMutation();

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!formData.source) {
      newErrors.source = 'Git provider is required';
    }
    if (!formData.token.trim()) {
      newErrors.token = 'Access token is required';
    } else if (formData.token.trim().length < 10) {
      newErrors.token = 'Access token must be at least 10 characters';
    }
    if (!formData.url.trim()) {
      newErrors.url = 'URL is required';
    } else if (!isValidUrl(formData.url.trim())) {
      newErrors.url = 'Please enter a valid URL';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const [success, setSuccess] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setErrors({});
    setSuccess(false);
    let mutationResult: GitProviderUI | null = null;
    try {
      if (isEditing && editingProvider) {
        mutationResult = await updateMutation.mutateAsync({
          id: editingProvider.id,
          data: formData,
        });
      } else {
        mutationResult = await createMutation.mutateAsync({
          data: formData,
        });
      }
      setSuccess(true);
      if (onSuccess) onSuccess(mutationResult);
    } catch (error) {
      setErrors({
        form: extractErrorMessage(
          error,
          'Failed to save git provider. Please try again.',
        ),
      });
    }
  };

  const providerSelectId = 'provider-source';
  const tokenInputId = 'provider-token';
  const urlInputId = 'provider-url';

  return (
    <PMVStack
      borderRadius="md"
      w={{ smToXl: 'full', base: '1/3' }}
      alignItems={'stretch'}
      gap={4}
    >
      <PMText color="secondary">
        Configure access to your Git provider by providing the necessary
        information
      </PMText>
      <form onSubmit={handleSubmit}>
        <PMVStack alignItems="stretch" gap={4} maxWidth={'sm'}>
          {/* Git Provider Selection */}
          <PMField.Root required invalid={!!errors.source}>
            <PMField.Label htmlFor={providerSelectId}>Git vendor</PMField.Label>
            <PMNativeSelect
              id={providerSelectId}
              value={formData.source}
              size={'sm'}
              onChange={(e) => {
                const newSource = e.target.value as GitProviders;
                handleInputChange('source', newSource);
                // Update URL based on provider selection
                const defaultUrl =
                  newSource === GitProviders.GITLAB
                    ? 'https://gitlab.com'
                    : 'https://github.com';
                if (
                  formData.url === 'https://github.com' ||
                  formData.url === 'https://gitlab.com'
                ) {
                  handleInputChange('url', defaultUrl);
                }
              }}
              disabled={
                isEditing ? updateMutation.isPending : createMutation.isPending
              }
              items={[
                { label: 'GitHub', value: GitProviders.GITHUB },
                { label: 'GitLab', value: GitProviders.GITLAB },
              ]}
            />
            <PMField.ErrorText>{errors.source}</PMField.ErrorText>
          </PMField.Root>

          {/* URL */}
          <PMField.Root required invalid={!!errors.url}>
            <PMField.Label htmlFor={urlInputId}>
              URL
              <PMField.RequiredIndicator />
            </PMField.Label>
            <PMInput
              id={urlInputId}
              size={'sm'}
              type="url"
              value={formData.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
              placeholder={
                formData.source === GitProviders.GITLAB
                  ? 'https://gitlab.com'
                  : 'https://github.com'
              }
              required
              disabled={
                isEditing ? updateMutation.isPending : createMutation.isPending
              }
              error={errors.url}
              maxLength={150}
            />
            <PMField.HelperText>
              Base URL for your git provider
            </PMField.HelperText>

            <PMField.ErrorText>{errors.url}</PMField.ErrorText>
          </PMField.Root>

          {/* Access Token */}
          <PMField.Root required invalid={!!errors.token}>
            <PMField.Label htmlFor={tokenInputId}>
              Access Token
              <PMField.RequiredIndicator />
              <PMPopover.Root positioning={{ placement: 'right' }}>
                <PMPopover.Trigger asChild>
                  <PMButton variant="ghost" size="xs" marginLeft={2}>
                    Needed permissions
                  </PMButton>
                </PMPopover.Trigger>
                <PMPopover.Positioner>
                  <PMPopover.Content>
                    <PMPopover.CloseTrigger />
                    <PMPopover.Arrow>
                      <PMPopover.ArrowTip />
                    </PMPopover.Arrow>
                    <PMPopover.Body>
                      <PMPopover.Title>
                        What is an access token?
                      </PMPopover.Title>

                      <PMText variant="small" mb={2} as="p" color="secondary">
                        Access token is a secret key that allows Packmind to
                        access your Git repositories to perform operations on
                        your behalf. Never share this token publicly.
                      </PMText>
                      <PMText variant="body-important" as="p" mb={2}>
                        {formData.source === GitProviders.GITLAB && 'GitLab'}
                        {formData.source === GitProviders.GITHUB && 'GitHub'}
                      </PMText>
                      <PMText variant="small" as="p" color="secondary">
                        {formData.source === GitProviders.GITLAB &&
                          'Generate a personal access token with api, read_repository, and write_repository scopes from your GitLab account settings.'}
                        {formData.source === GitProviders.GITHUB &&
                          `Generate a personal access token with repository access and
                        read/write access on 'Contents' permission for 'fine-grained tokens'
                        OR 'repo' scope for 'classic tokens' from your GitHub account settings.`}
                      </PMText>
                    </PMPopover.Body>
                  </PMPopover.Content>
                </PMPopover.Positioner>
              </PMPopover.Root>
            </PMField.Label>
            <PMInput
              id={tokenInputId}
              size={'sm'}
              type="password"
              value={formData.token}
              onChange={(e) => handleInputChange('token', e.target.value)}
              placeholder={
                formData.source === GitProviders.GITLAB
                  ? 'glpat-xxxxxxxxxxxxxxxxxxxx'
                  : 'ghp_xxxxxxxxxxxxxxxxxxxx'
              }
              required
              disabled={
                isEditing ? updateMutation.isPending : createMutation.isPending
              }
              error={errors.token}
              maxLength={150}
            />

            <PMField.ErrorText>{errors.token}</PMField.ErrorText>
          </PMField.Root>

          {/* Form Error */}
          {errors.form && (
            <PMAlert.Root status={'error'}>
              <PMAlert.Indicator />
              <PMAlert.Title>Error while saving</PMAlert.Title>
              <PMAlert.Description>{errors.form}</PMAlert.Description>
            </PMAlert.Root>
          )}

          {/* Action Buttons */}
          <PMHStack gap={3} justify="flex-start">
            <PMButton
              type="submit"
              size={'sm'}
              loading={
                isEditing ? updateMutation.isPending : createMutation.isPending
              }
              disabled={!formData.token.trim() || !formData.url.trim()}
            >
              Save
            </PMButton>
          </PMHStack>
        </PMVStack>
        {success && !isEditing && (
          <PMAlert.Root status="success" my={4}>
            <PMAlert.Indicator />
            <PMAlert.Title>Git provider added successfully!</PMAlert.Title>
          </PMAlert.Root>
        )}
        {success && isEditing && (
          <PMAlert.Root status="success" my={4}>
            <PMAlert.Indicator />
            <PMAlert.Title>Git provider updated successfully!</PMAlert.Title>
          </PMAlert.Root>
        )}
      </form>
    </PMVStack>
  );
};
