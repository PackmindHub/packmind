import { PMBox, PMIcon, PMLink, PMText, PMTooltip } from '@packmind/ui';
import type { ComponentType } from 'react';
import { TiWarningOutline } from 'react-icons/ti';

type StandardDetailsNavEntryProps<TValue extends string> = {
  label:
    | string
    | {
        type: 'icon-text';
        icon: ComponentType;
        text: string;
        gap?: number;
      }
    | {
        type: 'rule-entry';
        content: string;
        hasWipStatus: boolean;
      };
  value: TValue;
  isActive: boolean;
  onSelect: (value: TValue) => void;
  tooltipLabel?: string;
  isTruncated?: boolean;
};

export const StandardDetailsNavEntry = <TValue extends string>({
  label,
  value,
  isActive,
  onSelect,
  tooltipLabel,
  isTruncated,
}: StandardDetailsNavEntryProps<TValue>) => {
  const fontWeight = isActive ? 'bold' : 'medium';
  const textTruncationProps = isTruncated
    ? {
        overflow: 'hidden' as const,
        textOverflow: 'ellipsis' as const,
        whiteSpace: 'nowrap' as const,
      }
    : {};

  const entry = (
    <PMLink
      variant="navbar"
      data-active={isActive ? 'true' : undefined}
      as="button"
      onClick={() => onSelect(value)}
      width="full"
      textAlign="left"
      py={2}
      type="button"
      display="flex"
      alignItems="center"
      textDecoration="none"
      {...(isTruncated ? { overflow: 'hidden' as const } : {})}
      fontWeight={fontWeight}
      _hover={{ fontWeight, textDecoration: 'none' }}
      _focus={{ outline: 'none', boxShadow: 'none' }}
      _focusVisible={{ outline: 'none', boxShadow: 'none' }}
    >
      {typeof label === 'string' ? (
        <PMText
          width="full"
          fontSize="sm"
          fontWeight={fontWeight}
          {...textTruncationProps}
        >
          {label}
        </PMText>
      ) : label.type === 'icon-text' ? (
        <PMText
          width="full"
          fontSize="sm"
          fontWeight={fontWeight}
          display="inline-flex"
          alignItems="center"
          gap={label.gap ?? 2}
          {...textTruncationProps}
        >
          <PMIcon as="span" display="inline-flex">
            <label.icon />
          </PMIcon>
          {label.text}
        </PMText>
      ) : label.type === 'rule-entry' ? (
        <PMLink
          as="span"
          width="full"
          display="inline-flex"
          alignItems="center"
          columnGap={label.hasWipStatus ? 2 : 0}
          overflow="hidden"
          textDecoration="none"
        >
          {label.hasWipStatus ? (
            <PMIcon
              as="span"
              display="inline-flex"
              color="text.warning"
              data-testid="rule-wip-icon"
            >
              <TiWarningOutline />
            </PMIcon>
          ) : null}
          <PMText
            flex="1"
            fontSize="sm"
            fontWeight={fontWeight}
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {label.content}
          </PMText>
        </PMLink>
      ) : null}
    </PMLink>
  );

  if (!tooltipLabel) {
    return entry;
  }

  return (
    <PMTooltip label={tooltipLabel} placement="top-start">
      {entry}
    </PMTooltip>
  );
};
