import { PMHStack, PMText } from '@packmind/ui';

export function DiffSectionSeparator() {
  return (
    <PMHStack justify="center" py={1}>
      <PMText
        fontSize="sm"
        color="fg.muted"
        fontFamily="mono"
        letterSpacing="wider"
        userSelect="none"
      >
        ···
      </PMText>
    </PMHStack>
  );
}
