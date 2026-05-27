import axios from 'axios';
import { InstallationRepository } from '@packmind/types';

type GitHubRepo = {
  name: string;
  full_name: string;
  owner: { login: string };
  default_branch: string;
  private: boolean;
  description: string | null;
};

type GitHubInstallationRepositoriesResponse = {
  total_count: number;
  repositories: GitHubRepo[];
};

const PER_PAGE = 100;

export class GithubAppInstallationRepositoriesFetcher {
  async fetchAll(installationToken: string): Promise<InstallationRepository[]> {
    const allRepositories: InstallationRepository[] = [];
    let page = 1;

    while (true) {
      const { data } = await axios.get<GitHubInstallationRepositoriesResponse>(
        `https://api.github.com/installation/repositories?per_page=${PER_PAGE}&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${installationToken}`,
            Accept: 'application/vnd.github+json',
          },
        },
      );

      const mapped = data.repositories.map<InstallationRepository>((repo) => ({
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        defaultBranch: repo.default_branch,
        private: repo.private,
        description: repo.description,
      }));

      allRepositories.push(...mapped);

      if (data.repositories.length < PER_PAGE) {
        break;
      }

      page++;
    }

    return allRepositories;
  }
}
