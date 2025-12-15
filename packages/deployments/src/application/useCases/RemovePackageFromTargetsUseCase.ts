import {
  IRemovePackageFromTargetsUseCase,
  RemovePackageFromTargetsCommand,
  RemovePackageFromTargetsResponse,
} from '@packmind/types';
import { PackageService } from '../services/PackageService';
import { TargetService } from '../services/TargetService';
import { PackageNotFoundError } from '../../domain/errors/PackageNotFoundError';
import { TargetNotFoundError } from '../../domain/errors/TargetNotFoundError';

export class RemovePackageFromTargetsUseCase
  implements IRemovePackageFromTargetsUseCase
{
  constructor(
    private readonly packageService: PackageService,
    private readonly targetService: TargetService,
  ) {}

  async execute(
    command: RemovePackageFromTargetsCommand,
  ): Promise<RemovePackageFromTargetsResponse> {
    const pkg = await this.packageService.findById(command.packageId);
    if (!pkg) {
      throw new PackageNotFoundError(command.packageId);
    }

    for (const targetId of command.targetIds) {
      const target = await this.targetService.findById(targetId);
      if (!target) {
        throw new TargetNotFoundError(targetId);
      }
    }

    return { results: [] };
  }
}
