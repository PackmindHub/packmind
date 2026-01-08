import { DataSource } from 'typeorm';
import { ISkillsRepositories } from '../../domain/repositories/ISkillsRepositories';
import { ISkillRepository } from '../../domain/repositories/ISkillRepository';
import { ISkillVersionRepository } from '../../domain/repositories/ISkillVersionRepository';
import { ISkillFileRepository } from '../../domain/repositories/ISkillFileRepository';
import { SkillRepository } from './SkillRepository';
import { SkillVersionRepository } from './SkillVersionRepository';
import { SkillFileRepository } from './SkillFileRepository';
import { SkillSchema } from '../schemas/SkillSchema';
import { SkillVersionSchema } from '../schemas/SkillVersionSchema';
import { SkillFileSchema } from '../schemas/SkillFileSchema';

export class SkillsRepositories implements ISkillsRepositories {
  private readonly skillRepository: ISkillRepository;
  private readonly skillVersionRepository: ISkillVersionRepository;
  private readonly skillFileRepository: ISkillFileRepository;

  constructor(private readonly dataSource: DataSource) {
    this.skillRepository = new SkillRepository(
      this.dataSource.getRepository(SkillSchema),
    );
    this.skillVersionRepository = new SkillVersionRepository(
      this.dataSource.getRepository(SkillVersionSchema),
    );
    this.skillFileRepository = new SkillFileRepository(
      this.dataSource.getRepository(SkillFileSchema),
    );
  }

  getSkillRepository(): ISkillRepository {
    return this.skillRepository;
  }

  getSkillVersionRepository(): ISkillVersionRepository {
    return this.skillVersionRepository;
  }

  getSkillFileRepository(): ISkillFileRepository {
    return this.skillFileRepository;
  }
}
