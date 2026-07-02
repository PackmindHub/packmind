import { PackmindLogger } from '@packmind/logger';
import {
  IRecipesPort,
  ISkillsPort,
  IStandardsPort,
  Package,
  VersionFingerprint,
} from '@packmind/types';

const origin = 'PackageVersionFingerprintService';

/**
 * Computes a stable fingerprint of a package's current artifact versions
 * (latest version number per recipe/standard/skill). No rendering and no user
 * context required — safe to call from background jobs. Used at publish time
 * to baseline a distribution, and on reconcile to detect "outdated".
 */
export class PackageVersionFingerprintService {
  constructor(
    private readonly recipesPort: IRecipesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async compute(pkg: Package): Promise<VersionFingerprint> {
    const recipes: Record<string, number> = {};
    await Promise.all(
      pkg.recipes.map(async (recipeId) => {
        const versions = await this.recipesPort.listRecipeVersions(recipeId);
        const latest = versions.reduce(
          (max, v) => (v.version > max ? v.version : max),
          0,
        );
        recipes[recipeId] = latest;
      }),
    );

    const standards: Record<string, number> = {};
    await Promise.all(
      pkg.standards.map(async (standardId) => {
        const latest =
          await this.standardsPort.getLatestStandardVersion(standardId);
        standards[standardId] = latest?.version ?? 0;
      }),
    );

    const skills: Record<string, number> = {};
    await Promise.all(
      pkg.skills.map(async (skillId) => {
        const latest = await this.skillsPort.getLatestSkillVersion(skillId);
        skills[skillId] = latest?.version ?? 0;
      }),
    );

    return { recipes, standards, skills };
  }
}
