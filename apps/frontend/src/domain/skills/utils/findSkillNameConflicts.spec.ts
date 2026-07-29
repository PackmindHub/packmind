import {
  findDuplicateSkillNames,
  findSkillNameConflicts,
} from './findSkillNameConflicts';

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

describe('findDuplicateSkillNames', () => {
  describe('when a name is claimed twice', () => {
    it('returns every side of the clash, so neither goes through', () => {
      expect(findDuplicateSkillNames(['shared', 'other', 'shared'])).toEqual([
        'shared',
        'shared',
      ]);
    });
  });

  describe('when the clashing names differ only by slugging', () => {
    it('still reports them', () => {
      expect(findDuplicateSkillNames(['My Skill', 'my-skill'])).toEqual([
        'My Skill',
        'my-skill',
      ]);
    });
  });

  describe('when a name is claimed three times', () => {
    it('returns all three', () => {
      expect(findDuplicateSkillNames(['a', 'a', 'a'])).toHaveLength(3);
    });
  });

  describe('when every name is unique', () => {
    it('returns no duplicate', () => {
      expect(findDuplicateSkillNames(['one', 'two', 'three'])).toEqual([]);
    });
  });

  describe('when there is nothing to compare', () => {
    it('returns no duplicate', () => {
      expect(findDuplicateSkillNames([])).toEqual([]);
    });
  });
});
