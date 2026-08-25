import { instrumentComponents } from '@packmind/node-utils';
import { DataSource } from 'typeorm';
import { IStandardsRepositories } from '../../domain/repositories/IStandardsRepositories';
import { IStandardRepository } from '../../domain/repositories/IStandardRepository';
import { IStandardVersionRepository } from '../../domain/repositories/IStandardVersionRepository';
import { IRuleRepository } from '../../domain/repositories/IRuleRepository';
import { IRuleExampleRepository } from '../../domain/repositories/IRuleExampleRepository';
import { StandardRepository } from './StandardRepository';
import { StandardVersionRepository } from './StandardVersionRepository';
import { RuleRepository } from './RuleRepository';
import { RuleExampleRepository } from './RuleExampleRepository';
import { StandardSchema } from '../schemas/StandardSchema';
import { StandardVersionSchema } from '../schemas/StandardVersionSchema';
import { RuleSchema } from '../schemas/RuleSchema';
import { RuleExampleSchema } from '../schemas/RuleExampleSchema';

export class StandardsRepositories implements IStandardsRepositories {
  private readonly standardRepository: IStandardRepository;
  private readonly standardVersionRepository: IStandardVersionRepository;
  private readonly ruleRepository: IRuleRepository;
  private readonly ruleExampleRepository: IRuleExampleRepository;

  constructor(private readonly dataSource: DataSource) {
    this.standardRepository = new StandardRepository(
      this.dataSource.getRepository(StandardSchema),
    );
    this.standardVersionRepository = new StandardVersionRepository(
      this.dataSource.getRepository(StandardVersionSchema),
    );
    this.ruleRepository = new RuleRepository(
      this.dataSource.getRepository(RuleSchema),
    );
    this.ruleExampleRepository = new RuleExampleRepository(
      this.dataSource.getRepository(RuleExampleSchema),
    );

    // Covers the repositories that do not extend AbstractRepository, which
    // instruments itself. An explicit list rather than reflection over the
    // fields: this class also holds a TypeORM DataSource, which must not be
    // patched.
    instrumentComponents([
      this.standardRepository,
      this.standardVersionRepository,
      this.ruleRepository,
      this.ruleExampleRepository,
    ]);
  }

  getStandardRepository(): IStandardRepository {
    return this.standardRepository;
  }

  getStandardVersionRepository(): IStandardVersionRepository {
    return this.standardVersionRepository;
  }

  getRuleRepository(): IRuleRepository {
    return this.ruleRepository;
  }

  getRuleExampleRepository(): IRuleExampleRepository {
    return this.ruleExampleRepository;
  }
}
