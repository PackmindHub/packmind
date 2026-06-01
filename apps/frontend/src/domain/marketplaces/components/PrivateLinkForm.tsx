import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  PMButton,
  PMFlex,
  PMHStack,
  PMInput,
  PMNativeSelect,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { GitProviderId, OrganizationId } from '@packmind/types';
import { useGetGitProvidersQuery } from '../../git/api/queries';
import { useLinkMarketplace } from '../api/queries';
import { LinkMarketplaceRequestBody } from '../api/gateways';
import { AgentsFieldset } from './AgentsFieldset';
import { GitNotConnectedNotice } from './GitNotConnectedNotice';
import { SubmitErrorBanner, SubmitErrorReason } from './SubmitErrorBanner';
import { mapMutationErrorToReason } from './errorMapping';

export interface PrivateLinkFormProps {
  organizationId: OrganizationId | string;
  orgSlug: string;
  onLinked: () => void;
  onCancel: () => void;
}

interface DraftState {
  gitProviderId: string;
  owner: string;
  repo: string;
  branch: string;
}

const EMPTY_DRAFT: DraftState = {
  gitProviderId: '',
  owner: '',
  repo: '',
  branch: 'main',
};

/**
 * Private path: pick a connected `GitProvider`, fill in the repo coordinates.
 * Empty providers branch deep-links to settings via `<GitNotConnectedNotice/>`.
 *
 * The marketplace display name is not a separate input — it is the repository
 * name, sent through as `name` on submit. Validation is intentionally
 * lightweight: provider, owner, repo, and branch must all be present. Deeper
 * validation (repo existence, marketplace.json present) is the backend's
 * responsibility and surfaces through `SubmitErrorBanner`.
 */
export const PrivateLinkForm = ({
  organizationId,
  orgSlug,
  onLinked,
  onCancel,
}: Readonly<PrivateLinkFormProps>) => {
  const providersQuery = useGetGitProvidersQuery();
  const linkMutation = useLinkMarketplace(organizationId);

  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [errorReason, setErrorReason] = useState<SubmitErrorReason | null>(
    null,
  );

  const providers = providersQuery.data?.providers ?? [];

  const fieldsValid = useMemo(
    () =>
      Boolean(
        draft.gitProviderId.trim() &&
        draft.owner.trim() &&
        draft.repo.trim() &&
        draft.branch.trim(),
      ),
    [draft],
  );

  if (providersQuery.isLoading) {
    return (
      <PMText color="secondary">Loading your connected Git providers…</PMText>
    );
  }

  if (providers.length === 0) {
    return <GitNotConnectedNotice orgSlug={orgSlug} />;
  }

  const handleField =
    (key: keyof DraftState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setDraft((current) => ({ ...current, [key]: event.target.value }));
      setErrorReason(null);
    };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!fieldsValid) return;

    const repo = draft.repo.trim();
    const body: LinkMarketplaceRequestBody = {
      gitProviderId: draft.gitProviderId as GitProviderId,
      owner: draft.owner.trim(),
      repo,
      branch: draft.branch.trim(),
      // The marketplace display name is the repository name — there is no
      // separate name field.
      name: repo,
    };

    try {
      await linkMutation.mutateAsync(body);
      setDraft(EMPTY_DRAFT);
      onLinked();
    } catch (error) {
      setErrorReason(mapMutationErrorToReason(error));
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Link a private marketplace">
      <PMVStack align="stretch" gap={4}>
        {errorReason && (
          <SubmitErrorBanner
            reason={errorReason}
            name={draft.repo.trim()}
            repoPath={
              draft.owner && draft.repo
                ? `${draft.owner}/${draft.repo}`
                : undefined
            }
          />
        )}

        <Field label="Git provider">
          <PMNativeSelect
            name="gitProviderId"
            value={draft.gitProviderId}
            onChange={handleField('gitProviderId')}
            items={[
              { value: '', label: 'Select a provider' },
              ...providers.map((provider) => ({
                value: provider.id,
                label: providerLabel(provider),
              })),
            ]}
            data-testid="private-link-form-provider"
          />
        </Field>

        <PMHStack gap={3} align="start">
          <PMFlex flex="1">
            <Field label="Owner">
              <PMInput
                placeholder="acme-eng"
                value={draft.owner}
                onChange={handleField('owner')}
                aria-label="Repository owner"
              />
            </Field>
          </PMFlex>
          <PMFlex flex="1">
            <Field label="Repository">
              <PMInput
                placeholder="marketplace"
                value={draft.repo}
                onChange={handleField('repo')}
                aria-label="Repository name"
              />
            </Field>
          </PMFlex>
        </PMHStack>

        <Field label="Branch">
          <PMInput
            placeholder="main"
            value={draft.branch}
            onChange={handleField('branch')}
            aria-label="Branch"
          />
        </Field>

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
            disabled={!fieldsValid || linkMutation.isPending}
          >
            Link marketplace
          </PMButton>
        </PMHStack>
      </PMVStack>
    </form>
  );
};

const Field = ({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) => (
  <PMVStack align="stretch" gap={1}>
    <PMText variant="small-important" color="secondary">
      {label}
    </PMText>
    {children}
  </PMVStack>
);

function providerLabel(provider: {
  source: string;
  url: string | null;
}): string {
  const vendor = provider.source.toUpperCase();
  return provider.url ? `${vendor} — ${provider.url}` : vendor;
}
