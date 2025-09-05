import {
  formatFiles,
  generateFiles,
  getProjects,
  names,
  OverwriteStrategy,
  Tree,
} from '@nx/devkit';
import * as path from 'path';
import { DomainGeneratorSchema } from './schema';

async function domainGenerator(tree: Tree, options: DomainGeneratorSchema) {
  // Get all projects in the workspace
  const projects = getProjects(tree);

  // Get the target project from the options (populated by Nx's project selection)
  const targetProject = projects.get(options.project);

  if (!targetProject) {
    throw new Error(`Project "${options.project}" not found in workspace`);
  }

  console.log(`Adding ${options.name} domain to ${options.project} project`);

  // Get normalized names for templates
  const normalizedNames = names(options.name);

  // Define the target directory for the new domain
  const newDomainModulePath = `${targetProject.root}/src/domain/${options.name}`;

  // Generate domain files with transformed names
  generateFiles(
    tree,
    path.join(__dirname, 'files'),
    newDomainModulePath,
    {
      ...options,
      name: normalizedNames.fileName, // This will be used in __name__ placeholders (dasherized)
      className: normalizedNames.className, // This will be used in __className__ placeholders (capitalized)
      // Add individual transformation functions for templates
      classify: (str: string) => names(str).className,
      dasherize: (str: string) => names(str).fileName,
      camelize: (str: string) => names(str).propertyName,
      underscore: (str: string) => names(str).fileName.replace(/-/g, '_'),
      capitalize: (str: string) => str.charAt(0).toUpperCase() + str.slice(1),
      constantCase: (str: string) => names(str).constantName,
      // Pass original name for use in templates
      originalName: options.name,
    },
    {
      overwriteStrategy: OverwriteStrategy.KeepExisting,
    },
  );

  await formatFiles(tree);
}

export default domainGenerator;
