import {
  IUninstallCommand,
  IUninstallResult,
  IUninstallUseCase,
} from '../../domain/useCases/IUninstallUseCase';
import { IConfigFileRepository } from '../../domain/repositories/IConfigFileRepository';
import { ISpaceService } from '../../domain/services/ISpaceService';
import { IInstallUseCase } from '../../domain/useCases/IInstallUseCase';
import { normalizePackageSlugs } from '../utils/normalizePackageSlugs';

export class UninstallUseCase implements IUninstallUseCase {
  constructor(
    private readonly configFileRepository: IConfigFileRepository,
    private readonly spaceService: ISpaceService,
    private readonly installUseCase: IInstallUseCase,
  ) {}

  public async execute(command: IUninstallCommand): Promise<IUninstallResult> {
    const baseDirectory = command.baseDirectory || process.cwd();

    const config = await this.configFileRepository.readConfig(baseDirectory);
    if (!config) {
      const configFileExists =
        await this.configFileRepository.configExists(baseDirectory);
      if (configFileExists) {
        throw new Error(
          'packmind.json exists but could not be parsed. Please fix the JSON syntax errors and try again.',
        );
      }
      throw new Error(
        'No packmind.json found in this directory. Run `packmind-cli install <@space/package>` first to install your packages.',
      );
    }

    const normalized = await normalizePackageSlugs(
      command.packages,
      this.spaceService,
    );

    const notInstalled = normalized.filter((pkg) => !(pkg in config.packages));

    if (notInstalled.length > 0) {
      const pkgList = notInstalled.map((p) => `  - ${p}`).join('\n');
      throw new Error(
        `The following package${notInstalled.length > 1 ? 's are' : ' is'} not installed:\n${pkgList}`,
      );
    }

    const updatedPackages = { ...config.packages };
    for (const pkg of normalized) {
      delete updatedPackages[pkg];
    }

    await this.configFileRepository.updateConfig(
      baseDirectory,
      'packages',
      updatedPackages,
    );

    try {
      return await this.installUseCase.execute({ baseDirectory });
    } catch (error) {
      await this.configFileRepository.updateConfig(
        baseDirectory,
        'packages',
        config.packages,
      );
      throw error;
    }
  }
}
