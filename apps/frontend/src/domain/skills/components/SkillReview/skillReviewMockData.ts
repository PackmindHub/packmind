export interface SkillReviewDimension {
  name: string;
  reasoning: string;
  score: number;
  maxScore: number;
}

export interface SkillReviewSection {
  title: string;
  score: number;
  description: string;
  summary: string;
  suggestions: string[];
  dimensions: SkillReviewDimension[];
}

export interface EvalCriterion {
  name: string;
  description: string;
  scoreWithoutContext: number;
  scoreWithContext: number;
}

export interface EvalRunMetadata {
  cost: string;
  duration: string;
  turns: number;
  inputTokens: number;
  outputTokens: number;
}

export interface EvalScenario {
  id: string;
  title: string;
  description: string;
  overallScore: number;
  improvement: number;
  criteria: EvalCriterion[];
  withoutContextMeta: EvalRunMetadata;
  withContextMeta: EvalRunMetadata;
}

export interface SkillReviewData {
  overallScore: number;
  reviewScore: number;
  evaluationScore: number;
  evaluationBaseline: number;
  evaluationMultiplier: number;
  validationPassed: number;
  validationTotal: number;
  reviewedDaysAgo: number;
  sections: SkillReviewSection[];
  evaluations: EvalScenario[];
}

/**
 * Stub data representing the KPI scores after accepted changes are applied.
 * Values are slightly improved compared to SKILL_REVIEW_MOCK_DATA to illustrate
 * the positive impact of the proposed changes.
 */
export const SKILL_REVIEW_IMPROVED_MOCK_DATA: SkillReviewData = {
  overallScore: 94,
  reviewScore: 92,
  evaluationScore: 100,
  evaluationBaseline: 52,
  evaluationMultiplier: 1.92,
  validationPassed: 15,
  validationTotal: 16,
  reviewedDaysAgo: 0,
  sections: [],
  evaluations: [],
};

