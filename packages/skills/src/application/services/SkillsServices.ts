import { SkillService } from './SkillService';
import { SkillVersionService } from './SkillVersionService';
import { ISkillsRepositories } from '../../domain/repositories/ISkillsRepositories';
import { PackmindLogger } from '@packmind/logger';

export class SkillsServices {
  private readonly skillService: SkillService;
  private readonly skillVersionService: SkillVersionService;

  constructor(
    private readonly skillsRepositories: ISkillsRepositories,
    private readonly logger: PackmindLogger,
  ) {
    this.skillService = new SkillService(
      this.skillsRepositories.getSkillRepository(),
    );
    this.skillVersionService = new SkillVersionService(
      this.skillsRepositories.getSkillVersionRepository(),
    );
  }

  getSkillService(): SkillService {
    return this.skillService;
  }

  getSkillVersionService(): SkillVersionService {
    return this.skillVersionService;
  }
}
