import { PMIcon, PMLink, PMText } from '@packmind/ui';
import type { ComponentType } from 'react';
import { NavLink } from 'react-router';

interface ISkillDetailsNavEntryProps<TValue extends string> {
  label: {
    icon: ComponentType;
    text: string;
    gap?: number;
  };
  value: TValue;
  isActive: boolean;
  onSelect: (value: TValue) => void;
  url?: string;
}

export const SkillDetailsNavEntry = <TValue extends string>({
  label,
  value,
  isActive,
  onSelect,
  url,
}: ISkillDetailsNavEntryProps<TValue>) => {
  const fontWeight = isActive ? 'bold' : 'medium';

  const renderLabel = () => (
    <PMText
      width="full"
      fontSize="sm"
      fontWeight={fontWeight}
      display="inline-flex"
      alignItems="center"
      gap={label.gap ?? 2}
    >
      <PMIcon as="span" display="inline-flex">
        <label.icon />
      </PMIcon>
      {label.text}
    </PMText>
  );

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
  };

  if (url) {
    return (
      <NavLink to={url} prefetch="intent" onClick={() => onSelect(value)}>
        <PMLink as="span" {...commonProps}>
          {renderLabel()}
        </PMLink>
      </NavLink>
    );
  }

  return (
    <PMLink
      as="button"
      type="button"
      onClick={() => onSelect(value)}
      {...commonProps}
    >
      {renderLabel()}
    </PMLink>
  );
};
