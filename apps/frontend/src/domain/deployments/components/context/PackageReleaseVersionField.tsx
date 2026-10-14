import type { KeyboardEvent, MouseEvent } from 'react';
import {
  PMButton,
  PMField,
  PMHStack,
  PMInput,
  PMText,
  PMVStack,
} from '@packmind/ui';
import type { PackageReleaseVersion } from './usePackageReleaseVersion';

/**
 * A package's next version, typed rather than picked.
 *
 * Free text with the three increments offered beside it: a masked input, a
 * stepper or a select would each rewrite what is being typed, and a version
 * mistyped on a keyboard whose comma sits where the period is expected would
 * be silently reshaped into something else. Nothing here transforms the value -
 * it is judged where it stands and kept when it is refused, so the two
 * separators are fixed rather than the whole version retyped.
 */
export function PackageReleaseVersionField({
  id,
  label = 'Version',
  release,
  disabled,
  onSubmit,
}: Readonly<{
  id: string;
  label?: string;
  release: PackageReleaseVersion;
  disabled: boolean;
  /**
   * What Enter in the field does. Absent where Enter would only be half of
   * what the form's button does, so the keyboard cannot take a shortcut the
   * pointer is not offered.
   */
  onSubmit?: () => void;
}>) {
  const { version, suggestions, refusalMessage, changeVersion, leaveVersion } =
    release;

  return (
    <PMVStack gap={3} alignItems="stretch">
      <PMField.Root required invalid={Boolean(refusalMessage)}>
        <PMField.Label htmlFor={id}>
          {label}
          <PMField.RequiredIndicator />
        </PMField.Label>
        <PMInput
          id={id}
          value={version}
          onChange={(event) => changeVersion(event.target.value)}
          onBlur={leaveVersion}
          onKeyDown={(event: KeyboardEvent) => {
            if (event.key === 'Enter' && !disabled && onSubmit) {
              onSubmit();
            }
          }}
          disabled={disabled}
          autoFocus
        />
        {refusalMessage && (
          <PMText fontSize="xs" color="error">
            {refusalMessage}
          </PMText>
        )}
      </PMField.Root>

      <PMHStack gap={2}>
        {suggestions.map((nextVersion) => (
          <PMButton
            key={nextVersion}
            variant="secondary"
            size="sm"
            disabled={disabled}
            /*
             * Without this the field blurs on mousedown, the refusal line
             * appears under it and moves the button out from under the pointer
             * before the click lands.
             */
            onMouseDown={(event: MouseEvent) => event.preventDefault()}
            onClick={() => changeVersion(nextVersion)}
          >
            {nextVersion}
          </PMButton>
        ))}
      </PMHStack>
    </PMVStack>
  );
}
