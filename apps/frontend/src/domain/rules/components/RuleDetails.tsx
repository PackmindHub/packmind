import { useMemo, useState, useEffect } from 'react';
import {
  PMPageSection,
  PMTabs,
  PMVStack,
  PMBox,
  PMSelect,
  PMSelectTrigger,
  pmCreateListCollection,
  PMHStack,
  PMText,
} from '@packmind/ui';
import {
  Rule,
  StandardId,
  getAllLanguagesSortedByDisplayName,
  ProgrammingLanguage,
} from '@packmind/types';
import { RuleExamplesManager } from './RuleExamplesManager';
import { ProgramEditor } from '@packmind/proprietary/frontend/domain/detection/components/ProgramEditor';

type RuleDetailsTab = 'examples' | 'detection';

interface RuleDetailsProps {
  standardId: StandardId;
  rule: Rule;
  defaultTab?: RuleDetailsTab;
  detectionLanguages?: string[];
}

export const RuleDetails = ({
  standardId,
  rule,
  defaultTab = 'examples',
  detectionLanguages = [],
}: RuleDetailsProps) => {
  const [selectedLanguage, setSelectedLanguage] = useState<ProgrammingLanguage>(
    ProgrammingLanguage.JAVASCRIPT,
  );

  // Set the default language to the first configured language
  useEffect(() => {
    if (detectionLanguages.length === 0) {
      setSelectedLanguage(ProgrammingLanguage.JAVASCRIPT);
      return;
    }
    const allLanguages = getAllLanguagesSortedByDisplayName();
    const firstConfigured = allLanguages.find((l) =>
      detectionLanguages.includes(l.language),
    );
    const defaultLang =
      firstConfigured?.language || ProgrammingLanguage.JAVASCRIPT;
    setSelectedLanguage(defaultLang);
  }, [detectionLanguages]);

  const { configuredLanguages, otherLanguages } = useMemo(() => {
    const allLanguages = getAllLanguagesSortedByDisplayName();
    const configured: { value: string; label: string }[] = [];
    const other: { value: string; label: string }[] = [];

    allLanguages.forEach((l) => {
      const item = { value: l.language, label: l.info.displayName };
      if (detectionLanguages.includes(l.language)) {
        configured.push(item);
      } else {
        other.push(item);
      }
    });

    return { configuredLanguages: configured, otherLanguages: other };
  }, [detectionLanguages]);

  const languageCollection = useMemo(() => {
    const allLanguages = getAllLanguagesSortedByDisplayName();
    return pmCreateListCollection({
      items: allLanguages.map((l) => ({
        value: l.language,
        label: l.info.displayName,
      })),
    });
  }, []);

  const tabs = [
    {
      value: 'examples',
      triggerLabel: 'Code examples',
      content: (
        <PMVStack alignItems={'stretch'} gap="4" paddingY={'4'} width="100%">
          <RuleExamplesManager
            standardId={standardId}
            ruleId={rule.id}
            selectedLanguage={selectedLanguage}
          />
        </PMVStack>
      ),
    },
    {
      value: 'detection',
      triggerLabel: 'Linter',
      content: (
        <PMVStack alignItems={'stretch'} gap="4" paddingY={'4'}>
          <PMPageSection>
            <ProgramEditor
              standardId={standardId}
              ruleId={rule.id}
              detectionLanguages={detectionLanguages}
              selectedLanguage={selectedLanguage}
            />
          </PMPageSection>
        </PMVStack>
      ),
    },
  ];

  return (
    <PMVStack position="relative" gap={4} width="100%" alignItems="flex-start">
      <PMHStack>
        <PMText whiteSpace="nowrap">Language : </PMText>
        <PMBox width="200px">
          <PMSelect.Root
            collection={languageCollection}
            value={[selectedLanguage]}
            onValueChange={(e) =>
              setSelectedLanguage(e.value[0] as ProgrammingLanguage)
            }
          >
            <PMSelectTrigger placeholder="Select a language" />
            <PMSelect.Positioner>
              <PMSelect.Content zIndex={1500}>
                {configuredLanguages.length > 0 && (
                  <PMSelect.ItemGroup>
                    <PMSelect.ItemGroupLabel>
                      Configured Languages
                    </PMSelect.ItemGroupLabel>
                    {configuredLanguages.map((item) => (
                      <PMSelect.Item item={item} key={item.value}>
                        {item.label}
                      </PMSelect.Item>
                    ))}
                  </PMSelect.ItemGroup>
                )}
                <PMSelect.CollapsibleItemGroup label="Other Languages">
                  {otherLanguages.map((item) => (
                    <PMSelect.Item item={item} key={item.value}>
                      {item.label}
                    </PMSelect.Item>
                  ))}
                </PMSelect.CollapsibleItemGroup>
              </PMSelect.Content>
            </PMSelect.Positioner>
          </PMSelect.Root>
        </PMBox>
      </PMHStack>
      <PMTabs defaultValue={defaultTab} tabs={tabs} />
    </PMVStack>
  );
};
