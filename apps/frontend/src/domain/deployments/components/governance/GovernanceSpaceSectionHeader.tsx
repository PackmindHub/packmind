import { PMBox, PMHStack, PMStatus, PMText } from '@packmind/ui';
import { getSpaceColorPalette } from '../../../organizations/components/sidebar/SpaceNavBlock';

const CARD_INSET = 5;

interface GovernanceSpaceSectionHeaderProps {
  spaceName: string;
  behindCount: number;
  packageCount: number;
}

export function GovernanceSpaceSectionHeader({
  spaceName,
  behindCount,
  packageCount,
}: Readonly<GovernanceSpaceSectionHeaderProps>) {
  const colorPalette = getSpaceColorPalette(spaceName);

  return (
    <PMBox
      paddingX={CARD_INSET}
      paddingY={2.5}
      bg="background.secondary"
      borderTopWidth="1px"
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      _first={{ borderTopWidth: 0 }}
      position="sticky"
      top={0}
      zIndex={1}
    >
      <PMHStack gap={2} align="center" justify="space-between">
        <PMHStack gap={2} align="center" minW={0}>
          <PMStatus.Root colorPalette={colorPalette} as="span">
            <PMStatus.Indicator />
          </PMStatus.Root>
          <PMText
            fontSize="sm"
            fontWeight="semibold"
            color="primary"
            truncate
            minW={0}
          >
            {spaceName}
          </PMText>
        </PMHStack>
        <PMText
          fontSize="xs"
          color="faded"
          fontVariantNumeric="tabular-nums"
          flexShrink={0}
        >
          {behindCount} {behindCount === 1 ? 'distribution' : 'distributions'}{' '}
          behind in {packageCount} {packageCount === 1 ? 'package' : 'packages'}
        </PMText>
      </PMHStack>
    </PMBox>
  );
}
