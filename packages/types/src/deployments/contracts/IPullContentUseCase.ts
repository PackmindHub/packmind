import { IUseCase, PackmindCommand } from '../../UseCase';
import { FileUpdates } from '../FileUpdates';
import { CodingAgent } from '../../coding-agent/CodingAgent';

export type IPullContentResponse = {
  fileUpdates: FileUpdates;
  skillFolders: string[]; // Full paths for rendered skill folders, e.g., [".claude/skills/my-skill", ".github/skills/my-skill"]
  targetId?: string;
  resolvedAgents: CodingAgent[]; // Agents resolved by the server (from command.agents or org-level config)
  /**
   * What each package slug actually resolved to, keyed by the normalized
   * `@space/package` slug: an exact `X.Y.Z` when a release was rendered, or
   * `*` when the live package was. This is what the caller writes back into
   * `packmind.json`, so asking for the newest release records a concrete
   * version rather than a spec that would float.
   *
   * Optional so a CLI can still talk to a server that predates pinning.
   */
  resolvedPackageVersions?: Record<string, string>;
};

export type PullContentCommand = PackmindCommand & {
  packagesSlugs: string[];
  /**
   * Which version each slug asks for — `*` or an exact `X.Y.Z` — keyed by the
   * slug exactly as it appears in `packagesSlugs`.
   *
   * Absent entirely means every slug tracks the live package, which is what a
   * CLI released before pinning meant by sending a slug at all. Present, a
   * slug it does not mention names no version, and the newest release answers
   * — `resolvedPackageVersions` says which one that was.
   */
  packageVersions?: Record<string, string>;
  previousPackagesSlugs?: string[]; // Previously installed packages for change detection
  // Git target info for distribution history lookup (to detect skills removed from packages)
  gitRemoteUrl?: string;
  gitBranch?: string;
  relativePath?: string;
  // Optional agents to generate artifacts for (overrides org-level config when present)
  agents?: CodingAgent[];
};

export type IPullContentUseCase = IUseCase<
  PullContentCommand,
  IPullContentResponse
>;
