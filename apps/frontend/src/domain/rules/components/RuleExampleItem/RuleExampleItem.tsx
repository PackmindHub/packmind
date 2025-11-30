import React, { useState, useMemo, useEffect } from 'react';
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
import { NewExample } from '../RuleExamplesManager/RuleExamplesManager';
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
  PMBadge,
  PMIcon,
  PMGrid,
  PMGridItem,
  PMSelect,
  PMSelectTrigger,
  pmCreateListCollection,
} from '@packmind/ui';
import { LuCircleCheckBig, LuCircleX } from 'react-icons/lu';
import { GET_STANDARD_RULES_DETECTION_STATUS_KEY } from '@packmind/proprietary/frontend/domain/detection/api/queryKeys';

interface RuleExampleItemProps {
  example: RuleExample | NewExample;
  standardId: StandardId;
  ruleId: RuleId;
  isNew?: boolean;
  onSaveNew?: (
    example: NewExample,
    values: { lang: string; positive: string; negative: string },
  ) => Promise<void>;
  onCancelNew?: (exampleId: string) => void;
  allowLanguageSelection?: boolean;
  onLanguageChange?: (lang: ProgrammingLanguage) => void;
}

export const RuleExampleItem: React.FC<RuleExampleItemProps> = ({
  example,
  standardId,
  ruleId,
  isNew = false,
  onSaveNew,
  onCancelNew,
  allowLanguageSelection = false,
  onLanguageChange,
}) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(isNew);
  const [editValues, setEditValues] = useState({
    lang: example.lang,
    positive: example.positive,
    negative: example.negative,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    positive?: string;
    negative?: string;
    total?: string;
  }>({});

  const updateMutation = useUpdateRuleExampleMutation();
  const deleteMutation = useDeleteRuleExampleMutation();

  // Validation constants
  const MAX_LINES = 500;
  const MAX_TOTAL_CHARS = 30000;

  // Validation function
  const validateExample = (positive: string, negative: string) => {
    const errors: { positive?: string; negative?: string; total?: string } = {};

    // Count lines and characters efficiently
    // Note: For future optimization, could leverage CodeMirror's editor state APIs
    // via refs to get line count from editor.state.doc.lines
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

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Get sorted languages for display
  const sortedLanguages = getAllLanguagesSortedByDisplayName();

  useEffect(() => {
    setEditValues((previousValues) => ({
      positive: '',
      negative: '',
      lang: example.lang,
    }));
  }, [example.lang]);

  const languageCollection = useMemo(() => {
    return pmCreateListCollection({
      items: sortedLanguages.map((l) => ({
        value: l.language,
        label: l.info.displayName,
      })),
    });
  }, [sortedLanguages]);

  const handleEditToggle = async () => {
    if (isEditing) {
      if (
        editValues.positive.trim() === '' &&
        editValues.negative.trim() === ''
      ) {
        handleCancel();
        return;
      }

      // Validate before saving
      const isValid = validateExample(editValues.positive, editValues.negative);
      if (!isValid) {
        return; // Don't save if validation fails
      }

      if (isNew && onSaveNew) {
        setIsSaving(true);
        try {
          await onSaveNew(example as NewExample, editValues);
          await queryClient.invalidateQueries({
            queryKey: [...GET_STANDARD_RULES_DETECTION_STATUS_KEY, standardId],
          });
          setIsEditing(false);
        } catch (error) {
          console.error('Failed to save new example:', error);
        } finally {
          setIsSaving(false);
        }
      } else {
        // Save changes to existing example
        updateMutation.mutate({
          standardId,
          ruleId,
          exampleId: (example as RuleExample).id,
          updates: editValues,
        });
        setIsEditing(false);
      }
    } else {
      // Reset values when starting to edit
      setEditValues({
        lang: example.lang,
        positive: example.positive,
        negative: example.negative,
      });
      setValidationErrors({}); // Clear validation errors
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    if (isNew && onCancelNew) {
      // Cancel new example creation
      onCancelNew(example.id);
    } else {
      // Cancel editing existing example
      setEditValues({
        lang: example.lang,
        positive: example.positive,
        negative: example.negative,
      });
      setValidationErrors({}); // Clear validation errors
      setIsEditing(false);
    }
  };

  // Handle input changes with real-time validation
  const handlePositiveChange = (value: string) => {
    const newEditValues = { ...editValues, positive: value };
    setEditValues(newEditValues);
    // Validate in real-time
    validateExample(newEditValues.positive, newEditValues.negative);
  };

  const handleNegativeChange = (value: string) => {
    const newEditValues = { ...editValues, negative: value };
    setEditValues(newEditValues);
    // Validate in real-time
    validateExample(newEditValues.positive, newEditValues.negative);
  };

  const handleRemove = () => {
    if (isNew && onCancelNew) {
      // Remove new example from local state
      onCancelNew(example.id);
    } else {
      // Delete existing example from database
      deleteMutation.mutate(
        {
          standardId,
          ruleId,
          exampleId: (example as RuleExample).id,
        },
        {
          onSuccess: async () => {
            await queryClient.invalidateQueries({
              queryKey: [
                ...GET_STANDARD_RULES_DETECTION_STATUS_KEY,
                standardId,
              ],
            });
          },
        },
      );
    }
  };

  const handleCancelNew = () => {
    if (isNew && onCancelNew) {
      onCancelNew(example.id);
    }
  };

  return (
    <PMBox
      border="1px solid"
      borderColor="{colors.border.primary}"
      borderRadius="md"
      width="100%"
      p={4}
      shadow="sm"
    >
      {/* Header */}
      <PMFlex justify="space-between" align="center" mb={2}>
        <PMHStack>
          {allowLanguageSelection && isNew ? (
            <>
              <PMText>Language:</PMText>
              <PMBox width="200px">
                <PMSelect.Root
                  collection={languageCollection}
                  value={[editValues.lang]}
                  onValueChange={(e) => {
                    const newLang = e.value[0] as ProgrammingLanguage;
                    setEditValues({ ...editValues, lang: newLang });
                    if (onLanguageChange) {
                      onLanguageChange(newLang);
                    }
                  }}
                >
                  <PMSelectTrigger placeholder="Select a language" />
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
                </PMSelect.Root>
              </PMBox>
            </>
          ) : (
            <></>
          )}
        </PMHStack>
        {isEditing ? (
          <PMButtonGroup size="sm">
            <PMButton
              variant="tertiary"
              onClick={handleCancel}
              disabled={isSaving || updateMutation.isPending}
            >
              Cancel
            </PMButton>
            <PMButton
              variant="primary"
              onClick={handleEditToggle}
              loading={isSaving || updateMutation.isPending}
              disabled={
                isSaving ||
                updateMutation.isPending ||
                Object.keys(validationErrors).length > 0
              }
            >
              Save
            </PMButton>
          </PMButtonGroup>
        ) : (
          <PMButtonGroup size="sm">
            <PMButton
              variant="secondary"
              onClick={handleEditToggle}
              aria-label="Edit example"
            >
              Edit
            </PMButton>
            {isNew ? (
              <PMButton
                variant="tertiary"
                onClick={handleCancelNew}
                aria-label="Cancel"
              >
                Cancel
              </PMButton>
            ) : (
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
            )}
          </PMButtonGroup>
        )}
      </PMFlex>

      {/* Code Examples Stacked Vertically */}
      <PMVStack gap={4} align="stretch">
        {/* Positive Example */}
        <PMVStack flex={1} align="stretch" gap={2}>
          <PMHeading level="h5">
            <PMIcon color="green.500" marginRight={'1'}>
              <LuCircleCheckBig />
            </PMIcon>
            Do
          </PMHeading>
          <PMBox>
            <PMCodeMirror
              value={isEditing ? editValues.positive : example.positive}
              onChange={handlePositiveChange}
              editable={isEditing}
              language={isEditing ? editValues.lang : example.lang}
              placeholder={'Code complying with the rule...'}
              height="200px"
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

        {/* Negative Example */}
        <PMVStack flex={1} align="stretch" gap={2}>
          <PMHeading level="h5">
            <PMIcon color="red.500" marginRight={'1'}>
              <LuCircleX />
            </PMIcon>
            Don't
          </PMHeading>
          <PMBox>
            <PMCodeMirror
              value={isEditing ? editValues.negative : example.negative}
              onChange={handleNegativeChange}
              editable={isEditing}
              language={isEditing ? editValues.lang : example.lang}
              placeholder={'Code violating the rule...'}
              height="200px"
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

      {/* Total character count error */}
      {validationErrors.total && (
        <PMBox
          mt={2}
          p={2}
          bg="red.50"
          border="1px solid"
          borderColor="red.200"
          borderRadius="md"
        >
          <PMText color="error" variant="small">
            {validationErrors.total}
          </PMText>
        </PMBox>
      )}
    </PMBox>
  );
};
