import {
  ChangeProposalType,
  CollectionItemDeletePayload,
  CollectionItemUpdatePayload,
  CreateChangeProposalCommand,
  ISkillsPort,
  Skill,
  SkillFile,
  SkillFileId,
  SkillId,
  SkillVersionId,
  ScalarUpdatePayload,
} from '@packmind/types';
import { MemberContext, serializeSkillMetadata } from '@packmind/node-utils';
import { IChangeProposalValidator } from './IChangeProposalValidator';
import { ChangeProposalPayloadMismatchError } from '../errors/ChangeProposalPayloadMismatchError';
import { SkillVersionNotFoundError } from '../errors/SkillVersionNotFoundError';
import { SkillFileNotFoundError } from '../errors/SkillFileNotFoundError';

type ScalarSkillType =
  | ChangeProposalType.updateSkillName
  | ChangeProposalType.updateSkillDescription
  | ChangeProposalType.updateSkillPrompt
  | ChangeProposalType.updateSkillMetadata
  | ChangeProposalType.updateSkillLicense
  | ChangeProposalType.updateSkillCompatibility
  | ChangeProposalType.updateSkillAllowedTools;

const SUPPORTED_TYPES: ReadonlySet<ChangeProposalType> = new Set([
  ChangeProposalType.updateSkillName,
  ChangeProposalType.updateSkillDescription,
  ChangeProposalType.updateSkillPrompt,
  ChangeProposalType.updateSkillMetadata,
  ChangeProposalType.updateSkillLicense,
  ChangeProposalType.updateSkillCompatibility,
  ChangeProposalType.updateSkillAllowedTools,
  ChangeProposalType.addSkillFile,
  ChangeProposalType.updateSkillFileContent,
  ChangeProposalType.updateSkillFilePermissions,
  ChangeProposalType.deleteSkillFile,
]);

const SKILL_FIELD_BY_TYPE: Record<ScalarSkillType, (skill: Skill) => string> = {
  [ChangeProposalType.updateSkillName]: (skill) => skill.name,
  [ChangeProposalType.updateSkillDescription]: (skill) => skill.description,
  [ChangeProposalType.updateSkillPrompt]: (skill) => skill.prompt,
  [ChangeProposalType.updateSkillMetadata]: (skill) =>
    skill.metadata != null
      ? serializeSkillMetadata({ metadata: skill.metadata })
      : '{}',
  [ChangeProposalType.updateSkillLicense]: (skill) => skill.license ?? '',
  [ChangeProposalType.updateSkillCompatibility]: (skill) =>
    skill.compatibility ?? '',
  [ChangeProposalType.updateSkillAllowedTools]: (skill) =>
    skill.allowedTools ?? '',
};

const SCALAR_TYPES = new Set<ChangeProposalType>([
  ChangeProposalType.updateSkillName,
  ChangeProposalType.updateSkillDescription,
  ChangeProposalType.updateSkillPrompt,
  ChangeProposalType.updateSkillMetadata,
  ChangeProposalType.updateSkillLicense,
  ChangeProposalType.updateSkillCompatibility,
  ChangeProposalType.updateSkillAllowedTools,
]);

export class SkillChangeProposalValidator implements IChangeProposalValidator {
  constructor(private readonly skillsPort: ISkillsPort) {}

  supports(type: ChangeProposalType): boolean {
    return SUPPORTED_TYPES.has(type);
  }

  async validate(
    command: CreateChangeProposalCommand<ChangeProposalType> & MemberContext,
  ): Promise<{ artefactVersion: number }> {
    const skillId = command.artefactId as SkillId;

    const skill = await this.skillsPort.getSkill(skillId);
    if (!skill) {
      throw new Error(`Skill ${skillId} not found`);
    }

    if (SCALAR_TYPES.has(command.type)) {
      const payload = command.payload as ScalarUpdatePayload;
      const currentValue =
        SKILL_FIELD_BY_TYPE[command.type as ScalarSkillType](skill);
      if (payload.oldValue !== currentValue) {
        throw new ChangeProposalPayloadMismatchError(
          command.type,
          payload.oldValue,
          currentValue,
        );
      }
    }

    if (command.type === ChangeProposalType.updateSkillFileContent) {
      await this.validateFileContent(skill, command);
    }

    if (command.type === ChangeProposalType.updateSkillFilePermissions) {
      await this.validateFilePermissions(skill, command);
    }

    if (command.type === ChangeProposalType.deleteSkillFile) {
      await this.validateDeleteFile(skill, command);
    }

    return { artefactVersion: skill.version };
  }

  private async validateFileContent(
    skill: Skill,
    command: CreateChangeProposalCommand<ChangeProposalType> & MemberContext,
  ): Promise<void> {
    const payload = command.payload as CollectionItemUpdatePayload<SkillFileId>;
    const { file: targetFile } = await this.resolveSkillFile(
      skill,
      payload.targetId,
    );

    if (payload.oldValue !== targetFile.content) {
      throw new ChangeProposalPayloadMismatchError(
        command.type,
        payload.oldValue,
        targetFile.content,
      );
    }
  }

  private async validateFilePermissions(
    skill: Skill,
    command: CreateChangeProposalCommand<ChangeProposalType> & MemberContext,
  ): Promise<void> {
    const payload = command.payload as CollectionItemUpdatePayload<SkillFileId>;
    const { file: targetFile } = await this.resolveSkillFile(
      skill,
      payload.targetId,
    );

    if (payload.oldValue !== targetFile.permissions) {
      throw new ChangeProposalPayloadMismatchError(
        command.type,
        payload.oldValue,
        targetFile.permissions,
      );
    }
  }

  private async validateDeleteFile(
    skill: Skill,
    command: CreateChangeProposalCommand<ChangeProposalType> & MemberContext,
  ): Promise<void> {
    const payload = command.payload as CollectionItemDeletePayload<{
      id: SkillFileId;
    }>;
    await this.resolveSkillFile(skill, payload.targetId);
  }

  private async resolveSkillFile(
    skill: Skill,
    targetId: SkillFileId,
  ): Promise<{ file: SkillFile; latestVersionId: SkillVersionId }> {
    const version = await this.skillsPort.getLatestSkillVersion(skill.id);
    if (!version) {
      throw new SkillVersionNotFoundError(skill.id);
    }

    const files = await this.skillsPort.getSkillFiles(version.id);
    const targetFile = files.find((f) => f.id === targetId);
    if (targetFile) {
      return { file: targetFile, latestVersionId: version.id };
    }

    const filePath = await this.findFilePathById(skill.id, targetId);
    if (filePath) {
      const matchByPath = files.find((f) => f.path === filePath);
      if (matchByPath) {
        return { file: matchByPath, latestVersionId: version.id };
      }
    }

    throw new SkillFileNotFoundError(targetId);
  }

  private async findFilePathById(
    skillId: SkillId,
    fileId: SkillFileId,
  ): Promise<string | null> {
    const versions = await this.skillsPort.listSkillVersions(skillId);
    for (const version of versions) {
      const files = await this.skillsPort.getSkillFiles(version.id);
      const found = files.find((f) => f.id === fileId);
      if (found) {
        return found.path;
      }
    }
    return null;
  }
}
