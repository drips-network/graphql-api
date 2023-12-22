import { z } from 'zod';

const gitHubSourceSchema = z.object({
  forge: z.literal('github'),
  repoName: z.string(),
  ownerName: z.string(),
  url: z.string(),
});

// This will be a union type when we add support for other forges.
// eslint-disable-next-line import/prefer-default-export
export const sourceSchema = gitHubSourceSchema;
