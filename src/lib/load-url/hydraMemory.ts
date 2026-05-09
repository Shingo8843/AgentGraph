import type { GitHubItem, HydraMemoryItem } from "./types.ts";

export function buildHydraMemoryItem(item: GitHubItem): HydraMemoryItem {
  const repo = `${item.source.owner}/${item.source.repo}`;
  const label = `${repo} ${item.source.type} #${item.source.number}`;
  const title = `${label}: ${item.title}`;

  return {
    id: `github:${repo}:${item.source.type}:${item.source.number}`,
    title,
    text: [
      `# ${title}`,
      "",
      `URL: ${item.source.url}`,
      `State: ${item.state}`,
      `Author: ${item.author}`,
      `Labels: ${item.labels.length > 0 ? item.labels.join(", ") : "none"}`,
      `Created: ${item.createdAt}`,
      `Updated: ${item.updatedAt}`,
      "",
      "## Body",
      "",
      item.body || "(empty)"
    ].join("\n"),
    is_markdown: true,
    infer: true,
    metadata: {
      provider: "github",
      repo,
      type: item.source.type
    },
    additional_metadata: {
      number: item.source.number,
      url: item.source.url,
      state: item.state,
      labels: item.labels,
      author: item.author
    }
  };
}
