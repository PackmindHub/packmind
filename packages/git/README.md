# Git Package

This package provides interfaces and implementations for interacting with Git repositories.

## Usage

### GitHub Repository

The `GithubRepository` class implements the `IGitRepo` interface and provides functionality to interact with GitHub repositories using the GitHub API.

#### Initialization

```typescript
import { GithubRepository } from '@packmind/git';

// Initialize with a GitHub token and repository options
const githubRepo = new GithubRepository('your-github-token', {
  owner: 'your-username-or-org',
  repo: 'your-repo-name',
  branch: 'main', // Optional, defaults to 'main'
});
```

#### Adding a File

```typescript
// Add a file to the repository
await githubRepo.addFile('path/to/file.txt', 'File content');
```

This will create or update the file at the specified path in the repository.

### GitHub Provider

The `GithubProvider` class implements the `IGitProvider` interface and provides functionality to interact with GitHub using either a personal access token or GitHub App authentication.

#### Initialization

##### With Personal Access Token

```typescript
import { GithubProvider } from '@packmind/git';

// Initialize with a GitHub token
const githubProvider = new GithubProvider(
  { type: 'token', token: 'your-github-token' },
  logger
);
```

##### With GitHub App Authentication

```typescript
import { GithubProvider } from '@packmind/git';

// Initialize with GitHub App credentials
const githubProvider = new GithubProvider(
  {
    type: 'app',
    appId: 'your-app-id',
    privateKey: '-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----',
    installationId: 'your-installation-id',
  },
  logger
);
```

#### Listing Available Repositories

```typescript
// Get repositories where the user has write access
const repositories = await githubProvider.listAvailableRepositories();
```

**Note**: This method automatically filters to only return repositories where the authenticated user has write access (push permissions). This ensures that only repositories the user can actually deploy to are shown.

The returned repositories include:

- Repository name and owner
- Description (if available)
- Privacy status (public/private)
- Default branch
- Primary language (if detected)
- Star count

Each repository in the response includes a `permissions.push: true` field from the GitHub API, indicating the user has write access.

## Development

### Testing

Tests are written using Jest. To run the tests:

```bash
npx nx test git
```

### Implementation Details

The `GithubRepository` class:

- Uses axios to make HTTP requests to the GitHub API
- Requires a GitHub personal access token for authentication
- Encodes file content in base64 as required by the GitHub API
- Handles errors and provides meaningful error messages

The `GithubProvider` class:

- Uses the GitHub `/user/repos` API endpoint to list repositories
- Filters repositories based on the `permissions.push` field in the API response
- Provides comprehensive error handling and logging for permission edge cases
- Supports both read-only and write access filtering
