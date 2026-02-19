import { ReactNode } from 'react';
import { PMBadge, PMHStack, PMText, PMVStack } from '@packmind/ui';
import { LuChevronDown, LuChevronRight } from 'react-icons/lu';

interface CollapsiblePoolSectionProps {
  label: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  colorPalette: string;
  children: ReactNode;
}

export function CollapsiblePoolSection({
  label,
  count,
  isOpen,
  onToggle,
  colorPalette,
  children,
}: CollapsiblePoolSectionProps) {
  return (
    <PMVStack gap={2} width="full">
      <PMHStack
        gap={1}
        align="center"
        width="full"
        cursor="pointer"
        onClick={onToggle}
        role="button"
        aria-expanded={isOpen}
      >
        {isOpen ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
        <PMText
          fontSize="xs"
          fontWeight="bold"
          color="secondary"
          textTransform="uppercase"
        >
          {label}
        </PMText>
        <PMBadge colorPalette={colorPalette} size="sm">
          {count}
        </PMBadge>
      </PMHStack>
      {isOpen && (
        <PMVStack gap={1} width="full">
          {children}
        </PMVStack>
      )}
    </PMVStack>
  );
}
