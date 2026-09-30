import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  IGitPort,
  PackmindFileConfig,
  TargetId,
  parsePackageVersionSpec,
} from '@packmind/types';
import { TargetService } from './TargetService';
import { getTargetPrefixedPath } from '../utils/GitFileUtils';

const origin = 'TargetPackmindConfigReader';

/**
 * Reads the `packmind.json` a destination currently carries.
 *
 * It exists so a distribution can honour what the repo already says. A repo
 * that pinned a package did so deliberately, and a push that overwrote the pin
 * with `*` because it happened not to name a version would undo that silently
 * — which is exactly what every `Update` did before this.
 *
 * Every failure reads as "no config": an absent file, a repo that cannot be
 * reached, a file someone hand-edited into invalid JSON. The caller's fallback
 * is the live package, which is what a destination with no config gets anyway.
 */
export class TargetPackmindConfigReader {
  constructor(
    private readonly targetService: TargetService,
    private readonly gitPort: IGitPort,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {}

  async read(targetId: TargetId): Promise<PackmindFileConfig | null> {
    try {
      const target = await this.targetService.findById(targetId);
      if (!target) {
        return null;
      }

      const gitRepo = await this.gitPort.getRepositoryById(target.gitRepoId);
      if (!gitRepo) {
        return null;
      }

      const fileData = await this.gitPort.getFileFromRepo(
        gitRepo,
        getTargetPrefixedPath('packmind.json', target),
      );
      if (!fileData) {
        return null;
      }

      return JSON.parse(fileData.content) as PackmindFileConfig;
    } catch (error) {
      this.logger.info('Could not read packmind.json for target', {
        targetId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * The exact version a destination pins a package to, or null when it tracks
   * the live package, does not carry the package, or could not be read.
   *
   * Both spellings are looked up: `packmind.json` records `@space/package`,
   * but a file written before slugs were normalized may hold the bare one.
   */
  pinnedVersion(
    config: PackmindFileConfig | null,
    scopedSlug: string,
    bareSlug: string,
  ): string | null {
    const raw = config?.packages?.[scopedSlug] ?? config?.packages?.[bareSlug];
    const spec = parsePackageVersionSpec(raw);
    return spec?.kind === 'exact' ? spec.version : null;
  }
}
