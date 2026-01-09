import { EntitySchema } from 'typeorm';

export interface PackageSkill {
  package_id: string;
  skill_id: string;
}

export const PackageSkillsSchema = new EntitySchema<PackageSkill>({
  name: 'PackageSkill',
  tableName: 'package_skills',
  columns: {
    package_id: {
      type: 'uuid',
      primary: true,
      nullable: false,
    },
    skill_id: {
      type: 'uuid',
      primary: true,
      nullable: false,
    },
  },
});
