import { PMIcon, PMLink, PMText, PMTooltip } from '@packmind/ui';
import type { ComponentType } from 'react';
import { LuInfo } from 'react-icons/lu';
import { NavLink } from 'react-router';

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
  url?: string;
};

export const StandardDetailsNavEntry = <TValue extends string>({
  label,
  value,
  isActive,
  onSelect,
  tooltipLabel,
  isTruncated,
  url,
}: StandardDetailsNavEntryProps<TValue>) => {
  const fontWeight = isActive ? 'bold' : 'medium';
  const textTruncationProps = isTruncated
    ? {
        overflow: 'hidden' as const,
        textOverflow: 'ellipsis' as const,
        whiteSpace: 'nowrap' as const,
      }
    : {};

  const renderLabel = () => {
    if (typeof label === 'string') {
      return (
        <PMText
          width="full"
          fontSize="sm"
          fontWeight={fontWeight}
          {...textTruncationProps}
        >
          {label}
        </PMText>
      );
    }

    if (label.type === 'icon-text') {
      return (
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
      );
    }

    if (label.type === 'rule-entry') {
      return (
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
              color="text.info"
              data-testid="rule-wip-icon"
              marginRight={1}
            >
              <LuInfo />
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
      );
    }

    return null;
  };

  const commonProps = {
    variant: 'navbar' as const,
    'data-active': isActive ? 'true' : undefined,
    width: 'full' as const,
    textAlign: 'left' as const,
    py: 2,
    display: 'flex' as const,
    alignItems: 'center' as const,
    textDecoration: 'none' as const,
    fontWeight,
    _hover: { fontWeight, textDecoration: 'none' as const },
    _focus: { outline: 'none' as const, boxShadow: 'none' as const },
    _focusVisible: { outline: 'none' as const, boxShadow: 'none' as const },
    ...(isTruncated ? { overflow: 'hidden' as const } : {}),
  };

  const entry = url ? (
    <NavLink
      to={url}
      prefetch="intent"
      onClick={(e: React.MouseEvent) => {
        onSelect(value);
      }}
    >
      <PMLink as="span" {...commonProps}>
        {renderLabel()}
      </PMLink>
    </NavLink>
  ) : (
    <PMLink
      as="button"
      type="button"
      onClick={() => onSelect(value)}
      {...commonProps}
    >
      {renderLabel()}
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
