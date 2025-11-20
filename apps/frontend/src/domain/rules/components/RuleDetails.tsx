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
  PMButton,
  PMEmptyState,
} from '@packmind/ui';
import {
  Rule,
  StandardId,
  getAllLanguagesSortedByDisplayName,
  ProgrammingLanguage,
  OrganizationId,
  SpaceId,
} from '@packmind/types';
import { RuleExamplesManager } from './RuleExamplesManager';
import { ProgramEditor } from '@packmind/proprietary/frontend/domain/detection/components/ProgramEditor';
import { useGetRuleExamplesQuery } from '../api/queries';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';

type RuleDetailsTab = 'examples' | 'detection';

interface RuleDetailsProps {
  standardId: StandardId;
  rule: Rule;
  defaultTab?: RuleDetailsTab;
}

export const RuleDetails = ({
  standardId,
  rule,
  defaultTab = 'examples',
}: RuleDetailsProps) => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const [selectedLanguage, setSelectedLanguage] = useState<ProgrammingLanguage>(
    ProgrammingLanguage.JAVASCRIPT,
  );
  const [isCreatingFirstExample, setIsCreatingFirstExample] = useState(false);
  const [isCreatingExampleForLanguage, setIsCreatingExampleForLanguage] =
    useState(false);
  const { data: examples, isLoading: isLoadingExamples } =
    useGetRuleExamplesQuery(
      organization?.id as OrganizationId,
      spaceId as SpaceId,
      standardId as StandardId,
      rule.id,
    );

  const hasExamples = examples && examples.length > 0;

  const detectionLanguages = useMemo<ProgrammingLanguage[]>(() => {
    if (!examples) {
      return [];
    }

    const uniqueLanguages = new Set<ProgrammingLanguage>();
    examples.forEach((example) => {
      if (example.lang) {
        uniqueLanguages.add(example.lang);
      }
    });

    return Array.from(uniqueLanguages);
  }, [examples]);

  useEffect(() => {
    if (hasExamples && isCreatingFirstExample) {
      setIsCreatingFirstExample(false);
    }
  }, [hasExamples, isCreatingFirstExample]);

  // Reset the creation state when examples are updated for the selected language
  useEffect(() => {
    if (
      isCreatingExampleForLanguage &&
      detectionLanguages.includes(selectedLanguage)
    ) {
      setIsCreatingExampleForLanguage(false);
    }
  }, [isCreatingExampleForLanguage, detectionLanguages, selectedLanguage]);

  useEffect(() => {
    if (detectionLanguages.length === 0) {
      setSelectedLanguage(ProgrammingLanguage.JAVASCRIPT);
      return;
    }

    // Only change the selected language when the current one
    // is not available in the configured detection languages.
    if (!detectionLanguages.includes(selectedLanguage)) {
      const allLanguages = getAllLanguagesSortedByDisplayName();
      const firstConfigured = allLanguages.find((l) =>
        detectionLanguages.includes(l.language),
      );
      const defaultLang =
        firstConfigured?.language || ProgrammingLanguage.JAVASCRIPT;
      setSelectedLanguage(defaultLang);
    }
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
            forceCreate={isCreatingExampleForLanguage}
            onLanguageChange={setSelectedLanguage}
            onCancelCreation={() => setIsCreatingExampleForLanguage(false)}
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
              detectionLanguages={detectionLanguages.map((language) =>
                language.toString(),
              )}
              selectedLanguage={selectedLanguage}
            />
          </PMPageSection>
        </PMVStack>
      ),
    },
  ];

  if (isLoadingExamples) {
    return null; // Or a spinner
  }

  if (!hasExamples && !isCreatingFirstExample) {
    return (
      <PMEmptyState
        backgroundColor={'background.primary'}
        borderRadius={'md'}
        width={'2xl'}
        mx={'auto'}
        mt={32}
        title={'No code examples yet'}
      >
        Document the rule usage using code examples and detect violations with
        Packmind linter
        <PMButton
          variant="primary"
          onClick={() => setIsCreatingFirstExample(true)}
        >
          Add
        </PMButton>
      </PMEmptyState>
    );
  }

  if (!hasExamples && isCreatingFirstExample) {
    return (
      <PMVStack alignItems={'stretch'} gap="4" paddingY={'4'} width="100%">
        <RuleExamplesManager
          standardId={standardId}
          ruleId={rule.id}
          selectedLanguage={selectedLanguage}
          forceCreate={true}
          allowLanguageSelection={true}
          onLanguageChange={setSelectedLanguage}
          onCancelCreation={() => setIsCreatingFirstExample(false)}
        />
      </PMVStack>
    );
  }

  return (
    <PMVStack position="relative" gap={4} width="100%" alignItems="flex-start">
      <PMHStack>
        <PMText whiteSpace="nowrap">Language : </PMText>
        <PMBox width="200px">
          <PMSelect.Root
            collection={languageCollection}
            value={[selectedLanguage]}
            onValueChange={(e) => {
              const newLanguage = e.value[0] as ProgrammingLanguage;
              setSelectedLanguage(newLanguage);

              // Check if the selected language is from "Add a language" group (not configured)
              if (!detectionLanguages.includes(newLanguage)) {
                setIsCreatingExampleForLanguage(true);
              } else {
                setIsCreatingExampleForLanguage(false);
              }
            }}
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
                <PMSelect.CollapsibleItemGroup label="Add a language">
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
      <PMTabs defaultValue={defaultTab} tabs={tabs} width="100%" />
    </PMVStack>
  );
};
