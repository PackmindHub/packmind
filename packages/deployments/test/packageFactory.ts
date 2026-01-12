import { Factory } from '@packmind/test-utils';
import {
  Package,
  createPackageId,
  createSpaceId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export const packageFactory: Factory<Package> = (pkg?: Partial<Package>) => {
  return {
    id: createPackageId(uuidv4()),
    name: 'Test Package',
    slug: 'test-package',
    description: 'A test package for unit testing',
    spaceId: createSpaceId(uuidv4()),
    createdBy: createUserId(uuidv4()),
    recipes: [],
    standards: [],
    skills: [],
    ...pkg,
  };
};
