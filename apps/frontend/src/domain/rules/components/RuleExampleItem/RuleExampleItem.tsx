import React, { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RuleExample, RuleId, StandardId } from '@packmind/types';
import {
  ProgrammingLanguage,
  getAllLanguagesSortedByDisplayName,
} from '@packmind/types';
import {
  useUpdateRuleExampleMutation,
  useDeleteRuleExampleMutation,
} from '../../api/queries';
import {
  hasContent,
  useRuleExampleDrafts,
  type RuleExampleDraft,
} from '../../hooks/useRuleExampleDrafts';
import {
  PMCodeMirror,
  PMText,
  PMHeading,
  PMButton,
  PMHStack,
  PMVStack,
  PMBox,
  PMAlertDialog,
  PMFlex,
  PMButtonGroup,
  PMIcon,
  PMSelect,
  PMSelectTrigger,
  PMPortal,
  pmCreateListCollection,
} from '@packmind/ui';
import { LuCircleCheckBig, LuCircleX } from 'react-icons/lu';
import { GET_STANDARD_RULES_DETECTION_STATUS_KEY } from '@packmind/proprietary/frontend/domain/detection/api/queryKeys';

/*
  A pair of editors that follow their content instead of a number.

  Both used to be exactly 200px tall, which is neither: a ten line "Do" scrolled
  inside its own box while two hundred pixels of empty pane sat below it, and a
  three line "Don't" spent the same height on nothing. The floor is about the
  shortest snippet worth writing, the ceiling is where a card would start
  pushing the rest of the rule off screen, and between the two the editor is the
  size of the code in it.
*/
const EDITOR_MIN_HEIGHT = '150px';
const EDITOR_MAX_HEIGHT = '420px';

const MAX_LINES = 500;
const MAX_TOTAL_CHARS = 30000;

type ValidationErrors = {
  positive?: string;
  negative?: string;
  total?: string;
};

function validate(positive: string, negative: string): ValidationErrors {
  const errors: ValidationErrors = {};
  const positiveLines = positive.split('\n').length;
  const negativeLines = negative.split('\n').length;
  const totalChars = positive.length + negative.length;

  if (positiveLines > MAX_LINES) {
    errors.positive = `${positiveLines} / ${MAX_LINES} lines`;
  }

  if (negativeLines > MAX_LINES) {
    errors.negative = `${negativeLines} / ${MAX_LINES} lines`;
  }

  if (totalChars > MAX_TOTAL_CHARS) {
    errors.total = `Total character count exceeds ${MAX_TOTAL_CHARS.toLocaleString()} characters (${totalChars.toLocaleString()} characters)`;
  }

  return errors;
}

interface RuleExampleItemProps {
  example: RuleExample | RuleExampleDraft;
  standardId: StandardId;
  ruleId: RuleId;
  isNew?: boolean;
  onSaveNew?: (values: {
    lang: string;
    positive: string;
    negative: string;
  }) => Promise<void>;
  /**
   * Whether abandoning this draft leaves anything behind. The first example of
   * a language has nothing to cancel back to, so it is offered no Cancel:
   * emptying the fields and leaving the language is what abandoning it means.
   */
  canCancel?: boolean;
  allowLanguageSelection?: boolean;
  onLanguageChange?: (lang: ProgrammingLanguage) => void;
}

