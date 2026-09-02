import { PMBox, PMFeatureFlag, PMHStack, PMIcon, PMSwitch } from '@packmind/ui';
import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  SPACE_NAV_PLUGIN_FIRST_FEATURE_KEY,
} from '@packmind/feature-flags';
import { LuLayers } from 'react-icons/lu';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useSpaceNavMode } from './SpaceNavModeContext';

/**
 * Flips a space's sidebar between the current information architecture and the
 * plugin-first one. It sits under "You" rather than in the space itself because
 * it is a preference of the person looking, not a property of the space: the
 * mode applies to every space at once, and a teammate opening the same space
 * sees their own choice.
 *
 * The flag gates this switch, not the mode. `?nav=plugin-first` keeps working
 * for anyone, which is what makes a demo link portable.
 */
export function SpaceNavModeSwitch() {
  const { user } = useAuthContext();
  const { mode, setMode } = useSpaceNavMode();

  return (
    <PMFeatureFlag
      featureKeys={[SPACE_NAV_PLUGIN_FIRST_FEATURE_KEY]}
      featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
      userEmail={user?.email}
    >
      {/*
        Styled off the "Log out" row rather than off `SidebarNavigationLink`:
        this is not a destination, so it gets the shape of the section's other
        non-link entry. `text.secondary` is set here as a Chakra prop for the
        same reason the neighbouring row does it — the semantic names `PMText`
        accepts do not include a step this quiet.
      */}
      <PMHStack
        width="full"
        paddingX={2}
        paddingY={1}
        gap={0}
        fontSize="xs"
        color="text.secondary"
        justifyContent="space-between"
      >
        <PMHStack gap={0} minW={0}>
          <PMIcon mr={2}>
            <LuLayers />
          </PMIcon>
          <PMBox as="span" minW={0} truncate>
            New navigation
          </PMBox>
        </PMHStack>
        <PMSwitch
          size="sm"
          colorPalette="blue"
          checked={mode === 'plugin-first'}
          onCheckedChange={(details) =>
            setMode(details.checked ? 'plugin-first' : 'today')
          }
          /*
           * On the hidden input rather than on the root: the root is the
           * `<label>`, so naming it there leaves the checkbox itself unnamed
           * and a screen reader announces nothing.
           */
          inputProps={{ 'aria-label': 'Use the new navigation' }}
        />
      </PMHStack>
    </PMFeatureFlag>
  );
}