export const SKILL_REVIEW_MOCK_DATA: SkillReviewData = {
  overallScore: 88,
  reviewScore: 84,
  evaluationScore: 85,
  evaluationBaseline: 46,
  evaluationMultiplier: 1.85,
  validationPassed: 13,
  validationTotal: 16,
  reviewedDaysAgo: 4,
  sections: [
    {
      title: 'Discovery',
      score: 100,
      description:
        'Evaluates how well the skill can be discovered and matched to relevant coding situations by AI agents.',
      summary:
        'The skill has excellent discoverability. Its title, description, and tags provide clear signals for AI agents to match it to the right coding context.',
      suggestions: [],
      dimensions: [
        {
          name: 'Title Clarity',
          reasoning:
            'The title clearly communicates the purpose of the skill and is easy to understand.',
          score: 3,
          maxScore: 3,
        },
        {
          name: 'Description Quality',
          reasoning:
            'The description provides sufficient context for AI agents to understand when this skill applies.',
          score: 3,
          maxScore: 3,
        },
        {
          name: 'Tag Coverage',
          reasoning:
            'Tags are comprehensive and cover the main topics the skill addresses.',
          score: 3,
          maxScore: 3,
        },
      ],
    },
    {
      title: 'Implementation',
      score: 73,
      description:
        'Assesses the quality and completeness of the skill implementation, including rules, examples, and instructions.',
      summary:
        'The implementation is solid but could be improved with more concrete examples and edge case coverage.',
      suggestions: [
        'Add at least 2 more code examples showing edge cases and boundary conditions.',
        'Consider adding a "Common Mistakes" section to help AI agents avoid frequent pitfalls.',
        'Include before/after code snippets to make the expected transformation clearer.',
      ],
      dimensions: [
        {
          name: 'Rule Clarity',
          reasoning:
            'Rules are well-defined and unambiguous, providing clear guidance.',
          score: 3,
          maxScore: 3,
        },
        {
          name: 'Example Coverage',
          reasoning:
            'Examples cover the main cases but lack edge case scenarios.',
          score: 2,
          maxScore: 3,
        },
        {
          name: 'Instruction Completeness',
          reasoning:
            'Instructions are mostly complete but missing some context for complex scenarios.',
          score: 2,
          maxScore: 3,
        },
        {
          name: 'Code Quality',
          reasoning:
            'Code snippets are syntactically correct and follow best practices.',
          score: 3,
          maxScore: 3,
        },
      ],
    },
    {
      title: 'Validation',
      score: 91,
      description:
        'Measures how well the skill can be validated and tested against real-world coding scenarios.',
      summary:
        'Validation coverage is strong with comprehensive test cases that cover the primary use cases effectively.',
      suggestions: [
        'Consider adding negative test cases to verify the skill correctly rejects invalid patterns.',
      ],
      dimensions: [
        {
          name: 'Test Coverage',
          reasoning:
            'Test cases cover the primary use cases and common variations.',
          score: 3,
          maxScore: 3,
        },
        {
          name: 'Assertion Quality',
          reasoning:
            'Assertions are specific and validate the expected behavior accurately.',
          score: 3,
          maxScore: 3,
        },
        {
          name: 'Edge Case Testing',
          reasoning:
            'Most edge cases are covered, with minor gaps in negative testing.',
          score: 2,
          maxScore: 3,
        },
        {
          name: 'Reproducibility',
          reasoning:
            'Tests are deterministic and produce consistent results across runs.',
          score: 3,
          maxScore: 3,
        },
      ],
    },
  ],
  evaluations: [
    {
      id: 'eval-1',
      title: 'React component creation',
      description:
        'Agent is asked to create a new React component following team conventions for file structure, naming, and styling patterns.',
      overallScore: 92,
      improvement: 54,
      criteria: [
        {
          name: 'File structure',
          description:
            'Component follows the expected file and folder structure conventions.',
          scoreWithoutContext: 0,
          scoreWithContext: 100,
        },
        {
          name: 'Naming conventions',
          description:
            'Component, props, and file names follow team naming standards.',
          scoreWithoutContext: 50,
          scoreWithContext: 100,
        },
        {
          name: 'Styling approach',
          description:
            'Uses the team-approved styling method (e.g., Chakra UI tokens, no inline styles).',
          scoreWithoutContext: 100,
          scoreWithContext: 100,
        },
        {
          name: 'Export pattern',
          description:
            'Follows the expected export pattern (named vs default, barrel files).',
          scoreWithoutContext: 0,
          scoreWithContext: 100,
        },
      ],
      withoutContextMeta: {
        cost: '$0.15',
        duration: '40s',
        turns: 10,
        inputTokens: 59,
        outputTokens: 1815,
      },
      withContextMeta: {
        cost: '$0.27',
        duration: '51s',
        turns: 13,
        inputTokens: 253,
        outputTokens: 2559,
      },
    },
    {
      id: 'eval-2',
      title: 'API endpoint implementation',
      description:
        'Agent is asked to implement a new REST API endpoint following the hexagonal architecture and use case patterns.',
      overallScore: 78,
      improvement: 35,
      criteria: [
        {
          name: 'Use case structure',
          description:
            'Follows the AbstractMemberUseCase / AbstractAdminUseCase pattern correctly.',
          scoreWithoutContext: 50,
          scoreWithContext: 100,
        },
        {
          name: 'Command typing',
          description:
            'Command and Response types are properly defined in contracts.',
          scoreWithoutContext: 0,
          scoreWithContext: 100,
        },
        {
          name: 'Error handling',
          description:
            'Uses PackmindErrorHandler and proper error propagation.',
          scoreWithoutContext: 100,
          scoreWithContext: 100,
        },
        {
          name: 'Logging',
          description:
            'Uses PackmindLogger with structured metadata instead of console.log.',
          scoreWithoutContext: 0,
          scoreWithContext: 50,
        },
      ],
      withoutContextMeta: {
        cost: '$0.12',
        duration: '35s',
        turns: 8,
        inputTokens: 42,
        outputTokens: 1420,
      },
      withContextMeta: {
        cost: '$0.22',
        duration: '45s',
        turns: 11,
        inputTokens: 198,
        outputTokens: 2105,
      },
    },
  ],
};
