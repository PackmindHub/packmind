import { useMemo, useState } from 'react';
import {
  PMBox,
  PMCombobox,
  PMPortal,
  PMText,
  PMVStack,
  pmCreateListCollection,
  pmUseFilter,
} from '@packmind/ui';
import {
  ProgrammingLanguage,
  getAllLanguagesSortedByDisplayName,
} from '@packmind/types';

/**
 * The one question a rule with nothing in it cannot be spared.
 *
 * An example is code, and code is in a language, so opening the editors before
 * one is chosen means choosing for the reader. That was JavaScript, for
 * everybody, and Packmind's users are not writing JavaScript: a Kotlin team met
 * a JavaScript editor with JavaScript highlighting and no explanation.
 *
 * Asked only when there is nothing to answer it with. A rule that already has
 * examples opens on them, and a rule whose standard has them opens on what its
 * neighbours use; this is the third case, a standard where nobody has written
 * anything yet, and there the choice is not a door in front of the work, it is
 * the first half of it.
 *
 * Typed rather than scrolled. Packmind knows about thirty-odd languages, and an
 * alphabetical list that opens on Avro asks a Kotlin team to hunt for what they
 * could have typed in two keystrokes.
 */
export function RuleLanguagePicker({
  onPick,
}: Readonly<{ onPick: (language: ProgrammingLanguage) => void }>) {
  const [inputValue, setInputValue] = useState('');
  const { contains } = pmUseFilter({ sensitivity: 'base' });

  const items = useMemo(
    () =>
      getAllLanguagesSortedByDisplayName().map((entry) => ({
        value: entry.language as string,
        label: entry.info.displayName,
      })),
    [],
  );

  const collection = useMemo(
    () =>
      pmCreateListCollection({
        items: inputValue
          ? items.filter((item) => contains(item.label, inputValue))
          : items,
      }),
    [items, inputValue, contains],
  );

  return (
    <PMVStack alignItems="flex-start" gap={3} width="full" maxWidth="34rem">
      <PMText as="div" fontSize="sm" color="secondary">
        Which language should this rule be checked in?
      </PMText>

      <PMBox width="full" maxWidth="20rem">
        <PMCombobox.Root
          collection={collection}
          onInputValueChange={(e: { inputValue: string }) =>
            setInputValue(e.inputValue)
          }
          onValueChange={(details: { value: string[] }) => {
            const [picked] = details.value;

            if (picked) {
              onPick(picked as ProgrammingLanguage);
            }
          }}
          value={[]}
          openOnClick
          placeholder="Search a language"
          width="full"
        >
          <PMCombobox.Control>
            <PMCombobox.Input />
            <PMCombobox.IndicatorGroup>
              <PMCombobox.Trigger />
            </PMCombobox.IndicatorGroup>
          </PMCombobox.Control>

          <PMPortal>
            <PMCombobox.Positioner>
              <PMCombobox.Content>
                <PMCombobox.Empty>No language found</PMCombobox.Empty>
                {collection.items.map((item) => (
                  <PMCombobox.Item item={item} key={item.value}>
                    <PMCombobox.ItemText>{item.label}</PMCombobox.ItemText>
                    <PMCombobox.ItemIndicator />
                  </PMCombobox.Item>
                ))}
              </PMCombobox.Content>
            </PMCombobox.Positioner>
          </PMPortal>
        </PMCombobox.Root>
      </PMBox>

      {/*
        What the choice commits to, said once and here rather than as a
        permanent line: a language is not a display setting, it is what a
        detection program will be generated for.
      */}
      <PMText as="div" fontSize="xs" color="faded">
        More can be added later. Each one gets its own detection program.
      </PMText>
    </PMVStack>
  );
}
