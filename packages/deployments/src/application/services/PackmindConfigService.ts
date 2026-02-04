import {
  CodingAgent,
  FileModification,
  PackmindFileConfig,
} from '@packmind/types';

export class PackmindConfigService {
  generateConfigContent(
    packagesSlugs: string[],
    existingPackages?: { [slug: string]: string },
    existingAgents?: CodingAgent[],
  ): PackmindFileConfig {
    const packages: { [slug: string]: string } = { ...existingPackages };

    for (const slug of packagesSlugs) {
      packages[slug] = '*';
    }

    const config: PackmindFileConfig = { packages };

    console.log('-----------------------')
    console.log(existingAgents);

    // Preserve existing agents if present
    if (existingAgents !== undefined) {
      config.agents = existingAgents;
    }

    return config;
  }

  createConfigFileModification(
    packagesSlugs: string[],
    existingPackages?: { [slug: string]: string },
    existingAgents?: CodingAgent[],
  ): FileModification {
    console.log('-----------------------')
    console.log(existingAgents);
    const config = this.generateConfigContent(
      packagesSlugs,
      existingPackages,
      existingAgents,
    );

    console.log(config);

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

    // Preserve existing agents if present
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
