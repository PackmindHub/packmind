import { PMBox, PMText } from '@packmind/ui';

export function ReviewedSectionDivider({ count }: { count: number }) {
  return (
    <PMBox display="flex" alignItems="center" gap={3} py={2}>
      <PMBox flex={1} height="1px" bg="border.tertiary" />
      <PMText fontSize="xs" fontWeight="semibold" color="secondary">
        Reviewed ({count})
      </PMText>
      <PMBox flex={1} height="1px" bg="border.tertiary" />
    </PMBox>
  );
}
