import { FileModification, PackmindFileConfig } from '@packmind/types';

export class PackmindConfigService {
  generateConfigContent(packagesSlugs: string[]): PackmindFileConfig {
    const packages: { [slug: string]: string } = {};

    for (const slug of packagesSlugs) {
      packages[slug] = '*';
    }

    return { packages };
  }

  createConfigFileModification(packagesSlugs: string[]): FileModification {
    const config = this.generateConfigContent(packagesSlugs);

    return {
      path: 'packmind.json',
      content: JSON.stringify(config, null, 2) + '\n',
    };
  }
}
