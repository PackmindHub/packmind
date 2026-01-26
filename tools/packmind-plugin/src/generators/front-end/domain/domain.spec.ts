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

  describe('when generating files', () => {
    const modelFile =
      'apps/test-app/src/domain/user profile/user-profile.model.ts';
    const serviceFile =
      'apps/test-app/src/domain/user profile/user-profile.service.ts';

    beforeEach(async () => {
      await domainGenerator(tree, options);
    });

    it('creates the model file', () => {
      expect(tree.exists(modelFile)).toBe(true);
    });

    it('creates the service file', () => {
      expect(tree.exists(serviceFile)).toBe(true);
    });

    it('includes the name parameter in model content', () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const modelContent = tree.read(modelFile, 'utf-8')!;
      expect(modelContent).toContain('user profile');
    });

    it('includes the name parameter in service content', () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const serviceContent = tree.read(serviceFile, 'utf-8')!;
      expect(serviceContent).toContain('user profile');
    });
  });

  it('applies capitalize transformation to the name', async () => {
    await domainGenerator(tree, options);

    const modelFile =
      'apps/test-app/src/domain/user profile/user-profile.model.ts';
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const modelContent = tree.read(modelFile, 'utf-8')!;

    // Check that capitalize transformation is applied
    expect(modelContent).toContain('UserProfile'); // This should be the capitalized version
  });

  describe('when creating files with capitalized filename', () => {
    const componentFile =
      'apps/test-app/src/domain/user profile/UserProfile.component.ts';

    beforeEach(async () => {
      await domainGenerator(tree, options);
    });

    it('creates the component file', () => {
      expect(tree.exists(componentFile)).toBe(true);
    });

    it('includes UserProfileComponent in content', () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const componentContent = tree.read(componentFile, 'utf-8')!;
      expect(componentContent).toContain('UserProfileComponent');
    });

    it('includes the component description in content', () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const componentContent = tree.read(componentFile, 'utf-8')!;
      expect(componentContent).toContain('Component for: user profile');
    });
  });

  describe('when existing files are present', () => {
    const modelFile =
      'apps/test-app/src/domain/user profile/user-profile.model.ts';
    const serviceFile =
      'apps/test-app/src/domain/user profile/user-profile.service.ts';
    const componentFile =
      'apps/test-app/src/domain/user profile/UserProfile.component.ts';
    const originalContent =
      'This is my existing content that should not be overwritten';

    beforeEach(async () => {
      tree.write(modelFile, originalContent);
      await domainGenerator(tree, options);
    });

    it('does not overwrite existing model file', () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const finalContent = tree.read(modelFile, 'utf-8')!;
      expect(finalContent).toBe(originalContent);
    });

    it('creates the service file', () => {
      expect(tree.exists(serviceFile)).toBe(true);
    });

    it('creates the component file', () => {
      expect(tree.exists(componentFile)).toBe(true);
    });

    it('includes name parameter in service content', () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const serviceContent = tree.read(serviceFile, 'utf-8')!;
      expect(serviceContent).toContain('user profile');
    });

    it('includes UserProfileComponent in component content', () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const componentContent = tree.read(componentFile, 'utf-8')!;
      expect(componentContent).toContain('UserProfileComponent');
    });
  });
});
