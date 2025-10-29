import React, { useState } from 'react';
import { RuleExample } from '@packmind/shared/types';
import {
  RuleId,
  ProgrammingLanguage,
  getAllLanguagesSortedByDisplayName,
} from '@packmind/shared/types';
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
  PMNativeSelect,
} from '@packmind/ui';
import { LuCircleCheckBig, LuCircleX } from 'react-icons/lu';

interface RuleExampleItemProps {
  example: RuleExample | NewExample;
  standardId: string;
  ruleId: RuleId;
  isNew?: boolean;
  onSaveNew?: (
    example: NewExample,
    values: { lang: string; positive: string; negative: string },
  ) => Promise<void>;
  onCancelNew?: (exampleId: string) => void;
}

export const RuleExampleItem: React.FC<RuleExampleItemProps> = ({
  example,
  standardId,
  ruleId,
  isNew = false,
  onSaveNew,
  onCancelNew,
}) => {
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

  // Get sorted languages for the dropdown
  const sortedLanguages = getAllLanguagesSortedByDisplayName();
  const languageOptions = sortedLanguages.map(({ language, info }) => ({
    value: language,
    label: info.displayName,
  }));

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
          setIsSaving(false);
          setIsEditing(false);
        } catch (error) {
          console.error('Failed to save new example:', error);
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
      deleteMutation.mutate({
        standardId,
        ruleId,
        exampleId: (example as RuleExample).id,
      });
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
      <PMFlex justify="space-between" align="center" mb={4}>
        <PMHStack>
          <PMText>Language:</PMText>
          {isEditing && isNew ? (
            <PMNativeSelect
              value={editValues.lang}
              onChange={(e) =>
                setEditValues((prev) => ({
                  ...prev,
                  lang: e.target.value as ProgrammingLanguage,
                }))
              }
              items={languageOptions}
              size="sm"
            />
          ) : (
            <PMBadge colorPalette={'blue'} size={'lg'}>
              {sortedLanguages.find(({ language }) => language === example.lang)
                ?.info.displayName || example.lang}
            </PMBadge>
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

      {/* Code Examples Side by Side */}
      <PMGrid gridTemplateColumns={'repeat(2, minmax(0, 1fr))'} gap={4}>
        <PMGridItem>
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
        </PMGridItem>
        <PMGridItem>
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
        </PMGridItem>
      </PMGrid>

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
