import React, { useState, useEffect } from 'react';
import {
  PMBox,
  PMVStack,
  PMHStack,
  PMField,
  PMFieldset,
  PMHeading,
} from '@packmind/ui';
import { PMButton, PMInput, PMTextArea, PMText, PMAlert } from '@packmind/ui';
import {
  useCreateStandardMutation,
  useUpdateStandardMutation,
  useGetRulesByStandardIdQuery,
} from '../api/queries/StandardsQueries';
import {
  createRuleId,
  RuleId,
  Standard,
  StandardId,
  OrganizationId,
  SpaceId,
} from '@packmind/types';
import { STANDARD_MESSAGES } from '../constants/messages';
import { MarkdownEditor } from '../../../shared/components/editor/MarkdownEditor';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';

interface Rule {
  content: string;
  id: RuleId;
}

interface StandardFormProps {
  mode: 'create' | 'edit';
  standard?: Standard;
  onCancel?: () => void;
  onSuccess?: (standard?: Standard) => void;
  orgSlug?: string;
}

export const StandardForm: React.FC<StandardFormProps> = ({
  mode,
  standard,
  onCancel,
  onSuccess,
}) => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const [name, setName] = useState(standard?.name || '');
  const [description, setDescription] = useState(standard?.description || '');
  const [rules, setRules] = useState<Rule[]>([
    { content: '', id: createRuleId('') },
  ]);
  const [scope, setScope] = useState(standard?.scope || '');

  // Alert state management
  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  const createMutation = useCreateStandardMutation();
  const updateMutation = useUpdateStandardMutation();

  const {
    data: fetchedRules,
    isLoading: rulesLoading,
    isError: rulesError,
  } = useGetRulesByStandardIdQuery(
    organization?.id as OrganizationId,
    spaceId as SpaceId,
    standard?.id || ('' as StandardId),
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Initialize rules from fetched data for edit mode
  useEffect(() => {
    if (mode === 'edit' && fetchedRules && fetchedRules.length > 0) {
      setRules(
        fetchedRules.map((rule) => ({ id: rule.id, content: rule.content })),
      );
    } else if (mode === 'edit' && !rulesLoading && !rulesError) {
      // If no rules found and not loading, initialize with empty rule
      setRules([{ content: '', id: createRuleId('') }]);
    }
  }, [fetchedRules, rulesLoading, rulesError, mode]);

  const handleAddRule = () => {
    setRules([...rules, { content: '', id: createRuleId('') }]);
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index: number, content: string) => {
    const newRules = [...rules];
    newRules[index] = { id: newRules[index].id, content };
    setRules(newRules);
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setRules([{ content: '', id: createRuleId('') }]);
    setScope('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      setAlert({
        type: 'error',
        message: STANDARD_MESSAGES.validation.nameRequired,
      });
      return;
    }

    if (!description.trim()) {
      setAlert({
        type: 'error',
        message: STANDARD_MESSAGES.validation.descriptionRequired,
      });
      return;
    }

    const validRules = rules.filter((rule) => rule.content.trim());

    const standardData = {
      name: name.trim(),
      description: description.trim(),
      rules: validRules.map((rule) => ({
        id: rule.id,
        content: rule.content.trim(),
      })),
      scope: scope.trim() || null,
    };

    if (mode === 'create') {
      createMutation.mutate(standardData, {
        onSuccess: (data: Standard) => {
          resetForm();
          setAlert({
            type: 'success',
            message: STANDARD_MESSAGES.success.created,
          });
          setTimeout(() => {
            setAlert(null);
            onSuccess?.(data);
          }, 2000);
        },
        onError: (error) => {
          console.error('Failed to create standard:', error);
          setAlert({
            type: 'error',
            message: STANDARD_MESSAGES.error.createFailed,
          });
        },
      });
    } else {
      if (!standard) {
        throw new Error('No standard.');
      }
      updateMutation.mutate(
        {
          id: standard.id,
          standard: standardData,
        },
        {
          onSuccess: () => {
            setAlert({
              type: 'success',
              message: STANDARD_MESSAGES.success.updated,
            });
            setTimeout(() => {
              setAlert(null);
              onSuccess?.();
            }, 2000);
          },
          onError: (error) => {
            console.error('Failed to update standard:', error);
            setAlert({
              type: 'error',
              message: STANDARD_MESSAGES.error.updateFailed,
            });
          },
        },
      );
    }
  };

  const isFormValid = name.trim() && description.trim();

  if (mode === 'edit' && rulesLoading) {
    return <PMText>Loading rules...</PMText>;
  }

  if (mode === 'edit' && rulesError) {
    return (
      <PMVStack gap={4}>
        <PMText color="error">{STANDARD_MESSAGES.error.loadRulesFailed}</PMText>
        {onCancel && (
          <PMButton variant="secondary" onClick={onCancel}>
            Cancel
          </PMButton>
        )}
      </PMVStack>
    );
  }

  return (
    <PMBox as="form" onSubmit={handleSubmit}>
      {alert && (
        <PMAlert.Root status={alert.type}>
          <PMAlert.Indicator />
          <PMAlert.Title>{alert.message}</PMAlert.Title>
        </PMAlert.Root>
      )}
      <PMVStack gap={10} alignItems={'flex-start'}>
        <PMFieldset.Root>
          <PMFieldset.Legend>
            <PMHeading level="h3">Documentation</PMHeading>
          </PMFieldset.Legend>
          <PMFieldset.Content
            border={'solid 1px'}
            borderColor="border.primary"
            p={4}
          >
            <PMField.Root required>
              <PMField.Label>
                Name
                <PMField.RequiredIndicator />
              </PMField.Label>
              <PMInput
                placeholder="Enter standard name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
              />
              <PMField.HelperText />
              <PMField.ErrorText />
            </PMField.Root>

            <PMField.Root required maxW={'100%'}>
              <PMField.Label>
                Description
                <PMField.RequiredIndicator />
              </PMField.Label>
              <PMBox width={'100%'}>
                <MarkdownEditor
                  defaultValue={description}
                  onMarkdownChange={(value: string): void => {
                    setDescription(value);
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
            <PMHeading level="h3">Rules</PMHeading>
          </PMFieldset.Legend>
          <PMFieldset.HelperText>
            List the rules that define this standard. Each rule describe what
            you should or must do (or not) to comply with the standard.
          </PMFieldset.HelperText>
          <PMFieldset.Content
            border={'solid 1px'}
            borderColor="border.primary"
            p={4}
          >
            <PMVStack gap={4} align="stretch">
              {rules.map((rule, index) => (
                <PMVStack
                  key={index}
                  align="flex-start"
                  border={'solid 1px'}
                  borderColor="border.primary"
                  p={3}
                  borderRadius="md"
                >
                  <PMField.Root>
                    <PMField.Label>{`Rule ${index + 1}`}</PMField.Label>
                    <PMTextArea
                      placeholder={`Rule ${index + 1}`}
                      value={rule.content}
                      onChange={(e) => handleRuleChange(index, e.target.value)}
                      disabled={isPending}
                      resize="none"
                      autoresize
                    />
                    <PMField.HelperText />
                    <PMField.ErrorText />
                  </PMField.Root>

                  <PMButton
                    variant="tertiary"
                    size="sm"
                    onClick={() => handleRemoveRule(index)}
                    disabled={isPending}
                  >
                    Remove
                  </PMButton>
                </PMVStack>
              ))}

              <PMButton
                variant="secondary"
                size="sm"
                onClick={handleAddRule}
                disabled={isPending}
                mb={2}
              >
                + Add Rule
              </PMButton>
            </PMVStack>
          </PMFieldset.Content>
        </PMFieldset.Root>

        <PMFieldset.Root>
          <PMFieldset.Legend>
            <PMHeading level="h3">Distribution</PMHeading>
          </PMFieldset.Legend>
          <PMFieldset.Content
            border={'solid 1px'}
            borderColor="border.primary"
            p={4}
          >
            <PMField.Root>
              <PMField.Label>Scope</PMField.Label>
              <PMInput
                placeholder="**/*.spec.ts,**/*.test.ts"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                disabled={isPending}
                title="Define which files this standard applies to using glob patterns. Leave empty to apply to all files."
              />
              <PMField.HelperText>
                Optional: Use glob patterns to target specific files (e.g.,
                **/*.spec.ts for test files, src/domain/**/* for domain folder).
                Separate multiple patterns with commas.
              </PMField.HelperText>
              <PMField.ErrorText />
            </PMField.Root>
          </PMFieldset.Content>
        </PMFieldset.Root>
      </PMVStack>

      <PMHStack
        marginTop={6}
        border={'solid 1px'}
        borderColor={'border.primary'}
        paddingY={4}
        justifyContent={'center'}
        backgroundColor={'background.secondary'}
        position={'sticky'}
        bottom={0}
      >
        <PMButton
          type="submit"
          variant="primary"
          disabled={!isFormValid || isPending}
          loading={isPending}
          size="lg"
        >
          {mode === 'create' ? 'Create' : 'Update Standard'}
        </PMButton>
        <PMButton
          variant="secondary"
          onClick={mode === 'create' ? resetForm : onCancel}
          disabled={isPending}
          size="lg"
        >
          {mode === 'create' ? 'Clear Form' : 'Cancel'}
        </PMButton>
      </PMHStack>
    </PMBox>
  );
};
