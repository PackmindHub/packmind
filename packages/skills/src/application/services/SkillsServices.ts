import { ISkillsRepositories } from '../../domain/repositories/ISkillsRepositories';
import { SkillFileService } from './SkillFileService';
import { SkillService } from './SkillService';
import { SkillVersionService } from './SkillVersionService';

export class SkillsServices {
  private readonly skillService: SkillService;
  private readonly skillVersionService: SkillVersionService;
  private readonly skillFileService: SkillFileService;

  constructor(private readonly skillsRepositories: ISkillsRepositories) {
    this.skillService = new SkillService(
      this.skillsRepositories.getSkillRepository(),
    );
    this.skillVersionService = new SkillVersionService(
      this.skillsRepositories.getSkillVersionRepository(),
    );
    this.skillFileService = new SkillFileService(
      this.skillsRepositories.getSkillFileRepository(),
    );
  }

  getSkillService(): SkillService {
    return this.skillService;
  }

  getSkillVersionService(): SkillVersionService {
    return this.skillVersionService;
  }

  getSkillFileService(): SkillFileService {
    return this.skillFileService;
  }
}
