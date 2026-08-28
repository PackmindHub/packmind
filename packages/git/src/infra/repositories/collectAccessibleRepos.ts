import { ExternalRepository } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { ListAvailableRepositoriesResult } from '../../domain/repositories/IGitProvider';

/**
 * How many accessible repositories one request tries to gather before it hands
 * a batch back to the caller.
 */
export const ACCESSIBLE_REPOS_PER_REQUEST = 100;

/**
 * Ceiling on the provider round trips a single request may spend. Access
 * filtering can leave a provider page contributing one repository, so chasing a
 * full batch quietly turned "one page" into dozens of sequential calls — past
 * the point where the browser gives up, at which point the reader got nothing
 * at all rather than a short list. Stopping early costs nothing: the caller
 * resumes from `lastLoadedPage + 1`.
 */
export const MAX_PROVIDER_PAGES_PER_REQUEST = 4;

type ProviderPage = {
  repositories: ExternalRepository[];
  totalPages: number;
};

/**
 * Walk a provider's pages until there are enough accessible repositories to
 * return, the pages run out, or we have spent our allowance of round trips.
 *
 * A page that fails after the first one has landed does not fail the request:
 * an incomplete list the reader can act on beats an error page, and `partial`
 * lets the caller say so.
 */
export async function collectAccessibleRepos({
  startPage,
  fetchPage,
  logger,
  maxPages = MAX_PROVIDER_PAGES_PER_REQUEST,
  targetCount = ACCESSIBLE_REPOS_PER_REQUEST,
}: {
  startPage: number;
  fetchPage: (page: number) => Promise<ProviderPage>;
  logger: PackmindLogger;
  maxPages?: number;
  targetCount?: number;
}): Promise<ListAvailableRepositoriesResult> {
  const repositories: ExternalRepository[] = [];
  let totalPages = startPage;
  let lastLoadedPage = startPage;
  let pagesFetched = 0;
  let partial = false;
  let currentPage = startPage;

  do {
    let page: ProviderPage;

    try {
      page = await fetchPage(currentPage);
    } catch (error) {
      // Nothing has landed yet, so there is no list to degrade to and the
      // caller still needs to hear about the failure.
      if (pagesFetched === 0) {
        throw error;
      }

      logger.warn('Stopping repository pagination on a failed provider page', {
        page: currentPage,
        collected: repositories.length,
        error: error instanceof Error ? error.message : String(error),
      });
      partial = true;
      break;
    }

    totalPages = page.totalPages;
    lastLoadedPage = currentPage;
    pagesFetched += 1;
    repositories.push(...page.repositories);
    currentPage += 1;
  } while (
    repositories.length < targetCount &&
    lastLoadedPage < totalPages &&
    pagesFetched < maxPages
  );

  return { repositories, totalPages, lastLoadedPage, partial };
}
