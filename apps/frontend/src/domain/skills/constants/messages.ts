// Centralized alert messages for Skills domain
export const SKILL_MESSAGES = {
  success: {
    deleted: 'Skill deleted successfully!',
    deletedBatch: (count: number) =>
      count === 1
        ? 'Skill deleted successfully!'
        : `${count} skills deleted successfully!`,
  },
  error: {
    deleteFailed: 'Failed to delete skill. Please try again.',
    deleteBatchFailed: 'Failed to delete skills. Please try again.',
  },
  loading: {
    deleting: 'Deleting skill...',
  },
  confirmation: {
    deleteSkill: (name: string) =>
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
    deleteBatchSkills: (count: number) =>
      count === 1
        ? 'Are you sure you want to delete this skill? This action cannot be undone.'
        : `Are you sure you want to delete ${count} skills? This action cannot be undone.`,
  },
} as const;

// Type for message categories
export type SkillMessageCategory = keyof typeof SKILL_MESSAGES;
export type SkillMessage<T extends SkillMessageCategory> =
  keyof (typeof SKILL_MESSAGES)[T];
