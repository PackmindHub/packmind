import {
  CommandId,
  ICommandsPort,
  ISkillsPort,
  IStandardsPort,
  SkillId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { ArtefactNotInSpaceError } from '../../domain/errors/ArtefactNotInSpaceError';

export type ArtefactSpacePorts = {
  commandsPort: ICommandsPort;
  standardsPort: IStandardsPort;
  skillsPort: ISkillsPort;
};

export type ArtefactIds = {
  standardIds?: StandardId[];
  commandIds?: CommandId[];
  skillIds?: SkillId[];
};

/**
 * A package only ever holds artefacts from its own space.
 *
 * `AddArtefactsToPackageUseCase` deliberately keeps its own inline copy of
 * this rule: it answers the older route that CLIs and app versions already in
 * the wild call, and its behaviour is frozen. Change this one and that one
 * stays put.
 *
 * Missing and living-in-another-space raise the same error on purpose: telling
 * the caller which one it was would describe an artefact they cannot see.
 */
export async function assertArtefactsInSpace(
  ports: ArtefactSpacePorts,
  spaceId: SpaceId,
  { standardIds = [], commandIds = [], skillIds = [] }: ArtefactIds,
): Promise<void> {
  if (commandIds.length > 0) {
    const commands = await Promise.all(
      commandIds.map((commandId) =>
        ports.commandsPort.getCommandByIdInternal(commandId),
      ),
    );

    commands.forEach((command, index) => {
      if (!command || command.spaceId !== spaceId) {
        throw new ArtefactNotInSpaceError(
          'command',
          commandIds[index],
          spaceId,
        );
      }
    });
  }

  if (standardIds.length > 0) {
    const standards = await Promise.all(
      standardIds.map((standardId) =>
        ports.standardsPort.getStandard(standardId),
      ),
    );

    standards.forEach((standard, index) => {
      if (!standard || standard.spaceId !== spaceId) {
        throw new ArtefactNotInSpaceError(
          'standard',
          standardIds[index],
          spaceId,
        );
      }
    });
  }

  if (skillIds.length > 0) {
    const skills = await Promise.all(
      skillIds.map((skillId) => ports.skillsPort.getSkill(skillId)),
    );

    skills.forEach((skill, index) => {
      if (!skill || skill.spaceId !== spaceId) {
        throw new ArtefactNotInSpaceError('skill', skillIds[index], spaceId);
      }
    });
  }
}
