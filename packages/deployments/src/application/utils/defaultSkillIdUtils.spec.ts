import { DefaultSkillsDeployer } from '@packmind/coding-agent';
import { v4 as uuidv4 } from 'uuid';
import {
  getDefaultSkillId,
  isDefaultSkillId,
  isDefaultSkillSlug,
} from './defaultSkillIdUtils';

describe('getDefaultSkillId', () => {
  it('has a hardcoded UUID for every default-skill slug', () => {
    for (const slug of DefaultSkillsDeployer.getDefaultSkillSlugs()) {
      expect(() => getDefaultSkillId(slug)).not.toThrow();
      expect(typeof getDefaultSkillId(slug)).toBe('string');
      expect(getDefaultSkillId(slug).length).toBe(36);
    }
  });

  it('throws for an unknown slug', () => {
    expect(() => getDefaultSkillId('not-a-default-skill')).toThrow(
      /No hardcoded UUID for default skill slug/,
    );
  });

  it('returns the same UUID across calls', () => {
    expect(getDefaultSkillId('packmind-create-skill')).toBe(
      getDefaultSkillId('packmind-create-skill'),
    );
  });

  it('returns distinct UUIDs for distinct slugs', () => {
    const seen = new Set<string>();
    for (const slug of DefaultSkillsDeployer.getDefaultSkillSlugs()) {
      seen.add(getDefaultSkillId(slug));
    }
    expect(seen.size).toBe(DefaultSkillsDeployer.getDefaultSkillSlugs().length);
  });
});

describe('isDefaultSkillId', () => {
  it('returns true for every default-skill UUID', () => {
    for (const slug of DefaultSkillsDeployer.getDefaultSkillSlugs()) {
      expect(isDefaultSkillId(getDefaultSkillId(slug))).toBe(true);
    }
  });

  it('returns false for an arbitrary UUID', () => {
    expect(isDefaultSkillId(uuidv4())).toBe(false);
  });

  it('returns false for a non-UUID string', () => {
    expect(isDefaultSkillId('packmind-create-skill')).toBe(false);
    expect(isDefaultSkillId('')).toBe(false);
  });
});

describe('isDefaultSkillSlug', () => {
  it('returns true for every known default-skill slug', () => {
    for (const slug of DefaultSkillsDeployer.getDefaultSkillSlugs()) {
      expect(isDefaultSkillSlug(slug)).toBe(true);
    }
  });

  it('returns false for the matching default-skill UUID', () => {
    for (const slug of DefaultSkillsDeployer.getDefaultSkillSlugs()) {
      expect(isDefaultSkillSlug(getDefaultSkillId(slug))).toBe(false);
    }
  });

  it('returns false for arbitrary strings', () => {
    expect(isDefaultSkillSlug('not-a-default-skill')).toBe(false);
    expect(isDefaultSkillSlug(uuidv4())).toBe(false);
    expect(isDefaultSkillSlug('')).toBe(false);
  });

  it('is disjoint from isDefaultSkillId across all known slugs and UUIDs', () => {
    for (const slug of DefaultSkillsDeployer.getDefaultSkillSlugs()) {
      const uuid = getDefaultSkillId(slug);
      expect(isDefaultSkillSlug(slug) && isDefaultSkillId(slug)).toBe(false);
      expect(isDefaultSkillSlug(uuid) && isDefaultSkillId(uuid)).toBe(false);
    }
  });
});
