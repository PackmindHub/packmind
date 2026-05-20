import {
  buildSkillsSkippedWarning,
  configuredAgentsSupportSkills,
} from './skillsCapabilityWarning';

describe('skillsCapabilityWarning', () => {
  describe('configuredAgentsSupportSkills', () => {
    it('returns true when any agent supports skills', () => {
      expect(configuredAgentsSupportSkills(['agents_md', 'claude'])).toBe(true);
    });

    it('returns false when no configured agent supports skills', () => {
      expect(configuredAgentsSupportSkills(['agents_md'])).toBe(false);
    });

    it('returns false on an empty agent list', () => {
      expect(configuredAgentsSupportSkills([])).toBe(false);
    });
  });

  describe('buildSkillsSkippedWarning', () => {
    describe('when no agents are configured', () => {
      const warning = buildSkillsSkippedWarning([]);

      it('explains there are no configured agents', () => {
        expect(warning).toContain('no coding agents are configured');
      });

      it('points to packmind-cli config agents', () => {
        expect(warning).toContain('packmind-cli config agents');
      });
    });

    describe('when configured agents do not support skills', () => {
      const warning = buildSkillsSkippedWarning(['agents_md', 'packmind']);

      it('lists the configured agents in the message', () => {
        expect(warning).toContain('agents_md, packmind');
      });

      it('explains the agents do not support skills', () => {
        expect(warning).toContain('do not support skills');
      });

      it('points to packmind-cli config agents with a capable example', () => {
        expect(warning).toContain('packmind-cli config agents');
        expect(warning).toContain('claude');
      });
    });
  });
});
