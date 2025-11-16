import { EntitySchema } from 'typeorm';

export interface PackageStandard {
  package_id: string;
  standard_id: string;
}

export const PackageStandardsSchema = new EntitySchema<PackageStandard>({
  name: 'PackageStandard',
  tableName: 'package_standards',
  columns: {
    package_id: {
      type: 'uuid',
      primary: true,
      nullable: false,
    },
    standard_id: {
      type: 'uuid',
      primary: true,
      nullable: false,
    },
  },
});
