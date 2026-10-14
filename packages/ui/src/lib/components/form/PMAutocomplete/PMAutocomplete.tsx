import * as React from 'react';
import { useMemo, useState } from 'react';
import { Combobox, createListCollection } from '@chakra-ui/react';
import { LuSearchX, LuX } from 'react-icons/lu';
import { PMIcon } from '../../content/PMIcon/PMIcon';
import { PMSpinner } from '../../feedback/PMSpinner/PMSpinner';
import { PMBox } from '../../layout/PMBox/PMBox';
import { PMHStack } from '../../layout/PMHStack/PMHStack';
import { PMText } from '../../typography/PMText';
import { PMIconButton } from '../PMIconButton';

export type PMAutocompleteProps = {
  /** Suggestions for what has been typed; filtering them is the caller's job. */
  items: string[];
  /** Typed text reported on every keystroke; the input itself stays uncontrolled. */
  onInputChange: (value: string) => void;
  /** A suggestion was picked, with the mouse or Enter on a highlighted one. */
  onPick: (value: string) => void;
  /** Enter pressed with no suggestion highlighted: confirm the typed text. */
  onConfirm: () => void;
  /** Escape pressed with no suggestion shown, or the cancel button clicked. */
  onCancel: () => void;
  placeholder?: string;
  /** Shown before the input and before each suggestion. */
  icon?: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  /** The suggestions could not be loaded: the list is hidden, typing still works. */
  errorText?: string;
  emptyText?: string;
  /** Keyboard hints under the suggestions. */
  footer?: React.ReactNode;
  /** The typed text is being checked: input and cancel are disabled. */
  busy?: boolean;
  invalid?: boolean;
  'aria-describedby'?: string;
  /** Prefix of the data-testid of every part, e.g. `<prefix>-input`. */
  testIdPrefix?: string;
};

/**
 * Free-text input suggesting values as the user types. Enter and Escape act on
 * the list while a suggestion is highlighted or shown, and on the input
 * otherwise.
 */
