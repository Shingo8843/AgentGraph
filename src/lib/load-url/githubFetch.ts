import type { GitHubItem, GitHubSourceRef } from "./types.ts";

type GitHubApiItem = {
  title?: string;
  body?: string | null;
  state?: string;
  labels?: Array<string | { name?: string }>;
  user?: {
    login?: string;
  } | null;
  created_at?: string;
  updated_at?: string;
};

type GitHubError = {
  message?: string;
  documentation_url?: string;
};

export async function fetchGitHubItem(source: GitHubSourceRef): Promise<GitHubItem> {
  const endpointType = source.type === "pr" ? "pulls" : "issues";
  const response = await fetch(
    `https://api.github.com/repos/${source.owner}/${source.repo}/${endpointType}/${source.number}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as GitHubError;
    const remaining = response.headers.get("x-ratelimit-remaining");
    const reset = response.headers.get("x-ratelimit-reset");
    const rateLimit =
      remaining !== null
        ? ` rate_limit_remaining=${remaining}${reset ? ` reset=${reset}` : ""}`
        : "";

    throw new Error(
      `GitHub returned ${response.status} for ${source.url}: ${error.message ?? response.statusText}.${rateLimit}`
    );
  }

  const json = (await response.json()) as GitHubApiItem;

  return {
    source,
    title: json.title ?? `#${source.number}`,
    body: json.body ?? "",
    state: json.state ?? "unknown",
    labels: normalizeLabels(json.labels ?? []),
    author: json.user?.login ?? "unknown",
    createdAt: json.created_at ?? "",
    updatedAt: json.updated_at ?? ""
  };
}

function normalizeLabels(labels: Array<string | { name?: string }>) {
  return labels
    .map((label) => (typeof label === "string" ? label : label.name))
    .filter((label): label is string => Boolean(label));
}
