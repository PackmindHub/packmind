import {
  ChangeProposalType,
  CollectionItemDeletePayload,
  CollectionItemUpdatePayload,
  CreateChangeProposalCommand,
  ISkillsPort,
  Skill,
  SkillFileId,
  SkillId,
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
  | ChangeProposalType.updateSkillMetadata;

const SUPPORTED_TYPES: ReadonlySet<ChangeProposalType> = new Set([
  ChangeProposalType.updateSkillName,
  ChangeProposalType.updateSkillDescription,
  ChangeProposalType.updateSkillPrompt,
  ChangeProposalType.updateSkillMetadata,
  ChangeProposalType.addSkillFile,
  ChangeProposalType.updateSkillFileContent,
  ChangeProposalType.updateSkillFilePermissions,
  ChangeProposalType.deleteSkillFile,
]);

const SKILL_FIELD_BY_TYPE: Record<ScalarSkillType, (skill: Skill) => string> = {
  [ChangeProposalType.updateSkillName]: (skill) => skill.name,
  [ChangeProposalType.updateSkillDescription]: (skill) => skill.description,
  [ChangeProposalType.updateSkillPrompt]: (skill) => skill.prompt,
  [ChangeProposalType.updateSkillMetadata]: (skill) => {
    const fields: Record<string, unknown> = {};
    if (skill.license !== undefined) fields.license = skill.license;
    if (skill.compatibility !== undefined)
      fields.compatibility = skill.compatibility;
    if (skill.metadata !== undefined) fields.metadata = skill.metadata;
    if (skill.allowedTools !== undefined)
      fields.allowedTools = skill.allowedTools;
    return serializeSkillMetadata(fields);
  },
};

const SCALAR_TYPES = new Set<ChangeProposalType>([
  ChangeProposalType.updateSkillName,
  ChangeProposalType.updateSkillDescription,
  ChangeProposalType.updateSkillPrompt,
  ChangeProposalType.updateSkillMetadata,
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
    const version = await this.skillsPort.getLatestSkillVersion(skill.id);
    if (!version) {
      throw new SkillVersionNotFoundError(skill.id);
    }

    const files = await this.skillsPort.getSkillFiles(version.id);
    const targetFile = files.find((f) => f.id === payload.targetId);
    if (!targetFile) {
      throw new SkillFileNotFoundError(payload.targetId);
    }

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
    const version = await this.skillsPort.getLatestSkillVersion(skill.id);
    if (!version) {
      throw new SkillVersionNotFoundError(skill.id);
    }

    const files = await this.skillsPort.getSkillFiles(version.id);
    const targetFile = files.find((f) => f.id === payload.targetId);
    if (!targetFile) {
      throw new SkillFileNotFoundError(payload.targetId);
    }

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
    const version = await this.skillsPort.getLatestSkillVersion(skill.id);
    if (!version) {
      throw new SkillVersionNotFoundError(skill.id);
    }

    const files = await this.skillsPort.getSkillFiles(version.id);
    const targetFile = files.find((f) => f.id === payload.targetId);
    if (!targetFile) {
      throw new SkillFileNotFoundError(payload.targetId);
    }
  }
}
