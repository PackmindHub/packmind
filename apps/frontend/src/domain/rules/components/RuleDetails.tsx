import { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import {
  PMPageSection,
  PMTabsCompound,
  PMVStack,
  PMBox,
  PMSelect,
  PMSelectTrigger,
  pmCreateListCollection,
  PMHStack,
  PMField,
  PMButton,
  PMEmptyState,
  PMAlert,
  PMPortal,
} from '@packmind/ui';
import {
  Rule,
  StandardId,
  getAllLanguagesSortedByDisplayName,
  ProgrammingLanguage,
  OrganizationId,
  SpaceId,
} from '@packmind/types';
import {
  RuleExamplesManager,
  RuleExamplesManagerHandle,
} from './RuleExamplesManager';
import { ProgramEditor } from '@packmind/proprietary/frontend/domain/detection/components/ProgramEditor';
import { LuPlus } from 'react-icons/lu';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const examplesManagerRef = useRef<RuleExamplesManagerHandle>(null);

  // Initialize state from URL parameters
  const getInitialTab = (): RuleDetailsTab => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'examples' || tabParam === 'detection') {
      return tabParam;
    }
    return defaultTab;
  };

  const getInitialLanguage = (): ProgrammingLanguage => {
    const langParam = searchParams.get('lang');
    if (
      langParam &&
      Object.values(ProgrammingLanguage).includes(
        langParam as ProgrammingLanguage,
      )
    ) {
      return langParam as ProgrammingLanguage;
    }
    return ProgrammingLanguage.JAVASCRIPT;
  };

  const [selectedLanguage, setSelectedLanguage] =
    useState<ProgrammingLanguage>(getInitialLanguage());
  const [isCreatingFirstExample, setIsCreatingFirstExample] = useState(false);
  const [currentTab, setCurrentTab] = useState<RuleDetailsTab>(getInitialTab());
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

  const selectedLanguageHasExamples = useMemo(() => {
    return detectionLanguages.includes(selectedLanguage);
  }, [detectionLanguages, selectedLanguage]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const langParam = searchParams.get('lang');

    if (tabParam === 'examples' || tabParam === 'detection') {
      setCurrentTab(tabParam);
    }

    if (
      langParam &&
      Object.values(ProgrammingLanguage).includes(
        langParam as ProgrammingLanguage,
      )
    ) {
      setSelectedLanguage(langParam as ProgrammingLanguage);
    }
  }, [searchParams]);

  // Helper to update tab and URL atomically
  const updateTabWithUrl = (tab: RuleDetailsTab) => {
    setCurrentTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams, { replace: false });
  };

  // Helper to update language and URL atomically
  const updateLanguageWithUrl = (lang: ProgrammingLanguage) => {
    setSelectedLanguage(lang);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('lang', lang);
    setSearchParams(newParams, { replace: false });
  };

  useEffect(() => {
    if (hasExamples && isCreatingFirstExample) {
      setIsCreatingFirstExample(false);
    }
  }, [hasExamples, isCreatingFirstExample]);

  // Only auto-select language if no URL parameter was provided
  useEffect(() => {
    const langParam = searchParams.get('lang');

    // Skip auto-selection if there's a URL parameter
    if (langParam) {
      return;
    }

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
  }, [detectionLanguages, searchParams]);

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

  const handleNavigateToExamples = () => {
    updateTabWithUrl('examples');
  };

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
      <PMTabsCompound.Root
        defaultValue={defaultTab}
        value={currentTab}
        onValueChange={(details: { value: string }) =>
          updateTabWithUrl(details.value as RuleDetailsTab)
        }
        width="100%"
      >
        <PMTabsCompound.List>
          <PMTabsCompound.Trigger value="examples">
            Code examples
          </PMTabsCompound.Trigger>
          <PMTabsCompound.Trigger
            value="detection"
            disabled={!selectedLanguageHasExamples}
          >
            Linter
          </PMTabsCompound.Trigger>
          <PMHStack ml="auto" gap={3} alignItems="center">
            <PMField.Root>
              <PMHStack gap={2} alignItems="center">
                <PMField.Label mb={0}>Language</PMField.Label>
                <PMBox width="200px">
                  <PMSelect.Root
                    collection={languageCollection}
                    value={[selectedLanguage]}
                    onValueChange={(e) => {
                      const newLanguage = e.value[0] as ProgrammingLanguage;
                      updateLanguageWithUrl(newLanguage);
                    }}
                  >
                    <PMSelectTrigger placeholder="Select a language" />
                    <PMPortal>
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
                    </PMPortal>
                  </PMSelect.Root>
                </PMBox>
              </PMHStack>
            </PMField.Root>
            {currentTab === 'examples' && (
              <PMButton
                variant="primary"
                size="sm"
                onClick={() => examplesManagerRef.current?.addExample()}
              >
                <LuPlus />
                Add Example
              </PMButton>
            )}
          </PMHStack>
        </PMTabsCompound.List>

        <PMTabsCompound.Content value="examples">
          <PMVStack alignItems={'stretch'} gap="4" paddingY={'4'} width="100%">
            <PMAlert.Root status="info">
              <PMAlert.Indicator />
              <PMAlert.Description>
                Code examples are used for documentation and linter detection
                only. They are not included when rendering the standard for AI
                agents.
              </PMAlert.Description>
            </PMAlert.Root>
            <RuleExamplesManager
              ref={examplesManagerRef}
              standardId={standardId}
              ruleId={rule.id}
              selectedLanguage={selectedLanguage}
              forceCreate={!selectedLanguageHasExamples}
              onLanguageChange={setSelectedLanguage}
              onCancelCreation={() => undefined}
              hideAddButton
            />
          </PMVStack>
        </PMTabsCompound.Content>

        <PMTabsCompound.Content value="detection">
          <PMVStack alignItems={'stretch'} gap="4" paddingY={'4'}>
            <PMPageSection>
              <ProgramEditor
                standardId={standardId}
                ruleId={rule.id}
                detectionLanguages={detectionLanguages.map((language) =>
                  language.toString(),
                )}
                selectedLanguage={selectedLanguage}
                onNavigateToExamples={handleNavigateToExamples}
              />
            </PMPageSection>
          </PMVStack>
        </PMTabsCompound.Content>
      </PMTabsCompound.Root>
    </PMVStack>
  );
};
