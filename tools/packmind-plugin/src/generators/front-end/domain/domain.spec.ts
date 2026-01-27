import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, addProjectConfiguration } from '@nx/devkit';

import domainGenerator from './domain';
import { DomainGeneratorSchema } from './schema';

describe.skip('domain generator', () => {
  let tree: Tree;
  const options: DomainGeneratorSchema = {
    name: 'user profile',
    project: 'test-app',
  };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();

    // Add a test project to the workspace
    addProjectConfiguration(tree, 'test-app', {
      root: 'apps/test-app',
      sourceRoot: 'apps/test-app/src',
      projectType: 'application',
      targets: {},
    });
  });

  describe('when generating domain files', () => {
    const modelFile =
      'apps/test-app/src/domain/user profile/user-profile.model.ts';
    const serviceFile =
      'apps/test-app/src/domain/user profile/user-profile.service.ts';
    let modelContent: string;
    let serviceContent: string;

    beforeEach(async () => {
      await domainGenerator(tree, options);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      modelContent = tree.read(modelFile, 'utf-8')!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      serviceContent = tree.read(serviceFile, 'utf-8')!;
    });

    it('creates model file', () => {
      expect(tree.exists(modelFile)).toBe(true);
    });

    it('creates service file', () => {
      expect(tree.exists(serviceFile)).toBe(true);
    });

    it('includes name parameter in model content', () => {
      expect(modelContent).toContain('user profile');
    });

    it('includes name parameter in service content', () => {
      expect(serviceContent).toContain('user profile');
    });
  });

  describe('when applying capitalize transformation', () => {
    const modelFile =
      'apps/test-app/src/domain/user profile/user-profile.model.ts';
    let modelContent: string;

    beforeEach(async () => {
      await domainGenerator(tree, options);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      modelContent = tree.read(modelFile, 'utf-8')!;
    });

    it('capitalizes the name to UserProfile', () => {
      expect(modelContent).toContain('UserProfile');
    });
  });

  describe('when creating component file with capitalized filename', () => {
    const componentFile =
      'apps/test-app/src/domain/user profile/UserProfile.component.ts';
    let componentContent: string;

    beforeEach(async () => {
      await domainGenerator(tree, options);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      componentContent = tree.read(componentFile, 'utf-8')!;
    });

    it('creates component file', () => {
      expect(tree.exists(componentFile)).toBe(true);
    });

    it('includes UserProfileComponent in content', () => {
      expect(componentContent).toContain('UserProfileComponent');
    });

    it('includes original name in content description', () => {
      expect(componentContent).toContain('Component for: user profile');
    });
  });

  describe('when existing file is present before generation', () => {
    const modelFile =
      'apps/test-app/src/domain/user profile/user-profile.model.ts';
    const serviceFile =
      'apps/test-app/src/domain/user profile/user-profile.service.ts';
    const componentFile =
      'apps/test-app/src/domain/user profile/UserProfile.component.ts';
    const originalContent =
      'This is my existing content that should not be overwritten';
    let finalContent: string;
    let serviceContent: string;
    let componentContent: string;

    beforeEach(async () => {
      tree.write(modelFile, originalContent);
      await domainGenerator(tree, options);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      finalContent = tree.read(modelFile, 'utf-8')!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      serviceContent = tree.read(serviceFile, 'utf-8')!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      componentContent = tree.read(componentFile, 'utf-8')!;
    });

    it('preserves existing model file content', () => {
      expect(finalContent).toBe(originalContent);
    });

    it('creates service file', () => {
      expect(tree.exists(serviceFile)).toBe(true);
    });

    it('creates component file', () => {
      expect(tree.exists(componentFile)).toBe(true);
    });

    it('includes name parameter in service content', () => {
      expect(serviceContent).toContain('user profile');
    });

    it('includes UserProfileComponent in component content', () => {
      expect(componentContent).toContain('UserProfileComponent');
    });
  });
});
