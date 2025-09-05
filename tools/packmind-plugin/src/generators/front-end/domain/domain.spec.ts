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

  it('creates files with the name parameter inside', async () => {
    await domainGenerator(tree, options);

    // Check that files are created
    const modelFile =
      'apps/test-app/src/domain/user profile/user-profile.model.ts';
    const serviceFile =
      'apps/test-app/src/domain/user profile/user-profile.service.ts';

    expect(tree.exists(modelFile)).toBe(true);
    expect(tree.exists(serviceFile)).toBe(true);

    // Check that the content contains the name parameter
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const modelContent = tree.read(modelFile, 'utf-8')!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const serviceContent = tree.read(serviceFile, 'utf-8')!;

    // Basic check that the name appears in the content
    expect(modelContent).toContain('user profile');
    expect(serviceContent).toContain('user profile');
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

  it('creates files with capitalized filename', async () => {
    await domainGenerator(tree, options);

    // Check that a file with capitalized filename is created
    const componentFile =
      'apps/test-app/src/domain/user profile/UserProfile.component.ts';
    expect(tree.exists(componentFile)).toBe(true);

    // Check that the content is correct
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const componentContent = tree.read(componentFile, 'utf-8')!;
    expect(componentContent).toContain('UserProfileComponent');
    expect(componentContent).toContain('Component for: user profile');
  });

  it('does not overwrite existing files', async () => {
    const modelFile =
      'apps/test-app/src/domain/user profile/user-profile.model.ts';
    const originalContent =
      'This is my existing content that should not be overwritten';

    // Create the file with existing content
    tree.write(modelFile, originalContent);

    // Run the generator
    await domainGenerator(tree, options);

    // Check that the existing file was not overwritten
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const finalContent = tree.read(modelFile, 'utf-8')!;
    expect(finalContent).toBe(originalContent);

    // Check that other files were still created
    const serviceFile =
      'apps/test-app/src/domain/user profile/user-profile.service.ts';
    const componentFile =
      'apps/test-app/src/domain/user profile/UserProfile.component.ts';

    expect(tree.exists(serviceFile)).toBe(true);
    expect(tree.exists(componentFile)).toBe(true);

    // Verify the new files have the expected content
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const serviceContent = tree.read(serviceFile, 'utf-8')!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const componentContent = tree.read(componentFile, 'utf-8')!;

    expect(serviceContent).toContain('user profile');
    expect(componentContent).toContain('UserProfileComponent');
  });
});
