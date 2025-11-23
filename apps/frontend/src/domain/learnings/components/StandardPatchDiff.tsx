import React from 'react';
import { PMBox, PMVStack, PMHeading, PMText, PMBadge } from '@packmind/ui';
import * as Diff from 'diff';

// Character-level diff highlighting in separate blocks
const renderInlineDiff = (oldText: string, newText: string) => {
  const diff = Diff.diffChars(oldText, newText);

  const removedParts: string[] = [];
  const addedParts: string[] = [];
  const unchangedParts: string[] = [];

  diff.forEach((part) => {
    if (part.removed) {
      removedParts.push(part.value);
    } else if (part.added) {
      addedParts.push(part.value);
    } else {
      unchangedParts.push(part.value);
    }
  });

  return (
    <PMVStack align="stretch" gap={2}>
      {/* Old text with removed parts highlighted */}
      <PMBox>
        <PMBadge mb={1}>Old</PMBadge>
        <PMText>
          {diff.map((part, index) => {
            if (part.removed) {
              return (
                <PMBox
                  key={index}
                  as="span"
                  bg="red.100"
                  textDecoration="line-through"
                  px={0.5}
                >
                  {part.value}
                </PMBox>
              );
            }
            if (part.added) {
              return null;
            }
            return <span key={index}>{part.value}</span>;
          })}
        </PMText>
      </PMBox>

      {/* New text with added parts highlighted */}
      <PMBox>
        <PMBadge mb={1}>New</PMBadge>
        <PMText>
          {diff.map((part, index) => {
            if (part.added) {
              return (
                <PMBox key={index} as="span" bg="green.100" px={0.5}>
                  {part.value}
                </PMBox>
              );
            }
            if (part.removed) {
              return null;
            }
            return <span key={index}>{part.value}</span>;
          })}
        </PMText>
      </PMBox>
    </PMVStack>
  );
};

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
      <PMBox p={4} borderWidth="1px">
        <PMHeading size="sm" mb={2}>
          Rationale
        </PMHeading>
        <PMText>{proposedChanges.rationale}</PMText>
      </PMBox>

      {/* Description Changes */}
      {description && (
        <PMBox p={4} borderWidth="1px">
          <PMHeading size="sm" mb={3}>
            📝 Description Update
          </PMHeading>
          <PMText>
            {renderInlineDiff(originalStandard.description, description)}
          </PMText>
        </PMBox>
      )}

      {/* Rules to Delete */}
      {rules.toDelete.length > 0 && (
        <PMBox p={4} borderWidth="1px">
          <PMHeading size="sm" mb={3}>
            ❌ Rules to Delete ({rules.toDelete.length})
          </PMHeading>
          <PMVStack align="stretch" gap={2}>
            {rules.toDelete.map((ruleId) => (
              <PMBox key={ruleId} display="flex" gap={2}>
                <PMText>•</PMText>
                <PMText textDecoration="line-through">
                  {getRuleContent(ruleId)}
                </PMText>
              </PMBox>
            ))}
          </PMVStack>
        </PMBox>
      )}

      {/* Rules to Update */}
      {rules.toUpdate.length > 0 && (
        <PMBox p={4} borderWidth="1px">
          <PMHeading size="sm" mb={3}>
            📝 Rules to Update ({rules.toUpdate.length})
          </PMHeading>
          <PMVStack align="stretch" gap={3}>
            {rules.toUpdate.map((update) => (
              <PMBox key={update.ruleId} display="flex" gap={2}>
                <PMText>•</PMText>
                <PMBox flex={1}>
                  {renderInlineDiff(
                    getRuleContent(update.ruleId),
                    update.newContent,
                  )}
                </PMBox>
              </PMBox>
            ))}
          </PMVStack>
        </PMBox>
      )}

      {/* Rules to Add */}
      {rules.toAdd.length > 0 && (
        <PMBox p={4} borderWidth="1px">
          <PMHeading size="sm" mb={3}>
            ✨ New Rules ({rules.toAdd.length})
          </PMHeading>
          <PMVStack align="stretch" gap={2}>
            {rules.toAdd.map((newRule, idx) => (
              <PMBox key={idx} display="flex" gap={2}>
                <PMText>•</PMText>
                <PMText fontWeight="medium">{newRule.content}</PMText>
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
            cursor="pointer"
            onClick={() => setShowUnchanged(!showUnchanged)}
          >
            <PMHeading size="sm">
              {showUnchanged ? '▼' : '▶'} Unchanged Rules (
              {rules.toKeep.length})
            </PMHeading>
          </PMBox>
          {showUnchanged && (
            <PMBox p={4} borderWidth="1px" mt={2}>
              <PMVStack align="stretch" gap={2}>
                {rules.toKeep.map((ruleId) => (
                  <PMBox key={ruleId} display="flex" gap={2}>
                    <PMText>•</PMText>
                    <PMText>{getRuleContent(ruleId)}</PMText>
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
