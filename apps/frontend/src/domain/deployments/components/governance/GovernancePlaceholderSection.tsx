import { PMBadge, PMHeading, PMHStack, PMText, PMVStack } from '@packmind/ui';

interface GovernancePlaceholderSectionProps {
  label: string;
  tagline: string;
}

export function GovernancePlaceholderSection({
  label,
  tagline,
}: Readonly<GovernancePlaceholderSectionProps>) {
  return (
    <PMVStack align="stretch" gap={2}>
      <PMHStack justify="space-between" align="baseline">
        <PMHeading
          level="h2"
          color="faded"
          fontSize="xs"
          fontWeight="medium"
          textTransform="uppercase"
          letterSpacing="0.08em"
        >
          {label}
        </PMHeading>
        <PMBadge size="xs" variant="subtle">
          coming soon
        </PMBadge>
      </PMHStack>
      <PMText fontSize="sm" color="tertiary">
        {tagline}
      </PMText>
    </PMVStack>
  );
}
