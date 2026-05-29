import type { AxiosError } from 'axios';
import type { SubmitErrorReason } from './SubmitErrorBanner';

/**
 * Maps a thrown error from `useLinkMarketplace` / `useValidateMarketplaceUrl`
 * to the matching `SubmitErrorReason` that `SubmitErrorBanner` understands.
 *
 * The backend HTTP layer (`marketplaces.controller.ts`) translates each typed
 * domain error to a specific status code + the error class name in the
 * response body — we key off both. Anything we can't classify falls through
 * to `'network'`.
 */
export function mapMutationErrorToReason(error: unknown): SubmitErrorReason {
  if (!error || typeof error !== 'object') {
    return 'network';
  }

  const axiosError = error as AxiosError<{
    error?: string;
    name?: string;
    message?: string;
  }>;

  const data = axiosError.response?.data;
  const status = axiosError.response?.status;

  const candidate =
    (typeof data?.error === 'string' && data.error) ||
    (typeof data?.name === 'string' && data.name) ||
    (typeof data?.message === 'string' && data.message) ||
    '';

  const haystack = candidate.toLowerCase();

  if (
    status === 409 &&
    haystack.includes('marketplace') &&
    haystack.includes('alreadylinked')
  ) {
    return 'marketplace-already-linked';
  }

  if (
    status === 409 &&
    haystack.includes('gitrepo') &&
    haystack.includes('standard')
  ) {
    return 'gitrepo-already-linked-as-standard';
  }

  if (haystack.includes('descriptornotfound')) {
    return 'descriptor-not-found';
  }

  if (haystack.includes('unknownmarketplacedescriptor')) {
    return 'unknown-descriptor';
  }

  if (haystack.includes('descriptorparseerror')) {
    return 'descriptor-parse-error';
  }

  if (haystack.includes('urlnotreachable')) {
    return 'url-not-reachable';
  }

  if (haystack.includes('notpublic')) {
    return 'not-public';
  }

  return 'network';
}
