/**
 * Maximum lengths enforced on skill metadata fields. Shared across the skills
 * domain and any consumer that validates skill input (CLI, playbook change
 * management), so they live in the contract package.
 */
export const NAME_MAX_LENGTH = 64;
export const DESCRIPTION_MAX_LENGTH = 1024;
export const COMPATIBILITY_MAX_LENGTH = 500;
