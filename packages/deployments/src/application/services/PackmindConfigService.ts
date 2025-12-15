import { FileModification, PackmindFileConfig } from '@packmind/types';

export class PackmindConfigService {
  generateConfigContent(
    packagesSlugs: string[],
    existingPackages?: { [slug: string]: string },
  ): PackmindFileConfig {
    const packages: { [slug: string]: string } = { ...existingPackages };

    for (const slug of packagesSlugs) {
      packages[slug] = '*';
    }

    return { packages };
  }

  createConfigFileModification(
    packagesSlugs: string[],
    existingPackages?: { [slug: string]: string },
  ): FileModification {
    const config = this.generateConfigContent(packagesSlugs, existingPackages);

    return {
      path: 'packmind.json',
      content: JSON.stringify(config, null, 2) + '\n',
    };
  }

  removePackageFromConfig(
    slugToRemove: string,
    existingPackages: { [slug: string]: string },
  ): PackmindFileConfig {
    const packages = { ...existingPackages };
    delete packages[slugToRemove];

    return { packages };
  }
}
