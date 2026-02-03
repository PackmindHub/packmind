import {
  IListSkillsResult,
  IListSkillsUseCase,
} from '../../domain/useCases/IListSkillsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

export class ListSkillsUseCase implements IListSkillsUseCase {
  constructor(private readonly packmindGateway: IPackmindGateway) {}

  public async execute(): Promise<IListSkillsResult> {
    return this.packmindGateway.skills.list();
  }
}
