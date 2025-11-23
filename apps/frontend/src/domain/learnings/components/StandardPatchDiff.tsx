import React from 'react';
import { PMBox, PMVStack, PMHeading, PMText, PMBadge } from '@packmind/ui';

interface StandardPatchDiffProps {
  proposedChanges: {
    standardId: string;
    description?: string | null;
    rules: {
      toKeep: string[];
      toUpdate: Array<{ ruleId: string; newContent: string }>;
      toDelete: string[];
      toAdd: Array<{ content: string }>;
    };
    rationale: string;
  };
  originalStandard: {
    name: string;
    description: string;
    rules: Array<{ id: string; content: string }>;
  };
}

export const StandardPatchDiff: React.FC<StandardPatchDiffProps> = ({
  proposedChanges,
  originalStandard,
}) => {
  const { description, rules } = proposedChanges;
  const [showUnchanged, setShowUnchanged] = React.useState(false);

  const getRuleContent = (ruleId: string): string => {
    const rule = originalStandard.rules.find((r) => r.id === ruleId);
    return rule?.content || '';
  };

  return (
    <PMVStack align="stretch" gap={4}>
      {/* Rationale */}
      <PMBox p={4} bg="blue.50" borderRadius="md">
        <PMHeading size="sm" mb={2}>
          Rationale
        </PMHeading>
        <PMText fontSize="sm">{proposedChanges.rationale}</PMText>
      </PMBox>

      {/* Description Changes */}
      {description && (
        <PMBox p={4} borderWidth="1px" borderRadius="md">
          <PMHeading size="sm" mb={3}>
            📝 Description Update
          </PMHeading>
          <PMVStack align="stretch" gap={2}>
            <PMBox>
              <PMBadge colorScheme="red" mb={1}>
                Old
              </PMBadge>
              <PMText fontSize="sm">{originalStandard.description}</PMText>
            </PMBox>
            <PMBox>
              <PMBadge colorScheme="green" mb={1}>
                New
              </PMBadge>
              <PMText fontSize="sm">{description}</PMText>
            </PMBox>
          </PMVStack>
        </PMBox>
      )}

      {/* Rules to Delete */}
      {rules.toDelete.length > 0 && (
        <PMBox p={4} borderWidth="1px" borderRadius="md">
          <PMHeading size="sm" mb={3}>
            ❌ Rules to Delete ({rules.toDelete.length})
          </PMHeading>
          <PMVStack align="stretch" gap={2}>
            {rules.toDelete.map((ruleId) => (
              <PMBox key={ruleId} p={2} borderRadius="md">
                <PMText fontSize="sm" textDecoration="line-through">
                  {getRuleContent(ruleId)}
                </PMText>
              </PMBox>
            ))}
          </PMVStack>
        </PMBox>
      )}

      {/* Rules to Update */}
      {rules.toUpdate.length > 0 && (
        <PMBox p={4} borderWidth="1px" borderRadius="md">
          <PMHeading size="sm" mb={3}>
            📝 Rules to Update ({rules.toUpdate.length})
          </PMHeading>
          <PMVStack align="stretch" gap={3}>
            {rules.toUpdate.map((update) => (
              <PMBox key={update.ruleId} p={3} borderRadius="md">
                <PMVStack align="stretch" gap={2}>
                  <PMBox>
                    <PMBadge colorScheme="red" mb={1} size="sm">
                      Old
                    </PMBadge>
                    <PMText fontSize="sm">
                      {getRuleContent(update.ruleId)}
                    </PMText>
                  </PMBox>
                  <PMBox>
                    <PMBadge colorScheme="green" mb={1} size="sm">
                      New
                    </PMBadge>
                    <PMText fontSize="sm" fontWeight="medium">
                      {update.newContent}
                    </PMText>
                  </PMBox>
                </PMVStack>
              </PMBox>
            ))}
          </PMVStack>
        </PMBox>
      )}

      {/* Rules to Add */}
      {rules.toAdd.length > 0 && (
        <PMBox p={4} borderWidth="1px" borderRadius="md">
          <PMHeading size="sm" mb={3}>
            ✨ New Rules ({rules.toAdd.length})
          </PMHeading>
          <PMVStack align="stretch" gap={2}>
            {rules.toAdd.map((newRule, idx) => (
              <PMBox key={idx} p={2} borderRadius="md">
                <PMText fontSize="sm" fontWeight="medium">
                  {newRule.content}
                </PMText>
              </PMBox>
            ))}
          </PMVStack>
        </PMBox>
      )}

      {/* Unchanged Rules (Expandable) */}
      {rules.toKeep.length > 0 && (
        <PMBox>
          <PMBox
            p={4}
            borderWidth="1px"
            borderRadius="md"
            cursor="pointer"
            onClick={() => setShowUnchanged(!showUnchanged)}
          >
            <PMHeading size="sm">
              {showUnchanged ? '▼' : '▶'} Unchanged Rules (
              {rules.toKeep.length})
            </PMHeading>
          </PMBox>
          {showUnchanged && (
            <PMBox p={4} borderWidth="1px" borderRadius="md" mt={2}>
              <PMVStack align="stretch" gap={2}>
                {rules.toKeep.map((ruleId) => (
                  <PMBox key={ruleId} p={2} borderRadius="md">
                    <PMText fontSize="sm">{getRuleContent(ruleId)}</PMText>
                  </PMBox>
                ))}
              </PMVStack>
            </PMBox>
          )}
        </PMBox>
      )}
    </PMVStack>
  );
};
