import React, { useEffect } from 'react';
import {
  OrganizationId,
  ProgrammingLanguage,
  RuleId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { PMVStack, PMText, PMSpinner, PMBox, PMButton } from '@packmind/ui';
import { LuPlus } from 'react-icons/lu';
import { RuleExampleItem } from '../RuleExampleItem';
import { RuleLanguagePicker } from '../RuleLanguagePicker';
import {
  useGetRuleExamplesQuery,
  useCreateRuleExampleMutation,
} from '../../api/queries';
import { useRuleExampleDrafts } from '../../hooks/useRuleExampleDrafts';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';

interface RuleExamplesManagerProps {
  standardId: StandardId;
  ruleId: RuleId;
  /**
   * Absent when nothing on this standard says which one it would be. The body
   * then asks rather than opening a pair of editors in a language nobody chose.
   */
  selectedLanguage?: ProgrammingLanguage;
  onLanguageChange?: (lang: ProgrammingLanguage) => void;
}

export function RuleExamplesManager({
  standardId,
  ruleId,
  selectedLanguage,
  onLanguageChange,
}: Readonly<RuleExamplesManagerProps>) {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const drafts = useRuleExampleDrafts();
  const createRuleExampleMutation = useCreateRuleExampleMutation();

  const {
    data: existingExamples,
    isLoading,
    isError,
    error,
  } = useGetRuleExamplesQuery(
    organization?.id as OrganizationId,
    spaceId as SpaceId,
    standardId,
    ruleId,
  );

  const saved = React.useMemo(
    () =>
      selectedLanguage
        ? (existingExamples ?? []).filter((ex) => ex.lang === selectedLanguage)
        : [],
    [existingExamples, selectedLanguage],
  );
  const pending = selectedLanguage ? drafts.newDraftsFor(selectedLanguage) : [];

  /*
    A language with nothing in it opens on the form rather than on a sentence
    saying it is empty.

    There is nothing to read here, so the editor is the content: announcing the
    absence and then asking for a click to reach the only thing this screen does
    puts a door in front of an empty room. It covers the first example of a rule
    and the first example of a language equally, because picking a language the
    rule does not speak yet is already the intent to write one.
  */
  useEffect(() => {
    if (isLoading || isError || !selectedLanguage) {
      return;
    }

    if (saved.length === 0 && pending.length === 0) {
      drafts.open({
        lang: selectedLanguage,
        positive: '',
        negative: '',
        isNew: true,
      });
    }
  }, [
    isLoading,
    isError,
    saved.length,
    pending.length,
    selectedLanguage,
    drafts,
  ]);

  const handleSaveNewExample = async (values: {
    lang: string;
    positive: string;
    negative: string;
  }) => {
    await createRuleExampleMutation.mutateAsync({
      standardId,
      ruleId,
      example: values,
    });
  };

  if (isLoading) {
    return (
      <PMBox textAlign="center" py={8}>
        <PMSpinner size="lg" />
        <PMText mt={4}>Loading rule examples...</PMText>
      </PMBox>
    );
  }

  if (isError) {
    return (
      <PMBox p={4} border="1px solid" borderColor="red.500" borderRadius="md">
        <PMText color="error" variant="body-important">
          Error loading examples
        </PMText>
        <PMText color="error" variant="small" mt={1}>
          {error instanceof Error
            ? error.message
            : 'Failed to load rule examples'}
        </PMText>
      </PMBox>
    );
  }

  if (!selectedLanguage) {
    return <RuleLanguagePicker onPick={(lang) => onLanguageChange?.(lang)} />;
  }

  /*
    The only draft of an empty language is the form the language opened with, so
    it is offered no way back: there is nothing behind it to go back to.
  */
  const firstDraftIsTheWholeLanguage = saved.length === 0;

  return (
    <PMVStack alignItems="stretch" gap="4" width="full">
      {pending.map((draft, index) => (
        <RuleExampleItem
          key={draft.id}
          example={draft}
          standardId={standardId}
          ruleId={ruleId}
          isNew
          onSaveNew={handleSaveNewExample}
          canCancel={!(firstDraftIsTheWholeLanguage && index === 0)}
          allowLanguageSelection
          onLanguageChange={onLanguageChange}
        />
      ))}

      {saved
        .slice()
        .reverse()
        .map((example) => (
          <RuleExampleItem
            key={example.id}
            example={example}
            standardId={standardId}
            ruleId={ruleId}
          />
        ))}

      {/*
        Below the examples rather than above them, because it is what comes
        after reading them: a rule earns a second example from what the first
        one failed to say.
      */}
      <PMBox alignSelf="flex-start">
        <PMButton
          variant="secondary"
          size="sm"
          onClick={() =>
            drafts.open({
              lang: selectedLanguage,
              positive: '',
              negative: '',
              isNew: true,
            })
          }
          disabled={createRuleExampleMutation.isPending}
        >
          <LuPlus />
          Add example
        </PMButton>
      </PMBox>
    </PMVStack>
  );
}
