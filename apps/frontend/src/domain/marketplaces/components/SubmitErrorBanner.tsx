import { PMAlert } from '@packmind/ui';

/**
 * All known submission failure reasons surfaced by the link / public-validation
 * flows. The backend throws typed domain errors which the gateway maps into
 * one of these reasons before reaching the form.
 *
 * Order matches the playground spec (`apps/playground/src/prototypes/marketplaces/types.ts`)
 * plus the four additional reasons exposed by the backend
 * (`MarketplaceAlreadyLinkedError`, `GitRepoAlreadyLinkedAsStandardError`,
 * `MarketplaceDescriptorNotFoundError`, `MarketplaceUrlNotReachableError`).
 */
export type SubmitErrorReason =
  | 'marketplace-already-linked'
  | 'gitrepo-already-linked-as-standard'
  | 'descriptor-not-found'
  | 'unknown-descriptor'
  | 'descriptor-parse-error'
  | 'url-not-reachable'
  | 'not-public'
  | 'network';

export interface SubmitErrorBannerProps {
  reason: SubmitErrorReason;
  /** Optional name surfaced in the duplicate-marketplace copy. */
  name?: string;
  /** Optional repo path surfaced in the conflict copies. */
  repoPath?: string;
}

type Copy = {
  title: string;
  description: (props: { name?: string; repoPath?: string }) => string;
};

const COPY: Record<SubmitErrorReason, Copy> = {
  'marketplace-already-linked': {
    title: 'Marketplace already linked',
    description: ({ repoPath }) =>
      repoPath
        ? `The repository ${repoPath} is already linked as a marketplace for this organization.`
        : 'This repository is already linked as a marketplace for this organization.',
  },
  'gitrepo-already-linked-as-standard': {
    title: 'Repository already in use',
    description: ({ repoPath }) =>
      repoPath
        ? `The repository ${repoPath} is already connected as a standard repository. Disconnect it before linking it as a marketplace.`
        : 'This repository is already connected as a standard repository. Disconnect it before linking it as a marketplace.',
  },
  'descriptor-not-found': {
    title: 'marketplace.json not found',
    description: () =>
      'No marketplace.json file was found at the root of the repository. Add the descriptor and try again.',
  },
  'unknown-descriptor': {
    title: 'Unsupported marketplace format',
    description: () =>
      'The marketplace.json file does not match a supported format. Check the file structure and try again.',
  },
  'descriptor-parse-error': {
    title: 'Unable to read marketplace.json',
    description: () =>
      'The marketplace.json file is malformed or missing required fields. Fix the file and try again.',
  },
  'url-not-reachable': {
    title: 'Repository unreachable',
    description: () =>
      'The repository could not be reached. Check the URL and try again.',
  },
  'not-public': {
    title: 'Repository is not public',
    description: () =>
      'This repository is not publicly readable. Switch to the Private tab to link it through a connected Git provider.',
  },
  network: {
    title: 'Unable to reach Packmind',
    description: () =>
      'The server could not be reached. Check your connection and try again.',
  },
};

export const SubmitErrorBanner = ({
  reason,
  name,
  repoPath,
}: Readonly<SubmitErrorBannerProps>) => {
  const copy = COPY[reason];

  return (
    <PMAlert.Root
      status="error"
      role="alert"
      data-testid={`submit-error-banner-${reason}`}
    >
      <PMAlert.Indicator />
      <PMAlert.Title>{copy.title}</PMAlert.Title>
      <PMAlert.Description>
        {copy.description({ name, repoPath })}
      </PMAlert.Description>
    </PMAlert.Root>
  );
};
