import type { GitHubSourceRef, GitHubSourceType } from "./types.ts";

export function parseGitHubUrl(rawUrl: string): GitHubSourceRef {
  let url: URL;

  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("Enter a valid GitHub issue or pull request URL");
  }

  if (url.hostname !== "github.com") {
    throw new Error("URL must be a GitHub URL");
  }

  const [owner, repo, kind, rawNumber] = url.pathname.split("/").filter(Boolean);

  if (!owner || !repo || !kind || !rawNumber) {
    throw new Error("URL must point to a GitHub issue or pull request");
  }

  const type = sourceTypeFromPath(kind);
  const number = Number(rawNumber);

  if (!type || !Number.isInteger(number) || number <= 0) {
    throw new Error("URL must point to a GitHub issue or pull request");
  }

  return {
    provider: "github",
    owner,
    repo,
    type,
    number,
    url: `https://github.com/${owner}/${repo}/${kind}/${number}`
  };
}

function sourceTypeFromPath(kind: string): GitHubSourceType | null {
  if (kind === "issues") {
    return "issue";
  }

  if (kind === "pull") {
    return "pr";
  }

  return null;
}
