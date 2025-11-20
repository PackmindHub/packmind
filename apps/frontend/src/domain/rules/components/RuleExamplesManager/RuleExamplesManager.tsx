import React, { useState, useCallback, useRef } from 'react';
import {
  OrganizationId,
  ProgrammingLanguage,
  RuleId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { PMVStack, PMText, PMSpinner, PMBox, PMButton } from '@packmind/ui';
import { RuleExampleItem } from '../RuleExampleItem';
import {
  useGetRuleExamplesQuery,
  useCreateRuleExampleMutation,
} from '../../api/queries';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';

interface RuleExamplesManagerProps {
  standardId: string;
  ruleId: RuleId;
  selectedLanguage: string;
  forceCreate?: boolean;
  onLanguageChange?: (lang: ProgrammingLanguage) => void;
  onCancelCreation?: () => void;
  allowLanguageSelection?: boolean;
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
  selectedLanguage,
  forceCreate = false,
  onLanguageChange,
  onCancelCreation,
  allowLanguageSelection = false,
}) => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const [newExamples, setNewExamples] = useState<NewExample[]>([]);
  const createRuleExampleMutation = useCreateRuleExampleMutation();
  const previousForceCreateRef = useRef(false);

  const {
    data: existingExamples,
    isLoading,
    isError,
    error,
  } = useGetRuleExamplesQuery(
    organization?.id as OrganizationId,
    spaceId as SpaceId,
    standardId as StandardId,
    ruleId,
  );

  const handleCreateNewExample = useCallback(() => {
    const newExample: NewExample = {
      id: `new-${Date.now()}-${Math.random()}`,
      lang: selectedLanguage as ProgrammingLanguage,
      positive: '',
      negative: '',
      isNew: true,
    };

    setNewExamples((prev) => [...prev, newExample]);
  }, [selectedLanguage]);

  // Automatically trigger creation when forceCreate becomes true
  React.useEffect(() => {
    if (forceCreate && !previousForceCreateRef.current) {
      handleCreateNewExample();
    }
    previousForceCreateRef.current = forceCreate;
  }, [forceCreate, handleCreateNewExample]);

  // Update the language of new examples when selectedLanguage changes in forceCreate mode
  React.useEffect(() => {
    if (forceCreate && newExamples.length > 0) {
      setNewExamples((prev) =>
        prev.map((example) => ({
          ...example,
          lang: selectedLanguage as ProgrammingLanguage,
        })),
      );
    }
  }, [selectedLanguage, forceCreate, newExamples.length]);

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
    if (onCancelCreation) {
      onCancelCreation();
    }
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

  const filteredExistingExamples = existingExamples?.filter(
    (ex) => ex.lang === selectedLanguage,
  );

  const filteredNewExamples = newExamples.filter(
    (ex) => ex.lang === selectedLanguage || forceCreate,
  );

  const hasExamples =
    (filteredExistingExamples && filteredExistingExamples.length > 0) ||
    filteredNewExamples.length > 0;

  return (
    <PMVStack alignItems={'stretch'} gap="4" width={'full'}>
      {!forceCreate && (
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
      )}

      {!hasExamples && !forceCreate ? (
        <PMBox textAlign="center" py={8}>
          <PMText color="secondary">
            No examples have been added for this rule yet.
          </PMText>
        </PMBox>
      ) : (
        <PMVStack gap={4} align="stretch" width="100%">
          {/* Render new examples first (in edit mode) */}
          {filteredNewExamples.map((example) => (
            <RuleExampleItem
              key={example.id}
              example={example}
              standardId={standardId}
              ruleId={ruleId}
              isNew={true}
              onSaveNew={handleSaveNewExample}
              onCancelNew={handleCancelNewExample}
              allowLanguageSelection={allowLanguageSelection}
              onLanguageChange={onLanguageChange}
            />
          ))}

          {/* Render existing examples (newest first) */}
          {filteredExistingExamples
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
