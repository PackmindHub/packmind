// Centralized alert messages for Skills domain
export const SKILL_MESSAGES = {
  success: {
    deleted: 'Skill deleted successfully!',
  },
  error: {
    deleteFailed: 'Failed to delete skill. Please try again.',
  },
  loading: {
    deleting: 'Deleting skill...',
  },
  confirmation: {
    deleteSkill: (name: string) =>
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
  },
} as const;

// Type for message categories
export type SkillMessageCategory = keyof typeof SKILL_MESSAGES;
export type SkillMessage<T extends SkillMessageCategory> =
  keyof (typeof SKILL_MESSAGES)[T];
