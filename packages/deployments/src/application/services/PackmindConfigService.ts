import {
  CodingAgent,
  FileModification,
  PackmindFileConfig,
  WILDCARD_VERSION_SPEC,
} from '@packmind/types';
import { parsePackageSlug } from './packageSlugHelpers';

export class PackmindConfigService {
  /**
   * @param versionsBySlug what each slug pins, keyed by the same slug as in
   *   `packagesSlugs`. A slug with no entry tracks the live package — which is
   *   what every config written before pinning said.
   */
  generateConfigContent(
    packagesSlugs: string[],
    existingPackages?: { [slug: string]: string },
    existingAgents?: CodingAgent[],
    versionsBySlug?: { [slug: string]: string },
  ): PackmindFileConfig {
    const packages: { [slug: string]: string } = { ...existingPackages };

    for (const slug of packagesSlugs) {
      const { spaceSlug, packageSlug } = parsePackageSlug(slug);
      if (spaceSlug !== null && packages[packageSlug] !== undefined) {
        delete packages[packageSlug];
      }
      packages[slug] = versionsBySlug?.[slug] ?? WILDCARD_VERSION_SPEC;
    }

    const config: PackmindFileConfig = { packages };

    if (existingAgents !== undefined) {
      config.agents = existingAgents;
    }

    return config;
  }

  createConfigFileModification(
    packagesSlugs: string[],
    existingPackages?: { [slug: string]: string },
    existingAgents?: CodingAgent[],
    versionsBySlug?: { [slug: string]: string },
  ): FileModification {
    const config = this.generateConfigContent(
      packagesSlugs,
      existingPackages,
      existingAgents,
      versionsBySlug,
    );

    return {
      path: 'packmind.json',
      content: JSON.stringify(config, null, 2) + '\n',
    };
  }

  removePackageFromConfig(
    slugToRemove: string,
    existingPackages: { [slug: string]: string },
    existingAgents?: CodingAgent[],
  ): PackmindFileConfig {
    const packages = { ...existingPackages };
    delete packages[slugToRemove];

    const config: PackmindFileConfig = { packages };

    if (existingAgents !== undefined) {
      config.agents = existingAgents;
    }

    return config;
  }

  createRemovalConfigFileModification(
    slugToRemove: string,
    existingPackages: { [slug: string]: string },
    existingAgents?: CodingAgent[],
  ): FileModification {
    const config = this.removePackageFromConfig(
      slugToRemove,
      existingPackages,
      existingAgents,
    );

    return {
      path: 'packmind.json',
      content: JSON.stringify(config, null, 2) + '\n',
    };
  }
}
