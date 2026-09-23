import { useMemo } from 'react';
import {
  PMBox,
  PMHStack,
  PMIcon,
  PMMenu,
  PMPortal,
  PMText,
} from '@packmind/ui';
import { LuPlus } from 'react-icons/lu';
import {
  ProgrammingLanguage,
  getAllLanguagesSortedByDisplayName,
} from '@packmind/types';

/**
 * The languages a rule has examples in, all of them at once, and the way to add
 * one.
 *
 * A select could not do this job. A rule is checked by one detection program per
 * language, so how many languages it speaks is the first fact about it, and a
 * closed select spends that fact on a click: the screen said "JavaScript" and
 * said nothing about the Java and the TypeScript sitting behind it. It also put
 * adding a language inside a control for looking at one, which is why the way to
 * add was a collapsed group in a dropdown.
 *
 * Not the detection line above it, which lists the languages a program actually
 * reports in and lets each one's severity be set. Two lists of language names,
 * two facts: what the rule documents, and what the linter enforces. They are
 * kept apart deliberately, and the counts here are what says which is which at a
 * glance.
 */
export function RuleLanguageRail({
  languages,
  value,
  counts,
  unsaved,
  onChange,
}: Readonly<{
  /** The rule's languages, in display order. */
  languages: readonly ProgrammingLanguage[];
  value: ProgrammingLanguage;
  /** Saved examples per language. */
  counts: ReadonlyMap<ProgrammingLanguage, number>;
  /** Languages holding something written and not saved. */
  unsaved: readonly ProgrammingLanguage[];
  onChange: (language: ProgrammingLanguage) => void;
}>) {
  const all = useMemo(() => getAllLanguagesSortedByDisplayName(), []);
  const displayNames = useMemo(
    () => new Map(all.map((entry) => [entry.language, entry.info.displayName])),
    [all],
  );
  const addable = useMemo(
    () => all.filter((entry) => !languages.includes(entry.language)),
    [all, languages],
  );

  return (
    <PMHStack
      role="group"
      aria-label="Example languages"
      gap={1}
      flexWrap="wrap"
      alignItems="center"
    >
      {languages.map((language) => {
        const isSelected = language === value;
        const count = counts.get(language) ?? 0;
        const isUnsaved = unsaved.includes(language);
        const name = displayNames.get(language) ?? language;

        return (
          <PMBox
            key={language}
            as="button"
            aria-pressed={isSelected}
            aria-label={[
              name,
              count > 0 ? `${count} saved` : null,
              isUnsaved ? 'unsaved' : null,
            ]
              .filter(Boolean)
              .join(', ')}
            onClick={() => onChange(language)}
            display="inline-flex"
            alignItems="center"
            gap={1.5}
            fontSize="xs"
            fontWeight="medium"
            paddingX={2}
            paddingY="3px"
            borderRadius="sm"
            whiteSpace="nowrap"
            cursor="pointer"
            /*
              Filled for the one being read, bare for the rest. A different
              species from the underline tabs above, so the two rows do not read
              as two ranks of the same control.
            */
            color={isSelected ? 'text.primary' : 'text.secondary'}
            backgroundColor={isSelected ? 'background.tertiary' : 'transparent'}
            _hover={{
              color: 'text.primary',
              backgroundColor: isSelected
                ? 'background.tertiary'
                : 'background.secondary',
            }}
            _focusVisible={{
              outline: '2px solid',
              outlineColor: 'branding.primary',
              outlineOffset: '1px',
            }}
            transition="background-color 150ms ease-out, color 150ms ease-out"
          >
            {name}
            {count > 0 && (
              <PMText as="span" fontSize="xs" color="faded">
                {count}
              </PMText>
            )}
            {/*
              What is parked here. Without it, leaving a language to look at
              another one hides the work rather than keeping it, which is the
              same silence the old surface kept when it threw the work away.
            */}
            {isUnsaved && (
              <PMBox
                aria-hidden
                width="5px"
                height="5px"
                borderRadius="full"
                backgroundColor="branding.primary"
              />
            )}
          </PMBox>
        );
      })}

      <PMMenu.Root>
        <PMMenu.Trigger asChild>
          <PMBox
            as="button"
            aria-label="Add a language"
            display="inline-flex"
            alignItems="center"
            gap={1}
            fontSize="xs"
            fontWeight="medium"
            paddingX={2}
            paddingY="3px"
            borderRadius="sm"
            whiteSpace="nowrap"
            cursor="pointer"
            color="text.faded"
            _hover={{
              color: 'text.primary',
              backgroundColor: 'background.secondary',
            }}
            _focusVisible={{
              outline: '2px solid',
              outlineColor: 'branding.primary',
              outlineOffset: '1px',
            }}
            transition="background-color 150ms ease-out, color 150ms ease-out"
          >
            <PMIcon as="span" display="inline-flex" fontSize="xs">
              <LuPlus />
            </PMIcon>
            Add a language
          </PMBox>
        </PMMenu.Trigger>
        <PMPortal>
          <PMMenu.Positioner>
            <PMMenu.Content maxHeight="320px" overflowY="auto">
              {addable.map((entry) => (
                <PMMenu.Item
                  key={entry.language}
                  value={entry.language}
                  onClick={() => onChange(entry.language)}
                >
                  {entry.info.displayName}
                </PMMenu.Item>
              ))}
            </PMMenu.Content>
          </PMMenu.Positioner>
        </PMPortal>
      </PMMenu.Root>
    </PMHStack>
  );
}
