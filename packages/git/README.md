# Git Package

This package provides interfaces and implementations for interacting with Git repositories. GitHub and GitLab are both supported (`GitlabProvider` / `GitlabRepository`); the examples below cover GitHub.

## Usage

### GitHub Repository

The `GithubRepository` class implements the `IGitRepo` interface and provides functionality to interact with GitHub repositories using the GitHub API.

#### Initialization

The class is internal to the package: instances are built by `GitRepoFactory`, which resolves the credentials for the provider and passes in a token resolver.

```typescript
// Built by GitRepoFactory from a GitProvider and a GitRepo
const githubRepo = new GithubRepository(resolver, {
  owner: 'your-username-or-org',
  repo: 'your-repo-name',
  branch: 'main', // Optional, defaults to 'main'
});
```

#### Committing Files

```typescript
// Add, update or delete files in the repository in a single commit
await githubRepo.commitFiles(
  [{ path: 'path/to/file.txt', content: 'File content' }],
  'Commit message',
);
```

This will create or update the files at the specified paths in the repository. When nothing has changed, no commit is created.

### GitHub Provider

The `GithubProvider` class implements the `IGitProvider` interface and provides functionality to interact with GitHub using either a personal access token or a GitHub App installation token.

#### Initialization

The class is internal to the package: instances are built by `GitProviderFactory`, which passes in a token resolver.

```typescript
// Built by GitProviderFactory from a GitProvider
const githubProvider = new GithubProvider(resolver, logger);
```

#### Listing Available Repositories

```typescript
// Get repositories where the user has write access
const { repositories, totalPages, lastLoadedPage, partial } =
  await githubProvider.listAvailableRepositories();
```

**Note**: On the personal access token path, this method automatically filters to only return repositories where the authenticated user has write access (push permissions). This ensures that only repositories the user can actually deploy to are shown. Installation tokens are trusted as-is, since GitHub already returns only the repositories the App was granted.

Because inaccessible repositories are dropped, one requested page may span several provider pages: callers resume pagination from `lastLoadedPage + 1`, and `partial` is `true` when a provider page failed partway through the batch.

The returned repositories include:

- Repository name and owner
- Description (if available)
- Privacy status (public/private)
- Default branch
- Primary language (if detected)
- Star count

## Development

### Testing

Tests are written using Jest. To run the tests:

```bash
npx nx test git
```

### Implementation Details

The `GithubRepository` class:

- Uses axios to make HTTP requests to the GitHub API
- Gets its credentials from a token resolver (`GithubTokenResolverFactory`), which picks between a personal access token and a GitHub App installation token
- Builds a git tree from the changed files and posts it to the Git data API, comparing blob SHAs so unchanged files are skipped
- Handles errors and provides meaningful error messages

The `GithubProvider` class:

- Uses the GitHub `/user/repos` API endpoint to list repositories, or `/installation/repositories` when authenticated as a GitHub App installation
- Filters repositories based on the `permissions.push` field in the API response
- Provides comprehensive error handling and logging for permission edge cases
