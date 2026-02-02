import {
  VALID_CODING_AGENTS,
  isValidCodingAgent,
  validateAgents,
  validateAgentsWithWarnings,
} from './validation';

describe('VALID_CODING_AGENTS', () => {
  it('contains all expected coding agents', () => {
    expect(VALID_CODING_AGENTS).toEqual([
      'packmind',
      'junie',
      'claude',
      'cursor',
      'copilot',
      'agents_md',
      'gitlab_duo',
      'continue',
    ]);
  });
});

describe('isValidCodingAgent', () => {
  describe('with valid agent strings', () => {
    it.each(VALID_CODING_AGENTS)('returns true for "%s"', (agent) => {
      expect(isValidCodingAgent(agent)).toBe(true);
    });
  });

  describe('with invalid values', () => {
    it('returns false for unknown string', () => {
      expect(isValidCodingAgent('unknown')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidCodingAgent('')).toBe(false);
    });

    it('returns false for string with typo', () => {
      expect(isValidCodingAgent('Cursor')).toBe(false);
    });
  });
});

describe('validateAgents', () => {
  describe('with undefined input', () => {
    it('returns null', () => {
      expect(validateAgents(undefined)).toBeNull();
    });
  });

  describe('with null input', () => {
    it('returns null', () => {
      expect(validateAgents(null)).toBeNull();
    });
  });

  describe('with non-array input', () => {
    it('returns null for string', () => {
      expect(validateAgents('claude')).toBeNull();
    });

    it('returns null for object', () => {
      expect(validateAgents({ agent: 'claude' })).toBeNull();
    });

    it('returns null for number', () => {
      expect(validateAgents(42)).toBeNull();
    });
  });

  describe('with valid agents array', () => {
    it('returns all agents when all are valid', () => {
      expect(validateAgents(['claude', 'cursor'])).toEqual([
        'claude',
        'cursor',
      ]);
    });

    it('returns empty array for empty input', () => {
      expect(validateAgents([])).toEqual([]);
    });
  });

  describe('with mixed valid and invalid agents', () => {
    it('filters out invalid agents', () => {
      expect(validateAgents(['claude', 'invalid', 'cursor'])).toEqual([
        'claude',
        'cursor',
      ]);
    });

    it('filters out non-string values', () => {
      expect(validateAgents(['claude', 123, 'cursor', null])).toEqual([
        'claude',
        'cursor',
      ]);
    });
  });
});

describe('validateAgentsWithWarnings', () => {
  describe('with undefined input', () => {
    it('returns null validAgents and empty invalidAgents', () => {
      const result = validateAgentsWithWarnings(undefined);
      expect(result).toEqual({ validAgents: null, invalidAgents: [] });
    });
  });

  describe('with null input', () => {
    it('returns null validAgents and empty invalidAgents', () => {
      const result = validateAgentsWithWarnings(null);
      expect(result).toEqual({ validAgents: null, invalidAgents: [] });
    });
  });

  describe('with non-array input', () => {
    it('returns null validAgents and empty invalidAgents', () => {
      const result = validateAgentsWithWarnings('claude');
      expect(result).toEqual({ validAgents: null, invalidAgents: [] });
    });
  });

  describe('with valid agents array', () => {
    it('returns all valid agents with empty invalidAgents', () => {
      const result = validateAgentsWithWarnings(['claude', 'cursor']);
      expect(result).toEqual({
        validAgents: ['claude', 'cursor'],
        invalidAgents: [],
      });
    });
  });

  describe('with mixed valid and invalid agents', () => {
    it('separates valid and invalid agents', () => {
      const result = validateAgentsWithWarnings([
        'claude',
        'invalid',
        'cursor',
        'unknown',
      ]);
      expect(result).toEqual({
        validAgents: ['claude', 'cursor'],
        invalidAgents: ['invalid', 'unknown'],
      });
    });
  });

  describe('with only invalid agents', () => {
    it('returns empty validAgents with all invalid agents', () => {
      const result = validateAgentsWithWarnings(['invalid', 'unknown']);
      expect(result).toEqual({
        validAgents: [],
        invalidAgents: ['invalid', 'unknown'],
      });
    });
  });
});
