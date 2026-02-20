import { skillVersionFactory } from '@packmind/skills/test';
import { ChangeProposalType, createChangeProposalId } from '@packmind/types';
import { changeProposalFactory } from '../../../../test';
import { DiffService } from '../../services/DiffService';
import { ChangeProposalConflictError } from '../../../domain/errors';
import { ApplySkillChangeProposals } from './ApplySkillChangeProposals';

describe('ApplySkillChangeProposals', () => {
  let applier: ApplySkillChangeProposals;
  let diffService: DiffService;

  beforeEach(() => {
    diffService = new DiffService();
    applier = new ApplySkillChangeProposals(diffService);
  });

  const skillVersion = skillVersionFactory({
    name: 'some-skill',
    description: 'A description of the skill',
    prompt: 'Do things and stuff',
  });

  describe('applyChangeProposal', () => {
    describe('when updating the skill name', () => {
      const changeProposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateSkillName,
          payload: {
            oldValue: skillVersion.name,
            newValue: `before--${skillVersion.name}`,
          },
        }),
        changeProposalFactory({
          type: ChangeProposalType.updateSkillName,
          payload: {
            oldValue: skillVersion.name,
            newValue: `${skillVersion.name}--after`,
          },
        }),
      ];

      it('overrides the skill name with each proposal', () => {
        const newSkillVersion = applier.applyChangeProposals(
          skillVersion,
          changeProposals,
        );

        expect(newSkillVersion).toEqual({
          ...skillVersion,
          name: `${skillVersion.name}--after`,
        });
      });
    });

    describe('when updating the skill description', () => {
      const changeProposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateSkillDescription,
          payload: {
            oldValue: skillVersion.description,
            newValue: `A line before:\n${skillVersion.description}`,
          },
        }),
        changeProposalFactory({
          type: ChangeProposalType.updateSkillDescription,
          payload: {
            oldValue: skillVersion.description,
            newValue: `${skillVersion.description}\nA line after`,
          },
        }),
      ];

      it('uses the diff service to apply the changes', () => {
        const newVersion = applier.applyChangeProposals(
          skillVersion,
          changeProposals,
        );

        expect(newVersion).toEqual({
          ...skillVersion,
          description: `A line before:\n${skillVersion.description}\nA line after`,
        });
      });

      it('throws a ChangeProposalConflictError if applying the diff fails', () => {
        expect(() =>
          applier.applyChangeProposals(skillVersion, [
            changeProposalFactory({
              id: createChangeProposalId('proposal-1'),
              type: ChangeProposalType.updateSkillDescription,
              payload: {
                oldValue: skillVersion.description,
                newValue: `---${skillVersion.description}`,
              },
            }),
            changeProposalFactory({
              id: createChangeProposalId('proposal-2'),
              type: ChangeProposalType.updateSkillDescription,
              payload: {
                oldValue: skillVersion.description,
                newValue: `${skillVersion.description}---`,
              },
            }),
          ]),
        ).toThrow(
          new ChangeProposalConflictError(createChangeProposalId('proposal-2')),
        );
      });
    });
  });
});
