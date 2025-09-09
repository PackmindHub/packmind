import React, { useState } from 'react';
import { RuleId, ProgrammingLanguage } from '@packmind/shared/types';
import { PMVStack, PMText, PMSpinner, PMBox, PMButton } from '@packmind/ui';
import { RuleExampleItem } from '../RuleExampleItem';
import {
  useGetRuleExamplesQuery,
  useCreateRuleExampleMutation,
} from '../../api/queries';

interface RuleExamplesManagerProps {
  standardId: string;
  ruleId: RuleId;
}

export interface NewExample {
  id: string;
  lang: ProgrammingLanguage;
  positive: string;
  negative: string;
  isNew: true;
}

export const RuleExamplesManager: React.FC<RuleExamplesManagerProps> = ({
  standardId,
  ruleId,
}) => {
  const [newExamples, setNewExamples] = useState<NewExample[]>([]);
  const createRuleExampleMutation = useCreateRuleExampleMutation();

  const {
    data: existingExamples,
    isLoading,
    isError,
    error,
  } = useGetRuleExamplesQuery(standardId, ruleId);

  const handleCreateNewExample = () => {
    const newExample: NewExample = {
      id: `new-${Date.now()}-${Math.random()}`,
      lang: ProgrammingLanguage.JAVASCRIPT,
      positive: '',
      negative: '',
      isNew: true,
    };

    setNewExamples((prev) => [...prev, newExample]);
  };

  const handleSaveNewExample = async (
    newExample: NewExample,
    values: { lang: string; positive: string; negative: string },
  ) => {
    try {
      await createRuleExampleMutation.mutateAsync({
        standardId,
        ruleId,
        example: values,
      });

      // Remove the new example from local state since it's now persisted
      setNewExamples((prev) => prev.filter((ex) => ex.id !== newExample.id));
    } catch (error) {
      console.error('Failed to create new example:', error);
      throw error;
    }
  };

  const handleCancelNewExample = (newExampleId: string) => {
    setNewExamples((prev) => prev.filter((ex) => ex.id !== newExampleId));
  };

  if (isLoading) {
    return (
      <PMBox textAlign="center" py={8}>
        <PMSpinner size="lg" />
        <PMText mt={4}>Loading rule examples...</PMText>
      </PMBox>
    );
  }

  if (isError) {
    return (
      <PMBox
        p={4}
        bg="red.50"
        border="1px solid"
        borderColor="red.200"
        borderRadius="md"
      >
        <PMText color="error" variant="body-important">
          Error loading examples
        </PMText>
        <PMText color="error" variant="small" mt={1}>
          {error instanceof Error
            ? error.message
            : 'Failed to load rule examples'}
        </PMText>
      </PMBox>
    );
  }

  const hasExamples =
    (existingExamples && existingExamples.length > 0) || newExamples.length > 0;

  return (
    <PMVStack alignItems={'stretch'} gap="4" width={'full'}>
      <PMBox alignSelf="flex-start">
        <PMButton
          variant="primary"
          size="sm"
          onClick={handleCreateNewExample}
          loading={createRuleExampleMutation.isPending}
          disabled={createRuleExampleMutation.isPending}
        >
          Add Example
        </PMButton>
      </PMBox>

      {!hasExamples ? (
        <PMBox textAlign="center" py={8}>
          <PMText color="secondary">
            No examples have been added for this rule yet.
          </PMText>
        </PMBox>
      ) : (
        <PMVStack gap={4} align="stretch" width="100%">
          {/* Render new examples first (in edit mode) */}
          {newExamples.map((example) => (
            <RuleExampleItem
              key={example.id}
              example={example}
              standardId={standardId}
              ruleId={ruleId}
              isNew={true}
              onSaveNew={handleSaveNewExample}
              onCancelNew={handleCancelNewExample}
            />
          ))}

          {/* Render existing examples (newest first) */}
          {existingExamples
            ?.slice()
            .reverse()
            .map((example) => (
              <RuleExampleItem
                key={example.id}
                example={example}
                standardId={standardId}
                ruleId={ruleId}
              />
            ))}
        </PMVStack>
      )}
    </PMVStack>
  );
};
