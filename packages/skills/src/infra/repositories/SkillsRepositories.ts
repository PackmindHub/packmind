import { DataSource } from 'typeorm';
import { ISkillsRepositories } from '../../domain/repositories/ISkillsRepositories';
import { ISkillRepository } from '../../domain/repositories/ISkillRepository';
import { ISkillVersionRepository } from '../../domain/repositories/ISkillVersionRepository';
import { SkillRepository } from './SkillRepository';
import { SkillVersionRepository } from './SkillVersionRepository';
import { SkillSchema } from '../schemas/SkillSchema';
import { SkillVersionSchema } from '../schemas/SkillVersionSchema';

export class SkillsRepositories implements ISkillsRepositories {
  private readonly skillRepository: ISkillRepository;
  private readonly skillVersionRepository: ISkillVersionRepository;

  constructor(private readonly dataSource: DataSource) {
    this.skillRepository = new SkillRepository(
      this.dataSource.getRepository(SkillSchema),
    );
    this.skillVersionRepository = new SkillVersionRepository(
      this.dataSource.getRepository(SkillVersionSchema),
    );
  }

  getSkillRepository(): ISkillRepository {
    return this.skillRepository;
  }

  getSkillVersionRepository(): ISkillVersionRepository {
    return this.skillVersionRepository;
  }
}
