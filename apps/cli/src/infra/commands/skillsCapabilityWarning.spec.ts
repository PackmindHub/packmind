import {
  buildSkillsSkippedWarning,
  configuredAgentsSupportSkills,
} from './skillsCapabilityWarning';
import { EXEC_NAME } from '../utils/execName';

describe('skillsCapabilityWarning', () => {
  describe('configuredAgentsSupportSkills', () => {
    describe('when any agent supports skills', () => {
      it('returns true', () => {
        expect(configuredAgentsSupportSkills(['agents_md', 'claude'])).toBe(
          true,
        );
      });
    });

    describe('when no configured agent supports skills', () => {
      it('returns false', () => {
        expect(configuredAgentsSupportSkills(['agents_md'])).toBe(false);
      });
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

      it('points to the config agents command', () => {
        expect(warning).toContain(`${EXEC_NAME} config agents`);
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

      it('points to the config agents command', () => {
        expect(warning).toContain(`${EXEC_NAME} config agents`);
      });

      it('includes a capable agent example', () => {
        expect(warning).toContain('claude');
      });
    });
  });
});
