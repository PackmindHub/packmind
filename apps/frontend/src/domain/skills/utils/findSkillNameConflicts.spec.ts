import { findSkillNameConflicts } from './findSkillNameConflicts';

describe('findSkillNameConflicts', () => {
  describe('when a name already exists in the space', () => {
    it('returns that name', () => {
      expect(
        findSkillNameConflicts(
          ['documentation', 'onboarding'],
          [{ name: 'onboarding' }],
        ),
      ).toEqual(['onboarding']);
    });
  });

  describe('when no name exists in the space', () => {
    it('returns no conflict', () => {
      expect(
        findSkillNameConflicts(['documentation'], [{ name: 'onboarding' }]),
      ).toEqual([]);
    });
  });

  describe('when the space has no skills', () => {
    it('returns no conflict', () => {
      expect(findSkillNameConflicts(['documentation'], [])).toEqual([]);
    });
  });

  describe('when the names differ only by case', () => {
    it('reports the conflict', () => {
      expect(
        findSkillNameConflicts(['Onboarding'], [{ name: 'onboarding' }]),
      ).toEqual(['Onboarding']);
    });
  });

  describe('when the names differ only by slugging', () => {
    it('reports the conflict', () => {
      expect(
        findSkillNameConflicts(['My Skill'], [{ name: 'my-skill' }]),
      ).toEqual(['My Skill']);
    });
  });

  describe('when the same name is detected twice', () => {
    it('reports each occurrence', () => {
      expect(
        findSkillNameConflicts(
          ['onboarding', 'Onboarding'],
          [{ name: 'onboarding' }],
        ),
      ).toEqual(['onboarding', 'Onboarding']);
    });
  });
});
