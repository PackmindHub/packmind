import {
  DeploymentOverview,
  FindDeployedStandardByRepositoryCommand,
  FindDeployedStandardByRepositoryResponse,
  GetDeploymentOverviewCommand,
  PublishRecipesCommand,
  PublishStandardsCommand,
  RecipesDeployment,
  StandardsDeployment,
  ListDeploymentsByRecipeCommand,
  ListDeploymentsByStandardCommand,
  GetStandardDeploymentOverviewCommand,
  StandardDeploymentOverview,
} from '../deployments';

export interface IDeploymentPort {
  findActiveStandardVersionsByRepository(
    command: FindDeployedStandardByRepositoryCommand,
  ): Promise<FindDeployedStandardByRepositoryResponse>;

  /**
   * Gets deployment overview for an organization
   *
   * Provides a comprehensive view of deployment status across all repositories
   * and recipes for the specified organization, including:
   * - Repository-centric view: which recipes are deployed where and if they're up-to-date
   * - Recipe-centric view: which repositories each recipe is deployed to and deployment status
   *
   * @param command - Command containing organizationId
   * @returns Promise of DeploymentOverview with repositories and recipes deployment status
   */
  getDeploymentOverview(
    command: GetDeploymentOverviewCommand,
  ): Promise<DeploymentOverview>;

  /**
   * Publishes recipes to specified git repositories
   *
   * For each repository:
   * 1. Finds all previously deployed recipes
   * 2. Combines them with new recipes
   * 3. Prepares file updates using CodingAgentHexa
   * 4. Commits changes to the git repository
   * 5. Creates a RecipesDeployment entry in the database
   *
   * @param command - Command containing git repositories and recipes to deploy
   * @returns Promise of created RecipesDeployment entries
   */
  publishRecipes(command: PublishRecipesCommand): Promise<RecipesDeployment[]>;

  /**
   * Publishes standards to specified git repositories
   *
   * For each repository:
   * 1. Finds all previously deployed standards
   * 2. Combines them with new standards
   * 3. Prepares file updates using CodingAgentHexa
   * 4. Commits changes to the git repository
   * 5. Creates a StandardDeployment entry in the database
   *
   * @param command - Command containing git repositories and standard versions to deploy
   * @returns Promise of created StandardDeployment
   */
  publishStandards(
    command: PublishStandardsCommand,
  ): Promise<StandardsDeployment>;

  /**
   * Lists all deployments for a specific recipe
   *
   * @param command - Command containing recipeId and organizationId
   * @returns Promise of RecipesDeployment entries that include versions of the specified recipe
   */
  listDeploymentsByRecipe(
    command: ListDeploymentsByRecipeCommand,
  ): Promise<RecipesDeployment[]>;

  /**
   * Lists all deployments for a specific standard
   *
   * @param command - Command containing standardId and organizationId
   * @returns Promise of StandardDeployment entries that include versions of the specified standard
   */
  listDeploymentsByStandard(
    command: ListDeploymentsByStandardCommand,
  ): Promise<StandardsDeployment[]>;

  /**
   * Gets standard deployment overview for an organization
   *
   * Provides a comprehensive view of standard deployment status across all repositories
   * for the specified organization, including:
   * - Repository-centric view: which standards are deployed where and if they're up-to-date
   * - Standard-centric view: which repositories each standard is deployed to and deployment status
   *
   * @param command - Command containing organizationId
   * @returns Promise of StandardDeploymentOverview with repositories and standards deployment status
   */
  getStandardDeploymentOverview(
    command: GetStandardDeploymentOverviewCommand,
  ): Promise<StandardDeploymentOverview>;
}
