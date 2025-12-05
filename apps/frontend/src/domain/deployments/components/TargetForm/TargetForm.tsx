import React, { useState, useEffect } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMInput,
  PMText,
  PMVStack,
  PMNativeSelect,
} from '@packmind/ui';
import { GitRepoId } from '@packmind/types';
import { Target } from '@packmind/types';
import {
  useAddTargetMutation,
  useUpdateTargetMutation,
} from '../../api/queries/DeploymentsQueries';

interface BranchOption {
  label: string;
  value: GitRepoId;
  branch: string;
}

interface TargetFormProps {
  mode: 'add' | 'edit';
  target?: Target;
  gitRepoId?: GitRepoId;
  availableBranches?: BranchOption[];
  defaultBranch?: string;
  canEditPath?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  name: string;
  path: string;
  gitRepoId: GitRepoId;
}

interface FormErrors {
  name?: string;
  path?: string;
  branch?: string;
  form?: string;
}

export const TargetForm: React.FC<TargetFormProps> = ({
  mode,
  target,
  gitRepoId,
  availableBranches = [],
  defaultBranch,
  canEditPath = true,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState<FormData>(() => ({
    name: target?.name || '',
    path: target?.path || '/',
    gitRepoId: gitRepoId || ('' as GitRepoId),
  }));

  const [errors, setErrors] = useState<FormErrors>({});

  const addTargetMutation = useAddTargetMutation();
  const updateTargetMutation = useUpdateTargetMutation();

  // Reset form when mode or target changes
  useEffect(() => {
    if (mode === 'edit' && target) {
      setFormData({
        name: target.name,
        path: target.path,
        gitRepoId: gitRepoId || ('' as GitRepoId),
      });
    } else if (mode === 'add') {
      setFormData({
        name: '',
        path: '/',
        gitRepoId: gitRepoId || ('' as GitRepoId),
      });
    }
    setErrors({});
  }, [mode, target?.id, target?.name, target?.path, gitRepoId]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Target name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Target name must be at least 2 characters';
    }

    if (!formData.path.trim()) {
      newErrors.path = 'Target path is required';
    } else if (!formData.path.startsWith('/') || !formData.path.endsWith('/')) {
      newErrors.path = 'Path must start and end with "/"';
    } else if (formData.path.includes('..')) {
      newErrors.path = 'Invalid path format';
    }

    if (mode === 'add' && availableBranches.length > 0 && !formData.gitRepoId) {
      newErrors.branch = 'Please select a branch';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (mode === 'add') {
        await addTargetMutation.mutateAsync({
          name: formData.name.trim(),
          path: formData.path.trim(),
          gitRepoId: formData.gitRepoId,
        });
      } else if (mode === 'edit' && target) {
        await updateTargetMutation.mutateAsync({
          targetId: target.id,
          name: formData.name.trim(),
          path: formData.path.trim(),
        });
      }

      onSuccess?.();
    } catch (error) {
      setErrors({
        form:
          error instanceof Error ? error.message : `Failed to ${mode} target`,
      });
    }
  };

  const handleCancel = () => {
    if (mode === 'edit' && target) {
      setFormData({
        name: target.name,
        path: target.path,
        gitRepoId: gitRepoId || ('' as GitRepoId),
      });
    } else {
      setFormData({
        name: '',
        path: '/',
        gitRepoId: gitRepoId || ('' as GitRepoId),
      });
    }
    setErrors({});
    onCancel?.();
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Check if form has changes (only relevant for edit mode)
  const hasChanges =
    mode === 'add' ||
    (target &&
      (formData.name.trim() !== target.name ||
        formData.path.trim() !== target.path));

  const isLoading =
    addTargetMutation.isPending || updateTargetMutation.isPending;
  const submitText = mode === 'add' ? 'Add Target' : 'Update Target';
  const loadingText = mode === 'add' ? 'Adding...' : 'Updating...';

  return (
    <PMBox
      as="form"
      onSubmit={handleSubmit}
      p={4}
      border="1px solid"
      borderColor="border.secondary"
      borderRadius="md"
      bg="background.secondary"
    >
      <PMVStack gap={3} align="stretch">
        {errors.form && (
          <PMBox
            p={3}
            borderRadius="md"
            bg="red.subtle"
            borderColor="red.fg"
            borderWidth="1px"
          >
            <PMText color="error" fontSize="sm">
              {errors.form}
            </PMText>
          </PMBox>
        )}

        {/* Branch Selection - only show for add mode with multiple branches */}
        {mode === 'add' && availableBranches.length > 0 && (
          <PMVStack gap={2} align="stretch">
            <PMText fontSize="sm" fontWeight="medium" color="primary">
              Branch
            </PMText>
            <PMNativeSelect
              value={formData.gitRepoId}
              onChange={(e) =>
                updateFormData('gitRepoId', e.target.value as GitRepoId)
              }
              items={availableBranches.map((branch) => ({
                label: branch.label,
                value: branch.value,
              }))}
              size="sm"
            />
            {errors.branch && (
              <PMText fontSize="xs" color="error">
                {errors.branch}
              </PMText>
            )}
          </PMVStack>
        )}

        <PMVStack gap={2} align="stretch">
          <PMText fontSize="sm" fontWeight="medium" color="primary">
            Target Name
          </PMText>
          <PMInput
            value={formData.name}
            onChange={(e) => updateFormData('name', e.target.value)}
            placeholder="e.g., Frontend, Backend, Docs"
            error={errors.name}
            size="sm"
          />
          {errors.name && (
            <PMText fontSize="xs" color="error">
              {errors.name}
            </PMText>
          )}
        </PMVStack>

        <PMVStack gap={2} align="stretch">
          <PMText fontSize="sm" fontWeight="medium" color="primary">
            Target Path
          </PMText>
          <PMInput
            value={formData.path}
            onChange={(e) => updateFormData('path', e.target.value)}
            placeholder="e.g., /apps/frontend/, /docs/"
            error={errors.path}
            size="sm"
            disabled={mode === 'edit' && !canEditPath}
          />
          {errors.path ? (
            <PMText fontSize="xs" color="error">
              {errors.path}
            </PMText>
          ) : mode === 'edit' && !canEditPath ? (
            <PMText fontSize="xs" color="faded">
              Path cannot be changed for targets on providers without a token
            </PMText>
          ) : (
            <PMText fontSize="xs" color="faded">
              Path must start and end with "/"
            </PMText>
          )}
        </PMVStack>

        <PMHStack gap={2} justify="flex-end">
          <PMButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </PMButton>
          <PMButton
            type="submit"
            size="sm"
            loading={isLoading}
            loadingText={loadingText}
            disabled={mode === 'edit' && !hasChanges}
          >
            {submitText}
          </PMButton>
        </PMHStack>
      </PMVStack>
    </PMBox>
  );
};
