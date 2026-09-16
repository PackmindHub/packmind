import {
  PMField,
  PMFeatureFlag,
  PMPageSection,
  PMSwitch,
  PMVStack,
} from '@packmind/ui';
import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  SPACE_NAV_PLUGIN_FIRST_FEATURE_KEY,
} from '@packmind/feature-flags';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useSpaceNavMode } from './SpaceNavModeContext';

/**
 * Flips a space's sidebar between the current information architecture and the
 * plugin-first one. It sits on the profile page rather than in the space
 * itself because it is a preference of the person looking, not a property of
 * the space: the mode applies to every space at once, and a teammate opening
 * the same space sees their own choice.
 *
 * It used to sit in the sidebar's "You" section, which only rendered it while
 * the sidebar was expanded. The collapsed sidebar's account menu never carried
 * it, so anyone working with a narrow sidebar had no way to reach the choice at
 * all. The profile page is reachable from both states.
 *
 * The flag gates this section, not the mode. `?nav=plugin-first` keeps working
 * for anyone, which is what makes a demo link portable.
 */
export function SpaceNavModeSection() {
  const { user } = useAuthContext();
  const { mode, setMode } = useSpaceNavMode();

  return (
    <PMFeatureFlag
      featureKeys={[SPACE_NAV_PLUGIN_FIRST_FEATURE_KEY]}
      featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
      userEmail={user?.email}
    >
      {/*
        `title` rather than `titleComponent`: the section already wraps whatever
        it is given in a heading, so handing it one nests an `h3` inside an
        `h3`. Several sections elsewhere still do exactly that.
      */}
      <PMPageSection backgroundColor="primary" title="Navigation">
        <PMVStack align="stretch" gap={5} pt={4} w="lg">
          <PMField.Root>
            <PMSwitch
              size="sm"
              colorPalette="blue"
              checked={mode === 'plugin-first'}
              onCheckedChange={(details) =>
                setMode(details.checked ? 'plugin-first' : 'today')
              }
              /*
               * On the hidden input rather than on the root: the root is the
               * `<label>`, so naming it there leaves the checkbox itself
               * unnamed and a screen reader announces nothing. It repeats the
               * visible label word for word, so the accessible name and the
               * name a person reads out loud are the same string.
               */
              inputProps={{ 'aria-label': 'New navigation' }}
            >
              New navigation
            </PMSwitch>
            <PMField.HelperText>
              Replaces the per-object entries of a space with Context,
              Distribution and Review changes. The choice applies to this
              browser, on every space at once.
            </PMField.HelperText>
          </PMField.Root>
        </PMVStack>
      </PMPageSection>
    </PMFeatureFlag>
  );
}
