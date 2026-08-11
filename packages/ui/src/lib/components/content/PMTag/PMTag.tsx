import { Tag as ChakraTag } from '@chakra-ui/react';
import type {
  TagRootProps,
  TagLabelProps,
  TagCloseTriggerProps,
} from '@chakra-ui/react';
import { forwardRef, type ReactNode } from 'react';

export interface PMTagProps extends TagRootProps {
  /** Content rendered inside the tag label. */
  children: ReactNode;
  /** Optional element rendered before the label (icon, avatar, status dot). */
  startElement?: ReactNode;
  /** Optional element rendered after the label, before the close trigger. */
  endElement?: ReactNode;
  /** When provided, a close button is shown and this is called on press. */
  onClose?: () => void;
  /** Accessible label for the close button. Required when `onClose` is set. */
  closeLabel?: string;
  /** Props forwarded to the label slot, e.g. `truncate`, `maxWidth`, `title`. */
  labelProps?: TagLabelProps;
  /** Props forwarded to the close trigger slot. */
  closeTriggerProps?: TagCloseTriggerProps;
}

export const PMTag = forwardRef<HTMLDivElement, PMTagProps>(function PMTag(
  {
    children,
    startElement,
    endElement,
    onClose,
    closeLabel,
    labelProps,
    closeTriggerProps,
    ...rootProps
  },
  ref,
) {
  return (
    <ChakraTag.Root ref={ref} {...rootProps}>
      {startElement ? (
        <ChakraTag.StartElement>{startElement}</ChakraTag.StartElement>
      ) : null}
      <ChakraTag.Label {...labelProps}>{children}</ChakraTag.Label>
      {endElement ? (
        <ChakraTag.EndElement>{endElement}</ChakraTag.EndElement>
      ) : null}
      {onClose ? (
        <ChakraTag.CloseTrigger
          aria-label={closeLabel}
          onClick={onClose}
          cursor="pointer"
          transition="background-color 120ms ease-out, color 120ms ease-out"
          css={{ '& svg': { boxSize: 'var(--tag-element-size)' } }}
          _hover={{ bg: 'colorPalette.muted' }}
          _disabled={{ cursor: 'not-allowed', opacity: 0.4, _hover: {} }}
          {...closeTriggerProps}
        />
      ) : null}
    </ChakraTag.Root>
  );
});
