import { ReactNode } from 'react';
import {
  PMBox,
  PMHStack,
  PMHeading,
  PMIcon,
  PMText,
  PMVStack,
} from '@packmind/ui';

// Quiet semantic chip: subtle bg, fg text, rounded-sm. Never color alone.
export function Chip({
  children,
  tone = 'neutral',
}: Readonly<{
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'brand' | 'warn';
}>) {
  const palette = {
    neutral: { bg: 'background.tertiary', fg: 'text.tertiary' },
    success: { bg: 'green.subtle', fg: 'green.fg' },
    brand: { bg: 'blue.subtle', fg: 'blue.fg' },
    warn: { bg: 'orange.subtle', fg: 'orange.fg' },
  }[tone];

  return (
    <PMBox
      bg={palette.bg}
      color={palette.fg}
      borderRadius="sm"
      paddingX={2}
      paddingY="2px"
      fontSize="xs"
      fontWeight="medium"
      flexShrink={0}
      whiteSpace="nowrap"
    >
      {children}
    </PMBox>
  );
}

// Heading for a working surface: big outcome, one supporting line.
export function StepShell({
  title,
  lead,
  children,
}: Readonly<{ title: string; lead: string; children: ReactNode }>) {
  return (
    <PMVStack gap={6} align="stretch">
      <PMVStack gap={2} align="stretch">
        <PMHeading size="lg">{title}</PMHeading>
        <PMText fontSize="sm" color="secondary" maxW="60ch">
          {lead}
        </PMText>
      </PMVStack>
      {children}
    </PMVStack>
  );
}

// Two equal-weight lanes (used by import and ship).
export function LaneGrid({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <PMBox
      display="grid"
      gridTemplateColumns={{ base: '1fr', md: '1fr 1fr' }}
      gap={4}
      alignItems="stretch"
    >
      {children}
    </PMBox>
  );
}

export function Lane({
  title,
  hint,
  children,
}: Readonly<{ title: string; hint: string; children: ReactNode }>) {
  return (
    <PMVStack
      gap={3}
      align="stretch"
      bg="background.primary"
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      padding={4}
    >
      <PMVStack gap={1} align="stretch">
        <PMText fontSize="sm" fontWeight="medium" color="primary">
          {title}
        </PMText>
        <PMText fontSize="xs" color="tertiary">
          {hint}
        </PMText>
      </PMVStack>
      {children}
    </PMVStack>
  );
}

// Compact monogram avatar. Avoids relying on PMAvatar image APIs.
export function Initials({
  initials,
  tone = 'neutral',
}: Readonly<{ initials: string; tone?: 'neutral' | 'brand' }>) {
  return (
    <PMBox
      width="26px"
      height="26px"
      borderRadius="full"
      flexShrink={0}
      display="flex"
      alignItems="center"
      justifyContent="center"
      fontSize="2xs"
      fontWeight="bold"
      bg={tone === 'brand' ? 'blue.subtle' : 'background.tertiary'}
      color={tone === 'brand' ? 'blue.fg' : 'text.tertiary'}
    >
      {initials}
    </PMBox>
  );
}

// A single skill line: name, agent + file count, optional trailing slot.
export function SkillRow({
  name,
  description,
  agent,
  files,
  sourceChip,
  trailing,
}: Readonly<{
  name: string;
  description: string;
  agent: string;
  files: number;
  sourceChip?: ReactNode;
  trailing?: ReactNode;
}>) {
  return (
    <PMHStack
      gap={3}
      align="center"
      bg="background.primary"
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      paddingY={2}
      paddingX={3}
    >
      <PMIcon fontSize="md" color="text.faded">
        <SkillGlyph />
      </PMIcon>
      <PMVStack gap={0} align="stretch" flex={1} minW={0}>
        <PMHStack gap={2} align="center">
          <PMText fontFamily="mono" fontSize="sm" color="primary" truncate>
            {name}
          </PMText>
          {sourceChip}
        </PMHStack>
        <PMText fontSize="xs" color="tertiary" truncate>
          {description}
        </PMText>
      </PMVStack>
      <PMText fontSize="xs" color="faded" flexShrink={0}>
        {agent} · {files} {files === 1 ? 'file' : 'files'}
      </PMText>
      {trailing}
    </PMHStack>
  );
}

function SkillGlyph() {
  // Lucide "sparkles" reads as AI-slop per the brand. Use a neutral file glyph.
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
    </svg>
  );
}
