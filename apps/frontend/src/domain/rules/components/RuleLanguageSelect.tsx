import { useMemo } from 'react';
import {
  PMBox,
  PMSelect,
  PMSelectTrigger,
  PMPortal,
  pmCreateListCollection,
} from '@packmind/ui';
import {
  ProgrammingLanguage,
  getAllLanguagesSortedByDisplayName,
} from '@packmind/types';

/**
 * Which language of a rule is being looked at, and the way to add one.
 *
 * Two groups rather than one list, because the two halves answer different
 * questions. The configured ones are what this rule already says something
 * about; the rest are an offer, and picking one is how a language gets added at
 * all. Collapsed, so a list of every language Packmind knows does not bury the
 * two or three that matter.
 *
 * Extracted out of `RuleDetails` when the Context pane grew a rule of its own:
 * both surfaces ask the same question, and a second copy of a control with two
 * groups and one meaning is how the two drift apart on which group a language
 * belongs in.
 */
export function RuleLanguageSelect({
  configuredLanguages,
  value,
  onChange,
  width = '200px',
}: Readonly<{
  /** The languages the rule already has examples in. */
  configuredLanguages: readonly ProgrammingLanguage[];
  value: ProgrammingLanguage;
  onChange: (language: ProgrammingLanguage) => void;
  width?: string;
}>) {
  const { configured, other } = useMemo(() => {
    const configuredItems: { value: string; label: string }[] = [];
    const otherItems: { value: string; label: string }[] = [];

    getAllLanguagesSortedByDisplayName().forEach((entry) => {
      const item = { value: entry.language, label: entry.info.displayName };
      if (configuredLanguages.includes(entry.language)) {
        configuredItems.push(item);
      } else {
        otherItems.push(item);
      }
    });

    return { configured: configuredItems, other: otherItems };
  }, [configuredLanguages]);

  const collection = useMemo(
    () =>
      pmCreateListCollection({
        items: getAllLanguagesSortedByDisplayName().map((entry) => ({
          value: entry.language,
          label: entry.info.displayName,
        })),
      }),
    [],
  );

  return (
    <PMBox width={width}>
      <PMSelect.Root
        collection={collection}
        value={[value]}
        onValueChange={(details) =>
          onChange(details.value[0] as ProgrammingLanguage)
        }
      >
        <PMSelectTrigger placeholder="Select a language" />
        <PMPortal>
          <PMSelect.Positioner>
            <PMSelect.Content zIndex={1500}>
              {configured.length > 0 && (
                <PMSelect.ItemGroup>
                  <PMSelect.ItemGroupLabel>
                    Configured Languages
                  </PMSelect.ItemGroupLabel>
                  {configured.map((item) => (
                    <PMSelect.Item item={item} key={item.value}>
                      {item.label}
                    </PMSelect.Item>
                  ))}
                </PMSelect.ItemGroup>
              )}
              <PMSelect.CollapsibleItemGroup label="Add a language">
                {other.map((item) => (
                  <PMSelect.Item item={item} key={item.value}>
                    {item.label}
                  </PMSelect.Item>
                ))}
              </PMSelect.CollapsibleItemGroup>
            </PMSelect.Content>
          </PMSelect.Positioner>
        </PMPortal>
      </PMSelect.Root>
    </PMBox>
  );
}
