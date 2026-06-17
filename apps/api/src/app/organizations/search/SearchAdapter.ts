import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { StandardSchema } from '@packmind/standards';
import { RecipeSchema } from '@packmind/recipes';
import { SkillSchema } from '@packmind/skills';
import { PackageSchema } from '@packmind/deployments';
import {
  ISearchPort,
  SearchArtifactType,
  SearchCommand,
  SearchResult,
  SearchResponse,
  SpaceId,
} from '@packmind/types';

/** Maximum number of results returned to the client (cross-type combined). */
const MAX_RESULTS = 15;

/**
 * Per-type row cap. We fetch up to this many matches per type then merge, sort
 * and slice to MAX_RESULTS. Bounds memory and query cost; a type with more than
 * this many matches only contributes its top rows. Acceptable for a 15-cap
 * global search.
 */
const PER_TYPE_LIMIT = 50;

/** Raw row shape returned by each per-type QueryBuilder (getRawMany). */
type RawSearchRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  spaceId: string;
  matchSource: 'name' | 'description';
};

/**
 * Search adapter: runs ILIKE text queries across standards, recipes, skills
 * and packages, scoped to the spaces the user belongs to, then merges, orders
 * (name matches first) and caps the results.
 *
 * Read-only — no domain mutation or business rules. Membership scoping and
 * space-slug resolution happen upstream in SearchService (via ISpacesPort);
 * this adapter only performs the text queries over the provided space ids.
 *
 * NOTE: QueryBuilder does not auto-apply soft-delete (softDeleteSchemas sets
 * `deleteDate: true`), so every query explicitly filters `deletedAt IS NULL`.
 *
 * Recipe "command summary" comes from the latest RecipeVersion: we join
 * `recipe_versions` on `rv.recipe_id = r.id AND rv.version = r.version`
 * (Recipe.version tracks the current version). If a code path ever creates a
 * RecipeVersion without bumping Recipe.version, this join returns a stale
 * summary — see plan risk #3.
 */
@Injectable()
export class SearchAdapter implements ISearchPort {
  private readonly logger = new PackmindLogger('SearchAdapter', LogLevel.INFO);

  constructor(private readonly dataSource: DataSource) {}

  async search(command: SearchCommand): Promise<SearchResponse> {
    const { term, spaceIds, spaceSlugById } = command;
    const likeTerm = `%${term}%`;

    const [standards, recipes, skills, packages] = await Promise.all([
      this.searchStandards(likeTerm, spaceIds),
      this.searchRecipes(likeTerm, spaceIds),
      this.searchSkills(likeTerm, spaceIds),
      this.searchPackages(likeTerm, spaceIds),
    ]);

    const all: Array<RawSearchRow & { type: SearchArtifactType }> = [
      ...standards.map((row) => ({ ...row, type: 'standard' as const })),
      ...recipes.map((row) => ({ ...row, type: 'command' as const })),
      ...skills.map((row) => ({ ...row, type: 'skill' as const })),
      ...packages.map((row) => ({ ...row, type: 'package' as const })),
    ];

    // Order: name matches first, then description matches; tie-break by name.
    all.sort((a, b) => {
      if (a.matchSource !== b.matchSource) {
        return a.matchSource === 'name' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    const results: SearchResult[] = all.slice(0, MAX_RESULTS).map((row) => ({
      id: row.id,
      slug: row.slug,
      type: row.type,
      name: row.name,
      description: row.description,
      spaceId: row.spaceId,
      spaceSlug: spaceSlugById.get(row.spaceId as SpaceId) ?? '',
      matchSource: row.matchSource,
    }));

    return { results, total: results.length };
  }

  private async searchStandards(
    likeTerm: string,
    spaceIds: SpaceId[],
  ): Promise<RawSearchRow[]> {
    return this.dataSource
      .getRepository(StandardSchema)
      .createQueryBuilder('s')
      .select([
        's.id AS id',
        's.slug AS slug',
        's.name AS name',
        's.description AS description',
        's.spaceId AS "spaceId"',
        `CASE WHEN s.name ILIKE :q THEN 'name' ELSE 'description' END AS "matchSource"`,
      ])
      .where('s.spaceId IN (:...spaceIds)', { spaceIds })
      .andWhere('(s.name ILIKE :q OR s.description ILIKE :q)', { q: likeTerm })
      .andWhere('s.deletedAt IS NULL')
      .limit(PER_TYPE_LIMIT)
      .getRawMany<RawSearchRow>();
  }

  private async searchRecipes(
    likeTerm: string,
    spaceIds: SpaceId[],
  ): Promise<RawSearchRow[]> {
    return (
      this.dataSource
        .getRepository(RecipeSchema)
        .createQueryBuilder('r')
        // Join the recipe's "versions" relation (auto ON rv.recipe_id = r.id)
        // and keep only the latest version (Recipe.version tracks the current
        // version). Using the relation path ('r.versions') keeps the join
        // overload type-safe; the extra condition is raw SQL over column names.
        .innerJoin('r.versions', 'rv', 'rv.version = r.version')
        .select([
          'r.id AS id',
          'r.slug AS slug',
          'r.name AS name',
          'rv.summary AS description',
          'r.spaceId AS "spaceId"',
          `CASE WHEN r.name ILIKE :q THEN 'name' ELSE 'description' END AS "matchSource"`,
        ])
        .where('r.spaceId IN (:...spaceIds)', { spaceIds })
        .andWhere('(r.name ILIKE :q OR rv.summary ILIKE :q)', { q: likeTerm })
        .andWhere('r.deletedAt IS NULL')
        .andWhere('rv.deletedAt IS NULL')
        .limit(PER_TYPE_LIMIT)
        .getRawMany<RawSearchRow>()
    );
  }

  private async searchSkills(
    likeTerm: string,
    spaceIds: SpaceId[],
  ): Promise<RawSearchRow[]> {
    return this.dataSource
      .getRepository(SkillSchema)
      .createQueryBuilder('s')
      .select([
        's.id AS id',
        's.slug AS slug',
        's.name AS name',
        's.description AS description',
        's.spaceId AS "spaceId"',
        `CASE WHEN s.name ILIKE :q THEN 'name' ELSE 'description' END AS "matchSource"`,
      ])
      .where('s.spaceId IN (:...spaceIds)', { spaceIds })
      .andWhere('(s.name ILIKE :q OR s.description ILIKE :q)', { q: likeTerm })
      .andWhere('s.deletedAt IS NULL')
      .limit(PER_TYPE_LIMIT)
      .getRawMany<RawSearchRow>();
  }

  private async searchPackages(
    likeTerm: string,
    spaceIds: SpaceId[],
  ): Promise<RawSearchRow[]> {
    return this.dataSource
      .getRepository(PackageSchema)
      .createQueryBuilder('p')
      .select([
        'p.id AS id',
        'p.slug AS slug',
        'p.name AS name',
        'p.description AS description',
        'p.spaceId AS "spaceId"',
        `CASE WHEN p.name ILIKE :q THEN 'name' ELSE 'description' END AS "matchSource"`,
      ])
      .where('p.spaceId IN (:...spaceIds)', { spaceIds })
      .andWhere('(p.name ILIKE :q OR p.description ILIKE :q)', { q: likeTerm })
      .andWhere('p.deletedAt IS NULL')
      .limit(PER_TYPE_LIMIT)
      .getRawMany<RawSearchRow>();
  }
}
