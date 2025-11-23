import React from 'react';
import { PMBox, PMVStack, PMHeading, PMText, PMBadge } from '@packmind/ui';
import * as Diff from 'diff';

// Word-level diff highlighting in separate blocks
const renderInlineDiff = (oldText: string, newText: string) => {
  const diff = Diff.diffWords(oldText, newText);

  // Merge consecutive parts, including whitespace between same-type changes
  const mergedDiff: Array<{
    added?: boolean;
    removed?: boolean;
    value: string;
  }> = [];

  let i = 0;
  while (i < diff.length) {
    const part = diff[i];
    const partType = part.added
      ? 'added'
      : part.removed
        ? 'removed'
        : 'unchanged';

    if (partType === 'added' || partType === 'removed') {
      // Start accumulating this type
      let accumulated = part.value;
      let j = i + 1;

      // Look ahead and merge same-type parts
      // When accumulating 'added', we include whitespace and skip over 'removed' parts
      // (and vice versa) since they appear in different views
      const oppositeType = partType === 'added' ? 'removed' : 'added';

      while (j < diff.length) {
        const nextPart = diff[j];
        const nextType = nextPart.added
          ? 'added'
          : nextPart.removed
            ? 'removed'
            : 'unchanged';

        if (nextType === partType) {
          // Same type, merge it
          accumulated += nextPart.value;
          j++;
        } else if (
          nextType === oppositeType ||
          (nextType === 'unchanged' && /^[\s,.;:]+$/.test(nextPart.value))
        ) {
          // It's either the opposite type or whitespace/punctuation
          // Look ahead to see if our type continues
          let k = j + 1;
          let foundSameType = false;

          while (k < diff.length) {
            const peekPart = diff[k];
            const peekType = peekPart.added
              ? 'added'
              : peekPart.removed
                ? 'removed'
                : 'unchanged';

            if (peekType === partType) {
              // Found same type ahead
              foundSameType = true;
              break;
            } else if (
              peekType !== oppositeType &&
              (peekType !== 'unchanged' || !/^[\s,.;:]+$/.test(peekPart.value))
            ) {
              // Hit non-whitespace/punctuation unchanged content, stop looking
              break;
            }
            k++;
          }

          if (foundSameType) {
            // Include only whitespace between j and k (skip opposite type words)
            while (j < k) {
              const partToInclude = diff[j];
              const partToIncludeType = partToInclude.added
                ? 'added'
                : partToInclude.removed
                  ? 'removed'
                  : 'unchanged';

              // Only include whitespace, not opposite-type words
              if (partToIncludeType === 'unchanged') {
                accumulated += partToInclude.value;
              }
              j++;
            }
          } else {
            // No more of same type found, stop here
            break;
          }
        } else {
          // Hit non-whitespace unchanged content, stop
          break;
        }
      }

      mergedDiff.push({
        added: partType === 'added',
        removed: partType === 'removed',
        value: accumulated,
      });
      i = j;
    } else {
      // Unchanged part
      mergedDiff.push({
        value: part.value,
      });
      i++;
    }
  }

  return (
    <PMVStack align="stretch" gap={2}>
      {/* Old text with removed parts highlighted */}
      <PMBox>
        <PMBadge mb={1}>Old</PMBadge>
        <PMText>
          {mergedDiff.map((part, index) => {
            if (part.removed) {
              return (
                <PMBox
                  key={index}
                  as="span"
                  bg="red.800"
                  color="red.200"
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
          {mergedDiff.map((part, index) => {
            if (part.added) {
              return (
                <PMBox
                  key={index}
                  as="span"
                  bg="green.800"
                  color="green.200"
                  px={0.5}
                >
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
