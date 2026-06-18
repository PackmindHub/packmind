import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  PMAlert,
  PMButton,
  PMHStack,
  PMInput,
  PMSpinner,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { OrganizationId } from '@packmind/types';
import { useLinkMarketplace, useValidateMarketplaceUrl } from '../api/queries';
import { LinkMarketplaceRequestBody } from '../api/gateways';
import { AgentsFieldset } from './AgentsFieldset';
import { SubmitErrorBanner } from './SubmitErrorBanner';
import { getSubmitErrorMessage } from './errorMapping';

export interface PublicLinkFormProps {
  organizationId: OrganizationId | string;
  onLinked: () => void;
  onCancel: () => void;
}

const VALIDATE_DEBOUNCE_MS = 400;

/**
 * Public path: paste a tokenless repository URL, validate it through the
 * backend, then submit. The validation step short-circuits via TanStack
 * Query's `enabled` flag while the URL is still being typed.
 */
export const PublicLinkForm = ({
  organizationId,
  onLinked,
  onCancel,
}: Readonly<PublicLinkFormProps>) => {
  const [url, setUrl] = useState('');
  const [debouncedUrl, setDebouncedUrl] = useState('');
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debounce — keeps the validate-url request quiet while the user is typing.
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedUrl(url.trim());
    }, VALIDATE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [url]);

  const validation = useValidateMarketplaceUrl(organizationId, debouncedUrl);
  const linkMutation = useLinkMarketplace(organizationId);

  const validationKind = useMemo<
    'idle' | 'checking' | 'verified' | 'error'
  >(() => {
    if (!debouncedUrl) return 'idle';
    if (validation.isLoading || validation.isFetching) return 'checking';
    if (validation.isError) return 'error';
    if (validation.data) return 'verified';
    return 'idle';
  }, [
    debouncedUrl,
    validation.isLoading,
    validation.isFetching,
    validation.isError,
    validation.data,
  ]);

  const validatedCoords = useMemo(() => {
    if (validationKind !== 'verified' || !validation.data) return null;
    const segments = validation.data.repoPath.split('/');
    if (segments.length < 2) return null;
    return {
      owner: segments[0],
      repo: segments.slice(1).join('/'),
      defaultBranch: validation.data.defaultBranch,
    };
  }, [validation.data, validationKind]);

  const validationErrorMessage: string | null =
    validationKind === 'error' ? getSubmitErrorMessage(validation.error) : null;

  const canSubmit =
    validationKind === 'verified' &&
    !!name.trim() &&
    !!validatedCoords &&
    !linkMutation.isPending;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !validatedCoords) return;

    // The public path links via a tokenless GitProvider resolved by the
    // backend from the host. The frontend does not need to surface the
    // provider id, but the link contract still requires it — the backend
    // accepts a sentinel and looks it up server-side. We pass the validated
    // repo path verbatim.
    //
    // NB: if the backend ever rejects a missing gitProviderId for the public
    // path, this is the line to revisit. The validate-url endpoint already
    // verified reachability via the tokenless provider.
    const body: LinkMarketplaceRequestBody = {
      gitProviderId: '',
      owner: validatedCoords.owner,
      repo: validatedCoords.repo,
      branch: validatedCoords.defaultBranch,
      name: name.trim(),
    };

    try {
      await linkMutation.mutateAsync(body);
      setUrl('');
      setDebouncedUrl('');
      setName('');
      onLinked();
    } catch (error) {
      setErrorMessage(getSubmitErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Link a public marketplace">
      <PMVStack align="stretch" gap={4}>
        {errorMessage && <SubmitErrorBanner message={errorMessage} />}

        {validationErrorMessage && (
          <SubmitErrorBanner message={validationErrorMessage} />
        )}

        <PMVStack align="stretch" gap={1}>
          <PMText variant="small-important" color="secondary">
            Repository URL
          </PMText>
          <PMInput
            placeholder="https://github.com/org/repo"
            value={url}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setUrl(event.target.value);
              setErrorMessage(null);
            }}
            aria-label="Repository URL"
          />
          <ValidationHint
            validationKind={validationKind}
            repoPath={validation.data?.repoPath}
            defaultBranch={validation.data?.defaultBranch}
            pluginCount={validation.data?.pluginCount}
          />
        </PMVStack>

        {validationKind === 'verified' && (
          <PMVStack align="stretch" gap={1}>
            <PMText variant="small-important" color="secondary">
              Display name
            </PMText>
            <PMInput
              placeholder="e.g. Community OSS playbook"
              value={name}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setName(event.target.value)
              }
              aria-label="Display name"
            />
          </PMVStack>
        )}

        <AgentsFieldset vendor="anthropic" />

        <PMHStack gap={2} justify="end">
          <PMButton variant="tertiary" size="sm" onClick={onCancel}>
            Cancel
          </PMButton>
          <PMButton
            variant="primary"
            size="sm"
            type="submit"
            loading={linkMutation.isPending}
            disabled={!canSubmit}
          >
            Link marketplace
          </PMButton>
        </PMHStack>
      </PMVStack>
    </form>
  );
};

interface ValidationHintProps {
  validationKind: 'idle' | 'checking' | 'verified' | 'error';
  repoPath?: string;
  defaultBranch?: string;
  pluginCount?: number;
}

const ValidationHint = ({
  validationKind,
  repoPath,
  defaultBranch,
  pluginCount,
}: Readonly<ValidationHintProps>) => {
  if (validationKind === 'idle') {
    return (
      <PMText variant="small" color="faded">
        Paste an HTTPS or SSH URL. We check the repository is publicly readable.
      </PMText>
    );
  }

  if (validationKind === 'checking') {
    return (
      <PMHStack gap={2} align="center">
        <PMSpinner size="sm" />
        <PMText variant="small" color="faded">
          Checking access…
        </PMText>
      </PMHStack>
    );
  }

  if (validationKind === 'verified' && repoPath) {
    return (
      <PMAlert.Root status="success">
        <PMAlert.Indicator />
        <PMAlert.Title>Repository verified</PMAlert.Title>
        <PMAlert.Description>
          {repoPath}
          {defaultBranch ? ` · ${defaultBranch}` : ''}
          {typeof pluginCount === 'number'
            ? ` · ${pluginCount} ${pluginCount === 1 ? 'plugin' : 'plugins'}`
            : ''}
        </PMAlert.Description>
      </PMAlert.Root>
    );
  }

  return null;
};
