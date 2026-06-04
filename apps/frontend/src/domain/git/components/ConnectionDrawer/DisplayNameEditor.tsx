import { useEffect, useMemo, useState } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMInput,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuCheck, LuPenLine, LuX } from 'react-icons/lu';

const MAX_LENGTH = 64;

type DisplayNameEditorProps = {
  value: string;
  placeholder: string;
  otherNames: string[];
  onSave: (next: string) => Promise<void>;
  onEditingChange?: (editing: boolean) => void;
};

export function DisplayNameEditor({
  value,
  placeholder,
  otherNames,
  onSave,
  onEditingChange,
}: Readonly<DisplayNameEditorProps>) {
  const [editing, setEditingState] = useState(false);
  const [draft, setDraft] = useState(value);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const setEditing = (next: boolean) => {
    setEditingState(next);
    onEditingChange?.(next);
  };

  useEffect(() => {
    setDraft(value);
    setTouched(false);
    setEditingState(false);
    onEditingChange?.(false);
    setServerError(null);
  }, [value, onEditingChange]);

  const trimmed = draft.trim();
  const lowered = trimmed.toLowerCase();
  const localCollision = useMemo(
    () =>
      trimmed.length > 0 &&
      otherNames.some((n) => n.trim().toLowerCase() === lowered),
    [trimmed, otherNames, lowered],
  );
  const overLimit = draft.length >= MAX_LENGTH;
  const collisionError =
    touched && localCollision
      ? 'A connection with this name already exists.'
      : null;
  const error = serverError ?? collisionError;
  const canSave = !localCollision && !saving && trimmed !== value;

  const hasName = value.trim().length > 0;

  if (!editing) {
    return (
      <PMVStack gap={2} align="stretch">
        <PMText
          fontSize="xs"
          color="faded"
          textTransform="uppercase"
          letterSpacing="wider"
          fontWeight="semibold"
        >
          Display name
        </PMText>
        <PMHStack gap={2} align="center" justify="space-between">
          <PMText
            fontSize="lg"
            color={hasName ? 'primary' : 'faded'}
            fontStyle={hasName ? 'normal' : 'italic'}
            fontWeight={hasName ? 'semibold' : 'normal'}
            truncate
          >
            {hasName ? value : placeholder}
          </PMText>
          <PMBox
            as="button"
            aria-label="Edit display name"
            bg="transparent"
            border="none"
            color="text.secondary"
            cursor="pointer"
            display="flex"
            alignItems="center"
            gap="6px"
            padding="6px 8px"
            borderRadius="sm"
            _hover={{ color: 'text.primary', bg: 'background.tertiary' }}
            onClick={() => setEditing(true)}
            data-testid="display-name-edit"
          >
            <PMIcon fontSize="sm">
              <LuPenLine />
            </PMIcon>
            <PMText fontSize="xs" fontWeight="medium" color="secondary">
              Rename
            </PMText>
          </PMBox>
        </PMHStack>
      </PMVStack>
    );
  }

  const handleSave = async () => {
    setTouched(true);
    if (!canSave) return;
    setSaving(true);
    setServerError(null);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to update the display name.';
      setServerError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(value);
    setTouched(false);
    setServerError(null);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (saving) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <PMVStack gap={2} align="stretch">
      <PMHStack justify="space-between" align="baseline">
        <PMText
          fontSize="xs"
          color="faded"
          textTransform="uppercase"
          letterSpacing="wider"
          fontWeight="semibold"
        >
          Display name
        </PMText>
        <PMText
          fontSize="xs"
          color={overLimit ? 'warning' : 'faded'}
          fontVariantNumeric="tabular-nums"
        >
          {draft.length}/{MAX_LENGTH}
        </PMText>
      </PMHStack>
      <PMHStack gap={2} align="stretch">
        <PMInput
          autoFocus
          value={draft}
          onChange={(e) => {
            const next = e.target.value.slice(0, MAX_LENGTH);
            setDraft(next);
            setTouched(true);
            setServerError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Connection display name"
          aria-invalid={!!error}
          aria-describedby={error ? 'display-name-error' : undefined}
          maxLength={MAX_LENGTH}
          data-testid="display-name-input"
        />
        <PMButton
          variant="primary"
          size="sm"
          disabled={!canSave}
          loading={saving}
          onClick={handleSave}
          aria-label="Save display name"
          data-testid="display-name-save"
        >
          <PMIcon fontSize="sm">
            <LuCheck />
          </PMIcon>
        </PMButton>
        <PMButton
          variant="tertiary"
          size="sm"
          disabled={saving}
          onClick={handleCancel}
          aria-label="Cancel display name edit"
        >
          <PMIcon fontSize="sm">
            <LuX />
          </PMIcon>
        </PMButton>
      </PMHStack>
      {error ? (
        <PMText
          id="display-name-error"
          role="alert"
          fontSize="xs"
          color="error"
        >
          {error}
        </PMText>
      ) : (
        <PMText fontSize="xs" color="faded">
          Up to 64 characters. Leave empty to use the placeholder.
        </PMText>
      )}
    </PMVStack>
  );
}
