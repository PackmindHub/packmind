import React, { useState } from 'react';
import {
  PMBox,
  PMVStack,
  PMHStack,
  PMPopover,
  PMInput,
  PMButton,
  PMLabel,
  PMText,
} from '@packmind/ui';
import { OrganizationId } from '@packmind/accounts/types';
import {
  useCreateGitProviderMutation,
  useUpdateGitProviderMutation,
} from '../api/queries';
import {
  CreateGitProviderForm as FormData,
  GitProviders,
  GitProviderUI,
} from '../types/GitProviderTypes';
import { extractErrorMessage } from '../utils/errorUtils';

interface CreateGitProviderFormProps {
  organizationId: OrganizationId;
  editingProvider?: GitProviderUI | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const CreateGitProviderForm: React.FC<CreateGitProviderFormProps> = ({
  organizationId,
  editingProvider,
  onSuccess,
  onCancel,
}) => {
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

  const isEditing = !!editingProvider;
  const mutation = isEditing ? updateMutation : createMutation;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setErrors({});

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: editingProvider.id,
          data: formData,
        });
      } else {
        await createMutation.mutateAsync({
          organizationId,
          data: formData,
        });
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving git provider:', error);
      setErrors({
        form: extractErrorMessage(
          error,
          'Failed to save git provider. Please try again.',
        ),
      });
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const providerSelectId = 'provider-source';
  const tokenInputId = 'provider-token';
  const urlInputId = 'provider-url';

  return (
    <PMBox>
      <form onSubmit={handleSubmit}>
        <PMVStack
          alignItems="stretch"
          width="500px"
          marginX={'auto'}
          padding={8}
          borderRadius={'md'}
          border={'solid 1px'}
          borderColor={'border.primary'}
        >
          {/* Git Provider Selection */}
          <PMVStack align="stretch" gap={1}>
            <PMLabel htmlFor={providerSelectId} required>
              Git Provider
            </PMLabel>
            <select
              id={providerSelectId}
              value={formData.source}
              onChange={(e) => {
                const newSource = e.target.value as GitProviders;
                handleInputChange('source', newSource);
                // Update URL based on provider selection
                const defaultUrl =
                  newSource === GitProviders.GITLAB
                    ? 'https://gitlab.com'
                    : 'https://github.com';
                if (
                  !isEditing ||
                  formData.url === 'https://github.com' ||
                  formData.url === 'https://gitlab.com'
                ) {
                  handleInputChange('url', defaultUrl);
                }
              }}
              disabled={mutation.isPending}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: `1px solid ${errors.source ? '#e53e3e' : '#d1d5db'}`,
                fontSize: '16px',
                backgroundColor: 'gray',
              }}
            >
              <option value={GitProviders.GITHUB}>GitHub</option>
              <option value={GitProviders.GITLAB}>GitLab</option>
            </select>
            {errors.source && (
              <PMText variant="small" color="error">
                {errors.source}
              </PMText>
            )}
          </PMVStack>

          {/* URL */}
          <PMVStack align="stretch" gap={1}>
            <PMLabel htmlFor={urlInputId} required>
              URL
            </PMLabel>
            <PMInput
              id={urlInputId}
              type="url"
              value={formData.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
              placeholder={
                formData.source === GitProviders.GITLAB
                  ? 'https://gitlab.com'
                  : 'https://github.com'
              }
              required
              disabled={mutation.isPending}
              error={errors.url}
              maxLength={150}
            />
            <PMText variant="small">Base URL for your git provider</PMText>
            {errors.url && (
              <PMText variant="small" color="error">
                {errors.url}
              </PMText>
            )}
          </PMVStack>

          {/* Access Token */}
          <PMVStack align="stretch" gap={1} alignItems="stretch">
            <PMLabel htmlFor={tokenInputId} required>
              Access Token
              <PMPopover
                content={
                  <PMBox maxWidth="300px">
                    <PMText variant="body-important" mb={2} as="p">
                      What is an access token?
                    </PMText>
                    <PMText variant="small" mb={2} as="p" color="secondary">
                      Access token is a secret key that allows Packmind to
                      access your Git repositories to perform operations on your
                      behalf. Never share this token publicly.
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
                  </PMBox>
                }
                placement="right"
                showArrow
              >
                <PMButton variant="ghost" size="xs" marginLeft={2}>
                  Needed permissions
                </PMButton>
              </PMPopover>
            </PMLabel>
            <PMInput
              id={tokenInputId}
              type="password"
              value={formData.token}
              onChange={(e) => handleInputChange('token', e.target.value)}
              placeholder={
                formData.source === GitProviders.GITLAB
                  ? 'glpat-xxxxxxxxxxxxxxxxxxxx'
                  : 'ghp_xxxxxxxxxxxxxxxxxxxx'
              }
              required
              disabled={mutation.isPending}
              error={errors.token}
              maxLength={150}
            />
            {errors.token && (
              <PMText variant="small" color="error">
                {errors.token}
              </PMText>
            )}
          </PMVStack>

          {/* Form Error */}
          {errors.form && (
            <PMBox
              p={3}
              bg="red.50"
              borderRadius="md"
              borderColor="red.200"
              borderWidth="1px"
            >
              <PMText variant="body" color="error">
                {errors.form}
              </PMText>
            </PMBox>
          )}

          {/* Action Buttons */}
          <PMHStack gap={3} justify="flex-end">
            <PMButton
              variant="tertiary"
              onClick={onCancel}
              disabled={mutation.isPending}
            >
              Cancel
            </PMButton>
            <PMButton
              type="submit"
              colorScheme="blue"
              loading={mutation.isPending}
            >
              {isEditing ? 'Update Provider' : 'Add Provider'}
            </PMButton>
          </PMHStack>
        </PMVStack>
      </form>
    </PMBox>
  );
};
