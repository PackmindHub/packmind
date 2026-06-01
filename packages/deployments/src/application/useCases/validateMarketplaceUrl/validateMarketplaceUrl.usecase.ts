import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  createGitProviderId,
  createGitRepoId,
  GitRepo,
  IAccountsPort,
  IGitPort,
  IValidateMarketplaceUrlUseCase,
  MarketplaceDescriptorNotFoundError,
  MarketplaceUrlNotReachableError,
  ValidateMarketplaceUrlCommand,
  ValidateMarketplaceUrlResponse,
} from '@packmind/types';
import { fetchMarketplaceDescriptorFile } from '../../services/fetchMarketplaceDescriptorFile';
import { MarketplaceDescriptorParserRegistry } from '../../services/MarketplaceDescriptorParserRegistry';

const origin = 'ValidateMarketplaceUrlUseCase';

type ParsedMarketplaceUrl = {
  host: string;
  owner: string;
  repo: string;
  branch?: string;
};

/**
 * Pre-flight validation for the public link path.
 *
 * Given a publicly reachable Git URL, this use case:
 *  1. Parses the URL into `{ host, owner, repo, branch? }`.
 *  2. Resolves a tokenless `GitProvider` for the URL host (existing
 *     `allowTokenlessProvider` flag — providers with `hasToken=false` are
 *     considered public-only).
 *  3. Fetches `marketplace.json` via `IGitPort.getFileFromRepo`.
 *  4. Parses the descriptor via the vendor-agnostic registry.
 *
 * Error mapping (re-thrown verbatim where possible so callers map them to
 * the playground prototype UX categories):
 *  - URL malformed or no provider reachable → `MarketplaceUrlNotReachableError`
 *  - Descriptor missing → `MarketplaceDescriptorNotFoundError`
 *  - Descriptor unknown / malformed → `UnknownMarketplaceDescriptorError`
 *    or `MarketplaceDescriptorParseError` (raised by the registry)
 */
export class ValidateMarketplaceUrlUseCase
  extends AbstractAdminUseCase<
    ValidateMarketplaceUrlCommand,
    ValidateMarketplaceUrlResponse
  >
  implements IValidateMarketplaceUrlUseCase
{
  constructor(
    private readonly gitPort: IGitPort,
    private readonly parserRegistry: MarketplaceDescriptorParserRegistry,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForAdmins(
    command: ValidateMarketplaceUrlCommand & AdminContext,
  ): Promise<ValidateMarketplaceUrlResponse> {
    const { url, userId, organization } = command;

    if (!url || url.trim().length === 0) {
      throw new MarketplaceUrlNotReachableError(url ?? '');
    }

    // 1. Parse the URL into coordinates.
    const parsed = this.parseUrl(url);
    if (!parsed) {
      this.logger.warn('Failed to parse public marketplace URL', { url });
      throw new MarketplaceUrlNotReachableError(url);
    }

    // 2. Locate a tokenless provider for the host. We rely on the public
    //    listProviders surface (returns providers with their `hasToken`
    //    flag); any provider with `hasToken=false` whose URL host matches is
    //    eligible for the public path.
    const providersResponse = await this.gitPort.listProviders({
      userId,
      organizationId: organization.id,
    });
    const tokenlessProvider = providersResponse.providers.find((provider) => {
      if (provider.hasToken) {
        return false;
      }
      if (!provider.url) {
        return false;
      }
      const providerHost = this.safeHost(provider.url);
      return providerHost === parsed.host;
    });
    if (!tokenlessProvider) {
      this.logger.warn(
        'No tokenless provider matches the requested marketplace URL host',
        { host: parsed.host, url },
      );
      throw new MarketplaceUrlNotReachableError(url);
    }

    // 3. Fetch the descriptor through the tokenless provider. Build a
    //    provisional GitRepo — nothing is persisted at this stage.
    const provisionalGitRepo: GitRepo = {
      id: createGitRepoId(uuidv4()),
      owner: parsed.owner,
      repo: parsed.repo,
      branch: parsed.branch ?? 'main',
      providerId: createGitProviderId(tokenlessProvider.id),
      type: 'marketplace',
    };

    let file: Awaited<ReturnType<typeof fetchMarketplaceDescriptorFile>>;
    try {
      file = await fetchMarketplaceDescriptorFile(
        this.gitPort,
        provisionalGitRepo,
        parsed.branch,
      );
    } catch (error) {
      this.logger.warn(
        'Failed to fetch marketplace descriptor for public URL',
        {
          url,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw new MarketplaceUrlNotReachableError(url);
    }

    if (!file) {
      throw new MarketplaceDescriptorNotFoundError(parsed.owner, parsed.repo);
    }

    // 4. Parse via the registry. Descriptor errors propagate as-is so the
    //    API layer can map them to `not-found | malformed | unknown-vendor`.
    const descriptor = this.parserRegistry.parse(file.content);

    return {
      kind: 'verified',
      repoPath: `${parsed.owner}/${parsed.repo}`,
      defaultBranch: parsed.branch ?? 'main',
      pluginCount: descriptor.plugins.length,
    };
  }

  /**
   * Parse a Git web URL into `{ host, owner, repo, branch? }`.
   *
   * Accepts conventional `https://<host>/<owner>/<repo>` shapes, optionally
   * with a `tree/<branch>` segment. Returns `null` on malformed input.
   */
  private parseUrl(rawUrl: string): ParsedMarketplaceUrl | null {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return null;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }
    const segments = url.pathname
      .replace(/\.git$/, '')
      .split('/')
      .filter((segment) => segment.length > 0);
    if (segments.length < 2) {
      return null;
    }
    const [owner, repo, ...rest] = segments;
    let branch: string | undefined;
    const treeIndex = rest.indexOf('tree');
    if (treeIndex >= 0 && rest[treeIndex + 1]) {
      branch = rest[treeIndex + 1];
    }
    return {
      host: url.host,
      owner,
      repo,
      branch,
    };
  }

  /**
   * Extract the URL host without throwing — returns `null` on malformed
   * provider URLs so the caller can skip the provider rather than crash.
   */
  private safeHost(rawUrl: string): string | null {
    try {
      return new URL(rawUrl).host;
    } catch {
      return null;
    }
  }
}
