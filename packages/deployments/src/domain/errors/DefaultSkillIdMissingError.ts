import { DeploymentsInternalError } from './DeploymentsInternalError';

/**
 * A default skill was shipped without the hardcoded UUID that pins its id
 * across deployments.
 *
 * Entirely ours: the slug comes from our own set of default skills, so this
 * fires the first time one is added and the table is not updated with it.
 */
export class DefaultSkillIdMissingError extends DeploymentsInternalError {
  constructor(slug: string) {
    super(
      'default_skill_id_missing',
      { slug },
      `No hardcoded UUID for default skill slug "${slug}". Add it to DEFAULT_SKILL_IDS in defaultSkillIdUtils.ts.`,
    );
    this.name = 'DefaultSkillIdMissingError';
  }
}
