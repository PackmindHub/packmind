import { AbstractChangeProposalApplier } from './AbstractChangeProposalApplier';
import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalType } from '../ChangeProposalType';
import { createSkillFileId } from '../../skills/SkillFileId';
import { isExpectedChangeProposalType } from './isExpectedChangeProposalType';
import { ChangeProposalPayloadParseError } from './ChangeProposalPayloadParseError';
import { SkillVersionWithFiles, SKILL_CHANGE_TYPES } from './types';

export class SkillChangeProposalApplier extends AbstractChangeProposalApplier<SkillVersionWithFiles> {
  areChangesApplicable(changeProposals: ChangeProposal[]): boolean {
    return this.checkChangesApplicable(changeProposals, SKILL_CHANGE_TYPES);
  }

  protected applyChangeProposal(
    source: SkillVersionWithFiles,
    changeProposal: ChangeProposal,
  ): SkillVersionWithFiles {
    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateSkillName,
      )
    ) {
      return {
        ...source,
        name: this.getEffectivePayload(changeProposal).newValue,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateSkillDescription,
      )
    ) {
      return {
        ...source,
        description: this.applyDiff(
          changeProposal.id,
          this.getEffectivePayload(changeProposal),
          source.description,
        ),
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateSkillPrompt,
      )
    ) {
      return {
        ...source,
        prompt: this.applyDiff(
          changeProposal.id,
          this.getEffectivePayload(changeProposal),
          source.prompt,
        ),
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateSkillMetadata,
      )
    ) {
      let parsedMetadata: Record<string, unknown> | undefined;
      if (changeProposal.payload.newValue) {
        try {
          parsedMetadata = JSON.parse(changeProposal.payload.newValue);
        } catch (err) {
          throw new ChangeProposalPayloadParseError(
            changeProposal.id,
            (err as Error).message,
          );
        }
      }
      return {
        ...source,
        metadata: parsedMetadata,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateSkillLicense,
      )
    ) {
      return {
        ...source,
        license: changeProposal.payload.newValue,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateSkillCompatibility,
      )
    ) {
      return {
        ...source,
        compatibility: changeProposal.payload.newValue,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateSkillAllowedTools,
      )
    ) {
      return {
        ...source,
        allowedTools: changeProposal.payload.newValue,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.addSkillFile,
      )
    ) {
      const newFile = {
        ...changeProposal.payload.item,
        id: createSkillFileId(changeProposal.id),
        skillVersionId: source.id,
      };

      return {
        ...source,
        files: [...(source.files || []), newFile],
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateSkillFileContent,
      )
    ) {
      const files = source.files || [];
      const updatedFiles = files.map((file) => {
        if (file.id !== changeProposal.payload.targetId) {
          return file;
        }

        const updatedContent = this.applyDiff(
          changeProposal.id,
          changeProposal.payload,
          file.content,
        );

        return {
          ...file,
          content: updatedContent,
          ...(changeProposal.payload.isBase64 !== undefined && {
            isBase64: changeProposal.payload.isBase64,
          }),
        };
      });

      return {
        ...source,
        files: updatedFiles,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateSkillFilePermissions,
      )
    ) {
      const files = source.files || [];
      const updatedFiles = files.map((file) => {
        if (file.id !== changeProposal.payload.targetId) {
          return file;
        }

        return {
          ...file,
          permissions: changeProposal.payload.newValue,
        };
      });

      return {
        ...source,
        files: updatedFiles,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.deleteSkillFile,
      )
    ) {
      const files = source.files || [];
      const filteredFiles = files.filter(
        (file) => file.id !== changeProposal.payload.targetId,
      );

      return {
        ...source,
        files: filteredFiles,
      };
    }

    if (
      isExpectedChangeProposalType(
        changeProposal,
        ChangeProposalType.updateSkillAdditionalProperty,
      )
    ) {
      const { targetId: key, newValue } = changeProposal.payload;
      const currentProps = { ...(source.additionalProperties ?? {}) };

      if (newValue === '') {
        delete currentProps[key];
      } else {
        // newValue is JSON-encoded (e.g. '"opus"', 'true'); parse back to raw for DB storage
        try {
          currentProps[key] = JSON.parse(newValue);
        } catch (err) {
          throw new ChangeProposalPayloadParseError(
            changeProposal.id,
            (err as Error).message,
          );
        }
      }

      return {
        ...source,
        additionalProperties:
          Object.keys(currentProps).length > 0 ? currentProps : undefined,
      };
    }

    return source;
  }
}
