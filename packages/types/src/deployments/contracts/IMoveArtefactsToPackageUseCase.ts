import { IUseCase, PackmindCommand } from '../../UseCase';
import { Package, PackageId } from '../Package';
import { CommandId } from '../../commands';
import { StandardId } from '../../standards';
import { SkillId } from '../../skills';
import { SpaceId } from '../../spaces';

export type MoveArtefactsToPackageCommand = PackmindCommand & {
  spaceId: SpaceId;
  packageId: PackageId;
  standardIds?: StandardId[];
  recipeIds?: CommandId[];
  skillIds?: SkillId[];
};

/** One package the move emptied, and the artefacts it lost. */
export type ArtefactsRemovedFromPackage = {
  packageId: PackageId;
  standards: string[];
  commands: string[];
  skills: string[];
};

export type MoveArtefactsToPackageResponse = {
  package: Package;
  added: {
    standards: string[];
    commands: string[];
    skills: string[];
  };
  /** Artefacts the target package already held: the move left them alone. */
  skipped: {
    standards: string[];
    commands: string[];
    skills: string[];
  };
  removedFrom: ArtefactsRemovedFromPackage[];
};

/**
 * Puts artefacts in one package and takes them out of every other package in
 * the space, so an artefact belongs to a single package. The whole move either
 * lands or is rolled back — see IDeploymentPort.moveArtefactsToPackage.
 */
export type IMoveArtefactsToPackageUseCase = IUseCase<
  MoveArtefactsToPackageCommand,
  MoveArtefactsToPackageResponse
>;
