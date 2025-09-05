import React, { useState, useEffect } from 'react';
import { PMBox, PMVStack, PMHStack } from '@packmind/ui';
import { PMButton, PMInput, PMTextArea, PMText } from '@packmind/ui';
import {
  useUpdateStandardMutation,
  useGetRulesByStandardIdQuery,
} from '../api/queries/StandardsQueries';
import { Standard } from '@packmind/standards/types';
import { STANDARD_MESSAGES } from '../constants/messages';

interface Rule {
  content: string;
}

interface EditStandardProps {
  standard: Standard;
  onCancel: () => void;
  onSuccess: () => void;
  orgSlug?: string;
}

export const EditStandard: React.FC<EditStandardProps> = ({
  standard,
  onCancel,
  onSuccess,
}) => {
  const [name, setName] = useState(standard.name);
  const [description, setDescription] = useState(standard.description);
  const [rules, setRules] = useState<Rule[]>([]);
  const [scope, setScope] = useState(standard.scope || '');

  const { mutate, isPending } = useUpdateStandardMutation();
  const {
    data: fetchedRules,
    isLoading: rulesLoading,
    isError: rulesError,
  } = useGetRulesByStandardIdQuery(standard.id);

  // Initialize rules from fetched data
  useEffect(() => {
    if (fetchedRules && fetchedRules.length > 0) {
      setRules(fetchedRules.map((rule) => ({ content: rule.content })));
    } else if (!rulesLoading && !rulesError) {
      // If no rules found and not loading, initialize with empty rule
      setRules([{ content: '' }]);
    }
  }, [fetchedRules, rulesLoading, rulesError]);

  const handleAddRule = () => {
    setRules([...rules, { content: '' }]);
  };

  const handleRemoveRule = (index: number) => {
    if (rules.length > 1) {
      setRules(rules.filter((_, i) => i !== index));
    }
  };

  const handleRuleChange = (index: number, content: string) => {
    const newRules = [...rules];
    newRules[index] = { content };
    setRules(newRules);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      alert(STANDARD_MESSAGES.validation.nameRequired);
      return;
    }

    if (!description.trim()) {
      alert(STANDARD_MESSAGES.validation.descriptionRequired);
      return;
    }

    const validRules = rules.filter((rule) => rule.content.trim());
    if (validRules.length === 0) {
      alert(STANDARD_MESSAGES.validation.rulesRequired);
      return;
    }

    mutate(
      {
        id: standard.id,
        standard: {
          name: name.trim(),
          description: description.trim(),
          rules: validRules.map((rule) => ({ content: rule.content.trim() })),
          scope: scope.trim() || null,
        },
      },
      {
        onSuccess: () => {
          console.log(STANDARD_MESSAGES.success.updated);
          onSuccess();
        },
        onError: (error) => {
          console.error('Failed to update standard:', error);
          alert(STANDARD_MESSAGES.error.updateFailed);
        },
      },
    );
  };

  const isFormValid =
    name.trim() &&
    description.trim() &&
    rules.some((rule) => rule.content.trim());

  if (rulesLoading) {
    return (
      <PMBox maxW="600px" mx="auto" p={6}>
        <PMText size="xl" mb={6}>
          Edit Standard
        </PMText>
        <PMText>Loading rules...</PMText>
      </PMBox>
    );
  }

  if (rulesError) {
    return (
      <PMBox maxW="600px" mx="auto" p={6}>
        <PMText size="xl" mb={6}>
          Edit Standard
        </PMText>
        <PMText color="error">Failed to load rules. Please try again.</PMText>
        <PMButton variant="secondary" onClick={onCancel} mt={4}>
          Cancel
        </PMButton>
      </PMBox>
    );
  }

  return (
    <PMBox maxW="600px" mx="auto" p={6}>
      <PMText size="xl" mb={6}>
        Edit Standard
      </PMText>

      <form onSubmit={handleSubmit}>
        <PMVStack gap={6} align="stretch">
          <PMBox>
            <PMText mb={2}>Name *</PMText>
            <PMInput
              placeholder="Enter standard name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
          </PMBox>

          <PMBox>
            <PMText mb={2}>Description *</PMText>
            <PMTextArea
              placeholder="Enter standard description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
              rows={3}
            />
          </PMBox>

          <PMBox>
            <PMText mb={2}>Scope</PMText>
            <PMInput
              placeholder="**/*.spec.ts,**/*.test.ts"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              disabled={isPending}
              title="Define which files this standard applies to using glob patterns. Leave empty to apply to all files."
            />
            <PMText size="sm" color="gray.600" mt={1}>
              Optional: Use glob patterns to target specific files (e.g.,
              **/*.spec.ts for test files, src/domain/**/* for domain folder).
              Separate multiple patterns with commas.
            </PMText>
          </PMBox>

          <PMBox>
            <PMHStack justify="space-between" mb={3}>
              <PMText>Rules *</PMText>
              <PMButton
                variant="outline"
                size="sm"
                onClick={handleAddRule}
                disabled={isPending}
              >
                Add Rule
              </PMButton>
            </PMHStack>

            <PMVStack gap={3} align="stretch">
              {rules.map((rule, index) => (
                <PMHStack key={index} align="flex-start">
                  <PMTextArea
                    placeholder={`Rule ${index + 1}`}
                    value={rule.content}
                    onChange={(e) => handleRuleChange(index, e.target.value)}
                    disabled={isPending}
                    rows={2}
                  />
                  {rules.length > 1 && (
                    <PMButton
                      variant="outline"
                      colorScheme="red"
                      size="sm"
                      onClick={() => handleRemoveRule(index)}
                      disabled={isPending}
                    >
                      Remove
                    </PMButton>
                  )}
                </PMHStack>
              ))}
            </PMVStack>
          </PMBox>

          <PMHStack gap={3}>
            <PMButton
              type="submit"
              variant="primary"
              disabled={!isFormValid || isPending}
              loading={isPending}
            >
              Update Standard
            </PMButton>
            <PMButton
              variant="secondary"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </PMButton>
          </PMHStack>
        </PMVStack>
      </form>
    </PMBox>
  );
};
