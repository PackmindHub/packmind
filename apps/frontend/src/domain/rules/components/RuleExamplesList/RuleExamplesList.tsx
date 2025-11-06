import React from 'react';
import { RuleId } from '@packmind/types';
import { PMVStack, PMText, PMSpinner, PMBox } from '@packmind/ui';
import { RuleExampleItem } from '../RuleExampleItem';
import { useGetRuleExamplesQuery } from '../../api/queries';

interface RuleExamplesListProps {
  standardId: string;
  ruleId: RuleId;
}

export const RuleExamplesList: React.FC<RuleExamplesListProps> = ({
  standardId,
  ruleId,
}) => {
  const {
    data: examples,
    isLoading,
    isError,
    error,
  } = useGetRuleExamplesQuery(standardId, ruleId);

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

  if (!examples || examples.length === 0) {
    return (
      <PMBox textAlign="center" py={8}>
        <PMText color="secondary">
          No examples have been added for this rule yet.
        </PMText>
      </PMBox>
    );
  }

  return (
    <PMVStack gap={4} align="stretch" width="100%" marginTop="4">
      {examples.map((example) => (
        <RuleExampleItem
          key={example.id}
          example={example}
          standardId={standardId}
          ruleId={ruleId}
        />
      ))}
    </PMVStack>
  );
};