export const RuleExampleItem: React.FC<RuleExampleItemProps> = ({
  example,
  standardId,
  ruleId,
  isNew = false,
  onSaveNew,
  canCancel = true,
  allowLanguageSelection = false,
  onLanguageChange,
}) => {
  const queryClient = useQueryClient();
  const drafts = useRuleExampleDrafts();
  const [isSaving, setIsSaving] = React.useState(false);

  /*
    The buffer is the edit mode. A card is being edited exactly when the store
    holds something for it, so there is no second piece of state that can say
    otherwise, and the buffer outlives this card: the store sits above the
    language and above the tabs, both of which unmount it.
  */
  const draft = drafts.get(example.id);
  const isEditing = draft !== undefined;

  const updateMutation = useUpdateRuleExampleMutation();
  const deleteMutation = useDeleteRuleExampleMutation();

  const sortedLanguages = getAllLanguagesSortedByDisplayName();

  const languageCollection = useMemo(
    () =>
      pmCreateListCollection({
        items: sortedLanguages.map((l) => ({
          value: l.language,
          label: l.info.displayName,
        })),
      }),
    [sortedLanguages],
  );

  /*
    Derived rather than stored. The counts are a function of what is in the
    buffer, and keeping them in state was a second copy that had to be refreshed
    from every handler that touched it.
  */
  const validationErrors = useMemo(
    () => (draft ? validate(draft.positive, draft.negative) : {}),
    [draft],
  );
  const hasValidationError = Object.keys(validationErrors).length > 0;

  /*
    A language opens on an empty pair, so Save is on screen before there is
    anything to save. Off until something is written, rather than a button that
    discards the form and opens the same one again.
  */
  const nothingToSave = isNew && (!draft || !hasContent(draft));

  const startEditing = () => {
    drafts.open({
      id: example.id,
      lang: example.lang,
      positive: example.positive,
      negative: example.negative,
      isNew: false,
    });
  };

  const handleSave = async () => {
    if (!draft) {
      return;
    }

    if (draft.positive.trim() === '' && draft.negative.trim() === '') {
      handleCancel();
      return;
    }

    if (hasValidationError) {
      return;
    }

    const values = {
      lang: draft.lang,
      positive: draft.positive,
      negative: draft.negative,
    };

    if (isNew && onSaveNew) {
      setIsSaving(true);
      try {
        await onSaveNew(values);
        await queryClient.invalidateQueries({
          queryKey: [...GET_STANDARD_RULES_DETECTION_STATUS_KEY, standardId],
        });
        drafts.discard(draft.id);
      } catch (error) {
        console.error('Failed to save new example:', error);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    updateMutation.mutate({
      standardId,
      ruleId,
      exampleId: (example as RuleExample).id,
      updates: values,
    });
    drafts.discard(draft.id);
  };

  const handleCancel = () => {
    drafts.discard(example.id);
  };

  const handleRemove = () => {
    if (isNew) {
      drafts.discard(example.id);
      return;
    }

    deleteMutation.mutate(
      {
        standardId,
        ruleId,
        exampleId: (example as RuleExample).id,
      },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey: [...GET_STANDARD_RULES_DETECTION_STATUS_KEY, standardId],
          });
        },
      },
    );
  };

  const language = draft?.lang ?? example.lang;
  const positive = draft?.positive ?? example.positive;
  const negative = draft?.negative ?? example.negative;
  const isBusy = isSaving || updateMutation.isPending;

  return (
    <PMBox
      /*
        A border that can be seen. `border.primary` is `beige-1000`, which is
        also what this pane is painted with, so the card had no edge at all: the
        `shadow="sm"` that used to sit here was hiding that, and taking the
        shadow off (nothing is elevated at rest) left two stacked examples
        running into each other. One step up the ramp is the flat way to say
        where one example ends.
      */
      border="1px solid"
      borderColor="{colors.border.tertiary}"
      borderRadius="md"
      width="100%"
      p={4}
    >
      <PMFlex justify="space-between" align="center" mb={3} gap={4}>
        <PMHStack gap={2} alignItems="center" minWidth={0}>
          {allowLanguageSelection && isNew && isEditing ? (
            /*
              The draft's own language, which is a field of the record and not a
              second copy of the rail above it. Changing it carries the code
              across rather than starting the reader over, and the rail follows,
              so the one-way relation stays readable: the rail goes where the
              draft goes, never the reverse.
            */
            <>
              <PMText fontSize="xs" color="faded">
                Language
              </PMText>
              <PMBox width="180px">
                <PMSelect.Root
                  collection={languageCollection}
                  value={[language]}
                  size="sm"
                  onValueChange={(e) => {
                    const newLang = e.value[0] as ProgrammingLanguage;
                    drafts.move(example.id, newLang);
                    onLanguageChange?.(newLang);
                  }}
                >
                  <PMSelectTrigger placeholder="Select a language" />
                  <PMPortal>
                    <PMSelect.Positioner>
                      <PMSelect.Content zIndex={1500}>
                        {sortedLanguages.map((l) => (
                          <PMSelect.Item
                            item={{
                              value: l.language,
                              label: l.info.displayName,
                            }}
                            key={l.language}
                          >
                            {l.info.displayName}
                          </PMSelect.Item>
                        ))}
                      </PMSelect.Content>
                    </PMSelect.Positioner>
                  </PMPortal>
                </PMSelect.Root>
              </PMBox>
            </>
          ) : null}
        </PMHStack>

        {isEditing ? (
          <PMButtonGroup size="sm">
            {(!isNew || canCancel) && (
              <PMButton
                variant="tertiary"
                onClick={handleCancel}
                disabled={isBusy}
              >
                Cancel
              </PMButton>
            )}
            <PMButton
              variant="primary"
              onClick={handleSave}
              loading={isBusy}
              disabled={isBusy || hasValidationError || nothingToSave}
            >
              Save
            </PMButton>
          </PMButtonGroup>
        ) : (
          <PMButtonGroup size="sm">
            <PMButton
              variant="secondary"
              onClick={startEditing}
              aria-label="Edit example"
            >
              Edit
            </PMButton>
            <PMAlertDialog
              trigger={
                <PMButton
                  variant="tertiary"
                  loading={deleteMutation.isPending}
                  disabled={deleteMutation.isPending}
                  aria-label="Delete"
                >
                  Delete
                </PMButton>
              }
              title="Delete Rule Example"
              message="Are you sure you want to delete this rule example? This action cannot be undone."
              confirmText="Delete"
              cancelText="Cancel"
              confirmColorScheme="red"
              onConfirm={handleRemove}
              isLoading={deleteMutation.isPending}
            />
          </PMButtonGroup>
        )}
      </PMFlex>

      <PMVStack gap={4} align="stretch">
        <PMVStack flex={1} align="stretch" gap={2}>
          <PMHeading level="h5">
            <PMIcon color="green.500" marginRight={'1'}>
              <LuCircleCheckBig />
            </PMIcon>
            Do
          </PMHeading>
          <PMBox>
            <PMCodeMirror
              value={positive}
              onChange={(value) =>
                drafts.patch(example.id, { positive: value })
              }
              editable={isEditing}
              language={language}
              placeholder={'Code complying with the rule...'}
              minHeight={EDITOR_MIN_HEIGHT}
              maxHeight={EDITOR_MAX_HEIGHT}
              basicSetup={{
                lineNumbers: true,
                foldGutter: false,
                dropCursor: false,
                allowMultipleSelections: false,
                indentOnInput: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: false,
                searchKeymap: false,
              }}
              style={{
                opacity: isEditing ? 1 : 0.8,
                cursor: isEditing ? 'text' : 'default',
              }}
            />
            {validationErrors.positive && (
              <PMText color="error" variant="small" mt={1}>
                {validationErrors.positive}
              </PMText>
            )}
          </PMBox>
        </PMVStack>

        <PMVStack flex={1} align="stretch" gap={2}>
          <PMHeading level="h5">
            <PMIcon color="red.500" marginRight={'1'}>
              <LuCircleX />
            </PMIcon>
            Don't
          </PMHeading>
          <PMBox>
            <PMCodeMirror
              value={negative}
              onChange={(value) =>
                drafts.patch(example.id, { negative: value })
              }
              editable={isEditing}
              language={language}
              placeholder={'Code violating the rule...'}
              minHeight={EDITOR_MIN_HEIGHT}
              maxHeight={EDITOR_MAX_HEIGHT}
              basicSetup={{
                lineNumbers: true,
                foldGutter: false,
                dropCursor: false,
                allowMultipleSelections: false,
                indentOnInput: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: false,
                searchKeymap: false,
              }}
              style={{
                opacity: isEditing ? 1 : 0.8,
                cursor: isEditing ? 'text' : 'default',
              }}
            />
            {validationErrors.negative && (
              <PMText color="error" variant="small" mt={1}>
                {validationErrors.negative}
              </PMText>
            )}
          </PMBox>
        </PMVStack>
      </PMVStack>

      {validationErrors.total && (
        <PMBox mt={2}>
          <PMText color="error" variant="small">
            {validationErrors.total}
          </PMText>
        </PMBox>
      )}
    </PMBox>
  );
};
