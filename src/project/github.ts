/* eslint-disable no-console */
import { z } from 'zod';
import appSettings from '../common/appSettings';
import { getCache, setCacheWithJitter } from '../cache/redis';
import extractProjectInfoFromUrl from '../utils/extractProjectInfoFromUrl';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

export const repoSchema = z.object({
  url: z.string(),
  description: z.string().nullable(),
  repoName: z.string(),
  ownerName: z.string(),
  forksCount: z.number(),
  stargazersCount: z.number(),
  defaultBranch: z.string(),
});

export type GitHubRepoData = z.infer<typeof repoSchema>;

function createCacheKey(owner: string, repo: string): string {
  return `github:repo:${owner.toLowerCase()}:${repo.toLowerCase()}`;
}

const gitHubApiResponseSchema = z.object({
  html_url: z.string(),
  description: z.string().nullable(),
  name: z.string(),
  owner: z.object({
    login: z.string(),
  }),
  forks_count: z.number(),
  stargazers_count: z.number(),
  default_branch: z.string(),
});

type GitHubApiResponse = z.infer<typeof gitHubApiResponseSchema>;

function mapGhResponse(response: GitHubApiResponse): GitHubRepoData {
  return {
    url: response.html_url,
    description: response.description,
    repoName: response.name,
    ownerName: response.owner.login,
    forksCount: response.forks_count,
    stargazersCount: response.stargazers_count,
    defaultBranch: response.default_branch,
  };
}

async function fetchGitHubRepoData(
  owner: string,
  repo: string,
): Promise<GitHubRepoData | null> {
  const cacheKey = createCacheKey(owner, repo);

  // Try cache first
  const { value: cachedData } = await getCache(cacheKey);
  if (cachedData) {
    const parsed = JSON.parse(cachedData);
    if (parsed === null) {
      // Cached 404
      console.log('GitHub repo cache hit with null entry.', { owner, repo });
      return null;
    }
    return repoSchema.parse(parsed);
  }

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    const headers: Record<string, string> = {};

    if (appSettings.githubToken) {
      headers.Authorization = `Bearer ${appSettings.githubToken}`;
    }

    console.log('Fetching GitHub repo from API.', { owner, repo });

    const response = await fetchWithTimeout(url, { headers });

    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
    const rateLimitReset = response.headers.get('x-ratelimit-reset');

    if (rateLimitRemaining && rateLimitReset) {
      console.log('GitHub API rate limit:', {
        remaining: parseInt(rateLimitRemaining, 10),
        resetAt: new Date(parseInt(rateLimitReset, 10) * 1000).toISOString(),
        authenticated: !!appSettings.githubToken,
        lastRequest: url,
      });
    }

    if (response.status === 404) {
      // Cache the 404 for shorter time
      await setCacheWithJitter(
        cacheKey,
        JSON.stringify(null),
        appSettings.cacheSettings.projectErrorTtlSeconds,
        appSettings.cacheSettings.ttlJitterRatio,
      );
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const validatedApiResponse = gitHubApiResponseSchema.parse(data);
    const repoData = mapGhResponse(validatedApiResponse);
    const validatedData = repoSchema.parse(repoData);

    await setCacheWithJitter(
      cacheKey,
      JSON.stringify(validatedData),
      appSettings.cacheSettings.projectSuccessTtlSeconds,
      appSettings.cacheSettings.ttlJitterRatio,
    );

    console.log('GitHub repo fetched from API.', { owner, repo });

    return validatedData;
  } catch (error: any) {
    if (error.name === 'ZodError') {
      console.error('GitHub API response validation error:', error.errors);
      return null;
    }

    console.error('GitHub API error:', {
      message: error?.message,
      owner,
      repo,
    });

    return null;
  }
}

export async function getGitHubRepoByUrl(
  url: string,
): Promise<GitHubRepoData | null> {
  try {
    const { ownerName, repoName } = extractProjectInfoFromUrl(url);
    return await fetchGitHubRepoData(ownerName, repoName);
  } catch (error) {
    console.error('Invalid GitHub URL:', url, error);
    return null;
  }
}