export const PMAutocomplete: React.FC<PMAutocompleteProps> = ({
  items,
  onInputChange,
  onPick,
  onConfirm,
  onCancel,
  placeholder,
  icon,
  loading = false,
  loadingText = 'Searching…',
  errorText,
  emptyText = 'No match',
  footer,
  busy = false,
  invalid = false,
  'aria-describedby': describedBy,
  testIdPrefix = 'pm-autocomplete',
}) => {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const failed = errorText !== undefined;
  const suggestionsShown = open && !failed;

  const collection = useMemo(
    () =>
      createListCollection({
        items: items.map((item) => ({ label: item, value: item })),
      }),
    [items],
  );

  return (
    <PMBox flex="1" minWidth={0}>
      <Combobox.Root
        collection={collection}
        size="xs"
        allowCustomValue
        openOnClick
        // Focused by the combobox itself so it sees the focus and reacts to typing.
        autoFocus
        // Left uncontrolled: feeding the text back in drops fast keystrokes.
        onInputValueChange={(e: { inputValue: string }) => {
          setTyped(e.inputValue.trim());
          onInputChange(e.inputValue);
        }}
        onValueChange={(e: { value: string[] }) => {
          const [picked] = e.value;
          if (picked) onPick(picked);
        }}
        open={open}
        lazyMount
        unmountOnExit
        onOpenChange={(e: { open: boolean }) => setOpen(e.open)}
        onHighlightChange={(e: { highlightedValue: string | null }) =>
          setHighlighted(e.highlightedValue)
        }
        disabled={busy}
        invalid={invalid}
        placeholder={placeholder}
        // Drawers and dialogs clip their body: fixed positioning lets the list overflow them.
        positioning={{ strategy: 'fixed', gutter: 4 }}
      >
        <Combobox.Control
          display="flex"
          alignItems="center"
          gap={2}
          height={8}
          paddingLeft={2.5}
          paddingRight={1}
          borderWidth="1px"
          borderColor="border.tertiary"
          borderRadius="md"
          bg="background.primary"
          transition="border-color 120ms ease-out, box-shadow 120ms ease-out"
          _focusWithin={{
            borderColor: 'branding.primary',
            boxShadow: '0 0 0 1px {colors.branding.primary}',
          }}
          _invalid={{
            borderColor: 'text.error',
            _focusWithin: {
              borderColor: 'text.error',
              boxShadow: '0 0 0 1px {colors.text.error}',
            },
          }}
        >
          {icon && (
            <PMIcon fontSize="xs" color="text.faded" flexShrink={0}>
              {icon}
            </PMIcon>
          )}
          <Combobox.Input
            aria-describedby={describedBy}
            flex={1}
            minWidth={0}
            height="auto"
            paddingX={0}
            border="none"
            bg="transparent"
            fontSize="sm"
            color="text.primary"
            focusRing="none"
            _placeholder={{ color: 'text.faded' }}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter') {
                // The combobox picks the highlighted suggestion itself.
                if (open && highlighted !== null) return;
                e.preventDefault();
                onConfirm();
              } else if (e.key === 'Escape') {
                if (suggestionsShown) setOpen(false);
                else onCancel();
              }
            }}
            data-testid={`${testIdPrefix}-input`}
          />
          {busy ? (
            <PMSpinner
              size="xs"
              color="text.faded"
              data-testid={`${testIdPrefix}-checking`}
            />
          ) : (
            typed && (
              <KeyCap data-testid={`${testIdPrefix}-enter-hint`}>↵</KeyCap>
            )
          )}
          <PMIconButton
            variant="ghost"
            size="2xs"
            aria-label="Cancel"
            color="text.faded"
            _hover={{ color: 'text.primary', bg: 'background.tertiary' }}
            onClick={onCancel}
            disabled={busy}
            data-testid={`${testIdPrefix}-cancel`}
          >
            <LuX />
          </PMIconButton>
        </Combobox.Control>
        {!failed && (
          <Combobox.Positioner>
            <Combobox.Content
              bg="background.tertiary"
              borderWidth="1px"
              borderColor="border.secondary"
              borderRadius="md"
              boxShadow="lg"
              padding={1}
            >
              {loading ? (
                <PMText fontSize="xs" color="faded" paddingX={2} paddingY={1.5}>
                  {loadingText}
                </PMText>
              ) : (
                <Combobox.Empty paddingX={2} paddingY={1.5}>
                  <PMHStack gap={2} align="center">
                    <PMIcon fontSize="xs" color="text.faded">
                      <LuSearchX />
                    </PMIcon>
                    <PMText fontSize="xs" color="faded">
                      {emptyText}
                    </PMText>
                  </PMHStack>
                </Combobox.Empty>
              )}
              {collection.items.map((item) => (
                <Combobox.Item
                  item={item}
                  key={item.value}
                  gap={2}
                  paddingX={2}
                  paddingY={1.5}
                  borderRadius="sm"
                  cursor="pointer"
                  _highlighted={{ bg: 'blue.subtle' }}
                  data-testid={`${testIdPrefix}-option`}
                >
                  {icon && (
                    <PMIcon fontSize="xs" color="text.faded" flexShrink={0}>
                      {icon}
                    </PMIcon>
                  )}
                  <Combobox.ItemText fontSize="sm" color="text.secondary">
                    <MatchHighlight
                      text={item.label}
                      typed={typed}
                      testId={`${testIdPrefix}-option-match`}
                    />
                  </Combobox.ItemText>
                </Combobox.Item>
              ))}
              {footer && (
                <PMText
                  aria-hidden
                  marginTop={1}
                  paddingX={2}
                  paddingTop={1.5}
                  paddingBottom={0.5}
                  borderTop="1px solid"
                  borderColor="border.secondary"
                  fontSize="0.6875rem"
                  color="faded"
                  data-testid={`${testIdPrefix}-hints`}
                >
                  {footer}
                </PMText>
              )}
            </Combobox.Content>
          </Combobox.Positioner>
        )}
      </Combobox.Root>
      {failed && (
        <PMText
          fontSize="xs"
          color="faded"
          marginTop={1}
          data-testid={`${testIdPrefix}-search-error`}
        >
          {errorText}
        </PMText>
      )}
    </PMBox>
  );
};

const KeyCap: React.FC<{
  children: React.ReactNode;
  'data-testid'?: string;
}> = ({ children, 'data-testid': testId }) => (
  <PMBox
    as="kbd"
    aria-hidden
    flexShrink={0}
    paddingX={1}
    lineHeight="1.4"
    borderWidth="1px"
    borderColor="border.secondary"
    borderRadius="sm"
    fontFamily="inherit"
    fontSize="0.6875rem"
    color="text.faded"
    data-testid={testId}
  >
    {children}
  </PMBox>
);

const MatchHighlight: React.FC<{
  text: string;
  typed: string;
  testId: string;
}> = ({ text, typed, testId }) => {
  const start = typed ? text.toLowerCase().indexOf(typed.toLowerCase()) : -1;
  if (start < 0) return <>{text}</>;
  const end = start + typed.length;
  return (
    <>
      {text.slice(0, start)}
      <PMBox
        as="mark"
        bg="transparent"
        color="branding.primary"
        fontWeight="medium"
        data-testid={testId}
      >
        {text.slice(start, end)}
      </PMBox>
      {text.slice(end)}
    </>
  );
};
