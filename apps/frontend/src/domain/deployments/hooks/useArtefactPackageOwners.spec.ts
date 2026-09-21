import {
  PackageResponse,
  createCommandId,
  createPackageId,
  createSkillId,
  createSpaceId,
  createStandardId,
} from '@packmind/types';
import { getOwnerByArtefactId } from './useArtefactPackageOwners';

describe('getOwnerByArtefactId', () => {
  const editedPackageId = createPackageId('pkg-edited');
  const otherPackageId = createPackageId('pkg-other');
  const spaceId = createSpaceId('space-1');
  const standardId = createStandardId('std-1');
  const commandId = createCommandId('cmd-1');
  const skillId = createSkillId('skill-1');

  const buildPackage = (
    overrides: Partial<PackageResponse> & Pick<PackageResponse, 'id' | 'name'>,
  ): PackageResponse =>
    ({
      slug: 'a-package',
      description: '',
      spaceId,
      createdBy: 'user-1',
      recipes: [],
      commands: [],
      standards: [],
      skills: [],
      ...overrides,
    }) as PackageResponse;

  describe('when another package holds a component', () => {
    it('names that package', () => {
      const owners = getOwnerByArtefactId(
        [
          buildPackage({
            id: otherPackageId,
            name: 'frontend-rules',
            standards: [standardId],
          }),
        ],
        editedPackageId,
      );

      expect(owners[standardId]).toBe('frontend-rules');
    });
  });

  describe('when the edited package holds a component', () => {
    it('leaves it unclaimed', () => {
      const owners = getOwnerByArtefactId(
        [
          buildPackage({
            id: editedPackageId,
            name: 'the-one-being-edited',
            standards: [standardId],
          }),
        ],
        editedPackageId,
      );

      expect(owners).toEqual({});
    });
  });

  describe('when components of every kind are held elsewhere', () => {
    it('claims each of them', () => {
      const owners = getOwnerByArtefactId(
        [
          buildPackage({
            id: otherPackageId,
            name: 'frontend-rules',
            standards: [standardId],
            commands: [commandId],
            skills: [skillId],
          }),
        ],
        editedPackageId,
      );

      expect(owners).toEqual({
        [standardId]: 'frontend-rules',
        [commandId]: 'frontend-rules',
        [skillId]: 'frontend-rules',
      });
    });
  });

  describe('when there are no packages', () => {
    it('claims nothing', () => {
      expect(getOwnerByArtefactId(undefined, editedPackageId)).toEqual({});
    });
  });
});
