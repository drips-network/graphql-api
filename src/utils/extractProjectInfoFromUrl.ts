import type { Forge } from '../project/ProjectModel';

export default function extractProjectInfoFromUrl(url: string): {
  forge: Forge;
  ownerName: string;
  repoName: string;
  projectName: string;
} {
  const pattern =
    /^(?:https?:\/\/)?(?:www\.)?(github|gitlab)\.com\/([^\/]+)\/([^\/]+)/; // eslint-disable-line no-useless-escape
  const match = url.match(pattern);

  if (!match) {
    throw new Error(`Unsupported repository url: ${url}.`);
  }

  const forge = match[1] as Forge;
  const ownerName = match[2];
  const repoName = match[3];
  const projectName = `${ownerName}/${repoName}`;

  return { forge, ownerName, repoName, projectName };
}
