import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import {
  PMBox,
  PMPageSection,
  PMTabsCompound,
  PMVStack,
  PMAlert,
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
import { RuleLanguageRail } from './RuleLanguageRail';
import {
  RuleExampleDraftsProvider,
  useRuleExampleDraftsStore,
} from '../hooks/useRuleExampleDrafts';
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
  const [searchParams, setSearchParams] = useSearchParams();

  /*
    Above the tabs, which is the only place unsaved code survives them: the
    strip below unmounts the body it is not showing.
  */
  const draftsStore = useRuleExampleDraftsStore();

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
  const [currentTab, setCurrentTab] = useState<RuleDetailsTab>(getInitialTab());
  const { data: examples, isLoading: isLoadingExamples } =
    useGetRuleExamplesQuery(
      organization?.id as OrganizationId,
      spaceId as SpaceId,
      standardId as StandardId,
      rule.id,
    );

  const exampleCounts = useMemo(() => {
    const counts = new Map<ProgrammingLanguage, number>();

    (examples ?? []).forEach((example) => {
      if (example.lang) {
        counts.set(example.lang, (counts.get(example.lang) ?? 0) + 1);
      }
    });

    return counts;
  }, [examples]);

  const detectionLanguages = useMemo<ProgrammingLanguage[]>(
    () => Array.from(exampleCounts.keys()),
    [exampleCounts],
  );

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

  /*
   * More than what is saved: a language holding a parked draft, and the one
   * being read even when it is empty, both belong on the rail.
   */
  const railLanguages = useMemo(() => {
    const carried = new Set<ProgrammingLanguage>([
      ...exampleCounts.keys(),
      ...draftsStore.dirtyLanguages,
      selectedLanguage,
    ]);

    return getAllLanguagesSortedByDisplayName()
      .map((entry) => entry.language)
      .filter((entry) => carried.has(entry));
  }, [exampleCounts, draftsStore.dirtyLanguages, selectedLanguage]);

  const handleNavigateToExamples = () => {
    updateTabWithUrl('examples');
  };

  if (isLoadingExamples) {
    return null; // Or a spinner
  }

  return (
    <RuleExampleDraftsProvider store={draftsStore}>
      <PMVStack
        position="relative"
        gap={4}
        width="100%"
        alignItems="flex-start"
      >
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
          </PMTabsCompound.List>

          {/*
            Under the strip rather than in it: the language scopes both bodies,
            and the strip is left to the two halves of a rule.
          */}
          <PMBox paddingTop={4}>
            <RuleLanguageRail
              languages={railLanguages}
              value={selectedLanguage}
              counts={exampleCounts}
              unsaved={draftsStore.dirtyLanguages}
              onChange={updateLanguageWithUrl}
            />
          </PMBox>

          <PMTabsCompound.Content value="examples">
            <PMVStack
              alignItems={'stretch'}
              gap="4"
              paddingY={'4'}
              width="100%"
            >
              <PMAlert.Root status="info">
                <PMAlert.Indicator />
                <PMAlert.Description>
                  Code examples are used for documentation and linter detection
                  only. They are not included when rendering the standard for AI
                  agents.
                </PMAlert.Description>
              </PMAlert.Root>
              <RuleExamplesManager
                standardId={standardId}
                ruleId={rule.id}
                selectedLanguage={selectedLanguage}
                onLanguageChange={updateLanguageWithUrl}
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
    </RuleExampleDraftsProvider>
  );
};
