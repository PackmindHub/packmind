import React from 'react';
import { PMBox, PMText, PMTooltip, PMVStack } from '@packmind/ui';

interface HighlightedTextProps {
  children: React.ReactNode;
  oldValue: string;
  newValue: string;
  proposalNumbers: number[];
}

/**
 * Renders text with yellow highlight and a tooltip showing the before/after diff
 */
export function HighlightedText({
  children,
  oldValue,
  newValue,
  proposalNumbers,
}: HighlightedTextProps) {
  return (
    <PMTooltip
      label={
        <DiffTooltipContent
          oldValue={oldValue}
          newValue={newValue}
          proposalNumbers={proposalNumbers}
        />
      }
      placement="top"
    >
      <PMText
        as="span"
        bg="yellow.subtle"
        borderBottom="2px dotted"
        borderColor="yellow.emphasis"
        cursor="help"
        display="inline"
      >
        {children}
      </PMText>
    </PMTooltip>
  );
}

interface HighlightedRuleBoxProps {
  rule: { id: string; content: string };
  changeType: 'added' | 'updated' | 'deleted';
  oldContent?: string;
  proposalNumbers?: number[];
}

/**
 * Renders a rule box with visual highlighting based on change type
 */
export function HighlightedRuleBox({
  rule,
  changeType,
  oldContent,
  proposalNumbers,
}: HighlightedRuleBoxProps) {
  const borderProps = getBorderPropsForChangeType(changeType);

  const content = (
    <PMBox
      p={3}
      bg="background.tertiary"
      borderRadius="md"
      {...borderProps}
      opacity={changeType === 'deleted' ? 0.6 : 1}
    >
      <PMText
        fontSize="sm"
        textDecoration={changeType === 'deleted' ? 'line-through' : 'none'}
      >
        {rule.content}
      </PMText>
    </PMBox>
  );

  if (changeType === 'updated' && oldContent && proposalNumbers) {
    return (
      <PMTooltip
        label={
          <DiffTooltipContent
            oldValue={oldContent}
            newValue={rule.content}
            proposalNumbers={proposalNumbers}
          />
        }
        placement="left"
      >
        <PMBox cursor="help">{content}</PMBox>
      </PMTooltip>
    );
  }

  if (changeType === 'added' && proposalNumbers) {
    return (
      <PMTooltip
        label={
          <PMVStack gap={2} maxWidth="300px" alignItems="flex-start">
            <PMText fontSize="xs" color="secondary">
              Added by proposal{proposalNumbers.length > 1 ? 's' : ''} #
              {proposalNumbers.join(', #')}
            </PMText>
          </PMVStack>
        }
        placement="left"
      >
        <PMBox cursor="help">{content}</PMBox>
      </PMTooltip>
    );
  }

  if (changeType === 'deleted' && proposalNumbers) {
    return (
      <PMTooltip
        label={
          <PMVStack gap={2} maxWidth="300px" alignItems="flex-start">
            <PMText fontSize="xs" color="secondary">
              Deleted by proposal{proposalNumbers.length > 1 ? 's' : ''} #
              {proposalNumbers.join(', #')}
            </PMText>
          </PMVStack>
        }
        placement="left"
      >
        <PMBox cursor="help">{content}</PMBox>
      </PMTooltip>
    );
  }

  return content;
}

function getBorderPropsForChangeType(
  changeType: 'added' | 'updated' | 'deleted',
) {
  switch (changeType) {
    case 'added':
      return {
        borderLeft: '4px solid',
        borderColor: 'yellow.emphasis',
      };
    case 'updated':
      return {
        border: '2px solid',
        borderColor: 'yellow.emphasis',
      };
    case 'deleted':
      return {
        border: '2px solid',
        borderColor: 'yellow.emphasis',
      };
  }
}

interface DiffTooltipContentProps {
  oldValue: string;
  newValue: string;
  proposalNumbers: number[];
}

/**
 * Tooltip content showing before/after diff and proposal numbers
 */
function DiffTooltipContent({
  oldValue,
  newValue,
  proposalNumbers,
}: DiffTooltipContentProps) {
  return (
    <PMVStack gap={2} maxWidth="300px" alignItems="flex-start">
      <PMText fontSize="xs" fontWeight="semibold">
        Before:
      </PMText>
      <PMText fontSize="xs" color="secondary">
        {oldValue}
      </PMText>
      <PMText fontSize="xs" fontWeight="semibold">
        After:
      </PMText>
      <PMText fontSize="xs" color="secondary">
        {newValue}
      </PMText>
      <PMText fontSize="xs" color="secondary">
        Changed by proposal{proposalNumbers.length > 1 ? 's' : ''} #
        {proposalNumbers.join(', #')}
      </PMText>
    </PMVStack>
  );
}
