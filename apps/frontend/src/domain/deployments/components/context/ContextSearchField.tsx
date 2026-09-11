import { PMBox, PMIcon, PMInput } from '@packmind/ui';
import { LuSearch } from 'react-icons/lu';

/**
 * The one search field of this surface: the rail looks for packages with it,
 * and a package's own list looks inside itself with it.
 *
 * Extracted the day the second one appeared, for the reason the component list
 * was: the magnifier is an absolutely positioned box over a field that has to
 * make room for it, and two copies of that would be two fields that drift
 * apart by a few pixels of padding.
 */
export function ContextSearchField({
  label,
  value,
  onChange,
}: Readonly<{
  /** Placeholder and accessible name, which say the same thing here. */
  label: string;
  value: string;
  onChange: (value: string) => void;
}>) {
  return (
    <PMBox position="relative" minW={0}>
      <PMBox
        position="absolute"
        left="10px"
        top="50%"
        transform="translateY(-50%)"
        // The step the placeholder beside it now uses. Left at `text.faded` the
        // magnifier read as dimmer than the words it labels, and the two
        // stopped looking like one control.
        color="text.tertiary"
        pointerEvents="none"
        display="flex"
        alignItems="center"
        // PMInput is itself positioned and opaque, and it comes after this box
        // in the DOM, so without a layer of its own the magnifier is painted
        // over and the field looks like it lost its icon.
        zIndex={1}
      >
        <PMIcon fontSize="sm">
          <LuSearch />
        </PMIcon>
      </PMBox>
      <PMInput
        size="sm"
        paddingLeft="32px"
        placeholder={label}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </PMBox>
  );
}
